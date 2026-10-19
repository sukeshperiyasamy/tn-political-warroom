import time
import re
import hashlib
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from backend.app.connectors.base import BaseConnector, NormalizedPost, ConnectorHealth, ConnectorStatus
from backend.app.services.entity_matcher import entity_matcher

# Whitelist of political parties, leaders, elections, alliances, and government policies (for backwards compatibility)
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

# Non-political disqualifiers across sports, lotteries, weather, commodities, and entertainment gossip
NON_POLITICAL_DISQUALIFIER_PATTERNS = [
    # Sports & Cricket
    r"\b(cricket|ipl|t20|test match|odi|bcci|ranji trophy|world cup|scorecard|wicket|standings|vs|fc|match|football|soccer|premier league|champions league|la liga|serie a|tennis|badminton|kabaddi|fifa|uefa)\b",
    r"\b(shubman gill|shafali verma|mitchell starc|virat kohli|rohit sharma|ms dhoni|jasprit bumrah|hardik pandya|kl rahul|surya kumar yadav|rishabh pant|ravindra jadeja|r ashwin|sanju samson)\b",
    r"\b(chennai super kings|csk|mumbai indians|rcb|kolkata knight riders|fiorentina|como 1907|atalanta|real sociedad|málaga|brighton|crystal palace|chelsea|tottenham)\b",
    # Lotteries & Gambling
    r"\b(lottery|lottery results|kerala lottery|sambad|dear lottery|jackpot|bumper lottery|win win|akshaya|karunya|sthree sakthi|fifty fifty|nirmal lottery|bhagyakuri)\b",
    # Weather, astrology & daily living
    r"\b(weather|forecast|temperature|monsoon|rainfall|cyclone alert|weather update|हवामान|ಹವಾಮಾನ|வானிலை)\b",
    r"\b(panchang|rashifal|horoscope|rasipalan|rasi palan|kundali|astrology|graha peyarchi)\b",
    r"\b(gold rate|silver rate|petrol price|diesel price|share market|stock market|sensex|nifty|nse|bse|sunscreen)\b",
    # Cinema / Entertainment gossips without direct political governance actions
    r"\b(box office|trailer launch|teaser|movie review|ott release|bigg boss|bookmyshow|imdb|first look|motion poster|cinema news)\b",
    r"\b(dhanush|trisha|nayanthara|samantha|anirudh|jailer 2|leo movie|goat movie|coolie movie|thalapathy 69)\b"
]

