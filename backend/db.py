import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "data" / "briefings.db"


def _resolve_path() -> Path:
    raw = os.getenv("INNATEAI_DB_PATH")
    return Path(raw) if raw else DEFAULT_DB_PATH


def get_connection() -> sqlite3.Connection:
    path = _resolve_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS briefings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            generated_at TEXT NOT NULL,
            payload TEXT NOT NULL,
            briefing_date TEXT
        )
        """
    )
    # Older databases may not have briefing_date — add if missing.
    cols = {row["name"] for row in conn.execute("PRAGMA table_info(briefings)").fetchall()}
    if "briefing_date" not in cols:
        conn.execute("ALTER TABLE briefings ADD COLUMN briefing_date TEXT")
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_briefings_date "
        "ON briefings(briefing_date) WHERE briefing_date IS NOT NULL"
    )
    return conn


def save_briefing(payload: dict[str, Any]) -> int:
    generated_at = payload.get("generated_at")
    if isinstance(generated_at, datetime):
        stamp = generated_at.isoformat()
    elif isinstance(generated_at, str) and generated_at:
        stamp = generated_at
    else:
        stamp = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO briefings (generated_at, payload) VALUES (?, ?)",
            (stamp, json.dumps(payload, default=str)),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def list_briefings(limit: int = 50) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, generated_at, payload FROM briefings "
            "ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    finally:
        conn.close()

    result = []
    for row in rows:
        data = json.loads(row["payload"])
        data["id"] = row["id"]
        data["generated_at"] = row["generated_at"]
        result.append(data)
    return result


def get_today(briefing_date: str) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, generated_at, payload, briefing_date FROM briefings "
            "WHERE briefing_date = ?",
            (briefing_date,),
        ).fetchone()
    finally:
        conn.close()

    if not row:
        return None

    data = json.loads(row["payload"])
    data["id"] = row["id"]
    data["briefing_date"] = row["briefing_date"]
    data["generated_at"] = row["generated_at"]
    return data


def upsert_today(briefing_date: str, payload: dict[str, Any]) -> int:
    stamp = payload.get("generated_at") or datetime.now(timezone.utc).isoformat()
    if isinstance(stamp, datetime):
        stamp = stamp.isoformat()

    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        existing = conn.execute(
            "SELECT id FROM briefings WHERE briefing_date = ?",
            (briefing_date,),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE briefings SET payload = ?, generated_at = ? WHERE id = ?",
                (json.dumps(payload, default=str), stamp, existing["id"]),
            )
            row_id = existing["id"]
        else:
            cur = conn.execute(
                "INSERT INTO briefings (generated_at, payload, briefing_date) "
                "VALUES (?, ?, ?)",
                (stamp, json.dumps(payload, default=str), briefing_date),
            )
            row_id = cur.lastrowid
        conn.commit()
        return row_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_today_payload(
    briefing_date: str,
    mutator: Callable[[dict[str, Any]], dict[str, Any]],
) -> Optional[dict]:
    """Atomic read-modify-write of today's payload JSON."""
    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute(
            "SELECT id, generated_at, payload FROM briefings WHERE briefing_date = ?",
            (briefing_date,),
        ).fetchone()
        if not row:
            conn.commit()
            return None

        payload = json.loads(row["payload"])
        new_payload = mutator(payload)
        conn.execute(
            "UPDATE briefings SET payload = ? WHERE id = ?",
            (json.dumps(new_payload, default=str), row["id"]),
        )
        conn.commit()

        new_payload["id"] = row["id"]
        new_payload["briefing_date"] = briefing_date
        new_payload["generated_at"] = row["generated_at"]
        return new_payload
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def utc_today_str() -> str:
    return datetime.now(timezone.utc).date().isoformat()
