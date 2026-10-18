import os
import time
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from backend.app.connectors.base import BaseConnector, NormalizedPost, ConnectorHealth, ConnectorStatus
from backend.app.services.entity_matcher import entity_matcher

class YouTubeConnector(BaseConnector):
    platform = "youtube"
    name = "YouTube Data API v3"
    supported_metrics = ["views", "likes", "comments"]

    def __init__(self):
        super().__init__()
        self.api_key = os.getenv("YOUTUBE_API_KEY", "").strip()
        self.base_url = "https://www.googleapis.com/youtube/v3"
        self.quota_used = 0
        self.daily_quota_limit = 10000

    def validate_configuration(self) -> Tuple[bool, str]:
        if not self.api_key:
            return False, "YOUTUBE_API_KEY is not set in environment or .env file."
        return True, "YouTube API key configured."

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
                quota_limit=self.daily_quota_limit,
                error_count=self.error_count
            )

        start_time = time.time()
        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.get(
                    f"{self.base_url}/videos",
                    params={
                        "part": "id",
                        "chart": "mostPopular",
                        "maxResults": 1,
                        "key": self.api_key
                    }
                )
                latency_ms = int((time.time() - start_time) * 1000)
                if resp.status_code == 200:
                    self.quota_used += 1
                    return ConnectorHealth(
                        platform=self.platform,
                        status=ConnectorStatus.HEALTHY,
                        is_configured=True,
                        last_checked_at=now_iso,
                        message="Connected to YouTube Data API v3 successfully.",
                        quota_used=self.quota_used,
                        quota_limit=self.daily_quota_limit,
                        latency_ms=latency_ms
                    )
                elif resp.status_code == 403:
                    err_json = resp.json().get("error", {})
                    reason = err_json.get("errors", [{}])[0].get("reason", "quotaExceeded")
                    if "quota" in reason.lower():
                        return ConnectorHealth(
                            platform=self.platform,
                            status=ConnectorStatus.RATE_LIMITED,
                            is_configured=True,
                            last_checked_at=now_iso,
                            message=f"YouTube daily quota exceeded: {err_json.get('message')}",
                            quota_used=self.daily_quota_limit,
                            quota_limit=self.daily_quota_limit,
                            latency_ms=latency_ms
                        )
                    return ConnectorHealth(
                        platform=self.platform,
                        status=ConnectorStatus.ERROR,
                        is_configured=True,
                        last_checked_at=now_iso,
                        message=f"YouTube API auth error (403): {err_json.get('message')}",
                        quota_used=self.quota_used,
                        quota_limit=self.daily_quota_limit,
                        latency_ms=latency_ms
                    )
                else:
                    return ConnectorHealth(
                        platform=self.platform,
                        status=ConnectorStatus.ERROR,
                        is_configured=True,
                        last_checked_at=now_iso,
                        message=f"YouTube API returned HTTP {resp.status_code}: {resp.text[:150]}",
                        quota_used=self.quota_used,
                        quota_limit=self.daily_quota_limit,
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
                message=f"Failed to connect to YouTube API: {str(e)}",
                quota_used=self.quota_used,
                quota_limit=self.daily_quota_limit,
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

        search_params: Dict[str, Any] = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": min(limit, 50),
            "order": "date",
            "relevanceLanguage": "ta",
            "key": self.api_key
        }
        if since:
            search_params["publishedAfter"] = since.strftime("%Y-%m-%dT%H:%M:%SZ")

        try:
            with httpx.Client(timeout=15.0) as client:
                s_resp = client.get(f"{self.base_url}/search", params=search_params)
                self.quota_used += 100
                if s_resp.status_code != 200:
                    self.last_error = f"Search HTTP {s_resp.status_code}: {s_resp.text[:200]}"
                    self.error_count += 1
                    return []

                search_data = s_resp.json()
                items = search_data.get("items", [])
                if not items:
                    return []

                video_ids = [it["id"]["videoId"] for it in items if "videoId" in it.get("id", {})]
                if not video_ids:
                    return []

                # Fetch statistics in batch
                v_resp = client.get(
                    f"{self.base_url}/videos",
                    params={
                        "part": "snippet,statistics",
                        "id": ",".join(video_ids),
                        "key": self.api_key
                    }
                )
                self.quota_used += 1
                if v_resp.status_code != 200:
                    return []

                v_items = v_resp.json().get("items", [])
                results: List[NormalizedPost] = []
                for item in v_items:
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
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(
                    f"{self.base_url}/videos",
                    params={
                        "part": "snippet,statistics",
                        "id": platform_post_id,
                        "key": self.api_key
                    }
                )
                self.quota_used += 1
                if resp.status_code == 200:
                    items = resp.json().get("items", [])
                    if items:
                        return self.normalize(items[0])
            return None
        except Exception as e:
            self.last_error = str(e)
            return None

    def normalize(self, raw_item: Dict[str, Any]) -> NormalizedPost:
        video_id = raw_item.get("id", "")
        if isinstance(video_id, dict):
            video_id = video_id.get("videoId", "")

        snippet = raw_item.get("snippet", {})
        statistics = raw_item.get("statistics", {})

        title = snippet.get("title", "")
        description = snippet.get("description", "")
        author_name = snippet.get("channelTitle", "Unknown Channel")
        author_handle = f"@{snippet.get('channelTitle', '').replace(' ', '')}"
        published_at = snippet.get("publishedAt", datetime.now(timezone.utc).isoformat())

        thumbnails = snippet.get("thumbnails", {})
        thumb_url = (
            thumbnails.get("high", {}).get("url")
            or thumbnails.get("medium", {}).get("url")
            or thumbnails.get("default", {}).get("url")
        )

        views = int(statistics.get("viewCount", 0)) if "viewCount" in statistics else None
        likes = int(statistics.get("likeCount", 0)) if "likeCount" in statistics else None
        comments = int(statistics.get("commentCount", 0)) if "commentCount" in statistics else None

        # Entity extraction
        matched = entity_matcher.match_entities(description, title)
        sentiment, sentiment_score = entity_matcher.detect_sentiment(f"{title} {description}")

        now_iso = datetime.now(timezone.utc).isoformat()
        canonical_url = f"https://www.youtube.com/watch?v={video_id}"

        return NormalizedPost(
            id=f"youtube_{video_id}",
            platform="youtube",
            platform_post_id=video_id,
            canonical_url=canonical_url,
            author_name=author_name,
            author_handle=author_handle,
            title=title,
            content=description[:1500] if description else title,
            language="ta" if any('\u0B80' <= c <= '\u0BFF' for c in f"{title} {description}") else "en",
            media_type="video",
            thumbnail_url=thumb_url,
            published_at=published_at,
            first_seen_at=now_iso,
            last_seen_at=now_iso,
            views_count=views,
            likes_count=likes,
            comments_count=comments,
            shares_count=None,
            quotes_count=None,
            party_codes=matched["party_codes"],
            leader_names=matched["leader_names"],
            topics=matched["topics"],
            hashtags=matched["hashtags"],
            sentiment=sentiment,
            sentiment_score=sentiment_score,
            collection_mode="LIVE",
            raw_metrics_available=[m for m, val in [("views", views), ("likes", likes), ("comments", comments)] if val is not None]
        )

    def get_quota_status(self) -> Dict[str, Any]:
        return {
            "platform": self.platform,
            "quota_used": self.quota_used,
            "quota_limit": self.daily_quota_limit,
            "quota_remaining": max(0, self.daily_quota_limit - self.quota_used),
            "quota_reset_period": "Daily midnight PST",
            "cost_per_search": 100,
            "cost_per_video_fetch": 1
        }

    def get_setup_instructions(self) -> Dict[str, Any]:
        return {
            "platform": "YouTube Data API v3",
            "env_variable": "YOUTUBE_API_KEY",
            "documentation_url": "https://developers.google.com/youtube/v3/getting-started",
            "steps": [
                "1. Go to Google Cloud Console (https://console.cloud.google.com/).",
                "2. Create a new project or select an existing project.",
                "3. Enable the 'YouTube Data API v3' under APIs & Services > Library.",
                "4. Go to APIs & Services > Credentials and click 'Create Credentials' > 'API key'.",
                "5. (Recommended) Restrict the API key to 'YouTube Data API v3'.",
                "6. Add YOUTUBE_API_KEY=your_key_here to backend/.env or your host environment.",
                "7. Standard free tier allows 10,000 units per day."
            ]
        }
