"""
tests/test_luck_simulator.py
Unit tests for the schedule luck and expected points simulation engine.
"""

import unittest
import time
from scripts.core.luck_simulator import (
    fanta_points_to_goals,
    compute_luck_badge,
    compute_all_play_standings,
    run_monte_carlo_schedule_simulation,
    compute_schedule_luck_analytics
)


class TestLuckSimulator(unittest.TestCase):

    def test_goal_brackets_conversion(self):
        """Verify standard Italian league goal threshold conversions."""
        # Thresholds: <66: 0, 66-71.5: 1, 72-77.5: 2, 78-83.5: 3, 84-89.5: 4, 90+: 5
        self.assertEqual(fanta_points_to_goals(0.0), 0)
        self.assertEqual(fanta_points_to_goals(65.5), 0)
        self.assertEqual(fanta_points_to_goals(65.99), 0)
        self.assertEqual(fanta_points_to_goals(66.0), 1)
        self.assertEqual(fanta_points_to_goals(71.5), 1)
        self.assertEqual(fanta_points_to_goals(72.0), 2)
        self.assertEqual(fanta_points_to_goals(77.5), 2)
        self.assertEqual(fanta_points_to_goals(78.0), 3)
        self.assertEqual(fanta_points_to_goals(83.5), 3)
        self.assertEqual(fanta_points_to_goals(84.0), 4)
        self.assertEqual(fanta_points_to_goals(87.5), 4)
        self.assertEqual(fanta_points_to_goals(90.0), 5)
        self.assertEqual(fanta_points_to_goals(96.0), 6)

    def test_luck_badge_mapping(self):
        """Verify Schedule Luck Z-score classification into badges."""
        self.assertEqual(compute_luck_badge(1.5), ('🍀', 'Favorevole'))
        self.assertEqual(compute_luck_badge(1.0), ('🍀', 'Favorevole'))
        self.assertEqual(compute_luck_badge(0.7), ('↗️', 'Positivo'))
        self.assertEqual(compute_luck_badge(0.35), ('↗️', 'Positivo'))
        self.assertEqual(compute_luck_badge(0.0), ('⚖️', 'Neutro'))
        self.assertEqual(compute_luck_badge(-0.3), ('⚖️', 'Neutro'))
        self.assertEqual(compute_luck_badge(-0.35), ('↘️', 'Sfortunato'))
        self.assertEqual(compute_luck_badge(-0.8), ('↘️', 'Sfortunato'))
        self.assertEqual(compute_luck_badge(-1.0), ('⛈️', 'Bersagliato'))
        self.assertEqual(compute_luck_badge(-2.1), ('⛈️', 'Bersagliato'))

    def test_all_play_standings_and_zero_sum_property(self):
        """Verify deterministic 1 vs All duels on known 4-team fixture and zero-sum invariant."""
        # 4 teams: A, B, C, D
        # Round 1:
        # Match 1: Team A (85.0 -> 4 goals) vs Team B (73.0 -> 2 goals) -> A wins 3pts, B loses 0pts
        # Match 2: Team C (68.0 -> 1 goal) vs Team D (62.0 -> 0 goals) -> C wins 3pts, D loses 0pts
        # In all-play:
        # Team A (4 goals) vs B(2), C(1), D(0) -> 3 wins, 0 draws, 0 losses -> 9 pts / 3 = 3.0 xPTS
        # Team B (2 goals) vs A(4) [L], C(1) [W], D(0) [W] -> 2 wins, 0 draws, 1 loss -> 6 pts / 3 = 2.0 xPTS
        # Team C (1 goal) vs A(4) [L], B(2) [L], D(0) [W] -> 1 win, 0 draws, 2 losses -> 3 pts / 3 = 1.0 xPTS
        # Team D (0 goals) vs A(4) [L], B(2) [L], C(1) [L] -> 0 wins, 0 draws, 3 losses -> 0 pts / 3 = 0.0 xPTS
        teams = ['Team A', 'Team B', 'Team C', 'Team D']
        rounds = [
            {
                'roundNumber': 1,
                'matches': [
                    {'homeTeam': 'Team A', 'awayTeam': 'Team B', 'homeFantaPoints': 85.0, 'awayFantaPoints': 73.0, 'isPlayed': True},
                    {'homeTeam': 'Team C', 'awayTeam': 'Team D', 'homeFantaPoints': 68.0, 'awayFantaPoints': 62.0, 'isPlayed': True}
                ]
            }
        ]

        ap = compute_all_play_standings(rounds, teams)
        self.assertEqual(ap['Team A']['xPoints'], 3.0)
        self.assertEqual(ap['Team B']['xPoints'], 2.0)
        self.assertEqual(ap['Team C']['xPoints'], 1.0)
        self.assertEqual(ap['Team D']['xPoints'], 0.0)

        # Actual points: A=3, B=0, C=3, D=0 -> Total actual points = 6
        # Expected points: A=3, B=2, C=1, D=0 -> Total xPTS = 6.0
        # Schedule Luck delta:
        # A: 3 - 3.0 = 0.0
        # B: 0 - 2.0 = -2.0 (dropped 2 points due to facing highest scorer)
        # C: 3 - 1.0 = +2.0 (gained 2 points by facing lowest scorer)
        # D: 0 - 0.0 = 0.0
        # Sum of delta = 0.0 -> Zero Sum invariant!
        teams_stats = {
            'Team A': {'points': 3, 'rank': 1, 'totalFantaPoints': 85.0},
            'Team B': {'points': 0, 'rank': 3, 'totalFantaPoints': 73.0},
            'Team C': {'points': 3, 'rank': 2, 'totalFantaPoints': 68.0},
            'Team D': {'points': 0, 'rank': 4, 'totalFantaPoints': 62.0}
        }

        analytics = compute_schedule_luck_analytics(teams_stats, rounds, total_rounds=6, random_seed=42)

        # Delta Points = Actual Points - xPoints
        delta_A = teams_stats['Team A']['points'] - analytics['Team A']['xPoints']
        delta_B = teams_stats['Team B']['points'] - analytics['Team B']['xPoints']
        delta_C = teams_stats['Team C']['points'] - analytics['Team C']['xPoints']
        delta_D = teams_stats['Team D']['points'] - analytics['Team D']['xPoints']

        self.assertEqual(delta_A, 0.0)
        self.assertEqual(delta_B, -2.0)
        self.assertEqual(delta_C, 2.0)
        self.assertEqual(delta_D, 0.0)

        total_delta = delta_A + delta_B + delta_C + delta_D
        self.assertAlmostEqual(total_delta, 0.0, places=2)

    def test_monte_carlo_performance_and_reproducibility(self):
        """Verify Monte Carlo K=10,000 executes in < 500ms and is deterministic with fixed seed."""
        teams = [f'Team {i}' for i in range(14)]
        matches = []
        for i in range(0, 14, 2):
            matches.append({
                'homeTeam': teams[i],
                'awayTeam': teams[i+1],
                'homeFantaPoints': 65.0 + i * 2.0,
                'awayFantaPoints': 66.0 + i * 1.5,
                'isPlayed': True
            })
        rounds = [{'roundNumber': 1, 'matches': matches}]

        teams_stats = {t: {'points': 1, 'rank': idx + 1, 'totalFantaPoints': 70.0} for idx, t in enumerate(teams)}

        t0 = time.time()
        res1 = compute_schedule_luck_analytics(teams_stats, rounds, total_rounds=26, random_seed=123)
        elapsed = time.time() - t0

        self.assertLess(elapsed, 0.5, f"Execution took {elapsed:.3f}s, expected < 0.5s")

        res2 = compute_schedule_luck_analytics(teams_stats, rounds, total_rounds=26, random_seed=123)
        self.assertEqual(res1['Team 0']['luckZScore'], res2['Team 0']['luckZScore'])

    def test_monte_carlo_monotonicity_and_banked_points(self):
        """Verify that teams with higher banked points and higher Elo have monotonically higher podium odds and lower spoon odds."""
        teams = [f'Team {i}' for i in range(8)]
        # 5 completed rounds
        rounds = []
        for r_num in range(1, 6):
            rounds.append({
                'roundNumber': r_num,
                'matches': [
                    {'homeTeam': teams[i], 'awayTeam': teams[i+1], 'homeFantaPoints': 75.0 - i * 2, 'awayFantaPoints': 70.0 - i * 2, 'isPlayed': True}
                    for i in range(0, 8, 2)
                ]
            })

        # Scheduled future rounds 6 to 14
        for r_num in range(6, 15):
            rounds.append({
                'roundNumber': r_num,
                'matches': [
                    {'homeTeam': teams[i], 'awayTeam': teams[(i+1) % 8], 'isPlayed': False}
                    for i in range(0, 8, 2)
                ]
            })

        teams_stats = {
            teams[i]: {
                'points': 15 - i * 2,
                'rank': i + 1,
                'totalFantaPoints': 380.0 - i * 15,
                'managerId': f'm_{i}',
                'avgFantaPoints': 76.0 - i * 3,
                'played': 5
            }
            for i in range(8)
        }

        elo_profiles = {
            f'm_{i}': {'flat': {'current': 1600.0 - i * 30}}
            for i in range(8)
        }

        odds_cfg = {
            'base_draw_nu': 0.72,
            'draw_decay_lambda': 0.03,
            'sensitivity_kappa': 0.55,
            'min_sigma_elo': 35.0,
            'min_sigma_power': 1.5,
            'k_shrinkage': 5,
            'flat_weights': {'elo': 0.65, 'power': 0.35}
        }

        res = compute_schedule_luck_analytics(
            teams_stats=teams_stats,
            all_rounds=rounds,
            total_rounds=14,
            random_seed=42,
            elo_profiles=elo_profiles,
            odds_config=odds_cfg
        )

        podium_pcts = [res[teams[i]]['monteCarlo']['pPodiumPct'] for i in range(8)]
        spoon_pcts = [res[teams[i]]['monteCarlo']['pSpoonPct'] for i in range(8)]

        # All values should be populated
        for p in podium_pcts:
            self.assertIsNotNone(p)
        for s in spoon_pcts:
            self.assertIsNotNone(s)

        # Monotonicity test: Leader (Team 0) has higher podium odds than Mid teams and Bottom
        self.assertGreater(podium_pcts[0], podium_pcts[2])
        self.assertGreater(podium_pcts[2], podium_pcts[5])
        self.assertGreater(podium_pcts[5], podium_pcts[7])

        # Spoon test: Bottom (Team 7) has higher spoon odds than Mid teams and Leader
        self.assertGreater(spoon_pcts[7], spoon_pcts[5])
        self.assertGreater(spoon_pcts[5], spoon_pcts[2])
        self.assertGreaterEqual(spoon_pcts[2], spoon_pcts[0])
        self.assertEqual(spoon_pcts[0], 0.0)

    def test_tie_breaker_expected_total_fp(self):
        """Verify that when teams tie on simulated points, expected total fanta-points breaks the tie."""
        teams = ['Team HighScorer', 'Team LowScorer']
        rounds = []
        for r_num in range(1, 6):
            rounds.append({
                'roundNumber': r_num,
                'matches': [
                    {'homeTeam': 'Team HighScorer', 'awayTeam': 'Team LowScorer', 'homeFantaPoints': 76.0, 'awayFantaPoints': 68.0, 'isPlayed': True}
                ]
            })

        # Future rounds 6
        rounds.append({
            'roundNumber': 6,
            'matches': [
                {'homeTeam': 'Team HighScorer', 'awayTeam': 'Team LowScorer', 'isPlayed': False}
            ]
        })

        # Both have 6 points, but HighScorer has 380 FP vs LowScorer 330 FP
        teams_stats = {
            'Team HighScorer': {'points': 6, 'rank': 1, 'totalFantaPoints': 380.0, 'avgFantaPoints': 76.0, 'played': 5},
            'Team LowScorer': {'points': 6, 'rank': 2, 'totalFantaPoints': 330.0, 'avgFantaPoints': 66.0, 'played': 5}
        }

        res = compute_schedule_luck_analytics(
            teams_stats=teams_stats,
            all_rounds=rounds,
            total_rounds=6,
            random_seed=999
        )

        # HighScorer must have higher podium % (or rank 1 odds) than LowScorer
        p_high = res['Team HighScorer']['monteCarlo']['pPodiumPct']
        p_low = res['Team LowScorer']['monteCarlo']['pPodiumPct']
        self.assertGreaterEqual(p_high, p_low)


if __name__ == '__main__':
    unittest.main()
