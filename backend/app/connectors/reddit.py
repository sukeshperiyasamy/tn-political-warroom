import os
import time
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from backend.app.connectors.base import BaseConnector, NormalizedPost, ConnectorHealth, ConnectorStatus
from backend.app.services.entity_matcher import entity_matcher

class RedditConnector(BaseConnector):
    platform = "reddit"
    name = "Reddit Public Community API"
    supported_metrics = ["upvotes", "comments", "awards"]

    def __init__(self):
        super().__init__()
        self.client_id = os.getenv("REDDIT_CLIENT_ID", "").strip()
        self.client_secret = os.getenv("REDDIT_CLIENT_SECRET", "").strip()
        self.user_agent = "TNPoliticalWarroom/1.0 (Research & Media Intelligence; contact: admin@tnwarroom.internal)"
        self.subreddits = ["tamilnadu", "chennai"]
        self.quota_used = 0
        self.rate_limit_minute = 60

    def validate_configuration(self) -> Tuple[bool, str]:
        # Reddit allows public read access with custom User-Agent, or authenticated app OAuth
        if self.client_id and self.client_secret:
            return True, "Reddit OAuth credentials configured."
        return True, "Reddit public read-only access (custom User-Agent compliant)."

    def health_check(self) -> ConnectorHealth:
        now_iso = datetime.now(timezone.utc).isoformat()
        start_time = time.time()
        headers = {"User-Agent": self.user_agent}

        try:
            with httpx.Client(timeout=12.0, follow_redirects=True) as client:
                resp = client.get("https://www.reddit.com/r/tamilnadu/hot.json?limit=1", headers=headers)
                latency_ms = int((time.time() - start_time) * 1000)
                if resp.status_code == 200:
                    self.quota_used += 1
                    return ConnectorHealth(
                        platform=self.platform,
                        status=ConnectorStatus.HEALTHY,
                        is_configured=True,
                        last_checked_at=now_iso,
                        message="Connected to Reddit public communities (r/tamilnadu, r/chennai).",
                        quota_used=self.quota_used,
                        quota_limit=self.rate_limit_minute,
                        latency_ms=latency_ms
                    )
                elif resp.status_code == 429:
                    return ConnectorHealth(
                        platform=self.platform,
                        status=ConnectorStatus.RATE_LIMITED,
                        is_configured=True,
                        last_checked_at=now_iso,
                        message="Reddit rate limit encountered (HTTP 429).",
                        quota_used=self.rate_limit_minute,
                        quota_limit=self.rate_limit_minute,
                        latency_ms=latency_ms
                    )
                else:
                    return ConnectorHealth(
                        platform=self.platform,
                        status=ConnectorStatus.WARNING,
                        is_configured=True,
                        last_checked_at=now_iso,
                        message=f"Reddit returned HTTP {resp.status_code}: {resp.text[:120]}",
                        quota_used=self.quota_used,
                        quota_limit=self.rate_limit_minute,
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
                message=f"Reddit connection error: {str(e)}",
                quota_used=self.quota_used,
                quota_limit=self.rate_limit_minute,
                error_count=self.error_count
            )

    def search(
        self,
        query: str,
        limit: int = 25,
        since: Optional[datetime] = None
    ) -> List[NormalizedPost]:
        headers = {"User-Agent": self.user_agent}
        posts: List[NormalizedPost] = []

        try:
            with httpx.Client(timeout=10.0) as client:
                for sub in self.subreddits:
                    url = f"https://www.reddit.com/r/{sub}/search.json" if query else f"https://www.reddit.com/r/{sub}/hot.json"
                    params = {"q": query, "restrict_sr": 1, "sort": "hot", "limit": min(limit, 25)} if query else {"limit": min(limit, 25)}
                    resp = client.get(url, headers=headers, params=params)
                    self.quota_used += 1
                    if resp.status_code == 200:
                        children = resp.json().get("data", {}).get("children", [])
                        for child in children:
                            raw = child.get("data", {})
                            # Filter out sticky mod announcements
                            if raw.get("stickied"):
                                continue
                            norm = self.normalize(raw)
                            # Only include if relevant to Tamil Nadu politics/governance
                            if norm.party_codes or norm.leader_names or any(t != "Tamil Nadu State Politics" for t in norm.topics) or query:
                                posts.append(norm)
            return posts
        except Exception as e:
            self.last_error = str(e)
            self.error_count += 1
            return []

    def fetch_item(self, platform_post_id: str) -> Optional[NormalizedPost]:
        headers = {"User-Agent": self.user_agent}
        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.get(f"https://www.reddit.com/by_id/t3_{platform_post_id}.json", headers=headers)
                self.quota_used += 1
                if resp.status_code == 200:
                    children = resp.json().get("data", {}).get("children", [])
                    if children:
                        return self.normalize(children[0].get("data", {}))
            return None
        except Exception as e:
            self.last_error = str(e)
            return None

    def normalize(self, raw_item: Dict[str, Any]) -> NormalizedPost:
        post_id = raw_item.get("id", "")
        title = raw_item.get("title", "")
        selftext = raw_item.get("selftext", "")
        subreddit = raw_item.get("subreddit", "tamilnadu")
        author = raw_item.get("author", "redditor")
        created_utc = raw_item.get("created_utc", time.time())
        published_at = datetime.fromtimestamp(created_utc, tz=timezone.utc).isoformat()
        permalink = f"https://www.reddit.com{raw_item.get('permalink', '')}"

        ups = raw_item.get("ups", 0)
        comments = raw_item.get("num_comments", 0)

        thumb = raw_item.get("thumbnail")
        if thumb in ["default", "self", "nsfw", "spoiler", ""]:
            thumb = None

        combined_text = f"{title} {selftext}"
        matched = entity_matcher.match_entities(selftext, title)
        sentiment, sentiment_score = entity_matcher.detect_sentiment(combined_text)

        now_iso = datetime.now(timezone.utc).isoformat()

        return NormalizedPost(
            id=f"reddit_{post_id}",
            platform="reddit",
            platform_post_id=post_id,
            canonical_url=permalink,
            author_name=f"u/{author}",
            author_handle=f"r/{subreddit}",
            title=title,
            content=selftext[:1000] if selftext else title,
            language="ta" if any('\u0B80' <= c <= '\u0BFF' for c in combined_text) else "en",
            media_type="text" if not thumb else "image",
            thumbnail_url=thumb,
            published_at=published_at,
            first_seen_at=now_iso,
            last_seen_at=now_iso,
            likes_count=ups,
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
            raw_metrics_available=["upvotes", "comments"]
        )

    def get_quota_status(self) -> Dict[str, Any]:
        return {
            "platform": self.platform,
            "quota_used": self.quota_used,
            "quota_limit": self.rate_limit_minute,
            "quota_remaining": max(0, self.rate_limit_minute - self.quota_used),
            "quota_reset_period": "Per-minute sliding window (60 requests/minute)",
            "cost_per_request": 1
        }

    def get_setup_instructions(self) -> Dict[str, Any]:
        return {
            "platform": "Reddit API",
            "env_variable": "REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET (Optional for high volume)",
            "documentation_url": "https://www.reddit.com/dev/api/",
            "steps": [
                "1. By default, the War Room connects to public subreddits (r/tamilnadu, r/chennai) using a polite User-Agent.",
                "2. For dedicated OAuth with higher rate limits, visit reddit.com/prefs/apps.",
                "3. Click 'create another app...', select 'script'.",
                "4. Copy the Client ID and Client Secret.",
                "5. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in backend/.env."
            ]
        }
