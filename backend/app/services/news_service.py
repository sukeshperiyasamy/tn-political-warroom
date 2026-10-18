from typing import List, Optional, Dict, Any
from datetime import datetime
from ..models import (
    NewsArticle, PoliticalParty, PoliticalLeader, FilterParams,
    DashboardMetrics, SentimentDistribution, PartyMetric, LeaderMetric,
    DailyTrendItem, CompareResponse, EntityComparison, SentimentType,
    DataStatus, CardTemplate, TamilVariation
)
from ..data.seed_data import PARTIES, LEADERS, ARTICLES, CARD_TEMPLATES
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

        return NewsArticle(
            id=d["id"],
            title=d["title"],
            tamil_title=d["tamil_title"],
            summary=d["summary"],
            tamil_summary=d["tamil_summary"],
            tamil_variations=variations,
            source=d.get("source_name") or d.get("source", "Live Media"),
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

    def _get_articles_pool(self, mode: Optional[str] = "live") -> List[NewsArticle]:
        if mode == "demo":
            return list(self.articles)
        elif mode == "all":
            live_dicts = source_registry.get_live_articles()
            live_arts = [self._dict_to_article(d) for d in live_dicts]
            return live_arts + list(self.articles)
        else: # "live"
            live_dicts = source_registry.get_live_articles()
            return [self._dict_to_article(d) for d in live_dicts]

    def filter_articles(self, params: FilterParams) -> List[NewsArticle]:
        pool = self._get_articles_pool(params.mode)
        results = pool

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

        # Sort newest first
        results.sort(key=lambda x: x.published_at, reverse=True)
        return results

    def get_article_by_id(self, article_id: str) -> Optional[Dict[str, Any]]:
        # First check live database
        live_dict = source_registry.get_live_article_by_id(article_id)
        if live_dict:
            article = self._dict_to_article(live_dict)
            all_live = self._get_articles_pool("live")
            related = [
                a for a in all_live
                if a.id != article.id and (
                    any(p in a.party_codes for p in article.party_codes)
                    or any(t in a.topics for t in article.topics)
                )
            ][:4]
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
        pool = self._get_articles_pool(params.mode)
        total_pool_count = len(pool)
        filtered = self.filter_articles(params)
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

    def compare_entities(self, entity_type: str, entity_ids: List[str], mode: Optional[str] = "live") -> CompareResponse:
        pool = self._get_articles_pool(mode)
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
                    recent_articles=p_articles[:3]
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
                    recent_articles=l_articles[:3]
                ))

        return CompareResponse(
            entity_type=entity_type,
            comparison=comparisons,
            methodology="Sentiment score calculated by contextual entity attribution (-1.0 to +1.0). Estimated reach is aggregate reader impressions."
        )

news_service = NewsService()
