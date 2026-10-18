import json
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from backend.app.data.migrations import DB_PATH
from backend.app.services.trend_engine import trend_engine
from backend.app.services.deduplicator import story_clustering_service
from backend.app.services.entity_matcher import entity_matcher

DEMO_POSTS_RAW = [
    # 1. TVK Vijay Vikravandi State Conference
    {
        "id": "demo_yt_tvk_conf",
        "platform": "youtube",
        "platform_post_id": "yt_tvk_conf_001",
        "canonical_url": "https://www.youtube.com/watch?v=demo_tvk_conf",
        "author_name": "Thanthi TV",
        "author_handle": "@ThanthiTV",
        "title": "தவெக மாநாடு: விக்கிரவாண்டியில் திரண்ட லட்சக்கணக்கான தொண்டர்கள் | TVK Vijay Vikravandi Conference Live",
        "content": "தமிழக வெற்றிக் கழகத்தின் முதல் மாநில மாநாடு விக்கிரவாண்டியில் எழுச்சியுடன் தொடங்கியது. விஜய் தனது முதல் அரசியல் உரையில் பெரியார், காமராஜர், அம்பேத்கர் கொள்கைகளை முன்வைத்து 2026 சட்டமன்ற தேர்தலுக்கான நிலைப்பாட்டை அறிவித்தார்.",
        "language": "ta",
        "media_type": "video",
        "thumbnail_url": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=640&q=80",
        "hours_ago": 18,
        "views": 485000,
        "likes": 32400,
        "comments": 4820,
        "shares": 12400,
        "history": [
            {"hours_ago": 18, "views": 25000, "likes": 2100, "comments": 350, "shares": 800},
            {"hours_ago": 12, "views": 185000, "likes": 14200, "comments": 2100, "shares": 5200},
            {"hours_ago": 6, "views": 360000, "likes": 25800, "comments": 3900, "shares": 9800},
            {"hours_ago": 1, "views": 485000, "likes": 32400, "comments": 4820, "shares": 12400}
        ]
    },
    {
        "id": "demo_x_tvk_speech",
        "platform": "x",
        "platform_post_id": "x_tvk_speech_002",
        "canonical_url": "https://x.com/TVKFlag/status/demo_x_002",
        "author_name": "TVK Updates Official",
        "author_handle": "@TVKFlag",
        "title": None,
        "content": "2026 சட்டமன்ற தேர்தல் களத்தில் தமிழக வெற்றிக் கழகம் யாருடனும் சமரசம் இன்றி மக்களின் பேராதரவோடு தனிப்பெரும் சக்தியாக களம்காணும்! #TVKVijay #விக்கிரவாண்டிமாநாடு #TVKAssemblyElection2026",
        "language": "ta",
        "media_type": "text",
        "thumbnail_url": None,
        "hours_ago": 16,
        "views": 240000,
        "likes": 28500,
        "comments": 2900,
        "shares": 14200,
        "quotes": 3100,
        "history": [
            {"hours_ago": 16, "likes": 1800, "comments": 210, "shares": 950, "views": 15000},
            {"hours_ago": 10, "likes": 14200, "comments": 1400, "shares": 7200, "views": 120000},
            {"hours_ago": 2, "likes": 28500, "comments": 2900, "shares": 14200, "views": 240000}
        ]
    },
    {
        "id": "demo_ig_tvk_flag",
        "platform": "instagram",
        "platform_post_id": "ig_tvk_flag_003",
        "canonical_url": "https://www.instagram.com/p/demo_ig_003/",
        "author_name": "Tamizhaga Vettri Kazhagam",
        "author_handle": "@tvk_official",
        "title": None,
        "content": "மக்களுக்கான புதிய அரசியல் பாதை! தவெக தலைவர் விஜய் விக்கிரவாண்டி மாநாட்டு திடலில் தொண்டர்கள் உற்சாக வெள்ளத்தில் முழக்கம். #TVK #தளபதிவிஜய் #TamilNaduPolitics",
        "language": "ta",
        "media_type": "video",
        "thumbnail_url": "https://images.unsplash.com/photo-1511578314322-379afb476865?w=640&q=80",
        "hours_ago": 15,
        "views": 320000,
        "likes": 54200,
        "comments": 3800,
        "shares": 8900,
        "history": [
            {"hours_ago": 15, "likes": 5200, "comments": 420},
            {"hours_ago": 8, "likes": 31000, "comments": 2100},
            {"hours_ago": 1, "likes": 54200, "comments": 3800}
        ]
    },
    {
        "id": "demo_reddit_tvk_analysis",
        "platform": "reddit",
        "platform_post_id": "reddit_tvk_004",
        "canonical_url": "https://www.reddit.com/r/tamilnadu/comments/demo_tvk_analysis/",
        "author_name": "u/DravidianObserver",
        "author_handle": "r/tamilnadu",
        "title": "Comprehensive Analysis: How Vijay's TVK Entry Alters the 2026 Vote Share Dynamics between DMK and AIADMK",
        "content": "Now that the Vikravandi conference has laid out TVK's ideological positioning (secular social justice + Tamil nationalism undertones), which demographic is most likely to shift? The youth voter base (18-29) is the key wild card here.",
        "language": "en",
        "media_type": "text",
        "thumbnail_url": None,
        "hours_ago": 14,
        "views": 42000,
        "likes": 780,
        "comments": 420,
        "shares": 145,
        "history": [
            {"hours_ago": 14, "likes": 45, "comments": 22},
            {"hours_ago": 6, "likes": 410, "comments": 210},
            {"hours_ago": 1, "likes": 780, "comments": 420}
        ]
    },

    # 2. Kalaignar Magalir Urimai Thogai
    {
        "id": "demo_yt_magalir_aid",
        "platform": "youtube",
        "platform_post_id": "yt_magalir_005",
        "canonical_url": "https://www.youtube.com/watch?v=demo_magalir_aid",
        "author_name": "Puthiyathalaimurai TV",
        "author_handle": "@PTTVOnlineNews",
        "title": "மகளிர் உரிமைத் தொகை: கூடுதலாக 15 லட்சம் பேருக்கு ரூ.1000 திட்டம் விரிவாக்கம்! முதல்வர் மு.க.ஸ்டாலின் அறிவிப்பு",
        "content": "கலைஞர் மகளிர் உரிமைத் திட்டத்தின் கீழ் தகுதியுள்ள கூடுதல் குடும்பத்தலைவிகளுக்கு மாதம் ரூ.1000 வழங்கும் விரிவுபடுத்தப்பட்ட முகாமை முதல்வர் மு.க.ஸ்டாலின் தொடங்கி வைத்தார். நிதி ஒதுக்கீடு மற்றும் கள ஆய்வு விவரங்கள்.",
        "language": "ta",
        "media_type": "video",
        "thumbnail_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=640&q=80",
        "hours_ago": 22,
        "views": 312000,
        "likes": 18400,
        "comments": 2150,
        "shares": 6800,
        "history": [
            {"hours_ago": 22, "views": 15000, "likes": 1200, "comments": 150},
            {"hours_ago": 12, "views": 145000, "likes": 9800, "comments": 1200},
            {"hours_ago": 2, "views": 312000, "likes": 18400, "comments": 2150}
        ]
    },
    {
        "id": "demo_x_magalir_debate",
        "platform": "x",
        "platform_post_id": "x_magalir_006",
        "canonical_url": "https://x.com/TNGovtUpdates/status/demo_x_006",
        "author_name": "TN Governance Pulse",
        "author_handle": "@TNGovtUpdates",
        "title": None,
        "content": "மகளிர் உரிமைத் தொகை 1.15 கோடி பயனாளிகளை கடந்துள்ளது. பெண்களின் பொருளாதார தற்சார்பை உறுதி செய்யும் திராவிட மாடல் அரசின் வரலாற்றுச் சாதனை! #MagalirUrimai #MKStalin #DravidianModel",
        "language": "ta",
        "media_type": "text",
        "thumbnail_url": None,
        "hours_ago": 20,
        "views": 185000,
        "likes": 16400,
        "comments": 1850,
        "shares": 4900,
        "history": [
            {"hours_ago": 20, "likes": 1100, "comments": 120, "shares": 350},
            {"hours_ago": 10, "likes": 8900, "comments": 920, "shares": 2600},
            {"hours_ago": 2, "likes": 16400, "comments": 1850, "shares": 4900}
        ]
    },
    {
        "id": "demo_fb_magalir_aiadmk",
        "platform": "facebook",
        "platform_post_id": "fb_magalir_007",
        "canonical_url": "https://www.facebook.com/aiadmk.official/posts/demo_fb_007",
        "author_name": "AIADMK Official",
        "author_handle": "@aiadmkofficial",
        "title": None,
        "content": "மகளிர் உரிமைத் தொகை திட்டத்தில் பல்லாயிரக்கணக்கான ஏழை எளிய தாய்மார்களின் விண்ணப்பங்கள் தள்ளுபடி செய்யப்பட்டுள்ளது கண்டனத்திற்குரியது. அனைத்து குடும்ப அட்டைதாரர்களுக்கும் நிபந்தனையின்றி வழங்க வேண்டும் என எடப்பாடி கே.பழனிசாமி வலியுறுத்தல்.",
        "language": "ta",
        "media_type": "text",
        "thumbnail_url": None,
        "hours_ago": 17,
        "likes": 12800,
        "comments": 1450,
        "shares": 3800,
        "history": [
            {"hours_ago": 17, "likes": 1200, "comments": 110, "shares": 320},
            {"hours_ago": 8, "likes": 7400, "comments": 810, "shares": 2100},
            {"hours_ago": 1, "likes": 12800, "comments": 1450, "shares": 3800}
        ]
    },

    # 3. Cauvery Riparian Rights & Delta Water
    {
        "id": "demo_yt_cauvery_protest",
        "platform": "youtube",
        "platform_post_id": "yt_cauvery_008",
        "canonical_url": "https://www.youtube.com/watch?v=demo_cauvery_protest",
        "author_name": "Polimer News",
        "author_handle": "@PolimerNews",
        "title": "காவிரி நீர் திறப்பு: மேகதாது அணை விவகாரத்தில் தமிழக விவசாயிகளின் தொடர் போராட்டம் | Cauvery Delta Agitation",
        "content": "கர்நாடக அரசு உடனடியாக உச்சநீதிமன்ற தீர்ப்பின்படி உரிய காவிரி நீரை திறக்க வேண்டும் என வலியுறுத்தி தஞ்சாவூர், திருவாரூர் மாவட்டங்களில் விவசாயிகள் மாபெரும் கண்டன ஆர்ப்பாட்டம்.",
        "language": "ta",
        "media_type": "video",
        "thumbnail_url": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=640&q=80",
        "hours_ago": 26,
        "views": 195000,
        "likes": 11200,
        "comments": 1420,
        "shares": 3400,
        "history": [
            {"hours_ago": 26, "views": 12000, "likes": 800, "comments": 90},
            {"hours_ago": 14, "views": 110000, "likes": 6400, "comments": 780},
            {"hours_ago": 2, "views": 195000, "likes": 11200, "comments": 1420}
        ]
    },
    {
        "id": "demo_x_cauvery_seeman",
        "platform": "x",
        "platform_post_id": "x_cauvery_009",
        "canonical_url": "https://x.com/NaanThamizhan/status/demo_x_009",
        "author_name": "Seeman Voice",
        "author_handle": "@NaanThamizhan",
        "title": None,
        "content": "காவிரி உரிமையை தாரைவார்த்து விட்டு டெல்டா விவசாயிகளை வஞ்சிப்பதை நாம் தமிழர் கட்சி ஒருபோதும் வேடிக்கை பார்க்காது. மேகதாது திட்டத்தை முற்றிலுமாக முறியடிப்போம்! #SaveCauveryFarmers #நாம்தமிழர்கட்சி #சீமான்",
        "language": "ta",
        "media_type": "text",
        "thumbnail_url": None,
        "hours_ago": 24,
        "views": 140000,
        "likes": 13900,
        "comments": 1280,
        "shares": 4100,
        "history": [
            {"hours_ago": 24, "likes": 1100, "comments": 95, "shares": 310},
            {"hours_ago": 12, "likes": 7600, "comments": 680, "shares": 2200},
            {"hours_ago": 2, "likes": 13900, "comments": 1280, "shares": 4100}
        ]
    },

    # 4. Chennai Rain & Infrastructure Preparedness
    {
        "id": "demo_reddit_chennai_rain",
        "platform": "reddit",
        "platform_post_id": "reddit_chennai_010",
        "canonical_url": "https://www.reddit.com/r/chennai/comments/demo_monsoon_prep/",
        "author_name": "u/VelacheryResident",
        "author_handle": "r/chennai",
        "title": "Ground Reality Check: How effective are the new Stormwater Drains in Velachery & OMR before northeast monsoon?",
        "content": "Drove past the Taramani-Perungudi stretch today. Corporation works have completed 85% of the canal links, but certain arterial cuts are still incomplete. Has anyone noticed waterlogging during yesterday's brief spell?",
        "language": "en",
        "media_type": "text",
        "thumbnail_url": None,
        "hours_ago": 12,
        "views": 38000,
        "likes": 640,
        "comments": 290,
        "shares": 85,
        "history": [
            {"hours_ago": 12, "likes": 50, "comments": 30},
            {"hours_ago": 5, "likes": 380, "comments": 180},
            {"hours_ago": 1, "likes": 640, "comments": 290}
        ]
    },
    {
        "id": "demo_yt_chennai_gcc",
        "platform": "youtube",
        "platform_post_id": "yt_chennai_011",
        "canonical_url": "https://www.youtube.com/watch?v=demo_chennai_gcc",
        "author_name": "Sun News",
        "author_handle": "@SunNewsTamil",
        "title": "சென்னை பெருநகர மாநகராட்சி பருவமழை முன்னெச்சரிக்கை: அமைச்சர் உதயநிதி ஸ்டாலின் தீவிர கள ஆய்வு",
        "content": "சென்னையில் மழைநீர் தேங்காமல் இருக்க 24 மணி நேரமும் செயல்படும் கட்டுப்பாட்டு அறை மற்றும் பம்பிங் மோட்டார்கள் தயார் நிலையில் வைக்கப்பட்டுள்ளதாக துணை முதல்வர் உதயநிதி ஸ்டாலின் உறுதி.",
        "language": "ta",
        "media_type": "video",
        "thumbnail_url": "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=640&q=80",
        "hours_ago": 10,
        "views": 142000,
        "likes": 9800,
        "comments": 1120,
        "shares": 2400,
        "history": [
            {"hours_ago": 10, "views": 10000, "likes": 700, "comments": 80},
            {"hours_ago": 4, "views": 85000, "likes": 5800, "comments": 650},
            {"hours_ago": 1, "views": 142000, "likes": 9800, "comments": 1120}
        ]
    },

    # 5. Power Tariff Revisions & MSME Economy
    {
        "id": "demo_x_power_bjp",
        "platform": "x",
        "platform_post_id": "x_power_012",
        "canonical_url": "https://x.com/annamalai_k/status/demo_x_012",
        "author_name": "K. Annamalai (Updates)",
        "author_handle": "@annamalai_k",
        "title": None,
        "content": "டான்ஜெட்கோவின் மின்கட்டண உயர்வால் கோவை, திருப்பூர் குறு மற்றும் சிறு தொழில் முனைவோர் கடுமையான நெருக்கடியை சந்தித்து வருகின்றனர். கூடுதல் கட்டண உயர்வை உடனடியாக தமிழக அரசு திரும்பப் பெற வேண்டும்! #PowerTariffHike #BJP4TN #MSME",
        "language": "ta",
        "media_type": "text",
        "thumbnail_url": None,
        "hours_ago": 28,
        "views": 165000,
        "likes": 15200,
        "comments": 1650,
        "shares": 4600,
        "history": [
            {"hours_ago": 28, "likes": 1200, "comments": 120, "shares": 380},
            {"hours_ago": 14, "likes": 8400, "comments": 890, "shares": 2600},
            {"hours_ago": 2, "likes": 15200, "comments": 1650, "shares": 4600}
        ]
    },

    # 6. Industrial Investment & Global EV Hub
    {
        "id": "demo_yt_sipcot_ev",
        "platform": "youtube",
        "platform_post_id": "yt_sipcot_013",
        "canonical_url": "https://www.youtube.com/watch?v=demo_sipcot_ev",
        "author_name": "Thanthi TV",
        "author_handle": "@ThanthiTV",
        "title": "ஓசூரில் புதிய மின்வாகன உற்பத்தி ஆலை: ரூ.5000 கோடி முதலீடு, 10,000 பேருக்கு வேலைவாய்ப்பு!",
        "content": "தமிழ்நாடு முதலீட்டு மையமாக உலக அரங்கில் மிளிர்கிறது. ஓசூர் மற்றும் ராணிப்பேட்டையில் புதிய உயர்தொழில்நுட்ப சிப்காட் வளாகங்கள் திறப்பு. தொழில் துறை அமைச்சர் டிஆர்பி ராஜா பேட்டி.",
        "language": "ta",
        "media_type": "video",
        "thumbnail_url": "https://images.unsplash.com/photo-1558441719-8b489c652756?w=640&q=80",
        "hours_ago": 30,
        "views": 210000,
        "likes": 13400,
        "comments": 980,
        "shares": 3100,
        "history": [
            {"hours_ago": 30, "views": 15000, "likes": 900, "comments": 60},
            {"hours_ago": 12, "views": 120000, "likes": 7800, "comments": 540},
            {"hours_ago": 2, "views": 210000, "likes": 13400, "comments": 980}
        ]
    }
]

