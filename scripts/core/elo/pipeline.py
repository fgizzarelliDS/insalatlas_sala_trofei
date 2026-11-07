"""
scripts/core/elo/pipeline.py
Multi-Track (Flat, Historical, Atlas) Elo Pipeline Orchestration and Diagnostics.
"""

from typing import Dict, Any, List, Optional, Tuple
from .calculator import DEFAULT_ELO_CONFIG
from .seeding import compute_historical_seed_elos, apply_inter_season_carryover
from .simulator import simulate_season_elo, simulate_season_atlas_elo


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
    seasons_rounds: Optional[List[Tuple[str, List[Dict[str, Any]]]]] = None,
    managers_list: Optional[List[Dict[str, Any]]] = None,
    scoring_weights: Optional[Dict[str, float]] = None,
    elo_config: Optional[Dict[str, Any]] = None,
    # Backward compatibility arguments
    season_2025_rounds: Optional[List[Dict[str, Any]]] = None,
    season_2026_rounds: Optional[List[Dict[str, Any]]] = None,
    existing_trackers: Optional[Dict[str, Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]]] = None,
    existing_2025_trackers: Optional[Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Main orchestrator for the 3-Track Calibrated Elo System:
    1. Track 1: Flat (Puro H2H Hybrid-Capped, starting at 1500)
    2. Track 2: Historical (Dynasty H2H Hybrid-Capped, seeded by historical palmares)
    3. Track 3: Atlas Power (Atlas-Elo v2 Dual-Kernel All-Play, starting at 1500)
    Plus exact per-season diagnostics (Golo Score, xPts All-Play, Luck Delta, avgFP).

    Supports an arbitrary chronological sequence of N seasons:
    `seasons_rounds = [(season_label_1, rounds_1), (season_label_2, rounds_2), ...]`
    """
    cfg = elo_config or DEFAULT_ELO_CONFIG
    base_r = float(cfg.get("base_rating", 1500.0))
    carryover_alpha = float(cfg.get("carryover_alpha", 0.75))
    managers_list = managers_list or []

    # Normalize existing_trackers if deprecated existing_2025_trackers was provided
    if existing_trackers is None and existing_2025_trackers is not None:
        existing_trackers = {"2025/26": existing_2025_trackers}
    elif existing_trackers is None:
        existing_trackers = {}

    # Normalize seasons_rounds if deprecated pairwise rounds were provided
    if seasons_rounds is None:
        seasons_rounds = []
        if season_2025_rounds is not None or "2025/26" in existing_trackers:
            seasons_rounds.append(("2025/26", season_2025_rounds or []))
        if season_2026_rounds is not None:
            seasons_rounds.append(("2026/27", season_2026_rounds or []))
        if not seasons_rounds:
            seasons_rounds = [("live", [])]

    first_season_label = seasons_rounds[0][0] if seasons_rounds else "2025/26"
    hist_seeds = compute_historical_seed_elos(
        managers_list=managers_list,
        scoring_weights=scoring_weights,
        season_until=first_season_label,
        elo_config=cfg
    )

    manager_years = {}
    for m in managers_list:
        m_id = m.get("id")
        if m_id:
            h = m.get("history", [])
            manager_years[m_id] = len(h) if isinstance(h, list) else int(m.get("years", 0) or 0)

    flat_tracker: Dict[str, Any] = {}
    hist_tracker: Dict[str, Any] = {}
    atlas_tracker: Dict[str, Any] = {}

    for s_idx, (s_label, s_rounds) in enumerate(seasons_rounds):
        # Collect managers in this season's rounds
        season_mgrs = set()
        for r in s_rounds:
            for m in r.get("matches", []):
                if m.get("homeManagerId"): season_mgrs.add(m["homeManagerId"])
                if m.get("awayManagerId"): season_mgrs.add(m["awayManagerId"])

        # Check if pre-computed trackers are supplied for this season (e.g. disk recovery in CI)
        if s_label in existing_trackers and (not s_rounds or len(s_rounds) == 0):
            ex_tuple = existing_trackers[s_label]
            if len(ex_tuple) == 3:
                flat_tracker, hist_tracker, atlas_tracker = ex_tuple
            else:
                flat_tracker, hist_tracker = ex_tuple[0], ex_tuple[1]
                atlas_tracker = {}
            continue

        if s_idx == 0 and not flat_tracker:
            # First season initialization
            flat_start = {m_id: base_r for m_id in season_mgrs}
            hist_start = {m_id: hist_seeds.get(m_id, base_r) for m_id in season_mgrs}
            atlas_start = {m_id: base_r for m_id in season_mgrs}

            flat_tracker = simulate_season_elo(
                rounds_data=s_rounds,
                starting_elos=flat_start,
                season_label=s_label,
                competition_category="Campionato",
                elo_config=cfg
            )
            hist_tracker = simulate_season_elo(
                rounds_data=s_rounds,
                starting_elos=hist_start,
                season_label=s_label,
                competition_category="Campionato",
                elo_config=cfg
            )
            atlas_tracker = simulate_season_atlas_elo(
                rounds_data=s_rounds,
                starting_elos=atlas_start,
                season_label=s_label,
                manager_years=manager_years,
                elo_config=cfg
            )
        else:
            # Subsequent season carryover
            active_list = list(season_mgrs)

            # 1. Flat Carryover
            flat_end_prev = {m_id: flat_tracker[m_id]["current"] for m_id in flat_tracker}
            flat_start = apply_inter_season_carryover(
                flat_end_prev, carryover_alpha, base_r, active_managers=active_list
            )
            for m_id in active_list:
                if m_id not in flat_start:
                    flat_start[m_id] = base_r

            flat_tracker = simulate_season_elo(
                rounds_data=s_rounds,
                starting_elos=flat_start,
                season_label=s_label,
                competition_category="Campionato",
                elo_config=cfg,
                existing_tracker=flat_tracker
            )

            # 2. Historical Carryover
            hist_end_prev = {m_id: hist_tracker[m_id]["current"] for m_id in hist_tracker}
            hist_start = apply_inter_season_carryover(
                hist_end_prev, carryover_alpha, base_r, active_managers=active_list
            )
            for m_id in active_list:
                if m_id not in hist_start:
                    hist_start[m_id] = hist_seeds.get(m_id, base_r)

            hist_tracker = simulate_season_elo(
                rounds_data=s_rounds,
                starting_elos=hist_start,
                season_label=s_label,
                competition_category="Campionato",
                elo_config=cfg,
                existing_tracker=hist_tracker
            )

            # 3. Atlas Power Carryover
            atlas_end_prev = {m_id: atlas_tracker[m_id]["current"] for m_id in atlas_tracker}
            atlas_start = apply_inter_season_carryover(
                atlas_end_prev, carryover_alpha, base_r, active_managers=active_list
            )
            for m_id in active_list:
                if m_id not in atlas_start:
                    atlas_start[m_id] = base_r

            atlas_tracker = simulate_season_atlas_elo(
                rounds_data=s_rounds,
                starting_elos=atlas_start,
                season_label=s_label,
                manager_years=manager_years,
                elo_config=cfg,
                existing_tracker=atlas_tracker
            )

    # All managers union
    all_manager_ids = sorted(list(
        set(flat_tracker.keys()).union(set(hist_tracker.keys())).union(set(atlas_tracker.keys()))
    ))

    # Compute exact season diagnostics dynamically for all seasons present
    rounds_by_season = {s_label: s_rounds for s_label, s_rounds in seasons_rounds if s_rounds}
    season_diagnostics = compute_season_diagnostics(
        rounds_by_season=rounds_by_season,
        all_managers=all_manager_ids
    )

    # Build team and coach lookups dynamically
    team_name_lookup = {}
    coach_lookup = {}
    for s_label, s_rounds in seasons_rounds:
        for r in s_rounds:
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

    latest_season = seasons_rounds[-1][0] if seasons_rounds else "unknown"

    result_profiles: Dict[str, Any] = {}
    for m_id in all_manager_ids:
        f_data = partition_seasons(flat_tracker.get(m_id, {
            "current": base_r,
            "peak": {"value": base_r, "season": latest_season, "round": 0},
            "floor": {"value": base_r, "season": latest_season, "round": 0},
            "lastDelta": 0.0,
            "trajectory": []
        }))
        h_data = partition_seasons(hist_tracker.get(m_id, {
            "current": base_r,
            "peak": {"value": base_r, "season": latest_season, "round": 0},
            "floor": {"value": base_r, "season": latest_season, "round": 0},
            "lastDelta": 0.0,
            "trajectory": []
        }))
        a_data = partition_seasons(atlas_tracker.get(m_id, {
            "current": base_r,
            "peak": {"value": base_r, "season": latest_season, "round": 0},
            "floor": {"value": base_r, "season": latest_season, "round": 0},
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
