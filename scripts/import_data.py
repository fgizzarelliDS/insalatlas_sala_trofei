#!/usr/bin/env python3
"""
Imports a monolithic data.json (such as an export from the webapp "Salva Backup JSON")
and splits it into modular files in data/:
  - data/managers.json
  - data/titles.json
  - data/seasons/<season>.json

Usage:
  python scripts/import_data.py [path/to/exported_data.json]
  npm run import:data [path/to/exported_data.json]
If no path is specified, it defaults to public/data.json.
"""

import json
import os
import sys

def season_to_filename(season_str):
    # e.g. "2016/17" -> "2016-17.json"
    cleaned = season_str.replace('/', '-')
    return f"{cleaned}.json"

def import_data(input_path=None):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data')
    seasons_dir = os.path.join(data_dir, 'seasons')
    os.makedirs(seasons_dir, exist_ok=True)

    if not input_path:
        input_path = os.path.join(base_dir, 'public', 'data.json')

    if not os.path.exists(input_path):
        print(f"Errore: File '{input_path}' non trovato!", file=sys.stderr)
        sys.exit(1)

    print(f"Lettura file sorgente: {input_path} ...")
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Custom Titles
    titles = data.get('customTitles', {})
    titles_path = os.path.join(data_dir, 'titles.json')
    with open(titles_path, 'w', encoding='utf-8') as f:
        json.dump(titles, f, indent=2, ensure_ascii=False)
    print(f"[OK] Aggiornato: {titles_path}")

    # 2. Existing managers.json overrides
    mgrs_path = os.path.join(data_dir, 'managers.json')
    existing_meta = {}
    if os.path.exists(mgrs_path):
        try:
            with open(mgrs_path, 'r', encoding='utf-8') as f:
                old_list = json.load(f)
                for item in old_list:
                    existing_meta[item['id']] = item
        except Exception:
            pass

    # Extract managers list
    raw_managers = data.get('leagueData', [])
    if not raw_managers and 'managers' in data:
        raw_managers = data.get('managers', [])

    new_mgrs = []
    for m in raw_managers:
        mid = m.get('id')
        name = m.get('name')
        coaches = m.get('cartonato_coaches', m.get('coach_banners', []))
        
        m_entry = {
            "id": mid,
            "name": name,
            "cartonato_coaches": coaches
        }
        # Preserve existing overrides if any
        if mid in existing_meta:
            if 'years' in existing_meta[mid]:
                m_entry['years'] = existing_meta[mid]['years']
            if 'additional_history' in existing_meta[mid]:
                m_entry['additional_history'] = existing_meta[mid]['additional_history']
        
        new_mgrs.append(m_entry)

    with open(mgrs_path, 'w', encoding='utf-8') as f:
        json.dump(new_mgrs, f, indent=2, ensure_ascii=False)
    print(f"[OK] Aggiornato: {mgrs_path} ({len(new_mgrs)} allenatori)")

    # 3. Seasons & Competitions
    competitions = data.get('competitions', [])
    seasons_map = {}
    for comp in competitions:
        season = comp.get('season')
        if not season:
            continue
        if season not in seasons_map:
            seasons_map[season] = []
        seasons_map[season].append(comp)

    for season, comps in seasons_map.items():
        fname = season_to_filename(season)
        fpath = os.path.join(seasons_dir, fname)
        season_doc = {
            "season": season,
            "competitions": comps
        }
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(season_doc, f, indent=2, ensure_ascii=False)
        print(f"[OK] Aggiornato: data/seasons/{fname} ({len(comps)} competizioni)")

    print(f"\nImportazione completata con successo! ({len(seasons_map)} stagioni, {len(competitions)} competizioni).")
    print("Puoi ora verificare o compilare con: python scripts/build_data.py")

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else None
    import_data(target)
