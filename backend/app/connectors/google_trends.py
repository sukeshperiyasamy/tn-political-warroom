import time
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from backend.app.connectors.base import BaseConnector, NormalizedPost, ConnectorHealth, ConnectorStatus
from backend.app.services.entity_matcher import entity_matcher

# Whitelist of political parties, leaders, elections, alliances, and government policies
TN_POLITICAL_KEYWORDS = [
    # Parties
    "dmk", "aiadmk", "tvk", "bjp", "ntk", "pmk", "vck", "cpi", "cpm", "inc", "congress", "mdmk", "dmkd", "admk",
    "திராவிட", "திமுக", "அதிமுக", "தவெக", "பாஜக", "நாம் தமிழர்", "பாமக", "விசிக", "காங்கிரஸ்",
    # Leaders & Candidates
    "stalin", "m.k. stalin", "edappadi", "eps", "palaniswami", "vijay", "thalapathy", "annamalai", "seeman",
    "udhayanidhi", "ops", "panneerselvam", "dhinakaran", "ttv", "anbumani", "thirumavalavan", "duraimurugan",
    "kanimozhi", "trb rajaa", "sellur raju", "jayakumar", "dvk",
    "ஸ்டாலின்", "எடப்பாடி", "விஜய்", "அண்ணாமலை", "சீமான்", "உதயநிதி", "பன்னீர்செல்வம்", "தினகரன்", "திருமாவளவன்",
    # Electoral, Alliances & Governance terms
    "assembly election", "tamil nadu election", "tn election", "constituency", "seat sharing", "alliance",
    "governor", "assembly", "budget", "magalir urimai", "kalaignar", "cauvery", "tangedco", "sipcot",
    "சட்டமன்ற தேர்தல்", "சட்டப்பேரவை", "கூட்டணி", "ஆளுநர்", "அரசாணை", "மகளிர் உரிமை", "காவிரி", "டான்ஜெட்கோ", "டாஸ்மாக்",
    "political conference", "manadu", "மாநாடு", "விக்கிரவாண்டி"
]

NATIONAL_POLITICAL_RELEVANT_KEYWORDS = [
    "parliament", "lok sabha", "election commission", "supreme court", "delimit", "neet",
    "census", "finance commission", "union budget", "cbi probe", "ed probe", "மக்களவை", "தேர்தல் ஆணையம்", "உச்ச நீதிமன்றம்"
]

NON_POLITICAL_DISQUALIFIERS = [
    "ipl", "cricket score", "match highlights", "t20", "box office", "trailer launch",
    "teaser", "movie review", "ott release", "bigg boss", "horoscope", "rasipalan", "movie release"
]

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
                        # Strictly dropped non-political item
                        continue

                    # If a query is provided, check matching query
                    if query:
                        q_lower = query.lower()
                        c_lower = norm.content.lower()
                        t_lower = (norm.title or "").lower()
                        if q_lower not in c_lower and q_lower not in t_lower:
                            continue

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

    def is_tn_politically_relevant(self, title: str, desc: str = "") -> Tuple[bool, str]:
        combined_text = f"{title} {desc}".lower()

        matched = entity_matcher.match_entities(desc, title)
        has_explicit_parties = bool(matched.get("party_codes"))
        has_explicit_leaders = bool(matched.get("leader_names"))
        has_tn_political_topic = any(
            t in ["2026 Assembly Election", "TVK Vijay Political Movement", "Kalaignar Magalir Urimai Thogai",
                  "Power Tariffs & TANGEDCO", "Cauvery Riparian Rights & Agriculture", "Industrial Development & Sipcot Jobs",
                  "Chennai Infrastructure & Flood Mitigation", "Law & Order, Governance Controversies"]
            for t in matched.get("topics", [])
        )

        matches_tn_keywords = any(kw in combined_text for kw in TN_POLITICAL_KEYWORDS)
        matches_national_keywords = any(kw in combined_text for kw in NATIONAL_POLITICAL_RELEVANT_KEYWORDS)

        is_disqualified = any(d in combined_text for d in NON_POLITICAL_DISQUALIFIERS)
        if is_disqualified and not (has_explicit_parties or has_explicit_leaders):
            return False, "Disqualified (Sports / Entertainment)"

        is_tn_political = has_explicit_parties or has_explicit_leaders or has_tn_political_topic or matches_tn_keywords
        is_national_political_tn_relevant = matches_national_keywords and ("tamil" in combined_text or "tn" in combined_text or "south" in combined_text)

        if is_tn_political:
            return True, "Tamil Nadu State Political Trend"
        elif is_national_political_tn_relevant:
            return True, "National Political Trend (Relevant to TN)"
        return False, "Non-political"

    _is_tn_politically_relevant = is_tn_politically_relevant

    def _parse_xml_item(self, item_elem: ET.Element) -> Optional[NormalizedPost]:
        title = item_elem.findtext("title", "")
        link = item_elem.findtext("link", "")
        pub_date = item_elem.findtext("pubDate", "")
        approx_traffic = item_elem.findtext("{https://trends.google.com/trending/rss}approx_traffic", "").strip()
        desc = item_elem.findtext("description", "")

        is_political, regional_scope = self.is_tn_politically_relevant(title, desc)
        if not is_political:
            return None

        matched = entity_matcher.match_entities(desc, title)
        sentiment, sentiment_score = entity_matcher.detect_sentiment(f"{title} {desc}")

        # Clean approximate traffic (e.g. "50,000+" -> 50000); do not invent numbers if unavailable
        clean_traffic = 0
        traffic_display = ""
        if approx_traffic:
            cleaned_digits = approx_traffic.replace("+", "").replace(",", "").strip()
            if cleaned_digits.isdigit():
                clean_traffic = int(cleaned_digits)
                traffic_display = f"Est. Search Volume: {approx_traffic}"
            else:
                traffic_display = "Regional Search Surge (Volume Unspecified)"
        else:
            traffic_display = "Regional Search Surge"

        post_id = str(abs(hash(f"{title}_{pub_date}")))
        now_iso = datetime.now(timezone.utc).isoformat()

        content = f"Political search surge: {title}. {traffic_display} | Scope: {regional_scope}. {desc}".strip()

        return NormalizedPost(
            id=f"gtrends_{post_id}",
            platform="google_trends",
            platform_post_id=post_id,
            canonical_url=link or f"https://trends.google.com/trends/explore?geo=IN&q={title}",
            author_name="Google Trends (Tamil Nadu Politics)",
            author_handle="@googletrends",
            title=title,
            content=content,
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
            topics=matched["topics"] or [regional_scope],
            hashtags=matched["hashtags"],
            sentiment=sentiment,
            sentiment_score=sentiment_score,
            collection_mode="LIVE",
            raw_metrics_available=["search_traffic"] if clean_traffic > 0 else []
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
