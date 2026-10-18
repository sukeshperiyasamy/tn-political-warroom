import sqlite3
import json
import os
from typing import List, Optional, Dict, Any
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "warroom.db")

DEFAULT_SOURCES = [
    {
        "id": "news18_tamil",
        "name": "News18 Tamil Nadu",
        "tamil_name": "நியூஸ்18 தமிழ்நாடு",
        "category": "TV News",
        "url": "https://tamil.news18.com",
        "rss_url": "https://tamil.news18.com/commonfeeds/v1/tam/rss/tamil-nadu.xml",
        "language": "ta",
        "is_enabled": 1,
        "health_status": "healthy",
        "last_fetched_at": None,
        "last_error": None,
        "total_articles_fetched": 0,
    },
    {
        "id": "polimer_news",
        "name": "Polimer News",
        "tamil_name": "பாலிமர் செய்திகள்",
        "category": "TV News",
        "url": "https://polimernews.com",
        "rss_url": "https://polimernews.com/rss",
        "language": "ta",
        "is_enabled": 1,
        "health_status": "healthy",
        "last_fetched_at": None,
        "last_error": None,
        "total_articles_fetched": 0,
    },
    {
        "id": "oneindia_tamil",
        "name": "OneIndia Tamil",
        "tamil_name": "ஒன்இந்தியா தமிழ்",
        "category": "Digital News",
        "url": "https://tamil.oneindia.com",
        "rss_url": "https://tamil.oneindia.com/rss/feeds/tamil-news-fb.xml",
        "language": "ta",
        "is_enabled": 1,
        "health_status": "healthy",
        "last_fetched_at": None,
        "last_error": None,
        "total_articles_fetched": 0,
    },
    {
        "id": "muthanmai_politics",
        "name": "Muthanmai Reporter (Politics)",
        "tamil_name": "முதன்மை ரிப்போர்ட்டர் (அரசியல்)",
        "category": "State Politics",
        "url": "https://muthanmaireporter.com",
        "rss_url": "https://muthanmaireporter.com/rss/category/%E0%AE%85%E0%AE%B0%E0%AE%9A%E0%AE%BF%E0%AE%AF%E0%AE%B2%E0%AF%8D",
        "language": "ta",
        "is_enabled": 1,
        "health_status": "healthy",
        "last_fetched_at": None,
        "last_error": None,
        "total_articles_fetched": 0,
    },
    {
        "id": "muthanmai_tn",
        "name": "Muthanmai Reporter (Tamil Nadu)",
        "tamil_name": "முதன்மை ரிப்போர்ட்டர் (தமிழ்நாடு)",
        "category": "State Politics",
        "url": "https://muthanmaireporter.com",
        "rss_url": "https://muthanmaireporter.com/rss/category/tamilnadu",
        "language": "ta",
        "is_enabled": 1,
        "health_status": "healthy",
        "last_fetched_at": None,
        "last_error": None,
        "total_articles_fetched": 0,
    },
    {
        "id": "bbc_tamil",
        "name": "BBC News Tamil",
        "tamil_name": "பிபிசி தமிழ்",
        "category": "Digital News",
        "url": "https://www.bbc.com/tamil",
        "rss_url": "https://feeds.bbci.co.uk/tamil/rss.xml",
        "language": "ta",
        "is_enabled": 1,
        "health_status": "healthy",
        "last_fetched_at": None,
        "last_error": None,
        "total_articles_fetched": 0,
    },
    {
        "id": "the_hindu_tn",
        "name": "The Hindu (Tamil Nadu)",
        "tamil_name": "தி இந்து",
        "category": "Print / Digital",
        "url": "https://www.thehindu.com/news/national/tamil-nadu/",
        "rss_url": "https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss",
        "language": "en",
        "is_enabled": 1,
        "health_status": "healthy",
        "last_fetched_at": None,
        "last_error": None,
        "total_articles_fetched": 0,
    },
    {
        "id": "daily_thanthi",
        "name": "Daily Thanthi",
        "tamil_name": "தினத்தந்தி",
        "category": "Daily Newspaper",
        "url": "https://www.dailythanthi.com",
        "rss_url": "https://www.dailythanthi.com/rss",
        "language": "ta",
        "is_enabled": 0,
        "health_status": "warning",
        "last_fetched_at": None,
        "last_error": "Endpoint inactive - syndication feed pending publisher reactivation",
        "total_articles_fetched": 0,
    }
]

