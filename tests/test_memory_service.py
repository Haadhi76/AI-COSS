import os
import time

import pytest


def test_returns_file_text_verbatim(tmp_path, monkeypatch):
    from services import memory_service

    f = tmp_path / "Memory.md"
    f.write_text("## Employees\n- Name: Sarah\n", encoding="utf-8")
    monkeypatch.setenv("INNATEAI_MEMORY_PATH", str(f))
    memory_service._cache = None  # reset

    assert memory_service.load_memory() == "## Employees\n- Name: Sarah\n"


def test_returns_empty_string_when_missing(tmp_path, monkeypatch):
    from services import memory_service

    monkeypatch.setenv("INNATEAI_MEMORY_PATH", str(tmp_path / "does-not-exist.md"))
    memory_service._cache = None

    assert memory_service.load_memory() == ""


def test_mtime_change_invalidates_cache(tmp_path, monkeypatch):
    from services import memory_service

    f = tmp_path / "Memory.md"
    f.write_text("v1", encoding="utf-8")
    monkeypatch.setenv("INNATEAI_MEMORY_PATH", str(f))
    memory_service._cache = None

    assert memory_service.load_memory() == "v1"

    time.sleep(0.05)
    f.write_text("v2", encoding="utf-8")
    os.utime(f, None)  # bump mtime

    assert memory_service.load_memory() == "v2"
