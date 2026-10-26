#!/usr/bin/env python3
"""
scripts/fetch_fantacalcio.py
CLI runner to fetch, parse, and ingest Fantacalcio standings into data/seasons/YYYY-YY.json.
Supports web URLs, league aliases, CSV exports, and local HTML/TSV files.
"""

import os
import sys
import re
import json
import time
from typing import Optional, Dict, Any, List, Tuple
from html.parser import HTMLParser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.config import get_base_dir, get_data_dir, LEAGUE_ALIAS, HEADERS
from core.logger import ok, info, warn, error, banner
from core.resolver import resolve_manager_id
from core.assets import resolve_team_crest
from core.importer import season_to_filename

class SimpleTableParser(HTMLParser):
    """Parses HTML tables extracting rows, cells, links, and image sources."""
    def __init__(self):
        super().__init__()
        self.rows: List[List[Dict[str, str]]] = []
        self.current_row: Optional[List[Dict[str, str]]] = None
        self.current_cell: Optional[Dict[str, str]] = None
        self.in_cell = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == 'tr':
            self.current_row = []
        elif tag in ('td', 'th') and self.current_row is not None:
            self.in_cell = True
            self.current_cell = {
                'text': '',
                'img': '',
                'href': '',
                'class': attrs_dict.get('class', ''),
                'data-coach': attrs_dict.get('data-coach', '')
            }
        elif tag == 'a' and self.in_cell and self.current_cell is not None:
            href = attrs_dict.get('href', '')
            if href and not self.current_cell.get('href'):
                self.current_cell['href'] = href
        elif tag == 'img' and self.in_cell and self.current_cell is not None:
            src = attrs_dict.get('src') or attrs_dict.get('data-src') or ''
            if src and not self.current_cell['img']:
                self.current_cell['img'] = src

    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self.in_cell:
            self.in_cell = False
            if self.current_row is not None and self.current_cell is not None:
                self.current_row.append(self.current_cell)
            self.current_cell = None
        elif tag == 'tr' and self.current_row is not None:
            if self.current_row:
                self.rows.append(self.current_row)
            self.current_row = None

    def handle_data(self, data):
        if self.in_cell and self.current_cell is not None:
            self.current_cell['text'] += ' ' + data.strip()


def detect_next_season(seasons_dir: str) -> str:
    """Calculates chronological next season based on existing season files."""
    def fallback_season() -> str:
        from datetime import datetime
        now = datetime.now()
        year = now.year if now.month >= 8 else now.year - 1
        return f"{year}/{str(year + 1)[2:]}"

    if not os.path.exists(seasons_dir):
        return fallback_season()

    years = []
    for f in os.listdir(seasons_dir):
        if f.endswith('.json'):
            m = re.match(r'^(\d{4})-(\d{2})\.json$', f)
            if m:
                years.append(int(m.group(1)))

    if not years:
        return fallback_season()

    max_year = max(years)
    next_start = max_year + 1
    next_end = (next_start + 1) % 100
    return f"{next_start}/{next_end:02d}"


def parse_csv_or_tsv(content: str) -> Tuple[Optional[str], Optional[str], List[Dict[str, Any]]]:
    """Parses Fantacalcio CSV or tab-delimited export."""
    lines = [ln.strip() for ln in content.splitlines() if ln.strip()]
    season: Optional[str] = None
    comp_name: Optional[str] = None
    rows: List[Dict[str, Any]] = []

    for ln in lines[:5]:
        m_season = re.search(r'(\d{4}[/-]\d{2,4})', ln)
        if m_season:
            raw_s = m_season.group(1).replace('-', '/')
            if len(raw_s) == 9:  # e.g. 2026/2027
                season = f"{raw_s[:4]}/{raw_s[7:]}"
            else:
                season = raw_s
        if 'classifica' in ln.lower():
            comp_name = re.sub(r'^(classifica|ranking)\s*[:\-]?\s*', '', ln, flags=re.I).strip()

    data_lines = []
    for ln in lines:
        if re.match(r'^\d+[\s\t,;]', ln):
            data_lines.append(ln)

    for idx, ln in enumerate(data_lines):
        delimiter = '\t' if '\t' in ln else (';' if ';' in ln else ',')
        parts = [p.strip().strip('"') for p in ln.split(delimiter)]
        parts = [p for p in parts if p or delimiter == ',']

        if len(parts) >= 3:
            try:
                rank = int(re.sub(r'[^\d]', '', parts[0]))
            except ValueError:
                rank = idx + 1

            team = parts[1].strip() if len(parts) > 1 else f"Squadra {rank}"
            
            # Points might be in column 10 (official export) or last column
            pts = 0.0
            if len(parts) > 10 and re.match(r'^-?\d+(\.\d+)?$', parts[10].replace(',', '.')):
                pts = float(parts[10].replace(',', '.'))
            elif re.match(r'^-?\d+(\.\d+)?$', parts[-1].replace(',', '.')):
                pts = float(parts[-1].replace(',', '.'))

            rows.append({
                'rank': rank,
                'teamName': team,
                'coach': '',
                'points': pts,
                'logo': ''
            })

    return season, comp_name, rows