class SourceRegistry:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._initialized = False

    def ensure_initialized(self):
        if self._initialized:
            return
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_db()
        self._initialized = True

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Sources Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sources (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    tamil_name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    url TEXT NOT NULL,
                    rss_url TEXT NOT NULL,
                    language TEXT NOT NULL DEFAULT 'ta',
                    is_enabled INTEGER NOT NULL DEFAULT 1,
                    health_status TEXT NOT NULL DEFAULT 'healthy',
                    last_fetched_at TEXT,
                    last_fetch_attempt_at TEXT,
                    last_successful_fetch_at TEXT,
                    last_publication_at TEXT,
                    last_fetch_status TEXT,
                    last_fetch_error TEXT,
                    last_error TEXT,
                    etag TEXT,
                    last_modified TEXT,
                    skipped_duplicates_count INTEGER DEFAULT 0,
                    next_scheduled_fetch_at TEXT,
                    total_articles_fetched INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL
                )
            """)

            # Articles Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS articles (
                    id TEXT PRIMARY KEY,
                    source_id TEXT NOT NULL,
                    source_name TEXT NOT NULL,
                    title TEXT NOT NULL,
                    tamil_title TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    tamil_summary TEXT NOT NULL,
                    source_url TEXT NOT NULL UNIQUE,
                    canonical_url TEXT,
                    publisher_guid TEXT,
                    published_at TEXT NOT NULL,
                    party_codes TEXT NOT NULL,
                    leader_names TEXT NOT NULL,
                    sentiment TEXT NOT NULL,
                    sentiment_score REAL NOT NULL,
                    topics TEXT NOT NULL,
                    tamil_variations TEXT NOT NULL,
                    engagement_estimated TEXT NOT NULL,
                    data_status TEXT NOT NULL DEFAULT 'live_rss',
                    analysis_provider TEXT NOT NULL DEFAULT 'tamil_nlp_engine',
                    content_hash TEXT,
                    processing_hash TEXT,
                    processing_status TEXT DEFAULT 'processed',
                    processed_at TEXT,
                    processing_attempts INTEGER DEFAULT 1,
                    last_seen_at TEXT,
                    first_seen_at TEXT NOT NULL,
                    FOREIGN KEY (source_id) REFERENCES sources(id)
                )
            """)

            # Ingestion Logs Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ingestion_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_id TEXT NOT NULL,
                    source_name TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    status TEXT NOT NULL,
                    http_status INTEGER DEFAULT 200,
                    items_found INTEGER DEFAULT 0,
                    new_items_added INTEGER DEFAULT 0,
                    skipped_duplicates INTEGER DEFAULT 0,
                    duration_ms INTEGER DEFAULT 0,
                    error_message TEXT
                )
            """)

            # Persisted Intelligence Briefs Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS intelligence_briefs (
                    id TEXT PRIMARY KEY,
                    data_status TEXT NOT NULL,
                    period TEXT NOT NULL,
                    window_start TEXT NOT NULL,
                    window_end TEXT NOT NULL,
                    evidence_hash TEXT NOT NULL,
                    config_version TEXT NOT NULL,
                    generated_at TEXT NOT NULL,
                    sample_size INTEGER NOT NULL,
                    publisher_count INTEGER NOT NULL,
                    brief_english TEXT NOT NULL,
                    brief_tamil TEXT NOT NULL,
                    key_developments TEXT NOT NULL,
                    emerging_topics TEXT NOT NULL,
                    party_insights TEXT NOT NULL,
                    supporting_article_ids TEXT NOT NULL,
                    evidence_articles TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'sufficient_data'
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_briefs_lookup ON intelligence_briefs(data_status, period, evidence_hash, config_version)")

            # Seed default sources if table is empty
            cursor.execute("SELECT COUNT(*) FROM sources")
            count = cursor.fetchone()[0]
            if count == 0:
                now_str = datetime.now().isoformat()
                for src in DEFAULT_SOURCES:
                    cursor.execute("""
                        INSERT INTO sources (
                            id, name, tamil_name, category, url, rss_url,
                            language, is_enabled, health_status, last_fetched_at,
                            last_fetch_attempt_at, last_successful_fetch_at, last_publication_at,
                            last_fetch_status, last_fetch_error, last_error,
                            etag, last_modified, skipped_duplicates_count, next_scheduled_fetch_at,
                            total_articles_fetched, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        src["id"], src["name"], src["tamil_name"], src["category"],
                        src["url"], src["rss_url"], src["language"], src["is_enabled"],
                        src["health_status"], src["last_fetched_at"],
                        None, None, None,
                        "success" if src["health_status"] == "healthy" else "error",
                        src.get("last_error"), src["last_error"],
                        None, None, 0, None,
                        src["total_articles_fetched"], now_str
                    ))
            conn.commit()

        # Run automated schema migrations and backfill
        self._migrate_db()

    def _migrate_db(self):
        import hashlib
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Sources migration
            cursor.execute("PRAGMA table_info(sources)")
            src_cols = {row["name"] for row in cursor.fetchall()}
            
            new_src_cols = {
                "etag": "TEXT",
                "last_modified": "TEXT",
                "last_fetch_attempt_at": "TEXT",
                "last_successful_fetch_at": "TEXT",
                "last_publication_at": "TEXT",
                "last_fetch_status": "TEXT",
                "last_fetch_error": "TEXT",
                "skipped_duplicates_count": "INTEGER DEFAULT 0",
                "next_scheduled_fetch_at": "TEXT"
            }
            for col_name, col_type in new_src_cols.items():
                if col_name not in src_cols:
                    cursor.execute(f"ALTER TABLE sources ADD COLUMN {col_name} {col_type}")
                    
            # Articles migration
            cursor.execute("PRAGMA table_info(articles)")
            art_cols = {row["name"] for row in cursor.fetchall()}
            
            new_art_cols = {
                "canonical_url": "TEXT",
                "publisher_guid": "TEXT",
                "content_hash": "TEXT",
                "processing_hash": "TEXT",
                "processing_status": "TEXT DEFAULT 'processed'",
                "processed_at": "TEXT",
                "processing_attempts": "INTEGER DEFAULT 1",
                "last_seen_at": "TEXT"
            }
            for col_name, col_type in new_art_cols.items():
                if col_name not in art_cols:
                    cursor.execute(f"ALTER TABLE articles ADD COLUMN {col_name} {col_type}")
                    
            # Ingestion logs migration
            cursor.execute("PRAGMA table_info(ingestion_logs)")
            log_cols = {row["name"] for row in cursor.fetchall()}
            
            new_log_cols = {
                "skipped_duplicates": "INTEGER DEFAULT 0",
                "http_status": "INTEGER DEFAULT 200"
            }
            for col_name, col_type in new_log_cols.items():
                if col_name not in log_cols:
                    cursor.execute(f"ALTER TABLE ingestion_logs ADD COLUMN {col_name} {col_type}")

            # Ensure intelligence_briefs table exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS intelligence_briefs (
                    id TEXT PRIMARY KEY,
                    data_status TEXT NOT NULL,
                    period TEXT NOT NULL,
                    window_start TEXT NOT NULL,
                    window_end TEXT NOT NULL,
                    evidence_hash TEXT NOT NULL,
                    config_version TEXT NOT NULL,
                    generated_at TEXT NOT NULL,
                    sample_size INTEGER NOT NULL,
                    publisher_count INTEGER NOT NULL,
                    brief_english TEXT NOT NULL,
                    brief_tamil TEXT NOT NULL,
                    key_developments TEXT NOT NULL,
                    emerging_topics TEXT NOT NULL,
                    party_insights TEXT NOT NULL,
                    supporting_article_ids TEXT NOT NULL,
                    evidence_articles TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'sufficient_data'
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_briefs_lookup ON intelligence_briefs(data_status, period, evidence_hash, config_version)")

            # Performance & Deduplication indexes
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_canonical_url ON articles(canonical_url)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_content_hash ON articles(content_hash)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sources_is_enabled ON sources(is_enabled)")

            # Backfill existing articles
            cursor.execute("""
                UPDATE articles
                SET canonical_url = source_url
                WHERE canonical_url IS NULL OR canonical_url = ''
            """)
            cursor.execute("""
                UPDATE articles
                SET publisher_guid = id
                WHERE publisher_guid IS NULL OR publisher_guid = ''
            """)
            cursor.execute("""
                UPDATE articles
                SET processing_status = 'processed'
                WHERE processing_status IS NULL OR processing_status = ''
            """)
            cursor.execute("""
                UPDATE articles
                SET processed_at = first_seen_at
                WHERE processed_at IS NULL
            """)
            cursor.execute("""
                UPDATE articles
                SET last_seen_at = first_seen_at
                WHERE last_seen_at IS NULL
            """)

            # Backfill content_hash
            cursor.execute("SELECT id, title, summary FROM articles WHERE content_hash IS NULL OR content_hash = ''")
            for row in cursor.fetchall():
                c_hash = hashlib.sha256(f"{row['title']}|{row['summary']}".encode("utf-8")).hexdigest()
                p_hash = hashlib.sha256(f"v1|{c_hash}".encode("utf-8")).hexdigest()
                cursor.execute("UPDATE articles SET content_hash = ?, processing_hash = ? WHERE id = ?", (c_hash, p_hash, row["id"]))

            # Backfill sources with last_fetch_attempt_at & last_publication_at
            cursor.execute("""
                UPDATE sources
                SET last_fetch_attempt_at = last_fetched_at
                WHERE last_fetch_attempt_at IS NULL AND last_fetched_at IS NOT NULL
            """)
            cursor.execute("""
                UPDATE sources
                SET last_successful_fetch_at = last_fetched_at
                WHERE last_successful_fetch_at IS NULL AND last_fetched_at IS NOT NULL
            """)
            cursor.execute("""
                UPDATE sources
                SET last_fetch_status = 'success'
                WHERE last_fetch_status IS NULL AND health_status = 'healthy' AND last_fetched_at IS NOT NULL
            """)
            cursor.execute("""
                UPDATE sources
                SET last_publication_at = (SELECT MAX(published_at) FROM articles WHERE source_id = sources.id)
                WHERE last_publication_at IS NULL
            """)
            conn.commit()

    def get_all_sources(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT s.*, 
                       (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id) AS current_article_count,
                       (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id AND a.processing_status = 'processed') AS processed_articles_count,
                       (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id AND a.processing_status = 'pending') AS pending_articles_count,
                       (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id AND a.processing_status = 'processing') AS processing_articles_count,
                       (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id AND a.processing_status = 'failed') AS failed_articles_count
                FROM sources s
                ORDER BY s.is_enabled DESC, s.name ASC
            """)
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def get_source_by_id(self, source_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT s.*, 
                       (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id) AS current_article_count,
                       (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id AND a.processing_status = 'processed') AS processed_articles_count,
                       (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id AND a.processing_status = 'pending') AS pending_articles_count,
                       (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id AND a.processing_status = 'processing') AS processing_articles_count,
                       (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id AND a.processing_status = 'failed') AS failed_articles_count
                FROM sources s
                WHERE s.id = ?
            """, (source_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def add_source(self, source_data: Dict[str, Any]) -> Dict[str, Any]:
        now_str = datetime.now().isoformat()
        source_id = source_data.get("id") or source_data["name"].lower().replace(" ", "_").replace("-", "_")
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sources (
                    id, name, tamil_name, category, url, rss_url,
                    language, is_enabled, health_status, last_fetched_at,
                    last_fetch_attempt_at, last_successful_fetch_at, last_publication_at,
                    last_fetch_status, last_fetch_error, last_error,
                    etag, last_modified, skipped_duplicates_count, next_scheduled_fetch_at,
                    total_articles_fetched, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                source_id,
                source_data["name"],
                source_data.get("tamil_name", source_data["name"]),
                source_data.get("category", "Digital News"),
                source_data.get("url", ""),
                source_data["rss_url"],
                source_data.get("language", "ta"),
                1 if source_data.get("is_enabled", True) else 0,
                "healthy",
                None, None, None, None,
                "healthy", None, None,
                None, None, 0, None,
                0,
                now_str
            ))
            conn.commit()
        return self.get_source_by_id(source_id)

    def toggle_source(self, source_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT is_enabled FROM sources WHERE id = ?", (source_id,))
            row = cursor.fetchone()
            if not row:
                return None
            new_state = 0 if row["is_enabled"] else 1
            cursor.execute("UPDATE sources SET is_enabled = ? WHERE id = ?", (new_state, source_id))
            conn.commit()
        return self.get_source_by_id(source_id)

    def delete_source(self, source_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM articles WHERE source_id = ?", (source_id,))
            cursor.execute("DELETE FROM ingestion_logs WHERE source_id = ?", (source_id,))
            cursor.execute("DELETE FROM sources WHERE id = ?", (source_id,))
            conn.commit()
            return cursor.rowcount > 0

    def update_source_status(
        self,
        source_id: str,
        health_status: str,
        last_error: Optional[str] = None,
        new_articles_count: int = 0
    ):
        now_str = datetime.now().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE sources
                SET health_status = ?,
                    last_fetched_at = ?,
                    last_fetch_attempt_at = ?,
                    last_successful_fetch_at = CASE WHEN ? = 'healthy' THEN ? ELSE last_successful_fetch_at END,
                    last_error = ?,
                    last_fetch_error = ?,
                    last_fetch_status = CASE WHEN ? = 'healthy' THEN 'success' ELSE 'failed' END,
                    total_articles_fetched = total_articles_fetched + ?
                WHERE id = ?
            """, (health_status, now_str, now_str, health_status, now_str, last_error, last_error, health_status, new_articles_count, source_id))
            conn.commit()

    def update_source_fetch_status(
        self,
        source_id: str,
        health_status: str,
        fetch_status: str,
        last_error: Optional[str] = None,
        new_articles_count: int = 0,
        skipped_duplicates_count: int = 0,
        last_publication_at: Optional[str] = None,
        etag: Optional[str] = None,
        last_modified: Optional[str] = None,
        next_scheduled_fetch_at: Optional[str] = None,
    ):
        now_str = datetime.now().isoformat()
        is_success = fetch_status in ("success", "not_modified_304", "no_new_articles", "new_articles", "empty_feed", "stale_feed")
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE sources
                SET health_status = ?,
                    last_fetch_status = ?,
                    last_fetch_attempt_at = ?,
                    last_successful_fetch_at = CASE WHEN ? THEN ? ELSE last_successful_fetch_at END,
                    last_fetched_at = CASE WHEN ? THEN ? ELSE last_fetched_at END,
                    last_error = ?,
                    last_fetch_error = ?,
                    total_articles_fetched = total_articles_fetched + ?,
                    skipped_duplicates_count = COALESCE(skipped_duplicates_count, 0) + ?,
                    last_publication_at = COALESCE(?, last_publication_at),
                    etag = COALESCE(?, etag),
                    last_modified = COALESCE(?, last_modified),
                    next_scheduled_fetch_at = COALESCE(?, next_scheduled_fetch_at)
                WHERE id = ?
            """, (
                health_status,
                fetch_status,
                now_str,
                1 if is_success else 0, now_str,
                1 if is_success else 0, now_str,
                last_error,
                last_error,
                new_articles_count,
                skipped_duplicates_count,
                last_publication_at,
                etag,
                last_modified,
                next_scheduled_fetch_at,
                source_id
            ))
            conn.commit()

    def record_log(
        self,
        source_id: str,
        source_name: str,
        status: str,
        items_found: int,
        new_items_added: int,
        duration_ms: int,
        error_message: Optional[str] = None,
        skipped_duplicates: int = 0,
        http_status: int = 200
    ):
        now_str = datetime.now().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO ingestion_logs (
                    source_id, source_name, timestamp, status,
                    items_found, new_items_added, skipped_duplicates, http_status,
                    duration_ms, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                source_id, source_name, now_str, status,
                items_found, new_items_added, skipped_duplicates, http_status,
                duration_ms, error_message
            ))
            conn.commit()

    def get_recent_logs(self, limit: int = 30) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM ingestion_logs
                ORDER BY id DESC
                LIMIT ?
            """, (limit,))
            return [dict(r) for r in cursor.fetchall()]

    def find_existing_article(
        self,
        canonical_url: str,
        source_url: Optional[str] = None,
        publisher_guid: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM articles
                WHERE canonical_url = ?
                   OR source_url = ?
                   OR (publisher_guid IS NOT NULL AND publisher_guid != '' AND publisher_guid = ?)
                LIMIT 1
            """, (canonical_url, source_url or canonical_url, publisher_guid or ""))
            row = cursor.fetchone()
            if not row:
                return None
            d = dict(row)
            d["party_codes"] = json.loads(d["party_codes"])
            d["leader_names"] = json.loads(d["leader_names"])
            d["topics"] = json.loads(d["topics"])
            d["tamil_variations"] = json.loads(d["tamil_variations"])
            d["engagement_estimated"] = json.loads(d["engagement_estimated"])
            return d

    def touch_article_seen(self, article_id: str):
        now_str = datetime.now().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE articles SET last_seen_at = ? WHERE id = ?", (now_str, article_id))
            conn.commit()

    def update_article_content(self, article_id: str, article_dict: Dict[str, Any]):
        now_str = datetime.now().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE articles
                SET title = ?,
                    tamil_title = ?,
                    summary = ?,
                    tamil_summary = ?,
                    party_codes = ?,
                    leader_names = ?,
                    sentiment = ?,
                    sentiment_score = ?,
                    topics = ?,
                    tamil_variations = ?,
                    content_hash = ?,
                    processing_hash = ?,
                    processing_status = ?,
                    processed_at = ?,
                    last_seen_at = ?,
                    processing_attempts = processing_attempts + 1
                WHERE id = ?
            """, (
                article_dict["title"],
                article_dict["tamil_title"],
                article_dict["summary"],
                article_dict["tamil_summary"],
                json.dumps(article_dict["party_codes"]),
                json.dumps(article_dict["leader_names"]),
                article_dict["sentiment"],
                article_dict["sentiment_score"],
                json.dumps(article_dict["topics"]),
                json.dumps(article_dict["tamil_variations"]),
                article_dict.get("content_hash"),
                article_dict.get("processing_hash"),
                article_dict.get("processing_status", "processed"),
                now_str,
                now_str,
                article_id
            ))
            conn.commit()

    def save_article(self, article_dict: Dict[str, Any]) -> bool:
        """
        Saves article to SQLite with deduplication on canonical_url / source_url.
        Returns True if newly inserted, False if duplicate.
        """
        now_str = datetime.now().isoformat()
        canonical_url = article_dict.get("canonical_url") or article_dict["source_url"]
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO articles (
                        id, source_id, source_name, title, tamil_title,
                        summary, tamil_summary, source_url, canonical_url, publisher_guid,
                        published_at, party_codes, leader_names, sentiment, sentiment_score,
                        topics, tamil_variations, engagement_estimated,
                        data_status, analysis_provider, content_hash, processing_hash,
                        processing_status, processed_at, processing_attempts, last_seen_at, first_seen_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    article_dict["id"],
                    article_dict["source_id"],
                    article_dict["source_name"],
                    article_dict["title"],
                    article_dict["tamil_title"],
                    article_dict["summary"],
                    article_dict["tamil_summary"],
                    article_dict["source_url"],
                    canonical_url,
                    article_dict.get("publisher_guid", article_dict["id"]),
                    article_dict["published_at"],
                    json.dumps(article_dict["party_codes"]),
                    json.dumps(article_dict["leader_names"]),
                    article_dict["sentiment"],
                    article_dict["sentiment_score"],
                    json.dumps(article_dict["topics"]),
                    json.dumps(article_dict["tamil_variations"]),
                    json.dumps(article_dict["engagement_estimated"]),
                    article_dict.get("data_status", "live_rss"),
                    article_dict.get("analysis_provider", "tamil_nlp_engine"),
                    article_dict.get("content_hash"),
                    article_dict.get("processing_hash"),
                    article_dict.get("processing_status", "processed"),
                    article_dict.get("processed_at", now_str),
                    article_dict.get("processing_attempts", 1),
                    article_dict.get("last_seen_at", now_str),
                    article_dict.get("first_seen_at", now_str)
                ))
                conn.commit()
                return True
            except sqlite3.IntegrityError:
                # Duplicate article URL or canonical URL
                return False

    def get_live_articles(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM articles ORDER BY published_at DESC")
            rows = cursor.fetchall()
            articles = []
            for r in rows:
                d = dict(r)
                d["party_codes"] = json.loads(d["party_codes"])
                d["leader_names"] = json.loads(d["leader_names"])
                d["topics"] = json.loads(d["topics"])
                d["tamil_variations"] = json.loads(d["tamil_variations"])
                d["engagement_estimated"] = json.loads(d["engagement_estimated"])
                articles.append(d)
            return articles

    def get_live_article_by_id(self, article_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM articles WHERE id = ?", (article_id,))
            row = cursor.fetchone()
            if not row:
                return None
            d = dict(row)
            d["party_codes"] = json.loads(d["party_codes"])
            d["leader_names"] = json.loads(d["leader_names"])
            d["topics"] = json.loads(d["topics"])
            d["tamil_variations"] = json.loads(d["tamil_variations"])
            d["engagement_estimated"] = json.loads(d["engagement_estimated"])
            return d

    def get_system_freshness(self) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    MAX(last_successful_fetch_at) as last_collection_at,
                    COUNT(CASE WHEN is_enabled = 1 THEN 1 END) as enabled_sources,
                    COUNT(CASE WHEN is_enabled = 1 AND health_status = 'healthy' THEN 1 END) as healthy_sources,
                    (SELECT MAX(published_at) FROM articles) as latest_publication_at
                FROM sources
            """)
            row = cursor.fetchone()
            return {
                "last_collection_at": row["last_collection_at"],
                "enabled_sources": row["enabled_sources"] or 0,
                "healthy_sources": row["healthy_sources"] or 0,
                "latest_publication_at": row["latest_publication_at"]
            }

    def claim_article_processing(self, article_id: str) -> bool:
        """
        Atomically claims an article for processing if not currently being processed.
        Returns True if claimed, False if already processing.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE articles
                SET processing_status = 'processing',
                    processing_attempts = COALESCE(processing_attempts, 0) + 1
                WHERE id = ? AND (processing_status != 'processing' OR processing_status IS NULL)
            """, (article_id,))
            conn.commit()
            return cursor.rowcount > 0

    def find_brief(
        self,
        data_status: str,
        period: str,
        evidence_hash: str,
        config_version: str
    ) -> Optional[Dict[str, Any]]:
        """Finds cached brief matching data_status, period, evidence_hash, and config_version."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM intelligence_briefs
                WHERE data_status = ? AND period = ? AND evidence_hash = ? AND config_version = ?
                ORDER BY generated_at DESC LIMIT 1
            """, (data_status, period, evidence_hash, config_version))
            row = cursor.fetchone()
            if not row:
                return None
            d = dict(row)
            d["key_developments"] = json.loads(d["key_developments"])
            d["emerging_topics"] = json.loads(d["emerging_topics"])
            d["party_insights"] = json.loads(d["party_insights"])
            d["supporting_article_ids"] = json.loads(d["supporting_article_ids"])
            d["evidence_articles"] = json.loads(d["evidence_articles"])
            return d

    def get_latest_brief(
        self,
        data_status: str,
        period: str
    ) -> Optional[Dict[str, Any]]:
        """Gets most recent brief for data_status and period."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM intelligence_briefs
                WHERE data_status = ? AND period = ?
                ORDER BY generated_at DESC LIMIT 1
            """, (data_status, period))
            row = cursor.fetchone()
            if not row:
                return None
            d = dict(row)
            d["key_developments"] = json.loads(d["key_developments"])
            d["emerging_topics"] = json.loads(d["emerging_topics"])
            d["party_insights"] = json.loads(d["party_insights"])
            d["supporting_article_ids"] = json.loads(d["supporting_article_ids"])
            d["evidence_articles"] = json.loads(d["evidence_articles"])
            return d

    def save_brief(self, brief_dict: Dict[str, Any]) -> bool:
        """Persists generated intelligence brief."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO intelligence_briefs (
                    id, data_status, period, window_start, window_end,
                    evidence_hash, config_version, generated_at,
                    sample_size, publisher_count,
                    brief_english, brief_tamil,
                    key_developments, emerging_topics, party_insights,
                    supporting_article_ids, evidence_articles, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                brief_dict["id"],
                brief_dict["data_status"],
                brief_dict["period"],
                brief_dict["window_start"],
                brief_dict["window_end"],
                brief_dict["evidence_hash"],
                brief_dict["config_version"],
                brief_dict["generated_at"],
                brief_dict["sample_size"],
                brief_dict["publisher_count"],
                brief_dict["brief_english"],
                brief_dict["brief_tamil"],
                json.dumps(brief_dict.get("key_developments", [])),
                json.dumps(brief_dict.get("emerging_topics", [])),
                json.dumps(brief_dict.get("party_insights", [])),
                json.dumps(brief_dict.get("supporting_article_ids", [])),
                json.dumps(brief_dict.get("evidence_articles", [])),
                brief_dict.get("status", "sufficient_data")
            ))
            conn.commit()
            return True

source_registry = SourceRegistry()
