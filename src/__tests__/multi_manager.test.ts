import { describe, it, expect } from 'vitest';
import {
  computeMultiManagerAnalysis,
  computeManagerAxes,
  MULTI_MANAGER_PALETTE
} from '@/analytics/multiManager';
import {
  RADAR_CANONICAL_AXES,
  computeSingleManagerRadarAxes,
  computeH2HAxes,
  H2H_CONTENDER_A_COLOR,
  H2H_CONTENDER_B_COLOR
} from '@/analytics/radarAxes';
import type { Manager } from '@/types';
import { createTestManager } from './test-utils';

describe('Unified Radar Axes & Multi-Manager Analytics Engine', () => {
  describe('radarAxes constants and unified functions', () => {
    it('defines exactly 6 canonical radar axes with complete metadata', () => {
      expect(RADAR_CANONICAL_AXES).toHaveLength(6);
      const keys = RADAR_CANONICAL_AXES.map(a => a.key);
      expect(keys).toEqual(['prestige', 'gci', 'ki', 'cr', 'stability', 'nti']);
      RADAR_CANONICAL_AXES.forEach(axis => {
        expect(axis.label).toBeTruthy();
        expect(axis.shortTitle).toBeTruthy();
        expect(axis.acronym).toBeTruthy();
        expect(axis.description).toBeTruthy();
      });
    });

    it('defines multi-manager palette and contender colors', () => {
      expect(MULTI_MANAGER_PALETTE).toHaveLength(6);
      expect(MULTI_MANAGER_PALETTE[0]).toBe(H2H_CONTENDER_A_COLOR);
      expect(MULTI_MANAGER_PALETTE[1]).toBe(H2H_CONTENDER_B_COLOR);
    });

    it('computes single manager radar axes matching canonical definitions', () => {
      const testManager = createTestManager({ id: 'mT', name: 'Tester', gold: 2, years: 4 });
      const axes = computeSingleManagerRadarAxes(testManager, 40);
      expect(axes).toHaveLength(6);
      expect(axes.map(a => a.key)).toEqual(RADAR_CANONICAL_AXES.map(a => a.key));
      axes.forEach(axis => {
        expect(axis.val).toBeGreaterThanOrEqual(0);
        expect(axis.val).toBeLessThanOrEqual(100);
      });
    });

    it('computes paired 6-axis data using computeH2HAxes', () => {
      const mockStats: any = {
        metricsA: { score: 35, gci: 75, clutchLabel: 'Cinico', kiPct: 50, crPct: 60, nti: 0.2, polarityLabel: 'Positivo', stabilityCategory: 'Top', stdDevRank: 1.5 },
        metricsB: { score: 25, gci: 45, clutchLabel: 'Incerto', kiPct: 20, crPct: 30, nti: -0.1, polarityLabel: 'Neutro', stabilityCategory: 'Medio', stdDevRank: 2.5 }
      };
      const paired = computeH2HAxes(mockStats, 40);
      expect(paired).toHaveLength(6);
      expect(paired.map(p => p.key)).toEqual(RADAR_CANONICAL_AXES.map(a => a.key));
      paired.forEach(p => {
        expect(p.valA).toBeGreaterThanOrEqual(0);
        expect(p.valA).toBeLessThanOrEqual(100);
        expect(p.valB).toBeGreaterThanOrEqual(0);
        expect(p.valB).toBeLessThanOrEqual(100);
      });
    });
  });
  const managerA: Manager = createTestManager({
    id: 'mA',
    name: 'Cannibale',
    gold: 3,
    silver: 2,
    bronze: 1,
    cup_gold: 2,
    cup_silver: 1,
    supercup: 1,
    years: 5,
    history: [
      { season: '2020/21', team: 'A', rank: 1, points: 75, achievements: [] },
      { season: '2021/22', team: 'A', rank: 2, points: 68, achievements: [] },
      { season: '2022/23', team: 'A', rank: 1, points: 72, achievements: [] },
      { season: '2023/24', team: 'A', rank: 3, points: 60, achievements: [] },
      { season: '2024/25', team: 'A', rank: 1, points: 78, achievements: [] }
    ]
  });

  const managerB: Manager = createTestManager({
    id: 'mB',
    name: 'Piazzato',
    gold: 0,
    silver: 4,
    bronze: 2,
    cup_gold: 0,
    cup_silver: 3,
    supercup: 0,
    years: 5,
    history: [
      { season: '2020/21', team: 'B', rank: 2, points: 70, achievements: [] },
      { season: '2021/22', team: 'B', rank: 3, points: 64, achievements: [] },
      { season: '2022/23', team: 'B', rank: 2, points: 66, achievements: [] },
      { season: '2023/24', team: 'B', rank: 2, points: 62, achievements: [] },
      { season: '2024/25', team: 'B', rank: 4, points: 58, achievements: [] }
    ]
  });

  const managerC: Manager = createTestManager({
    id: 'mC',
    name: 'Coppiere',
    gold: 1,
    silver: 0,
    bronze: 0,
    cup_gold: 3,
    cup_silver: 0,
    supercup: 2,
    years: 5,
    history: [
      { season: '2020/21', team: 'C', rank: 6, points: 48, achievements: [] },
      { season: '2021/22', team: 'C', rank: 1, points: 70, achievements: [] },
      { season: '2022/23', team: 'C', rank: 7, points: 45, achievements: [] },
      { season: '2023/24', team: 'C', rank: 1, points: 65, achievements: [] },
      { season: '2024/25', team: 'C', rank: 8, points: 42, achievements: [] }
    ]
  });

  const managerD: Manager = createTestManager({
    id: 'mD',
    name: 'Debuttante',
    gold: 0,
    silver: 0,
    bronze: 1,
    years: 2,
    history: [
      { season: '2023/24', team: 'D', rank: 5, points: 54, achievements: [] },
      { season: '2024/25', team: 'D', rank: 3, points: 62, achievements: [] }
    ]
  });

  describe('computeManagerAxes', () => {
    it('computes 6 normalized dimensions (0..100) for a manager', () => {
      const data = computeManagerAxes(managerA, 40, MULTI_MANAGER_PALETTE[0]);
      expect(data.axes).toHaveLength(6);

      const keys = data.axes.map(a => a.key);
      expect(keys).toEqual(['prestige', 'gci', 'ki', 'cr', 'stability', 'nti']);

      data.axes.forEach(axis => {
        expect(axis.val).toBeGreaterThanOrEqual(0);
        expect(axis.val).toBeLessThanOrEqual(100);
        expect(axis.raw).toBeDefined();
      });

      // Manager A has 3 gold out of 6 podiums (50% KI)
      const ki = data.axes.find(a => a.key === 'ki');
      expect(ki?.val).toBe(50);
      expect(ki?.raw).toBe('50%');

      // Manager A has 3 finals won out of 4 (75% CR)
      const cr = data.axes.find(a => a.key === 'cr');
      expect(cr?.val).toBe(75);
      expect(cr?.raw).toBe('75%');
    });
  });

  describe('computeMultiManagerAnalysis', () => {
    it('handles empty or single manager gracefully', () => {
      const empty = computeMultiManagerAnalysis([]);
      expect(empty.managers).toEqual([]);
      expect(empty.miniTournament).toEqual([]);
      expect(empty.sharedSeasonsAcrossAll).toEqual([]);
    });

    it('computes round-robin mini tournament accurately among 3 managers', () => {
      const analysis = computeMultiManagerAnalysis([managerA, managerB, managerC]);

      expect(analysis.managers).toHaveLength(3);
      expect(analysis.miniTournament).toHaveLength(3);

      // Verify colors assigned from palette
      expect(analysis.managers[0].color).toBe(MULTI_MANAGER_PALETTE[0]);
      expect(analysis.managers[1].color).toBe(MULTI_MANAGER_PALETTE[1]);
      expect(analysis.managers[2].color).toBe(MULTI_MANAGER_PALETTE[2]);

      // All 3 shared 5 seasons: 2020/21, 2021/22, 2022/23, 2023/24, 2024/25
      expect(analysis.sharedSeasonsAcrossAll).toEqual([
        '2024/25',
        '2023/24',
        '2022/23',
        '2021/22',
        '2020/21'
      ]);

      // Each manager played 2 opponents across 5 seasons = 10 direct head-to-head match comparisons
      analysis.miniTournament.forEach(entry => {
        expect(entry.matches).toBe(10);
        expect(entry.wins + entry.ties + entry.losses).toBe(10);
        expect(entry.points).toBe(entry.wins * 3 + entry.ties * 1);
        expect(entry.winRate).toBeGreaterThanOrEqual(0);
        expect(entry.winRate).toBeLessThanOrEqual(100);
      });

      // Manager A ranks consistently high (1, 2, 1, 3, 1), should lead the mini-tournament
      const topLeader = analysis.miniTournament[0];
      expect(topLeader.managerId).toBe('mA');
      expect(topLeader.wins).toBeGreaterThan(topLeader.losses);
    });

    it('identifies shared seasons intersection correctly when managers have different tenures in simultaneous mode', () => {
      const simAnalysis = computeMultiManagerAnalysis([managerA, managerB, managerD], 'simultaneous');
      // Manager D only played 2023/24 and 2024/25
      expect(simAnalysis.sharedSeasonsAcrossAll).toEqual(['2024/25', '2023/24']);
      expect(simAnalysis.tournamentMode).toBe('simultaneous');
      simAnalysis.miniTournament.forEach(entry => {
        expect(entry.matches).toBe(4);
      });
    });

    it('evaluates all historical pairwise duels and computes normalized PPG in ppg mode', () => {
      const ppgAnalysis = computeMultiManagerAnalysis([managerA, managerB, managerD], 'ppg');
      expect(ppgAnalysis.tournamentMode).toBe('ppg');
      expect(ppgAnalysis.totalPairwiseSeasonsCount).toBe(5);
      expect(ppgAnalysis.sharedSeasonsAcrossAll).toEqual(['2024/25', '2023/24']);

      // Manager A and B played each other in 5 seasons + each played D in 2 seasons = 7 matches
      const entryA = ppgAnalysis.miniTournament.find(e => e.managerId === 'mA')!;
      const entryB = ppgAnalysis.miniTournament.find(e => e.managerId === 'mB')!;
      const entryD = ppgAnalysis.miniTournament.find(e => e.managerId === 'mD')!;

      expect(entryA.matches).toBe(7);
      expect(entryB.matches).toBe(7);
      expect(entryD.matches).toBe(4);

      // Verify PPG calculation
      expect(entryA.ppg).toBe(parseFloat((entryA.points / entryA.matches).toFixed(2)));
      expect(entryB.ppg).toBe(parseFloat((entryB.points / entryB.matches).toFixed(2)));
      expect(entryD.ppg).toBe(parseFloat((entryD.points / entryD.matches).toFixed(2)));

      // Mini-tournament in PPG mode is sorted by PPG descending
      for (let i = 0; i < ppgAnalysis.miniTournament.length - 1; i++) {
        expect(ppgAnalysis.miniTournament[i].ppg).toBeGreaterThanOrEqual(ppgAnalysis.miniTournament[i + 1].ppg);
      }
    });
  });
});
