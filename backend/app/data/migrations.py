import sqlite3
import os
import json
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "warroom.db")

def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, timeout=10.0)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    conn.row_factory = sqlite3.Row
    return conn

def run_migrations(db_path: str = DB_PATH):
    """
    Applies idempotent schema migrations for Phase 3 Multi-Source Social Media Intelligence.
    Preserves all existing tables: sources, articles, ingestion_logs, intelligence_briefs.
    """
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()

        # 1. Social Posts Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS social_posts (
                id TEXT PRIMARY KEY,
                platform TEXT NOT NULL,
                platform_post_id TEXT NOT NULL,
                canonical_url TEXT NOT NULL,
                author_name TEXT,
                author_handle TEXT,
                title TEXT,
                content TEXT NOT NULL,
                language TEXT NOT NULL DEFAULT 'ta',
                media_type TEXT DEFAULT 'text',
                thumbnail_url TEXT,
                published_at TEXT NOT NULL,
                first_seen_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                likes_count INTEGER,
                comments_count INTEGER,
                shares_count INTEGER,
                views_count INTEGER,
                quotes_count INTEGER,
                party_codes TEXT NOT NULL DEFAULT '[]',
                leader_names TEXT NOT NULL DEFAULT '[]',
                topics TEXT NOT NULL DEFAULT '[]',
                hashtags TEXT NOT NULL DEFAULT '[]',
                sentiment TEXT NOT NULL DEFAULT 'neutral',
                sentiment_score REAL NOT NULL DEFAULT 0.0,
                trend_score REAL NOT NULL DEFAULT 0.0,
                growth_rate_per_hour REAL DEFAULT 0.0,
                collection_mode TEXT NOT NULL DEFAULT 'LIVE',
                raw_metrics_available TEXT NOT NULL DEFAULT '[]',
                story_cluster_id TEXT,
                UNIQUE(platform, platform_post_id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sp_platform_published ON social_posts(platform, published_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sp_mode_published ON social_posts(collection_mode, published_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sp_trend_score ON social_posts(trend_score DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sp_cluster ON social_posts(story_cluster_id)")

        # 2. Engagement Snapshots Table (Time-series observations)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS engagement_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id TEXT NOT NULL,
                observed_at TEXT NOT NULL,
                likes INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                shares INTEGER DEFAULT 0,
                views INTEGER DEFAULT 0,
                growth_rate_per_hour REAL DEFAULT 0.0,
                fetch_run_id TEXT,
                FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_eng_post_observed ON engagement_snapshots(post_id, observed_at)")

        # 3. Story Clusters Table (Cross-platform narrative detection)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS story_clusters (
                id TEXT PRIMARY KEY,
                title_en TEXT NOT NULL,
                title_ta TEXT NOT NULL,
                lead_story TEXT,
                topic TEXT NOT NULL,
                first_observed_at TEXT NOT NULL,
                latest_observed_at TEXT NOT NULL,
                distinct_sources_count INTEGER DEFAULT 1,
                platforms_involved TEXT NOT NULL,
                total_engagement INTEGER DEFAULT 0,
                post_ids TEXT NOT NULL,
                news_article_ids TEXT NOT NULL,
                time_lag_minutes INTEGER DEFAULT 0,
                cluster_status TEXT DEFAULT 'active',
                collection_mode TEXT NOT NULL DEFAULT 'LIVE'
            )
        """)

        # Migration guard: add collection_mode if story_clusters already exists without it
        cursor.execute("PRAGMA table_info(story_clusters)")
        sc_cols = [r[1] for r in cursor.fetchall()]
        if "collection_mode" not in sc_cols:
            cursor.execute("ALTER TABLE story_clusters ADD COLUMN collection_mode TEXT NOT NULL DEFAULT 'LIVE'")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sc_mode ON story_clusters(collection_mode)")

        # 4. Social Connectors State & Config Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS social_connectors (
                platform TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                is_enabled INTEGER DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
                credentials_configured INTEGER DEFAULT 0,
                last_successful_fetch TEXT,
                last_fetch_attempt TEXT,
                last_error TEXT,
                error_count INTEGER DEFAULT 0,
                records_collected INTEGER DEFAULT 0,
                polling_interval_minutes INTEGER DEFAULT 15,
                lookback_hours INTEGER DEFAULT 24,
                max_records_per_run INTEGER DEFAULT 50,
                supported_metrics TEXT NOT NULL,
                quota_used INTEGER DEFAULT 0,
                quota_limit INTEGER DEFAULT 10000,
                quota_reset_at TEXT,
                configuration_notes TEXT
            )
        """)
        # 5. Topic and Entity Registry Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS topic_registry (
                id TEXT PRIMARY KEY,
                name_en TEXT NOT NULL,
                name_ta TEXT NOT NULL,
                category TEXT NOT NULL,
                keywords_en TEXT NOT NULL,
                keywords_ta TEXT NOT NULL,
                hashtags TEXT NOT NULL,
                negative_keywords TEXT DEFAULT '[]',
                related_party_codes TEXT DEFAULT '[]',
                related_leader_names TEXT DEFAULT '[]',
                last_reviewed_at TEXT,
                is_active INTEGER DEFAULT 1
            )
        """)

        # Migration guard: add Phase 4 provenance & entity columns to social_posts
        cursor.execute("PRAGMA table_info(social_posts)")
        sp_cols = [r[1] for r in cursor.fetchall()]
        if "acquisition_method" not in sp_cols:
            cursor.execute("ALTER TABLE social_posts ADD COLUMN acquisition_method TEXT DEFAULT 'api'")
        if "source_reliability" not in sp_cols:
            cursor.execute("ALTER TABLE social_posts ADD COLUMN source_reliability REAL DEFAULT 0.85")
        if "data_provenance" not in sp_cols:
            cursor.execute("ALTER TABLE social_posts ADD COLUMN data_provenance TEXT DEFAULT '{}'")
        if "matched_entities" not in sp_cols:
            cursor.execute("ALTER TABLE social_posts ADD COLUMN matched_entities TEXT DEFAULT '[]'")

        # 6. Social Fetch Runs (Diagnostics & Auditing)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS social_fetch_runs (
                id TEXT PRIMARY KEY,
                connector_platform TEXT NOT NULL,
                started_at TEXT NOT NULL,
                completed_at TEXT,
                status TEXT NOT NULL DEFAULT 'RUNNING',
                records_discovered INTEGER DEFAULT 0,
                records_inserted INTEGER DEFAULT 0,
                records_updated INTEGER DEFAULT 0,
                records_rejected INTEGER DEFAULT 0,
                duration_ms INTEGER DEFAULT 0,
                error_category TEXT,
                error_message TEXT,
                rate_limit_info TEXT DEFAULT '{}'
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sfr_platform_started ON social_fetch_runs(connector_platform, started_at)")

        # 7. Demo Scenario State (Deterministic Scenario Replay)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS demo_scenario_state (
                id TEXT PRIMARY KEY,
                scenario_id TEXT NOT NULL,
                scenario_name TEXT NOT NULL,
                current_step INTEGER DEFAULT 0,
                total_steps INTEGER DEFAULT 4,
                last_replayed_at TEXT,
                state_payload TEXT NOT NULL DEFAULT '{}'
            )
        """)

        # 8. Client Configuration (Customizable Client Profiles & Branding)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS client_configuration (
                id TEXT PRIMARY KEY DEFAULT 'default',
                client_name TEXT NOT NULL,
                client_tagline TEXT,
                logo_url TEXT,
                brand_color TEXT DEFAULT '#18181B',
                accent_color TEXT DEFAULT '#D97706',
                selected_parties TEXT NOT NULL DEFAULT '["DMK","AIADMK","TVK","BJP","NTK"]',
                selected_leaders TEXT NOT NULL DEFAULT '["M.K. Stalin","Edappadi K. Palaniswami","Thalapathy Vijay","K. Annamalai","Seeman"]',
                topics_of_interest TEXT NOT NULL DEFAULT '["2026 Assembly Election","Kalaignar Magalir Urimai Thogai","TVK Vijay Political Movement","Power Tariffs & TANGEDCO","Cauvery Riparian Rights & Agriculture"]',
                authorized_sources TEXT NOT NULL DEFAULT '["news18_tamil","polimer_news","the_hindu_tamil","bbc_tamil","puthiyathalaimurai","dinamalar"]',
                authorized_connectors TEXT NOT NULL DEFAULT '["youtube","x","instagram","facebook","reddit","news_rss","google_trends"]',
                default_language TEXT NOT NULL DEFAULT 'en',
                default_demo_scenario TEXT DEFAULT 'scenario_policy_announcement',
                updated_at TEXT NOT NULL,
                is_active INTEGER DEFAULT 1
            )
        """)

        cursor.execute("SELECT id FROM client_configuration WHERE id = 'default'")
        if not cursor.fetchone():
            now_iso = datetime.now(timezone.utc).isoformat()
            cursor.execute("""
                INSERT INTO client_configuration (
                    id, client_name, client_tagline, logo_url, brand_color, accent_color,
                    selected_parties, selected_leaders, topics_of_interest, authorized_sources,
                    authorized_connectors, default_language, default_demo_scenario, updated_at, is_active
                ) VALUES (
                    'default',
                    'Tamil Nadu Strategic Intelligence Bureau',
                    'அரசியல் பொது ஊடக நுண்ணறிவு & பகுப்பாய்வு மையம்',
                    '',
                    '#18181B',
                    '#D97706',
                    '["DMK","AIADMK","TVK","BJP","NTK"]',
                    '["M.K. Stalin","Edappadi K. Palaniswami","Thalapathy Vijay","K. Annamalai","Seeman"]',
                    '["2026 Assembly Election","Kalaignar Magalir Urimai Thogai","TVK Vijay Political Movement","Power Tariffs & TANGEDCO","Cauvery Riparian Rights & Agriculture"]',
                    '["news18_tamil","polimer_news","the_hindu_tamil","bbc_tamil","puthiyathalaimurai","dinamalar"]',
                    '["youtube","x","instagram","facebook","reddit","news_rss","google_trends"]',
                    'en',
                    'scenario_policy_announcement',
                    ?,
                    1
                )
            """, (now_iso,))
        # 9. Article Editorial Versions & Final Output Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS article_editorial_versions (
                article_id TEXT PRIMARY KEY,
                version_1_summary TEXT NOT NULL,
                version_2_detailed TEXT NOT NULL,
                version_3_social TEXT NOT NULL,
                final_version_type TEXT,
                final_version_content TEXT,
                is_finalized INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        # 10. Ensure source_type and platform columns exist in sources, articles, social_posts
        try:
            cursor.execute("ALTER TABLE sources ADD COLUMN source_type TEXT DEFAULT 'NEWS_MEDIA'")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE sources ADD COLUMN platform TEXT DEFAULT 'web'")
        except Exception:
            pass

        try:
            cursor.execute("ALTER TABLE articles ADD COLUMN source_type TEXT DEFAULT 'NEWS_MEDIA'")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE articles ADD COLUMN platform TEXT DEFAULT 'web'")
        except Exception:
            pass

        try:
            cursor.execute("ALTER TABLE social_posts ADD COLUMN source_type TEXT DEFAULT 'SOCIAL_MEDIA'")
        except Exception:
            pass

        conn.commit()

if __name__ == "__main__":
    run_migrations()
    print("Migrations executed successfully.")
