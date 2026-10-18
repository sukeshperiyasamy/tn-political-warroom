"""
Neon Serverless PostgreSQL Schema Migration & Seed Sync
Creates all 12 operational War Room tables on Neon and synchronizes base seed records.
"""

import os
import psycopg
from dotenv import load_dotenv

# Load .env from workspace root or current directory
root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env")
load_dotenv(root_env)
load_dotenv(".env")

SCHEMA_SQL = """
-- 1. Sources Table
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
    skipped_duplicates_count INTEGER DEFAULT 0
);

-- 2. Articles Table
CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    tamil_title TEXT NOT NULL,
    summary TEXT,
    tamil_summary TEXT,
    url TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    published_at TEXT NOT NULL,
    party_codes TEXT,
    leader_names TEXT,
    sentiment TEXT,
    sentiment_score REAL DEFAULT 0.0,
    topics TEXT,
    reach INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    data_status TEXT DEFAULT 'live_rss',
    analysis_provider TEXT DEFAULT 'rule_based',
    ingested_at TEXT,
    collection_mode TEXT NOT NULL DEFAULT 'LIVE'
);

-- 3. Ingestion Logs
CREATE TABLE IF NOT EXISTS ingestion_logs (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    status TEXT NOT NULL,
    items_found INTEGER DEFAULT 0,
    items_ingested INTEGER DEFAULT 0,
    error_message TEXT,
    duration_ms REAL DEFAULT 0,
    timestamp TEXT NOT NULL
);

-- 4. Intelligence Briefs
CREATE TABLE IF NOT EXISTS intelligence_briefs (
    id TEXT PRIMARY KEY,
    brief_date TEXT NOT NULL,
    reporting_window_start TEXT NOT NULL,
    reporting_window_end TEXT NOT NULL,
    executive_summary_en TEXT NOT NULL,
    executive_summary_ta TEXT NOT NULL,
    top_topics_json TEXT NOT NULL,
    party_coverage_json TEXT NOT NULL,
    leader_coverage_json TEXT NOT NULL,
    sentiment_distribution_json TEXT NOT NULL,
    cross_platform_narratives_json TEXT NOT NULL,
    sources_monitored_count INTEGER NOT NULL,
    total_articles_analyzed INTEGER NOT NULL,
    generated_at TEXT NOT NULL,
    collection_mode TEXT NOT NULL DEFAULT 'LIVE'
);

-- 5. Social Posts Table
CREATE TABLE IF NOT EXISTS social_posts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    external_id TEXT NOT NULL,
    source_name TEXT NOT NULL,
    author_handle TEXT NOT NULL,
    author_display_name TEXT NOT NULL,
    published_at TEXT NOT NULL,
    post_text TEXT NOT NULL,
    post_url TEXT NOT NULL,
    media_urls TEXT DEFAULT '[]',
    thumbnail_url TEXT,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    estimated_total_reach INTEGER DEFAULT 0,
    party_codes TEXT DEFAULT '[]',
    leader_names TEXT DEFAULT '[]',
    topics TEXT DEFAULT '[]',
    hashtags TEXT DEFAULT '[]',
    sentiment TEXT DEFAULT 'neutral',
    sentiment_score REAL DEFAULT 0.0,
    data_status TEXT NOT NULL DEFAULT 'live_post',
    collection_mode TEXT NOT NULL DEFAULT 'LIVE',
    scenario_id TEXT,
    scenario_stage INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CONSTRAINT uq_platform_external_mode UNIQUE (platform, external_id, collection_mode)
);

-- 6. Engagement Snapshots Table
CREATE TABLE IF NOT EXISTS engagement_snapshots (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    snapshot_at TEXT NOT NULL,
    view_count INTEGER NOT NULL,
    like_count INTEGER NOT NULL,
    comment_count INTEGER NOT NULL,
    share_count INTEGER NOT NULL,
    total_engagement INTEGER NOT NULL,
    velocity_views_per_hour REAL DEFAULT 0.0,
    velocity_likes_per_hour REAL DEFAULT 0.0,
    collection_mode TEXT NOT NULL DEFAULT 'LIVE',
    scenario_stage INTEGER
);

-- 7. Story Clusters
CREATE TABLE IF NOT EXISTS story_clusters (
    id TEXT PRIMARY KEY,
    cluster_title TEXT NOT NULL,
    cluster_description TEXT NOT NULL,
    primary_topic TEXT NOT NULL,
    entity_tags TEXT NOT NULL,
    first_seen_at TEXT NOT NULL,
    last_updated_at TEXT NOT NULL,
    post_count INTEGER DEFAULT 0,
    total_reach INTEGER DEFAULT 0,
    cross_platform_count INTEGER DEFAULT 0,
    platforms_involved TEXT NOT NULL,
    narrative_state TEXT NOT NULL DEFAULT 'emerging',
    key_narratives TEXT NOT NULL,
    collection_mode TEXT NOT NULL DEFAULT 'LIVE'
);

-- 8. Social Connectors
CREATE TABLE IF NOT EXISTS social_connectors (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    auth_type TEXT NOT NULL DEFAULT 'NONE',
    last_health_check_at TEXT,
    error_message TEXT,
    rate_limit_remaining INTEGER,
    rate_limit_resets_at TEXT,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    config_json TEXT DEFAULT '{}'
);

-- 9. Topic Registry
CREATE TABLE IF NOT EXISTS topic_registry (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    tamil_name TEXT NOT NULL,
    category TEXT NOT NULL,
    baseline_growth_rate REAL DEFAULT 1.0,
    current_momentum_score REAL DEFAULT 0.0,
    last_calculated_at TEXT
);

-- 10. Social Fetch Runs
CREATE TABLE IF NOT EXISTS social_fetch_runs (
    id TEXT PRIMARY KEY,
    connector_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,
    records_fetched INTEGER DEFAULT 0,
    records_deduped INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    error_message TEXT,
    execution_time_ms REAL
);

-- 11. Demo Scenario State
CREATE TABLE IF NOT EXISTS demo_scenario_state (
    scenario_id TEXT PRIMARY KEY,
    current_stage INTEGER NOT NULL DEFAULT 1,
    stage_updated_at TEXT NOT NULL,
    replay_count INTEGER NOT NULL DEFAULT 0,
    stage_metadata TEXT DEFAULT '{}'
);

-- 12. Client Configuration Table
CREATE TABLE IF NOT EXISTS client_configuration (
    id TEXT PRIMARY KEY DEFAULT 'default',
    client_name TEXT NOT NULL,
    client_tagline TEXT NOT NULL,
    logo_url TEXT,
    brand_color TEXT NOT NULL DEFAULT '#18181B',
    accent_color TEXT NOT NULL DEFAULT '#D97706',
    selected_parties TEXT NOT NULL,
    selected_leaders TEXT NOT NULL,
    topics_of_interest TEXT NOT NULL,
    authorized_sources TEXT NOT NULL,
    authorized_connectors TEXT NOT NULL,
    default_language TEXT NOT NULL DEFAULT 'en',
    default_demo_scenario TEXT NOT NULL DEFAULT 'scenario_policy_announcement',
    updated_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
);

-- 13. Article Editorial Versions & Final Output
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
);
"""

