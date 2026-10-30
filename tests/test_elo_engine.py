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
    directional_draw_score,
    fermi_dirac,
    calculate_match_elo_update,
    compute_historical_seed_elos,
    apply_inter_season_carryover,
    simulate_season_atlas_elo,
    compute_season_diagnostics,
    run_multi_track_elo_pipeline,
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

    def test_hybrid_capped_margin_multiplier(self):
        # 1-0 win with +2.0 FP margin: clamped to minimum baseline 1.0
        m1 = margin_multiplier(goals_a=1, goals_b=0, fp_a=68.0, fp_b=66.0, max_cap=1.75)
        self.assertAlmostEqual(m1, 1.0, places=4)

        # 4-0 blowout with +22.0 FP margin: capped at max_cap = 1.75
        m2 = margin_multiplier(goals_a=4, goals_b=0, fp_a=88.0, fp_b=66.0, max_cap=1.75)
        self.assertAlmostEqual(m2, 1.75, places=4)

        # Winsorized fantasy points: extreme scores beyond [60, 90] should be clamped
        m_extreme = margin_multiplier(goals_a=2, goals_b=0, fp_a=110.0, fp_b=50.0, max_cap=1.75)
        m_clamped = margin_multiplier(goals_a=2, goals_b=0, fp_a=90.0, fp_b=60.0, max_cap=1.75)
        self.assertAlmostEqual(m_extreme, m_clamped, places=4)

    def test_directional_draw_score(self):
        # Equal fantasy points in a draw -> exactly 0.5
        self.assertAlmostEqual(directional_draw_score(72.0, 72.0), 0.5, places=5)

        # Draw with A having +6 FP advantage -> 0.5 + 0.15*tanh(1) = 0.5 + 0.15*0.76159 = 0.6142
        score_a = directional_draw_score(76.0, 70.0)
        score_b = directional_draw_score(70.0, 76.0)
        self.assertAlmostEqual(score_a + score_b, 1.0, places=5)
        self.assertGreater(score_a, 0.5)
        self.assertLess(score_a, 0.65)

    def test_fermi_dirac(self):
        # Delta 0 -> 0.5
        self.assertAlmostEqual(fermi_dirac(0.0, scale=8.5), 0.5, places=5)
        # Symmetry
        self.assertAlmostEqual(fermi_dirac(5.0, scale=8.5) + fermi_dirac(-5.0, scale=8.5), 1.0, places=5)
        # Advantage > 0 gives > 0.5
        self.assertGreater(fermi_dirac(8.5, scale=8.5), 0.5)

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

    def test_pipeline_seasons_partitioning(self):
        s25_rounds = [
            {
                'roundNumber': 1,
                'matches': [
                    {
                        'homeManagerId': 'm_a',
                        'awayManagerId': 'm_b',
                        'homeScore': 2,
                        'awayScore': 1,
                        'homeFantaPoints': 75.0,
                        'awayFantaPoints': 68.0,
                        'isPlayed': True
                    }
                ]
            }
        ]
        s26_rounds = [
            {
                'roundNumber': 1,
                'matches': [
                    {
                        'homeManagerId': 'm_a',
                        'awayManagerId': 'm_b',
                        'homeScore': 0,
                        'awayScore': 1,
                        'homeFantaPoints': 64.0,
                        'awayFantaPoints': 70.0,
                        'isPlayed': True
                    }
                ]
            }
        ]
        managers = [{'id': 'm_a', 'name': 'A'}, {'id': 'm_b', 'name': 'B'}]
        profiles = run_multi_track_elo_pipeline(
            season_2025_rounds=s25_rounds,
            season_2026_rounds=s26_rounds,
            managers_list=managers
        )

        self.assertIn('m_a', profiles)
        prof_a = profiles['m_a']
        # Check all 3 tracks exist
        self.assertIn('flat', prof_a)
        self.assertIn('historical', prof_a)
        self.assertIn('atlas', prof_a)
        self.assertIn('seasonStats', prof_a)

        self.assertIn('seasons', prof_a['flat'])
        self.assertIn('2025/26', prof_a['flat']['seasons'])
        self.assertIn('2026/27', prof_a['flat']['seasons'])
        self.assertEqual(len(prof_a['flat']['seasons']['2025/26']), 1)
        self.assertEqual(len(prof_a['flat']['seasons']['2026/27']), 1)
        self.assertEqual(len(prof_a['flat']['trajectory']), 2)

        # Check telemetry fields on trajectory point
        pt0 = prof_a['flat']['trajectory'][0]
        self.assertIn('gf', pt0)
        self.assertIn('ga', pt0)
        self.assertIn('fpFor', pt0)
        self.assertIn('fpAgainst', pt0)
        self.assertEqual(pt0['gf'], 2)
        self.assertEqual(pt0['ga'], 1)
        self.assertAlmostEqual(pt0['fpFor'], 75.0)
        self.assertAlmostEqual(pt0['fpAgainst'], 68.0)

        # Check seasonStats computed
        self.assertIn('2025/26', prof_a['seasonStats'])
        self.assertIn('2026/27', prof_a['seasonStats'])
        self.assertIn('all', prof_a['seasonStats'])
        self.assertIn('golo', prof_a['seasonStats']['2025/26'])
        self.assertIn('xPts', prof_a['seasonStats']['2025/26'])

    def test_atlas_elo_v2_zero_sum(self):
        # In any multi-manager round with simulate_season_atlas_elo,
        # the sum of rating deltas across the entire league must equal 0.0 (strictly zero-sum)
        round_matches = [
            {'roundNumber': 1, 'matches': [
                {'homeManagerId': 'm1', 'awayManagerId': 'm2', 'homeScore': 2, 'awayScore': 1, 'homeFantaPoints': 74.0, 'awayFantaPoints': 68.0, 'isPlayed': True},
                {'homeManagerId': 'm3', 'awayManagerId': 'm4', 'homeScore': 0, 'awayScore': 0, 'homeFantaPoints': 66.0, 'awayFantaPoints': 67.0, 'isPlayed': True},
                {'homeManagerId': 'm5', 'awayManagerId': 'm6', 'homeScore': 3, 'awayScore': 1, 'homeFantaPoints': 80.0, 'awayFantaPoints': 70.0, 'isPlayed': True},
                {'homeManagerId': 'm7', 'awayManagerId': 'm8', 'homeScore': 1, 'awayScore': 2, 'homeFantaPoints': 69.0, 'awayFantaPoints': 75.0, 'isPlayed': True},
            ]}
        ]
        starting_elos = {f'm{i}': 1500.0 for i in range(1, 9)}
        years = {f'm{i}': i for i in range(1, 9)}

        res_trackers = simulate_season_atlas_elo(
            rounds_data=round_matches,
            starting_elos=starting_elos,
            season_label='2026/27',
            manager_years=years
        )

        sum_deltas = sum(res_trackers[f'm{i}']['lastDelta'] for i in range(1, 9))
        self.assertAlmostEqual(sum_deltas, 0.0, delta=0.2)

    def test_season_diagnostics_negative_golo_and_all_play(self):
        # 2-round miniature season matching Scalo San Genesio (-0.50 Golo) and Partizan (-2.00 Golo)
        rounds_data = {
            '2026/27': [
                {
                    'roundNumber': 1,
                    'matches': [
                        {'homeManagerId': 'm_scalo', 'awayManagerId': 'm_champ', 'homeScore': 1, 'awayScore': 2, 'homeFantaPoints': 68.0, 'awayFantaPoints': 73.0, 'isPlayed': True},
                        {'homeManagerId': 'm_partizan', 'awayManagerId': 'm_other', 'homeScore': 0, 'awayScore': 3, 'homeFantaPoints': 62.0, 'awayFantaPoints': 79.0, 'isPlayed': True},
                    ]
                },
                {
                    'roundNumber': 2,
                    'matches': [
                        {'homeManagerId': 'm_champ', 'awayManagerId': 'm_scalo', 'homeScore': 3, 'awayScore': 1, 'homeFantaPoints': 78.0, 'awayFantaPoints': 70.0, 'isPlayed': True},
                        {'homeManagerId': 'm_other', 'awayManagerId': 'm_partizan', 'homeScore': 3, 'awayScore': 0, 'homeFantaPoints': 80.0, 'awayFantaPoints': 61.0, 'isPlayed': True},
                    ]
                }
            ]
        }
        managers = ['m_scalo', 'm_champ', 'm_partizan', 'm_other']
        diag = compute_season_diagnostics(rounds_data, managers)
        
        scalo = diag['2026/27']['m_scalo']
        self.assertEqual(scalo['played'], 2)
        self.assertEqual(scalo['gf'], 2)
        self.assertEqual(scalo['ga'], 5)
        self.assertEqual(scalo['gd'], -3)
        # Golo = 1.00 + (-3 / 2) = -0.50
        self.assertEqual(scalo['golo'], -0.50)
        self.assertEqual(scalo['actualPts'], 0)
        self.assertGreater(scalo['xPts'], 0.0)

        partizan = diag['2026/27']['m_partizan']
        self.assertEqual(partizan['played'], 2)
        self.assertEqual(partizan['gf'], 0)
        self.assertEqual(partizan['ga'], 6)
        self.assertEqual(partizan['gd'], -6)
        # Golo = 1.00 + (-6 / 2) = -2.00
        self.assertEqual(partizan['golo'], -2.00)

if __name__ == '__main__':
    unittest.main()
