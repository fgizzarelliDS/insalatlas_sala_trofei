"""
scripts/core/api.py
HTTP REST API Client for Leghe Fantacalcio endpoints.
"""

import os
import time
import json
from typing import Optional, Dict, Any, List, Tuple
import requests

from .config import BASE_API, LEAGUE_ALIAS, HEADERS, get_scripts_dir
from .logger import ok, info, warn, error, banner

def fetch_json(url: str, output_path: Optional[str] = None) -> Optional[Any]:
    """Fetches a JSON resource and optionally caches it locally."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if output_path:
                os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
                with open(output_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            return data
        else:
            warn(f"HTTP error {resp.status_code} fetching {url}")
            return None
    except Exception as e:
        error(f"Connection failed to {url}: {e}")
        return None

def run_download_pipeline(output_dir: Optional[str] = None) -> Tuple[Optional[Any], List[Any]]:
    """Downloads all raw league historical data from Fantacalcio API."""
    if not output_dir:
        output_dir = get_scripts_dir()

    banner("Phase 1: Downloading Data from Leghe Fantacalcio API")

    # 1. Download Palmares
    palmares_file = os.path.join(output_dir, f"{LEAGUE_ALIAS}_palmares_raw.json")
    info("Downloading Historical Palmarès (/palmares)...")
    palmares_data = fetch_json(f"{BASE_API}/palmares", palmares_file)

    # 2. Download Categories
    categories_file = os.path.join(output_dir, f"{LEAGUE_ALIAS}_categories_raw.json")
    info("Downloading Categories (/categories)...")
    fetch_json(f"{BASE_API}/categories", categories_file)

    # 3. Download Trophy Room
    trophy_room_file = os.path.join(output_dir, f"{LEAGUE_ALIAS}_trophy_room_raw.json")
    info("Downloading Trophy Room (/trophy-room)...")
    trophy_room_data = fetch_json(f"{BASE_API}/trophy-room", trophy_room_file)

    # 4. Identify all competitions
    comp_ids = []
    if trophy_room_data:
        for t in trophy_room_data.get("trophies", []):
            cid = t.get("competition", {}).get("id")
            if cid and cid not in comp_ids:
                comp_ids.append(cid)

        for s in trophy_room_data.get("otherSeasons", []):
            for c in s.get("competitions", []):
                cid = c.get("id")
                if cid and cid not in comp_ids:
                    comp_ids.append(cid)

    info(f"Identified {len(comp_ids)} historical competitions to fetch: {comp_ids}")

    # 5. Download competition details
    detailed_competitions = []
    for idx, tid in enumerate(comp_ids, 1):
        info(f"  [{idx}/{len(comp_ids)}] Detail competition {tid}...")
        tmp_f = os.path.join(output_dir, f"trophy_{tid}.json")
        detail = fetch_json(f"{BASE_API}/trophy-details/{tid}", tmp_f)
        if detail:
            detailed_competitions.append(detail)
            if os.path.exists(tmp_f):
                os.remove(tmp_f)
        time.sleep(0.2)

    trophies_file = os.path.join(output_dir, f"{LEAGUE_ALIAS}_all_trophies_raw.json")
    with open(trophies_file, "w", encoding="utf-8") as f:
        json.dump(detailed_competitions, f, ensure_ascii=False, indent=2)

    ok("All raw data downloaded successfully!")
    return palmares_data, detailed_competitions
