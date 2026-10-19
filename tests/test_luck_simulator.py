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


if __name__ == '__main__':
    unittest.main()
