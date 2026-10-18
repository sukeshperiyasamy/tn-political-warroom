"""
War Room Unified Database Abstraction Layer
Provides seamless dual-engine support for Neon Serverless PostgreSQL and local SQLite.
Enforces parameter translation (? -> %s), unified DBRow access, and connection lifecycle management.
"""

import os
import sqlite3
from contextlib import contextmanager
from typing import Any, List, Optional, Tuple, Dict, Union

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "warroom.db")


def get_database_url() -> Optional[str]:
    """Retrieves the active PostgreSQL connection URL if configured."""
    return os.getenv("DIRECT_URL") or os.getenv("DATABASE_URL")


def is_postgres() -> bool:
    """Returns True if the backend is configured to use Neon PostgreSQL."""
    return bool(get_database_url())


class DBRow(dict):
    """
    Unified database row supporting both column-name key access ('platform'),
    index access (row[0]), and dict conversion (dict(row)), matching sqlite3.Row behavior.
    """
    def __init__(self, description, values):
        cols = [d.name if hasattr(d, "name") else d[0] for d in description] if description else []
        super().__init__(zip(cols, values))
        self._values = tuple(values)

    def __getitem__(self, item: Union[str, int]) -> Any:
        if isinstance(item, int):
            return self._values[item]
        return super().__getitem__(item)

    def get(self, key: str, default: Any = None) -> Any:
        return super().get(key, default)


class CursorWrapper:
    """
    Wraps database cursor to adapt SQL syntax and row format across PostgreSQL and SQLite.
    """
    def __init__(self, raw_cursor, is_pg: bool):
        self._cursor = raw_cursor
        self.is_pg = is_pg

    def execute(self, query: str, params: Optional[Union[Tuple[Any, ...], List[Any]]] = None):
        adapted_sql = query
        if self.is_pg:
            # Adapt ? placeholders to %s for psycopg
            adapted_sql = adapted_sql.replace("?", "%s")
            # Adapt SQLite INSERT OR IGNORE to PostgreSQL ON CONFLICT DO NOTHING if needed
            if "INSERT OR IGNORE INTO" in adapted_sql:
                adapted_sql = adapted_sql.replace("INSERT OR IGNORE INTO", "INSERT INTO")
                if "ON CONFLICT" not in adapted_sql:
                    adapted_sql += " ON CONFLICT DO NOTHING"

        if params is not None:
            if isinstance(params, list):
                params = tuple(params)
            return self._cursor.execute(adapted_sql, params)
        return self._cursor.execute(adapted_sql)

    def fetchone(self) -> Optional[DBRow]:
        row = self._cursor.fetchone()
        if row is None:
            return None
        return DBRow(self._cursor.description, row)

    def fetchall(self) -> List[DBRow]:
        rows = self._cursor.fetchall()
        if not rows:
            return []
        desc = self._cursor.description
        return [DBRow(desc, r) for r in rows]

    @property
    def description(self):
        return self._cursor.description

    @property
    def rowcount(self) -> int:
        return self._cursor.rowcount

    def close(self):
        try:
            self._cursor.close()
        except Exception:
            pass


class ConnectionWrapper:
    """
    Connection wrapper that provides identical interface for SQLite and psycopg connections.
    """
    def __init__(self, raw_conn, is_pg: bool):
        self._conn = raw_conn
        self.is_pg = is_pg

    def cursor(self) -> CursorWrapper:
        return CursorWrapper(self._conn.cursor(), self.is_pg)

    def execute(self, query: str, params: Optional[Union[Tuple[Any, ...], List[Any]]] = None) -> CursorWrapper:
        cur = self.cursor()
        cur.execute(query, params)
        return cur

    def commit(self):
        self._conn.commit()

    def rollback(self):
        try:
            self._conn.rollback()
        except Exception:
            pass

    def close(self):
        try:
            self._conn.close()
        except Exception:
            pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.rollback()
        else:
            self.commit()
        self.close()


def get_connection(db_path: str = DB_PATH) -> ConnectionWrapper:
    """
    Returns an active database connection wrapper for the configured database backend.
    Prefers Neon PostgreSQL if DATABASE_URL is set, falling back to local SQLite.
    """
    db_url = get_database_url()
    if db_url:
        try:
            import psycopg
            conn = psycopg.connect(db_url, connect_timeout=10)
            return ConnectionWrapper(conn, is_pg=True)
        except Exception as e:
            # Fallback to local SQLite if PostgreSQL connection fails
            pass

    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=10.0)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=5000;")
    except Exception:
        pass
    return ConnectionWrapper(conn, is_pg=False)


@contextmanager
def get_db(db_path: str = DB_PATH):
    """
    Context manager yielding a ConnectionWrapper with automatic commit/rollback and cleanup.
    """
    conn = get_connection(db_path)
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    else:
        conn.commit()
    finally:
        conn.close()
