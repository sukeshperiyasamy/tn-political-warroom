"""Stage A: a cheap, deliberately PERMISSIVE candidate filter that decides whether a post is worth sending to Gemini.

It only removes posts with no Tamil Nadu / political signal at all (empty captions, emoji-only, unrelated English text).
It never decides that a post IS political; Gemini (Stage B) does that. A post with Tamil-script text always passes,
because Tamil captions are the most likely to be missed by keyword lists.
"""
import re
from typing import Dict, List, Tuple

from backend.app.services.entity_matcher import PARTIES_CONFIG, entity_matcher

TN_DISTRICTS = [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi",
    "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris",
    "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni",
    "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur",
    "Vellore", "Viluppuram", "Virudhunagar",
]

_PLACE_WORDS = [d.lower() for d in TN_DISTRICTS] + [
    "tamil nadu", "tamilnadu", "tn ", "trichy", "kovai", "nellai", "tuticorin", "kanchi", "villupuram",
    "தமிழ்நாடு", "தமிழகம்", "சென்னை", "மதுரை", "கோவை", "கோயம்புத்தூர்", "திருச்சி", "சேலம்", "நெல்லை", "ஈரோடு", "வேலூர்", "தஞ்சை",
]
_POLITICAL_WORDS_EN = [
    "election", "minister", "chief minister", "assembly", "mla", "mp ", "government", "govt", "protest", "policy", "vote", "voter",
    "campaign", "rally", "party", "manifesto", "cm ", "politic", "opposition", "alliance", "seat sharing", "bypoll", "governor",
]
_POLITICAL_WORDS_TA = [
    "தேர்தல்", "முதல்வர்", "அமைச்சர்", "அரசு", "சட்டமன்ற", "கட்சி", "பிரச்சாரம்", "போராட்டம்", "ஆட்சி", "எம்எல்ஏ", "வாக்கு",
    "அரசியல்", "மாநாடு", "கூட்டணி", "தொகுதி", "ஆளுநர்", "எதிர்க்கட்சி",
]
_TAMIL = re.compile(r"[஀-௿]")


def _party_hashtags() -> List[str]:
    return [h.lower().lstrip("#") for p in PARTIES_CONFIG for h in p.get("hashtags", [])]


def candidate_filter(text: str, hashtags: List[str]) -> Tuple[bool, List[str]]:
    """Returns (passes, reasons). `reasons` lists which signals matched, or why it was dropped."""
    body = (text or "").strip()
    tags = [h.lower().lstrip("#") for h in (hashtags or [])]
    if not body and not tags:
        return False, ["empty caption"]
    low = f" {body.lower()} "
    reasons: List[str] = []

    m = entity_matcher.match_entities(text=body, title="")
    if m["party_codes"] or m["leader_names"] or m["topics"]:
        reasons.append("registry match")
    if set(tags) & set(_party_hashtags()):
        reasons.append("political hashtag")
    if any(w in low for w in _PLACE_WORDS):
        reasons.append("Tamil Nadu place")
    if any(w in low for w in _POLITICAL_WORDS_EN) or any(w in body for w in _POLITICAL_WORDS_TA):
        reasons.append("political keyword")
    if len(_TAMIL.findall(body)) >= 8:
        reasons.append("Tamil-script text")
    if reasons:
        return True, reasons
    return False, ["no Tamil Nadu or political signal"]


def summary() -> Dict[str, int]:
    """Sizes of the keyword sets (shown in the UI so the filter is transparent)."""
    return {"districts": len(TN_DISTRICTS), "place_words": len(_PLACE_WORDS),
            "political_words": len(_POLITICAL_WORDS_EN) + len(_POLITICAL_WORDS_TA), "party_hashtags": len(set(_party_hashtags()))}
