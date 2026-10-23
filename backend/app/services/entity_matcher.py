import re
import json
import sqlite3
import os
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "warroom.db")

SEED_TOPICS = [
    {
        "id": "election_2026",
        "name_en": "2026 Assembly Election",
        "name_ta": "2026 சட்டமன்ற தேர்தல்",
        "category": "Elections & Alliances",
        "keywords_en": ["2026 election", "assembly election", "vote share", "campaign", "alliance", "seat sharing", "constituency"],
        "keywords_ta": ["சட்டமன்ற தேர்தல்", "தேர்தல் களம்", "கூட்டணி", "தொகுதி பங்கீடு", "வாக்கு வங்கி", "தேர்தல் பிரச்சாரம்"],
        "hashtags": ["#TNAssemblyElection2026", "#Election2026", "#TNElection", "#தேர்தல்2026"],
        "negative_keywords": ["panchayat election 2019", "parliament election 2024"],
        "related_party_codes": ["DMK", "AIADMK", "TVK", "BJP", "NTK", "VCK"],
        "related_leader_names": ["M.K. Stalin", "Thalapathy Vijay", "Edappadi K. Palaniswami", "K. Annamalai", "Seeman"]
    },
    {
        "id": "magalir_urimai",
        "name_en": "Kalaignar Magalir Urimai Thogai",
        "name_ta": "கலைஞர் மகளிர் உரிமைத் தொகை",
        "category": "Welfare & Social Justice",
        "keywords_en": ["magalir urimai", "women financial assistance", "1000 rupees scheme", "monthly aid", "welfare scheme"],
        "keywords_ta": ["மகளிர் உரிமைத் தொகை", "ரூ.1000 திட்டம்", "பெண்கள் உரிமை தொகை", "மகளிர் உரிமை", "குடும்பத்தலைவிகள்"],
        "hashtags": ["#MagalirUrimaiThogai", "#மகளிர்உரிமைத்தொகை", "#TNGovtSchemes"],
        "negative_keywords": [],
        "related_party_codes": ["DMK"],
        "related_leader_names": ["M.K. Stalin", "Udhayanidhi Stalin"]
    },
    {
        "id": "tvk_political_entry",
        "name_en": "TVK Vijay Political Movement",
        "name_ta": "தவெக விஜய் அரசியல் களம்",
        "category": "New Political Formations",
        "keywords_en": ["tvk", "thalapathy vijay", "tamizhaga vettri kazhagam", "vijay political conference", "vikravandi conference"],
        "keywords_ta": ["தவெக", "விஜய்", "தளபதி விஜய்", "தமிழக வெற்றிக் கழகம்", "மாநாடு", "விக்கிரவாண்டி மாநாடு"],
        "hashtags": ["#TVKVijay", "#TamizhagaVettriKazhagam", "#தவெக", "#TVK"],
        "negative_keywords": ["leo movie", "goat trailer", "cinema news only"],
        "related_party_codes": ["TVK"],
        "related_leader_names": ["Thalapathy Vijay"]
    },
    {
        "id": "power_tariff",
        "name_en": "Power Tariffs & TANGEDCO",
        "name_ta": "மின் கட்டண உயர்வு & டான்ஜெட்கோ",
        "category": "State Infrastructure & Economy",
        "keywords_en": ["electricity tariff", "power tariff hike", "tangedco", "power cut", "commercial electricity"],
        "keywords_ta": ["மின்கட்டணம்", "மின் கட்டண உயர்வு", "டான்ஜெட்கோ", "மின்சார வாரியம்", "மின்வெட்டு"],
        "hashtags": ["#ElectricityTariff", "#TANGEDCO", "#மின்கட்டணஉயர்வு"],
        "negative_keywords": [],
        "related_party_codes": ["AIADMK", "BJP", "DMK"],
        "related_leader_names": ["Edappadi K. Palaniswami", "K. Annamalai"]
    },
    {
        "id": "cauvery_water",
        "name_en": "Cauvery Riparian Rights & Agriculture",
        "name_ta": "காவிரி நீர் உரிமை & விவசாயிகள் நலன்",
        "category": "Riparian Rights & Agriculture",
        "keywords_en": ["cauvery water", "mekedatu dam", "cwma", "farmers protest", "delta agriculture", "kuruvai crop"],
        "keywords_ta": ["காவிரி நீர்", "மேகதாது", "டெல்டா விவசாயிகள்", "காவிரி மேலாண்மை ஆணையம்", "குறுவை சாகுபடி"],
        "hashtags": ["#CauveryWaterIssue", "#Mekedatu", "#SaveCauveryFarmers", "#காவிரி"],
        "negative_keywords": [],
        "related_party_codes": ["DMK", "AIADMK", "PMK", "NTK"],
        "related_leader_names": ["M.K. Stalin", "Seeman", "Dr. Anbumani Ramadoss"]
    },
    {
        "id": "industrial_development",
        "name_en": "Industrial Investment & Sipcot Jobs",
        "name_ta": "தொழில் முதலீடுகள் & சிப்காட் வேலைவாய்ப்பு",
        "category": "Economic Policy & Employment",
        "keywords_en": ["global investors meet", "mou signed", "sipcot", "ev manufacturing", "semiconductor plant", "tamil nadu gdp"],
        "keywords_ta": ["தொழில் முதலீடு", "சிப்காட்", "வேலைவாய்ப்பு", "முதலீட்டாளர் மாநாடு", "தொழிற்சாலைகள்"],
        "hashtags": ["#TNIndustrialGrowth", "#InvestInTN", "#TamilNaduEconomy"],
        "negative_keywords": [],
        "related_party_codes": ["DMK"],
        "related_leader_names": ["M.K. Stalin", "TRB Rajaa"]
    },
    {
        "id": "chennai_infrastructure",
        "name_en": "Chennai Infrastructure & Flood Mitigation",
        "name_ta": "சென்னை உள்கட்டமைப்பு & மழை வெள்ளத் தடுப்பு",
        "category": "Urban Infrastructure & Governance",
        "keywords_en": ["chennai rain", "storm water drain", "metro rail phase 2", "flood mitigation", "gcc chennai", "singara chennai"],
        "keywords_ta": ["சென்னை மழை", "மழைநீர் வடிகால்", "மெட்ரோ ரயில்", "வெள்ளத் தடுப்பு பணி", "சிங்கார சென்னை"],
        "hashtags": ["#ChennaiRain", "#ChennaiMetro", "#SingaraChennai"],
        "negative_keywords": [],
        "related_party_codes": ["DMK", "AIADMK"],
        "related_leader_names": ["M.K. Stalin", "Udhayanidhi Stalin"]
    },
    {
        "id": "law_and_order",
        "name_en": "Law & Order, Governance Controversies",
        "name_ta": "சட்டம் ஒழுங்கு & நிர்வாக சர்ச்சை",
        "category": "Governance & Public Safety",
        "keywords_en": ["law and order", "cbi probe", "police action", "hooch tragedy", "custodial issue", "governor dispute"],
        "keywords_ta": ["சட்டம் ஒழுங்கு", "கள்ளக்குறிச்சி", "போலீஸ் விசாரணை", "ஆளுநர் விவகாரம்", "சிபிஐ"],
        "hashtags": ["#TNLawAndOrder", "#TamilNaduPolitics"],
        "negative_keywords": [],
        "related_party_codes": ["AIADMK", "BJP", "DMK"],
        "related_leader_names": ["Edappadi K. Palaniswami", "K. Annamalai", "R.N. Ravi"]
    },
    {
        "id": "neet_and_education",
        "name_en": "NEET Exemption & State Education Policy",
        "name_ta": "நீட் தேர்வு விலக்கு & மாநில கல்வி உரிமை",
        "category": "Education & Social Justice",
        "keywords_en": ["neet exemption", "state education policy", "education bill", "medical entrance", "governor assent"],
        "keywords_ta": ["நீட் தேர்வு", "நீட் விலக்கு", "கல்வி உரிமை", "மாநில கல்வி கொள்கை"],
        "hashtags": ["#BanNEET", "#NEETExemption", "#நீட்விலக்கு"],
        "negative_keywords": [],
        "related_party_codes": ["DMK", "AIADMK", "VCK"],
        "related_leader_names": ["M.K. Stalin", "Udhayanidhi Stalin", "Thol. Thirumavalavan"]
    },
    {
        "id": "fiscal_federalism",
        "name_en": "Central Funds & Delimitation Rights",
        "name_ta": "மத்திய நிதிப் பகிர்வு & தொகுதி மறுவரையறை",
        "category": "Federalism & National Politics",
        "keywords_en": ["delimitation", "central tax share", "finance commission", "states rights", "federalism", "south india representation"],
        "keywords_ta": ["மத்திய நிதி", "தொகுதி மறுவரையறை", "வரி பகிர்வு", "மாநில சுயாட்சி", "கூட்டாட்சி தத்துவம்"],
        "hashtags": ["#FiscalFederalism", "#StopDelimitation", "#StateRights"],
        "negative_keywords": [],
        "related_party_codes": ["DMK", "VCK", "INC", "BJP"],
        "related_leader_names": ["M.K. Stalin", "Thol. Thirumavalavan"]
    }
]

