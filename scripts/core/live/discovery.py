"""
scripts/core/live/discovery.py
Active season discovery and manager/team metadata resolution.
"""

import os
import json
from typing import Dict, Any, Optional, Tuple


def find_in_progress_season_info(root_dir: str) -> Optional[Dict[str, Any]]:
    """
    Dynamically scans data/seasons/ to find the in-progress season and its championship competition.
    Returns dict with season, competitionId, totalRounds, season_file, ranking.
    """
    seasons_dir = os.path.join(root_dir, 'data', 'seasons')
    if not os.path.exists(seasons_dir):
        return None

    season_files = [
        os.path.join(seasons_dir, f) for f in os.listdir(seasons_dir)
        if f.endswith('.json') and not f.startswith('.')
    ]
    if not season_files:
        return None

    loaded_seasons = []
    for sf in season_files:
        try:
            with open(sf, 'r', encoding='utf-8') as f:
                s_data = json.load(f)
                loaded_seasons.append((sf, s_data))
        except Exception:
            continue

    # Prefer season marked in_progress
    target_tuple = None
    for sf, s_data in loaded_seasons:
        if s_data.get('in_progress') is True or s_data.get('status') == 'in_progress':
            target_tuple = (sf, s_data)
            break
        for c in s_data.get('competitions', []):
            if c.get('in_progress') is True or c.get('status') == 'in_progress':
                target_tuple = (sf, s_data)
                break
        if target_tuple:
            break

    # Fallback to latest season chronologically by filename
    if not target_tuple and loaded_seasons:
        loaded_seasons.sort(key=lambda x: x[0], reverse=True)
        target_tuple = loaded_seasons[0]

    if not target_tuple:
        return None

    sf, s_data = target_tuple
    season_name = s_data.get('season', '')
    comps = s_data.get('competitions', [])

    # Find the championship competition
    target_comp = None
    for c in comps:
        cat = str(c.get('category', '')).lower()
        name = str(c.get('name', '')).lower()
        if 'campionato' in cat or 'serie' in name or c.get('ranking'):
            target_comp = c
            break

    if not target_comp and comps:
        target_comp = comps[0]

    comp_id = target_comp.get('id') if target_comp else None

    # Calculate total rounds dynamically
    total_rounds = target_comp.get('totalRounds') if target_comp else None
    if not total_rounds and target_comp and target_comp.get('ranking'):
        num_teams = len(target_comp['ranking'])
        total_rounds = (num_teams - 1) * 2 if num_teams > 1 else 26
    if not total_rounds:
        total_rounds = 26

    return {
        'season': season_name,
        'competitionId': comp_id,
        'totalRounds': total_rounds,
        'season_file': sf,
        'ranking': target_comp.get('ranking', []) if target_comp else []
    }


def load_season_teams_lookup(
    root_dir: str,
    season_name: Optional[str] = None,
    competition_id: Optional[int] = None
) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """
    Builds lookup tables for teams in the season:
      (teams_by_manager_id, teams_by_team_name)
    Each entry contains: { 'managerId', 'teamName', 'coach', 'logo' }.
    Dynamically detects the in-progress season if season_name is not provided.
    """
    teams_by_mgr: Dict[str, Dict[str, Any]] = {}
    teams_by_name: Dict[str, Dict[str, Any]] = {}

    mgr_names: Dict[str, str] = {}
    managers_file = os.path.join(root_dir, 'data', 'managers.json')
    if os.path.exists(managers_file):
        try:
            with open(managers_file, 'r', encoding='utf-8') as f:
                mgr_list = json.load(f)
                if isinstance(mgr_list, list):
                    for m in mgr_list:
                        if isinstance(m, dict) and 'id' in m:
                            mgr_names[m['id']] = m.get('name', '')
        except Exception:
            pass

    # Dynamic fallback to active season info
    active_info = find_in_progress_season_info(root_dir)
    season_path = None
    if season_name:
        season_filename = season_name.replace('/', '-') + '.json'
        p = os.path.join(root_dir, 'data', 'seasons', season_filename)
        if os.path.exists(p):
            season_path = p
    if not season_path and active_info:
        season_path = active_info.get('season_file')

    if season_path and os.path.exists(season_path):
        try:
            with open(season_path, 'r', encoding='utf-8') as f:
                s_data = json.load(f)
                comps = s_data.get('competitions', [])
                target_comp = None
                for c in comps:
                    if competition_id and c.get('id') == competition_id:
                        target_comp = c
                        break
                if not target_comp:
                    for c in comps:
                        if c.get('ranking'):
                            target_comp = c
                            break

                if target_comp and 'ranking' in target_comp:
                    for t in target_comp['ranking']:
                        mgr_id = t.get('managerId')
                        t_name = t.get('teamName')
                        coach = t.get('coach') or (mgr_names.get(mgr_id) if mgr_id else '')
                        logo = t.get('logo')

                        info = {
                            'managerId': mgr_id,
                            'teamName': t_name,
                            'coach': coach,
                            'logo': logo
                        }
                        if mgr_id:
                            teams_by_mgr[mgr_id] = info
                        if t_name:
                            teams_by_name[t_name] = info
        except Exception:
            pass

    return teams_by_mgr, teams_by_name
