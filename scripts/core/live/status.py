"""
scripts/core/live/status.py
Status badge calculation and recency-weighted momentum scoring for live season teams.
"""

from typing import List, Tuple


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
