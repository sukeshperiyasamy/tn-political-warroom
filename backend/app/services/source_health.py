import json
import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.app.data.db import get_connection, is_postgres, DB_PATH
from backend.app.connectors import get_all_connectors, get_connector

class SourceHealthService:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or DB_PATH
        self._initialized = False

    def _get_connection(self):
        return get_connection(self.db_path)

    def ensure_initialized(self):
        """
        Guaranteed post-migration initialization.
        Ensures connector rows and default telemetry exist in the configured database.
        Safe to call multiple times (idempotent).
        """
        if self._initialized:
            return
        self._ensure_connector_rows()
        self._initialized = True

    def _ensure_connector_rows(self):
        connectors = get_all_connectors()
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for platform, conn_inst in connectors.items():
                is_cfg, msg = conn_inst.validate_configuration()
                initial_status = "NOT_CONFIGURED" if not is_cfg else "HEALTHY"

                if is_postgres():
                    # Neon PostgreSQL: Map to existing social_connectors schema with config_json payload
                    cfg_payload = {
                        "name": conn_inst.name,
                        "credentials_configured": 1 if is_cfg else 0,
                        "supported_metrics": conn_inst.supported_metrics,
                        "configuration_notes": msg,
                        "quota_used": 0,
                        "quota_limit": 10000,
                        "last_successful_fetch": None,
                        "records_collected": 0,
                        "error_count": 0
                    }
                    cursor.execute("""
                        INSERT INTO social_connectors (
                            id, platform, display_name, description, status, auth_type,
                            is_enabled, config_json
                        ) VALUES (?, ?, ?, ?, ?, 'NONE', 1, ?)
                        ON CONFLICT (platform) DO UPDATE SET
                            display_name = EXCLUDED.display_name,
                            description = EXCLUDED.description,
                            config_json = EXCLUDED.config_json
                    """, (
                        f"conn_{platform}",
                        platform,
                        conn_inst.name,
                        conn_inst.name,
                        initial_status,
                        json.dumps(cfg_payload)
                    ))
                else:
                    # SQLite: Standard local development schema
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
        self.ensure_initialized()
        connector = get_connector(platform)
        if not connector:
            return {"error": f"Unknown connector: {platform}"}

        health = connector.health_check()
        now_iso = datetime.now(timezone.utc).isoformat()
        err_msg = health.message if health.status.value in ["ERROR", "WARNING", "RATE_LIMITED"] else None

        with self._get_connection() as conn:
            cursor = conn.cursor()
            if is_postgres():
                # Fetch existing config_json to update fields
                cursor.execute("SELECT config_json FROM social_connectors WHERE platform = ?", (platform,))
                row = cursor.fetchone()
                cfg = json.loads(row["config_json"]) if row and row.get("config_json") else {}
                cfg["credentials_configured"] = 1 if health.is_configured else 0
                cfg["quota_used"] = health.quota_used
                cfg["quota_limit"] = health.quota_limit
                cfg["error_count"] = health.error_count
                if health.status.value == "HEALTHY":
                    cfg["last_successful_fetch"] = now_iso

                cursor.execute("""
                    UPDATE social_connectors SET
                        status = ?,
                        last_health_check_at = ?,
                        error_message = ?,
                        rate_limit_remaining = ?,
                        config_json = ?
                    WHERE platform = ?
                """, (
                    health.status.value,
                    now_iso,
                    err_msg,
                    health.quota_limit - health.quota_used if health.quota_limit else None,
                    json.dumps(cfg),
                    platform
                ))
            else:
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
                    err_msg,
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
        self.ensure_initialized()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM social_connectors ORDER BY platform ASC")
            rows = cursor.fetchall()
            result = []
            for row in rows:
                r = dict(row)
                cfg = json.loads(r.get("config_json") or "{}") if "config_json" in r else {}

                # Unified attribute mapping across PostgreSQL (Neon) and SQLite schemas
                name = r.get("name") or r.get("display_name") or cfg.get("name") or r.get("platform")
                r["name"] = name
                r["display_name"] = name

                if "credentials_configured" not in r or r["credentials_configured"] is None:
                    r["credentials_configured"] = cfg.get("credentials_configured", 0)

                if "supported_metrics" in r and isinstance(r["supported_metrics"], str):
                    r["supported_metrics"] = json.loads(r["supported_metrics"] or "[]")
                elif "supported_metrics" not in r:
                    r["supported_metrics"] = cfg.get("supported_metrics", [])

                if "quota_used" not in r or r["quota_used"] is None:
                    r["quota_used"] = cfg.get("quota_used", 0)

                if "quota_limit" not in r or r["quota_limit"] is None:
                    r["quota_limit"] = cfg.get("quota_limit", 10000)

                if "last_successful_fetch" not in r or r["last_successful_fetch"] is None:
                    r["last_successful_fetch"] = cfg.get("last_successful_fetch")

                if "last_fetch_attempt" not in r or r["last_fetch_attempt"] is None:
                    r["last_fetch_attempt"] = r.get("last_health_check_at")

                if "last_error" not in r or r["last_error"] is None:
                    r["last_error"] = r.get("error_message")

                if "error_count" not in r or r["error_count"] is None:
                    r["error_count"] = cfg.get("error_count", 0)

                if "records_collected" not in r or r["records_collected"] is None:
                    r["records_collected"] = cfg.get("records_collected", 0)

                if "configuration_notes" not in r or r["configuration_notes"] is None:
                    r["configuration_notes"] = r.get("description") or cfg.get("configuration_notes")

                conn_inst = get_connector(r["platform"])
                if conn_inst:
                    r["setup_instructions"] = conn_inst.get_setup_instructions()
                    r["quota_info"] = conn_inst.get_quota_status()

                # Count records processed in social_posts
                try:
                    cursor.execute("SELECT COUNT(*) FROM social_posts WHERE platform = ?", (r["platform"],))
                    cnt_row = cursor.fetchone()
                    cnt = cnt_row[0] if cnt_row else 0
                    r["records_collected"] = max(r.get("records_collected", 0), cnt)
                except Exception:
                    pass

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
