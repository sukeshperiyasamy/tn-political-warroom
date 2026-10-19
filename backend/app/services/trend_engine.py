import math
import json
import sqlite3
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from backend.app.data.db import get_connection, DB_PATH

class TrendEngine:
    """
    Transparent, multi-source political trend ranking engine.
    Formula:
      trend_score = 0.40 * engagement_growth + 0.30 * post_volume_growth + 0.20 * cross_source_presence + 0.10 * recency
    """
    TRACKED_PLATFORMS = ["youtube", "x", "instagram", "facebook", "reddit", "news"]

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    @staticmethod
    def calculate_standardized_engagement(
        platform: str,
        views: Optional[int] = 0,
        likes: Optional[int] = 0,
        comments: Optional[int] = 0,
        shares: Optional[int] = 0,
        quotes: Optional[int] = 0
    ) -> float:
        """
        Cross-platform engagement point normalizer.
        Prevents raw video view counts from overwhelming high-intent actions like comments and shares.
        """
        v = float(views or 0)
        l = float(likes or 0)
        c = float(comments or 0)
        s = float(shares or 0)
        q = float(quotes or 0)

        if platform == "youtube":
            return (v * 0.02) + (l * 1.0) + (c * 2.5)
        elif platform == "x":
            return (l * 1.0) + (c * 2.0) + (s * 3.0) + (q * 3.0) + (v * 0.005)
        elif platform == "reddit":
            return (l * 1.5) + (c * 3.0)
        elif platform == "facebook":
            return (l * 1.0) + (c * 2.0) + (s * 3.5)
        elif platform == "instagram":
            return (l * 1.0) + (c * 2.5)
        elif platform == "google_trends":
            return v * 0.05
        elif platform == "news":
            return 25.0  # News article editorial mention baseline
        return l + c + s

    def compute_post_trend_score(
        self,
        post_id: str,
        published_at_iso: str,
        platform: str,
        views: Optional[int],
        likes: Optional[int],
        comments: Optional[int],
        shares: Optional[int],
        quotes: Optional[int] = None
    ) -> Tuple[float, float, str]:
        """
        Calculates individual post trend score and hourly velocity.
        Returns (trend_score, growth_rate_per_hour, velocity_label).
        """
        now = datetime.now(timezone.utc)
        try:
            pub_dt = datetime.fromisoformat(published_at_iso.replace("Z", "+00:00"))
        except Exception:
            pub_dt = now

        hours_old = max(0.1, (now - pub_dt).total_seconds() / 3600.0)

        # 1. Recency component: exponential decay over 24-48 hours
        recency = math.exp(-hours_old / 36.0)

        # Current engagement
        curr_eng = self.calculate_standardized_engagement(platform, views, likes, comments, shares, quotes)

        # Query snapshots for historical velocity
        growth_rate_per_hour = 0.0
        velocity_label = "INSUFFICIENT_HISTORY"
        engagement_growth_norm = 0.0

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT observed_at, likes, comments, shares, views
                FROM engagement_snapshots
                WHERE post_id = ?
                ORDER BY observed_at ASC
            """, (post_id,))
            snaps = cursor.fetchall()

        if len(snaps) >= 2:
            first_snap = snaps[0]
            last_snap = snaps[-1]
            try:
                t0 = datetime.fromisoformat(first_snap["observed_at"].replace("Z", "+00:00"))
                t1 = datetime.fromisoformat(last_snap["observed_at"].replace("Z", "+00:00"))
                delta_h = max(0.1, (t1 - t0).total_seconds() / 3600.0)
                e0 = self.calculate_standardized_engagement(platform, first_snap["views"], first_snap["likes"], first_snap["comments"], first_snap["shares"])
                e1 = self.calculate_standardized_engagement(platform, last_snap["views"], last_snap["likes"], last_snap["comments"], last_snap["shares"])
                growth_rate_per_hour = max(0.0, (e1 - e0) / delta_h)
                # Map growth into [0, 1] using log scaling
                engagement_growth_norm = min(1.0, math.log1p(growth_rate_per_hour) / math.log1p(500))
                velocity_label = f"+{int(growth_rate_per_hour)}/hr"
            except Exception:
                engagement_growth_norm = min(1.0, math.log1p(curr_eng / hours_old) / math.log1p(500))
                velocity_label = f"~{int(curr_eng / hours_old)}/hr"
        elif hours_old < 24:
            # Baseline velocity when only 1 snapshot or fresh post
            growth_rate_per_hour = curr_eng / hours_old
            engagement_growth_norm = min(1.0, math.log1p(growth_rate_per_hour) / math.log1p(500))
            velocity_label = f"+{int(growth_rate_per_hour)}/hr"

        # Cross-source bonus (single post has presence 1/6)
        cross_source_norm = 1.0 / len(self.TRACKED_PLATFORMS)
        volume_norm = min(1.0, math.log1p(curr_eng) / math.log1p(2000))

        # Weighting
        score = (
            0.40 * engagement_growth_norm +
            0.30 * volume_norm +
            0.20 * cross_source_norm +
            0.10 * recency
        ) * 100.0

        return round(score, 1), round(growth_rate_per_hour, 1), velocity_label

    def get_trending_topics(
        self,
        time_window: str = "24h",
        mode: str = "all",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Calculates ranked trending topics across all platforms within the chosen window:
        '1h', '24h', '7d', '30d'.
        Calculates true engagement momentum (growth delta across comparable windows)
        and dynamic time-decay recency.
        """
        now = datetime.now(timezone.utc)
        delta_map = {
            "1h": timedelta(hours=1),
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30)
        }
        window_delta = delta_map.get(time_window, timedelta(hours=24))
        window_start = now - window_delta
        prior_start = window_start - window_delta

        with self._get_connection() as conn:
            cursor = conn.cursor()
            mode_filter = ""
            if mode == "live":
                mode_filter = " AND collection_mode = 'LIVE'"
            elif mode == "demo":
                mode_filter = " AND collection_mode = 'DEMO'"

            # Query current window posts
            cursor.execute(f"""
                SELECT id, platform, title, content, published_at, topics, party_codes, leader_names,
                       likes_count, comments_count, shares_count, views_count, trend_score, growth_rate_per_hour
                FROM social_posts
                WHERE published_at >= ? {mode_filter}
            """, [window_start.isoformat()])
            curr_posts = cursor.fetchall()

            # Query prior window posts for growth delta & baseline engagement
            cursor.execute(f"""
                SELECT id, platform, topics, views_count, likes_count, comments_count, shares_count
                FROM social_posts
                WHERE published_at >= ? AND published_at < ? {mode_filter}
            """, [prior_start.isoformat(), window_start.isoformat()])
            prior_posts = cursor.fetchall()

        # Prior window metrics per topic
        prior_counts: Dict[str, int] = {}
        prior_engagement_by_topic: Dict[str, float] = {}

        for p in prior_posts:
            t_list = json.loads(p["topics"] or "[]")
            eng = self.calculate_standardized_engagement(
                p["platform"], p["views_count"], p["likes_count"], p["comments_count"], p["shares_count"]
            )
            for t in t_list:
                if not t or t == "General Governance":
                    continue
                prior_counts[t] = prior_counts.get(t, 0) + 1
                prior_engagement_by_topic[t] = prior_engagement_by_topic.get(t, 0.0) + eng

        # Aggregate current window
        topic_aggregates: Dict[str, Dict[str, Any]] = {}
        for p in curr_posts:
            t_list = json.loads(p["topics"] or "[]")
            platform = p["platform"]
            eng = self.calculate_standardized_engagement(
                platform, p["views_count"], p["likes_count"], p["comments_count"], p["shares_count"]
            )
            trend_val = p["trend_score"] or 0.0
            growth_rate = p["growth_rate_per_hour"] or 0.0
            
            try:
                pub_dt = datetime.fromisoformat(p["published_at"].replace("Z", "+00:00"))
            except Exception:
                pub_dt = now

            for t in t_list:
                if not t or t == "General Governance":
                    continue
                if t not in topic_aggregates:
                    topic_aggregates[t] = {
                        "topic": t,
                        "post_count": 0,
                        "platforms": set(),
                        "categories": set(),
                        "parties": set(),
                        "leaders": set(),
                        "total_engagement": 0.0,
                        "post_ids": [],
                        "max_trend_score": 0.0,
                        "sample_titles": [],
                        "latest_dt": pub_dt,
                        "growth_rates": []
                    }
                agg = topic_aggregates[t]
                agg["post_count"] += 1
                agg["platforms"].add(platform)

                # Determine originating category: News Media, Influencers, Social Media, Google Trends
                if platform in ("news", "news_rss"):
                    agg["categories"].add("News Media")
                elif platform == "google_trends":
                    agg["categories"].add("Google Trends")
                elif platform in ("youtube", "influencer"):
                    agg["categories"].add("Influencers")
                else:
                    agg["categories"].add("Social Media")

                agg["total_engagement"] += eng
                agg["post_ids"].append(p["id"])
                agg["growth_rates"].append(growth_rate)
                if pub_dt > agg["latest_dt"]:
                    agg["latest_dt"] = pub_dt
                if trend_val > agg["max_trend_score"]:
                    agg["max_trend_score"] = trend_val
                if p["title"] and len(agg["sample_titles"]) < 3:
                    agg["sample_titles"].append(p["title"])
                
                for code in json.loads(p["party_codes"] or "[]"):
                    agg["parties"].add(code)
                for ldr in json.loads(p["leader_names"] or "[]"):
                    agg["leaders"].add(ldr)

        # Rank topics using dynamic time-aware momentum formula
        results: List[Dict[str, Any]] = []
        for t, data in topic_aggregates.items():
            curr_cnt = data["post_count"]
            prior_cnt = prior_counts.get(t, 0)
            curr_eng = data["total_engagement"]
            prior_eng = prior_engagement_by_topic.get(t, 0.0)

            # 1. Volume Growth (0.30)
            if prior_cnt == 0:
                volume_growth = min(1.0, curr_cnt / 5.0)
                is_emerging = True
            else:
                pct_vol = (curr_cnt - prior_cnt) / prior_cnt
                volume_growth = min(1.0, max(0.0, pct_vol / 2.0))
                is_emerging = False

            # 2. Cross-Source Presence (0.20)
            platform_list = sorted(list(data["platforms"]))
            cross_source_presence = len(platform_list) / len(self.TRACKED_PLATFORMS)

            # 3. Dynamic Engagement Momentum / Velocity (0.40)
            if prior_eng <= 0.0 or prior_cnt == 0:
                # Emerging or newly active topic: evaluate intensity of initial engagement
                eng_growth_norm = min(1.0, math.log1p(curr_eng / max(1, curr_cnt)) / math.log1p(1500))
            else:
                # Comparative window momentum: rate of engagement increase
                pct_eng = (curr_eng - prior_eng) / prior_eng
                eng_growth_norm = min(1.0, max(0.0, pct_eng / 2.0)) if pct_eng > 0 else 0.0

            # Incorporate snapshot hourly velocity if available
            valid_rates = [r for r in data["growth_rates"] if r > 0.0]
            if valid_rates:
                avg_rate = sum(valid_rates) / len(valid_rates)
                rate_norm = min(1.0, math.log1p(avg_rate) / math.log1p(300))
                momentum_score = 0.65 * eng_growth_norm + 0.35 * rate_norm
            else:
                momentum_score = eng_growth_norm

            # 4. Dynamic Time Decay Recency (0.10)
            # Measures hours since latest activity in this topic with exponential decay
            hours_since_latest = max(0.05, (now - data["latest_dt"]).total_seconds() / 3600.0)
            recency_norm = math.exp(-hours_since_latest / 18.0)

            # Composite Score (0 to 100)
            composite_score = (
                0.40 * momentum_score +
                0.30 * volume_growth +
                0.20 * cross_source_presence +
                0.10 * recency_norm
            ) * 100.0

            # Momentum State Classification
            if is_emerging:
                momentum_state = "EMERGING"
            elif momentum_score >= 0.35 or volume_growth >= 0.35:
                momentum_state = "ACCELERATING"
            elif (prior_cnt > 0 and curr_cnt < prior_cnt * 0.70) or (prior_eng > 0 and curr_eng < prior_eng * 0.70):
                momentum_state = "DECELERATING"
            else:
                momentum_state = "STEADY"

            originating_categories = sorted(list(data.get("categories", {"News Media"})))
            is_cross_category = len(originating_categories) > 1
            primary_origin = originating_categories[0] if originating_categories else "News Media"

            results.append({
                "topic": t,
                "current_volume": curr_cnt,
                "prior_volume": prior_cnt,
                "volume_change": curr_cnt - prior_cnt,
                "current_standardized_engagement": int(curr_eng),
                "prior_standardized_engagement": int(prior_eng),
                "engagement_change": int(curr_eng - prior_eng),
                "is_emerging": is_emerging,
                "momentum_state": momentum_state,
                "latest_activity_at": data["latest_dt"].isoformat(),
                "trend_score": round(composite_score, 1),
                "platforms": platform_list,
                "distinct_platforms_count": len(platform_list),
                "originating_categories": originating_categories,
                "primary_origin": primary_origin,
                "is_cross_category": is_cross_category,
                "total_standardized_engagement": int(curr_eng),
                "related_parties": sorted(list(data["parties"])),
                "related_leaders": sorted(list(data["leaders"])),
                "sample_titles": data["sample_titles"][:2],
                "sub_scores": {
                    "engagement_growth": round(momentum_score, 2),
                    "volume_growth": round(volume_growth, 2),
                    "cross_source": round(cross_source_presence, 2),
                    "recency": round(recency_norm, 2)
                }
            })

        results.sort(key=lambda x: x["trend_score"], reverse=True)
        return results[:limit]

    def get_platform_comparison(
        self,
        time_window: str = "24h",
        mode: str = "all"
    ) -> Dict[str, Any]:
        """
        Produces cross-platform comparative metrics:
        Volume per platform, average engagement, party voice distribution across platforms.
        """
        now = datetime.now(timezone.utc)
        delta_map = {
            "1h": timedelta(hours=1),
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30)
        }
        window_delta = delta_map.get(time_window, timedelta(hours=24))
        since = now - window_delta

        with self._get_connection() as conn:
            cursor = conn.cursor()
            mode_filter = ""
            if mode == "live":
                mode_filter = " AND collection_mode = 'LIVE'"
            elif mode == "demo":
                mode_filter = " AND collection_mode = 'DEMO'"

            cursor.execute(f"""
                SELECT platform, party_codes, views_count, likes_count, comments_count, shares_count
                FROM social_posts
                WHERE published_at >= ? {mode_filter}
            """, [since.isoformat()])
            rows = cursor.fetchall()

        platform_stats: Dict[str, Dict[str, Any]] = {p: {
            "platform": p,
            "post_count": 0,
            "total_raw_views": 0,
            "total_raw_likes": 0,
            "total_raw_comments": 0,
            "total_raw_shares": 0,
            "total_standardized_engagement": 0,
            "party_breakdown": {}
        } for p in self.TRACKED_PLATFORMS}

        for row in rows:
            plat = row["platform"]
            if plat not in platform_stats:
                platform_stats[plat] = {
                    "platform": plat,
                    "post_count": 0,
                    "total_raw_views": 0,
                    "total_raw_likes": 0,
                    "total_raw_comments": 0,
                    "total_raw_shares": 0,
                    "total_standardized_engagement": 0,
                    "party_breakdown": {}
                }
            st = platform_stats[plat]
            st["post_count"] += 1
            st["total_raw_views"] += (row["views_count"] or 0)
            st["total_raw_likes"] += (row["likes_count"] or 0)
            st["total_raw_comments"] += (row["comments_count"] or 0)
            st["total_raw_shares"] += (row["shares_count"] or 0)

            std_eng = self.calculate_standardized_engagement(
                plat, row["views_count"], row["likes_count"], row["comments_count"], row["shares_count"]
            )
            st["total_standardized_engagement"] += int(std_eng)

            parties = json.loads(row["party_codes"] or "[]")
            for p_code in parties:
                st["party_breakdown"][p_code] = st["party_breakdown"].get(p_code, 0) + 1

        return {
            "time_window": time_window,
            "reporting_period": f"Past {time_window}",
            "platforms": list(platform_stats.values()),
            "total_posts_across_platforms": sum(s["post_count"] for s in platform_stats.values()),
            "methodology_note": "Volume is normalized using transparent platform action weights (views: 0.02, likes: 1.0, comments: 2.5, shares: 3.5)."
        }

    def get_popular_posts(
        self,
        platform: Optional[str] = None,
        topic: Optional[str] = None,
        party: Optional[str] = None,
        leader: Optional[str] = None,
        mode: str = "live",
        ranking_type: str = "trending",
        limit: int = 25,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Retrieves public political posts with platform-aware normalization,
        within-platform percentile calculation, explicit unavailable metric indicators,
        and observation history confidence.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            where_clauses: List[str] = []
            params: List[Any] = []

            if platform and platform != "all":
                where_clauses.append("platform = ?")
                params.append(platform.lower())

            if mode == "live":
                where_clauses.append("collection_mode = 'LIVE'")
            elif mode == "demo":
                where_clauses.append("collection_mode = 'DEMO'")

            if party and party != "all":
                where_clauses.append("party_codes LIKE ?")
                params.append(f'%"{party}"%')

            if leader and leader != "all":
                where_clauses.append("leader_names LIKE ?")
                params.append(f'%"{leader}"%')

            if topic and topic != "all":
                where_clauses.append("topics LIKE ?")
                params.append(f'%"{topic}"%')

            # Exclude unclassified non-political fallback posts
            where_clauses.append("NOT (topics = '[\"General Governance\"]' AND (party_codes = '[]' OR party_codes IS NULL) AND (leader_names = '[]' OR leader_names IS NULL))")

            where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

            # Count total
            cursor.execute(f"SELECT COUNT(*) FROM social_posts {where_sql}", params)
            total_count = cursor.fetchone()[0]

            # Dynamic Order By mapping based on ranking_type
            if ranking_type == "most_discussed":
                order_by = "COALESCE(comments_count, -1) DESC, published_at DESC"
            elif ranking_type == "most_liked":
                order_by = "COALESCE(likes_count, -1) DESC, published_at DESC"
            elif ranking_type == "most_shared":
                order_by = "COALESCE(shares_count, -1) DESC, published_at DESC"
            elif ranking_type == "fastest_growing":
                order_by = "COALESCE(growth_rate_per_hour, 0) DESC, published_at DESC"
            elif ranking_type == "recent":
                order_by = "published_at DESC"
            elif ranking_type == "most_cross_platform":
                order_by = "story_cluster_id IS NOT NULL DESC, trend_score DESC"
            else:  # "trending"
                order_by = "trend_score DESC, published_at DESC"

            cursor.execute(f"""
                SELECT * FROM social_posts
                {where_sql}
                ORDER BY {order_by}
                LIMIT ? OFFSET ?
            """, params + [limit, offset])

            rows = cursor.fetchall()
            posts: List[Dict[str, Any]] = []
            seen_titles = set()

            for r in rows:
                p = dict(r)
                # Deduplication guard: drop duplicate alerts with identical platform and title
                t_clean = (p.get("title") or "").strip().lower()
                dedup_key = f"{p.get('platform')}:{t_clean}" if t_clean else p.get("id")
                if dedup_key in seen_titles:
                    continue
                seen_titles.add(dedup_key)
                p["party_codes"] = json.loads(p.get("party_codes") or "[]")
                p["leader_names"] = json.loads(p.get("leader_names") or "[]")
                p["topics"] = json.loads(p.get("topics") or "[]")
                p["hashtags"] = json.loads(p.get("hashtags") or "[]")
                p["raw_metrics_available"] = json.loads(p.get("raw_metrics_available") or "[]")
                p["matched_entities"] = json.loads(p.get("matched_entities") or "[]")
                p["data_provenance"] = json.loads(p.get("data_provenance") or "{}")

                # Snapshot count for observation history confidence
                cursor.execute("SELECT COUNT(*) FROM engagement_snapshots WHERE post_id = ?", (p["id"],))
                snap_count = cursor.fetchone()[0]
                p["observation_count"] = snap_count
                p["has_sufficient_history"] = snap_count >= 2
                p["history_status"] = f"{snap_count} observations" if snap_count >= 2 else "Not enough observations"

                # Engagement rate calculation (where views denominator exists)
                if p.get("views_count") and p["views_count"] > 0:
                    tot_eng = (p.get("likes_count") or 0) + (p.get("comments_count") or 0) + (p.get("shares_count") or 0)
                    p["engagement_rate_percent"] = round((tot_eng / p["views_count"]) * 100, 2)
                else:
                    p["engagement_rate_percent"] = None

                posts.append(p)

            # Within-platform percentile scoring
            for p in posts:
                plat = p["platform"]
                # Score percentile relative to other posts on same platform
                cursor.execute("""
                    SELECT COUNT(*) FROM social_posts
                    WHERE platform = ? AND trend_score <= ?
                """, (plat, p.get("trend_score", 0.0)))
                below_count = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM social_posts WHERE platform = ?", (plat,))
                plat_tot = max(1, cursor.fetchone()[0])
                p["platform_percentile"] = round((below_count / plat_tot) * 100.0, 1)

            return {
                "total_count": total_count,
                "limit": limit,
                "offset": offset,
                "platform_filter": platform,
                "mode": mode,
                "ranking_type": ranking_type,
                "posts": posts
            }

    def get_trend_explorer(
        self,
        party: Optional[str] = None,
        leader: Optional[str] = None,
        topic: Optional[str] = None,
        platform: Optional[str] = None,
        time_window: str = "24h",
        mode: str = "live"
    ) -> Dict[str, Any]:
        """
        Interactive multi-dimensional trend explorer: slices metrics by party, leader,
        topic, platform, and time window.
        """
        now = datetime.now(timezone.utc)
        delta_map = {
            "1h": timedelta(hours=1),
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30)
        }
        window_delta = delta_map.get(time_window, timedelta(hours=24))
        since = now - window_delta

        with self._get_connection() as conn:
            cursor = conn.cursor()
            where_clauses = ["published_at >= ?"]
            params: List[Any] = [since.isoformat()]

            if mode == "live":
                where_clauses.append("collection_mode = 'LIVE'")
            elif mode == "demo":
                where_clauses.append("collection_mode = 'DEMO'")

            if platform and platform != "all":
                where_clauses.append("platform = ?")
                params.append(platform.lower())

            if party and party != "all":
                where_clauses.append("party_codes LIKE ?")
                params.append(f'%"{party}"%')

            if leader and leader != "all":
                where_clauses.append("leader_names LIKE ?")
                params.append(f'%"{leader}"%')

            if topic and topic != "all":
                where_clauses.append("topics LIKE ?")
                params.append(f'%"{topic}"%')

            where_sql = "WHERE " + " AND ".join(where_clauses)

            cursor.execute(f"""
                SELECT id, platform, title, content, published_at, party_codes, leader_names, topics,
                       views_count, likes_count, comments_count, shares_count, trend_score, growth_rate_per_hour
                FROM social_posts
                {where_sql}
                ORDER BY published_at ASC
            """, params)
            rows = cursor.fetchall()

        total_posts = len(rows)
        total_std_eng = 0
        platform_dist: Dict[str, int] = {}
        timeline_buckets: Dict[str, Dict[str, Any]] = {}

        for r in rows:
            plat = r["platform"]
            platform_dist[plat] = platform_dist.get(plat, 0) + 1
            std_eng = self.calculate_standardized_engagement(
                plat, r["views_count"], r["likes_count"], r["comments_count"], r["shares_count"]
            )
            total_std_eng += int(std_eng)

            # Hour bucket for timeline
            pub_dt = r["published_at"][:13] + ":00"
            if pub_dt not in timeline_buckets:
                timeline_buckets[pub_dt] = {
                    "timestamp": pub_dt,
                    "post_count": 0,
                    "engagement": 0,
                    "avg_trend_score": 0.0
                }
            timeline_buckets[pub_dt]["post_count"] += 1
            timeline_buckets[pub_dt]["engagement"] += int(std_eng)
            timeline_buckets[pub_dt]["avg_trend_score"] += (r["trend_score"] or 0.0)

        timeline = sorted(timeline_buckets.values(), key=lambda x: x["timestamp"])
        for tb in timeline:
            if tb["post_count"] > 0:
                tb["avg_trend_score"] = round(tb["avg_trend_score"] / tb["post_count"], 1)

        # Average trend score
        avg_score = round(sum(r["trend_score"] or 0.0 for r in rows) / max(1, total_posts), 1)

        return {
            "query": {
                "party": party,
                "leader": leader,
                "topic": topic,
                "platform": platform,
                "time_window": time_window,
                "mode": mode
            },
            "summary": {
                "total_posts": total_posts,
                "total_standardized_engagement": total_std_eng,
                "average_trend_score": avg_score,
                "platform_diversity": len(platform_dist),
                "platforms": platform_dist
            },
            "timeline": timeline,
            "has_sufficient_data": total_posts >= 2
        }

    def get_methodology_panel(self) -> Dict[str, Any]:
        """
        Transparent methodology documentation and electorate disclaimer.
        """
        return {
            "disclaimer": "This system is a media discovery, narrative tracking, and public engagement analytics tool. Social media activity reflects public web discussion, platform virality, and publisher reporting. It does NOT represent the voting intentions or sentiment of the entire electorate.",
            "normalization_strategy": "Direct cross-platform raw comparisons (e.g. YouTube views vs Reddit comments) are avoided. The engine employs within-platform percentiles, platform action multipliers (Views: 0.02, Likes: 1.0, Comments: 2.5, Shares: 3.5), and engagement rates where denominator views exist.",
            "rankings": {
                "trending": "Composite score: 0.40 * engagement growth momentum + 0.30 * volume growth + 0.20 * cross-platform diversity + 0.10 * exponential decay recency.",
                "fastest_growing": "Observed engagement velocity from timestamped snapshot deltas: delta_E / delta_t. Requires >= 2 observations.",
                "most_discussed": "Ranked by comments and replies count within the selected time window.",
                "most_liked": "Ranked by public likes or platform equivalent endorsements.",
                "most_shared": "Ranked by reposts and shares.",
                "most_cross_platform": "Ranked by cross-media narrative propagation and presence across multiple distinct platforms."
            },
            "confidence_rules": {
                "sufficient_history": "Requires at least 2 distinct timestamped observation snapshots. Displays 'Not enough observations' otherwise.",
                "recency_formula": "recency = 100 * exp(-delta_t_hours / 18.0)"
            }
        }

trend_engine = TrendEngine()
