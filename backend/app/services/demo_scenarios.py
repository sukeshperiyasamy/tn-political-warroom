import json
import sqlite3
import time
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from backend.app.data.migrations import DB_PATH
from backend.app.services.trend_engine import trend_engine
from backend.app.services.deduplicator import story_clustering_service
from backend.app.services.entity_matcher import entity_matcher

SCENARIOS_DEFINITIONS = [
    {
        "id": "scenario_policy_announcement",
        "name": "Policy Announcement Propagation: Magalir Urimai Expansion",
        "scenario_type": "policy_announcement",
        "description": "Simulates a welfare scheme announcement that breaks on public news wires and propagates to X, Facebook, and YouTube.",
        "parties_involved": ["DMK", "AIADMK"],
        "leaders_involved": ["M.K. Stalin", "Udhayanidhi Stalin", "Edappadi K. Palaniswami"],
        "topic": "Kalaignar Magalir Urimai Thogai",
        "total_steps": 4,
        "steps_meta": [
            {"step": 1, "title": "Official News Release", "description": "CM announcement reported across verified Tamil news wires."},
            {"step": 2, "title": "Social Reactions Erupt", "description": "Ministerial posts on X and citizen queries on eligibility."},
            {"step": 3, "title": "Opposition Response", "description": "AIADMK releases statement questioning budgetary allocation."},
            {"step": 4, "title": "Cross-Platform Narrative Consolidation", "description": "Full cross-media cluster formed with engagement peak."}
        ]
    },
    {
        "id": "scenario_leader_speech",
        "name": "High-Velocity Leader Speech: TVK Vikravandi Rally",
        "scenario_type": "leader_speech",
        "description": "Simulates a political conference address that generates exponential video viewership on YouTube and Instagram.",
        "parties_involved": ["TVK", "DMK", "AIADMK"],
        "leaders_involved": ["Thalapathy Vijay"],
        "topic": "TVK Vijay Political Movement",
        "total_steps": 4,
        "steps_meta": [
            {"step": 1, "title": "Livestream Launch", "description": "YouTube livestream goes live with initial 25,000 viewers."},
            {"step": 2, "title": "Key Policy Declarations", "description": "Speech clips cut and broadcast on Instagram reels and X."},
            {"step": 3, "title": "Viral Video Acceleration", "description": "Engagement growth reaches +32,000 views/hr with emerging momentum."},
            {"step": 4, "title": "Electoral Debate Consensus", "description": "Reddit and YouTube long-form discussion analyzing 2026 impact."}
        ]
    },
    {
        "id": "scenario_political_controversy",
        "name": "Controversy Surge & Dissipation: Power Tariffs",
        "scenario_type": "political_controversy",
        "description": "Simulates an opposition agitation on electricity tariffs that spikes rapidly into ACCELERATING status, followed by clarification.",
        "parties_involved": ["AIADMK", "BJP", "DMK"],
        "leaders_involved": ["Edappadi K. Palaniswami", "K. Annamalai", "M.K. Stalin"],
        "topic": "Power Tariffs & TANGEDCO",
        "total_steps": 4,
        "steps_meta": [
            {"step": 1, "title": "Protest Call Announced", "description": "Opposition leaders EPS and Annamalai call for state-wide stir."},
            {"step": 2, "title": "Hashtag Surge on X", "description": "#PowerTariffHike trends at rank #1 with sharp volume acceleration."},
            {"step": 3, "title": "Government Fact-Check Matrix", "description": "Energy Ministry issues clarification showing 88% users unaffected."},
            {"step": 4, "title": "Deceleration Phase", "description": "Velocity drops from +45k/hr to +3k/hr; momentum shifts to DECELERATING."}
        ]
    },
    {
        "id": "scenario_cross_party_debate",
        "name": "Multi-Source Cross-Party Debate: Cauvery Water Rights",
        "scenario_type": "cross_party_debate",
        "description": "Simulates an inter-state water issue with consensus across four political parties, generating diverse discussion across 5 platforms.",
        "parties_involved": ["DMK", "AIADMK", "PMK", "NTK"],
        "leaders_involved": ["M.K. Stalin", "Edappadi K. Palaniswami", "Seeman", "Dr. Anbumani Ramadoss"],
        "topic": "Cauvery Riparian Rights & Agriculture",
        "total_steps": 4,
        "steps_meta": [
            {"step": 1, "title": "All-Party Meeting Resolution", "description": "Resolution passed unanimously demanding immediate CWMA action."},
            {"step": 2, "title": "Diverse Party Statements", "description": "DMK, AIADMK, PMK, and NTK issue independent supportive statements."},
            {"step": 3, "title": "Grassroots Farmer Forums", "description": "Delta farming associations convene live discussions on YouTube and Reddit."},
            {"step": 4, "title": "Maximum Platform Diversity", "description": "Coverage spans YouTube, X, Reddit, Facebook, and News wires."}
        ]
    }
]

