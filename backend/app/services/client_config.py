import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.app.data.migrations import DB_PATH, get_connection

DEFAULT_CONFIG = {
    "id": "default",
    "client_name": os.getenv("CLIENT_DISPLAY_NAME", "Tamil Nadu Strategic Intelligence Bureau"),
    "client_tagline": os.getenv("CLIENT_TAGLINE", "அரசியல் பொது ஊடக நுண்ணறிவு & பகுப்பாய்வு மையம்"),
    "logo_url": os.getenv("CLIENT_LOGO_URL", ""),
    "brand_color": "#18181B",
    "accent_color": "#D97706",
    "selected_parties": ["DMK", "AIADMK", "TVK", "BJP", "NTK"],
    "selected_leaders": ["M.K. Stalin", "Edappadi K. Palaniswami", "Thalapathy Vijay", "K. Annamalai", "Seeman"],
    "topics_of_interest": [
        "2026 Assembly Election",
        "Kalaignar Magalir Urimai Thogai",
        "TVK Vijay Political Movement",
        "Power Tariffs & TANGEDCO",
        "Cauvery Riparian Rights & Agriculture"
    ],
    "authorized_sources": ["news18_tamil", "polimer_news", "the_hindu_tamil", "bbc_tamil", "puthiyathalaimurai", "dinamalar"],
    "authorized_connectors": ["youtube", "x", "instagram", "facebook", "reddit", "news_rss", "google_trends"],
    "default_language": "en",
    "default_demo_scenario": "scenario_policy_announcement",
    "is_active": 1
}

class ClientConfigService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def get_config(self) -> Dict[str, Any]:
        """Returns the active client configuration with parsed arrays."""
        with get_connection(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM client_configuration WHERE id = 'default'")
            row = cursor.fetchone()
            if not row:
                self.reset_to_default()
                return self.get_config()

            res = dict(row)
            res["selected_parties"] = json.loads(res.get("selected_parties") or "[]")
            res["selected_leaders"] = json.loads(res.get("selected_leaders") or "[]")
            res["topics_of_interest"] = json.loads(res.get("topics_of_interest") or "[]")
            res["authorized_sources"] = json.loads(res.get("authorized_sources") or "[]")
            res["authorized_connectors"] = json.loads(res.get("authorized_connectors") or "[]")
            res["is_active"] = bool(res.get("is_active", 1))
            return res

    def update_config(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Updates client configuration in the database idempotently."""
        current = self.get_config()
        now_iso = datetime.now(timezone.utc).isoformat()

        client_name = updates.get("client_name", current["client_name"])
        client_tagline = updates.get("client_tagline", current["client_tagline"])
        logo_url = updates.get("logo_url", current.get("logo_url", ""))
        brand_color = updates.get("brand_color", current.get("brand_color", "#18181B"))
        accent_color = updates.get("accent_color", current.get("accent_color", "#D97706"))
        selected_parties = updates.get("selected_parties", current["selected_parties"])
        selected_leaders = updates.get("selected_leaders", current["selected_leaders"])
        topics_of_interest = updates.get("topics_of_interest", current["topics_of_interest"])
        authorized_sources = updates.get("authorized_sources", current["authorized_sources"])
        authorized_connectors = updates.get("authorized_connectors", current["authorized_connectors"])
        default_language = updates.get("default_language", current.get("default_language", "en"))
        default_demo_scenario = updates.get("default_demo_scenario", current.get("default_demo_scenario", "scenario_policy_announcement"))
        is_active = 1 if updates.get("is_active", True) else 0

        with get_connection(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE client_configuration SET
                    client_name = ?,
                    client_tagline = ?,
                    logo_url = ?,
                    brand_color = ?,
                    accent_color = ?,
                    selected_parties = ?,
                    selected_leaders = ?,
                    topics_of_interest = ?,
                    authorized_sources = ?,
                    authorized_connectors = ?,
                    default_language = ?,
                    default_demo_scenario = ?,
                    updated_at = ?,
                    is_active = ?
                WHERE id = 'default'
            """, (
                client_name,
                client_tagline,
                logo_url,
                brand_color,
                accent_color,
                json.dumps(selected_parties),
                json.dumps(selected_leaders),
                json.dumps(topics_of_interest),
                json.dumps(authorized_sources),
                json.dumps(authorized_connectors),
                default_language,
                default_demo_scenario,
                now_iso,
                is_active
            ))
            conn.commit()

        return self.get_config()

    def reset_to_default(self) -> Dict[str, Any]:
        """Resets client configuration back to initial baseline defaults."""
        now_iso = datetime.now(timezone.utc).isoformat()
        with get_connection(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO client_configuration (
                    id, client_name, client_tagline, logo_url, brand_color, accent_color,
                    selected_parties, selected_leaders, topics_of_interest, authorized_sources,
                    authorized_connectors, default_language, default_demo_scenario, updated_at, is_active
                ) VALUES (
                    'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            """, (
                DEFAULT_CONFIG["client_name"],
                DEFAULT_CONFIG["client_tagline"],
                DEFAULT_CONFIG["logo_url"],
                DEFAULT_CONFIG["brand_color"],
                DEFAULT_CONFIG["accent_color"],
                json.dumps(DEFAULT_CONFIG["selected_parties"]),
                json.dumps(DEFAULT_CONFIG["selected_leaders"]),
                json.dumps(DEFAULT_CONFIG["topics_of_interest"]),
                json.dumps(DEFAULT_CONFIG["authorized_sources"]),
                json.dumps(DEFAULT_CONFIG["authorized_connectors"]),
                DEFAULT_CONFIG["default_language"],
                DEFAULT_CONFIG["default_demo_scenario"],
                now_iso,
                DEFAULT_CONFIG["is_active"]
            ))
            conn.commit()
        return self.get_config()

client_config_service = ClientConfigService()
