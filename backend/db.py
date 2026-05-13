import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

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
            payload TEXT NOT NULL
        )
        """
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
