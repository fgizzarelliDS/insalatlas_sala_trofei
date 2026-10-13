"""
scripts/core/resolver.py
Identity normalization and entity resolution against data/aliases.json.
"""

import os
import json
import re
from typing import Dict, Any, Optional
from .config import get_data_dir
from .logger import warn

_cached_aliases: Optional[Dict[str, str]] = None

def load_aliases() -> Dict[str, str]:
    """Loads and caches canonical manager aliases from data/aliases.json."""
    global _cached_aliases
    if _cached_aliases is not None:
        return _cached_aliases

    aliases_file = os.path.join(get_data_dir(), "aliases.json")
    if os.path.exists(aliases_file):
        try:
            with open(aliases_file, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                _cached_aliases = {clean_coach_name(k): v for k, v in raw_data.items()}
                return _cached_aliases
        except Exception as e:
            warn(f"Failed to load aliases from {aliases_file}: {e}")

    _cached_aliases = {}
    return _cached_aliases

def clean_coach_name(raw_name: Any) -> str:
    """Normalizes coach handle (whitespace trimmed, lowercase)."""
    return str(raw_name or "").strip().lower()

def resolve_manager_id(raw_name: Any, existing_managers_by_id: Optional[Dict[str, Any]] = None) -> str:
    """
    Resolves a raw coach name or handle to its canonical manager ID (e.g. 'm_alfo').
    Fallback generates a slug-based ID: 'm_{slug}'.
    """
    cleaned = clean_coach_name(raw_name)
    if not cleaned:
        return "m_unknown"

    aliases = load_aliases()
    if cleaned in aliases:
        return aliases[cleaned]

    if existing_managers_by_id:
        for mid, m in existing_managers_by_id.items():
            if clean_coach_name(m.get("name")) == cleaned:
                return mid

    slug = re.sub(r'[^a-zA-Z0-9_-]', '_', cleaned).strip('_')
    return f"m_{slug}" if slug else "m_unknown"