class DemoScenarioEngine:
    """
    Deterministic Political-Media Scenario Engine.
    Simulates narrative progression, entity matching, engagement velocity, and clustering.
    All records are permanently labeled collection_mode='DEMO'.
    """
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def get_all_scenarios(self) -> List[Dict[str, Any]]:
        scenarios = []
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            for s in SCENARIOS_DEFINITIONS:
                cursor.execute("SELECT current_step, last_replayed_at FROM demo_scenario_state WHERE scenario_id = ?", (s["id"],))
                state = cursor.fetchone()
                item = dict(s)
                item["current_step"] = state["current_step"] if state else 1
                item["last_replayed_at"] = state["last_replayed_at"] if state else None
                scenarios.append(item)
        return scenarios

    def get_scenario_detail(self, scenario_id: str) -> Optional[Dict[str, Any]]:
        s_def = next((s for s in SCENARIOS_DEFINITIONS if s["id"] == scenario_id), None)
        if not s_def:
            return None
        res = dict(s_def)
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT current_step, last_replayed_at, state_payload FROM demo_scenario_state WHERE scenario_id = ?", (scenario_id,))
            state = cursor.fetchone()
            res["current_step"] = state["current_step"] if state else 1
            res["last_replayed_at"] = state["last_replayed_at"] if state else None
            res["state_payload"] = json.loads(state["state_payload"]) if (state and state["state_payload"]) else {}
        return res

    def replay_scenario(self, scenario_id: str, step: int = 1) -> Dict[str, Any]:
        """
        Deterministically replays the scenario up to the requested step (1 to 4).
        Creates DEMO posts, observation snapshots, and updates clustering.
        """
        s_def = next((s for s in SCENARIOS_DEFINITIONS if s["id"] == scenario_id), None)
        if not s_def:
            raise ValueError(f"Unknown scenario ID: {scenario_id}")

        step = max(1, min(4, step))
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        # Build posts for this scenario and step
        posts_to_create = self._generate_step_posts(scenario_id, step, now)

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Clear previous posts for this scenario prefix to ensure clean deterministic replay
            cursor.execute("DELETE FROM social_posts WHERE id LIKE ?", (f"demo_{scenario_id}%",))

            for p in posts_to_create:
                match = entity_matcher.match_entities(p["content"], p.get("title") or "")

                cursor.execute("""
                    INSERT OR REPLACE INTO social_posts (
                        id, platform, platform_post_id, canonical_url, author_name, author_handle,
                        title, content, language, media_type, thumbnail_url, published_at,
                        first_seen_at, last_seen_at, likes_count, comments_count, shares_count,
                        views_count, quotes_count, party_codes, leader_names, topics, hashtags,
                        sentiment, sentiment_score, trend_score, growth_rate_per_hour,
                        collection_mode, raw_metrics_available, acquisition_method, source_reliability,
                        data_provenance, matched_entities
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    p["id"], p["platform"], p["platform_post_id"], p["canonical_url"],
                    p["author_name"], p["author_handle"], p["title"], p["content"],
                    p.get("language", "ta"), p.get("media_type", "text"), p.get("thumbnail_url"),
                    p["published_at"], p["first_seen_at"], now_iso,
                    p.get("likes_count"), p.get("comments_count"), p.get("shares_count"),
                    p.get("views_count"), p.get("quotes_count"),
                    json.dumps(match["party_codes"]), json.dumps(match["leader_names"]),
                    json.dumps(match["topics"]), json.dumps(match["hashtags"]),
                    p.get("sentiment", "neutral"), p.get("sentiment_score", 0.0),
                    p.get("trend_score", 45.0), p.get("growth_rate_per_hour", 12.0),
                    "DEMO", json.dumps(["likes", "comments", "shares", "views"]),
                    "demo_simulation", 1.0,
                    json.dumps({"scenario_id": scenario_id, "step": step, "provenance": "simulated_2026_demo"}),
                    json.dumps(match.get("matched_entities", []))
                ))

                # Record snapshots
                cursor.execute("DELETE FROM engagement_snapshots WHERE post_id = ?", (p["id"],))
                history = p.get("history", [])
                if not history:
                    history = [{"offset_hrs": 2, "likes": p.get("likes_count"), "comments": p.get("comments_count"), "shares": p.get("shares_count"), "views": p.get("views_count")}]

                for h in history:
                    snap_time = (now - timedelta(hours=h.get("offset_hrs", 1))).isoformat()
                    cursor.execute("""
                        INSERT INTO engagement_snapshots (
                            post_id, observed_at, likes, comments, shares, views, growth_rate_per_hour, fetch_run_id
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        p["id"], snap_time, h.get("likes"), h.get("comments"),
                        h.get("shares"), h.get("views"), p.get("growth_rate_per_hour", 0.0),
                        f"demo_run_{scenario_id}_s{step}"
                    ))

            # Update scenario state
            cursor.execute("""
                INSERT OR REPLACE INTO demo_scenario_state (
                    id, scenario_id, scenario_name, current_step, total_steps, last_replayed_at, state_payload
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                f"state_{scenario_id}", scenario_id, s_def["name"],
                step, s_def["total_steps"], now_iso,
                json.dumps({"posts_count": len(posts_to_create), "step_title": s_def["steps_meta"][step-1]["title"]})
            ))
            conn.commit()

        # Re-cluster DEMO stories non-destructively
        story_clustering_service.run_clustering()

        return {
            "scenario_id": scenario_id,
            "scenario_name": s_def["name"],
            "current_step": step,
            "total_steps": s_def["total_steps"],
            "step_title": s_def["steps_meta"][step-1]["title"],
            "step_description": s_def["steps_meta"][step-1]["description"],
            "simulated_posts_created": len(posts_to_create),
            "replayed_at": now_iso,
            "status": "SUCCESS",
            "mode": "DEMO"
        }

    def reset_scenario(self, scenario_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Safely resets a single scenario or all scenarios back to Stage 1.
        Strictly targets collection_mode='DEMO' to ensure zero live record alteration.
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            if scenario_id:
                cursor.execute("DELETE FROM social_posts WHERE id LIKE ? AND collection_mode = 'DEMO'", (f"demo_{scenario_id}%",))
                cursor.execute("DELETE FROM engagement_snapshots WHERE post_id LIKE ?", (f"demo_{scenario_id}%",))
                cursor.execute("""
                    UPDATE demo_scenario_state SET current_step = 1, last_replayed_at = NULL, state_payload = '{}'
                    WHERE scenario_id = ?
                """, (scenario_id,))
            else:
                cursor.execute("DELETE FROM social_posts WHERE id LIKE 'demo_scenario_%' AND collection_mode = 'DEMO'")
                cursor.execute("DELETE FROM engagement_snapshots WHERE post_id LIKE 'demo_scenario_%'")
                cursor.execute("""
                    UPDATE demo_scenario_state SET current_step = 1, last_replayed_at = NULL, state_payload = '{}'
                """)
            conn.commit()

        # Re-cluster DEMO stories non-destructively
        story_clustering_service.run_clustering()
        return {
            "status": "RESET_SUCCESS",
            "scenario_id": scenario_id or "all",
            "message": f"Successfully reset {scenario_id or 'all scenarios'} to baseline stage 1. Zero live records affected."
        }

    def generate_scenario_brief(self, scenario_id: str) -> Dict[str, Any]:
        """
        Synthesizes a structured, printable intelligence brief for the active demo scenario.
        Includes topics, party coverage, key developments, narrative timelines, and mandatory electorate disclaimer.
        """
        s_def = next((s for s in SCENARIOS_DEFINITIONS if s["id"] == scenario_id), None)
        if not s_def:
            raise ValueError(f"Unknown scenario ID: {scenario_id}")

        now_iso = datetime.now(timezone.utc).isoformat()
        detail = self.get_scenario_detail(scenario_id)
        current_step = detail.get("current_step", 1) if detail else 1

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM social_posts
                WHERE id LIKE ? AND collection_mode = 'DEMO'
                ORDER BY published_at DESC
            """, (f"demo_{scenario_id}%",))
            posts = [dict(r) for r in cursor.fetchall()]

            cursor.execute("""
                SELECT * FROM story_clusters
                WHERE collection_mode = 'DEMO' AND (title_en LIKE ? OR title_ta LIKE ? OR topic LIKE ?)
                ORDER BY latest_observed_at DESC LIMIT 1
            """, (f"%{s_def['topic']}%", f"%{s_def['topic']}%", f"%{s_def['topic']}%"))
            cluster_row = cursor.fetchone()
            cluster = dict(cluster_row) if cluster_row else None

        parties = set()
        leaders = set()
        total_views = 0
        total_likes = 0
        total_comments = 0
        total_shares = 0

        developments = []
        for p in posts:
            p_codes = json.loads(p.get("party_codes") or "[]")
            l_names = json.loads(p.get("leader_names") or "[]")
            for pc in p_codes: parties.add(pc)
            for ln in l_names: leaders.add(ln)
            total_views += p.get("views_count") or 0
            total_likes += p.get("likes_count") or 0
            total_comments += p.get("comments_count") or 0
            total_shares += p.get("shares_count") or 0

            developments.append({
                "platform": p["platform"],
                "author": p["author_name"],
                "title": p.get("title") or (p["content"][:100] + "..."),
                "content": p["content"],
                "published_at": p["published_at"],
                "url": p["canonical_url"],
                "likes": p.get("likes_count", 0),
                "comments": p.get("comments_count", 0),
                "shares": p.get("shares_count", 0)
            })

        active_meta = s_def["steps_meta"][current_step - 1]

        return {
            "scenario_id": scenario_id,
            "scenario_name": s_def["name"],
            "scenario_type": s_def["scenario_type"],
            "current_stage": current_step,
            "total_stages": s_def["total_steps"],
            "stage_title": active_meta["title"],
            "stage_description": active_meta["description"],
            "topic": s_def["topic"],
            "parties_involved": list(parties) if parties else s_def["parties_involved"],
            "leaders_involved": list(leaders) if leaders else s_def["leaders_involved"],
            "provenance": "DEMO_SIMULATION",
            "is_demo": True,
            "generated_at": now_iso,
            "reporting_period": f"Simulated 2026 Narrative Progression (Stage {current_step} of {s_def['total_steps']})",
            "data_freshness": {
                "posts_count": len(posts),
                "simulated_views": total_views,
                "simulated_likes": total_likes,
                "simulated_comments": total_comments,
                "simulated_shares": total_shares
            },
            "executive_summary_en": f"During Stage {current_step} ({active_meta['title']}) of the {s_def['name']} scenario, political conversation reached {len(posts)} public media records with {total_views:,} simulated views and {total_comments:,} public reactions. The narrative revolves around {s_def['topic']}, involving key stances from {', '.join(s_def['parties_involved'])}.",
            "executive_summary_ta": f"{s_def['name']} காட்சி மாதிரியின் படிநிலை {current_step}-ல் ({active_meta['title']}), பொது ஊடகங்களில் {len(posts)} பதிவுகள் பதிவாகியுள்ளன. {s_def['topic']} தொடர்பான விவாதங்களில் {', '.join(s_def['parties_involved'])} கட்சிகள் தீவிரமாக களமாடி வருகின்றன.",
            "key_developments": developments,
            "narrative_cluster": cluster,
            "disclaimer": "This intelligence brief is generated from a simulated political demonstration scenario. Engagement metrics, comment counts, and propagation curves are synthetic demonstration data and do NOT represent the voting intentions, electoral preferences, or political sentiment of the Tamil Nadu electorate."
        }

    def _generate_step_posts(self, scenario_id: str, step: int, now: datetime) -> List[Dict[str, Any]]:
        """
        Generates deterministic simulated post structures corresponding to the scenario and current step.
        """
        posts = []
        base_time = now - timedelta(hours=8)

        if scenario_id == "scenario_policy_announcement":
            # Step 1: News Wire
            posts.append({
                "id": f"demo_{scenario_id}_news",
                "platform": "news",
                "platform_post_id": "news_magalir_announcement",
                "canonical_url": "https://www.dailythanthi.com/news/demo/magalir-expansion",
                "author_name": "Daily Thanthi Wire",
                "author_handle": "dailythanthi",
                "title": "மகளிர் உரிமைத் தொகை: கூடுதலாக 15 லட்சம் பேருக்கு ரூ.1000 திட்டம் விரிவாக்கம்! முதல்வர் மு.க.ஸ்டாலின் அறிவிப்பு",
                "content": "கலைஞர் மகளிர் உரிமைத் திட்டத்தின் கீழ் தகுதியுள்ள கூடுதல் குடும்பத்தலைவிகளுக்கு மாதம் ரூ.1000 வழங்கும் விரிவுபடுத்தப்பட்ட முகாமை முதல்வர் மு.க.ஸ்டாலின் தொடங்கி வைத்தார். நிதி ஒதுக்கீடு மற்றும் கள ஆய்வு விவரங்கள்.",
                "published_at": (base_time - timedelta(hours=4)).isoformat(),
                "first_seen_at": (base_time - timedelta(hours=4)).isoformat(),
                "likes_count": 820,
                "comments_count": 140,
                "shares_count": 310,
                "views_count": 18500,
                "trend_score": 58.0,
                "growth_rate_per_hour": 15.0,
                "history": [
                    {"offset_hrs": 4, "likes": 200, "comments": 30, "shares": 50, "views": 4000},
                    {"offset_hrs": 1, "likes": 820, "comments": 140, "shares": 310, "views": 18500}
                ]
            })

            if step >= 2:
                # Step 2: X reactions
                posts.append({
                    "id": f"demo_{scenario_id}_x",
                    "platform": "x",
                    "platform_post_id": "x_magalir_minister",
                    "canonical_url": "https://x.com/dmk_official/status/demo_magalir",
                    "author_name": "Udhayanidhi Stalin",
                    "author_handle": "@Udhaystalin",
                    "title": None,
                    "content": "திராவிட மாடல் அரசின் சமூக நீதித் திட்டம்! கலைஞர் மகளிர் உரிமைத் தொகை மூலம் தமிழ்நாட்டு தாய்மார்களின் பொருளாதார விடுதலை உறுதி செய்யப்பட்டுள்ளது. #MagalirUrimaiThogai #MKStalin #DravidianModel",
                    "published_at": (base_time - timedelta(hours=2)).isoformat(),
                    "first_seen_at": (base_time - timedelta(hours=2)).isoformat(),
                    "likes_count": 14500,
                    "comments_count": 1200,
                    "shares_count": 4800,
                    "views_count": 140000,
                    "trend_score": 78.5,
                    "growth_rate_per_hour": 120.0,
                    "history": [
                        {"offset_hrs": 2, "likes": 3000, "comments": 250, "shares": 900, "views": 25000},
                        {"offset_hrs": 0.5, "likes": 14500, "comments": 1200, "shares": 4800, "views": 140000}
                    ]
                })

            if step >= 3:
                # Step 3: Opposition Response
                posts.append({
                    "id": f"demo_{scenario_id}_fb",
                    "platform": "facebook",
                    "platform_post_id": "fb_magalir_aiadmk",
                    "canonical_url": "https://facebook.com/AIADMKOfficial/posts/demo_magalir",
                    "author_name": "AIADMK Press Wing",
                    "author_handle": "@AIADMKOfficial",
                    "title": None,
                    "content": "விடுபட்ட லட்சக்கணக்கான தகுதியான மகளிருக்கு தேர்தல் நெருங்கும் போது மட்டும் டோக்கன் வழங்கும் திமுக அரசின் கண்துடைப்பு நாடகம் — எடப்பாடி கே. பழனிசாமி கடும் கண்டனம். #AIADMK #EPS",
                    "published_at": (base_time - timedelta(hours=1)).isoformat(),
                    "first_seen_at": (base_time - timedelta(hours=1)).isoformat(),
                    "likes_count": 6200,
                    "comments_count": 890,
                    "shares_count": 1450,
                    "views_count": 62000,
                    "trend_score": 64.0,
                    "growth_rate_per_hour": 60.0
                })

            if step >= 4:
                # Step 4: YouTube deep dive
                posts.append({
                    "id": f"demo_{scenario_id}_yt",
                    "platform": "youtube",
                    "platform_post_id": "yt_magalir_analysis",
                    "canonical_url": "https://youtube.com/watch?v=demo_magalir_analysis",
                    "author_name": "Puthiya Thalaimurai",
                    "author_handle": "@PTTVOnlineNews",
                    "title": "மகளிர் உரிமைத் தொகை விரிவாக்கம்: யாருக்கு கிடைக்கும்? விடுபட்டவர்கள் விண்ணப்பிப்பது எப்படி? கள நிலவரம்",
                    "content": "தமிழ்நாட்டில் மகளிர் உரிமைத் தொகை திட்டம் 15 லட்சம் புதிய குடும்பத்தலைவிகளுக்கு விரிவுபடுத்தப்படுவதன் முழு விவரங்கள் மற்றும் கள ஆய்வு.",
                    "published_at": (now - timedelta(minutes=45)).isoformat(),
                    "first_seen_at": (now - timedelta(minutes=45)).isoformat(),
                    "likes_count": 9400,
                    "comments_count": 1150,
                    "shares_count": 2100,
                    "views_count": 98000,
                    "trend_score": 82.0,
                    "growth_rate_per_hour": 240.0
                })

        elif scenario_id == "scenario_leader_speech":
            posts.append({
                "id": f"demo_{scenario_id}_yt_live",
                "platform": "youtube",
                "platform_post_id": "yt_tvk_speech_live",
                "canonical_url": "https://youtube.com/watch?v=demo_tvk_live",
                "author_name": "Thanthi TV Live",
                "author_handle": "@ThanthiTV",
                "title": "தவெக மாநாடு: விக்கிரவாண்டியில் தளபதி விஜய் அரசியல் உரை Live | TVK Vijay Speech",
                "content": "தமிழக வெற்றிக் கழகத்தின் விக்கிரவாண்டி மாநில மாநாட்டில் விஜய் தனது முதலாவது விரிவான அரசியல் உரையை நிகழ்த்தினார். 2026 சட்டமன்ற தேர்தல் கூட்டணி, சமூக நீதி கொள்கைகள் குறித்த அறிவிப்பு.",
                "published_at": (base_time - timedelta(hours=3)).isoformat(),
                "first_seen_at": (base_time - timedelta(hours=3)).isoformat(),
                "views_count": 520000 if step >= 3 else 180000,
                "likes_count": 42000 if step >= 3 else 14000,
                "comments_count": 6800 if step >= 3 else 2100,
                "shares_count": 18200 if step >= 3 else 5200,
                "trend_score": 91.5 if step >= 3 else 68.0,
                "growth_rate_per_hour": 850.0 if step >= 3 else 210.0,
                "history": [
                    {"offset_hrs": 3, "views": 25000, "likes": 2500, "comments": 400, "shares": 800},
                    {"offset_hrs": 1.5, "views": 180000, "likes": 14000, "comments": 2100, "shares": 5200},
                    {"offset_hrs": 0.2, "views": 520000, "likes": 42000, "comments": 6800, "shares": 18200}
                ]
            })

            if step >= 2:
                posts.append({
                    "id": f"demo_{scenario_id}_ig_clip",
                    "platform": "instagram",
                    "platform_post_id": "ig_tvk_highlights",
                    "canonical_url": "https://instagram.com/p/demo_tvk_clip",
                    "author_name": "Tamizhaga Vettri Kazhagam Official",
                    "author_handle": "@tvk_official",
                    "title": None,
                    "content": "பிளவுவாத சக்திகளுக்கும் ஊழல் குடும்ப ஆட்சிக்கும் எதிராக சமரசமற்ற அறப்போர்! #TVKVijay #விக்கிரவாண்டி #தளபதிவிஜய்",
                    "published_at": (base_time - timedelta(hours=2)).isoformat(),
                    "first_seen_at": (base_time - timedelta(hours=2)).isoformat(),
                    "views_count": 310000,
                    "likes_count": 58000,
                    "comments_count": 4900,
                    "shares_count": 14500,
                    "trend_score": 88.0,
                    "growth_rate_per_hour": 540.0
                })

            if step >= 3:
                posts.append({
                    "id": f"demo_{scenario_id}_x_trend",
                    "platform": "x",
                    "platform_post_id": "x_tvk_speech_quotes",
                    "canonical_url": "https://x.com/TVKFlag/status/demo_speech",
                    "author_name": "TVK Updates",
                    "author_handle": "@TVKFlag",
                    "title": None,
                    "content": "பெரியாரும் காமராஜரும் எங்கள் இரு கண்கள்! 2026ல் தனிப்பெரும் சக்தியாக தமிழ்நாடு சட்டமன்றத்தில் அடி எடுத்து வைப்போம். #TVKVijay #VikravandiMaanadu #TVK2026",
                    "published_at": (base_time - timedelta(hours=1)).isoformat(),
                    "first_seen_at": (base_time - timedelta(hours=1)).isoformat(),
                    "views_count": 220000,
                    "likes_count": 27400,
                    "comments_count": 3100,
                    "shares_count": 11800,
                    "trend_score": 84.0,
                    "growth_rate_per_hour": 400.0
                })

            if step >= 4:
                posts.append({
                    "id": f"demo_{scenario_id}_reddit_poll",
                    "platform": "reddit",
                    "platform_post_id": "reddit_tvk_debate",
                    "canonical_url": "https://reddit.com/r/tamilnadu/comments/demo_tvk_impact",
                    "author_name": "u/TamilNaduWatcher",
                    "author_handle": "r/tamilnadu",
                    "title": "Post-Vikravandi Conference: Can TVK breach the 15% vote share mark in North Tamil Nadu?",
                    "content": "With strong ideological clarity combining social justice with regional federalism, how will TVK's field structure fare against the deep cadre networks of DMK and AIADMK in the 2026 assembly election?",
                    "published_at": (now - timedelta(minutes=30)).isoformat(),
                    "first_seen_at": (now - timedelta(minutes=30)).isoformat(),
                    "views_count": 38000,
                    "likes_count": 1120,
                    "comments_count": 640,
                    "shares_count": 230,
                    "trend_score": 72.0,
                    "growth_rate_per_hour": 75.0
                })

        elif scenario_id == "scenario_political_controversy":
            posts.append({
                "id": f"demo_{scenario_id}_protest",
                "platform": "x",
                "platform_post_id": "x_tangedco_protest",
                "canonical_url": "https://x.com/AIADMK/status/demo_power",
                "author_name": "Edappadi K. Palaniswami",
                "author_handle": "@EPSTamilNadu",
                "title": None,
                "content": "மின்கட்டண உயர்வை உடனடியாக திரும்பப் பெற வேண்டும்! சிறு குறு தொழில்களை நசுக்கும் திமுக அரசின் முடிவை கண்டித்து மாநிலம் தழுவிய கண்டன ஆர்ப்பாட்டம் நடைபெறும். #ElectricityTariff #AIADMK #TANGEDCO",
                "published_at": (base_time - timedelta(hours=5)).isoformat(),
                "first_seen_at": (base_time - timedelta(hours=5)).isoformat(),
                "views_count": 190000,
                "likes_count": 16400,
                "comments_count": 2400,
                "shares_count": 6800,
                "trend_score": 82.0 if step <= 2 else 55.0,
                "growth_rate_per_hour": 450.0 if step <= 2 else 25.0,
                "history": [
                    {"offset_hrs": 5, "views": 10000, "likes": 1200, "comments": 150, "shares": 400},
                    {"offset_hrs": 3, "views": 120000, "likes": 11500, "comments": 1600, "shares": 4500},
                    {"offset_hrs": 1, "views": 190000, "likes": 16400, "comments": 2400, "shares": 6800}
                ]
            })

            if step >= 2:
                posts.append({
                    "id": f"demo_{scenario_id}_bjp_statement",
                    "platform": "youtube",
                    "platform_post_id": "yt_annamalai_power",
                    "canonical_url": "https://youtube.com/watch?v=demo_annamalai_power",
                    "author_name": "K. Annamalai Official",
                    "author_handle": "@Annamalai_K",
                    "title": "டான்ஜெட்கோ ஊழல் மற்றும் மின்கட்டண உயர்வு: தமிழக அரசுக்கு எதிராக பாஜக கேள்வி | Press Meet",
                    "content": "மின் கட்டண உயர்வு காரணமாக நெசவாளர்கள், குறுந்தொழில் முனைவோர் வாழ்வாதாரம் பாதிக்கப்பட்டுள்ளது குறித்து பாஜக தலைவர் அண்ணாமலை செய்தியாளர் சந்திப்பு.",
                    "published_at": (base_time - timedelta(hours=3)).isoformat(),
                    "first_seen_at": (base_time - timedelta(hours=3)).isoformat(),
                    "views_count": 165000,
                    "likes_count": 18200,
                    "comments_count": 3100,
                    "shares_count": 4900,
                    "trend_score": 79.0 if step <= 2 else 52.0,
                    "growth_rate_per_hour": 320.0 if step <= 2 else 18.0
                })

            if step >= 3:
                # Government clarification
                posts.append({
                    "id": f"demo_{scenario_id}_govt_response",
                    "platform": "news",
                    "platform_post_id": "news_tangedco_factcheck",
                    "canonical_url": "https://hindutamil.in/news/demo/tangedco-clarification",
                    "author_name": "The Hindu Tamil Thisai",
                    "author_handle": "hindutamil",
                    "title": "வீட்டு உபயோக மின்சார கட்டணத்தில் எந்த மாற்றமும் இல்லை: அமைச்சர் விளக்கம்",
                    "content": "தமிழ்நாட்டில் 100 யூனிட் இலவச மின்சாரம் மற்றும் குடிசை இணைப்புகளுக்கு எவ்வித கட்டண உயர்வும் இல்லை. வணிக இணைப்புகளுக்கான மாற்றங்கள் மட்டுமே என மின்துறை அமைச்சர் விளக்கம் அளித்துள்ளார்.",
                    "published_at": (base_time - timedelta(hours=1)).isoformat(),
                    "first_seen_at": (base_time - timedelta(hours=1)).isoformat(),
                    "views_count": 72000,
                    "likes_count": 3400,
                    "comments_count": 480,
                    "shares_count": 1150,
                    "trend_score": 48.0,
                    "growth_rate_per_hour": 15.0
                })

        elif scenario_id == "scenario_cross_party_debate":
            # Cauvery Delta debate
            posts.append({
                "id": f"demo_{scenario_id}_cm_delegation",
                "platform": "news",
                "platform_post_id": "news_cauvery_all_party",
                "canonical_url": "https://dinamalar.com/news/demo/cauvery-all-party",
                "author_name": "Dinamalar News",
                "author_handle": "dinamalar",
                "title": "காவிரி நீர் விவகாரம்: அனைத்துக் கட்சி பிரதிநிதிகள் குழு தில்லி விரைகிறது — முதல்வர் மு.க.ஸ்டாலின்",
                "content": "காவிரி மேலாண்மை ஆணையத்தின் உத்தரவுப்படி கர்நாடகா உரிய நீரை திறக்கக் கோரி பிரதமர் மற்றும் மத்திய நீர்வளத்துறை அமைச்சரை சந்திக்க அனைத்துக் கட்சி தூதுக்குழு அமைக்கப்பட்டுள்ளது.",
                "published_at": (base_time - timedelta(hours=6)).isoformat(),
                "first_seen_at": (base_time - timedelta(hours=6)).isoformat(),
                "views_count": 88000,
                "likes_count": 4200,
                "comments_count": 520,
                "shares_count": 1400,
                "trend_score": 67.0,
                "growth_rate_per_hour": 40.0
            })

            if step >= 2:
                posts.append({
                    "id": f"demo_{scenario_id}_seeman_statement",
                    "platform": "youtube",
                    "platform_post_id": "yt_seeman_cauvery",
                    "canonical_url": "https://youtube.com/watch?v=demo_seeman_cauvery",
                    "author_name": "Naam Tamilar Seeman",
                    "author_handle": "@SeemanOfficial",
                    "title": "காவிரியில் தமிழகத்தின் உரிமையை ஒருபோதும் விட்டுக் கொடுக்க முடியாது — சீமான் ஆவேசம் | NTK News",
                    "content": "மேகதாதுவில் அணை கட்ட முனையும் கர்நாடக அரசின் நடவடிக்கைக்கு மத்திய அரசு துணை போகக் கூடாது என நாம் தமிழர் கட்சி தலைமை ஒருங்கிணைப்பாளர் சீமான் அறிக்கை.",
                    "published_at": (base_time - timedelta(hours=4)).isoformat(),
                    "first_seen_at": (base_time - timedelta(hours=4)).isoformat(),
                    "views_count": 125000,
                    "likes_count": 15400,
                    "comments_count": 1950,
                    "shares_count": 3800,
                    "trend_score": 76.0,
                    "growth_rate_per_hour": 180.0
                })

            if step >= 3:
                posts.append({
                    "id": f"demo_{scenario_id}_pmk_statement",
                    "platform": "x",
                    "platform_post_id": "x_anbumani_cauvery",
                    "canonical_url": "https://x.com/draramadoss/status/demo_cauvery",
                    "author_name": "Dr. Anbumani Ramadoss",
                    "author_handle": "@draramadoss",
                    "title": None,
                    "content": "டெல்டா குறுவை பயிர்களை காப்பாற்ற காவிரியில் உடனடியாக 15 டிஎம்சி நீர் திறக்கப்பட வேண்டும். விவசாயிகளின் வாழ்வாதாரத்தை காக்க மத்திய அரசு தலையிட வேண்டும். #CauveryWaterIssue #SaveCauveryFarmers #PMK",
                    "published_at": (base_time - timedelta(hours=2)).isoformat(),
                    "first_seen_at": (base_time - timedelta(hours=2)).isoformat(),
                    "views_count": 42000,
                    "likes_count": 5100,
                    "comments_count": 390,
                    "shares_count": 1250,
                    "trend_score": 69.0,
                    "growth_rate_per_hour": 90.0
                })

            if step >= 4:
                posts.append({
                    "id": f"demo_{scenario_id}_reddit_analysis",
                    "platform": "reddit",
                    "platform_post_id": "reddit_cauvery_consensus",
                    "canonical_url": "https://reddit.com/r/tamilnadu/comments/demo_cauvery_consensus",
                    "author_name": "u/DeltaFarmerVoice",
                    "author_handle": "r/tamilnadu",
                    "title": "Rare Political Consensus: Why DMK, AIADMK, PMK, and NTK always unite on Cauvery riparian rights",
                    "content": "Despite intense domestic political rivalry ahead of the 2026 election, the delta agrarian vote bank represents an existential political imperative for every regional party.",
                    "published_at": (now - timedelta(minutes=20)).isoformat(),
                    "first_seen_at": (now - timedelta(minutes=20)).isoformat(),
                    "views_count": 28000,
                    "likes_count": 890,
                    "comments_count": 410,
                    "shares_count": 160,
                    "trend_score": 62.0,
                    "growth_rate_per_hour": 45.0
                })

        return posts

demo_scenario_engine = DemoScenarioEngine()
