import os
import time
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from backend.app.connectors.base import BaseConnector, NormalizedPost, ConnectorHealth, ConnectorStatus
from backend.app.services.entity_matcher import entity_matcher

class FacebookConnector(BaseConnector):
    platform = "facebook"
    name = "Meta Facebook Graph API"
    supported_metrics = ["likes", "comments", "shares", "reactions"]

    def __init__(self):
        super().__init__()
        self.access_token = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", "").strip()
        self.page_id = os.getenv("FACEBOOK_PAGE_ID", "").strip()
        self.base_url = "https://graph.facebook.com/v19.0"
        self.quota_used = 0
        self.rate_limit_hourly = 200

    def validate_configuration(self) -> Tuple[bool, str]:
        if not self.access_token or not self.page_id:
            return False, "FACEBOOK_PAGE_ACCESS_TOKEN and/or FACEBOOK_PAGE_ID not set."
        return True, "Facebook Page Access Token configured."

    def health_check(self) -> ConnectorHealth:
        now_iso = datetime.now(timezone.utc).isoformat()
        is_valid, msg = self.validate_configuration()
        if not is_valid:
            return ConnectorHealth(
                platform=self.platform,
                status=ConnectorStatus.NOT_CONFIGURED,
                is_configured=False,
                last_checked_at=now_iso,
                message=msg,
                quota_used=self.quota_used,
                quota_limit=self.rate_limit_hourly,
                error_count=self.error_count
            )

        start_time = time.time()
        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.get(
                    f"{self.base_url}/{self.page_id}",
                    params={
                        "fields": "id,name,fan_count",
                        "access_token": self.access_token
                    }
                )
                latency_ms = int((time.time() - start_time) * 1000)
                if resp.status_code == 200:
                    data = resp.json()
                    self.quota_used += 1
                    return ConnectorHealth(
                        platform=self.platform,
                        status=ConnectorStatus.HEALTHY,
                        is_configured=True,
                        last_checked_at=now_iso,
                        message=f"Connected to Facebook Page '{data.get('name')}'.",
                        quota_used=self.quota_used,
                        quota_limit=self.rate_limit_hourly,
                        latency_ms=latency_ms
                    )
                else:
                    err = resp.json().get("error", {})
                    return ConnectorHealth(
                        platform=self.platform,
                        status=ConnectorStatus.ERROR,
                        is_configured=True,
                        last_checked_at=now_iso,
                        message=f"Meta Graph API error: {err.get('message')}",
                        quota_used=self.quota_used,
                        quota_limit=self.rate_limit_hourly,
                        latency_ms=latency_ms
                    )
        except Exception as e:
            self.error_count += 1
            self.last_error = str(e)
            return ConnectorHealth(
                platform=self.platform,
                status=ConnectorStatus.ERROR,
                is_configured=True,
                last_checked_at=now_iso,
                message=f"Failed to connect to Facebook Graph API: {str(e)}",
                quota_used=self.quota_used,
                quota_limit=self.rate_limit_hourly,
                error_count=self.error_count
            )

    def search(
        self,
        query: str,
        limit: int = 25,
        since: Optional[datetime] = None
    ) -> List[NormalizedPost]:
        is_valid, _ = self.validate_configuration()
        if not is_valid:
            return []

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(
                    f"{self.base_url}/{self.page_id}/posts",
                    params={
                        "fields": "id,message,created_time,permalink_url,shares,likes.summary(true),comments.summary(true)",
                        "limit": min(limit, 50),
                        "access_token": self.access_token
                    }
                )
                self.quota_used += 1
                if resp.status_code != 200:
                    self.last_error = f"Facebook posts fetch HTTP {resp.status_code}"
                    self.error_count += 1
                    return []

                items = resp.json().get("data", [])
                results: List[NormalizedPost] = []
                for item in items:
                    msg = item.get("message", "").lower()
                    if not query or query.lower() in msg:
                        results.append(self.normalize(item))
                return results
        except Exception as e:
            self.last_error = str(e)
            self.error_count += 1
            return []

    def fetch_item(self, platform_post_id: str) -> Optional[NormalizedPost]:
        is_valid, _ = self.validate_configuration()
        if not is_valid:
            return None

        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.get(
                    f"{self.base_url}/{platform_post_id}",
                    params={
                        "fields": "id,message,created_time,permalink_url,shares,likes.summary(true),comments.summary(true)",
                        "access_token": self.access_token
                    }
                )
                self.quota_used += 1
                if resp.status_code == 200:
                    return self.normalize(resp.json())
            return None
        except Exception as e:
            self.last_error = str(e)
            return None

    def normalize(self, raw_item: Dict[str, Any]) -> NormalizedPost:
        post_id = raw_item.get("id", "")
        message = raw_item.get("message", "")
        published_at = raw_item.get("created_time", datetime.now(timezone.utc).isoformat())
        permalink = raw_item.get("permalink_url", f"https://www.facebook.com/{post_id}")

        shares = raw_item.get("shares", {}).get("count", 0)
        likes = raw_item.get("likes", {}).get("summary", {}).get("total_count", 0)
        comments = raw_item.get("comments", {}).get("summary", {}).get("total_count", 0)

        matched = entity_matcher.match_entities(message)
        sentiment, sentiment_score = entity_matcher.detect_sentiment(message)

        now_iso = datetime.now(timezone.utc).isoformat()

        return NormalizedPost(
            id=f"facebook_{post_id.replace('_', '-')}",
            platform="facebook",
            platform_post_id=post_id,
            canonical_url=permalink,
            author_name="TN Political Page",
            author_handle="@facebook_page",
            title=None,
            content=message[:1200] if message else "Public statement on Facebook",
            language="ta" if any('\u0B80' <= c <= '\u0BFF' for c in message) else "en",
            media_type="text",
            thumbnail_url=None,
            published_at=published_at,
            first_seen_at=now_iso,
            last_seen_at=now_iso,
            likes_count=likes,
            comments_count=comments,
            shares_count=shares,
            views_count=None,
            party_codes=matched["party_codes"],
            leader_names=matched["leader_names"],
            topics=matched["topics"],
            hashtags=matched["hashtags"],
            sentiment=sentiment,
            sentiment_score=sentiment_score,
            collection_mode="LIVE",
            raw_metrics_available=["likes", "comments", "shares"]
        )

    def get_quota_status(self) -> Dict[str, Any]:
        return {
            "platform": self.platform,
            "quota_used": self.quota_used,
            "quota_limit": self.rate_limit_hourly,
            "quota_remaining": max(0, self.rate_limit_hourly - self.quota_used),
            "quota_reset_period": "Hourly sliding window (200 calls/hour)",
            "cost_per_request": 1
        }

    def get_setup_instructions(self) -> Dict[str, Any]:
        return {
            "platform": "Meta Facebook Graph API",
            "env_variable": "FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ID",
            "documentation_url": "https://developers.facebook.com/docs/graph-api",
            "steps": [
                "1. Create a Facebook Developer App at developers.facebook.com.",
                "2. Create or manage a public Facebook Page representing political updates.",
                "3. Request Page Access Token with 'pages_read_user_content' & 'pages_read_engagement'.",
                "4. Obtain your Page ID from the Page 'About' section.",
                "5. Set FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID in backend/.env."
            ]
        }
