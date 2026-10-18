import json
import sqlite3
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.app.data.db import DB_PATH
from backend.app.services.trend_engine import trend_engine
from backend.app.services.source_health import source_health_service
from backend.app.services.deduplicator import story_clustering_service
from backend.app.services.demo_data import seed_demo_social_data
from backend.app.services.social_scheduler import social_scheduler
from backend.app.services.demo_scenarios import demo_scenario_engine
from backend.app.connectors import get_all_connectors, get_connector

router = APIRouter(prefix="/api/social", tags=["Social Intelligence"])

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@router.get("/posts")
def get_social_posts(
    platform: Optional[str] = None,
    topic: Optional[str] = None,
    party: Optional[str] = None,
    leader: Optional[str] = None,
    mode: str = Query("live", pattern="^(live|demo|all)$"),
    sort: str = Query("trending", pattern="^(trending|engagement|recent|most_discussed|most_liked|most_shared|fastest_growing|most_cross_platform)$"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    ranking_type = "most_discussed" if sort == "engagement" else sort
    return trend_engine.get_popular_posts(
        platform=platform,
        topic=topic,
        party=party,
        leader=leader,
        mode=mode,
        ranking_type=ranking_type,
        limit=limit,
        offset=offset
    )

@router.get("/posts/{post_id}")
def get_social_post_detail(post_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM social_posts WHERE id = ?", (post_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Social post not found")

        post = dict(row)
        post["party_codes"] = json.loads(post.get("party_codes") or "[]")
        post["leader_names"] = json.loads(post.get("leader_names") or "[]")
        post["topics"] = json.loads(post.get("topics") or "[]")
        post["hashtags"] = json.loads(post.get("hashtags") or "[]")
        post["raw_metrics_available"] = json.loads(post.get("raw_metrics_available") or "[]")

        # Fetch snapshots
        cursor.execute("""
            SELECT observed_at, likes, comments, shares, views, growth_rate_per_hour, fetch_run_id
            FROM engagement_snapshots
            WHERE post_id = ?
            ORDER BY observed_at ASC
        """, (post_id,))
        snapshots = [dict(s) for s in cursor.fetchall()]
        post["engagement_history"] = snapshots

        # Fetch cluster if present
        if post.get("story_cluster_id"):
            cursor.execute("SELECT * FROM story_clusters WHERE id = ?", (post["story_cluster_id"],))
            c_row = cursor.fetchone()
            if c_row:
                cluster_dict = dict(c_row)
                cluster_dict["platforms_involved"] = json.loads(cluster_dict.get("platforms_involved") or "[]")
                cluster_dict["post_ids"] = json.loads(cluster_dict.get("post_ids") or "[]")
                cluster_dict["news_article_ids"] = json.loads(cluster_dict.get("news_article_ids") or "[]")
                post["cluster"] = cluster_dict

        return post

@router.get("/trending")
def get_trending_pulse(
    time_window: str = Query("24h", pattern="^(1h|24h|7d|30d)$"),
    mode: str = Query("live", pattern="^(live|demo|all)$"),
    limit: int = Query(10, ge=1, le=30)
):
    ranked_topics = trend_engine.get_trending_topics(time_window=time_window, mode=mode, limit=limit)
    return {
        "time_window": time_window,
        "mode": mode,
        "methodology": {
            "formula": "trend_score = 0.40 * engagement_growth + 0.30 * post_volume_growth + 0.20 * cross_source_presence + 0.10 * recency",
            "weights": {
                "engagement_growth": 0.40,
                "post_volume_growth": 0.30,
                "cross_source_presence": 0.20,
                "recency": 0.10
            },
            "description": "Transparent cross-platform algorithmic ranking calculating comparative window momentum, post volume growth, cross-source diversity, and time-decay recency."
        },
        "trending_topics": ranked_topics
    }

@router.get("/platform-comparison")
def get_platform_comparison(
    time_window: str = Query("24h", pattern="^(1h|24h|7d|30d)$"),
    mode: str = Query("live", pattern="^(live|demo|all)$")
):
    return trend_engine.get_platform_comparison(time_window=time_window, mode=mode)

@router.get("/story-clusters")
def get_story_clusters(
    mode: str = Query("live", pattern="^(live|demo|all)$"),
    limit: int = Query(10, ge=1, le=30)
):
    clusters = story_clustering_service.get_clusters(mode=mode, limit=limit)
    return {
        "count": len(clusters),
        "mode": mode,
        "clusters": clusters
    }

@router.get("/hashtags")
def get_top_hashtags(
    mode: str = Query("live", pattern="^(live|demo|all)$"),
    limit: int = Query(15, ge=1, le=50)
):
    with get_db() as conn:
        cursor = conn.cursor()
        mode_sql = ""
        params: List[Any] = []
        if mode == "live":
            mode_sql = " AND collection_mode = 'LIVE'"
        elif mode == "demo":
            mode_sql = " AND collection_mode = 'DEMO'"

        cursor.execute(f"SELECT hashtags, platform, party_codes FROM social_posts WHERE hashtags != '[]' {mode_sql}", params)
        rows = cursor.fetchall()

    hashtag_counts: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        tags = json.loads(r["hashtags"] or "[]")
        plat = r["platform"]
        parties = json.loads(r["party_codes"] or "[]")
        for tag in tags:
            if tag not in hashtag_counts:
                hashtag_counts[tag] = {
                    "tag": tag,
                    "count": 0,
                    "platforms": set(),
                    "parties": set()
                }
            hashtag_counts[tag]["count"] += 1
            hashtag_counts[tag]["platforms"].add(plat)
            for p in parties:
                hashtag_counts[tag]["parties"].add(p)

    sorted_tags = sorted(hashtag_counts.values(), key=lambda x: x["count"], reverse=True)[:limit]
    for st in sorted_tags:
        st["platforms"] = sorted(list(st["platforms"]))
        st["parties"] = sorted(list(st["parties"]))

    return {"hashtags": sorted_tags, "mode": mode}

@router.get("/connectors")
def get_connectors():
    return source_health_service.get_all_connectors_summary()

@router.post("/connectors/{platform}/test")
def test_connector(platform: str):
    res = source_health_service.check_connector(platform)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.post("/ingestion/run")
def trigger_social_ingestion():
    """
    Executes an ingestion pass for all active, configured connectors.
    Inserts or updates posts in social_posts (collection_mode='LIVE').
    Records timestamped observation snapshots in engagement_snapshots.
    Computes post trend_score and growth_rate_per_hour dynamically.
    Safely isolates errors per connector.
    """
    connectors = get_all_connectors()
    results = []
    total_added = 0
    total_updated = 0
    total_snapshots_recorded = 0

    with get_db() as conn:
        cursor = conn.cursor()

        for plat_name, conn_inst in connectors.items():
            is_cfg, _ = conn_inst.validate_configuration()
            if not is_cfg:
                continue

            fetch_run_id = f"run_{plat_name}_{int(time.time())}"
            new_in_platform = 0
            updated_in_platform = 0
            snapshots_in_platform = 0

            try:
                # Search for top political query
                posts = conn_inst.search(query="Tamil Nadu", limit=15)
                now_iso = datetime.now(timezone.utc).isoformat()

                for post in posts:
                    # Enforce LIVE collection provenance for connector searches
                    post.collection_mode = "LIVE"

                    # Check duplicate by (platform, platform_post_id)
                    cursor.execute(
                        "SELECT id, published_at FROM social_posts WHERE platform = ? AND platform_post_id = ?",
                        (post.platform, post.platform_post_id)
                    )
                    exists = cursor.fetchone()

                    if exists:
                        existing_id = exists["id"]
                        existing_pub = exists["published_at"]

                        # Check latest snapshot for this post
                        cursor.execute("""
                            SELECT observed_at, likes, comments, shares, views
                            FROM engagement_snapshots
                            WHERE post_id = ?
                            ORDER BY observed_at DESC LIMIT 1
                        """, (existing_id,))
                        latest_snap = cursor.fetchone()

                        snap_growth_rate = 0.0
                        should_record_snapshot = False

                        if latest_snap is None:
                            should_record_snapshot = True
                        else:
                            try:
                                last_obs = datetime.fromisoformat(latest_snap["observed_at"].replace("Z", "+00:00"))
                                delta_mins = (datetime.now(timezone.utc) - last_obs).total_seconds() / 60.0
                            except Exception:
                                delta_mins = 10.0

                            counts_changed = (
                                (post.likes_count or 0) != (latest_snap["likes"] or 0) or
                                (post.comments_count or 0) != (latest_snap["comments"] or 0) or
                                (post.shares_count or 0) != (latest_snap["shares"] or 0) or
                                (post.views_count or 0) != (latest_snap["views"] or 0)
                            )

                            if delta_mins >= 2.0 or counts_changed:
                                should_record_snapshot = True
                                delta_h = max(0.02, delta_mins / 60.0)
                                e_prev = trend_engine.calculate_standardized_engagement(
                                    post.platform, latest_snap["views"], latest_snap["likes"],
                                    latest_snap["comments"], latest_snap["shares"]
                                )
                                e_curr = trend_engine.calculate_standardized_engagement(
                                    post.platform, post.views_count, post.likes_count,
                                    post.comments_count, post.shares_count
                                )
                                snap_growth_rate = max(0.0, (e_curr - e_prev) / delta_h)

                        if should_record_snapshot:
                            cursor.execute("""
                                INSERT INTO engagement_snapshots (
                                    post_id, observed_at, likes, comments, shares, views,
                                    growth_rate_per_hour, fetch_run_id
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                existing_id, now_iso, post.likes_count or 0, post.comments_count or 0,
                                post.shares_count or 0, post.views_count or 0, snap_growth_rate, fetch_run_id
                            ))
                            snapshots_in_platform += 1
                            total_snapshots_recorded += 1

                        # Recalculate trend score & velocity
                        t_score, v_rate, _ = trend_engine.compute_post_trend_score(
                            existing_id, existing_pub, post.platform,
                            post.views_count, post.likes_count, post.comments_count,
                            post.shares_count, post.quotes_count
                        )

                        cursor.execute("""
                            UPDATE social_posts SET
                                views_count = COALESCE(?, views_count),
                                likes_count = COALESCE(?, likes_count),
                                comments_count = COALESCE(?, comments_count),
                                shares_count = COALESCE(?, shares_count),
                                last_seen_at = ?,
                                trend_score = ?,
                                growth_rate_per_hour = ?
                            WHERE id = ?
                        """, (
                            post.views_count, post.likes_count, post.comments_count,
                            post.shares_count, now_iso, t_score, v_rate, existing_id
                        ))
                        updated_in_platform += 1
                        total_updated += 1
                    else:
                        # New Post Insertion
                        cursor.execute("""
                            INSERT INTO social_posts (
                                id, platform, platform_post_id, canonical_url, author_name, author_handle,
                                title, content, language, media_type, thumbnail_url, published_at,
                                first_seen_at, last_seen_at, likes_count, comments_count, shares_count,
                                views_count, quotes_count, party_codes, leader_names, topics, hashtags,
                                sentiment, sentiment_score, trend_score, growth_rate_per_hour,
                                collection_mode, raw_metrics_available
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            post.id, post.platform, post.platform_post_id, post.canonical_url,
                            post.author_name, post.author_handle, post.title, post.content,
                            post.language, post.media_type, post.thumbnail_url, post.published_at,
                            post.first_seen_at, post.last_seen_at, post.likes_count, post.comments_count,
                            post.shares_count, post.views_count, post.quotes_count,
                            json.dumps(post.party_codes), json.dumps(post.leader_names),
                            json.dumps(post.topics), json.dumps(post.hashtags),
                            post.sentiment, post.sentiment_score, 0.0, 0.0,
                            "LIVE", json.dumps(post.raw_metrics_available)
                        ))

                        # Record initial engagement snapshot
                        cursor.execute("""
                            INSERT INTO engagement_snapshots (
                                post_id, observed_at, likes, comments, shares, views,
                                growth_rate_per_hour, fetch_run_id
                            ) VALUES (?, ?, ?, ?, ?, ?, 0.0, ?)
                        """, (
                            post.id, now_iso, post.likes_count or 0, post.comments_count or 0,
                            post.shares_count or 0, post.views_count or 0, fetch_run_id
                        ))
                        snapshots_in_platform += 1
                        total_snapshots_recorded += 1

                        # Calculate initial trend score
                        t_score, v_rate, _ = trend_engine.compute_post_trend_score(
                            post.id, post.published_at, post.platform,
                            post.views_count, post.likes_count, post.comments_count,
                            post.shares_count, post.quotes_count
                        )
                        cursor.execute(
                            "UPDATE social_posts SET trend_score = ?, growth_rate_per_hour = ? WHERE id = ?",
                            (t_score, v_rate, post.id)
                        )

                        new_in_platform += 1
                        total_added += 1

                # Update connector telemetry
                cursor.execute("""
                    UPDATE social_connectors SET
                        last_successful_fetch = ?,
                        records_collected = records_collected + ?
                    WHERE platform = ?
                """, (now_iso, new_in_platform, plat_name))

                conn.commit()

                results.append({
                    "platform": plat_name,
                    "status": "success",
                    "items_found": len(posts),
                    "new_items": new_in_platform,
                    "updated_items": updated_in_platform,
                    "snapshots_recorded": snapshots_in_platform
                })
            except Exception as e:
                conn.rollback()
                results.append({
                    "platform": plat_name,
                    "status": "error",
                    "error": str(e)
                })

    # Non-destructive re-clustering across all updated posts
    story_clustering_service.run_clustering()

    return {
        "status": "completed",
        "total_new_items": total_added,
        "total_updated_items": total_updated,
        "total_snapshots_recorded": total_snapshots_recorded,
        "platform_results": results
    }

@router.post("/demo/seed")
def reseed_demo_data():
    seed_demo_social_data()
    return {"status": "success", "message": "Demo social media dataset re-seeded successfully."}

@router.get("/trend-explorer")
def get_trend_explorer(
    party: Optional[str] = None,
    leader: Optional[str] = None,
    topic: Optional[str] = None,
    platform: Optional[str] = None,
    time_window: str = Query("24h", pattern="^(1h|24h|7d|30d)$"),
    mode: str = Query("live", pattern="^(live|demo|all)$")
):
    """
    Multi-dimensional political trend explorer.
    """
    return trend_engine.get_trend_explorer(
        party=party,
        leader=leader,
        topic=topic,
        platform=platform,
        time_window=time_window,
        mode=mode
    )

@router.get("/story-clusters/{cluster_id}/timeline")
def get_story_cluster_timeline(cluster_id: str):
    """
    Reconstructs narrative progression timeline from news reports to social discussions.
    """
    timeline = story_clustering_service.get_cluster_timeline(cluster_id)
    if not timeline:
        raise HTTPException(status_code=404, detail="Story cluster not found")
    return timeline

@router.get("/methodology")
def get_methodology():
    """
    Transparent ranking formulas, normalization strategy, and electorate disclaimer.
    """
    return trend_engine.get_methodology_panel()

@router.get("/demo/scenarios")
def list_demo_scenarios():
    """
    Lists interactive demo scenarios for replay.
    """
    return {"scenarios": demo_scenario_engine.get_all_scenarios()}

@router.get("/demo/scenarios/{scenario_id}")
def get_demo_scenario(scenario_id: str):
    detail = demo_scenario_engine.get_scenario_detail(scenario_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return detail

class ScenarioReplayRequest(BaseModel):
    step: int = 1

@router.post("/demo/scenarios/{scenario_id}/replay")
def replay_demo_scenario(scenario_id: str, payload: ScenarioReplayRequest):
    """
    Deterministically replays the requested scenario up to the requested step.
    """
    try:
        return demo_scenario_engine.replay_scenario(scenario_id, step=payload.step)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/demo/scenarios/{scenario_id}/reset")
def reset_single_scenario(scenario_id: str):
    """
    Safely resets a single scenario back to Stage 1. Zero live records modified.
    """
    try:
        return demo_scenario_engine.reset_scenario(scenario_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/demo/scenarios/reset")
def reset_all_scenarios():
    """
    Safely resets all demo scenarios back to Stage 1. Zero live records modified.
    """
    return demo_scenario_engine.reset_scenario(None)

@router.get("/demo/scenarios/{scenario_id}/brief")
def get_scenario_intelligence_brief(scenario_id: str):
    """
    Synthesizes a structured, printable client intelligence brief for the active demo scenario.
    """
    try:
        return demo_scenario_engine.generate_scenario_brief(scenario_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/fetch-runs")
def get_fetch_runs(limit: int = Query(25, ge=1, le=100)):
    """
    Retrieves recent background connector fetch runs for diagnostics and auditing.
    """
    return {"fetch_runs": social_scheduler.get_recent_fetch_runs(limit=limit)}

@router.post("/scheduler/run-connector/{platform}")
def run_single_connector(platform: str):
    """
    Triggers bounded execution for a single connector with concurrency lock.
    """
    return social_scheduler.execute_connector(platform)
