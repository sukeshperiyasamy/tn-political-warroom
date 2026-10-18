import time
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from backend.app.connectors.base import BaseConnector, NormalizedPost, ConnectorHealth, ConnectorStatus
from backend.app.services.entity_matcher import entity_matcher

class GoogleTrendsConnector(BaseConnector):
    platform = "google_trends"
    name = "Google Trends Search Interest (India / Tamil Nadu)"
    supported_metrics = ["search_traffic", "approx_searches"]

    def __init__(self):
        super().__init__()
        self.feed_url = "https://trends.google.com/trending/rss?geo=IN"
        self.quota_used = 0
        self.rate_limit_hourly = 120

    def validate_configuration(self) -> Tuple[bool, str]:
        return True, "Google Trends public regional interest feed active."

    def health_check(self) -> ConnectorHealth:
        now_iso = datetime.now(timezone.utc).isoformat()
        start_time = time.time()
        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.get(self.feed_url)
                latency_ms = int((time.time() - start_time) * 1000)
                if resp.status_code == 200:
                    self.quota_used += 1
                    return ConnectorHealth(
                        platform=self.platform,
                        status=ConnectorStatus.HEALTHY,
                        is_configured=True,
                        last_checked_at=now_iso,
                        message="Connected to Google Trends regional search interest wire.",
                        quota_used=self.quota_used,
                        quota_limit=self.rate_limit_hourly,
                        latency_ms=latency_ms
                    )
                else:
                    return ConnectorHealth(
                        platform=self.platform,
                        status=ConnectorStatus.WARNING,
                        is_configured=True,
                        last_checked_at=now_iso,
                        message=f"Google Trends returned HTTP {resp.status_code}",
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
                message=f"Google Trends connection error: {str(e)}",
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
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(self.feed_url)
                self.quota_used += 1
                if resp.status_code != 200:
                    return []

                root = ET.fromstring(resp.content)
                channel = root.find("channel")
                if channel is None:
                    return []

                items = channel.findall("item")
                results: List[NormalizedPost] = []
                for item in items:
                    norm = self._parse_xml_item(item)
                    if not norm:
                        continue
                    
                    has_entity_match = bool(norm.party_codes or norm.leader_names or any(t != "Tamil Nadu State Politics" for t in norm.topics))
                    has_direct_query = bool(query and (query.lower() in norm.content.lower() or query.lower() in (norm.title or "").lower()))

                    if not query:
                        if has_entity_match:
                            results.append(norm)
                    elif query.lower() in ("tamil nadu", "tamil", "tn", "state politics"):
                        # Broad regional query: include direct query match or detected TN entities
                        if has_direct_query or has_entity_match:
                            results.append(norm)
                    else:
                        # Specific query
                        if has_direct_query:
                            results.append(norm)

                    if len(results) >= limit:
                        break
                return results
        except Exception as e:
            self.last_error = str(e)
            self.error_count += 1
            return []

    def fetch_item(self, platform_post_id: str) -> Optional[NormalizedPost]:
        items = self.search("", limit=50)
        for it in items:
            if it.platform_post_id == platform_post_id:
                return it
        return None

    def _parse_xml_item(self, item_elem: ET.Element) -> Optional[NormalizedPost]:
        title = item_elem.findtext("title", "")
        link = item_elem.findtext("link", "")
        pub_date = item_elem.findtext("pubDate", "")
        approx_traffic = item_elem.findtext("{https://trends.google.com/trending/rss}approx_traffic", "0")
        
        # Clean approximate traffic like "50,000+"
        clean_traffic = int(approx_traffic.replace("+", "").replace(",", "").strip()) if approx_traffic and approx_traffic.replace("+", "").replace(",", "").strip().isdigit() else 0

        # Description
        desc = item_elem.findtext("description", "")

        # Entity matching
        combined = f"{title} {desc}"
        matched = entity_matcher.match_entities(desc, title)
        sentiment, sentiment_score = entity_matcher.detect_sentiment(combined)

        post_id = str(abs(hash(f"{title}_{pub_date}")))
        now_iso = datetime.now(timezone.utc).isoformat()

        return NormalizedPost(
            id=f"gtrends_{post_id}",
            platform="google_trends",
            platform_post_id=post_id,
            canonical_url=link or f"https://trends.google.com/trends/explore?geo=IN&q={title}",
            author_name="Google Trends Search Wire",
            author_handle="@googletrends",
            title=title,
            content=f"Search surge topic: {title}. Est. Search Traffic: {approx_traffic}. {desc}",
            language="en",
            media_type="link",
            thumbnail_url=None,
            published_at=pub_date or now_iso,
            first_seen_at=now_iso,
            last_seen_at=now_iso,
            views_count=clean_traffic,
            likes_count=None,
            comments_count=None,
            shares_count=None,
            party_codes=matched["party_codes"],
            leader_names=matched["leader_names"],
            topics=matched["topics"],
            hashtags=matched["hashtags"],
            sentiment=sentiment,
            sentiment_score=sentiment_score,
            collection_mode="LIVE",
            raw_metrics_available=["search_traffic"]
        )

    def normalize(self, raw_item: Dict[str, Any]) -> NormalizedPost:
        # Handled in _parse_xml_item
        pass

    def get_quota_status(self) -> Dict[str, Any]:
        return {
            "platform": self.platform,
            "quota_used": self.quota_used,
            "quota_limit": self.rate_limit_hourly,
            "quota_remaining": max(0, self.rate_limit_hourly - self.quota_used),
            "quota_reset_period": "Hourly sliding window",
            "cost_per_request": 1
        }

    def get_setup_instructions(self) -> Dict[str, Any]:
        return {
            "platform": "Google Trends Search Wire",
            "env_variable": "Public Regional RSS",
            "documentation_url": "https://trends.google.com/trending?geo=IN",
            "steps": [
                "1. Connects automatically to public Google Trends regional search feeds.",
                "2. Monitors search spikes and query volumes across India and Tamil Nadu.",
                "3. No API key required."
            ]
        }