def parse_html_table(html_content: str) -> Tuple[Optional[str], Optional[str], List[Dict[str, Any]]]:
    """Parses HTML content for standings table rows."""
    parser = SimpleTableParser()
    try:
        parser.feed(html_content)
    except Exception as e:
        warn(f"HTMLParser warning: {e}")

    season: Optional[str] = None
    comp_name: Optional[str] = None
    rows: List[Dict[str, Any]] = []

    m_season = re.search(r'(\d{4}[/-]\d{2,4})', html_content)
    if m_season:
        raw_s = m_season.group(1).replace('-', '/')
        if len(raw_s) == 9:
            season = f"{raw_s[:4]}/{raw_s[7:]}"
        else:
            season = raw_s

    for r in parser.rows:
        if len(r) < 3:
            continue

        first_txt = r[0]['text'].strip()
        m_rank = re.match(r'^(\d+)', first_txt)
        if not m_rank:
            continue

        rank = int(m_rank.group(1))
        team_cell = r[1]
        team_name = team_cell['text'].strip()
        logo_url = team_cell['img']

        # Extract coach name from cell text, parenthesis, or data-coach attribute
        coach = team_cell.get('data-coach', '')
        if not coach:
            m_coach = re.search(r'\(([^)]+)\)', team_name)
            if m_coach:
                coach = m_coach.group(1).strip()
                team_name = re.sub(r'\s*\([^)]+\)', '', team_name).strip()

        # Points: look in cell 2 or last numeric cell
        pts = 0.0
        for cell in reversed(r):
            txt = cell['text'].strip().replace(',', '.')
            if re.match(r'^-?\d+(\.\d+)?$', txt):
                pts = float(txt)
                break

        team_id = None
        href = team_cell.get('href', '')
        m_id = re.search(r'/squadra/.*?(\d+)', href) or re.search(r'(\d{5,})', href)
        if m_id:
            team_id = int(m_id.group(1))
        elif logo_url:
            m_logo_id = re.search(r'/(\d{5,})_', logo_url)
            if m_logo_id:
                team_id = int(m_logo_id.group(1))

        rows.append({
            'rank': rank,
            'teamName': team_name,
            'coach': coach,
            'points': pts,
            'logo': logo_url,
            'teamId': team_id
        })

    return season, comp_name, rows


