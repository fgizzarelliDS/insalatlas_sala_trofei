"""
scripts/core/rules.py
Single Source of Truth for competition categories, awards, badges, icons, and scoring.
"""

import re
from typing import Dict, Any, List, Optional

BADGE_ICONS = {
    "gold": "🥇",
    "silver": "🥈",
    "bronze": "🥉",
    "spoon": "🥄",
    "cup_gold": "🏆",
    "cup_silver": "🥈",
    "supercup": "⭐",
    "supercup_silver": "🥈",
    "mundialito": "🌍",
    "mundialito_silver": "🥈",
    "cartonato": "📦"
}

CATEGORY_ID_MAP = {
    31666: "Coppa",
    348809: "Supercoppa",
    348808: "Mundialito",
    348805: "Perdenti"
}

def parse_season_year(season_str: str) -> int:
    """Extracts starting year for chronological sorting (e.g. '2025/26' -> 2025)."""
    match = re.search(r'(\d{4})', str(season_str or ''))
    return int(match.group(1)) if match else 0

def is_championship(category: str, name: str) -> bool:
    """Returns True if the competition represents the primary SerieAtlas championship."""
    cat = (category or "").strip()
    nm = (name or "").strip().lower()
    return cat == "Campionato" or "serie" in nm

def get_cartonato_icon(season: str = "") -> str:
    """Standardized icon for Playout / Cartonato achievement across all seasons."""
    return "📦"

def create_championship_achievements(rank: Optional[int], last_rank: int, comp_id: Optional[int]) -> List[Dict[str, Any]]:
    """Generates podium and spoon achievement objects for championship standings."""
    achievements = []
    if rank == 1:
        achievements.append({
            "title": "Scudetto",
            "category": "Campionato",
            "badge": "gold",
            "icon": BADGE_ICONS["gold"],
            "competitionId": comp_id
        })
    elif rank == 2:
        achievements.append({
            "title": "2° Posto Campionato",
            "category": "Campionato",
            "badge": "silver",
            "icon": BADGE_ICONS["silver"],
            "competitionId": comp_id
        })
    elif rank == 3:
        achievements.append({
            "title": "3° Posto Campionato",
            "category": "Campionato",
            "badge": "bronze",
            "icon": BADGE_ICONS["bronze"],
            "competitionId": comp_id
        })
    elif rank == last_rank and last_rank >= 8:
        achievements.append({
            "title": "Cucchiaio di Legno",
            "category": "Campionato",
            "badge": "spoon",
            "icon": BADGE_ICONS["spoon"],
            "competitionId": comp_id
        })
    return achievements

def create_cup_achievement(category: str, rank: Optional[int], comp_id: Optional[int], season: str = "") -> Optional[Dict[str, Any]]:
    """Generates cup/supercup/mundialito/playout achievement objects."""
    if rank not in (1, 2) and category != "Perdenti":
        return None

    cat = (category or "").strip()
    if cat == "Coppa":
        if rank == 1:
            return {
                "title": "Coppa InsalAtlas",
                "category": "Coppa",
                "badge": "cup_gold",
                "icon": BADGE_ICONS["cup_gold"],
                "competitionId": comp_id
            }
        elif rank == 2:
            return {
                "title": "Finalista Coppa InsalAtlas",
                "category": "Coppa",
                "badge": "cup_silver",
                "icon": BADGE_ICONS["cup_silver"],
                "competitionId": comp_id
            }
    elif cat == "Supercoppa":
        if rank == 1:
            return {
                "title": "Supercoppa InsalAtlas",
                "category": "Supercoppa",
                "badge": "supercup",
                "icon": BADGE_ICONS["supercup"],
                "competitionId": comp_id
            }
        elif rank == 2:
            return {
                "title": "Finalista Supercoppa",
                "category": "Supercoppa",
                "badge": "supercup_silver",
                "icon": BADGE_ICONS["supercup_silver"],
                "competitionId": comp_id
            }
    elif cat == "Mundialito":
        if rank == 1:
            return {
                "title": "Mundialito",
                "category": "Mundialito",
                "badge": "mundialito",
                "icon": BADGE_ICONS["mundialito"],
                "competitionId": comp_id
            }
        elif rank == 2:
            return {
                "title": "Finalista Mundialito",
                "category": "Mundialito",
                "badge": "mundialito_silver",
                "icon": BADGE_ICONS["mundialito_silver"],
                "competitionId": comp_id
            }
    elif cat == "Perdenti" and rank == 1:
        return {
            "title": "Vincitore Playout (Cartonato)",
            "category": "Playout",
            "badge": "cartonato",
            "icon": get_cartonato_icon(season),
            "competitionId": comp_id
        }
    return None
