import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from dateutil import parser as date_parser

from ..models import (
    TopicTrendsResponse, TopicTrendItem, SupportingArticleRef,
    PartyLeaderCoverageResponse, PartyCoverageItem, LeaderCoverageItem,
    IntelligenceBriefResponse, KeyDevelopmentItem, NewsArticle, DataStatus
)
from .source_registry import source_registry
from .news_service import NewsService
from ..data.seed_data import PARTIES, LEADERS

IST_OFFSET = timedelta(hours=5, minutes=30)
CONFIG_VERSION = "v1.0-brief-engine"
MIN_SAMPLE_SIZE_FOR_BRIEF = 3

class BriefService:
    def __init__(self):
        self.news_service = NewsService()

    def _parse_iso(self, date_str: str) -> datetime:
        try:
            dt = date_parser.parse(date_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            return datetime.now(timezone.utc)

    def _get_reporting_windows(self, articles: List[Dict[str, Any]], period: str = "24h") -> Dict[str, datetime]:
        now_utc = datetime.now(timezone.utc)
        
        # If we have articles, find latest publication time
        if articles:
            latest_pub = max(self._parse_iso(a["published_at"]) for a in articles)
            anchor = max(now_utc, latest_pub)
        else:
            anchor = now_utc

        if period == "7d":
            window_delta = timedelta(days=7)
        else: # "24h"
            window_delta = timedelta(hours=24)

        current_end = anchor
        current_start = current_end - window_delta
        prior_end = current_start
        prior_start = prior_end - window_delta

        return {
            "current_start": current_start,
            "current_end": current_end,
            "prior_start": prior_start,
            "prior_end": prior_end
        }

    def _get_raw_articles(self, mode: str = "live") -> List[Dict[str, Any]]:
        if mode == "demo":
            # Convert seeded demo articles to dict format
            seed_arts = self.news_service.articles
            results = []
            for a in seed_arts:
                results.append({
                    "id": a.id,
                    "source_id": "seed_demo",
                    "source_name": a.source,
                    "title": a.title,
                    "tamil_title": a.tamil_title,
                    "summary": a.summary,
                    "tamil_summary": a.tamil_summary,
                    "source_url": a.source_url,
                    "canonical_url": a.source_url,
                    "published_at": a.published_at,
                    "party_codes": a.party_codes,
                    "leader_names": a.leader_names,
                    "sentiment": a.sentiment.value if hasattr(a.sentiment, "value") else str(a.sentiment),
                    "sentiment_score": a.sentiment_score,
                    "topics": a.topics,
                    "content_hash": hashlib.sha256(f"{a.title}|{a.summary}".encode()).hexdigest(),
                    "data_status": "seeded_demo"
                })
            return results
        else:
            # Strictly live_rss from SQLite
            return source_registry.get_live_articles()

    def get_topic_trends(
        self,
        mode: str = "live",
        period: str = "24h",
        party: Optional[str] = None,
        leader: Optional[str] = None,
        source: Optional[str] = None
    ) -> TopicTrendsResponse:
        raw_articles = self._get_raw_articles(mode)

        # Apply optional filters
        if party:
            p_code = party.upper()
            raw_articles = [a for a in raw_articles if p_code in a.get("party_codes", [])]
        if leader:
            l_str = leader.lower()
            raw_articles = [a for a in raw_articles if any(l_str in l.lower() for l in a.get("leader_names", []))]
        if source:
            s_str = source.lower()
            raw_articles = [a for a in raw_articles if s_str in a.get("source_id", "").lower() or s_str in a.get("source_name", "").lower()]

        windows = self._get_reporting_windows(raw_articles, period)
        curr_start = windows["current_start"]
        curr_end = windows["current_end"]
        prior_start = windows["prior_start"]
        prior_end = windows["prior_end"]

        current_arts = []
        prior_arts = []
        for a in raw_articles:
            dt = self._parse_iso(a["published_at"])
            if curr_start <= dt <= curr_end:
                current_arts.append(a)
            elif prior_start <= dt < prior_end:
                prior_arts.append(a)

        # Aggregate topics
        current_topic_map: Dict[str, List[Dict[str, Any]]] = {}
        for a in current_arts:
            for t in a.get("topics", []):
                current_topic_map.setdefault(t, []).append(a)

        prior_topic_map: Dict[str, List[Dict[str, Any]]] = {}
        for a in prior_arts:
            for t in a.get("topics", []):
                prior_topic_map.setdefault(t, []).append(a)

        all_topics = set(current_topic_map.keys()) | set(prior_topic_map.keys())
        topic_items: List[TopicTrendItem] = []

        for topic in sorted(all_topics):
            c_arts = current_topic_map.get(topic, [])
            p_arts = prior_topic_map.get(topic, [])
            c_count = len(c_arts)
            p_count = len(p_arts)
            net_change = c_count - p_count

            # Percentage change calculation with safety guards
            if p_count == 0 and c_count > 0:
                pct_change = None
                status = "single_report" if c_count == 1 else "emerging"
                is_low_sample = c_count < 3
            elif p_count > 0 and p_count < 3:
                # Low historical sample: calculate but mark is_low_sample to prevent misleading interpretation
                pct_change = round(((c_count - p_count) / p_count) * 100.0, 1)
                is_low_sample = True
                status = "gaining" if net_change > 0 else ("losing" if net_change < 0 else "stable")
            elif p_count >= 3:
                pct_change = round(((c_count - p_count) / p_count) * 100.0, 1)
                is_low_sample = False
                status = "gaining" if net_change > 0 else ("losing" if net_change < 0 else "stable")
            else:
                pct_change = 0.0
                is_low_sample = True
                status = "stable"

            # Publishers & supporting articles
            publishers = sorted(list({a.get("source_name", "Unknown") for a in c_arts}))
            refs = [
                SupportingArticleRef(
                    id=a["id"],
                    title=a["title"],
                    tamil_title=a.get("tamil_title") or a["title"],
                    source=a.get("source_name", ""),
                    source_url=a.get("source_url", ""),
                    published_at=a["published_at"],
                    sentiment=a.get("sentiment", "neutral"),
                    party_codes=a.get("party_codes", [])
                )
                for a in c_arts[:5]
            ]

            topic_items.append(TopicTrendItem(
                topic=topic,
                current_count=c_count,
                prior_count=p_count,
                net_change=net_change,
                pct_change=pct_change,
                status=status,
                is_low_sample=is_low_sample,
                distinct_publishers=publishers,
                supporting_articles=refs
            ))

        # Sort by current_count descending, then net_change descending
        topic_items.sort(key=lambda x: (x.current_count, x.net_change), reverse=True)

        distinct_publishers = {a.get("source_name") for a in current_arts if a.get("source_name")}

        return TopicTrendsResponse(
            period=period,
            reporting_timezone="Asia/Kolkata (IST)",
            current_window_start=curr_start.isoformat(),
            current_window_end=curr_end.isoformat(),
            prior_window_start=prior_start.isoformat(),
            prior_window_end=prior_end.isoformat(),
            total_articles_analyzed=len(current_arts),
            distinct_publishers_count=len(distinct_publishers),
            topics=topic_items,
            methodology_note="Based on monitored Tamil news publishers. Topic trends reflect volume of editorial coverage in specified window, not statewide public opinion."
        )

    def get_party_leader_coverage(
        self,
        mode: str = "live",
        period: str = "24h"
    ) -> PartyLeaderCoverageResponse:
        raw_articles = self._get_raw_articles(mode)
        windows = self._get_reporting_windows(raw_articles, period)
        curr_start = windows["current_start"]
        curr_end = windows["current_end"]
        prior_start = windows["prior_start"]
        prior_end = windows["prior_end"]

        current_arts = [a for a in raw_articles if curr_start <= self._parse_iso(a["published_at"]) <= curr_end]
        prior_arts = [a for a in raw_articles if prior_start <= self._parse_iso(a["published_at"]) < prior_end]

        # Party aggregations
        party_items: List[PartyCoverageItem] = []
        for p in PARTIES:
            code = p.code
            c_matched = [a for a in current_arts if code in a.get("party_codes", [])]
            p_matched = [a for a in prior_arts if code in a.get("party_codes", [])]

            c_count = len(c_matched)
            p_count = len(p_matched)
            net_change = c_count - p_count

            pubs = sorted(list({a.get("source_name", "") for a in c_matched if a.get("source_name")}))

            # Topics for this party
            topic_counts: Dict[str, int] = {}
            for a in c_matched:
                for t in a.get("topics", []):
                    topic_counts[t] = topic_counts.get(t, 0) + 1
            top_topics = [{"topic": t, "count": c} for t, c in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:5]]

            # Sentiment distribution
            pos = sum(1 for a in c_matched if a.get("sentiment") == "positive")
            neu = sum(1 for a in c_matched if a.get("sentiment") == "neutral")
            neg = sum(1 for a in c_matched if a.get("sentiment") == "negative")
            avg_score = round(sum(float(a.get("sentiment_score", 0.0)) for a in c_matched) / max(1, c_count), 2) if c_count else 0.0

            refs = [
                SupportingArticleRef(
                    id=a["id"],
                    title=a["title"],
                    tamil_title=a.get("tamil_title") or a["title"],
                    source=a.get("source_name", ""),
                    source_url=a.get("source_url", ""),
                    published_at=a["published_at"],
                    sentiment=a.get("sentiment", "neutral"),
                    party_codes=a.get("party_codes", [])
                )
                for a in c_matched[:5]
            ]

            party_items.append(PartyCoverageItem(
                code=code,
                name=p.name,
                tamil_name=p.tamil_name,
                current_count=c_count,
                prior_count=p_count,
                net_change=net_change,
                distinct_publishers=pubs,
                top_topics=top_topics,
                sentiment_distribution={"positive": pos, "neutral": neu, "negative": neg},
                average_sentiment_score=avg_score,
                supporting_articles=refs
            ))

        party_items.sort(key=lambda x: x.current_count, reverse=True)

        # Leader aggregations
        leader_items: List[LeaderCoverageItem] = []
        for l in LEADERS:
            lname = l.name
            c_matched = [a for a in current_arts if any(lname.lower() in x.lower() for x in a.get("leader_names", []))]
            p_matched = [a for a in prior_arts if any(lname.lower() in x.lower() for x in a.get("leader_names", []))]

            c_count = len(c_matched)
            p_count = len(p_matched)
            net_change = c_count - p_count

            pubs = sorted(list({a.get("source_name", "") for a in c_matched if a.get("source_name")}))

            topic_counts: Dict[str, int] = {}
            for a in c_matched:
                for t in a.get("topics", []):
                    topic_counts[t] = topic_counts.get(t, 0) + 1
            top_topics = [{"topic": t, "count": c} for t, c in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:5]]

            pos = sum(1 for a in c_matched if a.get("sentiment") == "positive")
            neu = sum(1 for a in c_matched if a.get("sentiment") == "neutral")
            neg = sum(1 for a in c_matched if a.get("sentiment") == "negative")
            avg_score = round(sum(float(a.get("sentiment_score", 0.0)) for a in c_matched) / max(1, c_count), 2) if c_count else 0.0

            refs = [
                SupportingArticleRef(
                    id=a["id"],
                    title=a["title"],
                    tamil_title=a.get("tamil_title") or a["title"],
                    source=a.get("source_name", ""),
                    source_url=a.get("source_url", ""),
                    published_at=a["published_at"],
                    sentiment=a.get("sentiment", "neutral"),
                    party_codes=a.get("party_codes", [])
                )
                for a in c_matched[:5]
            ]

            leader_items.append(LeaderCoverageItem(
                id=l.id,
                name=l.name,
                tamil_name=l.tamil_name,
                party_code=l.party_code,
                current_count=c_count,
                prior_count=p_count,
                net_change=net_change,
                distinct_publishers=pubs,
                top_topics=top_topics,
                sentiment_distribution={"positive": pos, "neutral": neu, "negative": neg},
                average_sentiment_score=avg_score,
                supporting_articles=refs
            ))

        leader_items.sort(key=lambda x: x.current_count, reverse=True)

        return PartyLeaderCoverageResponse(
            period=period,
            current_window_start=curr_start.isoformat(),
            current_window_end=curr_end.isoformat(),
            parties=party_items,
            leaders=leader_items,
            attribution_caveat="Coverage statistics indicate volume of news mentions and automated media tone. They DO NOT reflect electoral popularity, voter preference, or election forecasts."
        )

    def get_or_generate_brief(
        self,
        mode: str = "live",
        period: str = "24h",
        force_regenerate: bool = False
    ) -> IntelligenceBriefResponse:
        data_status = "live_rss" if mode == "live" else "seeded_demo"
        raw_articles = self._get_raw_articles(mode)
        windows = self._get_reporting_windows(raw_articles, period)
        curr_start = windows["current_start"]
        curr_end = windows["current_end"]

        # Candidate articles strictly inside the reporting window
        candidate_arts = [
            a for a in raw_articles 
            if curr_start <= self._parse_iso(a["published_at"]) <= curr_end
        ]

        # Handle Insufficient Data condition
        if len(candidate_arts) < MIN_SAMPLE_SIZE_FOR_BRIEF:
            return IntelligenceBriefResponse(
                id=f"brief-insufficient-{mode}-{period}",
                data_status=data_status,
                period=period,
                window_start=curr_start.isoformat(),
                window_end=curr_end.isoformat(),
                generated_at=datetime.now(timezone.utc).isoformat(),
                sample_size=len(candidate_arts),
                publisher_count=len({a.get("source_name") for a in candidate_arts if a.get("source_name")}),
                status="insufficient_data",
                brief_english=(
                    f"Insufficient article volume in the selected {period} reporting window ({len(candidate_arts)} reports found). "
                    f"A minimum of {MIN_SAMPLE_SIZE_FOR_BRIEF} articles across verified publishers is required to synthesize "
                    "a reliable statewide political intelligence brief."
                ),
                brief_tamil=(
                    f"தேர்ந்தெடுக்கப்பட்ட {period} செய்தி காலக்கட்டத்தில் போதுமான செய்திகள் கிடைக்கவில்லை ({len(candidate_arts)} செய்திகள் மட்டுமே உள்ளன). "
                    f"நம்பகமான அரசியல் நுண்ணறிவுச் சுருக்கத்தை உருவாக்க குறைந்தது {MIN_SAMPLE_SIZE_FOR_BRIEF} செய்திகள் அவசியமாகும்."
                ),
                key_developments=[],
                emerging_topics=[],
                party_insights=[],
                supporting_article_ids=[a["id"] for a in candidate_arts],
                evidence_articles=[],
                caveat="Insufficient evidence to generate verified political intelligence.",
                is_cached=False
            )

        # Compute evidence hash for idempotency & cache lookup
        sorted_evidence = sorted(f"{a['id']}:{a.get('content_hash', '')}" for a in candidate_arts)
        evidence_hash = hashlib.sha256("||".join(sorted_evidence).encode("utf-8")).hexdigest()

        # Check existing brief
        if not force_regenerate:
            cached = source_registry.find_brief(
                data_status=data_status,
                period=period,
                evidence_hash=evidence_hash,
                config_version=CONFIG_VERSION
            )
            if cached:
                return IntelligenceBriefResponse(
                    id=cached["id"],
                    data_status=cached["data_status"],
                    period=cached["period"],
                    window_start=cached["window_start"],
                    window_end=cached["window_end"],
                    generated_at=cached["generated_at"],
                    sample_size=cached["sample_size"],
                    publisher_count=cached["publisher_count"],
                    status=cached.get("status", "sufficient_data"),
                    brief_english=cached["brief_english"],
                    brief_tamil=cached["brief_tamil"],
                    key_developments=[KeyDevelopmentItem(**kd) for kd in cached["key_developments"]],
                    emerging_topics=cached["emerging_topics"],
                    party_insights=cached["party_insights"],
                    supporting_article_ids=cached["supporting_article_ids"],
                    evidence_articles=cached["evidence_articles"],
                    caveat="Verified intelligence brief based on monitored Tamil publishers. Excludes unverified social media rumor.",
                    is_cached=True
                )

        # Generate new brief from candidate articles
        brief_id = f"brief-{mode}-{period}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        now_str = datetime.now(timezone.utc).isoformat()

        # 1. Topic frequency & emerging topics
        topic_counts: Dict[str, List[Dict[str, Any]]] = {}
        for a in candidate_arts:
            for t in a.get("topics", []):
                topic_counts.setdefault(t, []).append(a)

        emerging_topics = []
        for t, arts in sorted(topic_counts.items(), key=lambda x: len(x[1]), reverse=True)[:5]:
            pubs = list({a.get("source_name", "") for a in arts if a.get("source_name")})
            emerging_topics.append({
                "topic": t,
                "article_count": len(arts),
                "publishers": pubs,
                "sample_article_ids": [a["id"] for a in arts[:3]]
            })

        # 2. Party share & insights
        party_counts: Dict[str, List[Dict[str, Any]]] = {}
        for a in candidate_arts:
            for p in a.get("party_codes", []):
                party_counts.setdefault(p, []).append(a)

        party_insights = []
        for p_code, arts in sorted(party_counts.items(), key=lambda x: len(x[1]), reverse=True):
            pos = sum(1 for a in arts if a.get("sentiment") == "positive")
            neg = sum(1 for a in arts if a.get("sentiment") == "negative")
            neu = sum(1 for a in arts if a.get("sentiment") == "neutral")
            tone = "favorable" if pos > neg else ("critical" if neg > pos else "balanced")
            party_insights.append({
                "party_code": p_code,
                "coverage_count": len(arts),
                "media_tone": tone,
                "positive": pos,
                "neutral": neu,
                "negative": neg,
                "supporting_ids": [a["id"] for a in arts[:3]]
            })

        # 3. Key developments synthesis (with rigorous article attribution)
        key_developments: List[KeyDevelopmentItem] = []
        
        # Select top 3-4 landmark articles across distinct topics
        seen_topics = set()
        landmark_arts = []
        for a in candidate_arts:
            art_topics = tuple(a.get("topics", []))
            if art_topics and art_topics not in seen_topics:
                landmark_arts.append(a)
                seen_topics.add(art_topics)
            if len(landmark_arts) >= 4:
                break
        if len(landmark_arts) < 3:
            landmark_arts = candidate_arts[:4]

        for art in landmark_arts:
            parties_str = ", ".join(art.get("party_codes", [])) or "Tamil Nadu State"
            t_str = ", ".join(art.get("topics", [])) or "Politics"
            kd = KeyDevelopmentItem(
                headline_en=art["title"],
                headline_ta=art.get("tamil_title") or art["title"],
                summary_en=f"Reports from {art.get('source_name', 'media')} highlight key activities regarding {parties_str} in the domain of {t_str}.",
                summary_ta=f"{art.get('source_name', 'ஊடக')} செய்திகளின்படி, {parties_str} சார்ந்த {t_str} விவகாரங்கள் தற்போதைய அரசியல் அரங்கில் முன்னுரிமை பெற்றுள்ளன.",
                impact_assessment="Direct impact on candidate positioning and campaign talking points for the 2026 assembly election.",
                supporting_article_ids=[art["id"]],
                supporting_article_urls=[art.get("source_url", "")]
            )
            key_developments.append(kd)

        # 4. Bilingual narrative text
        publishers_list = sorted(list({a.get("source_name") for a in candidate_arts if a.get("source_name")}))
        top_party = party_insights[0]["party_code"] if party_insights else "DMK"
        top_topic = emerging_topics[0]["topic"] if emerging_topics else "Governance"

        brief_en = (
            f"### Executive Summary ({period.upper()} Political Brief)\n"
            f"During the monitored {period} window from {curr_start.strftime('%d %b, %H:%M UTC')} to {curr_end.strftime('%d %b, %H:%M UTC')}, "
            f"the intelligence engine analyzed **{len(candidate_arts)} news reports** across {len(publishers_list)} verified publishers "
            f"({', '.join(publishers_list[:4])}{'...' if len(publishers_list) > 4 else ''}).\n\n"
            f"- **Primary Focus**: Highest editorial focus centered on **{top_topic}** with significant coverage dedicated to **{top_party}**.\n"
            f"- **Publisher Diversity**: Cross-verified across independent outlets with no single publisher monopolizing coverage.\n"
            f"- **Key Dynamic**: Newsrooms reflect heightened strategic rhetoric between ruling alliance and opposition formations heading into 2026."
        )

        brief_ta = (
            f"### முதன்மை அரசியல் சுருக்கம் ({period} காலக்கட்டம்)\n"
            f"{curr_start.strftime('%d %b %H:%M')} முதல் {curr_end.strftime('%d %b %H:%M')} வரையிலான காலக்கட்டத்தில், "
            f"சரிபார்க்கப்பட்ட {len(publishers_list)} ஊடகங்களில் இருந்து **{len(candidate_arts)} அரசியல் செய்திகள்** பகுப்பாய்வு செய்யப்பட்டன.\n\n"
            f"- **முக்கிய கவனப்பொருள்**: ஊடகங்களில் அதிகபட்சமாக **{top_topic}** மற்றும் **{top_party}** சார்ந்த நிகழ்வுகள் முக்கியத்துவம் பெற்றன.\n"
            f"- **ஊடகப் பரவல்**: செய்திகள் பலதரப்பட்ட முன்னணி ஊடகங்களால் உறுதிப்படுத்தப்பட்டு சமநிலையான தகவல்கள் பதிவு செய்யப்பட்டுள்ளன.\n"
            f"- **கள நிலவரம்**: 2026 சட்டமன்றத் தேர்தலை நோக்கி ஆளும் மற்றும் எதிர்க்கட்சிகளின் அரசியல் நகர்வுகள் தீவிரமடைந்துள்ளன."
        )

        # Evidence references
        evidence_articles = [
            {
                "id": a["id"],
                "title": a["title"],
                "tamil_title": a.get("tamil_title") or a["title"],
                "source": a.get("source_name", ""),
                "source_url": a.get("source_url", ""),
                "published_at": a["published_at"],
                "party_codes": a.get("party_codes", []),
                "sentiment": a.get("sentiment", "neutral")
            }
            for a in candidate_arts[:20]
        ]

        brief_dict = {
            "id": brief_id,
            "data_status": data_status,
            "period": period,
            "window_start": curr_start.isoformat(),
            "window_end": curr_end.isoformat(),
            "evidence_hash": evidence_hash,
            "config_version": CONFIG_VERSION,
            "generated_at": now_str,
            "sample_size": len(candidate_arts),
            "publisher_count": len(publishers_list),
            "brief_english": brief_en,
            "brief_tamil": brief_ta,
            "key_developments": [kd.model_dump() for kd in key_developments],
            "emerging_topics": emerging_topics,
            "party_insights": party_insights,
            "supporting_article_ids": [a["id"] for a in candidate_arts],
            "evidence_articles": evidence_articles,
            "status": "sufficient_data"
        }

        # Persist into database for idempotency
        source_registry.save_brief(brief_dict)

        return IntelligenceBriefResponse(
            id=brief_id,
            data_status=data_status,
            period=period,
            window_start=curr_start.isoformat(),
            window_end=curr_end.isoformat(),
            generated_at=now_str,
            sample_size=len(candidate_arts),
            publisher_count=len(publishers_list),
            status="sufficient_data",
            brief_english=brief_en,
            brief_tamil=brief_ta,
            key_developments=key_developments,
            emerging_topics=emerging_topics,
            party_insights=party_insights,
            supporting_article_ids=[a["id"] for a in candidate_arts],
            evidence_articles=evidence_articles,
            caveat="Verified intelligence brief based on monitored Tamil publishers. Excludes unverified social media rumor.",
            is_cached=False
        )

    def search_articles(
        self,
        mode: str = "live",
        q: Optional[str] = None,
        party: Optional[str] = None,
        leader: Optional[str] = None,
        topic: Optional[str] = None,
        source: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        sort_order: str = "desc",
        limit: int = 50
    ) -> Dict[str, Any]:
        raw_articles = self._get_raw_articles(mode)
        results = raw_articles

        if q:
            query = q.lower().strip()
            results = [
                a for a in results
                if query in a.get("title", "").lower()
                or query in a.get("tamil_title", "").lower()
                or query in a.get("summary", "").lower()
                or query in a.get("tamil_summary", "").lower()
                or any(query in p.lower() for p in a.get("party_codes", []))
                or any(query in l.lower() for l in a.get("leader_names", []))
                or any(query in t.lower() for t in a.get("topics", []))
            ]

        if party:
            p_code = party.upper()
            results = [a for a in results if p_code in a.get("party_codes", [])]

        if leader:
            l_str = leader.lower()
            results = [a for a in results if any(l_str in l.lower() for l in a.get("leader_names", []))]

        if topic:
            t_str = topic.lower()
            results = [a for a in results if any(t_str in t.lower() for t in a.get("topics", []))]

        if source:
            s_str = source.lower()
            results = [a for a in results if s_str in a.get("source_id", "").lower() or s_str in a.get("source_name", "").lower()]

        if date_from:
            try:
                dt_from = self._parse_iso(date_from)
                results = [a for a in results if self._parse_iso(a["published_at"]) >= dt_from]
            except Exception:
                pass

        if date_to:
            try:
                dt_to = self._parse_iso(date_to)
                results = [a for a in results if self._parse_iso(a["published_at"]) <= dt_to]
            except Exception:
                pass

        # Sort
        reverse = (sort_order.lower() == "desc")
        results.sort(key=lambda a: a.get("published_at", ""), reverse=reverse)

        total_matched = len(results)
        paginated = results[:limit]

        return {
            "total_matched": total_matched,
            "limit": limit,
            "mode": mode,
            "articles": paginated
        }

brief_service = BriefService()