PARTIES_CONFIG = [
    {
        "code": "DMK",
        "name": "Dravida Munnetra Kazhagam",
        "tamil_name": "திராவிட முன்னேற்றக் கழகம்",
        "color": "#DC2626",
        "symbol": "Rising Sun (உதயசூரியன்)",
        "alliance": "Secular Progressive Alliance (SPA)",
        "keywords": ["dmk", "திமுக", "திராவிட முன்னேற்றக் கழகம்", "stalin", "ஸ்டாலின்", "udhayanidhi", "உதயநிதி", "kalaignar", "கலைஞர்"],
        "hashtags": ["#DMK", "#MKStalin", "#DMK4TN", "#திராவிடமாடல்", "#DravidianModel"]
    },
    {
        "code": "AIADMK",
        "name": "All India Anna Dravida Munnetra Kazhagam",
        "tamil_name": "அனைத்திந்திய அண்ணா திராவிட முன்னேற்றக் கழகம்",
        "color": "#16A34A",
        "symbol": "Two Leaves (இரட்டை இலை)",
        "alliance": "AIADMK Alliance",
        "keywords": ["aiadmk", "அதிமுக", "அதிமுக பொதுச்செயலாளர்", "edappadi", "பழனிசாமி", "eps", "இபிஎஸ்", "ஜெயலலிதா"],
        "hashtags": ["#AIADMK", "#EPS", "#EdappadiPalaniswami", "#அதிமுக"]
    },
    {
        "code": "BJP",
        "name": "Bharatiya Janata Party (Tamil Nadu)",
        "tamil_name": "பாரதிய ஜனதா கட்சி",
        "color": "#EA580C",
        "symbol": "Lotus (தாமரை)",
        "alliance": "National Democratic Alliance (NDA)",
        "keywords": ["bjp", "பாஜக", "பாரதிய ஜனதா", "annamalai", "அண்ணாமலை", "narendra modi", "மோடி", "கமலாலயம்"],
        "hashtags": ["#TNBJP", "#Annamalai", "#BJP4TN", "#பாஜக"]
    },
    {
        "code": "TVK",
        "name": "Tamilaga Vettri Kazhagam",
        "tamil_name": "தமிழக வெற்றிக் கழகம்",
        "color": "#EAB308",
        "symbol": "Whistle / Flag (தவெக கொடி)",
        "alliance": "Independent",
        "keywords": ["tvk", "தவெக", "தமிழக வெற்றிக் கழகம்", "thalapathy vijay", "விஜய்", "தளபதி விஜய்", "tvk vijay"],
        "hashtags": ["#TVKVijay", "#TamizhagaVettriKazhagam", "#தவெக", "#TVK"]
    },
    {
        "code": "NTK",
        "name": "Naam Tamilar Katchi",
        "tamil_name": "நாம் தமிழர் கட்சி",
        "color": "#84CC16",
        "symbol": "Microphone (ஒலிவாங்கி)",
        "alliance": "Independent",
        "keywords": ["ntk", "நாம் தமிழர்", "நாம் தமிழர் கட்சி", "seeman", "சீமான்", "தமிழ்த்தேசியம்"],
        "hashtags": ["#NaamTamilarKatchi", "#Seeman", "#நாம்_தமிழர்"]
    },
    {
        "code": "VCK",
        "name": "Viduthalai Chiruthaigal Katchi",
        "tamil_name": "விடுதலைச் சிறுத்தைகள் கட்சி",
        "color": "#2563EB",
        "symbol": "Pot (பானை)",
        "alliance": "Secular Progressive Alliance (SPA)",
        "keywords": ["vck", "விசிக", "விடுதலைச் சிறுத்தைகள்", "thirumavalavan", "திருமாவளவன்", "தொல். திருமாவளவன்"],
        "hashtags": ["#VCK", "#Thirumavalavan", "#விசிக"]
    },
    {
        "code": "INC",
        "name": "Indian National Congress (Tamil Nadu)",
        "tamil_name": "இந்திய தேசிய காங்கிரஸ்",
        "color": "#0284C7",
        "symbol": "Hand (கை)",
        "alliance": "Secular Progressive Alliance (SPA)",
        "keywords": ["congress", "காங்கிரஸ்", "tncc", "செல்வப்பெருந்தகை", "ராகுல் காந்தி"],
        "hashtags": ["#TNCC", "#Congress", "#INC"]
    },
    {
        "code": "PMK",
        "name": "Pattali Makkal Katchi",
        "tamil_name": "பாட்டாளி மக்கள் கட்சி",
        "color": "#CA8A04",
        "symbol": "Mango (மாம்பழம்)",
        "alliance": "NDA",
        "keywords": ["pmk", "பாமக", "பாட்டாளி மக்கள் கட்சி", "anbumani", "அன்புமணி", "ராமதாஸ்"],
        "hashtags": ["#PMK", "#AnbumaniRamadoss", "#பாமக"]
    }
]

