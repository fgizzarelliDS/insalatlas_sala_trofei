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

        if len(round_team_fp) < n_teams:
            # Round not fully completed or unplayed
            continue

        # Convert to goals
        round_team_goals = {
            t: fanta_points_to_goals(fp)
            for t, fp in round_team_fp.items()
        }

        r_num = r.get('roundNumber', 0)
        for t, fp in round_team_fp.items():
            if t in all_play_stats:
                all_play_stats[t]['weeklyScores'].append((r_num, fp, round_team_goals[t]))

        # Run 1 vs All duels for this round
        for t_a in team_names:
            if t_a not in round_team_goals:
                continue
            goals_a = round_team_goals[t_a]

            r_wins = 0
            r_draws = 0
            r_losses = 0

            for t_b in team_names:
                if t_a == t_b:
                    continue
                goals_b = round_team_goals.get(t_b, 0)

                if goals_a > goals_b:
                    r_wins += 1
                elif goals_a == goals_b:
                    r_draws += 1
                else:
                    r_losses += 1

            st = all_play_stats[t_a]
            st['totalDuels'] += (n_teams - 1)
            st['duelWins'] += r_wins
            st['duelDraws'] += r_draws
            st['duelLosses'] += r_losses

            # Normalized to standard 3-point single match scale
            st['xPoints'] += (3 * r_wins + 1 * r_draws) / divisor
            st['expectedWins'] += r_wins / divisor
            st['expectedDraws'] += r_draws / divisor
            st['expectedLosses'] += r_losses / divisor

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
    random_seed: Optional[int] = None
) -> Dict[str, Dict[str, Any]]:
    """
    Runs Tier 2 Monte Carlo calendar schedule permutations.
    For completed rounds, holding weekly goals fixed, generates K valid 1 vs 1 pairings per round.
    Computes empirical points distribution, median, standard deviation sigma, and luck Z-score.
    If completed rounds >= 5 and total_rounds > completed, also projects Title/Podium/Spoon odds.
    """
    if random_seed is not None:
        random.seed(random_seed)

    n_teams = len(team_names)
    if n_teams < 2:
        return {}

    team_idx_map = {name: i for i, name in enumerate(team_names)}

    # Extract completed weekly goals matrix: List of rounds, where each round has [goals_0, ..., goals_{N-1}]
    # Determine completed rounds from weeklyScores
    sample_scores = all_play_standings.get(team_names[0], {}).get('weeklyScores', [])
    r_completed = len(sample_scores)

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

    # Pre-allocate simulation scores: K x N
    sim_points = [[0] * n_teams for _ in range(iterations)]
    indices = list(range(n_teams))

    # Fast simulation loop
    for k in range(iterations):
        k_pts = sim_points[k]
        for r in range(r_completed):
            random.shuffle(indices)
            r_mat = outcome_matrix[r]
            for p in range(0, n_teams, 2):
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
        # Extract past goals pool for bootstrap per team
        team_goals_pool = [
            [rounds_goals[r][i] for r in range(r_completed)]
            for i in range(n_teams)
        ]

        for k in range(iterations):
            # Clone completed points for this iteration
            final_k_pts = list(sim_points[k])

            for _ in range(remaining_rounds):
                random.shuffle(indices)
                for p in range(0, n_teams, 2):
                    i = indices[p]
                    j = indices[p + 1]
                    # Sample bootstrapped goals from team history
                    g_i = random.choice(team_goals_pool[i])
                    g_j = random.choice(team_goals_pool[j])
                    if g_i > g_j:
                        final_k_pts[i] += 3
                    elif g_i == g_j:
                        final_k_pts[i] += 1
                        final_k_pts[j] += 1
                    else:
                        final_k_pts[j] += 3

            # Rank teams for this iteration: higher points = better rank
            ranked_indices = sorted(range(n_teams), key=lambda x: final_k_pts[x], reverse=True)
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
    last_completed_round: int = 0
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
        random_seed=effective_seed
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
            'deltaPoints': delta_pts,
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
