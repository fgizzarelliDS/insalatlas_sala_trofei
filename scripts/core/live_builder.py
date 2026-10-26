"""
scripts/core/live_builder.py
Processor for compiling matchday-by-matchday rounds into public/live_season_details.json.
Implement In-Progress Form Index, Schedule Luck & Live Analytics.
"""

import os
import json
from typing import Dict, Any, List, Optional, Tuple

try:
    from core.luck_simulator import compute_schedule_luck_analytics
    from core.elo_engine import run_multi_track_elo_pipeline, expected_score, DEFAULT_ELO_CONFIG
    from core.config import LEAGUE_RULES
except ImportError:
    try:
        from luck_simulator import compute_schedule_luck_analytics
        from elo_engine import run_multi_track_elo_pipeline, expected_score, DEFAULT_ELO_CONFIG
        from config import LEAGUE_RULES
    except ImportError:
        from scripts.core.luck_simulator import compute_schedule_luck_analytics
        from scripts.core.elo_engine import run_multi_track_elo_pipeline, expected_score, DEFAULT_ELO_CONFIG
        from scripts.core.config import LEAGUE_RULES

def compute_momentum(recent_form: List[str]) -> float:
    """
    Computes recency-weighted momentum in [0.0, 1.0].
    r[-1] is the most recent matchday.
    """
    if not recent_form:
        return 0.5

    k = len(recent_form)
    denom = 3 * (k * (k + 1) // 2)
    if denom == 0:
        return 0.5

    pts_map = {'W': 3, 'D': 1, 'L': 0}
    weighted_sum = sum((i + 1) * pts_map.get(res, 0) for i, res in enumerate(recent_form))
    return round(weighted_sum / denom, 2)


def compute_status_badge(
    momentum: float,
    team_recent_fps: List[float],
    league_avg_fp: float,
    recent_form: List[str]
) -> Tuple[str, str]:
    """
    Evaluates composite status badge (🔥, 📈, ⚖️, 📉, 🧊) and label.
    """
    last_3_fps = team_recent_fps[-3:] if len(team_recent_fps) >= 3 else team_recent_fps
    avg_l3 = (sum(last_3_fps) / len(last_3_fps)) if last_3_fps else 0.0

    last_res = recent_form[-1] if recent_form else ''
    last_2_res = recent_form[-2:] if len(recent_form) >= 2 else []

    if momentum >= 0.75 and avg_l3 >= (league_avg_fp + 2.0):
        return '🔥', 'In Fiamme'
    if momentum <= 0.15:
        return '🧊', 'Crisi Nera'
    if momentum >= 0.55 and last_res == 'W':
        return '📈', 'In Ascesa'
    if momentum <= 0.35 or (len(last_2_res) == 2 and last_2_res == ['L', 'L']):
        return '📉', 'In Flessione'

    return '⚖️', 'Stabile'


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


def compile_live_season_details(
    live_dir: Optional[str] = None,
    output_path: Optional[str] = None,
    root_dir: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Reads matchday round files from data/live/ and compiles deterministic standings
    and metrics into public/live_season_details.json.
    Dynamically identifies season metadata and rankings from data/seasons/.
    """
    if root_dir is None:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

    if live_dir is None:
        live_dir = os.path.join(root_dir, 'data', 'live')

    if output_path is None:
        output_path = os.path.join(root_dir, 'public', 'live_season_details.json')

    if not os.path.exists(live_dir):
        return None

    round_files = [
        os.path.join(live_dir, f) for f in os.listdir(live_dir)
        if f.endswith('.json') and not f.startswith('.')
    ]
    if not round_files:
        return None

    # Filter out mock files if regular round files are present
    non_mock_files = [
        f for f in round_files
        if not (f.endswith('_mock.json') or f.endswith('.mock.json') or '_mock' in os.path.basename(f))
    ]
    effective_files = non_mock_files if non_mock_files else round_files

    # Separate league files and tournament files
    tournament_keywords = ('cup', 'coppa', 'supercoppa', 'supercup', 'mundialito', 'perdenti', 'playout', 'cartonato')

    def is_tournament_file(fpath: str) -> bool:
        bn = os.path.basename(fpath).lower()
        return any(k in bn for k in tournament_keywords)

    league_files = [
        f for f in effective_files
        if not is_tournament_file(f) and not os.path.basename(f).startswith('raw_api_')
    ]
    tournament_files = [
        f for f in effective_files
        if is_tournament_file(f) and not os.path.basename(f).startswith('raw_api_')
    ]
    cup_files = [
        f for f in tournament_files
        if ('cup' in os.path.basename(f).lower() or 'coppa' in os.path.basename(f).lower())
        and not any(k in os.path.basename(f).lower() for k in ('supercoppa', 'supercup', 'perdenti'))
    ]
    if not league_files:
        league_files = effective_files

    # Dynamically find the active in-progress season configuration
    active_info = find_in_progress_season_info(root_dir)
    season_name = active_info['season'] if active_info else ''
    competition_id = active_info['competitionId'] if active_info else 0
    total_rounds = active_info['totalRounds'] if active_info else 26

    # Deduplicate league rounds across files by roundNumber
    rounds_by_number: Dict[int, Dict[str, Any]] = {}

    for rf in sorted(league_files):
        with open(rf, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except Exception:
                continue

            raw_rounds = []
            if isinstance(data, dict):
                if data.get('season'):
                    season_name = data['season']
                if data.get('competitionId'):
                    competition_id = data['competitionId']
                if data.get('totalRounds'):
                    total_rounds = data['totalRounds']

                if 'rounds' in data and isinstance(data['rounds'], list):
                    raw_rounds = data['rounds']
                elif 'roundNumber' in data:
                    raw_rounds = [data]
            elif isinstance(data, list):
                raw_rounds = data

            for r in raw_rounds:
                r_num = r.get('roundNumber')
                if r_num is not None and r_num not in rounds_by_number:
                    rounds_by_number[r_num] = r

    if not rounds_by_number:
        return None

    all_rounds = [rounds_by_number[k] for k in sorted(rounds_by_number.keys())]

    # Remove unnecessary dates from matchday rounds for clean calendar display
    for r in all_rounds:
        r.pop('date', None)

    # Also parse cup rounds if available
    cup_rounds_by_number: Dict[int, Dict[str, Any]] = {}
    for cf in sorted(cup_files):
        with open(cf, 'r', encoding='utf-8') as f:
            try:
                c_data = json.load(f)
            except Exception:
                continue
            raw_c_rounds = c_data.get('rounds', []) if isinstance(c_data, dict) else (c_data if isinstance(c_data, list) else [])
            for cr in raw_c_rounds:
                cr_num = cr.get('roundNumber')
                if cr_num is not None and cr_num not in cup_rounds_by_number:
                    cup_rounds_by_number[cr_num] = cr

    cup_rounds = [cup_rounds_by_number[k] for k in sorted(cup_rounds_by_number.keys())]
    for cr in cup_rounds:
        cr.pop('date', None)

    def detect_tournament_meta(filename: str, file_data: Dict[str, Any]) -> Tuple[str, str, str]:
        fn = os.path.basename(filename).lower()
        cat = file_data.get('competitionCategory')
        comp_name = file_data.get('competition')
        if not cat:
            if 'supercoppa' in fn or 'supercup' in fn:
                cat = 'Supercoppa'
            elif 'mundialito' in fn:
                cat = 'Mundialito'
            elif 'perdenti' in fn or 'playout' in fn:
                cat = 'Perdenti'
            else:
                cat = 'Coppa'

        prefix_map = {
            'Campionato': 'G',
            'Coppa': 'C',
            'Supercoppa': 'SC',
            'Mundialito': 'M',
            'Perdenti': 'P'
        }
        name_map = {
            'Campionato': 'Serie Atlas',
            'Coppa': 'Coppa InsalAtlas',
            'Supercoppa': 'Supercoppa InsalAtlas',
            'Mundialito': 'Mundialito',
            'Perdenti': 'Coppa dei Perdenti'
        }
        prefix = prefix_map.get(cat, 'T')
        if not comp_name:
            comp_name = name_map.get(cat, cat)
        return cat, comp_name, prefix

    # Parse all tournament rounds (Coppa, Supercoppa, Mundialito, Perdenti)
    all_tournament_rounds: List[Dict[str, Any]] = []
    seen_tournament_rounds = set()
    for tf in sorted(tournament_files):
        with open(tf, 'r', encoding='utf-8') as f:
            try:
                t_data = json.load(f)
            except Exception:
                continue
            cat, comp_name, prefix = detect_tournament_meta(tf, t_data if isinstance(t_data, dict) else {})
            raw_t_rounds = t_data.get('rounds', []) if isinstance(t_data, dict) else (t_data if isinstance(t_data, list) else [])
            for tr in raw_t_rounds:
                tr_copy = dict(tr)
                tr_copy.pop('date', None)
                tr_num = tr_copy.get('roundNumber', 1)
                t_key = (cat, tr_num)
                if t_key in seen_tournament_rounds:
                    continue
                seen_tournament_rounds.add(t_key)
                tr_copy['competitionCategory'] = tr_copy.get('competitionCategory') or cat
                tr_copy['competition'] = tr_copy.get('competition') or comp_name
                tr_copy['roundLabel'] = f"{prefix}{tr_num}"
                if not tr_copy.get('championshipMatchDay'):
                    if cat == 'Coppa':
                        cup_md_map = {1: 8, 2: 9, 3: 11, 4: 12, 5: 14, 6: 15}
                        tr_copy['championshipMatchDay'] = cup_md_map.get(tr_num, tr_num + 7)
                    else:
                        tr_copy['championshipMatchDay'] = tr_num + 5
                all_tournament_rounds.append(tr_copy)

    # Fallback to cup_rounds if tournament_files was somehow empty
    if not all_tournament_rounds and cup_rounds:
        for cr in cup_rounds:
            cr_copy = dict(cr)
            c_num = cr_copy.get('roundNumber', 1)
            cr_copy['competitionCategory'] = 'Coppa'
            cr_copy['competition'] = 'Coppa InsalAtlas'
            cr_copy['roundLabel'] = f"C{c_num}"
            cup_md_map = {1: 8, 2: 9, 3: 11, 4: 12, 5: 14, 6: 15}
            cr_copy['championshipMatchDay'] = cr_copy.get('championshipMatchDay') or cup_md_map.get(c_num, c_num + 7)
            all_tournament_rounds.append(cr_copy)

    # Load canonical team definitions from the season data (Single Source of Truth)
    teams_by_mgr, teams_by_name = load_season_teams_lookup(root_dir, season_name, competition_id)

    # Enrich and inherit teamName, coach, logo, managerId for all rounds across all competitions
    for r in all_rounds + all_tournament_rounds:
        for m in r.get('matches', []):
            h_mgr_id = m.get('homeManagerId')
            h_team = m.get('homeTeam')
            if h_mgr_id and h_mgr_id in teams_by_mgr:
                info = teams_by_mgr[h_mgr_id]
                m['homeTeam'] = h_team or info.get('teamName', '')
                m['homeCoach'] = m.get('homeCoach') or info.get('coach', '')
                m['homeLogo'] = m.get('homeLogo') or info.get('logo')
            elif h_team and h_team in teams_by_name:
                info = teams_by_name[h_team]
                m['homeManagerId'] = h_mgr_id or info.get('managerId')
                m['homeCoach'] = m.get('homeCoach') or info.get('coach', '')
                m['homeLogo'] = m.get('homeLogo') or info.get('logo')

            a_mgr_id = m.get('awayManagerId')
            a_team = m.get('awayTeam')
            if a_mgr_id and a_mgr_id in teams_by_mgr:
                info = teams_by_mgr[a_mgr_id]
                m['awayTeam'] = a_team or info.get('teamName', '')
                m['awayCoach'] = m.get('awayCoach') or info.get('coach', '')
                m['awayLogo'] = m.get('awayLogo') or info.get('logo')
            elif a_team and a_team in teams_by_name:
                info = teams_by_name[a_team]
                m['awayManagerId'] = a_mgr_id or info.get('managerId')
                m['awayCoach'] = m.get('awayCoach') or info.get('coach', '')
                m['awayLogo'] = m.get('awayLogo') or info.get('logo')

    # Pre-populate teams from canonical season definition
    teams_stats: Dict[str, Dict[str, Any]] = {}
    for t_name, info in teams_by_name.items():
        teams_stats[t_name] = {
            'teamName': t_name,
            'coach': info.get('coach', ''),
            'managerId': info.get('managerId'),
            'logo': info.get('logo'),
            'played': 0,
            'won': 0,
            'drawn': 0,
            'lost': 0,
            'goalsFor': 0,
            'goalsAgainst': 0,
            'totalFantaPoints': 0.0,
            'allForm': [],
            'fantaPointsHistory': [],
            'points': 0
        }

    total_league_fp = 0.0
    total_team_matches = 0

    for r in all_rounds:
        matches = r.get('matches', [])
        for m in matches:
            home = m.get('homeTeam')
            away = m.get('awayTeam')
            if not home or not away:
                continue

            h_fp = float(m.get('homeFantaPoints', 0.0) or 0.0)
            a_fp = float(m.get('awayFantaPoints', 0.0) or 0.0)
            is_played = bool(
                m.get('isPlayed')
                or m.get('played')
                or h_fp > 0
                or a_fp > 0
            )
            if not is_played:
                continue

            h_score = int(m.get('homeScore', 0))
            a_score = int(m.get('awayScore', 0))

            total_league_fp += (h_fp + a_fp)
            total_team_matches += 2

            for team_name, is_home, score_for, score_against, fp, opp_team in [
                (home, True, h_score, a_score, h_fp, away),
                (away, False, a_score, h_score, a_fp, home)
            ]:
                if teams_by_name and team_name not in teams_by_name:
                    # Ignore unmapped phantom teams not part of official season configuration
                    continue
                if team_name not in teams_stats:
                    teams_stats[team_name] = {
                        'teamName': team_name,
                        'coach': m.get('homeCoach' if is_home else 'awayCoach', ''),
                        'managerId': m.get('homeManagerId' if is_home else 'awayManagerId'),
                        'logo': m.get('homeLogo' if is_home else 'awayLogo'),
                        'played': 0,
                        'won': 0,
                        'drawn': 0,
                        'lost': 0,
                        'goalsFor': 0,
                        'goalsAgainst': 0,
                        'totalFantaPoints': 0.0,
                        'allForm': [],
                        'fantaPointsHistory': [],
                        'points': 0
                    }

                st = teams_stats[team_name]
                st['played'] += 1
                st['goalsFor'] += score_for
                st['goalsAgainst'] += score_against
                st['totalFantaPoints'] += fp
                st['fantaPointsHistory'].append(fp)

                if score_for > score_against:
                    st['won'] += 1
                    st['points'] += 3
                    st['allForm'].append('W')
                elif score_for == score_against:
                    st['drawn'] += 1
                    st['points'] += 1
                    st['allForm'].append('D')
                else:
                    st['lost'] += 1
                    st['allForm'].append('L')

    if not teams_stats:
        return None

    league_avg_fp = (total_league_fp / total_team_matches) if total_team_matches > 0 else 70.0

    # Build standings list and sort by official ranking criteria
    teams_list = list(teams_stats.values())
    for t in teams_list:
        t['goalDiff'] = t['goalsFor'] - t['goalsAgainst']
        t['totalFantaPoints'] = round(t['totalFantaPoints'], 1)
        t['avgFantaPoints'] = round(t['totalFantaPoints'] / t['played'], 2) if t['played'] > 0 else 0.0
        t['recentForm'] = t['allForm'][-5:]
        t['momentum'] = compute_momentum(t['recentForm'])
        badge, label = compute_status_badge(
            t['momentum'],
            t['fantaPointsHistory'],
            league_avg_fp,
            t['recentForm']
        )
        t['statusBadge'] = badge
        t['statusLabel'] = label

    # Official sort: points DESC, goalDiff DESC, totalFantaPoints DESC, goalsFor DESC
    teams_list.sort(
        key=lambda x: (x['points'], x['goalDiff'], x['totalFantaPoints'], x['goalsFor']),
        reverse=True
    )
    for idx, t in enumerate(teams_list, start=1):
        t['rank'] = idx

    # Expected sort: totalFantaPoints DESC, points DESC
    exp_sorted = sorted(
        teams_list,
        key=lambda x: (x['totalFantaPoints'], x['points']),
        reverse=True
    )
    for idx, t in enumerate(exp_sorted, start=1):
        t['expectedRank'] = idx
        t['deltaLuck'] = t['expectedRank'] - t['rank']

    completed_rounds = [
        r.get('roundNumber', 0)
        for r in all_rounds
        if any(
            bool(m.get('isPlayed') or m.get('played') or float(m.get('homeFantaPoints', 0) or 0) > 0 or float(m.get('awayFantaPoints', 0) or 0) > 0)
            for m in r.get('matches', [])
        )
    ]
    last_completed = max(completed_rounds, default=0)

    # Load 2025/26 season rounds for Elo historical trajectory if available locally,
    # otherwise recover directly from public/analytics_data.json or public/live_season_details.json
    rounds_2025_path = os.path.join(root_dir, 'data', 'seasons', '2025-26_rounds.json')
    season_2025_rounds = []
    if os.path.exists(rounds_2025_path):
        try:
            with open(rounds_2025_path, 'r', encoding='utf-8') as f:
                s25_data = json.load(f)
                season_2025_rounds = s25_data.get('rounds', [])
        except Exception:
            season_2025_rounds = []

    # If 2025 rounds are not present on disk (e.g. in CI/CD without raw match archives),
    # recover the 2025/26 trackers directly from public/analytics_data.json or live details
    existing_2025_trackers = None
    analytics_output_path = os.path.join(root_dir, 'public', 'analytics_data.json')
    source_path = analytics_output_path if os.path.exists(analytics_output_path) else output_path
    if not season_2025_rounds and os.path.exists(source_path):
        try:
            with open(source_path, 'r', encoding='utf-8') as f:
                prev_data = json.load(f)
            prev_profiles = prev_data.get('managers', {})
            if not prev_profiles and 'standings' in prev_data:
                prev_profiles = {}
                for s in prev_data.get('standings', []):
                    m_id = s.get('managerId')
                    if m_id and s.get('elo'):
                        prev_profiles[m_id] = s['elo']

            fb_flat = {}
            fb_hist = {}
            fb_atlas = {}
            for m_id, prof in prev_profiles.items():
                t_flat = prof.get('flat', {}).get('seasons', {}).get('2025/26') or [
                    p for p in prof.get('flat', {}).get('trajectory', []) if p.get('season') == '2025/26'
                ]
                if t_flat:
                    fb_flat[m_id] = {
                        'current': t_flat[-1]['elo'],
                        'peak': prof['flat'].get('peak', {}),
                        'floor': prof['flat'].get('floor', {}),
                        'lastDelta': t_flat[-1].get('delta', 0.0),
                        'trajectory': t_flat
                    }
                t_hist = prof.get('historical', {}).get('seasons', {}).get('2025/26') or [
                    p for p in prof.get('historical', {}).get('trajectory', []) if p.get('season') == '2025/26'
                ]
                if t_hist:
                    fb_hist[m_id] = {
                        'current': t_hist[-1]['elo'],
                        'peak': prof['historical'].get('peak', {}),
                        'floor': prof['historical'].get('floor', {}),
                        'lastDelta': t_hist[-1].get('delta', 0.0),
                        'trajectory': t_hist
                    }
                t_atlas = prof.get('atlas', {}).get('seasons', {}).get('2025/26') or [
                    p for p in prof.get('atlas', {}).get('trajectory', []) if p.get('season') == '2025/26'
                ]
                if t_atlas:
                    fb_atlas[m_id] = {
                        'current': t_atlas[-1]['elo'],
                        'peak': prof['atlas'].get('peak', {}),
                        'floor': prof['atlas'].get('floor', {}),
                        'lastDelta': t_atlas[-1].get('delta', 0.0),
                        'trajectory': t_atlas
                    }
            if fb_flat and fb_hist:
                existing_2025_trackers = (fb_flat, fb_hist, fb_atlas)
        except Exception as e:
            print(f"[WARN] Failed to recover 2025 Elo trackers from existing files: {e}")

    # Load managers with career history for historical seeding
    managers_list = []
    public_data_path = os.path.join(root_dir, 'public', 'data.json')
    if os.path.exists(public_data_path):
        try:
            with open(public_data_path, 'r', encoding='utf-8') as f:
                d_json = json.load(f)
                managers_list = d_json.get('leagueData', []) or d_json.get('managers', [])
        except Exception:
            managers_list = []

    # Build unified chronological sequence of rounds for Elo multi-track engine
    elo_season_rounds = []
    for r in all_rounds:
        r_copy = dict(r)
        r_num = r_copy.get('roundNumber', 1)
        r_copy['competitionCategory'] = 'Campionato'
        r_copy['competition'] = 'Serie Atlas'
        r_copy['roundLabel'] = f"G{r_num}"
        ch_md = r_copy.get('championshipMatchDay') or (r_num + 5)
        r_copy['championshipMatchDay'] = ch_md
        elo_season_rounds.append(r_copy)

    for tr in all_tournament_rounds:
        elo_season_rounds.append(dict(tr))

    elo_season_rounds.sort(key=lambda r: (
        int(r.get('championshipMatchDay', 0)),
        0 if r.get('competitionCategory') == 'Campionato' else 1,
        int(r.get('roundNumber', 0))
    ))

    for idx, r in enumerate(elo_season_rounds, start=1):
        r['matchIndex'] = idx
        for m in r.get('matches', []):
            m['competitionCategory'] = r.get('competitionCategory')
            m['competition'] = r.get('competition')
            m['roundLabel'] = r.get('roundLabel')
            m['matchIndex'] = idx
            m['championshipMatchDay'] = r.get('championshipMatchDay')

    # Run Multi-Track Elo Pipeline with unified chronological rounds
    elo_config = LEAGUE_RULES.get('elo')
    elo_profiles = {}
    try:
        elo_profiles = run_multi_track_elo_pipeline(
            season_2025_rounds=season_2025_rounds,
            season_2026_rounds=elo_season_rounds,
            managers_list=managers_list,
            elo_config=elo_config,
            existing_2025_trackers=existing_2025_trackers
        )
    except Exception as e:
        print(f"[WARN] Error running Elo pipeline: {e}")

    # Mask match fixtures for public distribution (no raw scores or fantapoints)
    masked_rounds = []
    for r in all_rounds:
        r_num = r.get('roundNumber')
        masked_matches = []
        for m in r.get('matches', []):
            h_score = int(m.get('homeScore', 0) or 0)
            a_score = int(m.get('awayScore', 0) or 0)
            h_fp = float(m.get('homeFantaPoints', 0.0) or 0.0)
            a_fp = float(m.get('awayFantaPoints', 0.0) or 0.0)

            is_played = bool(
                m.get('isPlayed')
                or m.get('played')
                or h_fp > 0
                or a_fp > 0
            )

            home_outcome = None
            away_outcome = None
            if is_played:
                if h_score > a_score:
                    home_outcome = 'W'
                    away_outcome = 'L'
                elif h_score < a_score:
                    home_outcome = 'L'
                    away_outcome = 'W'
                else:
                    home_outcome = 'D'
                    away_outcome = 'D'

            h_id = m.get('homeManagerId')
            a_id = m.get('awayManagerId')
            win_prob_flat = None
            win_prob_hist = None
            win_prob_atlas = None
            delta_flat = None
            delta_hist = None
            delta_atlas = None

            if h_id and a_id and elo_profiles:
                prof_h = elo_profiles.get(h_id)
                prof_a = elo_profiles.get(a_id)
                if prof_h and prof_a:
                    traj_h_flat = {pt['round']: pt for pt in prof_h.get('flat', {}).get('trajectory', []) if pt.get('season') == season_name and pt.get('competitionCategory', 'Campionato') == 'Campionato'}
                    traj_h_hist = {pt['round']: pt for pt in prof_h.get('historical', {}).get('trajectory', []) if pt.get('season') == season_name and pt.get('competitionCategory', 'Campionato') == 'Campionato'}
                    traj_h_atlas = {pt['round']: pt for pt in prof_h.get('atlas', {}).get('trajectory', []) if pt.get('season') == season_name and pt.get('competitionCategory', 'Campionato') == 'Campionato'}

                    if is_played and r_num in traj_h_flat:
                        win_prob_flat = traj_h_flat[r_num].get('winProbPreMatch')
                        delta_flat = traj_h_flat[r_num].get('delta')
                    else:
                        r_h_flat = prof_h.get('flat', {}).get('current', 1500.0)
                        r_a_flat = prof_a.get('flat', {}).get('current', 1500.0)
                        win_prob_flat = round(expected_score(r_h_flat, r_a_flat) * 100.0, 1)

                    if is_played and r_num in traj_h_hist:
                        win_prob_hist = traj_h_hist[r_num].get('winProbPreMatch')
                        delta_hist = traj_h_hist[r_num].get('delta')
                    else:
                        r_h_hist = prof_h.get('historical', {}).get('current', 1500.0)
                        r_a_hist = prof_a.get('historical', {}).get('current', 1500.0)
                        win_prob_hist = round(expected_score(r_h_hist, r_a_hist) * 100.0, 1)

                    if is_played and r_num in traj_h_atlas:
                        win_prob_atlas = traj_h_atlas[r_num].get('winProbPreMatch')
                        delta_atlas = traj_h_atlas[r_num].get('delta')
                    else:
                        r_h_atlas = prof_h.get('atlas', {}).get('current', 1500.0)
                        r_a_atlas = prof_a.get('atlas', {}).get('current', 1500.0)
                        win_prob_atlas = round(expected_score(r_h_atlas, r_a_atlas) * 100.0, 1)
                        win_prob_flat = round(expected_score(r_h_flat, r_a_flat) * 100.0, 1)

                    if is_played and r_num in traj_h_hist:
                        win_prob_hist = traj_h_hist[r_num].get('winProbPreMatch')
                        delta_hist = traj_h_hist[r_num].get('delta')
                    else:
                        r_h_hist = prof_h.get('historical', {}).get('current', 1500.0)
                        r_a_hist = prof_a.get('historical', {}).get('current', 1500.0)
                        win_prob_hist = round(expected_score(r_h_hist, r_a_hist) * 100.0, 1)

                    if is_played and r_num in traj_h_atlas:
                        win_prob_atlas = traj_h_atlas[r_num].get('winProbPreMatch')
                        delta_atlas = traj_h_atlas[r_num].get('delta')
                    else:
                        r_h_atlas = prof_h.get('atlas', {}).get('current', 1500.0)
                        r_a_atlas = prof_a.get('atlas', {}).get('current', 1500.0)
                        win_prob_atlas = round(expected_score(r_h_atlas, r_a_atlas) * 100.0, 1)

            match_entry = {
                'homeTeam': m.get('homeTeam'),
                'awayTeam': m.get('awayTeam'),
                'homeManagerId': h_id,
                'awayManagerId': a_id,
                'homeLogo': m.get('homeLogo'),
                'awayLogo': m.get('awayLogo'),
                'isPlayed': is_played,
                'homeOutcome': home_outcome,
                'awayOutcome': away_outcome
            }
            if win_prob_flat is not None:
                match_entry['winProbHomeFlat'] = win_prob_flat
            if win_prob_hist is not None:
                match_entry['winProbHomeHistorical'] = win_prob_hist
            if win_prob_atlas is not None:
                match_entry['winProbHomeAtlas'] = win_prob_atlas
            if delta_flat is not None:
                match_entry['eloDeltaHomeFlat'] = delta_flat
            if delta_hist is not None:
                match_entry['eloDeltaHomeHistorical'] = delta_hist
            if delta_atlas is not None:
                match_entry['eloDeltaHomeAtlas'] = delta_atlas

            masked_matches.append(match_entry)

        masked_rounds.append({
            'roundNumber': r_num,
            'matches': masked_matches
        })

    # Compute Schedule Luck & Expected Rank Analytics
    schedule_luck_data = compute_schedule_luck_analytics(
        teams_stats=teams_stats,
        all_rounds=all_rounds,
        total_rounds=total_rounds,
        season=season_name,
        last_completed_round=last_completed
    )

    # Clean intermediate calculation fields from final JSON standings
    final_standings = []
    for t in teams_list:
        t_name = t['teamName']
        m_id = t.get('managerId')
        luck_entry = schedule_luck_data.get(t_name, {})
        elo_full = elo_profiles.get(m_id, {})
        elo_entry = {}
        if elo_full:
            elo_entry = {
                'managerId': elo_full.get('managerId', m_id),
                'teamName': elo_full.get('teamName', t_name),
                'coach': elo_full.get('coach', ''),
            }
            for track in ['flat', 'historical', 'atlas']:
                if track in elo_full:
                    src_track = elo_full[track]
                    curr_traj = [
                        p for p in src_track.get('trajectory', [])
                        if p.get('season') == season_name
                    ]
                    elo_entry[track] = {
                        'current': src_track.get('current', 1500.0),
                        'peak': src_track.get('peak', {}),
                        'floor': src_track.get('floor', {}),
                        'lastDelta': src_track.get('lastDelta', 0.0),
                        'trajectory': curr_traj
                    }
            if 'seasonStats' in elo_full:
                elo_entry['seasonStats'] = elo_full['seasonStats']
        final_standings.append({
            'rank': t['rank'],
            'managerId': m_id,
            'teamName': t['teamName'],
            'coach': t.get('coach', ''),
            'logo': t.get('logo'),
            'recentForm': t['recentForm'],
            'statusBadge': t['statusBadge'],
            'statusLabel': t['statusLabel'],
            'scheduleLuck': luck_entry,
            'elo': elo_entry
        })

    # Mask cup rounds if available
    masked_cup_rounds = []
    cup_completed_rounds = [
        r.get('roundNumber', 0)
        for r in cup_rounds
        if any(
            bool(m.get('isPlayed') or m.get('played') or float(m.get('homeFantaPoints', 0) or 0) > 0 or float(m.get('awayFantaPoints', 0) or 0) > 0)
            for m in r.get('matches', [])
        )
    ]
    cup_last_completed = max(cup_completed_rounds, default=0)

    for r in cup_rounds:
        r_num = r.get('roundNumber')
        masked_cup_matches = []
        for m in r.get('matches', []):
            h_score = int(m.get('homeScore', 0) or 0)
            a_score = int(m.get('awayScore', 0) or 0)
            h_fp = float(m.get('homeFantaPoints', 0.0) or 0.0)
            a_fp = float(m.get('awayFantaPoints', 0.0) or 0.0)
            is_played = bool(
                m.get('isPlayed')
                or m.get('played')
                or h_fp > 0
                or a_fp > 0
            )
            home_outcome = ('W' if h_score > a_score else ('L' if h_score < a_score else 'D')) if is_played else None
            away_outcome = ('L' if h_score > a_score else ('W' if h_score < a_score else 'D')) if is_played else None
            h_id = m.get('homeManagerId')
            a_id = m.get('awayManagerId')
            masked_cup_matches.append({
                'homeTeam': m.get('homeTeam'),
                'awayTeam': m.get('awayTeam'),
                'homeManagerId': h_id,
                'awayManagerId': a_id,
                'homeLogo': m.get('homeLogo'),
                'awayLogo': m.get('awayLogo'),
                'isPlayed': is_played,
                'homeOutcome': home_outcome,
                'awayOutcome': away_outcome,
                'competition': 'Coppa InsalAtlas',
                'competitionCategory': 'Coppa',
                'championshipMatchDay': m.get('championshipMatchDay')
            })
        masked_cup_rounds.append({
            'roundNumber': r_num,
            'championshipMatchDay': r.get('championshipMatchDay'),
            'competition': 'Coppa InsalAtlas',
            'competitionCategory': 'Coppa',
            'matches': masked_cup_matches
        })

    compiled_details = {
        'season': season_name,
        'competitionId': competition_id,
        'lastCompletedRound': last_completed,
        'totalRounds': total_rounds,
        'rounds': masked_rounds,
        'standings': final_standings
    }
    if cup_rounds:
        compiled_details['cupTotalRounds'] = len(cup_rounds)
        compiled_details['cupLastCompletedRound'] = cup_last_completed
        compiled_details['cupRounds'] = masked_cup_rounds

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(compiled_details, f, separators=(',', ':'), ensure_ascii=False, sort_keys=True)

    # Also serialize analytics_data.json for dedicated analytics views
    analytics_output_path = os.path.join(root_dir, 'public', 'analytics_data.json')
    active_elo_config = elo_config or DEFAULT_ELO_CONFIG

    # Deduplicate payload: trajectory contains all points chronologically,
    # so omit redundant per-season arrays to drastically reduce payload size.
    serialized_managers = {}
    for m_id, prof in sorted(elo_profiles.items()):
        clean_prof = {
            'managerId': prof.get('managerId', m_id),
            'teamName': prof.get('teamName', ''),
            'coach': prof.get('coach', '')
        }
        for track in ['flat', 'historical', 'atlas']:
            if track in prof:
                src_track = prof[track]
                clean_prof[track] = {
                    'current': src_track.get('current', 1500.0),
                    'peak': src_track.get('peak', {}),
                    'floor': src_track.get('floor', {}),
                    'lastDelta': src_track.get('lastDelta', 0.0),
                    'trajectory': src_track.get('trajectory', [])
                }
        if 'seasonStats' in prof:
            clean_prof['seasonStats'] = prof['seasonStats']
        serialized_managers[m_id] = clean_prof

    analytics_payload = {
        'season': season_name,
        'competitionId': competition_id,
        'lastCompletedRound': last_completed,
        'totalRounds': total_rounds,
        'eloModeDefault': 'flat',
        'config': {
            'baseRating': float(active_elo_config.get('base_rating', 1500.0)),
            'scaleFactor': float(active_elo_config.get('scale_factor', 400.0)),
            'carryoverAlpha': float(active_elo_config.get('carryover_alpha', 0.75)),
            'historicalSeeding': active_elo_config.get('historical_seeding', {}),
            'kFactors': active_elo_config.get('k_factors', {})
        },
        'managers': serialized_managers
    }
    with open(analytics_output_path, 'w', encoding='utf-8') as f:
        json.dump(analytics_payload, f, separators=(',', ':'), ensure_ascii=False, sort_keys=True)

    return compiled_details


if __name__ == '__main__':
    res = compile_live_season_details()
    if res:
        print(f"Successfully compiled live season details for {res.get('season')}")
    else:
        print("No live season details compiled.")
