"""
scripts/core/elo/calculator.py
Core mathematical functions, margin multipliers, and bilateral match updates for Elo.
"""

import math
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
