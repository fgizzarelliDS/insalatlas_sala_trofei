#!/usr/bin/env python3
"""
scripts/fetch_live_rounds.py
Fetches live matchday fixtures, scores, and fantapoints from Leghe Fantacalcio API
for active competitions (Campionato and Coppa).
Active competition IDs are charged from environment variables (COMPETITION_ID, CUP_COMPETITION_ID)
or discovered dynamically from the in-progress season configuration (Single Source of Truth).
Updates data/live/2026-27_rounds.json and data/live/2026-27_cup_rounds.json,
then compiles live season details and multi-track Elo trajectories.
"""

import os
import sys
import json
import shutil
import subprocess
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.config import (
    get_base_dir,
    get_data_dir,
    APP_KEY,
    BEARER_TOKEN,
    LEAGUE_ALIAS,
    COMPETITION_ID,
    CUP_COMPETITION_ID,
    SUPERCUP_COMPETITION_ID,
    MUNDIALITO_COMPETITION_ID,
    PERDENTI_COMPETITION_ID
)
from core.logger import ok, info, warn, error, banner
from core.live_builder import compile_live_season_details, find_in_progress_season_info
from core.builder import build_data


import base64

def decode_jwt_payload(token: str) -> Dict[str, Any]:
    """Decodes JWT payload without signature verification for debugging info."""
    try:
        raw = token.replace("Bearer ", "").strip()
        parts = raw.split(".")
        if len(parts) >= 2:
            payload_b64 = parts[1]
            payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
            return json.loads(base64.b64decode(payload_b64))
    except Exception:
        pass
    return {}


def get_active_season_competitions(base_dir: str) -> Dict[str, Dict[str, Any]]:
    """
    Dynamically discovers active in-progress competitions from:
    1. Environment variables: COMPETITION_ID (Campionato) and CUP_COMPETITION_ID (Coppa)
    2. Active season file (data/seasons/2026-27.json) as the Single Source of Truth
    Returns mapping keyed by lowercase alias/category:
      {
        'campionato': { 'id': int, 'name': str, 'category': 'Campionato', 'target_file': '2026-27_rounds.json' },
        'coppa': { 'id': int, 'name': str, 'category': 'Coppa', 'target_file': '2026-27_cup_rounds.json' }
      }
    """
    active_info = find_in_progress_season_info(base_dir)
    competitions: Dict[str, Dict[str, Any]] = {}

    if active_info and active_info.get("season_file"):
        try:
            with open(active_info["season_file"], "r", encoding="utf-8") as sf:
                s_data = json.load(sf)
                for comp in s_data.get("competitions", []):
                    cat = comp.get("category", "")
                    cat_lower = cat.lower()
                    comp_id = comp.get("id")
                    comp_name = comp.get("name", "")
                    if not comp_id:
                        continue
                    
                    if cat_lower == "campionato":
                        target_file = "2026-27_rounds.json"
                    elif cat_lower == "coppa":
                        target_file = "2026-27_cup_rounds.json"
                    else:
                        target_file = f"2026-27_{cat_lower}_rounds.json"

                    competitions[cat_lower] = {
                        "id": int(comp_id),
                        "name": comp_name,
                        "category": cat,
                        "target_file": target_file
                    }
        except Exception as e:
            warn(f"Impossibile leggere file stagione: {e}")
    # Environment variables override or provide defaults for all 5 competitions
    env_mappings = [
        ("campionato", "COMPETITION_ID", COMPETITION_ID, "Campionato", "2026-27_rounds.json"),
        ("coppa", "CUP_COMPETITION_ID", CUP_COMPETITION_ID, "Coppa", "2026-27_cup_rounds.json"),
        ("supercoppa", "SUPERCUP_COMPETITION_ID", SUPERCUP_COMPETITION_ID, "Supercoppa", "2026-27_supercoppa_rounds.json"),
        ("mundialito", "MUNDIALITO_COMPETITION_ID", MUNDIALITO_COMPETITION_ID, "Mundialito", "2026-27_mundialito_rounds.json"),
        ("perdenti", "PERDENTI_COMPETITION_ID", PERDENTI_COMPETITION_ID, "Perdenti", "2026-27_perdenti_rounds.json"),
    ]
    for key, env_var_name, fallback_val, default_cat, default_file in env_mappings:
        env_val = os.getenv(env_var_name, fallback_val)
        if env_val and str(env_val).strip().isdigit():
            c_id = int(str(env_val).strip())
            if key in competitions:
                competitions[key]["id"] = c_id
            else:
                competitions[key] = {
                    "id": c_id,
                    "name": default_cat,
                    "category": default_cat,
                    "target_file": default_file
                }

    return competitions


