"""
scripts/core/elo_engine.py
Backward-compatible facade module for scripts/core/elo/ package.
"""

try:
    from core.elo import (
        DEFAULT_ELO_CONFIG,
        DEFAULT_SCORING_WEIGHTS,
        expected_score,
        fermi_dirac,
        margin_multiplier,
        directional_draw_score,
        get_k_factor,
        calculate_match_elo_update,
        compute_historical_seed_elos,
        apply_inter_season_carryover,
        simulate_season_elo,
        simulate_season_atlas_elo,
        compute_season_diagnostics,
        run_multi_track_elo_pipeline,
        run_dual_track_elo_pipeline
    )
except ImportError:
    try:
        from elo import (
            DEFAULT_ELO_CONFIG,
            DEFAULT_SCORING_WEIGHTS,
            expected_score,
            fermi_dirac,
            margin_multiplier,
            directional_draw_score,
            get_k_factor,
            calculate_match_elo_update,
            compute_historical_seed_elos,
            apply_inter_season_carryover,
            simulate_season_elo,
            simulate_season_atlas_elo,
            compute_season_diagnostics,
            run_multi_track_elo_pipeline,
            run_dual_track_elo_pipeline
        )
    except ImportError:
        from scripts.core.elo import (
            DEFAULT_ELO_CONFIG,
            DEFAULT_SCORING_WEIGHTS,
            expected_score,
            fermi_dirac,
            margin_multiplier,
            directional_draw_score,
            get_k_factor,
            calculate_match_elo_update,
            compute_historical_seed_elos,
            apply_inter_season_carryover,
            simulate_season_elo,
            simulate_season_atlas_elo,
            compute_season_diagnostics,
            run_multi_track_elo_pipeline,
            run_dual_track_elo_pipeline
        )

__all__ = [
    "DEFAULT_ELO_CONFIG",
    "DEFAULT_SCORING_WEIGHTS",
    "expected_score",
    "fermi_dirac",
    "margin_multiplier",
    "directional_draw_score",
    "get_k_factor",
    "calculate_match_elo_update",
    "compute_historical_seed_elos",
    "apply_inter_season_carryover",
    "simulate_season_elo",
    "simulate_season_atlas_elo",
    "compute_season_diagnostics",
    "run_multi_track_elo_pipeline",
    "run_dual_track_elo_pipeline"
]
