import json
import sqlite3
import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.app.data.migrations import DB_PATH
from backend.app.connectors import get_all_connectors, get_connector

class SourceHealthService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._ensure_connector_rows()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_connector_rows(self):
        connectors = get_all_connectors()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for platform, conn_inst in connectors.items():
                is_cfg, msg = conn_inst.validate_configuration()
                initial_status = "NOT_CONFIGURED" if not is_cfg else "HEALTHY"
                cursor.execute("""
                    INSERT INTO social_connectors (
                        platform, name, is_enabled, status, credentials_configured,
                        supported_metrics, configuration_notes, quota_used, quota_limit
                    ) VALUES (?, ?, 1, ?, ?, ?, ?, 0, 10000)
                    ON CONFLICT(platform) DO UPDATE SET
                        name=excluded.name,
                        supported_metrics=excluded.supported_metrics,
                        credentials_configured=excluded.credentials_configured
                """, (
                    platform,
                    conn_inst.name,
                    initial_status,
                    1 if is_cfg else 0,
                    json.dumps(conn_inst.supported_metrics),
                    msg
                ))
            conn.commit()

    def check_connector(self, platform: str) -> Dict[str, Any]:
        connector = get_connector(platform)
        if not connector:
            return {"error": f"Unknown connector: {platform}"}

        health = connector.health_check()
        now_iso = datetime.now(timezone.utc).isoformat()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE social_connectors SET
                    status = ?,
                    credentials_configured = ?,
                    last_fetch_attempt = ?,
                    last_error = ?,
                    error_count = ?,
                    quota_used = ?,
                    quota_limit = ?
                WHERE platform = ?
            """, (
                health.status.value,
                1 if health.is_configured else 0,
                now_iso,
                health.message if health.status.value in ["ERROR", "WARNING", "RATE_LIMITED"] else None,
                health.error_count,
                health.quota_used,
                health.quota_limit,
                platform
            ))
            if health.status.value == "HEALTHY":
                cursor.execute("""
                    UPDATE social_connectors SET last_successful_fetch = ? WHERE platform = ?
                """, (now_iso, platform))
            conn.commit()

        return {
            "platform": platform,
            "name": connector.name,
            "status": health.status.value,
            "is_configured": health.is_configured,
            "message": health.message,
            "quota_used": health.quota_used,
            "quota_limit": health.quota_limit,
            "latency_ms": health.latency_ms,
            "setup_instructions": connector.get_setup_instructions()
        }

    def get_all_connectors_summary(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM social_connectors ORDER BY platform ASC")
            rows = cursor.fetchall()
            result = []
            for row in rows:
                r = dict(row)
                r["supported_metrics"] = json.loads(r.get("supported_metrics") or "[]")
                conn_inst = get_connector(r["platform"])
                if conn_inst:
                    r["setup_instructions"] = conn_inst.get_setup_instructions()
                    r["quota_info"] = conn_inst.get_quota_status()

                # Count records processed in social_posts
                cursor.execute("SELECT COUNT(*) FROM social_posts WHERE platform = ?", (r["platform"],))
                cnt = cursor.fetchone()[0]
                r["records_collected"] = max(r.get("records_collected", 0), cnt)

                # Normalize status for client reporting
                if not r.get("is_enabled", 1):
                    r["status"] = "DISABLED"
                elif not r.get("credentials_configured"):
                    r["status"] = "NOT_CONFIGURED"
                elif r.get("status") == "HEALTHY":
                    r["status"] = "LIVE"

                r["is_live"] = (r["status"] == "LIVE" and r.get("last_successful_fetch") is not None)
                result.append(r)
            return result

source_health_service = SourceHealthService()