def resolve_competition_metadata(competition_id: int, base_dir: str) -> Dict[str, Any]:
    """Resolves name, category, and target filename dynamically for any competition ID."""
    active_comps = get_active_season_competitions(base_dir)
    for comp in active_comps.values():
        if comp["id"] == competition_id:
            return comp

    # Try lookup in data/seasons/2026-27.json
    active_info = find_in_progress_season_info(base_dir)
    if active_info and active_info.get("season_file"):
        try:
            with open(active_info["season_file"], "r", encoding="utf-8") as sf:
                s_data = json.load(sf)
                for comp in s_data.get("competitions", []):
                    if int(comp.get("id", 0)) == competition_id:
                        cat = comp.get("category", "Campionato")
                        name = comp.get("name", f"Competition {competition_id}")
                        if cat.lower() == "campionato":
                            target_file = "2026-27_rounds.json"
                        elif cat.lower() == "coppa":
                            target_file = "2026-27_cup_rounds.json"
                        else:
                            target_file = f"2026-27_{cat.lower()}_rounds.json"
                        return {
                            "id": competition_id,
                            "name": name,
                            "category": cat,
                            "target_file": target_file
                        }
        except Exception:
            pass

    return {
        "id": competition_id,
        "name": f"Competition {competition_id}",
        "category": "Campionato",
        "target_file": f"2026-27_comp_{competition_id}_rounds.json"
    }


