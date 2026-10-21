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


def margin_multiplier(goals_a: int, goals_b: int, fp_a: float, fp_b: float) -> float:
    """
    Computes margin of victory and fantapoint differential multiplier M_{A, B}.
    Decisive match: M = ln(1 + |deltaGoals|) * sqrt((|deltaFP| + 10) / 10)
    Draw match: M = sqrt((|deltaFP| + 10) / 10)
    """
    delta_goals = abs(int(goals_a) - int(goals_b))
    delta_fp = abs(float(fp_a) - float(fp_b))

    fp_factor = math.sqrt((delta_fp + 10.0) / 10.0)

    if delta_goals == 0:
        return fp_factor
    return math.log(1.0 + delta_goals) * fp_factor


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
    scale_factor: float = 400.0
) -> Tuple[float, float, float, float, float, float]:
    """
    Calculates bilateral rating update adhering strictly to the Zero-Sum Invariant.
    Returns: (new_rating_a, new_rating_b, delta_a, delta_b, exp_a, exp_b)
    """
    exp_a = expected_score(rating_a, rating_b, scale_factor)
    exp_b = 1.0 - exp_a

    m_mult = margin_multiplier(goals_a, goals_b, fp_a, fp_b)

    delta_a = k_factor * m_mult * (outcome_a - exp_a)
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
    base_rating: float = 1500.0
) -> Dict[str, float]:
    """
    Applies mean reversion between seasons:
    R_start = alpha * R_end + (1 - alpha) * base_rating
    """
    return {
        m_id: round(carryover_alpha * r + (1.0 - carryover_alpha) * base_rating, 1)
        for m_id, r in end_ratings.items()
    }


def simulate_season_elo(
    rounds_data: List[Dict[str, Any]],
    starting_elos: Dict[str, float],
    season_label: str,
    competition_category: str = "Campionato",
    elo_config: Optional[Dict[str, Any]] = None,
    existing_tracker: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Simulates a sequence of completed matchdays, updating Elo ratings chronologically.
    Returns tracking dictionary indexed by managerId with:
      - current: current rating
      - peak: { value, season, round }
      - floor: { value, season, round }
      - lastDelta: rating delta from most recent match
      - trajectory: list of EloTrajectoryPoint
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
            # Update current rating to starting_elos (e.g. after carryover)
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
                "isHome": True
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
                "isHome": False
            })

    return tracker


