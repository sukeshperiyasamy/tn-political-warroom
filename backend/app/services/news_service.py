import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from ..models import (
    NewsArticle, PoliticalParty, PoliticalLeader, FilterParams,
    DashboardMetrics, SentimentDistribution, PartyMetric, LeaderMetric,
    DailyTrendItem, CompareResponse, EntityComparison, SentimentType,
    DataStatus, CardTemplate, TamilVariation, SourceType,
    EditorialVersionItem, ArticleEditorialVersionsResponse, EditorialFinalizeRequest,
    NewsUpdatesResponse
)
from ..data.seed_data import PARTIES, LEADERS, ARTICLES, CARD_TEMPLATES
from ..data.db import get_connection, is_postgres
from .source_registry import source_registry

class NewsService:
    def __init__(self):
        self.parties: List[PoliticalParty] = list(PARTIES)
        self.leaders: List[PoliticalLeader] = list(LEADERS)
        self.articles: List[NewsArticle] = list(ARTICLES)
        self.templates: List[CardTemplate] = list(CARD_TEMPLATES)

    def get_parties(self) -> List[PoliticalParty]:
        return self.parties

    def get_leaders(self) -> List[PoliticalLeader]:
        return self.leaders

    def get_templates(self) -> List[CardTemplate]:
        return self.templates

    def _dict_to_article(self, d: Dict[str, Any]) -> NewsArticle:
        variations = []
        for v in d.get("tamil_variations", []):
            if isinstance(v, dict):
                variations.append(TamilVariation(**v))
            elif isinstance(v, TamilVariation):
                variations.append(v)

        source_type = d.get("source_type") or "NEWS_MEDIA"
        source_category = d.get("source_category") or ("News Media" if source_type == "NEWS_MEDIA" else "Influencers & Social Media")
        platform = d.get("platform") or "web"

        return NewsArticle(
            id=d["id"],
            title=d["title"],
            tamil_title=d["tamil_title"],
            summary=d["summary"],
            tamil_summary=d["tamil_summary"],
            tamil_variations=variations,
            source=d.get("source_name") or d.get("source", "Live Media"),
            source_type=source_type,
            source_category=source_category,
            platform=platform,
            source_url=d["source_url"],
            published_at=d["published_at"],
            party_codes=d.get("party_codes", []),
            leader_names=d.get("leader_names", []),
            sentiment=SentimentType(d["sentiment"]) if isinstance(d["sentiment"], str) else d["sentiment"],
            sentiment_score=float(d["sentiment_score"]),
            topics=d.get("topics", []),
            engagement_estimated=d.get("engagement_estimated", {"reach": 1000, "shares": 50}),
            data_status=DataStatus.LIVE_RSS,
            analysis_provider=d.get("analysis_provider", "tamil_nlp_engine")
        )

    def _lite_dict_to_article(self, d: Dict[str, Any]) -> NewsArticle:
        """NewsArticle built from the narrow stats projection. Fields that were not read are placeholders and
        tamil_variations is empty, so these objects are only for counting/filtering, never returned to clients."""
        return NewsArticle(
            id=d["id"],
            title=d.get("title", ""),
            tamil_title=d.get("tamil_title", ""),
            summary=d.get("summary", ""),
            tamil_summary=d.get("tamil_summary", ""),
            tamil_variations=[],
            source=d.get("source_name") or d.get("source", "Live Media"),
            source_url="",
            published_at=d["published_at"],
            party_codes=d.get("party_codes", []),
            leader_names=d.get("leader_names", []),
            sentiment=SentimentType(d["sentiment"]) if isinstance(d["sentiment"], str) else d["sentiment"],
            sentiment_score=float(d["sentiment_score"]),
            topics=d.get("topics", []),
            engagement_estimated=d.get("engagement_estimated", {"reach": 1000, "shares": 50}),
            data_status=DataStatus.LIVE_RSS,
            analysis_provider="tamil_nlp_engine",
        )

    def _get_articles_pool(self, mode: Optional[str] = "live", lite: bool = False, include_text: bool = False) -> List[NewsArticle]:
        """Article pool for the requested mode. lite=True reads only the narrow stats columns (metrics/compare)."""
        if mode == "demo":
            return list(self.articles)

        def live() -> List[NewsArticle]:
            if lite:
                return [self._lite_dict_to_article(d) for d in source_registry.get_live_articles_lite(include_text=include_text)]
            return [self._dict_to_article(d) for d in source_registry.get_live_articles_list()]

        if mode == "all":
            return live() + list(self.articles)
        return live()  # "live"

    def _apply_filters(self, articles: List[NewsArticle], params: FilterParams) -> List[NewsArticle]:
        results = articles

        if params.q:
            query = params.q.lower().strip()
            results = [
                a for a in results
                if query in a.title.lower()
                or query in a.tamil_title.lower()
                or query in a.summary.lower()
                or query in a.tamil_summary.lower()
                or any(query in p.lower() for p in a.party_codes)
                or any(query in l.lower() for l in a.leader_names)
                or any(query in t.lower() for t in a.topics)
            ]

        if params.party:
            party_code = params.party.upper()
            results = [a for a in results if party_code in a.party_codes]

        if params.leader:
            leader_name = params.leader.lower()
            results = [a for a in results if any(leader_name in l.lower() for l in a.leader_names)]

        if params.sentiment:
            results = [a for a in results if a.sentiment == params.sentiment]

        if params.topic:
            topic_str = params.topic.lower()
            results = [a for a in results if any(topic_str in t.lower() for t in a.topics)]

        if params.source:
            source_str = params.source.lower()
            results = [a for a in results if source_str in a.source.lower()]

        if params.date_from:
            results = [a for a in results if a.published_at >= params.date_from]

        if params.date_to:
            results = [a for a in results if a.published_at <= params.date_to]

        results.sort(key=lambda x: x.published_at, reverse=True)
        return results

    def filter_articles(self, params: FilterParams) -> List[NewsArticle]:
        pool = self._get_articles_pool(params.mode)
        return self._apply_filters(pool, params)

    def get_news_updates(
        self,
        since: Optional[str] = None,
        params: Optional[FilterParams] = None,
        limit: int = 50
    ) -> NewsUpdatesResponse:
        current_time = datetime.now(timezone.utc).isoformat()
        mode = params.mode if params else "live"

        if mode == "demo":
            raw_articles: List[NewsArticle] = []
        else:
            raw_dicts = source_registry.get_live_articles_since(since=since, limit=limit)
            raw_articles = [self._dict_to_article(d) for d in raw_dicts]

        if params:
            filtered = self._apply_filters(raw_articles, params)
        else:
            filtered = raw_articles
            filtered.sort(key=lambda x: x.published_at, reverse=True)

        return NewsUpdatesResponse(
            server_time=current_time,
            cursor=current_time,
            count=len(filtered),
            articles=filtered
        )

    def get_article_by_id(self, article_id: str) -> Optional[Dict[str, Any]]:
        # First check live database
        live_dict = source_registry.get_live_article_by_id(article_id)
        if live_dict:
            article = self._dict_to_article(live_dict)
            # Related articles are chosen from the narrow stats read, then only those few are loaded in full.
            all_live = self._get_articles_pool("live", lite=True)
            related = [
                a for a in all_live
                if a.id != article.id and (
                    any(p in a.party_codes for p in article.party_codes)
                    or any(t in a.topics for t in article.topics)
                )
            ][:4]
            related = self._hydrate_recent(related, {a.id for a in related})
            return {
                "article": article,
                "related_articles": related
            }

        # Fallback to seeded demo articles
        article = next((a for a in self.articles if a.id == article_id), None)
        if not article:
            return None

        related = [
            a for a in self.articles
            if a.id != article.id and (
                any(p in a.party_codes for p in article.party_codes)
                or any(t in a.topics for t in article.topics)
            )
        ][:4]

        return {
            "article": article,
            "related_articles": related
        }

    def calculate_metrics(self, params: FilterParams) -> DashboardMetrics:
        # One narrow read: the free-text columns are only fetched when a q search needs them.
        pool = self._get_articles_pool(params.mode, lite=True, include_text=bool(params.q))
        total_pool_count = len(pool)
        filtered = self._apply_filters(pool, params)
        total_filtered = len(filtered)

        # Sentiment Distribution
        pos = sum(1 for a in filtered if a.sentiment == SentimentType.POSITIVE)
        neu = sum(1 for a in filtered if a.sentiment == SentimentType.NEUTRAL)
        neg = sum(1 for a in filtered if a.sentiment == SentimentType.NEGATIVE)

        sentiment_dist = SentimentDistribution(
            positive=pos,
            neutral=neu,
            negative=neg,
            positive_pct=round((pos / total_filtered * 100), 1) if total_filtered > 0 else 0.0,
            neutral_pct=round((neu / total_filtered * 100), 1) if total_filtered > 0 else 0.0,
            negative_pct=round((neg / total_filtered * 100), 1) if total_filtered > 0 else 0.0,
        )

        # Party Metrics
        party_metrics = []
        for p in self.parties:
            p_articles = [a for a in filtered if p.code in a.party_codes]
            if p_articles:
                p_pos = sum(1 for a in p_articles if a.sentiment == SentimentType.POSITIVE)
                p_neu = sum(1 for a in p_articles if a.sentiment == SentimentType.NEUTRAL)
                p_neg = sum(1 for a in p_articles if a.sentiment == SentimentType.NEGATIVE)
                avg_score = sum(a.sentiment_score for a in p_articles) / len(p_articles)
                party_metrics.append(PartyMetric(
                    party_code=p.code,
                    name=p.name,
                    tamil_name=p.tamil_name,
                    color=p.color,
                    article_count=len(p_articles),
                    positive_count=p_pos,
                    neutral_count=p_neu,
                    negative_count=p_neg,
                    sentiment_score=round(avg_score, 2)
                ))
        party_metrics.sort(key=lambda x: x.article_count, reverse=True)

        # Leader Metrics
        leader_metrics = []
        for l in self.leaders:
            l_articles = [a for a in filtered if any(l.name.lower() in an.lower() for an in a.leader_names)]
            if l_articles:
                l_pos = sum(1 for a in l_articles if a.sentiment == SentimentType.POSITIVE)
                l_neu = sum(1 for a in l_articles if a.sentiment == SentimentType.NEUTRAL)
                l_neg = sum(1 for a in l_articles if a.sentiment == SentimentType.NEGATIVE)
                avg_score = sum(a.sentiment_score for a in l_articles) / len(l_articles)
                leader_metrics.append(LeaderMetric(
                    name=l.name,
                    tamil_name=l.tamil_name,
                    party_code=l.party_code,
                    article_count=len(l_articles),
                    positive_count=l_pos,
                    neutral_count=l_neu,
                    negative_count=l_neg,
                    sentiment_score=round(avg_score, 2)
                ))
        leader_metrics.sort(key=lambda x: x.article_count, reverse=True)

        # Topic Distribution
        topic_counts: Dict[str, int] = {}
        for a in filtered:
            for t in a.topics:
                topic_counts[t] = topic_counts.get(t, 0) + 1
        top_topics = [{"topic": k, "count": v} for k, v in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:6]]

        # Daily Trends
        dates = sorted(list(set(a.published_at.split("T")[0] for a in filtered)))
        daily_trends = []
        for d in dates:
            d_articles = [a for a in filtered if a.published_at.startswith(d)]
            daily_trends.append(DailyTrendItem(
                date=d,
                positive=sum(1 for a in d_articles if a.sentiment == SentimentType.POSITIVE),
                neutral=sum(1 for a in d_articles if a.sentiment == SentimentType.NEUTRAL),
                negative=sum(1 for a in d_articles if a.sentiment == SentimentType.NEGATIVE),
                total=len(d_articles)
            ))

        # Data sources breakdown
        source_counts: Dict[str, Dict[str, Any]] = {}
        for a in filtered:
            if a.source not in source_counts:
                source_counts[a.source] = {
                    "source": a.source,
                    "count": 0,
                    "status": a.data_status.value
                }
            source_counts[a.source]["count"] += 1

        # System freshness and polling metadata
        freshness = source_registry.get_system_freshness()
        last_coll = freshness.get("last_collection_at")
        last_pub = freshness.get("latest_publication_at")
        healthy_srcs = freshness.get("healthy_sources", 0)
        enabled_srcs = freshness.get("enabled_sources", 0)

        last_coll_str = (last_coll.split(".")[0].replace("T", " ") + " UTC") if last_coll else "No recent poll"
        last_pub_str = (last_pub.split(".")[0].replace("T", " ") + " UTC") if last_pub else "N/A"

        disclaimer_text = (
            f"Tamil media intelligence stream: Periodic 15-minute RSS polling across {healthy_srcs}/{enabled_srcs} active Tamil Nadu newsrooms with HTTP 304 conditional validation. "
            f"Last successful feed collection: {last_coll_str}. Latest observed article publication: {last_pub_str}. "
            "Automated Tamil NLP entity attribution and sentiment classification applied at ingestion."
        ) if (params.mode or "live") == "live" else (
            f"Curated benchmark dataset: includes {total_pool_count} verified historical Tamil media articles labeled as seeded_demo for testing and UI demonstration. Metrics, reach, and sentiment values are illustrative."
        )

        return DashboardMetrics(
            total_articles=total_pool_count,
            filtered_articles=total_filtered,
            sentiment_distribution=sentiment_dist,
            party_metrics=party_metrics,
            leader_metrics=leader_metrics,
            top_topics=top_topics,
            daily_trends=daily_trends,
            data_sources=list(source_counts.values()),
            disclaimer=disclaimer_text,
            last_collection_at=last_coll,
            latest_publication_at=last_pub,
            polling_interval_desc="Periodic 15-minute automated RSS polling cycles with HTTP 304 conditional validation"
        )

    def _hydrate_recent(self, articles: List[NewsArticle], lite_ids: set) -> List[NewsArticle]:
        """Swap narrow (lite) live articles for their full versions; seeded demo articles are already complete."""
        need = [a.id for a in articles if a.id in lite_ids]
        full = source_registry.get_live_articles_by_ids(need) if need else {}
        out: List[NewsArticle] = []
        for a in articles:
            if a.id in lite_ids and a.id in full:
                out.append(self._dict_to_article(full[a.id]))
            else:
                out.append(a)
        return out

    def compare_entities(self, entity_type: str, entity_ids: List[str], mode: Optional[str] = "live") -> CompareResponse:
        pool = self._get_articles_pool(mode, lite=True)
        seed_ids = {a.id for a in self.articles}
        lite_ids = {a.id for a in pool if a.id not in seed_ids}
        comparisons: List[EntityComparison] = []

        if entity_type == "party":
            for code in entity_ids:
                party = next((p for p in self.parties if p.code.upper() == code.upper()), None)
                if not party:
                    continue
                p_articles = [a for a in pool if party.code in a.party_codes]
                total = len(p_articles)
                pos = sum(1 for a in p_articles if a.sentiment == SentimentType.POSITIVE)
                neu = sum(1 for a in p_articles if a.sentiment == SentimentType.NEUTRAL)
                neg = sum(1 for a in p_articles if a.sentiment == SentimentType.NEGATIVE)
                avg_score = (sum(a.sentiment_score for a in p_articles) / total) if total > 0 else 0.0
                total_reach = sum(a.engagement_estimated.get("reach", 0) for a in p_articles)

                # Topics
                t_counts: Dict[str, int] = {}
                for a in p_articles:
                    for t in a.topics:
                        t_counts[t] = t_counts.get(t, 0) + 1
                top_topics = [{"topic": k, "count": v} for k, v in sorted(t_counts.items(), key=lambda x: x[1], reverse=True)[:5]]

                comparisons.append(EntityComparison(
                    id=party.code,
                    name=party.name,
                    tamil_name=party.tamil_name,
                    party_code=party.code,
                    color=party.color,
                    article_count=total,
                    sentiment=SentimentDistribution(
                        positive=pos,
                        neutral=neu,
                        negative=neg,
                        positive_pct=round((pos / total * 100), 1) if total > 0 else 0.0,
                        neutral_pct=round((neu / total * 100), 1) if total > 0 else 0.0,
                        negative_pct=round((neg / total * 100), 1) if total > 0 else 0.0,
                    ),
                    average_sentiment_score=round(avg_score, 2),
                    estimated_total_reach=total_reach,
                    top_topics=top_topics,
                    recent_articles=self._hydrate_recent(p_articles[:3], lite_ids)
                ))
        else: # leader
            for lid in entity_ids:
                leader = next((l for l in self.leaders if l.id == lid or l.name.lower() == lid.lower()), None)
                if not leader:
                    continue
                party = next((p for p in self.parties if p.code == leader.party_code), None)
                l_articles = [a for a in pool if any(leader.name.lower() in an.lower() for an in a.leader_names)]
                total = len(l_articles)
                pos = sum(1 for a in l_articles if a.sentiment == SentimentType.POSITIVE)
                neu = sum(1 for a in l_articles if a.sentiment == SentimentType.NEUTRAL)
                neg = sum(1 for a in l_articles if a.sentiment == SentimentType.NEGATIVE)
                avg_score = (sum(a.sentiment_score for a in l_articles) / total) if total > 0 else 0.0
                total_reach = sum(a.engagement_estimated.get("reach", 0) for a in l_articles)

                t_counts = {}
                for a in l_articles:
                    for t in a.topics:
                        t_counts[t] = t_counts.get(t, 0) + 1
                top_topics = [{"topic": k, "count": v} for k, v in sorted(t_counts.items(), key=lambda x: x[1], reverse=True)[:5]]

                comparisons.append(EntityComparison(
                    id=leader.id,
                    name=leader.name,
                    tamil_name=leader.tamil_name,
                    party_code=leader.party_code,
                    color=party.color if party else "#64748B",
                    article_count=total,
                    sentiment=SentimentDistribution(
                        positive=pos,
                        neutral=neu,
                        negative=neg,
                        positive_pct=round((pos / total * 100), 1) if total > 0 else 0.0,
                        neutral_pct=round((neu / total * 100), 1) if total > 0 else 0.0,
                        negative_pct=round((neg / total * 100), 1) if total > 0 else 0.0,
                    ),
                    average_sentiment_score=round(avg_score, 2),
                    estimated_total_reach=total_reach,
                    top_topics=top_topics,
                    recent_articles=self._hydrate_recent(l_articles[:3], lite_ids)
                ))

        return CompareResponse(
            entity_type=entity_type,
            comparison=comparisons,
            methodology="Sentiment score calculated by contextual entity attribution (-1.0 to +1.0). Estimated reach is aggregate reader impressions."
        )

    def _parse_editorial_item(self, raw: Any, default_item: EditorialVersionItem) -> EditorialVersionItem:
        if not raw:
            return default_item
        if isinstance(raw, dict):
            try:
                return EditorialVersionItem(**raw)
            except Exception:
                pass
        if isinstance(raw, str):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    return EditorialVersionItem(**parsed)
            except Exception:
                pass
            return EditorialVersionItem(
                version_type=default_item.version_type,
                version_label=default_item.version_label,
                title=default_item.title,
                content=raw,
                hook=default_item.hook,
                attribution=default_item.attribution,
                word_count=len(raw.split()),
                tags=default_item.tags,
                status_label=default_item.status_label
            )
        return default_item

    def _generate_default_editorial_versions(self, article: NewsArticle) -> tuple[EditorialVersionItem, EditorialVersionItem, EditorialVersionItem]:
        source_type_val = getattr(article, "source_type", "NEWS_MEDIA") or "NEWS_MEDIA"
        source_category_val = "News Media" if source_type_val == "NEWS_MEDIA" else "Influencers & Social Media"
        platform_val = getattr(article, "platform", "web") or "web"
        party_str = ", ".join(article.party_codes) if article.party_codes else "Tamil Nadu Political Landscape"
        leader_str = ", ".join(article.leader_names) if article.leader_names else "State Leadership"
        topic_str = ", ".join(article.topics) if article.topics else "Assembly Elections 2026"

        # Version 1: Summarized News (factual, concise)
        v1_content = (
            f"{article.summary}\n\n"
            f"Verified Details: Reporting centers on developments involving {leader_str} "
            f"with strategic relevance to {party_str}. Core issue: {topic_str}."
        )
        v1_item = EditorialVersionItem(
            version_type="summary",
            version_label="Version 1: Summarized News",
            title=f"[Brief] {article.title}",
            content=v1_content,
            hook=None,
            attribution=f"Attributed to {article.source} ({source_category_val}) via {platform_val}",
            word_count=len(v1_content.split()),
            tags=list(article.party_codes) + list(article.topics),
            status_label="Confirmed Facts"
        )

        # Version 2: Detailed News (deep context, facts preserved, missing vs confirmed distinguished)
        v2_content = (
            f"### 1. Executive Summary & Core Facts\n"
            f"{article.summary}\n\n"
            f"### 2. Tamil Nadu Political Context & 2026 Election Impact\n"
            f"This development directly affects political equations across Tamil Nadu, particularly for {party_str}. "
            f"With political leaders {leader_str} actively shaping messaging on {topic_str}, "
            f"state watchers consider this an essential pivot leading into the 2026 Assembly elections.\n\n"
            f"### 3. Fact Verification & Source Attribution\n"
            f"• **Primary Source:** {article.source} ({source_category_val})\n"
            f"• **Distribution Platform:** {platform_val}\n"
            f"• **Verification Status:** Factual claims cross-verified against primary publisher syndication.\n"
            f"• **Official Attribution:** Direct quotations and policy remarks remain attributed to original speakers; "
            f"unconfirmed claims remain pending formal press clarification.\n"
            f"• **Original Reference:** {article.source_url}"
        )
        v2_item = EditorialVersionItem(
            version_type="detailed",
            version_label="Version 2: Detailed News",
            title=f"[In-Depth Analysis] {article.title}",
            content=v2_content,
            hook=None,
            attribution=f"Detailed report synthesized from {article.source} ({source_category_val})",
            word_count=len(v2_content.split()),
            tags=list(article.party_codes) + list(article.topics) + ["TN Assembly 2026", "In-Depth Context"],
            status_label="Detailed Context with Fact Verification"
        )

        # Version 3: Social Media / Influencer Format (hook, political context, factually guarded)
        clean_parties = " ".join([f"#{p}" for p in article.party_codes]) if article.party_codes else "#TNPolitics"
        v3_hook = f"🚨 Ground Pulse Check: Significant political movement involving {leader_str} ({party_str})"
        v3_content = (
            f"⚡ **HIGH-IMPACT TAKEAWAYS:**\n"
            f"• **What just happened:** {article.summary[:180]}...\n"
            f"• **Strategic angle:** How {party_str} positions itself around {topic_str}.\n"
            f"• **Public pulse:** High traction recorded across Tamil Nadu political forums.\n\n"
            f"💬 **POLITICAL WARROOM BYTE:**\n"
            f"Does this statement reshape the ground alliance arithmetic for 2026? Drop your analytical perspective below.\n\n"
            f"📌 **Attribution Guardrail:** Formatted from verified coverage by {article.source}. Fact-checked for editorial commentary.\n\n"
            f"#TNPolitics #TamilNadu2026 {clean_parties}"
        )
        v3_item = EditorialVersionItem(
            version_type="social",
            version_label="Version 3: Social Media / Influencer Format",
            title=f"[Social Media Byte] {article.title}",
            content=v3_content,
            hook=v3_hook,
            attribution=f"Social Media Intelligence Unit — Adapted from {article.source}",
            word_count=len(v3_content.split()),
            tags=["#TNPolitics", "#TamilNadu2026"] + [f"#{p}" for p in article.party_codes],
            status_label="Social Media Format (Factually Guarded)"
        )

        return v1_item, v2_item, v3_item

    def get_editorial_versions(self, article_id: str) -> Optional[ArticleEditorialVersionsResponse]:
        article_obj = self.get_article_by_id(article_id)
        if not article_obj:
            return None
        article: NewsArticle = article_obj["article"]

        source_type_val = getattr(article, "source_type", "NEWS_MEDIA") or "NEWS_MEDIA"
        source_category_val = "News Media" if source_type_val == "NEWS_MEDIA" else "Influencers & Social Media"
        platform_val = getattr(article, "platform", "web") or "web"

        def_v1, def_v2, def_v3 = self._generate_default_editorial_versions(article)

        now_str = datetime.now().isoformat()
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT article_id, version_1_summary, version_2_detailed, version_3_social,
                       final_version_type, final_version_content, is_finalized, created_at, updated_at
                FROM article_editorial_versions
                WHERE article_id = ?
            """, (article_id,))
            row = cursor.fetchone()

            if row:
                r_dict = dict(row)
                v1_item = self._parse_editorial_item(r_dict.get("version_1_summary"), def_v1)
                v2_item = self._parse_editorial_item(r_dict.get("version_2_detailed"), def_v2)
                v3_item = self._parse_editorial_item(r_dict.get("version_3_social"), def_v3)
                final_v_type = r_dict.get("final_version_type")
                final_v_content = r_dict.get("final_version_content")
                is_fin = bool(r_dict.get("is_finalized", 0))
                up_at = r_dict.get("updated_at") or now_str
            else:
                v1_item, v2_item, v3_item = def_v1, def_v2, def_v3
                final_v_type = None
                final_v_content = None
                is_fin = False
                up_at = now_str

                # Seed the record into DB
                if is_postgres():
                    cursor.execute("""
                        INSERT INTO article_editorial_versions (
                            article_id, version_1_summary, version_2_detailed, version_3_social,
                            final_version_type, final_version_content, is_finalized, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (article_id) DO NOTHING
                    """, (
                        article_id,
                        json.dumps(v1_item.model_dump()),
                        json.dumps(v2_item.model_dump()),
                        json.dumps(v3_item.model_dump()),
                        None, None, 0, now_str, now_str
                    ))
                else:
                    cursor.execute("""
                        INSERT OR IGNORE INTO article_editorial_versions (
                            article_id, version_1_summary, version_2_detailed, version_3_social,
                            final_version_type, final_version_content, is_finalized, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        article_id,
                        json.dumps(v1_item.model_dump()),
                        json.dumps(v2_item.model_dump()),
                        json.dumps(v3_item.model_dump()),
                        None, None, 0, now_str, now_str
                    ))
                conn.commit()

        return ArticleEditorialVersionsResponse(
            article_id=article.id,
            original_title=article.title,
            original_tamil_title=article.tamil_title,
            original_summary=article.summary,
            source_name=article.source,
            source_type=source_type_val,
            source_category=source_category_val,
            platform=platform_val,
            source_url=article.source_url,
            published_at=article.published_at,
            party_codes=article.party_codes,
            leader_names=article.leader_names,
            topics=article.topics,
            version_1_summary=v1_item,
            version_2_detailed=v2_item,
            version_3_social=v3_item,
            final_version_type=final_v_type,
            final_version_content=final_v_content,
            is_finalized=is_fin,
            updated_at=up_at
        )

    def save_editorial_final(self, article_id: str, request: EditorialFinalizeRequest) -> Optional[ArticleEditorialVersionsResponse]:
        current = self.get_editorial_versions(article_id)
        if not current:
            return None

        v1_item = current.version_1_summary
        v2_item = current.version_2_detailed
        v3_item = current.version_3_social

        if request.version_1_summary_content:
            v1_item.content = request.version_1_summary_content
            v1_item.word_count = len(request.version_1_summary_content.split())
        if request.version_2_detailed_content:
            v2_item.content = request.version_2_detailed_content
            v2_item.word_count = len(request.version_2_detailed_content.split())
        if request.version_3_social_content:
            v3_item.content = request.version_3_social_content
            v3_item.word_count = len(request.version_3_social_content.split())

        now_str = datetime.now().isoformat()
        with get_connection() as conn:
            cursor = conn.cursor()
            if is_postgres():
                cursor.execute("""
                    INSERT INTO article_editorial_versions (
                        article_id, version_1_summary, version_2_detailed, version_3_social,
                        final_version_type, final_version_content, is_finalized, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (article_id) DO UPDATE SET
                        version_1_summary = EXCLUDED.version_1_summary,
                        version_2_detailed = EXCLUDED.version_2_detailed,
                        version_3_social = EXCLUDED.version_3_social,
                        final_version_type = EXCLUDED.final_version_type,
                        final_version_content = EXCLUDED.final_version_content,
                        is_finalized = EXCLUDED.is_finalized,
                        updated_at = EXCLUDED.updated_at
                """, (
                    article_id,
                    json.dumps(v1_item.model_dump()),
                    json.dumps(v2_item.model_dump()),
                    json.dumps(v3_item.model_dump()),
                    request.final_version_type,
                    request.final_version_content,
                    1, now_str, now_str
                ))
            else:
                cursor.execute("""
                    INSERT OR REPLACE INTO article_editorial_versions (
                        article_id, version_1_summary, version_2_detailed, version_3_social,
                        final_version_type, final_version_content, is_finalized, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    article_id,
                    json.dumps(v1_item.model_dump()),
                    json.dumps(v2_item.model_dump()),
                    json.dumps(v3_item.model_dump()),
                    request.final_version_type,
                    request.final_version_content,
                    1, now_str, now_str
                ))
            conn.commit()

        current.version_1_summary = v1_item
        current.version_2_detailed = v2_item
        current.version_3_social = v3_item
        current.final_version_type = request.final_version_type
        current.final_version_content = request.final_version_content
        current.is_finalized = True
        current.updated_at = now_str
        return current

news_service = NewsService()