def fetch_single_competition(competition_id: int, base_dir: str, headers: Dict[str, str]) -> bool:
    meta = resolve_competition_metadata(competition_id, base_dir)
    comp_name = meta["name"]
    comp_cat = meta["category"]
    target_filename = meta["target_file"]

    banner(f"Fetching Live Data: {comp_name} (ID: {competition_id}, Cat: {comp_cat})")

    url = f"https://apileague.fantacalcio.it/onboarding/v1/league/competition/calendar/{competition_id}"
    info(f"Connecting to: {url} ...")

    api_data = None
    # 1. Try fetching via curl (uses HTTP/2 + modern TLS handshake, bypassing CloudFront WAF blocks)
    if shutil.which("curl"):
        try:
            cmd = ["curl", "-s", "--max-time", "15"]
            for hk, hv in headers.items():
                cmd.extend(["-H", f"{hk}: {hv}"])
            cmd.append(url)
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
            if res.returncode == 0 and res.stdout.strip().startswith(("{", "[")):
                parsed = json.loads(res.stdout)
                if isinstance(parsed, dict) and parsed.get("code") == "FAIL":
                    jwt_info = decode_jwt_payload(headers.get("Authorization", ""))
                    l_id = jwt_info.get("l_id")
                    t_id = jwt_info.get("t_id")
                    error(f"API Fantacalcio ha risposto con Errore 403 Forbidden ({parsed.get('message', 'FAIL')}).")
                    if l_id:
                        error(f"MOTIVO: Il Bearer token attualmente in uso appartiene alla lega ID '{l_id}' (squadra ID '{t_id}'), non alla competizione {competition_id}!")
                        info("-> Vai su https://leghe.fantacalcio.it/insalatlas, assicurati di aver selezionato la lega InsalAtlas in alto, e copia il Bearer token dalla scheda Network dei DevTools (F12).")
                    return False
                else:
                    api_data = parsed
        except Exception as e:
            warn(f"Tentativo curl non riuscito, fallback su urllib: {e}")

    # 2. Fallback to urllib.request if curl is unavailable or failed
    if api_data is None:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw_body = resp.read().decode("utf-8")
                api_data = json.loads(raw_body)
        except urllib.error.HTTPError as e:
            error(f"HTTP Error {e.code}: {e.reason}")
            if e.code in (401, 403):
                jwt_info = decode_jwt_payload(headers.get("Authorization", ""))
                l_id = jwt_info.get("l_id")
                t_id = jwt_info.get("t_id")
                error("Token scaduto, non autorizzato o app_key non valida.")
                if l_id:
                    error(f"MOTIVO: Il Bearer token attualmente in uso appartiene alla lega ID '{l_id}' (squadra ID '{t_id}'), non alla competizione {competition_id}!")
                    info("-> Vai su https://leghe.fantacalcio.it/insalatlas, assicurati di aver selezionato la lega InsalAtlas in alto, e copia il Bearer token dalla scheda Network dei DevTools (F12).")
            return False
        except Exception as e:
            error(f"Errore di connessione API: {e}")
            return False
    # Save raw debug payload
    raw_debug_path = os.path.join(base_dir, "data", "live", f"raw_api_comp_{competition_id}.json")
    os.makedirs(os.path.dirname(raw_debug_path), exist_ok=True)
    with open(raw_debug_path, "w", encoding="utf-8") as f:
        json.dump(api_data, f, indent=2, ensure_ascii=False)
    ok(f"Salvataggio risposta grezza API in: {raw_debug_path}")

    # Extract rounds list from API response
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

    info(f"Ricevute {len(raw_rounds)} giornate di calendario dall'API per {comp_name}.")

    if not raw_rounds:
        info(f"Nessun turno programmato al momento per {comp_name} ({competition_id}). In attesa di generazione calendario.")
        return True

    # Dynamic Team ID mapping with fallback dictionary (mirroring child repo) for generic SVG crests
    team_id_map: Dict[int, Dict[str, Any]] = {
        2550954: {
            "teamName": "LoTUS FC",
            "managerId": "m_avvisatina",
            "coach": "Juliet-91",
            "logo": "assets/crests/golden_griffin.svg"
        },
        3674613: {
            "teamName": "Partizan Peroni",
            "managerId": "m_pippo",
            "coach": "Paiden",
            "logo": "assets/crests/anchor_bay.svg"
        }
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
                        tid = t.get("teamId") or t.get("id")
                        if not tid and "assets/teams/" in logo:
                            base_logo = os.path.basename(logo)
                            prefix = base_logo.split("_")[0]
                            if prefix.isdigit():
                                tid = int(prefix)
                        if tid is not None:
                            team_id_map[int(tid)] = {
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
        championship_md = rnd.get("championshipMatchDay")
        matches_list = rnd.get("matches", []) or rnd.get("games", [])
        is_calculated = bool(rnd.get("calculated", False))

        parsed_matches = []
        round_has_played_match = False

        for m in matches_list:
            h_id = m.get("tIdH") or m.get("homeTeamId") or m.get("home_team_id")
            a_id = m.get("tIdA") or m.get("awayTeamId") or m.get("away_team_id")

            h_info = (team_id_map.get(int(h_id)) or {}) if h_id is not None and str(h_id).isdigit() else {}
            a_info = (team_id_map.get(int(a_id)) or {}) if a_id is not None and str(a_id).isdigit() else {}

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

            is_match_played = bool(is_calculated or h_fp > 0 or a_fp > 0 or (result_str and result_str != "-"))
            if is_match_played:
                round_has_played_match = True
            h_logo = h_info.get("logo") or m.get("homeLogo")
            a_logo = a_info.get("logo") or m.get("awayLogo")

            match_entry = {
                "homeTeam": h_team,
                "awayTeam": a_team,
                "homeManagerId": h_mgr,
                "awayManagerId": a_mgr,
                "homeLogo": h_logo,
                "awayLogo": a_logo,
                "homeScore": h_score,
                "awayScore": a_score,
                "homeFantaPoints": round(h_fp, 1),
                "awayFantaPoints": round(a_fp, 1),
                "isPlayed": is_match_played,
                "competition": comp_name,
                "competitionCategory": comp_cat,
                "competitionId": int(competition_id),
                "championshipMatchDay": championship_md
            }
            parsed_matches.append(match_entry)

        if round_has_played_match:
            completed_rounds_count = max(completed_rounds_count, r_num if isinstance(r_num, int) else 0)

        round_obj = {
            "roundNumber": r_num,
            "competition": comp_name,
            "competitionCategory": comp_cat,
            "competitionId": int(competition_id),
            "matches": parsed_matches
        }
        if championship_md is not None:
            round_obj["championshipMatchDay"] = championship_md

        formatted_rounds.append(round_obj)

    # Sort rounds by roundNumber ascending
    formatted_rounds.sort(key=lambda x: int(x.get("roundNumber") or 0))

    # Target output file
    target_live_file = os.path.join(base_dir, "data", "live", target_filename)
    output_obj = {
        "season": "2026/27",
        "competition": comp_name,
        "competitionCategory": comp_cat,
        "competitionId": int(competition_id),
        "totalRounds": len(formatted_rounds),
        "lastCompletedRound": completed_rounds_count,
        "rounds": formatted_rounds
    }

    with open(target_live_file, "w", encoding="utf-8") as f:
        json.dump(output_obj, f, indent=2, ensure_ascii=False)

    ok(f"Dati {comp_name} salvati in: {target_live_file} ({completed_rounds_count} giornate disputate su {len(formatted_rounds)})")
    return True


def fetch_live_rounds(target_arg: Optional[str] = None) -> int:
    base_dir = get_base_dir()
    active_comps = get_active_season_competitions(base_dir)

    # Determine competition list to fetch dynamically
    cids_to_fetch: List[int] = []

    if target_arg in (None, "", "all", "both"):
        cids_to_fetch = [c["id"] for c in active_comps.values() if "id" in c]
    elif "," in target_arg:
        for part in target_arg.split(","):
            part_str = part.strip().lower()
            if not part_str:
                continue
            if part_str.isdigit():
                cids_to_fetch.append(int(part_str))
            elif part_str in active_comps and "id" in active_comps[part_str]:
                cids_to_fetch.append(active_comps[part_str]["id"])
            elif part_str in ("campionato", "league", "serie-atlas") and "campionato" in active_comps:
                cids_to_fetch.append(active_comps["campionato"]["id"])
            elif part_str in ("coppa", "cup", "coppa-insalatlas") and "coppa" in active_comps:
                cids_to_fetch.append(active_comps["coppa"]["id"])
            elif part_str in ("supercoppa", "supercup") and "supercoppa" in active_comps:
                cids_to_fetch.append(active_comps["supercoppa"]["id"])
            elif part_str == "mundialito" and "mundialito" in active_comps:
                cids_to_fetch.append(active_comps["mundialito"]["id"])
            elif part_str in ("perdenti", "playout", "cartonato") and "perdenti" in active_comps:
                cids_to_fetch.append(active_comps["perdenti"]["id"])
    elif target_arg.lower() in ("campionato", "league", "serie-atlas"):
        if "campionato" in active_comps:
            cids_to_fetch = [active_comps["campionato"]["id"]]
    elif target_arg.lower() in ("coppa", "cup", "coppa-insalatlas"):
        if "coppa" in active_comps:
            cids_to_fetch = [active_comps["coppa"]["id"]]
    elif target_arg.lower() in ("supercoppa", "supercup", "supercoppa-insalatlas"):
        if "supercoppa" in active_comps:
            cids_to_fetch = [active_comps["supercoppa"]["id"]]
    elif target_arg.lower() in ("mundialito",):
        if "mundialito" in active_comps:
            cids_to_fetch = [active_comps["mundialito"]["id"]]
    elif target_arg.lower() in ("perdenti", "playout", "cartonato"):
        if "perdenti" in active_comps:
            cids_to_fetch = [active_comps["perdenti"]["id"]]
    elif target_arg.isdigit():
        cids_to_fetch = [int(target_arg)]
    elif target_arg.lower() in active_comps:
        cids_to_fetch = [active_comps[target_arg.lower()]["id"]]
    else:
        env_comp = os.getenv("COMPETITION_ID", COMPETITION_ID)
        if env_comp and str(env_comp).strip().isdigit():
            cids_to_fetch = [int(str(env_comp).strip())]
        else:
            cids_to_fetch = [c["id"] for c in active_comps.values() if "id" in c]

    if not cids_to_fetch:
        error("Nessun ID di competizione attivo identificato da env o da data/seasons/!")
        return 1

    # Check credentials
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
        "authorization": token if token.startswith("Bearer ") else f"Bearer {token}",
        "app_key": app_key,
        "accept": "application/json, text/plain, */*",
        "accept-language": "it-IT,it;q=0.9,fr-FR;q=0.8,fr;q=0.7,en;q=0.6",
        "origin": "https://leghe.fantacalcio.it",
        "referer": "https://leghe.fantacalcio.it/",
        "sec-ch-ua": '"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
    }

    success_count = 0
    for cid in cids_to_fetch:
        ok_flag = fetch_single_competition(cid, base_dir, headers)
        if ok_flag:
            success_count += 1

    if success_count == 0:
        error("Nessun dato recuperato con successo dall'API.")
        return 1

    # Re-run compiler to update public/live_season_details.json and public/data.json
    banner("Re-building Application Live Data & Multi-Track Elo")
    compile_live_season_details(root_dir=base_dir)
    build_data()
    ok("Tutto pronto! Dati reali integrati e compilati con successo.")
    return 0


# Backward-compatible alias
def fetch_live_competition_data(competition_id: Optional[str] = None) -> int:
    return fetch_live_rounds(competition_id)


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    sys.exit(fetch_live_rounds(arg))
