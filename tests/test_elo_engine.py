"""
tests/test_elo_engine.py
Unit tests for the League-Agnostic Dynamic Elo Rating Engine.
"""

import unittest
import math
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'scripts')))

from core.elo_engine import (
    expected_score,
    margin_multiplier,
    calculate_match_elo_update,
    compute_historical_seed_elos,
    apply_inter_season_carryover,
    run_dual_track_elo_pipeline
)

class TestEloEngine(unittest.TestCase):

    def test_expected_score_symmetry_and_values(self):
        # Equal ratings
        self.assertAlmostEqual(expected_score(1500.0, 1500.0), 0.5, places=5)
        self.assertAlmostEqual(expected_score(1600.0, 1600.0), 0.5, places=5)

        # Symmetry: E[A] + E[B] == 1.0
        prob_a = expected_score(1600.0, 1400.0)
        prob_b = expected_score(1400.0, 1600.0)
        self.assertAlmostEqual(prob_a + prob_b, 1.0, places=5)

        # Theoretical value for +200 diff with scale 400:
        # 1 / (1 + 10^(-200/400)) = 1 / (1 + 10^(-0.5)) = 1 / (1 + 0.3162277) = 0.7597469
        self.assertAlmostEqual(prob_a, 0.7597469, places=4)

    def test_margin_multiplier_spec_examples(self):
        # Example 1 from spec: 1-0 win with +2.0 FP margin
        # M = ln(1 + 1) * sqrt((2 + 10)/10) = ln(2) * sqrt(1.2) = 0.693147 * 1.095445 = 0.7593
        m1 = margin_multiplier(goals_a=1, goals_b=0, fp_a=68.0, fp_b=66.0)
        expected_m1 = math.log(2) * math.sqrt(1.2)
        self.assertAlmostEqual(m1, expected_m1, places=4)
        self.assertAlmostEqual(m1, 0.7593, places=3)

        # Example 2 from spec: 4-0 win with +22.0 FP margin
        # M = ln(1 + 4) * sqrt((22 + 10)/10) = ln(5) * sqrt(3.2) = 1.609438 * 1.788854 = 2.8790
        m2 = margin_multiplier(goals_a=4, goals_b=0, fp_a=88.0, fp_b=66.0)
        expected_m2 = math.log(5) * math.sqrt(3.2)
        self.assertAlmostEqual(m2, expected_m2, places=4)
        self.assertAlmostEqual(m2, 2.8790, places=3)

        # Draw with 0 FP difference: sqrt(10/10) = 1.0
        m_draw_equal = margin_multiplier(goals_a=1, goals_b=1, fp_a=70.0, fp_b=70.0)
        self.assertAlmostEqual(m_draw_equal, 1.0, places=4)

        # Draw with +10 FP difference: sqrt(20/10) = sqrt(2) = 1.4142
        m_draw_diff = margin_multiplier(goals_a=1, goals_b=1, fp_a=75.0, fp_b=65.0)
        self.assertAlmostEqual(m_draw_diff, math.sqrt(2.0), places=4)

    def test_zero_sum_invariant(self):
        # In all scenarios, delta_a + delta_b must equal 0.0
        test_cases = [
            (1500.0, 1500.0, 2, 1, 74.0, 68.0, 32.0),
            (1620.0, 1410.0, 0, 3, 62.0, 78.5, 32.0),
            (1450.0, 1580.0, 2, 2, 73.0, 72.0, 24.0),
            (1700.0, 1300.0, 1, 0, 66.5, 65.5, 40.0),
        ]
        for r_a, r_b, g_a, g_b, fp_a, fp_b, k in test_cases:
            new_a, new_b, d_a, d_b, _, _ = calculate_match_elo_update(
                r_a, r_b, g_a, g_b, fp_a, fp_b, k
            )
            self.assertAlmostEqual(d_a + d_b, 0.0, places=4,
                                   msg=f"Zero-sum invariant failed for {r_a} vs {r_b}")
            self.assertAlmostEqual(new_a - r_a, d_a, places=4)
            self.assertAlmostEqual(new_b - r_b, d_b, places=4)

    def test_carryover_formula(self):
        # R_start = 0.75 * R_end + 0.25 * 1500.0
        # For R_end = 1600: 0.75 * 1600 + 0.25 * 1500 = 1200 + 375 = 1575.0
        # For R_end = 1400: 0.75 * 1400 + 0.25 * 1500 = 1050 + 375 = 1425.0
        # For R_end = 1500: 1500.0
        current_ratings = {
            'manager_high': 1600.0,
            'manager_low': 1400.0,
            'manager_mid': 1500.0
        }
        carried = apply_inter_season_carryover(current_ratings, carryover_alpha=0.75, base_rating=1500.0)
        self.assertAlmostEqual(carried['manager_high'], 1575.0, places=1)
        self.assertAlmostEqual(carried['manager_low'], 1425.0, places=1)
        self.assertAlmostEqual(carried['manager_mid'], 1500.0, places=1)

    def test_historical_seeding_bounds(self):
        # Mock managers with various trophy histories
        managers = [
            {
                'id': 'champion',
                'name': 'Champion',
                'history': [
                    {'season': '2021/22', 'competition': 'Serie Atlas', 'rank': 1, 'achievements': [{'badge': 'gold'}]},
                    {'season': '2022/23', 'competition': 'Serie Atlas', 'rank': 1, 'achievements': [{'badge': 'gold'}]},
                    {'season': '2023/24', 'competition': 'Coppa', 'rank': 1, 'achievements': [{'badge': 'cup_gold'}]},
                ]
            },
            {
                'id': 'average',
                'name': 'Average',
                'history': [
                    {'season': '2021/22', 'competition': 'Serie Atlas', 'rank': 5, 'achievements': []},
                    {'season': '2022/23', 'competition': 'Serie Atlas', 'rank': 6, 'achievements': []},
                ]
            },
            {
                'id': 'struggling',
                'name': 'Struggling',
                'history': [
                    {'season': '2021/22', 'competition': 'Serie Atlas', 'rank': 10, 'achievements': [{'badge': 'spoon'}]},
                    {'season': '2022/23', 'competition': 'Serie Atlas', 'rank': 10, 'achievements': [{'badge': 'spoon'}]},
                ]
            },
            {
                'id': 'newcomer',
                'name': 'Newcomer',
                'history': []
            }
        ]

        seeds = compute_historical_seed_elos(managers, season_until="2024/25")
        
        # Newcomer should always be 1500.0
        self.assertEqual(seeds['newcomer'], 1500.0)

        # Champion should have higher rating than average and struggling
        self.assertGreater(seeds['champion'], seeds['average'])
        self.assertGreater(seeds['average'], seeds['struggling'])

        # All seeds must be clamped between 1350 and 1650
        for m_id, seed in seeds.items():
            self.assertGreaterEqual(seed, 1350.0)
            self.assertLessEqual(seed, 1650.0)

if __name__ == '__main__':
    unittest.main()
