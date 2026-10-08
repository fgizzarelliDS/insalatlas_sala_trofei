#!/usr/bin/env python3
"""
Compiles modular source files in data/ into public/data.json.
Source files:
  - data/managers.json (list of managers with stable ID, name, cartonato_coaches)
  - data/titles.json (custom titles configuration)
  - data/seasons/*.json (one file per season with championship & cup competitions)

Output:
  - public/data.json (unified schema consumed by web app and tests)
"""

import json
import glob
import os
import sys

def parse_season_year(season_str):
    try:
        parts = season_str.split('/')
        return int(parts[0])
    except Exception:
        return 0

def build_data():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data')
    managers_file = os.path.join(data_dir, 'managers.json')
    titles_file = os.path.join(data_dir, 'titles.json')
    seasons_dir = os.path.join(data_dir, 'seasons')
    output_file = os.path.join(base_dir, 'public', 'data.json')

    if not os.path.exists(managers_file):
        print(f"Error: {managers_file} not found!", file=sys.stderr)
        sys.exit(1)

    with open(managers_file, 'r', encoding='utf-8') as f:
        managers_meta = json.load(f)

    custom_titles = {}
    if os.path.exists(titles_file):
        with open(titles_file, 'r', encoding='utf-8') as f:
            custom_titles = json.load(f)

    season_files = glob.glob(os.path.join(seasons_dir, '*.json'))
    if not season_files:
        print(f"Error: No season files found in {seasons_dir}!", file=sys.stderr)
        sys.exit(1)

    seasons_data = []
    for sf in season_files:
        with open(sf, 'r', encoding='utf-8') as f:
            seasons_data.append(json.load(f))

    # Sort seasons chronologically ascending
    seasons_data.sort(key=lambda s: parse_season_year(s.get('season', '')))

    # Flat competitions list (sorted descending by season for UI archive)
    all_competitions = []
    for s_doc in reversed(seasons_data):
        comps = s_doc.get('competitions', [])
        for c in comps:
            all_competitions.append(c)

    # Initialize managers
    managers_dict = {}
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
        comps = s_doc.get('competitions', [])

        champ = next((c for c in comps if c.get('category') == 'Campionato' or 'serie' in c.get('name', '').lower()), None)
        other_comps = [c for c in comps if c != champ]

        if not champ:
            continue

        champ_id = champ.get('id')
        champ_ranking = champ.get('ranking', [])

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

            # Championship podium and spoon
            if rank == 1:
                mgr['gold'] += 1
                achievements.append({
                    'title': 'Scudetto',
                    'category': 'Campionato',
                    'badge': 'gold',
                    'icon': '🥇',
                    'competitionId': champ_id
                })
            elif rank == 2:
                mgr['silver'] += 1
                achievements.append({
                    'title': '2° Posto Campionato',
                    'category': 'Campionato',
                    'badge': 'silver',
                    'icon': '🥈',
                    'competitionId': champ_id
                })
            elif rank == 3:
                mgr['bronze'] += 1
                achievements.append({
                    'title': '3° Posto Campionato',
                    'category': 'Campionato',
                    'badge': 'bronze',
                    'icon': '🥉',
                    'competitionId': champ_id
                })
            elif rank == last_rank and last_rank >= 8:
                mgr['spoon'] += 1
                achievements.append({
                    'title': 'Cucchiaio di Legno',
                    'category': 'Campionato',
                    'badge': 'spoon',
                    'icon': '🥄',
                    'competitionId': champ_id
                })

            # Check other competitions (cups, supercups, mundialito, playout)
            for oc in other_comps:
                cat = oc.get('category')
                ocid = oc.get('id')
                for ocr in oc.get('ranking', []):
                    if ocr.get('managerId') == mid:
                        ocrank = ocr.get('rank')
                        if cat == 'Coppa':
                            if ocrank == 1:
                                mgr['cup_gold'] += 1
                                achievements.append({
                                    'title': 'Coppa InsalAtlas',
                                    'category': 'Coppa',
                                    'badge': 'cup_gold',
                                    'icon': '🏆',
                                    'competitionId': ocid
                                })
                            elif ocrank == 2:
                                mgr['cup_silver'] += 1
                                achievements.append({
                                    'title': 'Finalista Coppa InsalAtlas',
                                    'category': 'Coppa',
                                    'badge': 'cup_silver',
                                    'icon': '🥈',
                                    'competitionId': ocid
                                })
                        elif cat == 'Supercoppa':
                            if ocrank == 1:
                                mgr['supercup'] += 1
                                achievements.append({
                                    'title': 'Supercoppa InsalAtlas',
                                    'category': 'Supercoppa',
                                    'badge': 'supercup',
                                    'icon': '⭐',
                                    'competitionId': ocid
                                })
                            elif ocrank == 2:
                                mgr['supercup_silver'] += 1
                                achievements.append({
                                    'title': 'Finalista Supercoppa',
                                    'category': 'Supercoppa',
                                    'badge': 'supercup_silver',
                                    'icon': '🥈',
                                    'competitionId': ocid
                                })
                        elif cat == 'Mundialito':
                            if ocrank == 1:
                                mgr['mundialito'] += 1
                                achievements.append({
                                    'title': 'Mundialito',
                                    'category': 'Mundialito',
                                    'badge': 'mundialito',
                                    'icon': '🌍',
                                    'competitionId': ocid
                                })
                            elif ocrank == 2:
                                mgr['mundialito_silver'] += 1
                                achievements.append({
                                    'title': 'Finalista Mundialito',
                                    'category': 'Mundialito',
                                    'badge': 'mundialito_silver',
                                    'icon': '🥈',
                                    'competitionId': ocid
                                })
                        elif cat == 'Perdenti':
                            if ocrank == 1:
                                mgr['cartonato'] += 1
                                icon = 'BANNER' if s == '2021/22' else ('📦' if s == '2025/26' else '🏷️')
                                achievements.append({
                                    'title': 'Vincitore Playout (Cartonato)',
                                    'category': 'Playout' if s == '2021/22' else 'Perdenti',
                                    'badge': 'cartonato',
                                    'icon': icon,
                                    'competitionId': ocid
                                })

            mgr['history'].append({
                'season': s,
                'team': team_name,
                'rank': rank,
                'points': points,
                'competitionId': champ_id,
                'achievements': achievements
            })

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

    print(f"[+] Loaded {len(compiled_managers)} managers, {len(seasons_data)} seasons, {len(all_competitions)} competitions.")
    print(f"[+] Compiled successfully to {output_file}!")

if __name__ == '__main__':
    build_data()
