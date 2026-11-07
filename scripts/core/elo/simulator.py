"""
scripts/core/elo/simulator.py
Season simulation engines for Flat, Historical, and Atlas-Elo v2 tracks.
"""

import math
from typing import Dict, Any, List, Optional
from .calculator import (
    DEFAULT_ELO_CONFIG,
    get_k_factor,
    calculate_match_elo_update,
    expected_score,
    fermi_dirac
)


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
        r_label = r.get("roundLabel") or f"G{r_num}"
        r_match_idx = r.get("matchIndex") or r_num
        r_cat = r.get("competitionCategory") or competition_category
        r_ch_md = r.get("championshipMatchDay")
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

            match_cat = m.get("competitionCategory") or r_cat
            match_k = get_k_factor(match_cat, cfg)

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
                k_factor=match_k,
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
                "roundLabel": r_label,
                "matchIndex": r_match_idx,
                "championshipMatchDay": m.get("championshipMatchDay") or r_ch_md,
                "competitionCategory": match_cat,
                "competition": m.get("competition") or match_cat,
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
                "roundLabel": r_label,
                "matchIndex": r_match_idx,
                "championshipMatchDay": m.get("championshipMatchDay") or r_ch_md,
                "competitionCategory": match_cat,
                "competition": m.get("competition") or match_cat,
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
        r_label = r.get("roundLabel") or f"G{r_num}"
        r_match_idx = r.get("matchIndex") or r_num
        r_cat = r.get("competitionCategory") or "Campionato"
        r_ch_md = r.get("championshipMatchDay")
        matches = r.get("matches", [])

        # Competition scaling: scale base sensitivity by K_factor / 32.0
        cat_scale = float(get_k_factor(r_cat, cfg)) / 32.0
        k_h2h_base = 26.0 * cat_scale
        k_field_base = 15.6 * cat_scale

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
                "aFp": a_fp,
                "competition": m.get("competition") or r.get("competition") or r_cat
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

            delta_h2h_a = pair_eta * k_h2h_base * (s_tilde_a - e_a)
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
                "fpAgainst": round(fp_b, 1),
                "competition": rm.get("competition")
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
                "fpAgainst": round(fp_a, 1),
                "competition": rm.get("competition")
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

            field_deltas[m_i] = (k_field_base / float(N - 1)) * field_sum

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
                "fpAgainst": 0.0,
                "competition": r_cat
            })

            tracker[m_id]["trajectory"].append({
                "round": r_num,
                "roundLabel": r_label,
                "matchIndex": r_match_idx,
                "championshipMatchDay": r_ch_md,
                "competitionCategory": r_cat,
                "competition": meta.get("competition") or r_cat,
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
