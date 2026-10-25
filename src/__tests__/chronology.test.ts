import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  computeManagerTrajectoryMetrics,
  computeSeasonalParityMetrics
} from '@/analytics/chronology';
import { renderAnalyticsModalDOM } from '@/components/modals/analytics';
import { state } from '@/state';
import type { Manager, CompetitionRecord } from '@/types';

describe('Chronology Analytics Module', () => {
  describe('computeManagerTrajectoryMetrics', () => {
    it('computes correct Average Rank, Rank Oscillation, and Merit Percentile across 8, 10, and 12-team seasons', () => {
      const mockManager: Manager = {
        id: 'm_test',
        name: 'Test Manager',
        years: 3,
        gold: 1,
        silver: 0,
        bronze: 0,
        spoon: 1,
        cup_gold: 0,
        cup_silver: 0,
        supercup: 0,
        mundialito: 0,
        cartonato: 0,
        history: [
          // 2016/17 (8 teams): 1st place -> 100%
          { season: '2016/17', team: 'A', rank: 1, points: 60, achievements: [] },
          // 2018/19 (10 teams): 10th place -> 0% (spoon)
          {
            season: '2018/19',
            team: 'A',
            rank: 10,
            points: 30,
            achievements: [{ title: 'Cucchiaio', category: 'Campionato', badge: 'spoon', icon: '🥄' }]
          },
          // 2024/25 (12 teams): 4th place -> (12 - 4) / 11 = 72.73%
          { season: '2024/25', team: 'A', rank: 4, points: 50, achievements: [] }
        ]
      };

      const metrics = computeManagerTrajectoryMetrics([mockManager]);
      expect(metrics).toHaveLength(1);
      const res = metrics[0];

      expect(res.seasonsPlayed).toBe(3);
      // Avg rank = (1 + 10 + 4) / 3 = 5.0°
      expect(res.avgRank).toBe(5.0);
      // StdDev of ranks: variance = ((1-5)^2 + (10-5)^2 + (4-5)^2)/3 = (16 + 25 + 1)/3 = 14 -> sqrt(14) ~= 3.74
      expect(res.stdDevRank).toBeCloseTo(3.7, 1);
      // Avg merit = (100 + 0 + 72.73) / 3 = 57.57% -> rounded 57.6%
      expect(res.avgMeritPct).toBeCloseTo(57.6, 1);
      expect(res.bestRank).toBe(1);
      expect(res.worstRank).toBe(10);
      expect(res.totalPodiums).toBe(1); // 1st place
      expect(res.totalSpoons).toBe(1); // 10th place spoon

      // Tier distribution: 2016/17 (8 teams, rank 1 -> Vertice), 2018/19 (10 teams, rank 10 -> Rischio), 2024/25 (12 teams, rank 4 -> Alta)
      expect(res.tierDistribution.podiumCount).toBe(1);
      expect(res.tierDistribution.highCount).toBe(1);
      expect(res.tierDistribution.midCount).toBe(0);
      expect(res.tierDistribution.riskCount).toBe(1);
      // Baricentro = (4*1 + 3*1 + 2*0 + 1*1) / 3 = 8 / 3 ~= 2.7
      expect(res.tierDistribution.baricenterScore).toBe(2.7);
      expect(res.tierDistribution.baricenterLabel).toBe('Metà Classifica');
    });

    it('assigns Metronomo for low rank oscillation (<2.0), Altalenante for high oscillation (>3.5), and Esordiente for <= 3 seasons', () => {
      const rockManager: Manager = {
        id: 'm_rock',
        name: 'The Rock',
        years: 4,
        gold: 0,
        silver: 0,
        bronze: 0,
        spoon: 0,
        cup_gold: 0,
        cup_silver: 0,
        supercup: 0,
        mundialito: 0,
        cartonato: 0,
        history: [
          // Solid 4th/5th finishes (oscillation < 1.0)
          { season: '2021/22', team: 'R', rank: 4, points: 50, achievements: [] },
          { season: '2022/23', team: 'R', rank: 5, points: 48, achievements: [] },
          { season: '2023/24', team: 'R', rank: 4, points: 51, achievements: [] },
          { season: '2024/25', team: 'R', rank: 5, points: 49, achievements: [] }
        ]
      };

      const rollercoasterManager: Manager = {
        id: 'm_roller',
        name: 'The Rollercoaster',
        years: 3,
        gold: 1,
        silver: 0,
        bronze: 0,
        spoon: 1,
        cup_gold: 0,
        cup_silver: 0,
        supercup: 0,
        mundialito: 0,
        cartonato: 0,
        history: [
          { season: '2022/23', team: 'C', rank: 1, points: 65, achievements: [] }, // 1st place
          { season: '2023/24', team: 'C', rank: 12, points: 20, achievements: [] }, // 12th place
          { season: '2024/25', team: 'C', rank: 1, points: 64, achievements: [] } // 1st place
        ]
      };

      const rookieManager: Manager = {
        id: 'm_rookie',
        name: 'The Rookie',
        years: 1,
        gold: 0,
        silver: 0,
        bronze: 1,
        spoon: 0,
        cup_gold: 0,
        cup_silver: 0,
        supercup: 0,
        mundialito: 0,
        cartonato: 0,
        history: [
          { season: '2025/26', team: 'K', rank: 3, points: 53, achievements: [] }
        ]
      };

      const balancedManager: Manager = {
        id: 'm_balanced',
        name: 'The Balanced',
        years: 4,
        gold: 0,
        silver: 1,
        bronze: 1,
        spoon: 0,
        cup_gold: 0,
        cup_silver: 0,
        supercup: 0,
        mundialito: 0,
        cartonato: 0,
        history: [
          { season: '2021/22', team: 'B', rank: 2, points: 60, achievements: [] },
          { season: '2022/23', team: 'B', rank: 6, points: 45, achievements: [] },
          { season: '2023/24', team: 'B', rank: 3, points: 55, achievements: [] },
          { season: '2024/25', team: 'B', rank: 7, points: 40, achievements: [] }
        ]
      };

      const metrics = computeManagerTrajectoryMetrics([
        rockManager,
        rollercoasterManager,
        balancedManager,
        rookieManager
      ]);

      const rock = metrics.find(m => m.id === 'm_rock')!;
      expect(rock.volatilityCategory).toBe('metronomo');
      expect(rock.volatilityLabel).toBe('Metronomo');
      expect(rock.stdDevRank).toBeLessThan(2.0);

      const bal = metrics.find(m => m.id === 'm_balanced')!;
      expect(bal.volatilityCategory).toBe('equilibrato');
      expect(bal.volatilityLabel).toBe('Equilibrato');
      expect(bal.stdDevRank).toBeGreaterThanOrEqual(2.0);
      expect(bal.stdDevRank).toBeLessThanOrEqual(3.5);

      const roller = metrics.find(m => m.id === 'm_roller')!;
      expect(roller.volatilityCategory).toBe('altalenante');
      expect(roller.volatilityLabel).toBe('Altalenante');
      expect(roller.stdDevRank).toBeGreaterThan(3.5);

      const rookie = metrics.find(m => m.id === 'm_rookie')!;
      expect(rookie.volatilityCategory).toBe('esordiente');
      expect(rookie.volatilityLabel).toContain('Esordiente');
      expect(rookie.stdDevRank).toBe(0);
      expect(rookie.isActive).toBe(true);
    });

    it('correctly calculates consecutive podium and safety streaks', () => {
      const streakManager: Manager = {
        id: 'm_streak',
        name: 'Streaker',
        years: 5,
        gold: 2,
        silver: 1,
        bronze: 0,
        spoon: 0,
        cup_gold: 0,
        cup_silver: 0,
        supercup: 0,
        mundialito: 0,
        cartonato: 0,
        history: [
          { season: '2020/21', team: 'S', rank: 1, points: 60, achievements: [] }, // Podium 1
          { season: '2021/22', team: 'S', rank: 2, points: 58, achievements: [] }, // Podium 2
          { season: '2022/23', team: 'S', rank: 1, points: 62, achievements: [] }, // Podium 3
          { season: '2023/24', team: 'S', rank: 6, points: 45, achievements: [] }, // Safe, not podium
          { season: '2024/25', team: 'S', rank: 2, points: 56, achievements: [] }  // Podium 1
        ]
      };

      const metrics = computeManagerTrajectoryMetrics([streakManager]);
      const res = metrics[0];

      expect(res.maxPodiumStreak).toBe(3);
      expect(res.currentPodiumStreak).toBe(1);
      expect(res.maxSafetyStreak).toBe(5);
      expect(res.currentSafetyStreak).toBe(5);
      expect(res.totalPodiums).toBe(4);
      expect(res.totalSpoons).toBe(0);
    });

    it('excludes in-progress seasons from trajectory stats, podiums, spoons, and streaks', () => {
      const managerWithActiveSeason: Manager = {
        id: 'm_active',
        name: 'Veteran In Progress',
        years: 4,
        gold: 1,
        silver: 0,
        bronze: 0,
        spoon: 0,
        cup_gold: 0,
        cup_silver: 0,
        supercup: 0,
        mundialito: 0,
        cartonato: 0,
        history: [
          { season: '2023/24', team: 'V', rank: 4, points: 50, achievements: [] },
          { season: '2024/25', team: 'V', rank: 5, points: 48, achievements: [] },
          // 2026/27 is currently in progress: rank 1 must NOT grant premature podium!
          { season: '2026/27', team: 'V', rank: 1, points: 6, achievements: [], in_progress: true }
        ]
      };

      const metrics = computeManagerTrajectoryMetrics([managerWithActiveSeason]);
      expect(metrics).toHaveLength(1);
      const res = metrics[0];

      // Only the 2 completed seasons must be evaluated
      expect(res.seasonsPlayed).toBe(2);
      expect(res.isRookieInProgress).toBe(false);
      expect(res.avgRank).toBe(4.5); // (4 + 5) / 2 = 4.5, rank 1 ignored
      expect(res.bestRank).toBe(4);
      expect(res.worstRank).toBe(5);
      expect(res.totalPodiums).toBe(0); // In-progress rank 1 must not count as podium
      expect(res.totalSpoons).toBe(0);
      expect(res.maxPodiumStreak).toBe(0);
      expect(res.currentPodiumStreak).toBe(0);
      expect(res.tierDistribution.podiumCount).toBe(0);
    });

    it('correctly initializes rookie managers active only in the current in-progress season with neutral metrics and isRookieInProgress', () => {
      const rookieManager: Manager = {
        id: 'm_zatte',
        name: 'Zatte',
        years: 1,
        gold: 0,
        silver: 0,
        bronze: 0,
        spoon: 0,
        cup_gold: 0,
        cup_silver: 0,
        supercup: 0,
        mundialito: 0,
        cartonato: 0,
        history: [
          { season: '2026/27', team: 'AS Qualo', rank: 13, points: 0, achievements: [], in_progress: true }
        ]
      };

      const competitions: CompetitionRecord[] = [
        {
          id: 863632,
          name: 'Serie Atlas 2026-2027',
          season: '2026/27',
          category: 'Campionato',
          in_progress: true,
          status: 'in_progress',
          ranking: [
            { rank: 13, teamName: 'AS Qualo', coach: 'Zatte', managerId: 'm_zatte', points: 0 }
          ]
        }
      ];

      const metrics = computeManagerTrajectoryMetrics([rookieManager], competitions);
      expect(metrics).toHaveLength(1);
      const res = metrics[0];

      expect(res.seasonsPlayed).toBe(0);
      expect(res.isRookieInProgress).toBe(true);
      expect(res.isActive).toBe(true);
      expect(res.avgRank).toBe(0);
      expect(res.bestRank).toBeNull();
      expect(res.worstRank).toBeNull();
      expect(res.totalPodiums).toBe(0);
      expect(res.totalSpoons).toBe(0); // In-progress rank 13 must not count as wooden spoon
      expect(res.volatilityCategory).toBe('esordiente');
      expect(res.volatilityLabel).toBe('Debuttante');
      expect(res.volatilityIcon).toBe('🌱');
      expect(res.tierDistribution.baricenterScore).toBe(0);
      expect(res.tierDistribution.baricenterLabel).toBe('Debuttante');
      expect(res.tierDistribution.podiumCount).toBe(0);
      expect(res.tierDistribution.riskCount).toBe(0);
    });

    it('accurately distributes performance across 4 dynamic tiers and weights for 8, 10, and 12-team leagues', () => {
      const eliteManager: Manager = {
        id: 'm_elite',
        name: 'The Elite',
        years: 3,
        gold: 2,
        silver: 1,
        bronze: 0,
        spoon: 0,
        cup_gold: 0,
        cup_silver: 0,
        supercup: 0,
        mundialito: 0,
        cartonato: 0,
        history: [
          { season: '2016/17', team: 'E', rank: 2, points: 55, achievements: [] }, // 8-team: Vertice (peso 4)
          { season: '2018/19', team: 'E', rank: 3, points: 52, achievements: [] }, // 10-team: Vertice (peso 4)
          { season: '2024/25', team: 'E', rank: 1, points: 65, achievements: [] }  // 12-team: Vertice (peso 4)
        ]
      };

      const highMidManager: Manager = {
        id: 'm_high_mid',
        name: 'High Mid',
        years: 3,
        gold: 0,
        silver: 0,
        bronze: 0,
        spoon: 0,
        cup_gold: 0,
        cup_silver: 0,
        supercup: 0,
        mundialito: 0,
        cartonato: 0,
        history: [
          { season: '2017/18', team: 'H', rank: 4, points: 45, achievements: [] },  // 8-team: Alta (rank 4, peso 3)
          { season: '2019/20', team: 'H', rank: 5, points: 43, achievements: [] },  // 10-team: Alta (rank 5, peso 3)
          { season: '2023/24', team: 'H', rank: 6, points: 44, achievements: [] }   // 12-team: Alta (rank 6, peso 3)
        ]
      };

      const riskManager: Manager = {
        id: 'm_risk',
        name: 'At Risk',
        years: 3,
        gold: 0,
        silver: 0,
        bronze: 0,
        spoon: 2,
        cup_gold: 0,
        cup_silver: 0,
        supercup: 0,
        mundialito: 0,
        cartonato: 0,
        history: [
          { season: '2016/17', team: 'R', rank: 7, points: 25, achievements: [] },  // 8-team: Rischio (penultimo, peso 1)
          { season: '2018/19', team: 'R', rank: 9, points: 22, achievements: [] },  // 10-team: Rischio (penultimo, peso 1)
          { season: '2024/25', team: 'R', rank: 12, points: 20, achievements: [] }  // 12-team: Rischio (ultimo, peso 1)
        ]
      };

      const metrics = computeManagerTrajectoryMetrics([eliteManager, highMidManager, riskManager]);

      const elite = metrics.find(m => m.id === 'm_elite')!;
      expect(elite.tierDistribution.podiumCount).toBe(3);
      expect(elite.tierDistribution.baricenterScore).toBe(4.0);
      expect(elite.tierDistribution.baricenterLabel).toBe('Élite Vertice');

      const highMid = metrics.find(m => m.id === 'm_high_mid')!;
      expect(highMid.tierDistribution.highCount).toBe(3);
      expect(highMid.tierDistribution.baricenterScore).toBe(3.0);
      expect(highMid.tierDistribution.baricenterLabel).toBe('Alta Classifica');

      const risk = metrics.find(m => m.id === 'm_risk')!;
      expect(risk.tierDistribution.riskCount).toBe(3);
      expect(risk.tierDistribution.baricenterScore).toBe(1.0);
      expect(risk.tierDistribution.baricenterLabel).toBe('Zona Rischio');
    });
  });

  describe('computeSeasonalParityMetrics', () => {
    it('computes Total Gap (1°-ultimo), Compactness Score (0-100), Podium Gap and Spoon Gap correctly', () => {
      const mockComps: CompetitionRecord[] = [
        {
          id: 101,
          name: 'Serie Atlas 2024-2025',
          season: '2024/25',
          category: 'Campionato',
          ranking: [
            { rank: 1, teamName: 'Champ', coach: 'Coach 1', points: 60 },
            { rank: 2, teamName: 'Silver', coach: 'Coach 2', points: 59 },
            { rank: 3, teamName: 'Bronze', coach: 'Coach 3', points: 59 }, // Podium gap = 60 - 59 = 1 pt!
            { rank: 11, teamName: 'Safe', coach: 'Coach 11', points: 35 },
            { rank: 12, teamName: 'Spoon', coach: 'Coach 12', points: 28 } // Spoon gap = 35 - 28 = 7 pt!
          ]
        },
        {
          id: 102,
          name: 'Serie Atlas 2023-2024',
          season: '2023/24',
          category: 'Campionato',
          ranking: [
            { rank: 1, teamName: 'Champ2', coach: 'Coach A', points: 68 },
            { rank: 2, teamName: 'Silver2', coach: 'Coach B', points: 58 },
            { rank: 3, teamName: 'Bronze2', coach: 'Coach C', points: 52 }, // Podium gap = 68 - 52 = 16 pt!
            { rank: 11, teamName: 'Safe2', coach: 'Coach Y', points: 30 },
            { rank: 12, teamName: 'Spoon2', coach: 'Coach Z', points: 29 } // Spoon gap = 30 - 29 = 1 pt (Thriller)!
          ]
        }
      ];

      const res = computeSeasonalParityMetrics(mockComps);
      expect(res).toHaveLength(2);

      const s24 = res.find(s => s.season === '2024/25')!;
      expect(s24.totalGap).toBe(32); // 60 - 28
      expect(s24.stepGap).toBe(8); // 32 / (5 - 1)
      expect(s24.podiumGap).toBe(1);
      expect(s24.podiumBadge).toContain('Volata a Tre');
      expect(s24.spoonGap).toBe(7);

      const s23 = res.find(s => s.season === '2023/24')!;
      expect(s23.totalGap).toBe(39); // 68 - 29
      expect(s23.stepGap).toBe(9.75); // 39 / (5 - 1)
      expect(s23.podiumGap).toBe(16);
      expect(s23.podiumBadge).toContain('Podio Sgranato');
      expect(s23.spoonGap).toBe(1);
      expect(s23.spoonBadge).toContain('Playout Thriller');
    });

    it('normalizes season compactness by step gap (pt per position) across 8, 10, and 12-team formats', () => {
      // 2022/23: 12 teams, delta = 21 -> stepGap = 21 / 11 = 1.91
      // 2018/19: 10 teams, delta = 20 -> stepGap = 20 / 9 = 2.22
      const comps: CompetitionRecord[] = [
        {
          id: 1,
          name: 'Serie Atlas 2022-2023',
          season: '2022/23',
          category: 'Campionato',
          ranking: Array.from({ length: 12 }, (_, i) => ({
            rank: i + 1,
            teamName: `Team ${i + 1}`,
            coach: `Coach ${i + 1}`,
            points: 68 - Math.round(i * (21 / 11))
          }))
        },
        {
          id: 2,
          name: 'Serie Atlas 2018-2019',
          season: '2018/19',
          category: 'Campionato',
          ranking: Array.from({ length: 10 }, (_, i) => ({
            rank: i + 1,
            teamName: `Team ${i + 1}`,
            coach: `Coach ${i + 1}`,
            points: 60 - Math.round(i * (20 / 9))
          }))
        }
      ];

      comps[0].ranking[0].points = 68;
      comps[0].ranking[11].points = 47; // delta = 21, stepGap = 21 / 11 = 1.91
      comps[1].ranking[0].points = 60;
      comps[1].ranking[9].points = 40;  // delta = 20, stepGap = 20 / 9 = 2.22

      const res = computeSeasonalParityMetrics(comps);
      const s22 = res.find(s => s.season === '2022/23')!;
      const s18 = res.find(s => s.season === '2018/19')!;

      expect(s22.stepGap).toBe(1.91);
      expect(s18.stepGap).toBe(2.22);
      expect(s22.compactnessScore).toBe(100);
      expect(s18.compactnessScore).toBe(0);
    });

    it('handles unrecorded points (e.g. 2020/21) gracefully without throwing', () => {
      const mockComps: CompetitionRecord[] = [
        {
          id: 201,
          name: 'Serie Atlas 2020-2021',
          season: '2020/21',
          category: 'Campionato',
          ranking: [
            { rank: 1, teamName: 'A', coach: 'A', points: null },
            { rank: 2, teamName: 'B', coach: 'B', points: null },
            { rank: 12, teamName: 'Z', coach: 'Z', points: null }
          ]
        }
      ];

      const res = computeSeasonalParityMetrics(mockComps);
      expect(res).toHaveLength(1);
      expect(res[0].hasPointsData).toBe(false);
      expect(res[0].compactnessScore).toBeNull();
      expect(res[0].totalGap).toBeNull();
      expect(res[0].podiumGap).toBeNull();
      expect(res[0].podiumBadge).toBe('N/D');
    });

    it('resolves champion and wooden spoon manager display names instead of usernames', () => {
      const mockComps: CompetitionRecord[] = [
        {
          id: 501,
          name: 'Serie Atlas 2021-2022',
          season: '2021/22',
          category: 'Campionato',
          ranking: [
            { rank: 1, teamName: 'Sarviette FC', coach: 'petrubik88', managerId: 'm_peterdani', points: 62 },
            { rank: 12, teamName: 'Makako Antwerpen', coach: 'miles92', managerId: 'm_makako', points: 24 }
          ]
        }
      ];

      const mockManagers: Manager[] = [
        {
          id: 'm_peterdani',
          name: 'Peter&Dani',
          years: 7,
          gold: 1,
          silver: 1,
          bronze: 0,
          spoon: 0,
          cup_gold: 2,
          cup_silver: 0,
          supercup: 1,
          mundialito: 0,
          cartonato: 0,
          history: []
        },
        {
          id: 'm_makako',
          name: 'Makako',
          years: 6,
          gold: 1,
          silver: 0,
          bronze: 0,
          spoon: 1,
          cup_gold: 0,
          cup_silver: 0,
          supercup: 0,
          mundialito: 0,
          cartonato: 0,
          history: []
        }
      ];

      const res = computeSeasonalParityMetrics(mockComps, mockManagers);
      expect(res[0].championName).toBe('Peter&Dani');
      expect(res[0].spoonName).toBe('Makako');
    });

    it('strictly filters out in-progress championships from seasonal parity analysis', () => {
      const mixedComps: CompetitionRecord[] = [
        {
          id: 101,
          name: 'Serie Atlas 2024-2025',
          season: '2024/25',
          category: 'Campionato',
          status: 'completed',
          ranking: [
            { rank: 1, teamName: 'A', coach: 'Coach A', points: 65 },
            { rank: 12, teamName: 'Z', coach: 'Coach Z', points: 30 }
          ]
        },
        {
          id: 102,
          name: 'Serie Atlas 2026-2027',
          season: '2026/27',
          category: 'Campionato',
          in_progress: true,
          status: 'in_progress',
          ranking: [
            { rank: 1, teamName: 'Early Leader', coach: 'Coach EL', points: 6 },
            { rank: 14, teamName: 'Temporary Last', coach: 'Coach TL', points: 0 }
          ]
        }
      ];

      const res = computeSeasonalParityMetrics(mixedComps);
      expect(res).toHaveLength(1);
      expect(res[0].season).toBe('2024/25');
      expect(res.find(s => s.season === '2026/27')).toBeUndefined();
    });
  });

  describe('renderAnalyticsModalDOM Tab 4 integration', () => {
    let originalDocument: unknown;
    let mockContainer: { innerHTML: string };

    beforeEach(() => {
      originalDocument = (globalThis as unknown as { document?: unknown }).document;
      mockContainer = { innerHTML: '' };
      (globalThis as unknown as { document?: unknown }).document = {
        getElementById(id: string) {
          if (id === 'concentration-modal-content') return mockContainer;
          return null;
        }
      };

      state.managers = [
        {
          id: 'm_alfo',
          name: 'Alfo',
          years: 10,
          gold: 1,
          silver: 3,
          bronze: 2,
          spoon: 0,
          cup_gold: 3,
          cup_silver: 0,
          supercup: 3,
          mundialito: 2,
          cartonato: 0,
          history: [
            { season: '2025/26', team: 'Steven Bradbury FC', rank: 1, points: 62, achievements: [] },
            { season: '2024/25', team: 'Steven Bradbury FC', rank: 1, points: 62, achievements: [] },
            { season: '2023/24', team: 'Steven Bradbury FC', rank: 2, points: 58, achievements: [] }
          ]
        },
        {
          id: 'm_pippo',
          name: 'Pippo',
          years: 7,
          gold: 0,
          silver: 0,
          bronze: 0,
          spoon: 3,
          cup_gold: 0,
          cup_silver: 0,
          supercup: 0,
          mundialito: 0,
          cartonato: 0,
          history: [
            { season: '2025/26', team: 'Partizan Peroni', rank: 12, points: 24, achievements: [] }
          ]
        }
      ];

      state.competitions = [
        {
          id: 778165,
          name: 'Serie Atlas 2025-2026',
          season: '2025/26',
          category: 'Campionato',
          ranking: [
            { rank: 1, teamName: 'Steven Bradbury FC', coach: 'alfius91', managerId: 'm_alfo', points: 62 },
            { rank: 12, teamName: 'Partizan Peroni', coach: 'Paiden', managerId: 'm_pippo', points: 24 }
          ]
        }
      ];
    });

    afterEach(() => {
      (globalThis as unknown as { document?: unknown }).document = originalDocument;
    });

    it('renders Chronology tab with managers sub-view, filter pills, interactive headers, and scrollbar container', () => {
      renderAnalyticsModalDOM(
        'chronology',
        'prestige',
        'podiumRate',
        'desc',
        'managers',
        'avg_rank',
        'asc',
        'season',
        'desc',
        'all'
      );

      expect(mockContainer.innerHTML).toContain('Dinamica Storica');
      expect(mockContainer.innerHTML).toContain('Prospettiva Manager');
      expect(mockContainer.innerHTML).toContain('Evoluzione Stagioni');
      expect(mockContainer.innerHTML).toContain('Tutti (2)');
      expect(mockContainer.innerHTML).toContain('Veterani (≥ 3 st.)');
      expect(mockContainer.innerHTML).toContain('Piazzamento &amp; Fasce');
      expect(mockContainer.innerHTML).toContain('Baricentro');
      expect(mockContainer.innerHTML).toContain('Stabilità');
      expect(mockContainer.innerHTML).toContain('Podi &amp; Cucchiai');
      expect(mockContainer.innerHTML).toContain('Alfo');
      // Scrollbar container presence
      expect(mockContainer.innerHTML).toContain('overflow-y-auto');
      expect(mockContainer.innerHTML).toContain('scrollbar-width: thin');
    });

    it('renders Chronology tab with seasons sub-view, total gap, manager names in verdicts, and scrollbar container', () => {
      renderAnalyticsModalDOM(
        'chronology',
        'prestige',
        'podiumRate',
        'desc',
        'seasons',
        'avg_rank',
        'asc',
        'season',
        'desc',
        'all'
      );

      expect(mockContainer.innerHTML).toContain('Dinamica Storica');
      expect(mockContainer.innerHTML).toContain('Gradino Medio');
      expect(mockContainer.innerHTML).toContain('Forbice tot.');
      expect(mockContainer.innerHTML).toContain('Compattezza');
      expect(mockContainer.innerHTML).toContain('Volata Podio');
      expect(mockContainer.innerHTML).toContain('2025/26');
      // Manager real names in key verdicts (not usernames)
      expect(mockContainer.innerHTML).toContain('🥇 Alfo');
      expect(mockContainer.innerHTML).toContain('🥄 Pippo');
      expect(mockContainer.innerHTML).not.toContain('🥇 alfius91');
      // Dynamic methodology notes (Bug B4: changes dynamically when data changes)
      expect(mockContainer.innerHTML).toContain('Record Storico di Compattezza');
      expect(mockContainer.innerHTML).toContain('La stagione <strong>2025/26</strong>');
      expect(mockContainer.innerHTML).not.toContain('2022/23');
      // Scrollbar container presence
      expect(mockContainer.innerHTML).toContain('overflow-y-auto');
      expect(mockContainer.innerHTML).toContain('scrollbar-width: thin');
    });

    it('renders responsive tab navigation bar without mobile scrolling', () => {
      renderAnalyticsModalDOM(
        'macro',
        'prestige',
        'podiumRate',
        'desc',
        'managers',
        'avg_rank',
        'asc',
        'season',
        'desc',
        'all'
      );

      // 4-column responsive grid (Palmarès concentration tabs)
      expect(mockContainer.innerHTML).toContain('grid grid-cols-4 sm:flex');
      // Mobile short labels
      expect(mockContainer.innerHTML).toContain('<span class="sm:hidden">Equilibrio</span>');
      expect(mockContainer.innerHTML).toContain('<span class="sm:hidden">Cinismo</span>');
      expect(mockContainer.innerHTML).toContain('<span class="sm:hidden">Archetipi</span>');
      expect(mockContainer.innerHTML).toContain('<span class="sm:hidden">Storico</span>');
      // Desktop full labels
      expect(mockContainer.innerHTML).toContain('<span class="hidden sm:inline">Equilibrio & Macro</span>');
      expect(mockContainer.innerHTML).toContain('<span class="hidden sm:inline">Cinismo & Podi</span>');
      expect(mockContainer.innerHTML).toContain('<span class="hidden sm:inline">Archetipi</span>');
      expect(mockContainer.innerHTML).toContain('<span class="hidden sm:inline">Dinamica Storica</span>');
    });
  });
});
