"""
scripts/core/elo_engine.py
League-Agnostic Dynamic Elo Rating Engine.
Implements Dual-Track (Flat 1500 vs. Historical-Seeded) Multi-Season Modeling,
margin-of-victory and point-differential multipliers, and inter-season carryover.
"""

import math
import statistics
from typing import Dict, Any, List, Optional, Tuple

try:
    from core.config import LEAGUE_RULES
except ImportError:
    try:
        from config import LEAGUE_RULES
    except ImportError:
        from scripts.core.config import LEAGUE_RULES

# Canonical Elo configuration loaded from config.py
DEFAULT_ELO_CONFIG = LEAGUE_RULES.get("elo", {})

DEFAULT_SCORING_WEIGHTS = {
    "gold": 3.0,
    "silver": 0.5,
    "bronze": 0.25,
    "cup_gold": 1.5,
    "cup_silver": 0.25,
    "supercup": 1.0,
    "mundialito": 1.0,
    "spoon": -1.0,
    "cartonato": -0.5
}


def expected_score(rating_a: float, rating_b: float, scale_factor: float = 400.0) -> float:
    """
    Computes logistic expected outcome for Manager A against Manager B in [0.0, 1.0].
    E[S_A] = 1 / (1 + 10^((R_B - R_A) / scale_factor))
    """
    exponent = (rating_b - rating_a) / float(scale_factor)
    # Clamp exponent to prevent float overflow
    exponent = max(-10.0, min(10.0, exponent))
    return 1.0 / (1.0 + math.pow(10.0, exponent))


def fermi_dirac(delta_fp: float, scale: float = 8.5) -> float:
    """
    Continuous Fermi-Dirac logistic mapping of fantasy point differential.
    S_FP = 1 / (1 + exp(-delta_fp / scale))
    Default scale = 8.5 (theoretical pairwise difference std dev in Fantacalcio).
    """
    z = -delta_fp / float(scale)
    z = max(-15.0, min(15.0, z))
    return 1.0 / (1.0 + math.exp(z))


def margin_multiplier(
    goals_a: int,
    goals_b: int,
    fp_a: float,
    fp_b: float,
    r_a: float = 1500.0,
    r_b: float = 1500.0,
    max_cap: float = 1.75
) -> float:
    """
    Hybrid-Capped Margin Multiplier G_cap in [1.0, max_cap].
    Applies base-2 log on fractional goals (1.5 * deltaG + deltaFP / 6.0)
    with autocorrelation dampening 2.0 / (2.0 + 0.001 * dr'), capped at max_cap.
    For draws (deltaG == 0), returns 1.0.
    """
    delta_goals = abs(int(goals_a) - int(goals_b))
    if delta_goals == 0:
        return 1.0

    w_fp_a = min(90.0, max(60.0, float(fp_a)))
    w_fp_b = min(90.0, max(60.0, float(fp_b)))
    delta_fp = abs(w_fp_a - w_fp_b)

    dr_prime = (r_a - r_b) if goals_a >= goals_b else (r_b - r_a)
    autocorr = 2.0 / (2.0 + 0.001 * dr_prime)

    inner = 1.5 * float(delta_goals) + (delta_fp / 6.0)
    if inner <= 0:
        return 1.0

    g_raw = math.log2(inner) * autocorr
    return min(max_cap, max(1.0, g_raw))


def directional_draw_score(fp_a: float, fp_b: float, scale: float = 6.0) -> float:
    """
    Directional tanh draw outcome shift S^hyb in [0.35, 0.65].
    Eliminates the Draw Amplification Paradox by shifting the observed outcome
    in favor of the higher-scoring manager rather than scaling an unsigned multiplier.
    """
    w_fp_a = min(90.0, max(60.0, float(fp_a)))
    w_fp_b = min(90.0, max(60.0, float(fp_b)))
    diff = w_fp_a - w_fp_b
    return 0.5 + 0.15 * math.tanh(diff / float(scale))


def get_k_factor(category: str, elo_config: Dict[str, Any]) -> float:
    """
    Resolves competition K-factor dynamically by category with safe default fallback.
    """
    k_map = elo_config.get("k_factors", {})
    return float(k_map.get(category, k_map.get("default", 32.0)))


def calculate_match_elo_update(
    rating_a: float,
    rating_b: float,
    outcome_a: float,
    goals_a: int,
    goals_b: int,
    fp_a: float,
    fp_b: float,
    k_factor: float = 32.0,
    scale_factor: float = 400.0,
    max_cap: float = 1.75
) -> Tuple[float, float, float, float, float, float]:
    """
    Calculates bilateral rating update under the calibrated Hybrid-Capped formulation.
    Strictly adheres to the Zero-Sum Invariant.
    Returns: (new_rating_a, new_rating_b, delta_a, delta_b, exp_a, exp_b)
    """
    exp_a = expected_score(rating_a, rating_b, scale_factor)
    exp_b = 1.0 - exp_a

    delta_goals = abs(int(goals_a) - int(goals_b))

    if delta_goals == 0:
        eff_outcome_a = directional_draw_score(fp_a, fp_b)
        g_mult = 1.0
    else:
        eff_outcome_a = 1.0 if goals_a > goals_b else 0.0
        g_mult = margin_multiplier(
            goals_a, goals_b, fp_a, fp_b,
            r_a=rating_a, r_b=rating_b, max_cap=max_cap
        )

    delta_a = k_factor * g_mult * (eff_outcome_a - exp_a)
    # Strict zero-sum invariant enforcement
    delta_b = -delta_a

    new_a = rating_a + delta_a
    new_b = rating_b + delta_b

    return (new_a, new_b, delta_a, delta_b, exp_a, exp_b)


