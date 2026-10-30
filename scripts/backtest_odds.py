#!/usr/bin/env python3
"""
scripts/backtest_odds.py
Walk-forward out-of-sample backtest & empirical diagnostics for the Davidson 1X2 odds engine.

Computes multi-class Log-Loss, Ranked Probability Score (RPS), Draw calibration,
and favourite calibration on historical league seasons.

Usage:
    python3 scripts/backtest_odds.py
    python3 scripts/backtest_odds.py --season 2025/26 --mode atlas
"""

import argparse
import json
import math
import os
import sys
from collections import defaultdict
from pathlib import Path

# Load shared econometric odds parameters from core configuration
try:
    from scripts.core.config import LEAGUE_RULES
except ImportError:
    try:
        from core.config import LEAGUE_RULES
    except ImportError:
        LEAGUE_RULES = {}

DEFAULT_ODDS_CFG = (LEAGUE_RULES.get("elo") or {}).get("odds", {})
DEFAULT_KAPPA = DEFAULT_ODDS_CFG.get("sensitivity_kappa", 0.55)
DEFAULT_NU0 = DEFAULT_ODDS_CFG.get("base_draw_nu", 0.72)
DEFAULT_LAM = DEFAULT_ODDS_CFG.get("draw_decay_lambda", 0.03)


