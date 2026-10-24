"""Local fixture posts for mock collection (no network, no Bright Data credits). Clearly labelled source='fixture'."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List


def _ago(hours: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()


def fixture_records(platform: str, target_url: str) -> List[Dict[str, Any]]:
    """Provider-shaped raw records so the real normaliser is exercised."""
    handle = target_url.rstrip("/").rsplit("/", 1)[-1] or "fixture_user"
    texts = [
        "முதல்வர் ஸ்டாலின் இன்று சென்னையில் புதிய மெட்ரோ திட்டத்தை தொடங்கி வைத்தார் #DMK #Chennai",
        "Annamalai addresses BJP workers in Coimbatore ahead of the 2026 Assembly election #BJP4TN",
        "Heavy rain expected across Chennai this weekend, IMD issues yellow alert",
        "Thalapathy Vijay's TVK announces new district secretaries at Panaiyur office #TVK",
        "Thiruvannamalai Deepam festival preparations begin; devotees expected in lakhs",
        "Edappadi Palaniswami slams the state government over power tariff hike #AIADMK",
        "Match highlights: Chennai Super Kings beat Mumbai Indians by 6 wickets",
        "New cinema release crosses 100 crore worldwide in its opening week",
    ]
    out = []
    for i, text in enumerate(texts):
        pid = f"fx_{platform}_{i}"
        base = {"url": f"{target_url.rstrip('/')}/p/{pid}", "date_posted": _ago(i * 5 + 1)}
        if platform == "instagram":
            out.append({**base, "post_id": pid, "user_posted": handle, "description": text, "likes": 100 + i * 7,
                        "num_comments": 5 + i, "hashtags": []})
        elif platform == "facebook":
            out.append({**base, "post_id": pid, "profile_handle": handle, "page_name": handle, "content": text,
                        "num_likes_type": {"num": 200 + i, "type": "Like"}, "num_comments": 9, "num_shares": 3})
        else:
            out.append({**base, "id": pid, "user_posted": handle, "name": handle, "description": text, "likes": 50 + i,
                        "replies": 2, "reposts": 4, "views": 1000 + i * 90})
    # include one exact duplicate and one malformed record to exercise validation paths
    out.append(dict(out[0]))
    out.append({"error": "dead_page", "error_code": "dead_page"})
    return out


def fixture_discovery_records(kind: str, value: str) -> List[Dict[str, Any]]:
    """Instagram-shaped fixtures for the discovery pipeline: TN politics (Tamil + English), other-state politics,
    non-political posts, a post with no signal (dropped by Stage A) and posts shared across sources (dedup)."""
    handle = value if kind == "profile" else f"acct_{value.lower()}"
    rows = [
        # shared across every source -> exercises cross-source deduplication
        {"post_id": "fx_ig_shared_1", "url": "https://www.instagram.com/p/FXSHARED1", "user_posted": "fx_shared",
         "description": "சென்னையில் DMK அரசின் புதிய திட்டம் தொடங்கப்பட்டது #DMK #Chennai", "date_posted": _ago(3),
         "hashtags": ["DMK", "Chennai"], "content_type": "Photo"},
        {"post_id": f"fx_ig_{handle}_1", "url": f"https://www.instagram.com/p/FX{handle}1", "user_posted": handle,
         "description": "TVK Vijay addresses a rally in Madurai ahead of the 2026 Assembly election #TVK", "date_posted": _ago(5),
         "hashtags": ["TVK"], "content_type": "Video"},
        {"post_id": f"fx_ig_{handle}_2", "url": f"https://www.instagram.com/p/FX{handle}2", "user_posted": handle,
         "description": "Delhi Chief Minister announces new metro line; opposition protests in the assembly", "date_posted": _ago(8),
         "hashtags": [], "content_type": "Photo"},
        {"post_id": f"fx_ig_{handle}_3", "url": f"https://www.instagram.com/p/FX{handle}3", "user_posted": handle,
         "description": "Sunday biryani special at our Coimbatore outlet! 🍗🔥 #foodie", "date_posted": _ago(11),
         "hashtags": ["foodie"], "content_type": "Reel"},
        {"post_id": f"fx_ig_{handle}_4", "url": f"https://www.instagram.com/p/FX{handle}4", "user_posted": handle,
         "description": "Good vibes only ✨", "date_posted": _ago(14), "hashtags": [], "content_type": "Photo"},
        {"post_id": f"fx_ig_{handle}_5", "url": f"https://www.instagram.com/p/FX{handle}5", "user_posted": handle,
         "description": "மின் கட்டண உயர்வு குறித்து அரசு விளக்கம் அளிக்க வேண்டும் - எதிர்க்கட்சி போராட்டம் #PowerTariff",
         "date_posted": _ago(20), "hashtags": ["PowerTariff"], "content_type": "Carousel"},
    ]
    return rows
