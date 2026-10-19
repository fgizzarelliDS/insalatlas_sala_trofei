#!/usr/bin/env python3
"""
scripts/fetch_live_rounds.py
Fetches live matchday fixtures, scores, and fantapoints from Leghe Fantacalcio API
for the active competition and updates data/live/2026-27_rounds.json.
"""

import os
import sys
import json
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.config import get_base_dir, get_data_dir, APP_KEY, BEARER_TOKEN, LEAGUE_ALIAS
from core.logger import ok, info, warn, error, banner
from core.live_builder import compile_live_season_details, find_in_progress_season_info
from core.builder import build_data

def fetch_live_competition_data(competition_id: Optional[str] = None) -> int:
    base_dir = get_base_dir()
    
    # 1. Determine active competition ID
    if not competition_id:
        env_comp = os.getenv("COMPETITION_ID")
        if env_comp:
            competition_id = env_comp
        else:
            active_info = find_in_progress_season_info(base_dir)
            competition_id = str(active_info.get("competitionId", "864215")) if active_info else "864215"

    banner(f"Fetching Live Real Data for Competition {competition_id} ({LEAGUE_ALIAS})")

    # 2. Check credentials
    token = os.getenv("BEARER_TOKEN", BEARER_TOKEN)
    app_key = os.getenv("APP_KEY", APP_KEY)

    if not token or "INSERISCI" in token or not app_key or "INSERISCI" in app_key:
        error("Credenziali API mancanti o non valide in .env.local!")
        print("\nPer configurare:")
        print("1. Apri https://leghe.fantacalcio.it/insalatlas nel browser")
        print("2. Apri DevTools (F12) -> scheda Network -> filtra per 'apileague'")
        print("3. Copia l'header 'app_key' e 'authorization' in .env.local")
        return 1

    headers = {
        "Authorization": token if token.startswith("Bearer ") else f"Bearer {token}",
        "app_key": app_key,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": f"https://leghe.fantacalcio.it/{LEAGUE_ALIAS}/",
        "Origin": "https://leghe.fantacalcio.it",
        "Accept": "application/json, text/plain, */*"
    }

    # 3. Call calendar/fixtures endpoint
    url = f"https://apileague.fantacalcio.it/onboarding/v1/league/competition/calendar/{competition_id}"
    info(f"Connecting to: {url} ...")

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw_body = resp.read().decode("utf-8")
            api_data = json.loads(raw_body)
    except urllib.error.HTTPError as e:
        error(f"HTTP Error {e.code}: {e.reason}")
        if e.code == 401:
            error("Token scaduto o non autorizzato. Ricarica la pagina su Leghe Fantacalcio e copia il Bearer token aggiornato.")
        return 1
    except Exception as e:
        error(f"Errore di connessione: {e}")
        return 1

    # 4. Save raw debug payload
    raw_debug_path = os.path.join(base_dir, "data", "live", f"raw_api_comp_{competition_id}.json")
    os.makedirs(os.path.dirname(raw_debug_path), exist_ok=True)
    with open(raw_debug_path, "w", encoding="utf-8") as f:
        json.dump(api_data, f, indent=2, ensure_ascii=False)
    ok(f"Salvataggio risposta grezza API in: {raw_debug_path}")

    # 5. Extract rounds list from API response
    if isinstance(api_data, list):
        raw_rounds = api_data
    elif isinstance(api_data, dict):
        data_payload = api_data.get("data", {})
        raw_rounds = (
            data_payload.get("calendar")
            or data_payload.get("rounds")
            or api_data.get("calendar")
            or api_data.get("rounds")
            or []
        )
    else:
        raw_rounds = []

    info(f"Ricevute {len(raw_rounds)} giornate di calendario dall'API.")

    if not raw_rounds:
        error(f"Nessun turno trovato nella risposta API per la competizione {competition_id}!")
        return 1

    # 6. Build lookup from season teams in 2026-27.json
    # Extract teamId from logo string (assets/teams/<tId>_<hash>.png) or known manual map
    team_id_map: Dict[int, Dict[str, Any]] = {
        2550954: {"teamName": "LoTUS FC", "managerId": "m_avvisatina"},
        3674613: {"teamName": "Partizan Peroni", "managerId": "m_pippo"}
    }

    active_info = find_in_progress_season_info(base_dir)
    if active_info and active_info.get("season_file"):
        try:
            with open(active_info["season_file"], "r", encoding="utf-8") as sf:
                s_data = json.load(sf)
                for comp in s_data.get("competitions", []):
                    for t in comp.get("ranking", []):
                        mgr_id = t.get("managerId")
                        t_name = t.get("teamName")
                        logo = t.get("logo", "")
                        # Try parsing teamId from logo filename prefix
                        if "assets/teams/" in logo:
                            base_logo = os.path.basename(logo)
                            prefix = base_logo.split("_")[0]
                            if prefix.isdigit():
                                tid = int(prefix)
                                team_id_map[tid] = {
                                    "teamName": t_name,
                                    "managerId": mgr_id,
                                    "coach": t.get("coach"),
                                    "logo": logo
                                }
        except Exception as e:
            warn(f"Impossibile estrarre mapping squadre da file stagione: {e}")

    formatted_rounds = []
    completed_rounds_count = 0

    for rnd in raw_rounds:
        r_num = rnd.get("matchDay") or rnd.get("roundNumber") or rnd.get("round") or rnd.get("id")
        matches_list = rnd.get("matches", []) or rnd.get("games", [])
        is_calculated = bool(rnd.get("calculated", False))

        parsed_matches = []
        has_played_match = False

        for m in matches_list:
            h_id = m.get("tIdH") or m.get("homeTeamId") or m.get("home_team_id")
            a_id = m.get("tIdA") or m.get("awayTeamId") or m.get("away_team_id")

            h_info = team_id_map.get(int(h_id)) if h_id is not None and str(h_id).isdigit() else {}
            a_info = team_id_map.get(int(a_id)) if a_id is not None and str(a_id).isdigit() else {}

            h_team = h_info.get("teamName") or m.get("homeTeam") or f"Team {h_id}"
            a_team = a_info.get("teamName") or m.get("awayTeam") or f"Team {a_id}"
            h_mgr = h_info.get("managerId") or m.get("homeManagerId")
            a_mgr = a_info.get("managerId") or m.get("awayManagerId")

            h_fp = float(m.get("ptH") if m.get("ptH") is not None else (m.get("homeFantaPoints") or 0.0))
            a_fp = float(m.get("ptA") if m.get("ptA") is not None else (m.get("awayFantaPoints") or 0.0))

            # Parse score string (e.g. "2-2")
            result_str = str(m.get("result", "")).strip()
            if "-" in result_str and result_str != "-":
                parts = result_str.split("-")
                try:
                    h_score = int(parts[0].strip())
                    a_score = int(parts[1].strip())
                except ValueError:
                    h_score = int(m.get("homeScore") or 0)
                    a_score = int(m.get("awayScore") or 0)
            else:
                h_score = int(m.get("homeScore") or 0)
                a_score = int(m.get("awayScore") or 0)

            if is_calculated or h_fp > 0 or a_fp > 0 or (result_str and result_str != "-"):
                has_played_match = True

            match_entry = {
                "homeTeam": h_team,
                "awayTeam": a_team,
                "homeManagerId": h_mgr,
                "awayManagerId": a_mgr,
                "homeScore": h_score,
                "awayScore": a_score,
                "homeFantaPoints": round(h_fp, 1),
                "awayFantaPoints": round(a_fp, 1)
            }
            parsed_matches.append(match_entry)

        if has_played_match:
            completed_rounds_count = max(completed_rounds_count, r_num if isinstance(r_num, int) else 0)

        formatted_rounds.append({
            "roundNumber": r_num,
            "matches": parsed_matches
        })

    # Sort rounds by roundNumber ascending
    formatted_rounds.sort(key=lambda x: int(x.get("roundNumber") or 0))

    # Target output file
    target_live_file = os.path.join(base_dir, "data", "live", "2026-27_rounds.json")
    output_obj = {
        "season": "2026/27",
        "competitionId": int(competition_id),
        "totalRounds": len(formatted_rounds),
        "lastCompletedRound": completed_rounds_count,
        "rounds": formatted_rounds
    }

    with open(target_live_file, "w", encoding="utf-8") as f:
        json.dump(output_obj, f, indent=2, ensure_ascii=False)

    ok(f"Dati aggiornati con successo in: {target_live_file} ({completed_rounds_count} giornate disputate su {len(formatted_rounds)})")

    # Re-run compiler to update public/live_season_details.json and public/data.json
    banner("Re-building Application Live Data")
    compile_live_season_details(root_dir=base_dir)
    build_data()
    ok("Tutto pronto! Dati reali integrati e compilati con successo.")
    return 0

if __name__ == "__main__":
    cid = sys.argv[1] if len(sys.argv) > 1 else None
    sys.exit(fetch_live_competition_data(cid))
