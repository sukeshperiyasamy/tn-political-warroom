import re
import json
import sqlite3
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set
from backend.app.data.db import get_connection, DB_PATH
from backend.app.services.trend_engine import trend_engine

STOPWORDS = {
    "the", "a", "an", "in", "on", "of", "for", "to", "and", "with", "by", "at",
    "is", "it", "this", "that", "from", "as", "are", "was", "were", "tamil", "nadu"
}

def tokenize(text: Optional[str]) -> Set[str]:
    if not text:
        return set()
    words = re.findall(r"[\w\u0B80-\u0BFF]+", text.lower())
    return set(w for w in words if len(w) > 2 and w not in STOPWORDS)

class StoryClusteringService:
    """
    Non-destructive, event-aware cross-platform narrative aggregator.
    Discovers when a specific political event or controversy spreads across multiple sources.
    Strictly partitions LIVE and DEMO data clusters and preserves cluster IDs across runs.
    """
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def are_posts_event_related(self, p1: Dict[str, Any], p2: Dict[str, Any]) -> bool:
        """
        Determines whether two posts refer to the same specific political event.
        Requires:
        1. Identical collection mode (LIVE with LIVE, DEMO with DEMO).
        2. Temporal proximity within 48 hours.
        3. Event-specific evidence (entity overlap, token similarity, or specific keywords).
        """
        # Strict mode partition
        if p1.get("collection_mode", "LIVE") != p2.get("collection_mode", "LIVE"):
            return False

        # Temporal proximity check (48 hours)
        try:
            t1 = datetime.fromisoformat(p1["published_at"].replace("Z", "+00:00"))
            t2 = datetime.fromisoformat(p2["published_at"].replace("Z", "+00:00"))
            if abs((t2 - t1).total_seconds()) > 48 * 3600.0:
                return False
        except Exception:
            pass

        topics1 = set(p1.get("topics") or [])
        topics2 = set(p2.get("topics") or [])
        shared_topics = topics1.intersection(topics2)

        parties1 = set(p1.get("party_codes") or [])
        parties2 = set(p2.get("party_codes") or [])
        shared_parties = parties1.intersection(parties2)

        leaders1 = set(p1.get("leader_names") or [])
        leaders2 = set(p2.get("leader_names") or [])
        shared_leaders = leaders1.intersection(leaders2)

        tok1 = tokenize(f"{p1.get('title', '')} {p1.get('content', '')}")
        tok2 = tokenize(f"{p2.get('title', '')} {p2.get('content', '')}")
        union_size = len(tok1.union(tok2))
        jaccard = (len(tok1.intersection(tok2)) / union_size) if union_size > 0 else 0.0

        # Specific event discriminators
        # 1. Shared specific leaders and shared topic
        if shared_leaders and shared_topics:
            return True

        # 2. Shared topic + shared parties + minimum token overlap
        if shared_topics and shared_parties and (jaccard >= 0.08 or any(t != "Tamil Nadu State Politics" for t in shared_topics)):
            return True

        # 3. High text/keyword similarity (same announcement or press release)
        if jaccard >= 0.20:
            return True

        # 4. Same specific non-generic topic and shared entities
        specific_topics = {t for t in shared_topics if t not in ("Tamil Nadu State Politics", "Governance", "General Governance")}
        if specific_topics and (shared_parties or shared_leaders or jaccard >= 0.10):
            return True

        return False

    def run_clustering(self, mode: str = "all") -> List[Dict[str, Any]]:
        """
        Performs event-aware clustering across posts without deleting existing clusters.
        Maintains stable cluster IDs and strictly respects collection mode.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            mode_filter = ""
            params: List[Any] = []
            if mode == "live":
                mode_filter = "WHERE collection_mode = 'LIVE'"
            elif mode == "demo":
                mode_filter = "WHERE collection_mode = 'DEMO'"

            cursor.execute(f"""
                SELECT id, platform, platform_post_id, canonical_url, title, content, published_at,
                       topics, party_codes, leader_names, views_count, likes_count,
                       comments_count, shares_count, collection_mode, story_cluster_id
                FROM social_posts
                {mode_filter}
                ORDER BY published_at ASC
            """, params)
            rows = cursor.fetchall()

        if not rows:
            return []

        posts: List[Dict[str, Any]] = []
        for r in rows:
            p = dict(r)
            p["topics"] = json.loads(p.get("topics") or "[]")
            p["party_codes"] = json.loads(p.get("party_codes") or "[]")
            p["leader_names"] = json.loads(p.get("leader_names") or "[]")
            posts.append(p)

        # Partition by collection mode first
        posts_by_mode: Dict[str, List[Dict[str, Any]]] = {}
        for p in posts:
            m = p.get("collection_mode", "LIVE")
            if m not in posts_by_mode:
                posts_by_mode[m] = []
            posts_by_mode[m].append(p)

        all_clusters: List[Dict[str, Any]] = []

        for c_mode, mode_posts in posts_by_mode.items():
            # Group into event clusters
            groups: List[List[Dict[str, Any]]] = []
            for p in mode_posts:
                matched_group = None
                for group in groups:
                    # Check affinity against existing members of the group
                    if any(self.are_posts_event_related(p, member) for member in group):
                        matched_group = group
                        break
                if matched_group is not None:
                    matched_group.append(p)
                else:
                    groups.append([p])

            for post_group in groups:
                if len(post_group) < 2:
                    continue  # A single post does not form a narrative cluster

                sorted_group = sorted(post_group, key=lambda x: x["published_at"] or "")
                earliest = sorted_group[0]
                latest = sorted_group[-1]

                # Stable deterministic cluster ID: based on mode and earliest post ID
                earliest_id = earliest["id"]
                cluster_id = f"cluster_{c_mode.lower()}_{hashlib.sha256(earliest_id.encode()).hexdigest()[:10]}"

                platforms = sorted(list(set(p["platform"] for p in sorted_group)))
                post_ids = [p["id"] for p in sorted_group]

                total_eng = sum(
                    trend_engine.calculate_standardized_engagement(
                        p["platform"], p["views_count"], p["likes_count"], p["comments_count"], p["shares_count"]
                    ) for p in sorted_group
                )

                # Time lag between earliest post and first cross-platform reaction
                time_lag_mins = 0
                try:
                    first_dt = datetime.fromisoformat(earliest["published_at"].replace("Z", "+00:00"))
                    diff_plat_post = next((p for p in sorted_group if p["platform"] != earliest["platform"]), None)
                    if diff_plat_post:
                        diff_dt = datetime.fromisoformat(diff_plat_post["published_at"].replace("Z", "+00:00"))
                        time_lag_mins = max(1, int((diff_dt - first_dt).total_seconds() / 60.0))
                except Exception:
                    time_lag_mins = 20

                lead_title = earliest["title"] or earliest["content"][:100]
                topics_list = earliest.get("topics") or ["Tamil Nadu State Politics"]
                topic_name = topics_list[0] if topics_list else "Tamil Nadu State Politics"

                # Related news article IDs
                news_ids = [p["platform_post_id"] for p in sorted_group if p["platform"] == "news"]

                all_clusters.append({
                    "id": cluster_id,
                    "title_en": lead_title,
                    "title_ta": lead_title,
                    "lead_story": earliest["content"][:250],
                    "topic": topic_name,
                    "first_observed_at": earliest["published_at"],
                    "latest_observed_at": latest["published_at"],
                    "distinct_sources_count": len(platforms),
                    "platforms_involved": platforms,
                    "total_engagement": int(total_eng),
                    "post_ids": post_ids,
                    "news_article_ids": news_ids,
                    "time_lag_minutes": time_lag_mins,
                    "collection_mode": c_mode,
                    "post_count": len(post_ids)
                })

        # Non-destructive upsert into story_clusters
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for c in all_clusters:
                cursor.execute("""
                    INSERT INTO story_clusters (
                        id, title_en, title_ta, lead_story, topic, first_observed_at,
                        latest_observed_at, distinct_sources_count, platforms_involved,
                        total_engagement, post_ids, news_article_ids, time_lag_minutes,
                        cluster_status, collection_mode
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
                    ON CONFLICT(id) DO UPDATE SET
                        title_en=excluded.title_en,
                        title_ta=excluded.title_ta,
                        lead_story=excluded.lead_story,
                        latest_observed_at=excluded.latest_observed_at,
                        distinct_sources_count=excluded.distinct_sources_count,
                        platforms_involved=excluded.platforms_involved,
                        total_engagement=excluded.total_engagement,
                        post_ids=excluded.post_ids,
                        news_article_ids=excluded.news_article_ids,
                        time_lag_minutes=excluded.time_lag_minutes,
                        collection_mode=excluded.collection_mode
                """, (
                    c["id"],
                    c["title_en"],
                    c["title_ta"],
                    c["lead_story"],
                    c["topic"],
                    c["first_observed_at"],
                    c["latest_observed_at"],
                    c["distinct_sources_count"],
                    json.dumps(c["platforms_involved"]),
                    c["total_engagement"],
                    json.dumps(c["post_ids"]),
                    json.dumps(c["news_article_ids"]),
                    c["time_lag_minutes"],
                    c["collection_mode"]
                ))

                # Assign cluster ID to member posts
                for pid in c["post_ids"]:
                    cursor.execute("UPDATE social_posts SET story_cluster_id = ? WHERE id = ?", (c["id"], pid))

            conn.commit()

        all_clusters.sort(key=lambda x: x["total_engagement"], reverse=True)
        return all_clusters

    def get_clusters(self, mode: str = "live", limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieves clusters matching the specified collection mode.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            where_sql = ""
            params: List[Any] = []
            if mode == "live":
                where_sql = "WHERE collection_mode = 'LIVE'"
            elif mode == "demo":
                where_sql = "WHERE collection_mode = 'DEMO'"
            elif mode == "all":
                where_sql = ""

            cursor.execute(f"""
                SELECT * FROM story_clusters
                {where_sql}
                ORDER BY total_engagement DESC
                LIMIT ?
            """, params + [limit])
            rows = cursor.fetchall()
            out = []
            for row in rows:
                r = dict(row)
                r["platforms_involved"] = json.loads(r.get("platforms_involved") or "[]")
                r["post_ids"] = json.loads(r.get("post_ids") or "[]")
                r["news_article_ids"] = json.loads(r.get("news_article_ids") or "[]")
                out.append(r)
            return out

    def get_cluster_timeline(self, cluster_id: str) -> Optional[Dict[str, Any]]:
        """
        Reconstructs the narrative progression timeline for a story cluster:
        shows how an issue began on news sites and propagated to social media.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM story_clusters WHERE id = ?", (cluster_id,))
            crow = cursor.fetchone()
            if not crow:
                return None

            cluster = dict(crow)
            cluster["platforms_involved"] = json.loads(cluster.get("platforms_involved") or "[]")
            cluster["post_ids"] = json.loads(cluster.get("post_ids") or "[]")
            cluster["news_article_ids"] = json.loads(cluster.get("news_article_ids") or "[]")

            # Fetch member posts
            posts = []
            if cluster["post_ids"]:
                placeholders = ",".join("?" * len(cluster["post_ids"]))
                cursor.execute(f"""
                    SELECT id, platform, author_name, author_handle, title, content,
                           published_at, views_count, likes_count, comments_count, shares_count,
                           canonical_url, media_type, collection_mode
                    FROM social_posts
                    WHERE id IN ({placeholders})
                    ORDER BY published_at ASC
                """, cluster["post_ids"])
                for pr in cursor.fetchall():
                    posts.append(dict(pr))

            # Fetch related news articles if any
            articles = []
            if cluster["news_article_ids"]:
                placeholders = ",".join("?" * len(cluster["news_article_ids"]))
                cursor.execute(f"""
                    SELECT id, title, canonical_url, publisher, published_at
                    FROM articles
                    WHERE id IN ({placeholders})
                    ORDER BY published_at ASC
                """, cluster["news_article_ids"])
                for ar in cursor.fetchall():
                    articles.append(dict(ar))

            # Build narrative timeline nodes
            timeline_nodes = []
            origin_dt = None

            # First add articles
            for art in articles:
                timeline_nodes.append({
                    "id": art["id"],
                    "node_type": "news_article",
                    "platform": "news",
                    "publisher": art["publisher"],
                    "title": art["title"],
                    "url": art["canonical_url"],
                    "published_at": art["published_at"],
                    "time_lag_mins": 0
                })
                if not origin_dt:
                    origin_dt = art["published_at"]

            # Then add social posts
            for p in posts:
                lag = 0
                if origin_dt:
                    try:
                        t0 = datetime.fromisoformat(origin_dt.replace("Z", "+00:00"))
                        t1 = datetime.fromisoformat(p["published_at"].replace("Z", "+00:00"))
                        lag = max(0, int((t1 - t0).total_seconds() / 60))
                    except Exception:
                        lag = 0
                else:
                    origin_dt = p["published_at"]

                timeline_nodes.append({
                    "id": p["id"],
                    "node_type": "social_post",
                    "platform": p["platform"],
                    "author": p["author_name"] or p["author_handle"],
                    "title": p["title"] or p["content"][:100],
                    "content": p["content"],
                    "url": p["canonical_url"],
                    "media_type": p["media_type"],
                    "published_at": p["published_at"],
                    "engagement": (p.get("views_count") or 0) + (p.get("likes_count") or 0) * 10,
                    "time_lag_mins": lag
                })

            timeline_nodes.sort(key=lambda x: x["published_at"])

            return {
                "cluster": cluster,
                "narrative_origin": timeline_nodes[0] if timeline_nodes else None,
                "latest_update": timeline_nodes[-1] if timeline_nodes else None,
                "propagation_lag_minutes": cluster.get("time_lag_minutes", 0),
                "platforms_count": len(cluster["platforms_involved"]),
                "timeline": timeline_nodes,
                "confidence_score": round(min(0.98, 0.65 + (len(cluster["platforms_involved"]) * 0.08)), 2)
            }

story_clustering_service = StoryClusteringService()
