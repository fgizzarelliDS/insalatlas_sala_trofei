"""
scripts/core/builder.py
Compiles modular source files in data/ into public/data.json.
"""

import os
import sys
import glob
import json
from typing import Optional, Dict, Any, List

from .config import get_base_dir, get_data_dir, get_public_dir
from .logger import ok, info, warn, error, banner
from .rules import (
    parse_season_year,
    is_championship,
    create_championship_achievements,
    create_cup_achievement
)

def build_data(output_file: Optional[str] = None) -> int:
    base_dir = get_base_dir()
    data_dir = get_data_dir()
    managers_file = os.path.join(data_dir, 'managers.json')
    titles_file = os.path.join(data_dir, 'titles.json')
    seasons_dir = os.path.join(data_dir, 'seasons')

    if not output_file:
        output_file = os.path.join(get_public_dir(), 'data.json')

    if not os.path.exists(managers_file):
        error(f"Managers file not found: {managers_file}")
        return 1

    with open(managers_file, 'r', encoding='utf-8') as f:
        managers_meta = json.load(f)

    custom_titles = {}
    if os.path.exists(titles_file):
        with open(titles_file, 'r', encoding='utf-8') as f:
            custom_titles = json.load(f)

    season_files = glob.glob(os.path.join(seasons_dir, '*.json'))
    if not season_files:
        error(f"No season files found in {seasons_dir}!")
        return 1

    seasons_data = []
    for sf in season_files:
        with open(sf, 'r', encoding='utf-8') as f:
            seasons_data.append(json.load(f))

    # Sort seasons chronologically ascending
    seasons_data.sort(key=lambda s: parse_season_year(s.get('season', '')))

    # Flat competitions list (sorted descending by season for UI archive)
    all_competitions = []
    for s_doc in reversed(seasons_data):
        s_in_progress = bool(s_doc.get('in_progress', False) or s_doc.get('status') == 'in_progress')
        comps = s_doc.get('competitions', [])
        for c in comps:
            if s_in_progress and 'in_progress' not in c:
                c['in_progress'] = True
            all_competitions.append(c)

    # Initialize managers dictionary
    managers_dict: Dict[str, Dict[str, Any]] = {}
    for m in managers_meta:
        coaches = m.get('cartonato_coaches', [])
        managers_dict[m['id']] = {
            'id': m['id'],
            'name': m['name'],
            'years': 0,
            'gold': 0,
            'silver': 0,
            'bronze': 0,
            'spoon': 0,
            'cup_gold': 0,
            'cup_silver': 0,
            'supercup': 0,
            'supercup_silver': 0,
            'mundialito': 0,
            'mundialito_silver': 0,
            'cartonato': 0,
            'coach_banners': list(coaches),
            'cartonato_coaches': list(coaches),
            'history': []
        }

    # Process seasons in chronological order
    for s_doc in seasons_data:
        s = s_doc.get('season', '')
        s_in_progress = bool(s_doc.get('in_progress', False) or s_doc.get('status') == 'in_progress')
        comps = s_doc.get('competitions', [])

        champ = next((c for c in comps if is_championship(c.get('category', ''), c.get('name', ''))), None)
        other_comps = [c for c in comps if c != champ]

        if not champ:
            continue

        champ_id = champ.get('id')
        champ_ranking = champ.get('ranking', [])
        champ_in_progress = bool(champ.get('in_progress', False) or s_in_progress or champ.get('status') == 'in_progress')
        if champ_in_progress:
            champ['in_progress'] = True

        # Determine last ranked position for wooden spoon
        ranked_numbers = [r['rank'] for r in champ_ranking if r.get('rank') is not None]
        last_rank = max(ranked_numbers) if ranked_numbers else 12

        for r in champ_ranking:
            mid = r.get('managerId')
            if not mid or mid not in managers_dict:
                continue

            mgr = managers_dict[mid]
            mgr['years'] += 1

            rank = r.get('rank')
            points = r.get('points')
            team_name = r.get('teamName')

            achievements = []
            if not champ_in_progress:
                achievements = create_championship_achievements(rank, last_rank, champ_id)
                if rank == 1:
                    mgr['gold'] += 1
                elif rank == 2:
                    mgr['silver'] += 1
                elif rank == 3:
                    mgr['bronze'] += 1
                elif rank == last_rank and last_rank >= 8:
                    mgr['spoon'] += 1

            # Check other competitions (cups, supercups, mundialito, playout)
            for oc in other_comps:
                oc_in_progress = bool(oc.get('in_progress', False) or s_in_progress or oc.get('status') == 'in_progress')
                if oc_in_progress:
                    oc['in_progress'] = True
                    continue

                cat = oc.get('category', '')
                ocid = oc.get('id')
                for ocr in oc.get('ranking', []):
                    if ocr.get('managerId') == mid:
                        ocrank = ocr.get('rank')
                        ach = create_cup_achievement(cat, ocrank, ocid, s)
                        if ach:
                            achievements.append(ach)
                            badge = ach['badge']
                            if badge in mgr:
                                mgr[badge] += 1

            history_entry = {
                'season': s,
                'team': team_name,
                'rank': rank,
                'points': points,
                'competitionId': champ_id,
                'achievements': achievements
            }
            if champ_in_progress:
                history_entry['in_progress'] = True

            mgr['history'].append(history_entry)

    # Apply explicit overrides from managers.json and sort history descending
    for m in managers_meta:
        mid = m['id']
        mgr = managers_dict[mid]
        if 'years' in m:
            mgr['years'] = m['years']
        if 'additional_history' in m:
            for ah in m['additional_history']:
                mgr['history'].append(ah)
        mgr['history'].sort(key=lambda h: parse_season_year(h.get('season', '')), reverse=True)

    compiled_managers = [managers_dict[m['id']] for m in managers_meta]

    compiled_payload = {
        'leagueData': compiled_managers,
        'competitions': all_competitions,
        'customTitles': custom_titles
    }

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(compiled_payload, f, indent=2, ensure_ascii=False)

    ok(f"Loaded {len(compiled_managers)} managers, {len(seasons_data)} seasons, {len(all_competitions)} competitions.")
    ok(f"Compiled successfully to {output_file}!")
    return 0

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else None
    sys.exit(build_data(target))
