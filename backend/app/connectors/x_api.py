import os
import time
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from backend.app.connectors.base import BaseConnector, NormalizedPost, ConnectorHealth, ConnectorStatus
from backend.app.services.entity_matcher import entity_matcher

class XConnector(BaseConnector):
    platform = "x"
    name = "X (Twitter) API v2"
    supported_metrics = ["likes", "reposts", "replies", "quotes", "impressions"]

    def __init__(self):
        super().__init__()
        self.bearer_token = os.getenv("X_BEARER_TOKEN") or os.getenv("TWITTER_BEARER_TOKEN", "").strip()
        self.base_url = "https://api.twitter.com/2"
        self.quota_used = 0
        self.monthly_limit = 10000  # Default basic plan allowance

    def validate_configuration(self) -> Tuple[bool, str]:
        if not self.bearer_token:
            return False, "X_BEARER_TOKEN is not set in environment or .env file."
        return True, "X API v2 Bearer Token configured."

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
                quota_limit=self.monthly_limit,
                error_count=self.error_count
            )

        start_time = time.time()
        try:
            with httpx.Client(timeout=8.0) as client:
                headers = {"Authorization": f"Bearer {self.bearer_token}"}
                # Lightweight test query
                resp = client.get(
                    f"{self.base_url}/tweets/search/recent",
                    headers=headers,
                    params={"query": "TamilNadu -is:retweet", "max_results": 10}
                )
                latency_ms = int((time.time() - start_time) * 1000)
                if resp.status_code == 200:
                    self.quota_used += 1
                    return ConnectorHealth(
                        platform=self.platform,
                        status=ConnectorStatus.HEALTHY,
                        is_configured=True,
                        last_checked_at=now_iso,
                        message="Connected to X API v2 successfully.",
                        quota_used=self.quota_used,
                        quota_limit=self.monthly_limit,
                        latency_ms=latency_ms
                    )
                elif resp.status_code == 429:
                    return ConnectorHealth(
                        platform=self.platform,
                        status=ConnectorStatus.RATE_LIMITED,
                        is_configured=True,
                        last_checked_at=now_iso,
                        message="X API rate limit reached (HTTP 429).",
                        quota_used=self.monthly_limit,
                        quota_limit=self.monthly_limit,
                        latency_ms=latency_ms
                    )
                else:
                    return ConnectorHealth(
                        platform=self.platform,
                        status=ConnectorStatus.ERROR,
                        is_configured=True,
                        last_checked_at=now_iso,
                        message=f"X API returned HTTP {resp.status_code}: {resp.text[:150]}",
                        quota_used=self.quota_used,
                        quota_limit=self.monthly_limit,
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
                message=f"Failed to connect to X API: {str(e)}",
                quota_used=self.quota_used,
                quota_limit=self.monthly_limit,
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

        search_query = f"{query} -is:retweet lang:ta OR lang:en"
        params: Dict[str, Any] = {
            "query": search_query,
            "max_results": min(max(limit, 10), 100),
            "tweet.fields": "created_at,public_metrics,author_id,entities",
            "expansions": "author_id",
            "user.fields": "name,username,verified"
        }
        if since:
            params["start_time"] = since.strftime("%Y-%m-%dT%H:%M:%SZ")

        try:
            with httpx.Client(timeout=12.0) as client:
                headers = {"Authorization": f"Bearer {self.bearer_token}"}
                resp = client.get(f"{self.base_url}/tweets/search/recent", headers=headers, params=params)
                self.quota_used += 1
                if resp.status_code != 200:
                    self.last_error = f"X search error HTTP {resp.status_code}: {resp.text[:200]}"
                    self.error_count += 1
                    return []

                data = resp.json()
                tweets = data.get("data", [])
                users_by_id = {u["id"]: u for u in data.get("includes", {}).get("users", [])}

                results: List[NormalizedPost] = []
                for tweet in tweets:
                    user = users_by_id.get(tweet.get("author_id"), {})
                    raw_combined = {"tweet": tweet, "user": user}
                    results.append(self.normalize(raw_combined))
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
                headers = {"Authorization": f"Bearer {self.bearer_token}"}
                resp = client.get(
                    f"{self.base_url}/tweets/{platform_post_id}",
                    headers=headers,
                    params={
                        "tweet.fields": "created_at,public_metrics,author_id",
                        "expansions": "author_id",
                        "user.fields": "name,username,verified"
                    }
                )
                self.quota_used += 1
                if resp.status_code == 200:
                    data = resp.json()
                    tweet = data.get("data", {})
                    users = data.get("includes", {}).get("users", [])
                    user = users[0] if users else {}
                    return self.normalize({"tweet": tweet, "user": user})
            return None
        except Exception as e:
            self.last_error = str(e)
            return None

    def normalize(self, raw_item: Dict[str, Any]) -> NormalizedPost:
        tweet = raw_item.get("tweet", raw_item)
        user = raw_item.get("user", {})

        tweet_id = tweet.get("id", "")
        text = tweet.get("text", "")
        published_at = tweet.get("created_at", datetime.now(timezone.utc).isoformat())
        metrics = tweet.get("public_metrics", {})

        author_name = user.get("name") or "X User"
        author_handle = f"@{user.get('username')}" if user.get("username") else "@user"

        likes = metrics.get("like_count")
        reposts = metrics.get("retweet_count")
        replies = metrics.get("reply_count")
        quotes = metrics.get("quote_count")
        impressions = metrics.get("impression_count")

        matched = entity_matcher.match_entities(text)
        sentiment, sentiment_score = entity_matcher.detect_sentiment(text)

        now_iso = datetime.now(timezone.utc).isoformat()
        canonical_url = f"https://x.com/{author_handle.lstrip('@')}/status/{tweet_id}"

        return NormalizedPost(
            id=f"x_{tweet_id}",
            platform="x",
            platform_post_id=tweet_id,
            canonical_url=canonical_url,
            author_name=author_name,
            author_handle=author_handle,
            title=None,
            content=text,
            language="ta" if any('\u0B80' <= c <= '\u0BFF' for c in text) else "en",
            media_type="text",
            thumbnail_url=None,
            published_at=published_at,
            first_seen_at=now_iso,
            last_seen_at=now_iso,
            likes_count=likes,
            comments_count=replies,
            shares_count=reposts,
            views_count=impressions,
            quotes_count=quotes,
            party_codes=matched["party_codes"],
            leader_names=matched["leader_names"],
            topics=matched["topics"],
            hashtags=matched["hashtags"],
            sentiment=sentiment,
            sentiment_score=sentiment_score,
            collection_mode="LIVE",
            raw_metrics_available=["likes", "reposts", "replies", "quotes"]
        )

    def get_quota_status(self) -> Dict[str, Any]:
        return {
            "platform": self.platform,
            "quota_used": self.quota_used,
            "quota_limit": self.monthly_limit,
            "quota_remaining": max(0, self.monthly_limit - self.quota_used),
            "quota_reset_period": "Monthly billing cycle",
            "cost_per_request": 1
        }

    def get_setup_instructions(self) -> Dict[str, Any]:
        return {
            "platform": "X (Twitter) API v2",
            "env_variable": "X_BEARER_TOKEN",
            "documentation_url": "https://developer.x.com/en/docs/x-api",
            "steps": [
                "1. Visit the X Developer Portal (https://developer.x.com/en/portal/dashboard).",
                "2. Sign up or log into an approved developer account.",
                "3. Create a Project and an associated App.",
                "4. Under Keys and Tokens, generate an 'App-only Bearer Token'.",
                "5. Save X_BEARER_TOKEN=your_token_here in backend/.env.",
                "6. Note: Free tier permits 100 tweet reads/month; Basic tier ($100/mo) permits 10,000 reads/month."
            ]
        }
