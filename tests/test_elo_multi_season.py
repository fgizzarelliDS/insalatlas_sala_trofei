"""
tests/test_elo_multi_season.py
Unit tests verifying arbitrary chronological N-season Elo pipeline execution,
inter-season carryovers, dynamic season labels, and recovery from existing trackers.
"""

import unittest
from core.elo_engine import run_multi_track_elo_pipeline, DEFAULT_ELO_CONFIG


class TestEloMultiSeason(unittest.TestCase):
    def setUp(self):
        self.managers = [
            {'id': 'm_alpha', 'name': 'Alpha', 'years': 3, 'history': [{'season': '2023/24', 'rank': 1}]},
            {'id': 'm_beta', 'name': 'Beta', 'years': 2, 'history': [{'season': '2023/24', 'rank': 5}]},
            {'id': 'm_rookie', 'name': 'Rookie', 'years': 0, 'history': []}
        ]

    def test_single_season_pipeline(self):
        """Pipeline must succeed when only 1 season is passed."""
        s1_rounds = [
            {
                'roundNumber': 1,
                'championshipMatchDay': 1,
                'competitionCategory': 'Campionato',
                'matches': [
                    {
                        'homeManagerId': 'm_alpha',
                        'awayManagerId': 'm_beta',
                        'homeScore': 2,
                        'awayScore': 1,
                        'homeFantaPoints': 74.5,
                        'awayFantaPoints': 68.0,
                        'isPlayed': True
                    }
                ]
            }
        ]

        profiles = run_multi_track_elo_pipeline(
            seasons_rounds=[('2024/25', s1_rounds)],
            managers_list=self.managers
        )

        self.assertIn('m_alpha', profiles)
        self.assertIn('m_beta', profiles)
        self.assertIn('2024/25', profiles['m_alpha']['flat']['seasons'])
        self.assertEqual(len(profiles['m_alpha']['flat']['trajectory']), 1)
        self.assertEqual(profiles['m_alpha']['flat']['peak']['season'], '2024/25')

    def test_three_season_carryover_chain(self):
        """Pipeline must carry over Elo across S1 -> S2 -> S3 and handle rookie entry in S3."""
        # Season 1
        s1_rounds = [
            {
                'roundNumber': 1,
                'championshipMatchDay': 1,
                'competitionCategory': 'Campionato',
                'matches': [
                    {
                        'homeManagerId': 'm_alpha',
                        'awayManagerId': 'm_beta',
                        'homeScore': 3,
                        'awayScore': 0,
                        'homeFantaPoints': 78.0,
                        'awayFantaPoints': 62.0,
                        'isPlayed': True
                    }
                ]
            }
        ]

        # Season 2
        s2_rounds = [
            {
                'roundNumber': 1,
                'championshipMatchDay': 1,
                'competitionCategory': 'Campionato',
                'matches': [
                    {
                        'homeManagerId': 'm_beta',
                        'awayManagerId': 'm_alpha',
                        'homeScore': 1,
                        'awayScore': 1,
                        'homeFantaPoints': 70.0,
                        'awayFantaPoints': 70.0,
                        'isPlayed': True
                    }
                ]
            }
        ]

        # Season 3: Rookie enters
        s3_rounds = [
            {
                'roundNumber': 1,
                'championshipMatchDay': 1,
                'competitionCategory': 'Campionato',
                'matches': [
                    {
                        'homeManagerId': 'm_rookie',
                        'awayManagerId': 'm_alpha',
                        'homeScore': 0,
                        'awayScore': 2,
                        'homeFantaPoints': 64.0,
                        'awayFantaPoints': 75.0,
                        'isPlayed': True
                    }
                ]
            }
        ]

        seasons_rounds = [
            ('2024/25', s1_rounds),
            ('2025/26', s2_rounds),
            ('2026/27', s3_rounds)
        ]

        profiles = run_multi_track_elo_pipeline(
            seasons_rounds=seasons_rounds,
            managers_list=self.managers
        )

        self.assertIn('m_alpha', profiles)
        self.assertIn('m_beta', profiles)
        self.assertIn('m_rookie', profiles)

        prof_alpha = profiles['m_alpha']
        # Must have all 3 seasons in trajectory
        self.assertEqual(len(prof_alpha['flat']['trajectory']), 3)
        self.assertIn('2024/25', prof_alpha['flat']['seasons'])
        self.assertIn('2025/26', prof_alpha['flat']['seasons'])
        self.assertIn('2026/27', prof_alpha['flat']['seasons'])

        # Rookie must enter at base rating in S3
        prof_rookie = profiles['m_rookie']
        self.assertEqual(len(prof_rookie['flat']['trajectory']), 1)
        self.assertEqual(prof_rookie['flat']['trajectory'][0]['season'], '2026/27')

        # Diagnostics must be present for all 3 seasons
        self.assertIn('2024/25', prof_alpha['seasonStats'])
        self.assertIn('2025/26', prof_alpha['seasonStats'])
        self.assertIn('2026/27', prof_alpha['seasonStats'])
        self.assertEqual(prof_alpha['seasonStats']['2024/25']['gf'], 3)
        self.assertEqual(prof_alpha['seasonStats']['2025/26']['gf'], 1)
        self.assertEqual(prof_alpha['seasonStats']['2026/27']['gf'], 2)

    def test_existing_trackers_recovery(self):
        """Pipeline must accept pre-computed trackers for historical seasons and chain to live season."""
        mock_fb_flat = {
            'm_alpha': {
                'current': 1580.0,
                'peak': {'value': 1580.0, 'season': '2024/25', 'round': 1},
                'floor': {'value': 1500.0, 'season': '2024/25', 'round': 0},
                'lastDelta': 80.0,
                'trajectory': [{'season': '2024/25', 'round': 1, 'elo': 1580.0, 'delta': 80.0}]
            }
        }
        mock_fb_hist = dict(mock_fb_flat)
        mock_fb_atlas = dict(mock_fb_flat)

        s2_rounds = [
            {
                'roundNumber': 1,
                'championshipMatchDay': 1,
                'competitionCategory': 'Campionato',
                'matches': [
                    {
                        'homeManagerId': 'm_alpha',
                        'awayManagerId': 'm_beta',
                        'homeScore': 1,
                        'awayScore': 0,
                        'homeFantaPoints': 72.0,
                        'awayFantaPoints': 65.0,
                        'isPlayed': True
                    }
                ]
            }
        ]

        profiles = run_multi_track_elo_pipeline(
            seasons_rounds=[('2024/25', []), ('2025/26', s2_rounds)],
            managers_list=self.managers,
            existing_trackers={'2024/25': (mock_fb_flat, mock_fb_hist, mock_fb_atlas)}
        )

        self.assertIn('m_alpha', profiles)
        traj = profiles['m_alpha']['flat']['trajectory']
        self.assertEqual(len(traj), 2)
        self.assertEqual(traj[0]['season'], '2024/25')
        self.assertEqual(traj[1]['season'], '2025/26')


if __name__ == '__main__':
    unittest.main()
