"""
scripts/core/luck_simulator.py
Scientific simulation engine for Schedule Luck, Expected Points (xPTS)
and Monte Carlo Calendar Permutations in head-to-head fantasy leagues.
"""

import math
import random
import statistics
import zlib
from typing import Dict, Any, List, Optional, Tuple


def generate_round_seed(season: str, round_num: int) -> int:
    """
    Generates a deterministic pseudorandom seed based on season and round state.
    Guarantees zero git diff churn on identical data across builds,
    while automatically providing fresh permutations as new rounds are completed.
    """
    key = f"{season}_R{round_num}"
    return zlib.crc32(key.encode('utf-8')) % 1_000_000


def davidson_probs(
    delta_z: float,
    kappa: float = 0.55,
    nu0: float = 0.72,
    lam: float = 0.03
) -> Tuple[float, float, float]:
    """
    Computes exact 3-way Davidson probabilities with dynamic rational draw decay.
    Returns (p_win, p_draw, p_loss) for Home team.
    """
    half_kappa = 0.5 * kappa
    term_a = math.exp(half_kappa * delta_z)
    term_b = math.exp(-half_kappa * delta_z)
    dynamic_nu = nu0 / (1.0 + lam * (delta_z ** 2))
    denom = term_a + term_b + dynamic_nu
    return (term_a / denom, dynamic_nu / denom, term_b / denom)


