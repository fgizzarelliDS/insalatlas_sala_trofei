"""
scripts/core/extractor.py
Orchestration of historical data extraction and aggregation pipeline.
"""

import os
import sys
import json
import time
from typing import Optional, Dict, Any, List, Tuple

from .config import get_base_dir, get_scripts_dir, get_public_dir, LEAGUE_ALIAS
from .logger import ok, info, warn, error, banner
from .rules import (
    parse_season_year,
    is_championship,
    create_championship_achievements,
    create_cup_achievement,
    get_cartonato_icon
)
from .resolver import resolve_manager_id
from .assets import resolve_team_crest
from .api import run_download_pipeline

POINTS_OVERRIDE_2020_21 = {}

def extract_data(root_dir: Optional[str] = None) -> int:
    if not root_dir:
        root_dir = get_base_dir()

    scripts_dir = get_scripts_dir()
    palmares_file = os.path.join(scripts_dir, f"{LEAGUE_ALIAS}_palmares_raw.json")
    trophies_file = os.path.join(scripts_dir, f"{LEAGUE_ALIAS}_all_trophies_raw.json")

    # Reuse local cached raw files if present
    if os.path.exists(palmares_file) and os.path.exists(trophies_file):
        info(f"Using cached raw files: {os.path.basename(palmares_file)}, {os.path.basename(trophies_file)}")
        with open(palmares_file, "r", encoding="utf-8") as f:
            palmares_data = json.load(f)
        with open(trophies_file, "r", encoding="utf-8") as f:
            detailed_comps = json.load(f)
    else:
        palmares_data, detailed_comps = run_download_pipeline(scripts_dir)

    if not palmares_data:
        error("No palmares data available. Check API tokens or connection.")
        return 1

    banner("Phase 2: Aggregating Statistics, Chronology & public/data.json")

    data_json_path = os.path.join(get_public_dir(), "data.json")
    existing_data = {}
    if os.path.exists(data_json_path):
        with open(data_json_path, "r", encoding="utf-8") as f:
            existing_data = json.load(f)

    existing_managers = existing_data.get("leagueData") or existing_data.get("managers") or []
    existing_managers_by_id = {m["id"]: m for m in existing_managers}

    managers = {}
    for m in existing_managers:
        mid = m["id"]
        if mid == "m_sorfra":
            continue
        managers[mid] = {
            "id": mid,
            "name": m.get("name", mid),
            "years": m.get("years", 1),
            "gold": m.get("gold", 0),
            "silver": m.get("silver", 0),
            "bronze": m.get("bronze", 0),
            "spoon": m.get("spoon", 0),
            "cup_gold": m.get("cup_gold", 0),
            "cup_silver": m.get("cup_silver", 0),
            "supercup": m.get("supercup", 0),
            "supercup_silver": m.get("supercup_silver", 0),
            "mundialito": m.get("mundialito", 0),
            "mundialito_silver": m.get("mundialito_silver", 0),
            "cartonato": m.get("cartonato", 0),
            "coach_banners": m.get("coach_banners") or m.get("cartonato_coaches") or [],
            "cartonato_coaches": m.get("cartonato_coaches") or [],
            "_seasons_set": set(),
            "_history_by_season": {}
        }
        for h in m.get("history", []):
            s_name = h.get("season")
            if s_name:
                managers[mid]["_seasons_set"].add(s_name)
                managers[mid]["_history_by_season"][s_name] = {
                    "season": s_name,
                    "team": h.get("team"),
                    "rank": h.get("rank"),
                    "points": h.get("points"),
                    "competitionId": h.get("competitionId"),
                    "achievements": [dict(a) for a in h.get("achievements", [])]
                }

    def get_manager_by_coach(coach_name: str):
        mid = resolve_manager_id(coach_name, existing_managers_by_id)
        if mid not in managers:
            clean_name = coach_name.strip()
            managers[mid] = {
                "id": mid,
                "name": clean_name,
                "years": 1,
                "gold": 0,
                "silver": 0,
                "bronze": 0,
                "spoon": 0,
                "cup_gold": 0,
                "cup_silver": 0,
                "supercup": 0,
                "supercup_silver": 0,
                "mundialito": 0,
                "mundialito_silver": 0,
                "cartonato": 0,
                "coach_banners": [],
                "cartonato_coaches": [],
                "_seasons_set": set(),
                "_history_by_season": {}
            }
        return managers[mid]

    competitions_archive = []
    for comp in detailed_comps:
        comp_info = comp.get("competition", {})
        c_id = comp_info.get("id")
        c_name = comp_info.get("name") or "Competizione"
        season_info = comp.get("season", {})
        s_name = season_info.get("name") or "Sconosciuta"
        cat_info = comp.get("category", {})
        cat_name = cat_info.get("name") or "Altro"
        ranking_raw = comp.get("ranking", [])

        ranking_items = []
        for r in ranking_raw:
            team = r.get("team", {})
            coach_label = team.get("coachesLabel") or team.get("name") or "Sconosciuto"
            mid = resolve_manager_id(coach_label, existing_managers_by_id)
            raw_pts = r.get("points")
            clean_pts = raw_pts
            if s_name == "2020/21" and (raw_pts is None or raw_pts == 0.0):
                clean_pts = POINTS_OVERRIDE_2020_21.get(mid, None)

            raw_logo = team.get("logo")
            team_name = team.get("name") or "Squadra"
            local_logo = resolve_team_crest(team_name, raw_logo, root_dir)

            ranking_items.append({
                "rank": r.get("rank"),
                "teamName": team_name,
                "coach": coach_label,
                "managerId": mid,
                "points": clean_pts,
                "logo": local_logo
            })

        competitions_archive.append({
            "id": c_id,
            "name": c_name,
            "season": s_name,
            "category": cat_name,
            "ranking": ranking_items
        })

    # Preserve old competitions
    known_c_ids = {c["id"] for c in competitions_archive}
    for old_c in existing_data.get("competitions", []):
        if old_c.get("id") not in known_c_ids:
            competitions_archive.append(old_c)
            known_c_ids.add(old_c["id"])

    competitions_archive.sort(key=lambda x: (parse_season_year(x["season"]), x["id"]), reverse=True)

    # Process manager chronologies
    for comp in detailed_comps:
        comp_info = comp.get("competition", {})
        c_id = comp_info.get("id")
        c_name = comp_info.get("name") or ""
        season_info = comp.get("season", {})
        s_name = season_info.get("name") or ""
        cat_info = comp.get("category", {})
        cat_name = (cat_info.get("name") or "").lower()
        ranking = comp.get("ranking", [])

        if not ranking or not s_name:
            continue

        num_teams = len(ranking)
        is_league = is_championship(cat_name, c_name)
        is_supercoppa = "supercoppa" in cat_name or "supercup" in c_name.lower()
        is_mundialito = "mundialito" in cat_name or "mundialito" in c_name.lower()
        is_perdenti = "perdenti" in cat_name or "perdenti" in c_name.lower()
        is_coppa = ("coppa" in cat_name or "coppa" in c_name.lower()) and not is_supercoppa and not is_perdenti

        for r in ranking:
            rank = r.get("rank")
            team = r.get("team", {})
            team_name = team.get("name")
            coach_label = team.get("coachesLabel") or team_name or "Sconosciuto"
            pts = r.get("points")

            mgr = get_manager_by_coach(coach_label)
            mgr["_seasons_set"].add(s_name)

            if s_name not in mgr["_history_by_season"]:
                mgr["_history_by_season"][s_name] = {
                    "season": s_name,
                    "team": None,
                    "rank": None,
                    "points": None,
                    "competitionId": None,
                    "achievements": []
                }

            s_rec = mgr["_history_by_season"][s_name]

            if is_league:
                s_rec["team"] = team_name
                s_rec["rank"] = rank
                clean_league_pts = pts
                if s_name == "2020/21" and (pts is None or pts == 0.0):
                    clean_league_pts = POINTS_OVERRIDE_2020_21.get(mgr["id"], None)
                s_rec["points"] = clean_league_pts
                s_rec["competitionId"] = c_id

                for ach in create_championship_achievements(rank, num_teams, c_id):
                    if not any(a.get("badge") == ach.get("badge") for a in s_rec["achievements"]):
                        s_rec["achievements"].append(ach)

            else:
                cat_type = "Coppa" if is_coppa else ("Supercoppa" if is_supercoppa else ("Mundialito" if is_mundialito else ("Perdenti" if is_perdenti else "")))
                if cat_type:
                    ach = create_cup_achievement(cat_type, rank, c_id, s_name)
                    if ach and not any(a.get("badge") == ach.get("badge") for a in s_rec["achievements"]):
                        s_rec["achievements"].append(ach)

    # Convert to list and compute career totals
    output_managers = []
    for mgr in managers.values():
        hist_list = list(mgr["_history_by_season"].values())
        hist_list.sort(key=lambda x: parse_season_year(x["season"]), reverse=True)

        c_gold = sum(1 for s in hist_list for a in s["achievements"] if a["badge"] == "gold")
        c_silver = sum(1 for s in hist_list for a in s["achievements"] if a["badge"] == "silver")
        c_bronze = sum(1 for s in hist_list for a in s["achievements"] if a["badge"] == "bronze")
        c_spoon = sum(1 for s in hist_list for a in s["achievements"] if a["badge"] == "spoon")
        c_cup_gold = sum(1 for s in hist_list for a in s["achievements"] if a["badge"] == "cup_gold")
        c_cup_silver = sum(1 for s in hist_list for a in s["achievements"] if a["badge"] == "cup_silver")
        c_supercup = sum(1 for s in hist_list for a in s["achievements"] if a["badge"] == "supercup")
        c_supercup_silver = sum(1 for s in hist_list for a in s["achievements"] if a["badge"] == "supercup_silver")
        c_mundialito = sum(1 for s in hist_list for a in s["achievements"] if a["badge"] == "mundialito")
        c_mundialito_silver = sum(1 for s in hist_list for a in s["achievements"] if a["badge"] == "mundialito_silver")
        c_cartonato = sum(1 for s in hist_list for a in s["achievements"] if a["badge"] == "cartonato")

        output_managers.append({
            "id": mgr["id"],
            "name": mgr["name"],
            "years": max(1, len(mgr["_seasons_set"]), len(hist_list)),
            "gold": c_gold,
            "silver": c_silver,
            "bronze": c_bronze,
            "spoon": c_spoon,
            "cup_gold": c_cup_gold,
            "cup_silver": c_cup_silver,
            "supercup": c_supercup,
            "supercup_silver": c_supercup_silver,
            "mundialito": c_mundialito,
            "mundialito_silver": c_mundialito_silver,
            "cartonato": c_cartonato,
            "coach_banners": mgr["coach_banners"],
            "cartonato_coaches": mgr["cartonato_coaches"],
            "history": hist_list
        })

    output_managers.sort(key=lambda x: (x["gold"], x["cup_gold"], x["supercup"], x["mundialito"], x["silver"], x["bronze"]), reverse=True)

    final_payload = {
        "leagueData": output_managers,
        "competitions": competitions_archive,
        "customTitles": existing_data.get("customTitles") or existing_data.get("titles") or {},
        "exportedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    }

    with open(data_json_path, "w", encoding="utf-8") as f:
        json.dump(final_payload, f, ensure_ascii=False, indent=2)

    ok(f"public/data.json compiled with {len(output_managers)} managers and {len(competitions_archive)} competitions!")
    return 0

if __name__ == '__main__':
    sys.exit(extract_data())
