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


def extract_career_prior_fp(
    prof: Optional[Dict[str, Any]],
    current_season: str = ""
) -> Optional[float]:
    """
    Extracts manager career average offensive power strictly prior to the current season.
    Prevents circular data leakage in historical replay, matching TypeScript extractCareerPriorFP.
    """
    if not isinstance(prof, dict):
        return None
    stats_obj = prof.get('seasonStats') or {}
    all_st = stats_obj.get('all') or {}
    curr_st = stats_obj.get(current_season) or {}
    all_played = int(all_st.get('played', 0) or 0)
    curr_played = int(curr_st.get('played', 0) or 0)
    past_played = all_played - curr_played

    if past_played > 0 and 'totalFP' in all_st and all_st['totalFP'] is not None:
        curr_total = float(curr_st.get('totalFP', 0.0) or 0.0)
        if curr_total == 0.0 and 'avgFP' in curr_st and curr_st['avgFP'] is not None:
            curr_total = float(curr_st['avgFP']) * curr_played
        past_total = float(all_st['totalFP']) - curr_total
        if past_total > 0:
            return past_total / past_played

    # Fallback across past seasons
    past_total = 0.0
    past_count = 0
    for k, st in stats_obj.items():
        if k != current_season and k != 'all' and isinstance(st, dict):
            p = int(st.get('played', 0) or 0)
            if p > 0:
                tot = float(st.get('totalFP', 0.0) or 0.0)
                if tot > 0:
                    past_total += tot
                    past_count += p
                elif 'avgFP' in st and st['avgFP'] is not None:
                    past_total += float(st['avgFP']) * p
                    past_count += p
    if past_count > 0 and past_total > 0:
        return past_total / past_count
    return None


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
    teams_stats: Optional[Dict[str, Dict[str, Any]]] = None,
    season: str = ""
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
    # Collect all distinct completed round numbers in chronological order
    completed_round_nums = sorted({
        s[0]
        for ap in all_play_standings.values()
        for s in ap.get('weeklyScores', [])
    })
    r_completed = len(completed_round_nums)

    if r_completed == 0:
        # No completed rounds
        return {
            name: {
                'meanPoints': 0.0,
                'medianPoints': 0.0,
                'medianRank': idx + 1,
                'stdDev': 0.0,
                'p10': 0.0,
                'p25': 0.0,
                'p75': 0.0,
                'p90': 0.0,
                'luckZScore': 0.0,
                'luckBadge': '⚖️',
                'luckLabel': 'Neutro',
                'pTitlePct': None,
                'pPodiumPct': None,
                'pMidPct': None,
                'pFlopPct': None,
                'pSpoonPct': None
            }
            for idx, name in enumerate(team_names)
        }

    # Pre-build rounds goals: shape (R, N) indexed by exact round number
    team_score_maps = {
        name: {s[0]: s[2] for s in all_play_standings[name].get('weeklyScores', [])}
        for name in team_names
    }
    rounds_goals: List[List[int]] = []
    for r_num in completed_round_nums:
        r_goals = [0] * n_teams
        for name in team_names:
            r_goals[team_idx_map[name]] = team_score_maps[name].get(r_num, 0)
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

    # Project future rounds if R >= mc_min_rounds and total_rounds > R
    active_odds_cfg = odds_config or {}
    mc_min_rounds = int(active_odds_cfg.get('mc_min_rounds', 5))
    enable_projections = (r_completed >= mc_min_rounds and total_rounds > r_completed)
    title_counts = [0] * n_teams
    podium_counts = [0] * n_teams
    mid_counts = [0] * n_teams
    flop_counts = [0] * n_teams
    spoon_counts = [0] * n_teams
    projected_sim_points = [[0] * n_teams for _ in range(iterations)]

    if enable_projections:
        remaining_rounds = total_rounds - r_completed
        w_elo = float(active_odds_cfg.get('flat_weights', {}).get('elo', 0.65))
        w_pow = float(active_odds_cfg.get('flat_weights', {}).get('power', 0.35))
        kappa_0 = float(active_odds_cfg.get('sensitivity_kappa', 0.55))
        nu0 = float(active_odds_cfg.get('base_draw_nu', 0.72))
        lam = float(active_odds_cfg.get('draw_decay_lambda', 0.03))
        min_sigma_elo = float(active_odds_cfg.get('min_sigma_elo', 35.0))
        min_sigma_power = float(active_odds_cfg.get('min_sigma_power', 1.5))
        k_shrink = float(active_odds_cfg.get('k_shrinkage', 5.0))
        hfa = float(active_odds_cfg.get('hfa_z_shift', 0.0))

        # Dynamic sensitivity scaling (temporal uncertainty decay) and latent seasonal form shocks
        alpha = float(active_odds_cfg.get('mc_alpha_decay', 0.45))
        sigma_drift = float(active_odds_cfg.get('mc_sigma_drift', 0.25))
        progress_ratio = (r_completed / total_rounds) if total_rounds > 0 else 1.0
        kappa_eff = kappa_0 * (alpha + (1.0 - alpha) * progress_ratio)

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

        prior_sigma_elo = float(active_odds_cfg.get('prior_sigma_elo', 60.0))
        n_avg = (sum(n_matches_list) / len(n_matches_list)) if n_matches_list else 0.0
        blended_var_elo = (
            (n_avg / (n_avg + k_shrink)) * (raw_elo_std ** 2) +
            (k_shrink / (n_avg + k_shrink)) * (prior_sigma_elo ** 2)
        ) if n_avg > 0 else (prior_sigma_elo ** 2)
        sigma_elo = max(min_sigma_elo, math.sqrt(blended_var_elo))

        league_mean_fp = (sum(team_means) / len(team_means)) if team_means else 70.0
        if len(team_means) > 1:
            try:
                raw_fp_std = statistics.stdev(team_means)
            except Exception:
                raw_fp_std = 3.0
        else:
            raw_fp_std = 3.0
        sigma_fp = max(min_sigma_power, raw_fp_std)

        # Extract career prior FP for returning managers strictly prior to current season
        career_priors: List[Optional[float]] = []
        for name in team_names:
            m_id = (teams_stats.get(name) or {}).get('managerId') if teams_stats else None
            prof = None
            if elo_profiles:
                prof = elo_profiles.get(m_id) if m_id else None
                if not prof and name in elo_profiles:
                    prof = elo_profiles.get(name)
            career_priors.append(extract_career_prior_fp(prof, current_season=season))

        valid_priors = [p for p in career_priors if p is not None]
        mean_prior_fp = (sum(valid_priors) / len(valid_priors)) if valid_priors else league_mean_fp
        if len(valid_priors) > 1:
            try:
                raw_prior_std = statistics.stdev(valid_priors)
            except Exception:
                raw_prior_std = 1.5
        else:
            raw_prior_std = 1.5
        sigma_prior_fp = max(1.2, raw_prior_std)

        z_powers: List[float] = []
        expected_total_fp: List[float] = []
        for i in range(n_teams):
            n_i = n_matches_list[i]
            z_curr = (team_means[i] - league_mean_fp) / sigma_fp
            prior_fp = career_priors[i]
            if prior_fp is not None:
                z_prior = (prior_fp - mean_prior_fp) / sigma_prior_fp
                z_i = (n_i / (n_i + k_shrink)) * z_curr + (k_shrink / (n_i + k_shrink)) * z_prior
                prior_target_fp = prior_fp
            else:
                z_i = (n_i / (n_i + k_shrink)) * z_curr
                prior_target_fp = league_mean_fp

            z_powers.append(z_i)
            # Expected future FP volume for official tie-breaker
            shrunk_fp_per_match = (n_i / (n_i + k_shrink)) * team_means[i] + (k_shrink / (n_i + k_shrink)) * prior_target_fp
            expected_total_fp.append(total_fps[i] + remaining_rounds * shrunk_fp_per_match)

        # 3. Build scheduled future matches from official calendar
        future_match_bases: List[Tuple[int, int, float]] = []
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
                            base_dz = w_elo * dz_elo + w_pow * dz_pow + hfa
                            future_match_bases.append((i, j, base_dz))

        # Base starting points for future projections: ACTUAL POINTS BANKED IN STANDINGS
        base_actual_pts = [actual_points.get(name, 0) for name in team_names]
        rand = random.random
        gauss = random.gauss
        mid_cutoff = max(4, (n_teams + 1) // 2)
        shock_scale = math.sqrt(remaining_rounds or 1) * sigma_fp

        if future_match_bases:
            if sigma_drift > 0:
                # Stochastic seasonal quality shock per team in each simulated season
                for k in range(iterations):
                    final_k_pts = list(base_actual_pts)
                    shocks = [gauss(0, sigma_drift) for _ in range(n_teams)]
                    for i, j, base_dz in future_match_bases:
                        dz = base_dz + (shocks[i] - shocks[j])
                        p1, px, _ = davidson_probs(dz, kappa=kappa_eff, nu0=nu0, lam=lam)
                        u = rand()
                        if u < p1:
                            final_k_pts[i] += 3
                        elif u < (p1 + px):
                            final_k_pts[i] += 1
                            final_k_pts[j] += 1
                        else:
                            final_k_pts[j] += 3

                    projected_sim_points[k] = final_k_pts

                    # Official tie-breaker: Points DESC, then Expected Total FP perturbed by iteration form shock DESC
                    ranked_indices = sorted(
                        range(n_teams),
                        key=lambda x: (final_k_pts[x], expected_total_fp[x] + shocks[x] * shock_scale),
                        reverse=True
                    )
                    for pos, t_idx in enumerate(ranked_indices):
                        if pos == 0:
                            title_counts[t_idx] += 1
                        if pos < 3:
                            podium_counts[t_idx] += 1
                        if 3 <= pos < mid_cutoff:
                            mid_counts[t_idx] += 1
                        if pos >= mid_cutoff:
                            flop_counts[t_idx] += 1
                        if pos == (n_teams - 1):
                            spoon_counts[t_idx] += 1
            else:
                # Static path: Precompute probabilities once with kappa_eff
                precomputed = []
                for i, j, base_dz in future_match_bases:
                    p1, px, _ = davidson_probs(base_dz, kappa=kappa_eff, nu0=nu0, lam=lam)
                    precomputed.append((i, j, p1, p1 + px))

                for k in range(iterations):
                    final_k_pts = list(base_actual_pts)
                    for i, j, p1, p1x in precomputed:
                        u = rand()
                        if u < p1:
                            final_k_pts[i] += 3
                        elif u < p1x:
                            final_k_pts[i] += 1
                            final_k_pts[j] += 1
                        else:
                            final_k_pts[j] += 3

                    projected_sim_points[k] = final_k_pts

                    ranked_indices = sorted(
                        range(n_teams),
                        key=lambda x: (final_k_pts[x], expected_total_fp[x], rand()),
                        reverse=True
                    )
                    for pos, t_idx in enumerate(ranked_indices):
                        if pos == 0:
                            title_counts[t_idx] += 1
                        if pos < 3:
                            podium_counts[t_idx] += 1
                        if 3 <= pos < mid_cutoff:
                            mid_counts[t_idx] += 1
                        if pos >= mid_cutoff:
                            flop_counts[t_idx] += 1
                        if pos == (n_teams - 1):
                            spoon_counts[t_idx] += 1
        else:
            # Fallback if future round fixtures are not in all_rounds (e.g. mock test fixtures)
            fallback_indices = list(range(n_teams))
            for k in range(iterations):
                final_k_pts = list(base_actual_pts)
                shocks = [gauss(0, sigma_drift) for _ in range(n_teams)] if sigma_drift > 0 else [0.0] * n_teams
                for _ in range(remaining_rounds):
                    random.shuffle(fallback_indices)
                    for p in range(0, n_teams - 1, 2):
                        i = fallback_indices[p]
                        j = fallback_indices[p + 1]
                        dz_elo = (elos[i] - elos[j]) / sigma_elo
                        dz_pow = z_powers[i] - z_powers[j]
                        dz = w_elo * dz_elo + w_pow * dz_pow + hfa + (shocks[i] - shocks[j])
                        p1, px, _ = davidson_probs(dz, kappa=kappa_eff, nu0=nu0, lam=lam)
                        u = rand()
                        if u < p1:
                            final_k_pts[i] += 3
                        elif u < (p1 + px):
                            final_k_pts[i] += 1
                            final_k_pts[j] += 1
                        else:
                            final_k_pts[j] += 3

                projected_sim_points[k] = final_k_pts

                ranked_indices = sorted(
                    range(n_teams),
                    key=lambda x: (final_k_pts[x], expected_total_fp[x] + shocks[x] * shock_scale),
                    reverse=True
                )
                for pos, t_idx in enumerate(ranked_indices):
                    if pos == 0:
                        title_counts[t_idx] += 1
                    if pos < 3:
                        podium_counts[t_idx] += 1
                    if 3 <= pos < mid_cutoff:
                        mid_counts[t_idx] += 1
                    if pos >= mid_cutoff:
                        flop_counts[t_idx] += 1
                    if pos == (n_teams - 1):
                        spoon_counts[t_idx] += 1

    # Aggregate simulation results per team
    mc_results: Dict[str, Dict[str, Any]] = {}
    for name in team_names:
        i = team_idx_map[name]
        
        # Retrospective schedule luck distribution (completed rounds)
        retro_dist = [sim_points[k][i] for k in range(iterations)]
        retro_median = float(statistics.median(retro_dist))
        retro_std = float(statistics.stdev(retro_dist)) if len(retro_dist) > 1 else 0.0

        act_pts = actual_points.get(name, 0)
        z_score = round((act_pts - retro_median) / retro_std, 2) if retro_std > 0 else 0.0
        badge, label = compute_luck_badge(z_score)

        if enable_projections:
            # Projected full season points distribution (completed + future simulated rounds)
            pts_dist = [projected_sim_points[k][i] for k in range(iterations)]
            median_pts = float(statistics.median(pts_dist))
            mean_pts = float(statistics.mean(pts_dist)) if len(pts_dist) > 0 else median_pts
            std_dev = float(statistics.stdev(pts_dist)) if len(pts_dist) > 1 else 0.0
        else:
            # Retrospective points when projections are inactive
            pts_dist = retro_dist
            median_pts = retro_median
            mean_pts = float(statistics.mean(retro_dist)) if len(retro_dist) > 0 else retro_median
            std_dev = retro_std

        sorted_pts = sorted(pts_dist)
        n_pts = len(sorted_pts)
        p10 = round(float(sorted_pts[int(0.10 * (n_pts - 1))]), 1) if n_pts > 0 else 0.0
        p25 = round(float(sorted_pts[int(0.25 * (n_pts - 1))]), 1) if n_pts > 0 else 0.0
        p75 = round(float(sorted_pts[int(0.75 * (n_pts - 1))]), 1) if n_pts > 0 else 0.0
        p90 = round(float(sorted_pts[int(0.90 * (n_pts - 1))]), 1) if n_pts > 0 else 0.0

        p_title = round((title_counts[i] / iterations) * 100, 1) if enable_projections else None
        p_podium = round((podium_counts[i] / iterations) * 100, 1) if enable_projections else None
        p_mid = round((mid_counts[i] / iterations) * 100, 1) if enable_projections else None
        p_flop = round((flop_counts[i] / iterations) * 100, 1) if enable_projections else None
        p_spoon = round((spoon_counts[i] / iterations) * 100, 1) if enable_projections else None

        mc_results[name] = {
            'meanPoints': round(mean_pts, 2),
            'medianPoints': round(median_pts, 2),
            'stdDev': round(std_dev, 2),
            'p10': p10,
            'p25': p25,
            'p75': p75,
            'p90': p90,
            'luckZScore': z_score,
            'luckBadge': badge,
            'luckLabel': label,
            'pTitlePct': p_title,
            'pPodiumPct': p_podium,
            'pMidPct': p_mid,
            'pFlopPct': p_flop,
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
        teams_stats=teams_stats,
        season=season
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
                'meanPoints': mc.get('meanPoints', mc.get('medianPoints', 0.0)),
                'medianPoints': mc.get('medianPoints', 0.0),
                'stdDev': mc.get('stdDev', 0.0),
                'p10': mc.get('p10'),
                'p25': mc.get('p25'),
                'p75': mc.get('p75'),
                'p90': mc.get('p90'),
                'pTitlePct': mc.get('pTitlePct'),
                'pPodiumPct': mc.get('pPodiumPct'),
                'pMidPct': mc.get('pMidPct'),
                'pFlopPct': mc.get('pFlopPct'),
                'pSpoonPct': mc.get('pSpoonPct')
            }
        }

    return final_analytics
