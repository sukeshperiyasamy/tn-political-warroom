import json
import sqlite3
import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from backend.app.connectors.base import BaseConnector, NormalizedPost, ConnectorHealth, ConnectorStatus
from backend.app.data.migrations import DB_PATH

class NewsRSSConnector(BaseConnector):
    platform = "news"
    name = "Tamil News RSS Wire"
    supported_metrics = ["articles", "publishers"]

    def __init__(self, db_path: str = DB_PATH):
        super().__init__()
        self.db_path = db_path

    def validate_configuration(self) -> Tuple[bool, str]:
        return True, "Local RSS news ingestion pipeline configured and active."

    def health_check(self) -> ConnectorHealth:
        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM sources WHERE is_enabled = 1")
                active_sources = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM articles")
                total_articles = cursor.fetchone()[0]

            return ConnectorHealth(
                platform=self.platform,
                status=ConnectorStatus.HEALTHY,
                is_configured=True,
                last_checked_at=now_iso,
                message=f"Active ({active_sources} news wire feeds enabled, {total_articles} articles ingested).",
                quota_used=total_articles,
                quota_limit=100000,
                latency_ms=5
            )
        except Exception as e:
            return ConnectorHealth(
                platform=self.platform,
                status=ConnectorStatus.ERROR,
                is_configured=True,
                last_checked_at=now_iso,
                message=f"Database error checking RSS news: {str(e)}"
            )

    def search(
        self,
        query: str,
        limit: int = 25,
        since: Optional[datetime] = None
    ) -> List[NormalizedPost]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                sql = "SELECT * FROM articles"
                params: List[Any] = []
                where_clauses: List[str] = []

                if query:
                    where_clauses.append("(title LIKE ? OR summary LIKE ? OR tamil_title LIKE ?)")
                    wild = f"%{query}%"
                    params.extend([wild, wild, wild])

                if since:
                    where_clauses.append("published_at >= ?")
                    params.append(since.isoformat())

                if where_clauses:
                    sql += " WHERE " + " AND ".join(where_clauses)

                sql += " ORDER BY published_at DESC LIMIT ?"
                params.append(limit)

                cursor.execute(sql, params)
                rows = cursor.fetchall()

                return [self.normalize(dict(row)) for row in rows]
        except Exception as e:
            self.last_error = str(e)
            return []

    def fetch_item(self, platform_post_id: str) -> Optional[NormalizedPost]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM articles WHERE id = ?", (platform_post_id,))
                row = cursor.fetchone()
                if row:
                    return self.normalize(dict(row))
            return None
        except Exception as e:
            self.last_error = str(e)
            return None

    def normalize(self, raw_item: Dict[str, Any]) -> NormalizedPost:
        art_id = raw_item.get("id", "")
        title = raw_item.get("title", "")
        tamil_title = raw_item.get("tamil_title", "")
        summary = raw_item.get("summary", "")
        source_name = raw_item.get("source", "Tamil News Wire")
        canonical_url = raw_item.get("canonical_url") or raw_item.get("source_url", "")
        published_at = raw_item.get("published_at", datetime.now(timezone.utc).isoformat())

        parties = json.loads(raw_item.get("party_codes", "[]")) if isinstance(raw_item.get("party_codes"), str) else raw_item.get("party_codes", [])
        leaders = json.loads(raw_item.get("leader_names", "[]")) if isinstance(raw_item.get("leader_names"), str) else raw_item.get("leader_names", [])
        topics = json.loads(raw_item.get("topics", "[]")) if isinstance(raw_item.get("topics"), str) else raw_item.get("topics", [])
        
        sentiment = raw_item.get("sentiment", "neutral")
        sentiment_score = float(raw_item.get("sentiment_score", 0.0))
        data_status = raw_item.get("data_status", "LIVE_RSS")
        mode = "DEMO" if "demo" in data_status.lower() else "LIVE"

        now_iso = datetime.now(timezone.utc).isoformat()

        return NormalizedPost(
            id=f"news_{art_id}",
            platform="news",
            platform_post_id=art_id,
            canonical_url=canonical_url,
            author_name=source_name,
            author_handle=f"@{source_name.lower().replace(' ', '')}",
            title=title or tamil_title,
            content=summary or title,
            language="ta" if any('\u0B80' <= c <= '\u0BFF' for c in f"{title} {tamil_title}") else "en",
            media_type="article",
            thumbnail_url=None,
            published_at=published_at,
            first_seen_at=now_iso,
            last_seen_at=now_iso,
            views_count=None,
            likes_count=None,
            comments_count=None,
            shares_count=None,
            party_codes=parties,
            leader_names=leaders,
            topics=topics,
            hashtags=[],
            sentiment=sentiment,
            sentiment_score=sentiment_score,
            collection_mode=mode,
            raw_metrics_available=["articles"]
        )

    def get_quota_status(self) -> Dict[str, Any]:
        return {
            "platform": self.platform,
            "quota_used": 0,
            "quota_limit": 1000000,
            "quota_remaining": 1000000,
            "quota_reset_period": "Unlimited local ingestion"
        }

    def get_setup_instructions(self) -> Dict[str, Any]:
        return {
            "platform": "Tamil News RSS Wire",
            "env_variable": "Internal DB / sources table",
            "documentation_url": "/sources",
            "steps": [
                "1. Fully integrated with the TN Political War Room core news aggregator.",
                "2. Manage active Tamil news sources under the Source Registry tab.",
                "3. Ingestion runs periodically or on-demand."
            ]
        }
