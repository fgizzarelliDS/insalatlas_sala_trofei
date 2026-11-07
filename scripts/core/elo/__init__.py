"""
scripts/core/elo/__init__.py
Modular Elo engine package exporting calculator, seeding, simulator, and pipeline components.
"""

from .calculator import (
    DEFAULT_ELO_CONFIG,
    DEFAULT_SCORING_WEIGHTS,
    expected_score,
    fermi_dirac,
    margin_multiplier,
    directional_draw_score,
    get_k_factor,
    calculate_match_elo_update
)

from .seeding import (
    compute_historical_seed_elos,
    apply_inter_season_carryover
)

from .simulator import (
    simulate_season_elo,
    simulate_season_atlas_elo
)

from .pipeline import (
    compute_season_diagnostics,
    run_multi_track_elo_pipeline,
    run_dual_track_elo_pipeline
)