def compute_historical_seed_elos(
    managers_list: List[Dict[str, Any]],
    scoring_weights: Optional[Dict[str, float]] = None,
    elo_config: Optional[Dict[str, Any]] = None,
    season_until: str = "2025/26"
) -> Dict[str, float]:
    """
    Calibrates baseline R_0 for each manager from historical Albo d'Oro trophies and Prestige SPI
    strictly prior to season_until (e.g. up to 2024/25).
    Z-score standardized around base_rating (1500) and clamped in [min_rating, max_rating].
    Newcomers (0 prior years) enter at exactly base_rating.
    """
    cfg = elo_config or DEFAULT_ELO_CONFIG
    weights = scoring_weights or DEFAULT_SCORING_WEIGHTS
    base_r = float(cfg.get("base_rating", 1500.0))
    seeding_cfg = cfg.get("historical_seeding", {})
    scale = float(seeding_cfg.get("scale", 75.0))
    min_r = float(seeding_cfg.get("min_rating", 1350.0))
    max_r = float(seeding_cfg.get("max_rating", 1650.0))

    manager_spi: Dict[str, float] = {}
    manager_years: Dict[str, int] = {}
    valid_spis: List[float] = []

    for m in managers_list:
        m_id = m.get("id")
        if not m_id:
            continue

        # If manager has granular season history, filter strictly prior to season_until
        history = m.get("history")
        if isinstance(history, list) and history:
            prior_history = [
                h for h in history
                if h.get("season") and h.get("season") < season_until
            ]
            years = len(prior_history)
            manager_years[m_id] = years
            if years <= 0:
                manager_spi[m_id] = 0.0
                continue

            gold = 0
            silver = 0
            bronze = 0
            cup_gold = 0
            cup_silver = 0
            supercup = 0
            mundialito = 0
            spoon = 0
            cartonato = 0

            for h in prior_history:
                for a in h.get("achievements", []):
                    b = a.get("badge")
                    if b == "gold": gold += 1
                    elif b == "silver": silver += 1
                    elif b == "bronze": bronze += 1
                    elif b == "cup_gold": cup_gold += 1
                    elif b == "cup_silver": cup_silver += 1
                    elif b in ("supercup", "supercup_gold"): supercup += 1
                    elif b in ("mundialito", "mundialito_gold"): mundialito += 1
                    elif b == "spoon": spoon += 1
                    elif b == "cartonato": cartonato += 1
        else:
            years = int(m.get("years", 0) or 0)
            manager_years[m_id] = years
            if years <= 0:
                manager_spi[m_id] = 0.0
                continue
            gold = float(m.get("gold", 0) or 0)
            silver = float(m.get("silver", 0) or 0)
            bronze = float(m.get("bronze", 0) or 0)
            cup_gold = float(m.get("cup_gold", 0) or 0)
            cup_silver = float(m.get("cup_silver", 0) or 0)
            supercup = float(m.get("supercup", 0) or 0)
            mundialito = float(m.get("mundialito", 0) or 0)
            spoon = float(m.get("spoon", 0) or 0)
            cartonato = float(m.get("cartonato", 0) or 0)

        score = (
            gold * weights.get("gold", 3.0) +
            silver * weights.get("silver", 0.5) +
            bronze * weights.get("bronze", 0.25) +
            cup_gold * weights.get("cup_gold", 1.5) +
            cup_silver * weights.get("cup_silver", 0.25) +
            supercup * weights.get("supercup", 1.0) +
            mundialito * weights.get("mundialito", 1.0) +
            spoon * weights.get("spoon", -1.0) +
            cartonato * weights.get("cartonato", -0.5)
        )
        spi = score / float(years)
        manager_spi[m_id] = spi
        valid_spis.append(spi)

    if len(valid_spis) > 1:
        mean_spi = float(statistics.mean(valid_spis))
        std_spi = float(statistics.stdev(valid_spis))
        if std_spi < 0.001:
            std_spi = 1.0
    else:
        mean_spi = 0.0
        std_spi = 1.0

    seed_elos: Dict[str, float] = {}
    for m in managers_list:
        m_id = m.get("id")
        if not m_id:
            continue
        years = manager_years.get(m_id, int(m.get("years", 0) or 0))
        if years <= 0:
            seed_elos[m_id] = base_r
        else:
            spi = manager_spi[m_id]
            z = (spi - mean_spi) / std_spi
            rating = base_r + z * scale
            seed_elos[m_id] = round(max(min_r, min(max_r, rating)), 1)

    return seed_elos