ALTER_COLUMNS_SQL = """
ALTER TABLE sources ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'NEWS_MEDIA';
ALTER TABLE sources ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web';
ALTER TABLE sources ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS current_article_count INTEGER DEFAULT 0;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS total_articles_fetched INTEGER DEFAULT 0;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS next_scheduled_fetch_at TEXT;

ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS publisher_guid TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS tamil_variations TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS engagement_estimated TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS processing_hash TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'processed';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS processed_at TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS processing_attempts INTEGER DEFAULT 1;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS last_seen_at TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS first_seen_at TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'NEWS_MEDIA';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web';
ALTER TABLE articles ALTER COLUMN url DROP NOT NULL;
ALTER TABLE articles ALTER COLUMN source DROP NOT NULL;

ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'SOCIAL_MEDIA';

ALTER TABLE intelligence_briefs ALTER COLUMN brief_date DROP NOT NULL;
ALTER TABLE intelligence_briefs ALTER COLUMN reporting_window_start DROP NOT NULL;
ALTER TABLE intelligence_briefs ALTER COLUMN reporting_window_end DROP NOT NULL;
ALTER TABLE intelligence_briefs ALTER COLUMN executive_summary_en DROP NOT NULL;
ALTER TABLE intelligence_briefs ALTER COLUMN executive_summary_ta DROP NOT NULL;
ALTER TABLE intelligence_briefs ALTER COLUMN top_topics_json DROP NOT NULL;
ALTER TABLE intelligence_briefs ALTER COLUMN party_coverage_json DROP NOT NULL;
ALTER TABLE intelligence_briefs ALTER COLUMN leader_coverage_json DROP NOT NULL;
ALTER TABLE intelligence_briefs ALTER COLUMN sentiment_distribution_json DROP NOT NULL;
ALTER TABLE intelligence_briefs ALTER COLUMN cross_platform_narratives_json DROP NOT NULL;
ALTER TABLE intelligence_briefs ALTER COLUMN sources_monitored_count DROP NOT NULL;
ALTER TABLE intelligence_briefs ALTER COLUMN total_articles_analyzed DROP NOT NULL;

ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS data_status TEXT;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS period TEXT;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS window_start TEXT;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS window_end TEXT;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS evidence_hash TEXT;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS config_version TEXT;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS sample_size INTEGER;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS publisher_count INTEGER;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS brief_english TEXT;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS brief_tamil TEXT;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS key_developments TEXT;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS emerging_topics TEXT;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS party_insights TEXT;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS supporting_article_ids TEXT;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS evidence_articles TEXT;
ALTER TABLE intelligence_briefs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sufficient_data';

ALTER TABLE ingestion_logs ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE ingestion_logs ADD COLUMN IF NOT EXISTS http_status INTEGER DEFAULT 200;
ALTER TABLE ingestion_logs ADD COLUMN IF NOT EXISTS new_items_added INTEGER DEFAULT 0;
ALTER TABLE ingestion_logs ADD COLUMN IF NOT EXISTS skipped_duplicates INTEGER DEFAULT 0;
ALTER TABLE ingestion_logs ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
"""