def fanta_points_to_goals(
    fp: float,
    bracket_step: float = 6.0,
    base_threshold: float = 66.0
) -> int:
    """
    Converts weekly fantapoints into official match goals using standard step brackets.
    fp < 66.0 -> 0 goals
    66.0 <= fp < 72.0 -> 1 goal
    72.0 <= fp < 78.0 -> 2 goals, etc.
    """
    if fp < base_threshold:
        return 0
    return int(1 + (fp - base_threshold) // bracket_step)


def compute_luck_badge(z_score: float) -> Tuple[str, str]:
    """
    Maps Schedule Luck Z-score to qualitative status badge and label.
    """
    if z_score >= 1.0:
        return '🍀', 'Favorevole'
    if z_score >= 0.35:
        return '↗️', 'Positivo'
    if z_score > -0.35:
        return '⚖️', 'Neutro'
    if z_score > -1.0:
        return '↘️', 'Sfortunato'
    return '⛈️', 'Bersagliato'


def compute_all_play_standings(
    rounds_data: List[Dict[str, Any]],
    team_names: List[str]
) -> Dict[str, Dict[str, Any]]:
    """
    Computes deterministic Tier 1 Goal-Threshold All-Play matrix for all completed rounds.
    For each completed round, simulates each team playing 1 vs 1 against all other N-1 teams.
    Returns dictionary indexed by teamName with:
      - xPoints: cumulative expected points (mean of all N-1 duels across completed rounds)
      - expectedRecord: { wins, draws, losses }
      - allPlayRecord: { played, wins, draws, losses, winPct }
    """
    n_teams = len(team_names)
    if n_teams < 2:
        return {}

    # Initialize stats accumulator per team
    all_play_stats: Dict[str, Dict[str, Any]] = {
        name: {
            'xPoints': 0.0,
            'expectedWins': 0.0,
            'expectedDraws': 0.0,
            'expectedLosses': 0.0,
            'totalDuels': 0,
            'duelWins': 0,
            'duelDraws': 0,
            'duelLosses': 0,
            'weeklyScores': []  # List of (round_num, fp, goals)
        }
        for name in team_names
    }

    divisor = float(n_teams - 1)

    for r in rounds_data:
        matches = r.get('matches', [])
        round_team_fp: Dict[str, float] = {}

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
            if is_played:
                round_team_fp[home] = h_fp
                round_team_fp[away] = a_fp

        # Convert to goals for valid competing teams
        round_team_goals = {
            t: fanta_points_to_goals(fp)
            for t, fp in round_team_fp.items()
            if t in all_play_stats
        }

        active_teams_in_round = list(round_team_goals.keys())
        # A valid completed round must have at least 2 active teams
        if len(active_teams_in_round) < 2:
            continue

        r_num = r.get('roundNumber', 0)
        for t in active_teams_in_round:
            fp = round_team_fp[t]
            all_play_stats[t]['weeklyScores'].append((r_num, fp, round_team_goals[t]))

        round_divisor = float(len(active_teams_in_round) - 1)

        # Run 1 vs All duels for this round
        for t_a in active_teams_in_round:
            goals_a = round_team_goals[t_a]

            r_wins = 0
            r_draws = 0
            r_losses = 0

            for t_b in active_teams_in_round:
                if t_a == t_b:
                    continue
                goals_b = round_team_goals[t_b]

                if goals_a > goals_b:
                    r_wins += 1
                elif goals_a == goals_b:
                    r_draws += 1
                else:
                    r_losses += 1

            st = all_play_stats[t_a]
            st['totalDuels'] += (len(active_teams_in_round) - 1)
            st['duelWins'] += r_wins
            st['duelDraws'] += r_draws
            st['duelLosses'] += r_losses

            # Normalized to standard 3-point single match scale
            st['xPoints'] += (3 * r_wins + 1 * r_draws) / round_divisor
            st['expectedWins'] += r_wins / round_divisor
            st['expectedDraws'] += r_draws / round_divisor
            st['expectedLosses'] += r_losses / round_divisor

    # Format final metrics
    result: Dict[str, Dict[str, Any]] = {}
    for name, st in all_play_stats.items():
        total_duels = st['totalDuels']
        win_pct = round((st['duelWins'] / total_duels * 100), 1) if total_duels > 0 else 0.0

        result[name] = {
            'xPoints': round(st['xPoints'], 2),
            'expectedRecord': {
                'wins': round(st['expectedWins'], 2),
                'draws': round(st['expectedDraws'], 2),
                'losses': round(st['expectedLosses'], 2)
            },
            'allPlayRecord': {
                'played': total_duels,
                'wins': st['duelWins'],
                'draws': st['duelDraws'],
                'losses': st['duelLosses'],
                'winPct': win_pct
            },
            'weeklyScores': st['weeklyScores']
        }

    return result


def run_monte_carlo_schedule_simulation(
    team_names: List[str],
    all_play_standings: Dict[str, Dict[str, Any]],
    actual_points: Dict[str, int],
    total_rounds: int,
    iterations: int = 10000,
    random_seed: Optional[int] = None,
    all_rounds: Optional[List[Dict[str, Any]]] = None,
    elo_profiles: Optional[Dict[str, Any]] = None,
    odds_config: Optional[Dict[str, Any]] = None,
    teams_stats: Optional[Dict[str, Dict[str, Any]]] = None
) -> Dict[str, Dict[str, Any]]:
    """
    Runs Tier 2 Monte Carlo calendar schedule permutations.
    For completed rounds, holding weekly goals fixed, generates K valid 1 vs 1 pairings per round.
    Computes empirical points distribution, median, standard deviation sigma, and luck Z-score.
    If completed rounds >= 5 and total_rounds > completed, also projects Title/Podium/Spoon odds
    using actual banked points, remaining official calendar fixtures, and calibrated Davidson 1X2 odds.
    """
    if random_seed is not None:
        random.seed(random_seed)

    n_teams = len(team_names)
    if n_teams < 2:
        return {}

    team_idx_map = {name: i for i, name in enumerate(team_names)}

    # Extract completed weekly goals matrix: List of rounds, where each round has [goals_0, ..., goals_{N-1}]
    # Determine completed rounds from weeklyScores
    r_completed = max((len(ap.get('weeklyScores', [])) for ap in all_play_standings.values()), default=0)

    if r_completed == 0:
        # No completed rounds
        return {
            name: {
                'medianPoints': 0.0,
                'medianRank': idx + 1,
                'stdDev': 0.0,
                'luckZScore': 0.0,
                'luckBadge': '⚖️',
                'luckLabel': 'Neutro',
                'pPodiumPct': None,
                'pSpoonPct': None
            }
            for idx, name in enumerate(team_names)
        }

    # Pre-build rounds goals: shape (R, N)
    rounds_goals: List[List[int]] = []
    for r_idx in range(r_completed):
        r_goals = [0] * n_teams
        for name in team_names:
            scores = all_play_standings[name]['weeklyScores']
            if r_idx < len(scores):
                r_goals[team_idx_map[name]] = scores[r_idx][2]  # goals
        rounds_goals.append(r_goals)

    # Pre-build pairwise outcome matrix for each round: shape (R, N, N)
    # outcome_matrix[r][i][j] = points team i gets against team j in round r
    outcome_matrix = [
        [
            [
                3 if rounds_goals[r][i] > rounds_goals[r][j]
                else (1 if rounds_goals[r][i] == rounds_goals[r][j] else 0)
                for j in range(n_teams)
            ]
            for i in range(n_teams)
        ]
        for r in range(r_completed)
    ]

    # Pre-allocate simulation scores for past schedule luck: K x N
    sim_points = [[0] * n_teams for _ in range(iterations)]
    indices = list(range(n_teams))

    # Fast simulation loop for past completed rounds (Schedule Luck Z-score)
    for k in range(iterations):
        k_pts = sim_points[k]
        for r in range(r_completed):
            random.shuffle(indices)
            r_mat = outcome_matrix[r]
            for p in range(0, n_teams - 1, 2):
                i = indices[p]
                j = indices[p + 1]
                k_pts[i] += r_mat[i][j]
                k_pts[j] += r_mat[j][i]

    # Project future rounds if R >= 5 and total_rounds > R
    enable_projections = (r_completed >= 5 and total_rounds > r_completed)
    podium_counts = [0] * n_teams
    spoon_counts = [0] * n_teams

    if enable_projections:
        remaining_rounds = total_rounds - r_completed
        active_odds_cfg = odds_config or {}
        w_elo = float(active_odds_cfg.get('flat_weights', {}).get('elo', 0.65))
        w_pow = float(active_odds_cfg.get('flat_weights', {}).get('power', 0.35))
        kappa = float(active_odds_cfg.get('sensitivity_kappa', 0.55))
        nu0 = float(active_odds_cfg.get('base_draw_nu', 0.72))
        lam = float(active_odds_cfg.get('draw_decay_lambda', 0.03))
        min_sigma_elo = float(active_odds_cfg.get('min_sigma_elo', 35.0))
        min_sigma_power = float(active_odds_cfg.get('min_sigma_power', 1.5))
        k_shrink = float(active_odds_cfg.get('k_shrinkage', 5.0))
        hfa = float(active_odds_cfg.get('hfa_z_shift', 0.0))

        # 1. Extract Elo ratings per team
        elos: List[float] = []
        for name in team_names:
            m_id = (teams_stats.get(name) or {}).get('managerId') if teams_stats else None
            r_val = 1500.0
            if elo_profiles:
                prof = elo_profiles.get(m_id) if m_id else None
                if not prof and name in elo_profiles:
                    prof = elo_profiles.get(name)
                if isinstance(prof, dict):
                    track_data = prof.get('flat') or prof.get('atlas') or {}
                    if isinstance(track_data, dict) and 'current' in track_data:
                        r_val = float(track_data['current'])
                elif isinstance(prof, (int, float)):
                    r_val = float(prof)
            elos.append(r_val)

        if len(elos) > 1:
            try:
                raw_elo_std = statistics.stdev(elos)
            except Exception:
                raw_elo_std = 60.0
        else:
            raw_elo_std = 60.0
        sigma_elo = max(min_sigma_elo, raw_elo_std)

        # 2. Extract Power (Fanta-Points) and Bayesian shrinkage
        team_means: List[float] = []
        n_matches_list: List[int] = []
        total_fps: List[float] = []
        for name in team_names:
            scores = all_play_standings.get(name, {}).get('weeklyScores', [])
            if scores:
                fps = [s[1] for s in scores]
                team_means.append(sum(fps) / len(fps))
                n_matches_list.append(len(fps))
                total_fps.append(sum(fps))
            elif teams_stats and name in teams_stats:
                st = teams_stats[name]
                played = int(st.get('played', r_completed) or r_completed)
                tot = float(st.get('totalFantaPoints', 0.0) or 0.0)
                avg = float(st.get('avgFantaPoints', tot / played if played > 0 else 70.0))
                team_means.append(avg)
                n_matches_list.append(played)
                total_fps.append(tot)
            else:
                team_means.append(70.0)
                n_matches_list.append(r_completed)
                total_fps.append(70.0 * r_completed)

        league_mean_fp = (sum(team_means) / len(team_means)) if team_means else 70.0
        if len(team_means) > 1:
            try:
                raw_fp_std = statistics.stdev(team_means)
            except Exception:
                raw_fp_std = 3.0
        else:
            raw_fp_std = 3.0
        sigma_fp = max(min_sigma_power, raw_fp_std)

        z_powers: List[float] = []
        expected_total_fp: List[float] = []
        for i in range(n_teams):
            n_i = n_matches_list[i]
            z_i = (n_i / (n_i + k_shrink)) * ((team_means[i] - league_mean_fp) / sigma_fp)
            z_powers.append(z_i)
            # Expected future FP volume for official tie-breaker
            shrunk_fp_per_match = (n_i / (n_i + k_shrink)) * team_means[i] + (k_shrink / (n_i + k_shrink)) * league_mean_fp
            expected_total_fp.append(total_fps[i] + remaining_rounds * shrunk_fp_per_match)

        # 3. Build scheduled future matches from official calendar
        future_matches_probs: List[Tuple[int, int, float, float]] = []
        if all_rounds:
            for r in all_rounds:
                r_num = r.get('roundNumber', 0)
                if r_num > r_completed:
                    for m in r.get('matches', []):
                        h_name = m.get('homeTeam')
                        a_name = m.get('awayTeam')
                        if h_name in team_idx_map and a_name in team_idx_map:
                            i = team_idx_map[h_name]
                            j = team_idx_map[a_name]
                            dz_elo = (elos[i] - elos[j]) / sigma_elo
                            dz_pow = z_powers[i] - z_powers[j]
                            dz = w_elo * dz_elo + w_pow * dz_pow + hfa
                            p1, px, _ = davidson_probs(dz, kappa=kappa, nu0=nu0, lam=lam)
                            future_matches_probs.append((i, j, p1, p1 + px))

        # Base starting points for future projections: ACTUAL POINTS BANKED IN STANDINGS
        base_actual_pts = [actual_points.get(name, 0) for name in team_names]
        rand = random.random

        if future_matches_probs:
            # Fast vectorized loop over official calendar fixtures
            for k in range(iterations):
                final_k_pts = list(base_actual_pts)
                for i, j, p1, p1x in future_matches_probs:
                    u = rand()
                    if u < p1:
                        final_k_pts[i] += 3
                    elif u < p1x:
                        final_k_pts[i] += 1
                        final_k_pts[j] += 1
                    else:
                        final_k_pts[j] += 3

                # Official tie-breaker: Points DESC, then Expected Total FP DESC
                ranked_indices = sorted(
                    range(n_teams),
                    key=lambda x: (final_k_pts[x], expected_total_fp[x]),
                    reverse=True
                )
                for pos, t_idx in enumerate(ranked_indices):
                    if pos < 3:
                        podium_counts[t_idx] += 1
                    if pos == (n_teams - 1):
                        spoon_counts[t_idx] += 1
        else:
            # Fallback if future round fixtures are not in all_rounds (e.g. mock test fixtures)
            fallback_indices = list(range(n_teams))
            for k in range(iterations):
                final_k_pts = list(base_actual_pts)
                for _ in range(remaining_rounds):
                    random.shuffle(fallback_indices)
                    for p in range(0, n_teams - 1, 2):
                        i = fallback_indices[p]
                        j = fallback_indices[p + 1]
                        dz_elo = (elos[i] - elos[j]) / sigma_elo
                        dz_pow = z_powers[i] - z_powers[j]
                        dz = w_elo * dz_elo + w_pow * dz_pow + hfa
                        p1, px, _ = davidson_probs(dz, kappa=kappa, nu0=nu0, lam=lam)
                        u = rand()
                        if u < p1:
                            final_k_pts[i] += 3
                        elif u < (p1 + px):
                            final_k_pts[i] += 1
                            final_k_pts[j] += 1
                        else:
                            final_k_pts[j] += 3

                ranked_indices = sorted(
                    range(n_teams),
                    key=lambda x: (final_k_pts[x], expected_total_fp[x]),
                    reverse=True
                )
                for pos, t_idx in enumerate(ranked_indices):
                    if pos < 3:
                        podium_counts[t_idx] += 1
                    if pos == (n_teams - 1):
                        spoon_counts[t_idx] += 1

    # Aggregate simulation results per team
    mc_results: Dict[str, Dict[str, Any]] = {}
    for name in team_names:
        i = team_idx_map[name]
        pts_dist = [sim_points[k][i] for k in range(iterations)]
        median_pts = float(statistics.median(pts_dist))
        std_dev = float(statistics.stdev(pts_dist)) if len(pts_dist) > 1 else 0.0

        act_pts = actual_points.get(name, 0)
        z_score = round((act_pts - median_pts) / std_dev, 2) if std_dev > 0 else 0.0
        badge, label = compute_luck_badge(z_score)

        p_podium = round((podium_counts[i] / iterations) * 100, 1) if enable_projections else None
        p_spoon = round((spoon_counts[i] / iterations) * 100, 1) if enable_projections else None

        mc_results[name] = {
            'medianPoints': round(median_pts, 2),
            'stdDev': round(std_dev, 2),
            'luckZScore': z_score,
            'luckBadge': badge,
            'luckLabel': label,
            'pPodiumPct': p_podium,
            'pSpoonPct': p_spoon
        }

    return mc_results


def compute_schedule_luck_analytics(
    teams_stats: Dict[str, Dict[str, Any]],
    all_rounds: List[Dict[str, Any]],
    total_rounds: int,
    random_seed: Optional[int] = None,
    season: str = "",
    last_completed_round: int = 0,
    elo_profiles: Optional[Dict[str, Any]] = None,
    odds_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Dict[str, Any]]:
    """
    Main orchestrator function:
    1. Computes deterministic Tier 1 All-Play matrix (xPTS, records).
    2. Runs Tier 2 Monte Carlo schedule simulation (Z-Score, median, odds).
    3. Calculates delta points, expected ranks, and delta rank vs actual ranking.
    Returns dictionary of ScheduleLuckAnalytics per team.
    """
    team_names = list(teams_stats.keys())
    if not team_names:
        return {}

    # Determine effective seed: dynamic per round state if not explicitly specified
    if random_seed is None:
        effective_seed = generate_round_seed(season, last_completed_round)
    else:
        effective_seed = random_seed

    # Extract actual points from teams_stats
    actual_points = {
        name: teams_stats[name].get('points', 0)
        for name in team_names
    }

    # 1. Tier 1: All-Play Matrix
    all_play = compute_all_play_standings(all_rounds, team_names)

    # 2. Tier 2: Monte Carlo Simulation
    mc_sim = run_monte_carlo_schedule_simulation(
        team_names=team_names,
        all_play_standings=all_play,
        actual_points=actual_points,
        total_rounds=total_rounds,
        iterations=10000,
        random_seed=effective_seed,
        all_rounds=all_rounds,
        elo_profiles=elo_profiles,
        odds_config=odds_config,
        teams_stats=teams_stats
    )

    # 3. Compute Delta Points and Expected Rankings
    # Sort teams by xPoints DESC, then actual points DESC, then totalFantaPoints DESC
    x_rank_sorted = sorted(
        team_names,
        key=lambda name: (
            all_play.get(name, {}).get('xPoints', 0.0),
            actual_points.get(name, 0),
            teams_stats[name].get('totalFantaPoints', 0.0)
        ),
        reverse=True
    )
    x_ranks = {name: rank for rank, name in enumerate(x_rank_sorted, start=1)}

    final_analytics: Dict[str, Dict[str, Any]] = {}
    for name in team_names:
        ap = all_play.get(name, {})
        mc = mc_sim.get(name, {})
        act_pts = actual_points.get(name, 0)
        x_pts = ap.get('xPoints', 0.0)
        delta_pts = round(act_pts - x_pts, 2)
        x_rnk = x_ranks.get(name, 1)
        act_rnk = teams_stats[name].get('rank', x_rnk)
        # deltaRank: xRank - actRank (positive means expected rank is higher/worse numerically or better?
        # Convention: deltaRank = actRank - xRank (e.g. actRank 4, xRank 1 -> +3 positions earned on merit)
        delta_rank = act_rnk - x_rnk

        final_analytics[name] = {
            'xPoints': x_pts,
            'xRank': x_rnk,
            'deltaRank': delta_rank,
            'allPlayRecord': ap.get('allPlayRecord', {
                'played': 0, 'wins': 0, 'draws': 0, 'losses': 0, 'winPct': 0.0
            }),
            'luckZScore': mc.get('luckZScore', 0.0),
            'luckBadge': mc.get('luckBadge', '⚖️'),
            'luckLabel': mc.get('luckLabel', 'Neutro'),
            'monteCarlo': {
                'medianPoints': mc.get('medianPoints', 0.0),
                'stdDev': mc.get('stdDev', 0.0),
                'pPodiumPct': mc.get('pPodiumPct'),
                'pSpoonPct': mc.get('pSpoonPct')
            }
        }

    return final_analytics