LEADERS_CONFIG = [
    {
        "name": "M.K. Stalin",
        "tamil_name": "மு.க. ஸ்டாலின்",
        "party_code": "DMK",
        "keywords": ["m.k. stalin", "mk stalin", "stalin", "முதல்வர் ஸ்டாலின்", "ஸ்டாலின்", "முதல்வர் மு.க.ஸ்டாலின்"]
    },
    {
        "name": "Thalapathy Vijay",
        "tamil_name": "தளபதி விஜய்",
        "party_code": "TVK",
        "keywords": ["thalapathy vijay", "vijay", "நடிகர் விஜய்", "தவெக தலைவர் விஜய்", "தளபதி விஜய்", "விஜய்"]
    },
    {
        "name": "Edappadi K. Palaniswami",
        "tamil_name": "எடப்பாடி கே. பழனிசாமி",
        "party_code": "AIADMK",
        "keywords": ["edappadi k. palaniswami", "edappadi palaniswami", "eps", "எடப்பாடி கே. பழனிசாமி", "எடப்பாடி கே.பழனிசாமி", "எடப்பாடி பழனிசாமி", "இபிஎஸ்", "எடப்பாடியார்", "எடப்பாடி"]
    },
    {
        "name": "K. Annamalai",
        "tamil_name": "கே. அண்ணாமலை",
        "party_code": "BJP",
        "keywords": ["k. annamalai", "annamalai", "அண்ணாமலை", "கே. அண்ணாமலை", "பாஜக அண்ணாமலை"]
    },
    {
        "name": "Udhayanidhi Stalin",
        "tamil_name": "உதயநிதி ஸ்டாலின்",
        "party_code": "DMK",
        "keywords": ["udhayanidhi stalin", "udhayanidhi", "உதயநிதி", "துணை முதல்வர் உதயநிதி", "உதயநிதி ஸ்டாலின்"]
    },
    {
        "name": "Seeman",
        "tamil_name": "சீமான்",
        "party_code": "NTK",
        "keywords": ["seeman", "சீமான்", "செந்தமிழன் சீமான்", "நாம் தமிழர் சீமான்"]
    },
    {
        "name": "Thol. Thirumavalavan",
        "tamil_name": "தொல். திருமாவளவன்",
        "party_code": "VCK",
        "keywords": ["thirumavalavan", "thol thirumavalavan", "திருமாவளவன்", "தொல். திருமாவளவன்", "எழுச்சித் தமிழர்"]
    },
    {
        "name": "Dr. Anbumani Ramadoss",
        "tamil_name": "மருத்துவர் அன்புமணி ராமதாஸ்",
        "party_code": "PMK",
        "keywords": ["anbumani ramadoss", "anbumani", "அன்புமணி ராமதாஸ்", "அன்புமணி"]
    }
]

