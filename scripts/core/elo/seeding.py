"""
scripts/core/elo/seeding.py
Historical Palmares Seeding (Track 2) and Inter-Season Carryover with Mean-Centering.
"""

import statistics
from typing import Dict, Any, List, Optional
from .calculator import DEFAULT_ELO_CONFIG, DEFAULT_SCORING_WEIGHTS


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
