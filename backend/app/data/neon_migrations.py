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
"""

def migrate_neon():
    db_url = os.getenv("DIRECT_URL") or os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found in environment.")
        return False

    print("Connecting to Neon PostgreSQL...")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)
            conn.commit()

            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;")
            tables = [r[0] for r in cur.fetchall()]
            print(f"Neon migration successful! Created {len(tables)} tables:")
            for t in tables:
                print(f"  [+] {t}")
    return True

if __name__ == "__main__":
    migrate_neon()