from backend.app.data.db import get_connection, is_postgres

class EntityMatcher:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._initialized = False

    def ensure_initialized(self):
        if self._initialized:
            return
        self._ensure_topic_registry()
        self._initialized = True

    def _ensure_topic_registry(self):
        try:
            with get_connection(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM topic_registry")
                count = cursor.fetchone()[0]
                if count == 0:
                    now_str = datetime.now(timezone.utc).isoformat()
                    use_pg = is_postgres()
                    for t in SEED_TOPICS:
                        if use_pg:
                            cursor.execute("""
                                INSERT INTO topic_registry (
                                    id, name, tamil_name, name_en, name_ta, category,
                                    keywords_en, keywords_ta, hashtags,
                                    negative_keywords, related_party_codes, related_leader_names,
                                    last_reviewed_at, is_active
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                                ON CONFLICT (id) DO UPDATE SET
                                    name = EXCLUDED.name,
                                    tamil_name = EXCLUDED.tamil_name,
                                    name_en = EXCLUDED.name_en,
                                    name_ta = EXCLUDED.name_ta,
                                    category = EXCLUDED.category
                            """, (
                                t["id"], t["name_en"], t["name_ta"], t["name_en"], t["name_ta"], t["category"],
                                json.dumps(t["keywords_en"]), json.dumps(t["keywords_ta"]),
                                json.dumps(t["hashtags"]), json.dumps(t["negative_keywords"]),
                                json.dumps(t["related_party_codes"]), json.dumps(t["related_leader_names"]),
                                now_str
                            ))
                        else:
                            cursor.execute("""
                                INSERT OR IGNORE INTO topic_registry (
                                    id, name, tamil_name, name_en, name_ta, category,
                                    keywords_en, keywords_ta, hashtags,
                                    negative_keywords, related_party_codes, related_leader_names,
                                    last_reviewed_at, is_active
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                            """, (
                                t["id"], t["name_en"], t["name_ta"], t["name_en"], t["name_ta"], t["category"],
                                json.dumps(t["keywords_en"]), json.dumps(t["keywords_ta"]),
                                json.dumps(t["hashtags"]), json.dumps(t["negative_keywords"]),
                                json.dumps(t["related_party_codes"]), json.dumps(t["related_leader_names"]),
                                now_str
                            ))
                    conn.commit()
        except Exception as e:
            # Table might not exist yet if called before migrations
            pass

    def _contains_keyword(self, text: str, kw: str) -> Tuple[bool, Optional[str]]:
        """
        Tests whether keyword exists in text. Uses word boundaries for ASCII/short tokens
        and negative lookbehinds for Tamil sub-token acronyms (e.g. திமுக inside அதிமுக or மதிமுக).
        Returns (found, matched_evidence).
        """
        kw_clean = kw.strip().lower()
        if not kw_clean:
            return False, None

        # Special Tamil acronym disambiguation
        if kw_clean == "திமுக":
            match = re.search(r"(?<![அம])திமுக", text)
            if match:
                return True, match.group(0)
            return False, None

        # If keyword is pure ASCII and short (<= 6 chars, like dmk, eps, bjp, tvk), enforce word boundaries
        if kw_clean.isascii() and len(kw_clean) <= 6:
            pattern = rf"\b{re.escape(kw_clean)}\b"
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return True, match.group(0)
            return False, None
        else:
            if kw_clean in text.lower():
                return True, kw
            return False, None

    def match_entities(self, text: str, title: Optional[str] = "") -> Dict[str, Any]:
        """
        Extracts parties, leaders, topics, and hashtags from Tamil and English content.
        Preserves Unicode Tamil script and avoids false positives via word boundary & negative checks.
        Returns rich matched_entities records alongside legacy list keys.
        """
        combined = f"{title or ''} {text or ''}".lower()
        matched_entities_list: List[Dict[str, Any]] = []

        # 1. Match Parties
        matched_parties = set()
        for party in PARTIES_CONFIG:
            party_matched = False
            for kw in party["keywords"]:
                found, evidence = self._contains_keyword(combined, kw)
                if found:
                    # Guard for short tokens: e.g. "inc" in English
                    if kw.lower() == "inc" and "congress" not in combined and "காங்கிரஸ்" not in combined and "tncc" not in combined:
                        continue

                    matched_parties.add(party["code"])
                    matched_entities_list.append({
                        "entity_name": party["name"],
                        "tamil_name": party["tamil_name"],
                        "entity_type": "party",
                        "party_code": party["code"],
                        "confidence": 0.95 if len(kw) > 4 else 0.85,
                        "evidence": evidence,
                        "matched_keyword": kw
                    })
                    party_matched = True
                    break

            if not party_matched:
                for tag in party["hashtags"]:
                    found, evidence = self._contains_keyword(combined, tag)
                    if found:
                        matched_parties.add(party["code"])
                        matched_entities_list.append({
                            "entity_name": party["name"],
                            "tamil_name": party["tamil_name"],
                            "entity_type": "party",
                            "party_code": party["code"],
                            "confidence": 0.98,
                            "evidence": evidence,
                            "matched_keyword": tag
                        })
                        break

        # 2. Match Leaders
        matched_leaders = set()
        for leader in LEADERS_CONFIG:
            for kw in leader["keywords"]:
                found, evidence = self._contains_keyword(combined, kw)
                if not found:
                    continue

                # Negative context guard for Thalapathy Vijay: ignore entertainment/cinema only mentions
                if leader["name"] == "Thalapathy Vijay":
                    is_cinema = any(c in combined for c in ["box office", "movie review", "trailer release", "audio launch", "leo movie", "goat trailer"])
                    has_politics = any(p in combined for p in ["தவெக", "அரசியல்", "கட்சி", "மாநாடு", "விக்கிரவாண்டி", "politics", "election", "tvk", "சட்டமன்ற", "ஆட்சி"])
                    if is_cinema and not has_politics:
                        continue

                # Negative context guard for EPS: ignore economics "earnings per share"
                if kw.lower() == "eps":
                    has_eps_politics = any(p in combined for p in ["அதிமுக", "எடப்பாடி", "பழனிசாமி", "edappadi", "palaniswami", "politics", "aiadmk", "முதல்வர்", "அரசியல்"])
                    if not has_eps_politics and "earnings" in combined:
                        continue

                matched_leaders.add(leader["name"])
                matched_parties.add(leader["party_code"])
                matched_entities_list.append({
                    "entity_name": leader["name"],
                    "tamil_name": leader["tamil_name"],
                    "entity_type": "leader",
                    "party_code": leader["party_code"],
                    "confidence": 0.95 if len(kw) > 6 else 0.85,
                    "evidence": evidence,
                    "matched_keyword": kw
                })
                break

        # 3. Match Topics
        matched_topics = set()
        for t in SEED_TOPICS:
            # Check negative keywords first
            has_negative = any(neg.lower() in combined for neg in t["negative_keywords"])
            if has_negative:
                continue

            # Check positive keywords
            hit = False
            hit_kw = ""
            for kw in t["keywords_en"] + t["keywords_ta"]:
                found, evidence = self._contains_keyword(combined, kw)
                if found:
                    hit = True
                    hit_kw = kw
                    break
            if not hit:
                for tag in t["hashtags"]:
                    found, evidence = self._contains_keyword(combined, tag)
                    if found:
                        hit = True
                        hit_kw = tag
                        break

            if hit:
                matched_topics.add(t["name_en"])
                matched_entities_list.append({
                    "entity_name": t["name_en"],
                    "tamil_name": t["name_ta"],
                    "entity_type": "topic",
                    "party_code": None,
                    "confidence": 0.90,
                    "evidence": hit_kw,
                    "matched_keyword": hit_kw
                })

        # Fallback topic if none matched
        if not matched_topics:
            if matched_parties or matched_leaders:
                fallback_topic = "Tamil Nadu State Politics"
            else:
                fallback_topic = "General Governance"
            matched_topics.add(fallback_topic)

        # 4. Extract Hashtags
        raw_hashtags = re.findall(r"#[\w\u0B80-\u0BFF]+", combined)
        clean_hashtags = list(dict.fromkeys([h for h in raw_hashtags if len(h) > 2]))

        return {
            "party_codes": sorted(list(matched_parties)),
            "leader_names": sorted(list(matched_leaders)),
            "topics": sorted(list(matched_topics)),
            "hashtags": clean_hashtags,
            "matched_entities": matched_entities_list
        }

    def detect_sentiment(self, text: str) -> Tuple[str, float]:
        """
        Evaluates editorial tone. Neutral by default for wire/factual reports.
        """
        lower = text.lower()
        pos_words = ["வெற்றி", "வளர்ச்சி", "பாராட்டு", "சாதனை", "நன்மை", "வரவேற்பு", "முன்னேற்றம்", "success", "praise", "milestone", "lauds", "win"]
        neg_words = ["கண்டனம்", "தோல்வி", "ஊழல்", "எதிர்ப்பு", "சர்ச்சை", "மோச", "தாக்குதல்", "நெருக்கடி", "போராட்டம்", "controversy", "criticism", "scandal", "protest", "slams", "clash"]

        pos_count = sum(1 for w in pos_words if w in lower)
        neg_count = sum(1 for w in neg_words if w in lower)

        if pos_count > neg_count and pos_count >= 1:
            return "positive", min(0.65, 0.2 + (pos_count * 0.15))
        elif neg_count > pos_count and neg_count >= 1:
            return "negative", max(-0.75, -0.2 - (neg_count * 0.15))
        else:
            return "neutral", 0.05

entity_matcher = EntityMatcher()