# Verified Tamil Nadu Political & Electoral Context Patterns
TN_POLITICAL_CONTEXT_PATTERNS = [
    r"\b(dmk|aiadmk|tvk|bjp|ntk|pmk|vck|cpi|cpm|inc|congress|mdmk)\b",
    r"(திமுக|அதிமுக|தவெக|பாஜக|நாம் தமிழர்|பாமக|விசிக|காங்கிரஸ்|மதிமுக|திராவிட)",
    r"\b(stalin|m\.k\. stalin|edappadi|eps|palaniswami|thalapathy vijay|annamalai|seeman|udhayanidhi|panneerselvam|ops|ttv dhinakaran|thirumavalavan|anbumani)\b",
    r"(ஸ்டாலின்|எடப்பாடி|பழனிசாமி|அண்ணாமலை|சீமான்|உதயநிதி|பன்னீர்செல்வம்|தினகரன்|திருமாவளவன்|அன்புமணி)",
    r"\b(assembly election|tamil nadu election|tn election|constituency|seat sharing|alliance talks|cauvery water|tangedco|tasmac|magalir urimai|delimitation|mekedatu|politics|political)\b",
    r"(சட்டமன்ற தேர்தல்|கூட்டணி|தொகுதி பங்கீடு|வாக்கு வங்கி|காவிரி நீர்|மகளிர் உரிமை|டான்ஜெட்கோ|டாஸ்மாக்|ஆளுநர்|சட்டப்பேரவை|விக்கிரவாண்டி|அரசியல்|கொள்கை)"
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

                    # If a query is provided, check matching query against title, true content, or entities
                    if query and query.strip():
                        q_lower = query.lower().strip()
                        # Generic regional broad queries match all validated TN political posts
                        if q_lower not in ("tamil nadu", "tamil nadu politics", "tamil", "tn", "state politics"):
                            t_lower = (norm.title or "").lower()
                            c_lower = (norm.content or "").lower()
                            parties_lower = [p.lower() for p in norm.party_codes]
                            leaders_lower = [l.lower() for l in norm.leader_names]
                            if (q_lower not in t_lower and
                                q_lower not in c_lower and
                                not any(q_lower in p for p in parties_lower) and
                                not any(q_lower in l for l in leaders_lower)):
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
        """
        Rigorous political relevance filter for Tamil Nadu.
        Excludes unrelated sports/cricket, lotteries, weather, commodities, and entertainment.
        Verifies against approved TN parties, leaders, electoral topics, and state governance context.
        """
        combined = f"{title} {desc}".strip().lower()

        # 1. Check non-political disqualifiers
        for pat in NON_POLITICAL_DISQUALIFIER_PATTERNS:
            if re.search(pat, combined, re.IGNORECASE):
                # Verify if there is an explicit political party/leader override
                matched = entity_matcher.match_entities(desc, title)
                has_parties = bool(matched.get("party_codes"))
                has_leaders = bool(matched.get("leader_names"))
                # Actor/cinema check: if it mentions Vijay but only cinema gossip without TVK politics, reject
                if "vijay" in combined and not (has_parties or any(k in combined for k in ["தவெக", "tvk", "மாநாடு", "அரசியல்", "election", "politics"])):
                    return False, "Disqualified (Cinema / Actor mention without political context)"
                if not (has_parties or has_leaders):
                    return False, "Disqualified (Sports / Lottery / Weather / General Interest)"

        # 2. Match entities using project's entity_matcher
        matched = entity_matcher.match_entities(desc, title)
        party_codes = matched.get("party_codes", [])
        leader_names = matched.get("leader_names", [])
        topics = matched.get("topics", [])

        # Check explicit TN political entity match
        if party_codes or leader_names:
            is_tn_entity = any(p in ["DMK", "AIADMK", "TVK", "NTK", "PMK", "VCK"] for p in party_codes)
            has_tn_leader = any(l in [
                "M.K. Stalin", "Edappadi K. Palaniswami", "Thalapathy Vijay",
                "K. Annamalai", "Seeman", "Udhayanidhi Stalin",
                "Thol. Thirumavalavan", "Dr. Anbumani Ramadoss"
            ] for l in leader_names)
            has_tn_mention = any(k in combined for k in ["tamil", "tamil nadu", "tn", "chennai", "coimbatore", "madurai", "சேலம்", "மதுரை", "சென்னை", "தமிழ்நாடு"])

            if is_tn_entity or has_tn_leader or has_tn_mention:
                return True, "Tamil Nadu State Political Trend"

        # 3. Check recognized TN political topics (excluding generic fallback)
        valid_political_topics = [
            "2026 Assembly Election", "Kalaignar Magalir Urimai Thogai", "TVK Vijay Political Movement",
            "Power Tariffs & TANGEDCO", "Cauvery Riparian Rights & Agriculture", "Industrial Investment & Sipcot Jobs",
            "Chennai Infrastructure & Flood Mitigation", "Law & Order, Governance Controversies",
            "NEET Exemption & State Education Policy", "Central Funds & Delimitation Rights", "Tamil Nadu State Politics"
        ]
        matched_valid_topics = [t for t in topics if t in valid_political_topics]
        has_context = any(re.search(pat, combined, re.IGNORECASE) for pat in TN_POLITICAL_CONTEXT_PATTERNS)

        if matched_valid_topics and has_context:
            return True, "Tamil Nadu State Political Trend"

        # 4. Check explicit Tamil Nadu governance terms
        has_tn = any(k in combined for k in ["tamil", "tamil nadu", "tn", "தமிழ்நாடு", "தமிழ்"])
        has_political_term = any(k in combined for k in ["அரசியல்", "சட்டமன்ற", "தேர்தல்", "டாஸ்மாக்", "கூட்டணி", "ஆளுநர்", "கொள்கை", "அரசாணை"])
        if has_tn and has_political_term:
            return True, "Tamil Nadu State Political Trend"

        return False, "Non-political / Unrelated General Search Trend"

    _is_tn_politically_relevant = is_tn_politically_relevant

    def _parse_xml_item(self, item_elem: ET.Element) -> Optional[NormalizedPost]:
        title = item_elem.findtext("title", "").strip()
        link = item_elem.findtext("link", "").strip()
        pub_date = item_elem.findtext("pubDate", "").strip()
        approx_traffic = item_elem.findtext("{https://trends.google.com/trending/rss}approx_traffic", "").strip()
        desc = item_elem.findtext("description", "").strip()

        # Extract news item titles if description is terse
        news_headlines = []
        for ni in item_elem.findall("{https://trends.google.com/trending/rss}news_item"):
            ni_t = ni.findtext("{https://trends.google.com/trending/rss}news_item_title", "")
            if ni_t:
                news_headlines.append(ni_t)
        full_context = f"{desc} {' | '.join(news_headlines)}".strip()

        is_political, regional_scope = self.is_tn_politically_relevant(title, full_context)
        if not is_political:
            return None

        matched = entity_matcher.match_entities(full_context, title)
        sentiment, sentiment_score = entity_matcher.detect_sentiment(f"{title} {full_context}")

        # Clean approximate traffic (e.g. "50,000+" -> 50000); do not invent numbers if unavailable
        clean_traffic = 0
        traffic_display = ""
        if approx_traffic:
            cleaned_digits = approx_traffic.replace("+", "").replace(",", "").strip()
            if cleaned_digits.isdigit():
                clean_traffic = int(cleaned_digits)
                traffic_display = f"Est. Search Traffic: {approx_traffic}"
            else:
                traffic_display = "Regional Search Surge"
        else:
            traffic_display = "Regional Search Surge"

        # Deterministic post_id based on normalized title to prevent duplicate ingestion across process runs
        clean_title_key = re.sub(r"[^\w\s]", "", title.lower()).strip()
        post_id = hashlib.sha256(f"google_trends_{clean_title_key}".encode("utf-8")).hexdigest()[:16]
        now_iso = datetime.now(timezone.utc).isoformat()

        content = f"Search surge topic: {title}. {traffic_display}. Scope: {regional_scope}. {desc}".strip()

        # Sanitize topics: Never let 'General Governance' leak as a topic for Google Trends
        valid_topics = [t for t in matched.get("topics", []) if t != "General Governance"]
        if not valid_topics:
            valid_topics = ["Tamil Nadu State Politics"]

        return NormalizedPost(
            id=f"gtrends_{post_id}",
            platform="google_trends",
            platform_post_id=post_id,
            canonical_url=link or f"https://trends.google.com/trends/explore?geo=IN&q={title}",
            author_name="Google Trends (Tamil Nadu Politics)",
            author_handle="@googletrends",
            title=title,
            content=content,
            language="ta" if any(ord(c) >= 0x0B80 and ord(c) <= 0x0BFF for c in title) else "en",
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
            topics=valid_topics,
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