def apply_inter_season_carryover(
    end_ratings: Dict[str, float],
    carryover_alpha: float = 0.75,
    base_rating: float = 1500.0,
    active_managers: Optional[List[str]] = None
) -> Dict[str, float]:
    """
    Applies mean reversion between seasons:
    R_start = alpha * R_end + (1 - alpha) * base_rating
    Followed by Mean-Centering Invariant across active managers so the league average is strictly base_rating.
    """
    carried = {
        m_id: (carryover_alpha * r + (1.0 - carryover_alpha) * base_rating)
        for m_id, r in end_ratings.items()
    }
    target_ids = [m for m in active_managers if m in carried] if active_managers else list(carried.keys())
    if target_ids:
        active_vals = [carried[m_id] for m_id in target_ids]
        mean_r = sum(active_vals) / float(len(active_vals))
        correction = mean_r - base_rating
        return {
            m_id: round(carried[m_id] - correction, 1)
            for m_id in carried
        }
    return {m_id: round(r, 1) for m_id, r in carried.items()}


def simulate_season_elo(
    rounds_data: List[Dict[str, Any]],
    starting_elos: Dict[str, float],
    season_label: str,
    competition_category: str = "Campionato",
    elo_config: Optional[Dict[str, Any]] = None,
    existing_tracker: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Simulates a sequence of completed matchdays, updating Elo ratings chronologically using Hybrid-Capped.
    Returns tracking dictionary indexed by managerId with:
      - current: current rating
      - peak: { value, season, round }
      - floor: { value, season, round }
      - lastDelta: rating delta from most recent match
      - trajectory: list of EloTrajectoryPoint with enriched telemetry (gf, ga, fpFor, fpAgainst)
    """
    cfg = elo_config or DEFAULT_ELO_CONFIG
    scale_factor = float(cfg.get("scale_factor", 400.0))
    base_rating = float(cfg.get("base_rating", 1500.0))
    k_factor = get_k_factor(competition_category, cfg)

    # Initialize or resume tracker
    tracker: Dict[str, Any] = {}
    if existing_tracker:
        for m_id, data in existing_tracker.items():
            tracker[m_id] = {
                "current": float(data["current"]),
                "peak": dict(data["peak"]),
                "floor": dict(data["floor"]),
                "lastDelta": float(data.get("lastDelta", 0.0)),
                "trajectory": list(data.get("trajectory", []))
            }

    # Ensure all managers in starting_elos exist in tracker
    for m_id, initial_r in starting_elos.items():
        if m_id not in tracker:
            tracker[m_id] = {
                "current": initial_r,
                "peak": {"value": initial_r, "season": season_label, "round": 0},
                "floor": {"value": initial_r, "season": season_label, "round": 0},
                "lastDelta": 0.0,
                "trajectory": []
            }
        else:
            tracker[m_id]["current"] = initial_r

    for r in rounds_data:
        r_num = int(r.get("roundNumber", 0))
        matches = r.get("matches", [])

        for m in matches:
            home_mgr = m.get("homeManagerId")
            away_mgr = m.get("awayManagerId")
            home_team = m.get("homeTeam", "Home")
            away_team = m.get("awayTeam", "Away")

            if not home_mgr or not away_mgr:
                continue

            h_fp = float(m.get("homeFantaPoints", 0.0) or 0.0)
            a_fp = float(m.get("awayFantaPoints", 0.0) or 0.0)
            is_played = bool(
                m.get("isPlayed") or
                m.get("played") or
                h_fp > 0 or
                a_fp > 0
            )
            if not is_played:
                continue

            h_goals = int(m.get("homeScore", 0) or 0)
            a_goals = int(m.get("awayScore", 0) or 0)

            # Outcome for Manager A
            if h_goals > a_goals:
                outcome_h = 1.0
                res_h = 'W'
                res_a = 'L'
            elif h_goals < a_goals:
                outcome_h = 0.0
                res_h = 'L'
                res_a = 'W'
            else:
                outcome_h = 0.5
                res_h = 'D'
                res_a = 'D'

            # Ensure both exist in tracker
            if home_mgr not in tracker:
                tracker[home_mgr] = {
                    "current": base_rating,
                    "peak": {"value": base_rating, "season": season_label, "round": r_num},
                    "floor": {"value": base_rating, "season": season_label, "round": r_num},
                    "lastDelta": 0.0,
                    "trajectory": []
                }
            if away_mgr not in tracker:
                tracker[away_mgr] = {
                    "current": base_rating,
                    "peak": {"value": base_rating, "season": season_label, "round": r_num},
                    "floor": {"value": base_rating, "season": season_label, "round": r_num},
                    "lastDelta": 0.0,
                    "trajectory": []
                }

            r_h = tracker[home_mgr]["current"]
            r_a = tracker[away_mgr]["current"]

            new_h, new_a, delta_h, delta_a, exp_h, exp_a = calculate_match_elo_update(
                rating_a=r_h,
                rating_b=r_a,
                outcome_a=outcome_h,
                goals_a=h_goals,
                goals_b=a_goals,
                fp_a=h_fp,
                fp_b=a_fp,
                k_factor=k_factor,
                scale_factor=scale_factor
            )

            # Update home
            tracker[home_mgr]["current"] = round(new_h, 1)
            tracker[home_mgr]["lastDelta"] = round(delta_h, 1)
            if new_h > tracker[home_mgr]["peak"]["value"]:
                tracker[home_mgr]["peak"] = {"value": round(new_h, 1), "season": season_label, "round": r_num}
            if new_h < tracker[home_mgr]["floor"]["value"]:
                tracker[home_mgr]["floor"] = {"value": round(new_h, 1), "season": season_label, "round": r_num}
            tracker[home_mgr]["trajectory"].append({
                "round": r_num,
                "season": season_label,
                "elo": round(new_h, 1),
                "opponentId": away_mgr,
                "opponentTeamName": away_team,
                "result": res_h,
                "delta": round(delta_h, 1),
                "winProbPreMatch": round(exp_h * 100.0, 1),
                "isHome": True,
                "gf": h_goals,
                "ga": a_goals,
                "fpFor": round(h_fp, 1),
                "fpAgainst": round(a_fp, 1)
            })

            # Update away
            tracker[away_mgr]["current"] = round(new_a, 1)
            tracker[away_mgr]["lastDelta"] = round(delta_a, 1)
            if new_a > tracker[away_mgr]["peak"]["value"]:
                tracker[away_mgr]["peak"] = {"value": round(new_a, 1), "season": season_label, "round": r_num}
            if new_a < tracker[away_mgr]["floor"]["value"]:
                tracker[away_mgr]["floor"] = {"value": round(new_a, 1), "season": season_label, "round": r_num}
            tracker[away_mgr]["trajectory"].append({
                "round": r_num,
                "season": season_label,
                "elo": round(new_a, 1),
                "opponentId": home_mgr,
                "opponentTeamName": home_team,
                "result": res_a,
                "delta": round(delta_a, 1),
                "winProbPreMatch": round(exp_a * 100.0, 1),
                "isHome": False,
                "gf": a_goals,
                "ga": h_goals,
                "fpFor": round(a_fp, 1),
                "fpAgainst": round(h_fp, 1)
            })

    return tracker


def simulate_season_atlas_elo(
    rounds_data: List[Dict[str, Any]],
    starting_elos: Dict[str, float],
    season_label: str,
    manager_years: Optional[Dict[str, int]] = None,
    elo_config: Optional[Dict[str, Any]] = None,
    existing_tracker: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Simulates Atlas-Elo v2 (Track 3) using:
    - Continuous Fermi-Dirac sigmoid mapping of fantasy point disparity (s = 8.5)
    - Blended match outcome S_tilde = 0.65 * S + 0.35 * S_FP
    - Variance-restored Dual-Kernel: K_H2H = 26.0, K_Field = 15.6
    - Differentiated rookie (gamma = 0.65) vs veteran (gamma = 0.25) post-auction decay eta(t)
    - Symmetric pairwise uncertainty preserving zero-sum across each round
    """
    cfg = elo_config or DEFAULT_ELO_CONFIG
    base_rating = float(cfg.get("base_rating", 1500.0))
    scale_factor = float(cfg.get("scale_factor", 400.0))
    mgr_years = manager_years or {}

    tracker: Dict[str, Any] = {}
    if existing_tracker:
        for m_id, data in existing_tracker.items():
            tracker[m_id] = {
                "current": float(data["current"]),
                "peak": dict(data["peak"]),
                "floor": dict(data["floor"]),
                "lastDelta": float(data.get("lastDelta", 0.0)),
                "trajectory": list(data.get("trajectory", []))
            }

    for m_id, initial_r in starting_elos.items():
        if m_id not in tracker:
            tracker[m_id] = {
                "current": initial_r,
                "peak": {"value": initial_r, "season": season_label, "round": 0},
                "floor": {"value": initial_r, "season": season_label, "round": 0},
                "lastDelta": 0.0,
                "trajectory": []
            }
        else:
            tracker[m_id]["current"] = initial_r

    for r in rounds_data:
        r_num = int(r.get("roundNumber", 0))
        matches = r.get("matches", [])

        # Gather active match participants for this round
        round_matches = []
        round_fp = {}
        for m in matches:
            h_id = m.get("homeManagerId")
            a_id = m.get("awayManagerId")
            if not h_id or not a_id:
                continue
            h_fp = float(m.get("homeFantaPoints", 0.0) or 0.0)
            a_fp = float(m.get("awayFantaPoints", 0.0) or 0.0)
            is_played = bool(
                m.get("isPlayed") or
                m.get("played") or
                h_fp > 0 or
                a_fp > 0
            )
            if not is_played:
                continue

            h_goals = int(m.get("homeScore", 0) or 0)
            a_goals = int(m.get("awayScore", 0) or 0)
            round_fp[h_id] = h_fp
            round_fp[a_id] = a_fp
            round_matches.append({
                "homeId": h_id,
                "awayId": a_id,
                "homeTeam": m.get("homeTeam", "Home"),
                "awayTeam": m.get("awayTeam", "Away"),
                "hGoals": h_goals,
                "aGoals": a_goals,
                "hFp": h_fp,
                "aFp": a_fp
            })

        active_mgrs = list(round_fp.keys())
        N = len(active_mgrs)
        if N < 2:
            continue

        # Uncertainty factor for each active manager: eta_i(t)
        def get_eta(m_id: str) -> float:
            is_rookie = mgr_years.get(m_id, 1) <= 0
            gamma = 0.65 if is_rookie else 0.25
            return 1.0 + gamma * math.exp(-(r_num - 1.0) / 6.0)

        eta_map = {m_id: get_eta(m_id) for m_id in active_mgrs}

        # Snapshot pre-match ratings
        pre_ratings = {m_id: tracker.get(m_id, {}).get("current", base_rating) for m_id in active_mgrs}

        # 1. H2H Component
        h2h_deltas: Dict[str, float] = {}
        match_meta: Dict[str, Dict[str, Any]] = {}

        for rm in round_matches:
            id_a, id_b = rm["homeId"], rm["awayId"]
            r_a = pre_ratings.get(id_a, base_rating)
            r_b = pre_ratings.get(id_b, base_rating)
            fp_a = rm["hFp"]
            fp_b = rm["aFp"]
            g_a = rm["hGoals"]
            g_b = rm["aGoals"]

            pair_eta = (eta_map[id_a] + eta_map[id_b]) / 2.0
            e_a = expected_score(r_a, r_b, scale_factor)
            e_b = 1.0 - e_a

            # Discrete match outcome
            s_a = 1.0 if g_a > g_b else (0.5 if g_a == g_b else 0.0)
            s_b = 1.0 - s_a

            # Continuous Fermi-Dirac match outcome
            s_fp_a = fermi_dirac(fp_a - fp_b, scale=8.5)
            s_fp_b = 1.0 - s_fp_a

            # Blended match result (65% goals, 35% continuous score)
            s_tilde_a = 0.65 * s_a + 0.35 * s_fp_a
            s_tilde_b = 1.0 - s_tilde_a

            delta_h2h_a = pair_eta * 26.0 * (s_tilde_a - e_a)
            delta_h2h_b = -delta_h2h_a

            h2h_deltas[id_a] = delta_h2h_a
            h2h_deltas[id_b] = delta_h2h_b

            res_a = 'W' if g_a > g_b else ('L' if g_a < g_b else 'D')
            res_b = 'L' if g_a > g_b else ('W' if g_a < g_b else 'D')

            match_meta[id_a] = {
                "opponentId": id_b,
                "opponentTeamName": rm["awayTeam"],
                "result": res_a,
                "winProbPreMatch": round(e_a * 100.0, 1),
                "isHome": True,
                "gf": g_a,
                "ga": g_b,
                "fpFor": round(fp_a, 1),
                "fpAgainst": round(fp_b, 1)
            }
            match_meta[id_b] = {
                "opponentId": id_a,
                "opponentTeamName": rm["homeTeam"],
                "result": res_b,
                "winProbPreMatch": round(e_b * 100.0, 1),
                "isHome": False,
                "gf": g_b,
                "ga": g_a,
                "fpFor": round(fp_b, 1),
                "fpAgainst": round(fp_a, 1)
            }

        # 2. Field All-Play Component across active managers
        field_deltas: Dict[str, float] = {}
        for m_i in active_mgrs:
            r_i = pre_ratings.get(m_i, base_rating)
            fp_i = round_fp[m_i]
            field_sum = 0.0
            for m_k in active_mgrs:
                if m_k != m_i:
                    r_k = pre_ratings.get(m_k, base_rating)
                    fp_k = round_fp[m_k]
                    pair_eta = (eta_map[m_i] + eta_map[m_k]) / 2.0
                    s_ik = fermi_dirac(fp_i - fp_k, scale=8.5)
                    e_ik = expected_score(r_i, r_k, scale_factor)
                    field_sum += pair_eta * (s_ik - e_ik)

            field_deltas[m_i] = (15.6 / float(N - 1)) * field_sum

        # 3. Apply Total Delta = H2H + Field
        for m_id in active_mgrs:
            d_h2h = h2h_deltas.get(m_id, 0.0)
            d_field = field_deltas.get(m_id, 0.0)
            total_delta = d_h2h + d_field
            old_r = pre_ratings[m_id]
            new_r = old_r + total_delta

            if m_id not in tracker:
                tracker[m_id] = {
                    "current": base_rating,
                    "peak": {"value": base_rating, "season": season_label, "round": r_num},
                    "floor": {"value": base_rating, "season": season_label, "round": r_num},
                    "lastDelta": 0.0,
                    "trajectory": []
                }

            tracker[m_id]["current"] = round(new_r, 1)
            tracker[m_id]["lastDelta"] = round(total_delta, 1)
            if new_r > tracker[m_id]["peak"]["value"]:
                tracker[m_id]["peak"] = {"value": round(new_r, 1), "season": season_label, "round": r_num}
            if new_r < tracker[m_id]["floor"]["value"]:
                tracker[m_id]["floor"] = {"value": round(new_r, 1), "season": season_label, "round": r_num}

            meta = match_meta.get(m_id, {
                "opponentId": "field",
                "opponentTeamName": "Field",
                "result": "D",
                "winProbPreMatch": 50.0,
                "isHome": True,
                "gf": 0,
                "ga": 0,
                "fpFor": round(round_fp[m_id], 1),
                "fpAgainst": 0.0
            })

            tracker[m_id]["trajectory"].append({
                "round": r_num,
                "season": season_label,
                "elo": round(new_r, 1),
                "opponentId": meta["opponentId"],
                "opponentTeamName": meta["opponentTeamName"],
                "result": meta["result"],
                "delta": round(total_delta, 1),
                "h2hDelta": round(d_h2h, 1),
                "fieldDelta": round(d_field, 1),
                "winProbPreMatch": meta["winProbPreMatch"],
                "isHome": meta["isHome"],
                "gf": meta["gf"],
                "ga": meta["ga"],
                "fpFor": meta["fpFor"],
                "fpAgainst": meta["fpAgainst"]
            })

    return tracker


def compute_season_diagnostics(
    rounds_by_season: Dict[str, List[Dict[str, Any]]],
    all_managers: List[str]
) -> Dict[str, Dict[str, Dict[str, Any]]]:
    """
    Computes exact season diagnostics per manager for '2025/26', '2026/27', and 'all':
      - played: number of matches played
      - gf: total goals for
      - ga: total goals against
      - gd: goal difference
      - golo: ClubElo score (1.00 + gd / played)
      - totalFP: total fantasy points scored
      - avgFP: mean fantasy points per match
      - actualPts: actual league points (W=3, D=1, L=0)
      - xPts: expected points in All-Play against all other managers in each round
      - luckDelta: actualPts - xPts (Schedule Luck Delta)
    """
    diagnostics: Dict[str, Dict[str, Dict[str, Any]]] = {}

    def init_stat():
        return {
            "played": 0, "gf": 0, "ga": 0, "gd": 0, "golo": 1.0,
            "totalFP": 0.0, "avgFP": 0.0, "actualPts": 0, "xPts": 0.0, "luckDelta": 0.0
        }

    for s_key, r_list in rounds_by_season.items():
        s_stats = {m_id: init_stat() for m_id in all_managers}
        for r in r_list:
            matches = r.get("matches", [])
            round_scores = {}
            for m in matches:
                h = m.get("homeManagerId")
                a = m.get("awayManagerId")
                if not h or not a:
                    continue
                h_fp = float(m.get("homeFantaPoints", 0.0) or 0.0)
                a_fp = float(m.get("awayFantaPoints", 0.0) or 0.0)
                is_played = bool(m.get("isPlayed") or m.get("played") or h_fp > 0 or a_fp > 0)
                if not is_played:
                    continue
                hg = int(m.get("homeScore", 0) or 0)
                ag = int(m.get("awayScore", 0) or 0)
                round_scores[h] = (h_fp, hg)
                round_scores[a] = (a_fp, ag)

                if h in s_stats:
                    s_stats[h]["played"] += 1
                    s_stats[h]["gf"] += hg
                    s_stats[h]["ga"] += ag
                    s_stats[h]["totalFP"] += h_fp
                    if hg > ag: s_stats[h]["actualPts"] += 3
                    elif hg == ag: s_stats[h]["actualPts"] += 1

                if a in s_stats:
                    s_stats[a]["played"] += 1
                    s_stats[a]["gf"] += ag
                    s_stats[a]["ga"] += hg
                    s_stats[a]["totalFP"] += a_fp
                    if ag > hg: s_stats[a]["actualPts"] += 3
                    elif ag == hg: s_stats[a]["actualPts"] += 1

            active_in_round = list(round_scores.keys())
            N_active = len(active_in_round)
            if N_active > 1:
                for m1 in active_in_round:
                    if m1 in s_stats:
                        g1 = round_scores[m1][1]
                        pts_sum = sum(
                            3.0 if g1 > round_scores[m2][1] else (1.0 if g1 == round_scores[m2][1] else 0.0)
                            for m2 in active_in_round if m1 != m2
                        )
                        s_stats[m1]["xPts"] += pts_sum / float(N_active - 1)

        # Finalize stats
        for m_id, st in s_stats.items():
            if st["played"] > 0:
                st["gd"] = st["gf"] - st["ga"]
                st["golo"] = round(1.00 + (float(st["gd"]) / float(st["played"])), 2)
                st["avgFP"] = round(st["totalFP"] / float(st["played"]), 2)
                st["totalFP"] = round(st["totalFP"], 1)
                st["xPts"] = round(st["xPts"], 2)
                st["luckDelta"] = round(float(st["actualPts"]) - st["xPts"], 2)

        diagnostics[s_key] = s_stats

    # Aggregate 'all' (Totale Era Elo)
    all_stats = {m_id: init_stat() for m_id in all_managers}
    for s_key in rounds_by_season:
        for m_id in all_managers:
            st = diagnostics[s_key][m_id]
            all_stats[m_id]["played"] += st["played"]
            all_stats[m_id]["gf"] += st["gf"]
            all_stats[m_id]["ga"] += st["ga"]
            all_stats[m_id]["totalFP"] += st["totalFP"]
            all_stats[m_id]["actualPts"] += st["actualPts"]
            all_stats[m_id]["xPts"] += st["xPts"]

    for m_id, st in all_stats.items():
        if st["played"] > 0:
            st["gd"] = st["gf"] - st["ga"]
            st["golo"] = round(1.00 + (float(st["gd"]) / float(st["played"])), 2)
            st["avgFP"] = round(st["totalFP"] / float(st["played"]), 2)
            st["totalFP"] = round(st["totalFP"], 1)
            st["xPts"] = round(st["xPts"], 2)
            st["luckDelta"] = round(float(st["actualPts"]) - st["xPts"], 2)

    diagnostics["all"] = all_stats
    return diagnostics


def run_multi_track_elo_pipeline(
    season_2025_rounds: List[Dict[str, Any]],
    season_2026_rounds: List[Dict[str, Any]],
    managers_list: List[Dict[str, Any]],
    scoring_weights: Optional[Dict[str, float]] = None,
    elo_config: Optional[Dict[str, Any]] = None,
    existing_2025_trackers: Optional[Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Main orchestrator for the 3-Track Calibrated Elo System:
    1. Track 1: Flat (Puro H2H Hybrid-Capped, starting at 1500)
    2. Track 2: Historical (Dynasty H2H Hybrid-Capped, seeded by historical palmares)
    3. Track 3: Atlas Power (Atlas-Elo v2 Dual-Kernel All-Play, starting at 1500)
    Plus exact per-season diagnostics (Golo Score, xPts All-Play, Luck Delta, avgFP).
    """
    cfg = elo_config or DEFAULT_ELO_CONFIG
    base_r = float(cfg.get("base_rating", 1500.0))
    carryover_alpha = float(cfg.get("carryover_alpha", 0.75))

    hist_seeds = compute_historical_seed_elos(
        managers_list=managers_list,
        scoring_weights=scoring_weights,
        elo_config=cfg
    )

    manager_years = {}
    for m in managers_list:
        m_id = m.get("id")
        if m_id:
            h = m.get("history", [])
            manager_years[m_id] = len(h) if isinstance(h, list) else int(m.get("years", 0) or 0)

    # Collect managers in 2025 and 2026
    mgrs_2025 = set()
    for r in season_2025_rounds:
        for m in r.get("matches", []):
            if m.get("homeManagerId"): mgrs_2025.add(m["homeManagerId"])
            if m.get("awayManagerId"): mgrs_2025.add(m["awayManagerId"])

    mgrs_2026 = set()
    for r in season_2026_rounds:
        for m in r.get("matches", []):
            if m.get("homeManagerId"): mgrs_2026.add(m["homeManagerId"])
            if m.get("awayManagerId"): mgrs_2026.add(m["awayManagerId"])

    if existing_2025_trackers and not season_2025_rounds:
        if len(existing_2025_trackers) == 3:
            flat_tracker_2025, hist_tracker_2025, atlas_tracker_2025 = existing_2025_trackers
        else:
            flat_tracker_2025, hist_tracker_2025 = existing_2025_trackers[0], existing_2025_trackers[1]
            atlas_tracker_2025 = {}
    else:
        # Track 1: Flat 2025
        flat_start_2025 = {m_id: base_r for m_id in mgrs_2025}
        flat_tracker_2025 = simulate_season_elo(
            rounds_data=season_2025_rounds,
            starting_elos=flat_start_2025,
            season_label="2025/26",
            competition_category="Campionato",
            elo_config=cfg
        )

        # Track 2: Historical 2025
        hist_start_2025 = {m_id: hist_seeds.get(m_id, base_r) for m_id in mgrs_2025}
        hist_tracker_2025 = simulate_season_elo(
            rounds_data=season_2025_rounds,
            starting_elos=hist_start_2025,
            season_label="2025/26",
            competition_category="Campionato",
            elo_config=cfg
        )

        # Track 3: Atlas Power 2025 (starts at 1500)
        atlas_start_2025 = {m_id: base_r for m_id in mgrs_2025}
        atlas_tracker_2025 = simulate_season_atlas_elo(
            rounds_data=season_2025_rounds,
            starting_elos=atlas_start_2025,
            season_label="2025/26",
            manager_years=manager_years,
            elo_config=cfg
        )

    active_2026_list = list(mgrs_2026)

    # 1. Carryover into 2026/27 (Flat)
    flat_end_2025 = {m_id: flat_tracker_2025[m_id]["current"] for m_id in flat_tracker_2025}
    flat_start_2026 = apply_inter_season_carryover(
        flat_end_2025, carryover_alpha, base_r, active_managers=active_2026_list
    )
    for m_id in active_2026_list:
        if m_id not in flat_start_2026:
            flat_start_2026[m_id] = base_r

    flat_tracker_final = simulate_season_elo(
        rounds_data=season_2026_rounds,
        starting_elos=flat_start_2026,
        season_label="2026/27",
        competition_category="Campionato",
        elo_config=cfg,
        existing_tracker=flat_tracker_2025
    )

    # 2. Carryover into 2026/27 (Historical)
    hist_end_2025 = {m_id: hist_tracker_2025[m_id]["current"] for m_id in hist_tracker_2025}
    hist_start_2026 = apply_inter_season_carryover(
        hist_end_2025, carryover_alpha, base_r, active_managers=active_2026_list
    )
    for m_id in active_2026_list:
        if m_id not in hist_start_2026:
            hist_start_2026[m_id] = hist_seeds.get(m_id, base_r)

    hist_tracker_final = simulate_season_elo(
        rounds_data=season_2026_rounds,
        starting_elos=hist_start_2026,
        season_label="2026/27",
        competition_category="Campionato",
        elo_config=cfg,
        existing_tracker=hist_tracker_2025
    )

    # 3. Carryover into 2026/27 (Atlas Power)
    atlas_end_2025 = {m_id: atlas_tracker_2025[m_id]["current"] for m_id in atlas_tracker_2025}
    atlas_start_2026 = apply_inter_season_carryover(
        atlas_end_2025, carryover_alpha, base_r, active_managers=active_2026_list
    )
    for m_id in active_2026_list:
        if m_id not in atlas_start_2026:
            atlas_start_2026[m_id] = base_r

    atlas_tracker_final = simulate_season_atlas_elo(
        rounds_data=season_2026_rounds,
        starting_elos=atlas_start_2026,
        season_label="2026/27",
        manager_years=manager_years,
        elo_config=cfg,
        existing_tracker=atlas_tracker_2025
    )

    # All managers union
    all_manager_ids = sorted(list(
        set(flat_tracker_final.keys()).union(set(hist_tracker_final.keys())).union(set(atlas_tracker_final.keys()))
    ))

    # Compute exact season diagnostics
    season_diagnostics = compute_season_diagnostics(
        rounds_by_season={
            "2025/26": season_2025_rounds,
            "2026/27": season_2026_rounds
        },
        all_managers=all_manager_ids
    )

    # Build team and coach lookups
    team_name_lookup = {}
    coach_lookup = {}
    for r in season_2026_rounds + season_2025_rounds:
        for m in r.get("matches", []):
            if m.get("homeManagerId") and m.get("homeTeam"):
                team_name_lookup[m["homeManagerId"]] = m["homeTeam"]
            if m.get("awayManagerId") and m.get("awayTeam"):
                team_name_lookup[m["awayManagerId"]] = m["awayTeam"]

    for m in managers_list:
        if m.get("id"):
            coach_lookup[m["id"]] = m.get("name", "")

    def partition_seasons(data_dict: Dict[str, Any]) -> Dict[str, Any]:
        seasons: Dict[str, List[Dict[str, Any]]] = {}
        for pt in data_dict.get("trajectory", []):
            s_lbl = pt.get("season", "unknown")
            seasons.setdefault(s_lbl, []).append(pt)
        data_dict["seasons"] = seasons
        return data_dict

    result_profiles: Dict[str, Any] = {}
    for m_id in all_manager_ids:
        f_data = partition_seasons(flat_tracker_final.get(m_id, {
            "current": base_r,
            "peak": {"value": base_r, "season": "2026/27", "round": 0},
            "floor": {"value": base_r, "season": "2026/27", "round": 0},
            "lastDelta": 0.0,
            "trajectory": []
        }))
        h_data = partition_seasons(hist_tracker_final.get(m_id, {
            "current": base_r,
            "peak": {"value": base_r, "season": "2026/27", "round": 0},
            "floor": {"value": base_r, "season": "2026/27", "round": 0},
            "lastDelta": 0.0,
            "trajectory": []
        }))
        a_data = partition_seasons(atlas_tracker_final.get(m_id, {
            "current": base_r,
            "peak": {"value": base_r, "season": "2026/27", "round": 0},
            "floor": {"value": base_r, "season": "2026/27", "round": 0},
            "lastDelta": 0.0,
            "trajectory": []
        }))

        # Per-manager season stats dictionary
        m_season_stats = {
            s_key: season_diagnostics[s_key].get(m_id, {})
            for s_key in season_diagnostics
        }

        result_profiles[m_id] = {
            "managerId": m_id,
            "teamName": team_name_lookup.get(m_id, m_id),
            "coach": coach_lookup.get(m_id, ""),
            "flat": f_data,
            "historical": h_data,
            "atlas": a_data,
            "seasonStats": m_season_stats
        }

    return result_profiles


# Backwards compatibility alias
run_dual_track_elo_pipeline = run_multi_track_elo_pipeline