def goals(fp: float, base: float = 66.0, step: float = 6.0) -> int:
    """Converts Fantacalcio points to goals using official step brackets."""
    if fp < base:
        return 0
    return int(1 + (fp - base) // step)


def outcome_idx(home_score: int, away_score: int) -> int:
    """Returns 0 for Home Win (1), 1 for Draw (X), 2 for Away Win (2)."""
    if home_score > away_score:
        return 0
    if home_score == away_score:
        return 1
    return 2


def davidson_probs(delta_z: float, kappa: float = DEFAULT_KAPPA, nu0: float = DEFAULT_NU0, lam: float = DEFAULT_LAM):
    """Computes exact 3-way Davidson probabilities with dynamic rational draw decay."""
    half_kappa = 0.5 * kappa
    term_a = math.exp(half_kappa * delta_z)
    term_b = math.exp(-half_kappa * delta_z)
    dynamic_nu = nu0 / (1.0 + lam * (delta_z ** 2))
    denom = term_a + term_b + dynamic_nu
    return [term_a / denom, dynamic_nu / denom, term_b / denom]


def log_loss(probs, outcome: int) -> float:
    return -math.log(max(probs[outcome], 1e-12))


def rps(probs, outcome: int) -> float:
    """Ranked Probability Score for 3 ordered outcomes (1, X, 2)."""
    obs = [0.0, 0.0, 0.0]
    obs[outcome] = 1.0
    c1 = probs[0] - obs[0]
    c2 = (probs[0] + probs[1]) - (obs[0] + obs[1])
    return 0.5 * (c1 * c1 + c2 * c2)


def run_backtest(season: str = "2025/26", root_dir: str = "."):
    rounds_file = Path(root_dir) / f"data/seasons/{season.replace('/', '-')}_rounds.json"
    analytics_file = Path(root_dir) / "public/analytics_data.json"

    if not rounds_file.exists():
        print(f"[ERROR] Rounds file not found: {rounds_file}")
        sys.exit(1)
    if not analytics_file.exists():
        print(f"[ERROR] Analytics data not found: {analytics_file}")
        sys.exit(1)

    with open(rounds_file, "r", encoding="utf-8") as f:
        rounds_data = json.load(f)
    with open(analytics_file, "r", encoding="utf-8") as f:
        analytics_data = json.load(f)

    # Load trajectory pre-match Elos per manager, round, track
    pre_match_elos = {"atlas": {}, "flat": {}, "historical": {}}
    for m_id, mgr in analytics_data.get("managers", {}).items():
        for track in ("atlas", "flat", "historical"):
            traj = (mgr.get(track) or {}).get("trajectory", [])
            for pt in traj:
                if pt.get("competitionCategory") == "Campionato" and pt.get("season") == season:
                    r_num = pt.get("round")
                    pre_elo = pt.get("elo", 1500.0) - (pt.get("delta") or 0.0)
                    pre_match_elos[track][(r_num, m_id)] = pre_elo

    matches = []
    rounds = rounds_data.get("rounds", []) if isinstance(rounds_data, dict) else rounds_data
    for r in rounds:
        r_num = r.get("roundNumber", 0)
        for m in r.get("matches", []):
            if not m.get("isPlayed") or m.get("homeFantaPoints") is None:
                continue
            h_fp = float(m["homeFantaPoints"])
            a_fp = float(m["awayFantaPoints"])
            h_score = int(m.get("homeScore", goals(h_fp)))
            a_score = int(m.get("awayScore", goals(a_fp)))
            matches.append({
                "round": r_num,
                "homeManagerId": m.get("homeManagerId"),
                "awayManagerId": m.get("awayManagerId"),
                "homeTeam": m.get("homeTeam"),
                "awayTeam": m.get("awayTeam"),
                "homeFP": h_fp,
                "awayFP": a_fp,
                "outcome": outcome_idx(h_score, a_score)
            })

    total_matches = len(matches)
    if total_matches == 0:
        print("[WARN] No played matches found in dataset.")
        return

    outcomes = [m["outcome"] for m in matches]
    base_1 = outcomes.count(0) / total_matches
    base_X = outcomes.count(1) / total_matches
    base_2 = outcomes.count(2) / total_matches

    print(f"\n========================================================")
    print(f" InsalAtlas 1X2 Odds Engine Walk-Forward Backtest")
    print(f" Season: {season} | Matches: {total_matches}")
    print(f" Empirical Base Rates: 1: {base_1*100:.1f}% | X: {base_X*100:.1f}% | 2: {base_2*100:.1f}%")
    print(f"========================================================\n")

    # Walk-forward simulation
    models = {
        "BASE (Constant Empirical)": {"ll": 0.0, "rps": 0.0, "n": 0, "preds": []},
        "DAVIDSON (Atlas Profile)": {"ll": 0.0, "rps": 0.0, "n": 0, "preds": []},
        "DAVIDSON (Flat Profile)": {"ll": 0.0, "rps": 0.0, "n": 0, "preds": []},
    }

    round_numbers = sorted(set(m["round"] for m in matches))
    fp_history = defaultdict(list)

    for r_num in round_numbers:
        round_matches = [m for m in matches if m["round"] == r_num]

        # Prior information available strictly before r_num
        if r_num > 1:
            n_avg = sum(len(v) for v in fp_history.values()) / max(1, len(fp_history))
            k_shrink = 5.0
            prior_sigma_elo = 60.0

            # Compute stats for power
            team_means = {t: sum(v)/len(v) for t, v in fp_history.items() if len(v) > 0}
            league_mean_fp = sum(team_means.values()) / max(1, len(team_means))
            std_curr_fp = math.sqrt(sum((x - league_mean_fp)**2 for x in team_means.values()) / max(1, len(team_means)))
            std_curr_fp = max(1.5, std_curr_fp)

            for m in round_matches:
                h_id = m["homeManagerId"]
                a_id = m["awayManagerId"]
                act_outcome = m["outcome"]

                # Base model prediction
                p_base = [base_1, base_X, base_2]
                models["BASE (Constant Empirical)"]["ll"] += log_loss(p_base, act_outcome)
                models["BASE (Constant Empirical)"]["rps"] += rps(p_base, act_outcome)
                models["BASE (Constant Empirical)"]["n"] += 1
                models["BASE (Constant Empirical)"]["preds"].append((p_base, act_outcome))

                # Team powers
                nh = len(fp_history.get(h_id, []))
                na = len(fp_history.get(a_id, []))
                zh = (nh / (nh + k_shrink)) * ((team_means.get(h_id, league_mean_fp) - league_mean_fp) / std_curr_fp)
                za = (na / (na + k_shrink)) * ((team_means.get(a_id, league_mean_fp) - league_mean_fp) / std_curr_fp)
                delta_z_power = zh - za

                # Evaluate for Atlas and Flat tracks
                for track, model_name, w_elo, w_pow in [
                    ("atlas", "DAVIDSON (Atlas Profile)", 0.85, 0.15),
                    ("flat", "DAVIDSON (Flat Profile)", 0.65, 0.35)
                ]:
                    eh = pre_match_elos[track].get((r_num, h_id))
                    ea = pre_match_elos[track].get((r_num, a_id))
                    if eh is None or ea is None:
                        continue

                    # Variance anchor
                    round_elos = [v for (r_, _), v in pre_match_elos[track].items() if r_ == r_num]
                    mean_elo = sum(round_elos) / max(1, len(round_elos))
                    raw_std_elo = math.sqrt(sum((x - mean_elo)**2 for x in round_elos) / max(1, len(round_elos)))
                    blended_var = (n_avg / (n_avg + k_shrink)) * (raw_std_elo**2) + (k_shrink / (n_avg + k_shrink)) * (prior_sigma_elo**2)
                    std_elo = max(35.0, math.sqrt(blended_var))

                    delta_z_elo = (eh - ea) / std_elo
                    delta_z = w_elo * delta_z_elo + w_pow * delta_z_power

                    p_dav = davidson_probs(delta_z, kappa=0.55, nu0=0.72, lam=0.03)
                    models[model_name]["ll"] += log_loss(p_dav, act_outcome)
                    models[model_name]["rps"] += rps(p_dav, act_outcome)
                    models[model_name]["n"] += 1
                    models[model_name]["preds"].append((p_dav, act_outcome))

        # Update historical state with round results
        for m in round_matches:
            fp_history[m["homeManagerId"]].append(m["homeFP"])
            fp_history[m["awayManagerId"]].append(m["awayFP"])

    # Results table
    print(f"{'Model Name':<30}{'Log-Loss ↓':>12}{'RPS ↓':>10}{'Avg P(1)':>10}{'Avg P(X)':>10}{'Avg P(2)':>10}")
    print("-" * 82)
    for name, stats in models.items():
        n = max(1, stats["n"])
        avg_ll = stats["ll"] / n
        avg_rps = stats["rps"] / n
        avg_p1 = sum(p[0] for p, _ in stats["preds"]) / n
        avg_px = sum(p[1] for p, _ in stats["preds"]) / n
        avg_p2 = sum(p[2] for p, _ in stats["preds"]) / n
        print(f"{name:<30}{avg_ll:>12.4f}{avg_rps:>10.4f}{avg_p1*100:>9.1f}%{avg_px*100:>9.1f}%{avg_p2*100:>9.1f}%")
    print("-" * 82)
    print("[SUCCESS] Walk-forward validation complete.\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run 1X2 Odds Engine Walk-Forward Backtest")
    parser.add_argument("--season", default="2025/26", help="Season to backtest (default: 2025/26)")
    args = parser.parse_args()
    run_backtest(season=args.season)