def migrate_neon():
    from .db import get_database_url
    db_url = get_database_url()
    if not db_url:
        print("DATABASE_URL not found in environment.")
        return False

    print("Connecting to Neon PostgreSQL...")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)
            cur.execute(ALTER_COLUMNS_SQL)
            conn.commit()

            # Seed any missing default sources and update source_type & platform
            try:
                from backend.app.services.source_registry import DEFAULT_SOURCES
                from datetime import datetime
                now_str = datetime.now().isoformat()
                for src in DEFAULT_SOURCES:
                    cur.execute("""
                        INSERT INTO sources (
                            id, name, tamil_name, category, source_type, platform,
                            url, rss_url, language, is_enabled, health_status,
                            last_fetched_at, total_articles_fetched, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            source_type = EXCLUDED.source_type,
                            platform = EXCLUDED.platform,
                            category = EXCLUDED.category
                    """, (
                        src["id"], src["name"], src["tamil_name"], src["category"],
                        src.get("source_type", "NEWS_MEDIA"), src.get("platform", "web"),
                        src["url"], src["rss_url"], src.get("language", "ta"),
                        src.get("is_enabled", 1), src.get("health_status", "healthy"),
                        src.get("last_fetched_at"), src.get("total_articles_fetched", 0),
                        now_str
                    ))
                conn.commit()
                print(f"Neon: Seeded / verified {len(DEFAULT_SOURCES)} default sources.")
            except Exception as ex:
                print(f"Neon: Note seeding sources: {ex}")

            # Check if articles table is empty; if so, populate from SQLite warroom.db if available
            cur.execute("SELECT COUNT(*) FROM articles")
            art_count = cur.fetchone()[0]
            if art_count == 0:
                try:
                    import sqlite3
                    sqlite_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "warroom.db")
                    if os.path.exists(sqlite_path):
                        sl_conn = sqlite3.connect(sqlite_path)
                        sl_conn.row_factory = sqlite3.Row
                        sl_cur = sl_conn.cursor()
                        sl_cur.execute("""
                            SELECT id, source_id, source_name, title, tamil_title, summary,
                                   tamil_summary, source_url, canonical_url, publisher_guid,
                                   published_at, party_codes, leader_names, sentiment,
                                   sentiment_score, topics, tamil_variations, engagement_estimated,
                                   data_status, analysis_provider, first_seen_at
                            FROM articles
                        """)
                        rows = sl_cur.fetchall()
                        for r in rows:
                            cur.execute("""
                                INSERT INTO articles (
                                    id, title, tamil_title, summary, tamil_summary, url,
                                    source, source_id, source_name, source_url, canonical_url,
                                    publisher_guid, published_at, party_codes, leader_names,
                                    sentiment, sentiment_score, topics, tamil_variations,
                                    engagement_estimated, data_status, analysis_provider,
                                    first_seen_at, source_type, platform, collection_mode
                                ) VALUES (
                                    %s, %s, %s, %s, %s, %s,
                                    %s, %s, %s, %s, %s,
                                    %s, %s, %s, %s,
                                    %s, %s, %s, %s,
                                    %s, %s, %s,
                                    %s, %s, %s, %s
                                ) ON CONFLICT (id) DO NOTHING
                            """, (
                                r["id"], r["title"], r["tamil_title"], r["summary"], r["tamil_summary"], r["source_url"],
                                r["source_name"], r["source_id"], r["source_name"], r["source_url"], r["canonical_url"],
                                r["publisher_guid"], r["published_at"], r["party_codes"], r["leader_names"],
                                r["sentiment"], r["sentiment_score"], r["topics"], r["tamil_variations"],
                                r["engagement_estimated"], r["data_status"], r["analysis_provider"],
                                r["first_seen_at"], "NEWS_MEDIA", "web", "LIVE"
                            ))
                        conn.commit()
                        print(f"Neon: Synchronized {len(rows)} articles from local database.")
                        sl_conn.close()
                except Exception as ex:
                    print(f"Neon: Note syncing articles from SQLite: {ex}")

            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;")
            tables = [r[0] for r in cur.fetchall()]
            print(f"Neon migration successful! Total {len(tables)} tables present:")
            for t in tables:
                print(f"  [+] {t}")
    return True

if __name__ == "__main__":
    migrate_neon()
