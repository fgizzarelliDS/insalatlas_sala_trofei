"""
scripts/core/assets.py
Team crest resolution, hash selection, and asset download utilities.
"""

import os
import re
from typing import Optional
from .config import get_base_dir
from .logger import warn

CREST_IDS = [
    'apex_united', 'royal_vanguard', 'phoenix_rising', 'ironclad_athletic',
    'starlight_rovers', 'aegis_sentinel', 'titan_wolves', 'golden_griffin',
    'obsidian_fc', 'crown_point', 'valiant_knights', 'kraken_maritime',
    'volt_dynamo', 'falconcrest_athletic', 'solaris_sc', 'northgate_rovers',
    'cobra_strike', 'celestial_horizon', 'wildcat_city', 'anchor_bay'
]

def hash_team_name(name: str) -> int:
    """Calculates djb2 hash of team name for deterministic crest assignment."""
    clean = re.sub(r'\s+', '', (name or '').strip().lower())
    if not clean:
        return 0
    h = 5381
    for ch in clean:
        h = (((h << 5) + h) + ord(ch))
        h = (h & 0xFFFFFFFF)
        if h >= 0x80000000:
            h -= 0x100000000
    return abs(h)

def download_asset_locally(url: str, subfolder: str, root_dir: Optional[str] = None) -> str:
    """Downloads an image asset locally to public/assets and archive if it starts with http."""
    if not root_dir:
        root_dir = get_base_dir()
    if not url or not url.startswith("http"):
        return url

    u_lower = url.lower()
    if "no_logo" in u_lower or "default" in u_lower:
        return url

    filename = url.split("?")[0].split("/")[-1]
    if not filename or "." not in filename:
        return url

    # Ensure saved to public/assets/{subfolder}/ so frontend and compilers can serve it
    public_dir = os.path.join(root_dir, "public", "assets", subfolder)
    os.makedirs(public_dir, exist_ok=True)
    public_path = os.path.join(public_dir, filename)

    # Also keep copy in scripts/archive/{subfolder}/
    archive_dir = os.path.join(root_dir, "scripts", "archive", subfolder)
    os.makedirs(archive_dir, exist_ok=True)
    archive_path = os.path.join(archive_dir, filename)

    if not os.path.exists(public_path) or os.path.getsize(public_path) == 0:
        try:
            import urllib.request
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as response:
                data = response.read()
                with open(public_path, "wb") as out_f1:
                    out_f1.write(data)
                with open(archive_path, "wb") as out_f2:
                    out_f2.write(data)
        except Exception as e:
            warn(f"Failed to download asset {url}: {e}")
            return url

    return f"assets/{subfolder}/{filename}"

def resolve_team_crest(team_name: str, raw_logo: Optional[str] = None, root_dir: Optional[str] = None) -> str:
    """Resolves local team crest path or deterministic SVG fallback."""
    if not root_dir:
        root_dir = get_base_dir()

    if raw_logo and isinstance(raw_logo, str):
        l_lower = raw_logo.lower().strip()
        if not ('no_logo' in l_lower or 'default' in l_lower or l_lower == 'null'):
            download_asset_locally(raw_logo, "teams", root_dir)
            filename = raw_logo.split("?")[0].split("/")[-1]
            public_path = os.path.join(root_dir, "public", "assets", "teams", filename)
            if os.path.exists(public_path):
                return f"assets/teams/{filename}"

    idx = hash_team_name(team_name) % len(CREST_IDS)
    crest_id = CREST_IDS[idx]
    return f"assets/crests/{crest_id}.svg"