def run_dual_track_elo_pipeline(
    season_2025_rounds: List[Dict[str, Any]],
    season_2026_rounds: List[Dict[str, Any]],
    managers_list: List[Dict[str, Any]],
    scoring_weights: Optional[Dict[str, float]] = None,
    elo_config: Optional[Dict[str, Any]] = None,
    existing_2025_trackers: Optional[Tuple[Dict[str, Any], Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Main orchestrator function:
    1. Calibrates initial ratings for 2025/26:
       - Flat: All 12 managers start at 1500.0
       - Historical: Seeded from Albo d'Oro trophies up to 2024/25
    2. Simulates 2025/26 (33 rounds) for both tracks (or reuses existing_2025_trackers).
    3. Applies carryover (0.75 * R_end + 0.25 * 1500) into 2026/27.
       Newcomers entering in 2026/27 enter at 1500.0.
    4. Simulates active 2026/27 rounds for both tracks.
    Returns:
      Dict indexed by managerId with ManagerEloProfile { flat: ..., historical: ... }
    """
    cfg = elo_config or DEFAULT_ELO_CONFIG
    base_r = float(cfg.get("base_rating", 1500.0))
    carryover_alpha = float(cfg.get("carryover_alpha", 0.75))

    hist_seeds = compute_historical_seed_elos(
        managers_list=managers_list,
        scoring_weights=scoring_weights,
        elo_config=cfg
    )

    if existing_2025_trackers and not season_2025_rounds:
        flat_tracker_2025, hist_tracker_2025 = existing_2025_trackers
    else:
        # --- 1. TRACK 1: FLAT ELO ---
        # 2025/26 initial flat elos: all active managers in 2025 start at 1500.0
        # Collect all managers present in 2025/26 rounds
        mgrs_2025 = set()
        for r in season_2025_rounds:
            for m in r.get("matches", []):
                if m.get("homeManagerId"):
                    mgrs_2025.add(m["homeManagerId"])
                if m.get("awayManagerId"):
                    mgrs_2025.add(m["awayManagerId"])

        flat_start_2025 = {m_id: base_r for m_id in mgrs_2025}

        # Simulate 2025/26 Flat
        flat_tracker_2025 = simulate_season_elo(
            rounds_data=season_2025_rounds,
            starting_elos=flat_start_2025,
            season_label="2025/26",
            competition_category="Campionato",
            elo_config=cfg
        )

        # --- 2. TRACK 2: HISTORICAL-SEEDED ELO ---
        hist_start_2025 = {m_id: hist_seeds.get(m_id, base_r) for m_id in mgrs_2025}

        # Simulate 2025/26 Historical
        hist_tracker_2025 = simulate_season_elo(
            rounds_data=season_2025_rounds,
            starting_elos=hist_start_2025,
            season_label="2025/26",
            competition_category="Campionato",
            elo_config=cfg
        )

    # Carryover into 2026/27 (Flat)
    flat_end_2025 = {m_id: flat_tracker_2025[m_id]["current"] for m_id in flat_tracker_2025}
    flat_start_2026 = apply_inter_season_carryover(flat_end_2025, carryover_alpha, base_r)

    # Any newcomer in 2026/27 starts at 1500.0
    for r in season_2026_rounds:
        for m in r.get("matches", []):
            for m_id in [m.get("homeManagerId"), m.get("awayManagerId")]:
                if m_id and m_id not in flat_start_2026:
                    flat_start_2026[m_id] = base_r

    # Simulate 2026/27 Flat
    flat_tracker_final = simulate_season_elo(
        rounds_data=season_2026_rounds,
        starting_elos=flat_start_2026,
        season_label="2026/27",
        competition_category="Campionato",
        elo_config=cfg,
        existing_tracker=flat_tracker_2025
    )

    # Carryover into 2026/27 (Historical)
    hist_end_2025 = {m_id: hist_tracker_2025[m_id]["current"] for m_id in hist_tracker_2025}
    hist_start_2026 = apply_inter_season_carryover(hist_end_2025, carryover_alpha, base_r)

    for r in season_2026_rounds:
        for m in r.get("matches", []):
            for m_id in [m.get("homeManagerId"), m.get("awayManagerId")]:
                if m_id and m_id not in hist_start_2026:
                    # Newcomer seeded by historical trophies if available or base_rating
                    hist_start_2026[m_id] = hist_seeds.get(m_id, base_r)

    # Simulate 2026/27 Historical
    hist_tracker_final = simulate_season_elo(
        rounds_data=season_2026_rounds,
        starting_elos=hist_start_2026,
        season_label="2026/27",
        competition_category="Campionato",
        elo_config=cfg,
        existing_tracker=hist_tracker_2025
    )

    # Combine into unified profiles
    all_manager_ids = set(flat_tracker_final.keys()).union(set(hist_tracker_final.keys()))

    # Build managerId -> teamName lookup
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

    result_profiles: Dict[str, Any] = {}
    for m_id in all_manager_ids:
        flat_data = flat_tracker_final.get(m_id, {
            "current": base_r,
            "peak": {"value": base_r, "season": "2026/27", "round": 0},
            "floor": {"value": base_r, "season": "2026/27", "round": 0},
            "lastDelta": 0.0,
            "trajectory": []
        })
        hist_data = hist_tracker_final.get(m_id, {
            "current": base_r,
            "peak": {"value": base_r, "season": "2026/27", "round": 0},
            "floor": {"value": base_r, "season": "2026/27", "round": 0},
            "lastDelta": 0.0,
            "trajectory": []
        })

        # Partition trajectory points by season for instant O(1) seasonal lookup
        flat_seasons: Dict[str, List[Dict[str, Any]]] = {}
        for pt in flat_data.get("trajectory", []):
            s_label = pt.get("season", "unknown")
            flat_seasons.setdefault(s_label, []).append(pt)
        flat_data["seasons"] = flat_seasons

        hist_seasons: Dict[str, List[Dict[str, Any]]] = {}
        for pt in hist_data.get("trajectory", []):
            s_label = pt.get("season", "unknown")
            hist_seasons.setdefault(s_label, []).append(pt)
        hist_data["seasons"] = hist_seasons

        result_profiles[m_id] = {
            "managerId": m_id,
            "teamName": team_name_lookup.get(m_id, m_id),
            "coach": coach_lookup.get(m_id, ""),
            "flat": flat_data,
            "historical": hist_data
        }

    return result_profiles