def fetch_standings(target: str) -> str:
    """Retrieves content from a local file, web URL, or league alias."""
    if os.path.exists(target):
        info(f"Reading from local file: {target}")
        with open(target, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()

    # Determine URL
    if target.startswith('http://') or target.startswith('https://'):
        url = target
    else:
        alias = target or LEAGUE_ALIAS or 'insalatlas'
        url = f"https://leghe.fantacalcio.it/{alias}/classifica"

    info(f"Fetching from URL: {url} ...")
    try:
        import requests
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            ok(f"Successfully downloaded {len(resp.text)} characters")
            return resp.text
        else:
            error(f"HTTP request returned status {resp.status_code}")
            sys.exit(1)
    except Exception as e:
        error(f"Failed to fetch {url}: {e}")
        sys.exit(1)


def ingest_fantacalcio(target: Optional[str] = None,
                       specified_season: Optional[str] = None,
                       specified_comp_name: Optional[str] = None) -> int:
    """Main CLI ingestion orchestrator."""
    banner("Fantacalcio Standings Ingestion Engine")

    target = target or LEAGUE_ALIAS or "insalatlas"
    data_dir = get_data_dir()
    seasons_dir = os.path.join(data_dir, "seasons")
    os.makedirs(seasons_dir, exist_ok=True)

    content = fetch_standings(target)

    # 1. Parse content
    if "<html" in content.lower() or "<table" in content.lower():
        det_season, det_comp, parsed_rows = parse_html_table(content)
    else:
        det_season, det_comp, parsed_rows = parse_csv_or_tsv(content)

    if not parsed_rows:
        error("No standings rows found in provided source. Please check URL or file format.")
        return 1

    season = specified_season or det_season or detect_next_season(seasons_dir)
    comp_name = specified_comp_name or det_comp or f"Campionato {season.replace('/', '-')}"

    info(f"Season: {season} | Competition: {comp_name} | Rows: {len(parsed_rows)}")

    # 2. Entity resolution and crest assignment
    ranking: List[Dict[str, Any]] = []
    unmapped_count = 0

    # Map of known team IDs and fallback from active season configuration
    known_team_ids: Dict[str, int] = {
        "LoTUS FC": 2550954,
        "Partizan Peroni": 3674613
    }
    for comp in existing_data.get("competitions", []):
        for t in comp.get("ranking", []):
            tid = t.get("teamId") or t.get("id")
            if tid:
                if t.get("teamName"):
                    known_team_ids[t["teamName"]] = int(tid)
                if t.get("managerId"):
                    known_team_ids[t["managerId"]] = int(tid)

    for r in parsed_rows:
        rank = r['rank']
        team_name = r['teamName']
        coach_name = r['coach']
        points = r['points']
        raw_logo = r['logo']
        team_id = r.get('teamId') or known_team_ids.get(team_name)

        manager_id = resolve_manager_id(coach_name if coach_name else team_name)
        if manager_id == 'm_unknown':
            unmapped_count += 1
        elif not team_id:
            team_id = known_team_ids.get(manager_id)

        crest = resolve_team_crest(team_name, raw_logo)

        team_entry = {
            "rank": rank,
            "teamName": team_name,
            "coach": coach_name or manager_id.replace('m_', ''),
            "managerId": manager_id,
            "points": points,
            "logo": crest
        }
        if team_id is not None:
            team_entry["teamId"] = int(team_id)

        ranking.append(team_entry)

    # Sort ranking by rank ascending
    ranking.sort(key=lambda x: x["rank"])

    # 3. Create or update season file
    target_filename = season_to_filename(season)
    season_path = os.path.join(seasons_dir, target_filename)

    existing_data: Dict[str, Any] = {}
    if os.path.exists(season_path):
        try:
            with open(season_path, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
            info(f"Existing season file found: {season_path}. Merging championship...")
        except Exception:
            existing_data = {}

    competitions: List[Dict[str, Any]] = existing_data.get("competitions", [])
    
    # Filter out any existing Championship competition
    competitions = [c for c in competitions if c.get("category") != "Campionato"]

    champ_record = {
        "id": int(time.time()),
        "name": comp_name,
        "season": season,
        "category": "Campionato",
        "ranking": ranking
    }

    # Prepend Championship as first competition
    competitions.insert(0, champ_record)

    output_payload = {
        "season": season,
        "competitions": competitions
    }

    with open(season_path, 'w', encoding='utf-8') as f:
        json.dump(output_payload, f, indent=2, ensure_ascii=False)

    ok(f"Saved {len(ranking)} standings rows to {season_path}")

    # Summary
    print("\n--- STANDINGS SUMMARY ---")
    for row in ranking[:3]:
        badge = "🥇" if row['rank'] == 1 else ("🥈" if row['rank'] == 2 else "🥉")
        print(f" {badge} {row['rank']}° {row['teamName']:<26} ({row['managerId']}) - {row['points']} pts")
    if len(ranking) >= 4:
        last = ranking[-1]
        print(f" 🥄 {last['rank']}° {last['teamName']:<26} ({last['managerId']}) - {last['points']} pts")

    if unmapped_count > 0:
        warn(f"{unmapped_count} manager(s) mapped to 'm_unknown'. Update data/aliases.json if needed.")
    else:
        ok("All managers mapped successfully against data/aliases.json!")

    return 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ("-h", "--help"):
        print("Usage: python scripts/fetch_fantacalcio.py [target] [season] [comp_name]")
        print("  target    : League alias (e.g. 'insalatlas'), URL, or local CSV/HTML file path.")
        print("  season    : Season string in YYYY/YY format (e.g. '2026/27'). Auto-detected if omitted.")
        print("  comp_name : Championship title (e.g. 'Campionato 2026-2027'). Auto-detected if omitted.")
        sys.exit(0)

    target_arg = sys.argv[1] if len(sys.argv) > 1 else None
    season_arg = sys.argv[2] if len(sys.argv) > 2 else None
    comp_arg = sys.argv[3] if len(sys.argv) > 3 else None
    sys.exit(ingest_fantacalcio(target_arg, season_arg, comp_arg))
