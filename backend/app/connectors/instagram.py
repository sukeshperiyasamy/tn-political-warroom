import os
import time
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from backend.app.connectors.base import BaseConnector, NormalizedPost, ConnectorHealth, ConnectorStatus
from backend.app.services.entity_matcher import entity_matcher

class InstagramConnector(BaseConnector):
    platform = "instagram"
    name = "Meta Instagram Graph API"
    supported_metrics = ["likes", "comments", "impressions", "reach"]

    def __init__(self):
        super().__init__()
        self.access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN", "").strip()
        self.account_id = os.getenv("INSTAGRAM_ACCOUNT_ID", "").strip()
        self.base_url = "https://graph.facebook.com/v19.0"
        self.quota_used = 0
        self.rate_limit_hourly = 200

    def validate_configuration(self) -> Tuple[bool, str]:
        if not self.access_token or not self.account_id:
            return False, "INSTAGRAM_ACCESS_TOKEN and/or INSTAGRAM_ACCOUNT_ID not set."
        return True, "Instagram Graph API credentials configured."

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
                    f"{self.base_url}/{self.account_id}",
                    params={
                        "fields": "id,username,name",
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
                        message=f"Connected to Instagram Business Account @{data.get('username')}.",
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
                message=f"Failed to connect to Meta Instagram API: {str(e)}",
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

        # Graph API reads media from registered public business accounts or hashtag search
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(
                    f"{self.base_url}/{self.account_id}/media",
                    params={
                        "fields": "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
                        "limit": min(limit, 50),
                        "access_token": self.access_token
                    }
                )
                self.quota_used += 1
                if resp.status_code != 200:
                    self.last_error = f"Instagram media fetch HTTP {resp.status_code}"
                    self.error_count += 1
                    return []

                items = resp.json().get("data", [])
                results: List[NormalizedPost] = []
                for item in items:
                    caption = item.get("caption", "").lower()
                    if not query or query.lower() in caption:
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
                        "fields": "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
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
        caption = raw_item.get("caption", "")
        published_at = raw_item.get("timestamp", datetime.now(timezone.utc).isoformat())
        permalink = raw_item.get("permalink", f"https://www.instagram.com/p/{post_id}/")

        media_type = raw_item.get("media_type", "IMAGE").lower()
        if media_type == "video":
            norm_media = "video"
            thumb = raw_item.get("thumbnail_url") or raw_item.get("media_url")
        else:
            norm_media = "image"
            thumb = raw_item.get("media_url")

        likes = raw_item.get("like_count")
        comments = raw_item.get("comments_count")

        matched = entity_matcher.match_entities(caption)
        sentiment, sentiment_score = entity_matcher.detect_sentiment(caption)

        now_iso = datetime.now(timezone.utc).isoformat()

        return NormalizedPost(
            id=f"instagram_{post_id}",
            platform="instagram",
            platform_post_id=post_id,
            canonical_url=permalink,
            author_name="Instagram Public Creator",
            author_handle="@instagram",
            title=None,
            content=caption[:1000] if caption else "Instagram visual update",
            language="ta" if any('\u0B80' <= c <= '\u0BFF' for c in caption) else "en",
            media_type=norm_media,
            thumbnail_url=thumb,
            published_at=published_at,
            first_seen_at=now_iso,
            last_seen_at=now_iso,
            likes_count=likes,
            comments_count=comments,
            shares_count=None,
            views_count=None,
            party_codes=matched["party_codes"],
            leader_names=matched["leader_names"],
            topics=matched["topics"],
            hashtags=matched["hashtags"],
            sentiment=sentiment,
            sentiment_score=sentiment_score,
            collection_mode="LIVE",
            raw_metrics_available=["likes", "comments"]
        )

    def get_quota_status(self) -> Dict[str, Any]:
        return {
            "platform": self.platform,
            "quota_used": self.quota_used,
            "quota_limit": self.rate_limit_hourly,
            "quota_remaining": max(0, self.rate_limit_hourly - self.quota_used),
            "quota_reset_period": "Hourly sliding window (200 requests/user/hour)",
            "cost_per_request": 1
        }

    def get_setup_instructions(self) -> Dict[str, Any]:
        return {
            "platform": "Meta Instagram Graph API",
            "env_variable": "INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID",
            "documentation_url": "https://developers.facebook.com/docs/instagram-api",
            "steps": [
                "1. Create a Meta for Developers account at developers.facebook.com.",
                "2. Create an App under 'Business' type.",
                "3. Connect your Instagram Professional/Creator account to a Facebook Page.",
                "4. Generate a User Access Token with 'instagram_basic', 'pages_show_list', 'pages_read_engagement'.",
                "5. Retrieve your Instagram Business Account ID via graph.facebook.com/v19.0/me/accounts.",
                "6. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID in backend/.env."
            ]
        }