def seed_demo_social_data(db_path: str = DB_PATH):
    """
    Deterministically populates rich, realistic demo social posts,
    engagement snapshot histories, and story clusters.
    Safe: Only deletes and recreates rows where collection_mode = 'DEMO'.
    """
    now = datetime.now(timezone.utc)

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Delete existing DEMO social posts and snapshots
        cursor.execute("SELECT id FROM social_posts WHERE collection_mode = 'DEMO'")
        demo_ids = [r["id"] for r in cursor.fetchall()]
        if demo_ids:
            placeholders = ",".join("?" for _ in demo_ids)
            cursor.execute(f"DELETE FROM engagement_snapshots WHERE post_id IN ({placeholders})", demo_ids)
            cursor.execute("DELETE FROM social_posts WHERE collection_mode = 'DEMO'")

        for p in DEMO_POSTS_RAW:
            pub_dt = now - timedelta(hours=p["hours_ago"])
            pub_iso = pub_dt.isoformat()

            # Matched entities
            matched = entity_matcher.match_entities(p["content"], p.get("title"))
            sentiment, sentiment_score = entity_matcher.detect_sentiment(f"{p.get('title') or ''} {p['content']}")

            # Insert social_post
            cursor.execute("""
                INSERT INTO social_posts (
                    id, platform, platform_post_id, canonical_url, author_name, author_handle,
                    title, content, language, media_type, thumbnail_url, published_at,
                    first_seen_at, last_seen_at, likes_count, comments_count, shares_count,
                    views_count, quotes_count, party_codes, leader_names, topics, hashtags,
                    sentiment, sentiment_score, trend_score, growth_rate_per_hour, collection_mode,
                    raw_metrics_available
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                p["id"],
                p["platform"],
                p["platform_post_id"],
                p["canonical_url"],
                p["author_name"],
                p["author_handle"],
                p.get("title"),
                p["content"],
                p["language"],
                p["media_type"],
                p.get("thumbnail_url"),
                pub_iso,
                pub_iso,
                now.isoformat(),
                p.get("likes"),
                p.get("comments"),
                p.get("shares"),
                p.get("views"),
                p.get("quotes"),
                json.dumps(matched["party_codes"]),
                json.dumps(matched["leader_names"]),
                json.dumps(matched["topics"]),
                json.dumps(matched["hashtags"]),
                sentiment,
                sentiment_score,
                0.0,
                0.0,
                "DEMO",
                json.dumps([k for k in ["views", "likes", "comments", "shares"] if p.get(k) is not None])
            ))

            # Insert time-series snapshots
            for snap in p.get("history", []):
                snap_time = now - timedelta(hours=snap["hours_ago"])
                cursor.execute("""
                    INSERT INTO engagement_snapshots (
                        post_id, observed_at, likes, comments, shares, views, growth_rate_per_hour
                    ) VALUES (?, ?, ?, ?, ?, ?, 0.0)
                """, (
                    p["id"],
                    snap_time.isoformat(),
                    snap.get("likes", 0),
                    snap.get("comments", 0),
                    snap.get("shares", 0),
                    snap.get("views", 0)
                ))

        conn.commit()

        # Recalculate trend scores for all demo posts
        cursor.execute("SELECT id, platform, published_at, views_count, likes_count, comments_count, shares_count, quotes_count FROM social_posts WHERE collection_mode = 'DEMO'")
        all_demo = cursor.fetchall()
        for r in all_demo:
            t_score, v_rate, _ = trend_engine.compute_post_trend_score(
                r["id"], r["published_at"], r["platform"],
                r["views_count"], r["likes_count"], r["comments_count"], r["shares_count"], r["quotes_count"]
            )
            cursor.execute("UPDATE social_posts SET trend_score = ?, growth_rate_per_hour = ? WHERE id = ?", (t_score, v_rate, r["id"]))
        conn.commit()

    # Run story clustering across seeded data
    story_clustering_service.run_clustering()
    print("Demo social intelligence data seeded successfully.")

if __name__ == "__main__":
    seed_demo_social_data()
