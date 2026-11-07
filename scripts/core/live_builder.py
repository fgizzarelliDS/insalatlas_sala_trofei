"""
scripts/core/live_builder.py
Backward-compatible facade module for scripts/core/live/ package.
"""

try:
    from core.live import (
        compute_momentum,
        compute_status_badge,
        find_in_progress_season_info,
        load_season_teams_lookup,
        compile_live_season_details
    )
except ImportError:
    try:
        from live import (
            compute_momentum,
            compute_status_badge,
            find_in_progress_season_info,
            load_season_teams_lookup,
            compile_live_season_details
        )
    except ImportError:
        from scripts.core.live import (
            compute_momentum,
            compute_status_badge,
            find_in_progress_season_info,
            load_season_teams_lookup,
            compile_live_season_details
        )

__all__ = [
    "compute_momentum",
    "compute_status_badge",
    "find_in_progress_season_info",
    "load_season_teams_lookup",
    "compile_live_season_details"
]

if __name__ == '__main__':
    res = compile_live_season_details()
    if res:
        print(f"Successfully compiled live season details for {res.get('season')}")
    else:
        print("No live season details compiled.")
