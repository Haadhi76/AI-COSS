"""Loads the repo-root Memory.md into the triage system prompt.

Backend does not parse the file — Claude reads it. mtime cache avoids
re-reading on every request while still picking up edits."""

import os
from pathlib import Path

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "Memory.md"

_cache: tuple[float, str] | None = None


def _resolve_path() -> Path:
    raw = os.getenv("INNATEAI_MEMORY_PATH")
    return Path(raw) if raw else DEFAULT_PATH


def load_memory() -> str:
    global _cache
    path = _resolve_path()
    if not path.exists():
        _cache = None
        return ""

    mtime = path.stat().st_mtime
    # Cache hit only on exact match — any inequality (newer OR older, e.g. after
    # a `git checkout` that rewinds mtime) falls through to re-read the file.
    if _cache and _cache[0] == mtime:
        return _cache[1]

    text = path.read_text(encoding="utf-8")
    _cache = (mtime, text)
    return text
