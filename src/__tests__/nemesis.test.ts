import { describe, it, expect } from 'vitest';
import {
  computePairwiseDuel,
  computeManagerRivalries,
  computeNemesisMatrix,
  filterManagersForMatrix,
  getLatestSeason
} from '@/analytics/nemesis';
import type { Manager } from '@/types';
import { createTestManager } from './test-utils';

describe('Nemesis & Rivalry Analytics Engine', () => {
  describe('computePairwiseDuel', () => {
    it('accurately computes completed shared seasons and point differentials while ignoring in-progress', () => {
      const mA: Manager = createTestManager({
        id: 'mA',
        name: 'Manager A',
        history: [
          { season: '2022/23', team: 'A', rank: 1, points: 70, achievements: [] },
          { season: '2023/24', team: 'A', rank: 4, points: 52, achievements: [] },
          { season: '2024/25', team: 'A', rank: 2, points: 65, achievements: [] },
          { season: '2025/26', team: 'A', rank: 1, points: 25, achievements: [], in_progress: true }
        ]
      });

      const mB: Manager = createTestManager({
        id: 'mB',
        name: 'Manager B',
        history: [
          { season: '2021/22', team: 'B', rank: 1, points: 68, achievements: [] }, // B only
          { season: '2022/23', team: 'B', rank: 3, points: 58, achievements: [] }, // A wins: 1 vs 3 (+12 pt)
          { season: '2023/24', team: 'B', rank: 2, points: 60, achievements: [] }, // B wins: 4 vs 2 (-8 pt)
          { season: '2024/25', team: 'B', rank: 2, points: 65, achievements: [] }, // Tie: 2 vs 2 (0 pt)
          { season: '2025/26', team: 'B', rank: 5, points: 15, achievements: [], in_progress: true }
        ]
      });

      const duel = computePairwiseDuel(mA, mB);
      expect(duel.sharedSeasons).toBe(3);
      expect(duel.winsA).toBe(1);
      expect(duel.winsB).toBe(1);
      expect(duel.ties).toBe(1);
      expect(duel.pointsDiffA).toBe(4); // +12 - 8 + 0 = +4
    });
  });

  describe('computeManagerRivalries (Nemesis & Babbo Natale)', () => {
    it('accurately identifies Nemesis and Babbo Natale based on score formula and significance threshold', () => {
      // Focus on manager M
      const manager: Manager = createTestManager({
        id: 'm_hero',
        name: 'Hero',
        history: [
          { season: '2021/22', team: 'H', rank: 2, points: 65, achievements: [] },
          { season: '2022/23', team: 'H', rank: 4, points: 50, achievements: [] },
          { season: '2023/24', team: 'H', rank: 3, points: 55, achievements: [] },
          { season: '2024/25', team: 'H', rank: 1, points: 72, achievements: [] }
        ]
      });

      // Opponent 1: Nemesis (Hero loses 3 out of 3, heavy point deficit)
      const cryptonite: Manager = createTestManager({
        id: 'm_nemesis',
        name: 'Lucchetto',
        history: [
          { season: '2021/22', team: 'L', rank: 1, points: 70, achievements: [] }, // Hero 2 vs L 1 (-5 pt)
          { season: '2022/23', team: 'L', rank: 2, points: 62, achievements: [] }, // Hero 4 vs L 2 (-12 pt)
          { season: '2023/24', team: 'L', rank: 1, points: 68, achievements: [] }  // Hero 3 vs L 1 (-13 pt)
        ]
      });

      // Opponent 2: Victim / Babbo Natale (Hero wins 3 out of 3, heavy point advantage)
      const victim: Manager = createTestManager({
        id: 'm_victim',
        name: 'Peter&Dani',
        history: [
          { season: '2022/23', team: 'P', rank: 6, points: 40, achievements: [] }, // Hero 4 vs P 6 (+10 pt)
          { season: '2023/24', team: 'P', rank: 7, points: 42, achievements: [] }, // Hero 3 vs P 7 (+13 pt)
          { season: '2024/25', team: 'P', rank: 8, points: 38, achievements: [] }  // Hero 1 vs P 8 (+34 pt)
        ]
      });

      // Opponent 3: Only 1 shared season (must be ignored due to minSharedSeasons = 2)
      const oneHitWonder: Manager = createTestManager({
        id: 'm_onehit',
        name: 'Flash',
        history: [
          { season: '2024/25', team: 'F', rank: 10, points: 30, achievements: [] } // Hero 1 vs F 10 (+42 pt)
        ]
      });

      const rivalries = computeManagerRivalries(manager, [manager, cryptonite, victim, oneHitWonder], 2);

      // Bestia Nera (Nemesis)
      expect(rivalries.nemesis).not.toBeNull();
      expect(rivalries.nemesis?.opponent.id).toBe('m_nemesis');
      expect(rivalries.nemesis?.losses).toBe(3);
      expect(rivalries.nemesis?.wins).toBe(0);
      expect(rivalries.nemesis?.pointsDiff).toBe(-30);

      // Babbo Natale (Victim) - must pick Peter&Dani, NOT Flash because Flash only has 1 shared season
      expect(rivalries.victim).not.toBeNull();
      expect(rivalries.victim?.opponent.id).toBe('m_victim');
      expect(rivalries.victim?.wins).toBe(3);
      expect(rivalries.victim?.losses).toBe(0);
      expect(rivalries.victim?.pointsDiff).toBe(57); // +10 + 13 + 34

      // Biggest blowout (margin in single season: +34 vs Peter&Dani in 2024/25 or +42 vs Flash)
      // Flash had margin of 42 pt in 2024/25
      expect(rivalries.biggestBlowout).not.toBeNull();
      expect(rivalries.biggestBlowout?.opponent.id).toBe('m_onehit');
      expect(rivalries.biggestBlowout?.season).toBe('2024/25');
      expect(rivalries.biggestBlowout?.margin).toBe(42);

      // Title clashes (both in Top 3):
      // In 2021/22: Hero (2) vs Lucchetto (1) -> Top 3!
      // In 2023/24: Hero (3) vs Lucchetto (1) -> Top 3!
      expect(rivalries.titleClashesCount).toBe(2);
    });

    it('returns null nemesis and null victim when no opponent meets the significance threshold', () => {
      const rookie: Manager = createTestManager({
        id: 'm_rookie',
        name: 'Rookie',
        history: [
          { season: '2024/25', team: 'R', rank: 3, points: 55, achievements: [] }
        ]
      });

      const veteran: Manager = createTestManager({
        id: 'm_vet',
        name: 'Vet',
        history: [
          { season: '2024/25', team: 'V', rank: 1, points: 65, achievements: [] }
        ]
      });

      const rivalries = computeManagerRivalries(rookie, [rookie, veteran], 2);
      expect(rivalries.nemesis).toBeNull();
      expect(rivalries.victim).toBeNull();
    });
  });

  describe('Nemesis Matrix Cross-Table Generation', () => {
    it('generates a full matrix with reciprocal symmetry and correct status indicators', () => {
      const mA: Manager = createTestManager({
        id: 'mA',
        name: 'Alfo',
        years: 3,
        history: [
          { season: '2023/24', team: 'A', rank: 1, points: 65, achievements: [] },
          { season: '2024/25', team: 'A', rank: 2, points: 60, achievements: [] }
        ]
      });

      const mB: Manager = createTestManager({
        id: 'mB',
        name: 'Vannico',
        years: 3,
        history: [
          { season: '2023/24', team: 'B', rank: 3, points: 55, achievements: [] }, // A wins (1 vs 3)
          { season: '2024/25', team: 'B', rank: 4, points: 52, achievements: [] }  // A wins (2 vs 4)
        ]
      });

      const mC: Manager = createTestManager({
        id: 'mC',
        name: 'Isolated',
        years: 1,
        history: [
          { season: '2020/21', team: 'C', rank: 1, points: 70, achievements: [] }
        ]
      });

      const matrixData = computeNemesisMatrix([mA, mB, mC]);

      // Managers list preserved
      expect(matrixData.managers.length).toBe(3);

      // Diagonal check
      expect(matrixData.matrix['mA']['mA'].status).toBe('self');
      expect(matrixData.matrix['mB']['mB'].status).toBe('self');
      expect(matrixData.matrix['mC']['mC'].status).toBe('self');

      // A vs B: A has 2 wins, 0 ties, 0 losses -> positive
      const cellAB = matrixData.matrix['mA']['mB'];
      expect(cellAB.sharedSeasons).toBe(2);
      expect(cellAB.winsA).toBe(2);
      expect(cellAB.winsB).toBe(0);
      expect(cellAB.status).toBe('positive');

      // Reciprocal check: B vs A: B has 0 wins, 0 ties, 2 losses -> negative
      const cellBA = matrixData.matrix['mB']['mA'];
      expect(cellBA.sharedSeasons).toBe(2);
      expect(cellBA.winsA).toBe(0);
      expect(cellBA.winsB).toBe(2);
      expect(cellBA.status).toBe('negative');
      expect(cellBA.pointsDiffA).toBe(-cellAB.pointsDiffA);

      // A vs C: No shared seasons -> none
      const cellAC = matrixData.matrix['mA']['mC'];
      expect(cellAC.sharedSeasons).toBe(0);
      expect(cellAC.status).toBe('none');
    });

    it('correctly filters managers by all, veterans, and active', () => {
      const m1: Manager = createTestManager({
        id: 'm1',
        name: 'Active Vet',
        years: 5,
        history: [{ season: '2025/26', team: 'T1', rank: 1, points: 10, achievements: [] }]
      });

      const m2: Manager = createTestManager({
        id: 'm2',
        name: 'Past Vet',
        years: 4,
        history: [{ season: '2021/22', team: 'T2', rank: 1, points: 60, achievements: [] }]
      });

      const m3: Manager = createTestManager({
        id: 'm3',
        name: 'Rookie Active',
        years: 1,
        history: [{ season: '2025/26', team: 'T3', rank: 2, points: 8, achievements: [] }]
      });

      const all = [m1, m2, m3];
      const latest = getLatestSeason(all);
      expect(latest).toBe('2025/26');

      expect(filterManagersForMatrix(all, 'all').length).toBe(3);
      expect(filterManagersForMatrix(all, 'veterans').map(m => m.id)).toEqual(['m1', 'm2']);
      expect(filterManagersForMatrix(all, 'active', latest).map(m => m.id)).toEqual(['m1', 'm3']);
    });
  });

  describe('Nemesis UI & Integration', () => {
    it('disambiguates initials for colliding manager names like Vannico and Valery', async () => {
      const { computeDisambiguatedInitials } = await import('@/components/modals/h2h/NemesisMatrixView');
      const m1: Manager = createTestManager({ id: 'm1', name: 'Vannico' });
      const m2: Manager = createTestManager({ id: 'm2', name: 'Valery' });
      const m3: Manager = createTestManager({ id: 'm3', name: 'Peter&Dani' });

      const map = computeDisambiguatedInitials([m1, m2, m3]);
      expect(map.get('m3')).toBe('PD');
      // m1 and m2 collide on VA:
      expect(map.get('m1')).toBe('VN');
      expect(map.get('m2')).toBe('VL');
    });

    it('renders NemesisMatrixView HTML with sticky headers, color-matched Mister B badges, and clickable duel cells', async () => {
      const { renderNemesisMatrixView } = await import('@/components/modals/h2h/NemesisMatrixView');

      const mA: Manager = createTestManager({
        id: 'mA',
        name: 'Alfo',
        years: 3,
        history: [{ season: '2024/25', team: 'A', rank: 1, points: 65, achievements: [] }]
      });

      const mB: Manager = createTestManager({
        id: 'mB',
        name: 'Vannico',
        years: 3,
        history: [{ season: '2024/25', team: 'B', rank: 2, points: 60, achievements: [] }]
      });

      const html = renderNemesisMatrixView([mA, mB], 'all');

      expect(html).toContain('Matrice Nemesi');
      expect(html).toContain('Head-to-Head');
      expect(html).toContain('Attivi');
      expect(html).toContain('Veterani');
      expect(html).toContain('Tutti');
      expect(html).toContain('<table');
      expect(html).toContain('Mister A');
      expect(html).toContain('Mister B');
      expect(html).toContain('selectH2HDuel');
      expect(html).toContain('scrollbar-width: thin');
      expect(html).toContain('Saldo Favorevole');
      expect(html).toContain('Bestia Nera');
      // Mister B column header has color-matched styling and does NOT use rotated 45deg text
      expect(html).toContain('var(--accent-color)');
      expect(html).not.toContain('rotate(-45deg)');
    });

    it('populates profile modal with Bestia Nera and Babbo Natale buttons in PalmaresTab', async () => {
      const { populatePalmaresDOM } = await import('@/components/modals/profile/PalmaresTab');
      const { state } = await import('@/state');

      const hero: Manager = createTestManager({
        id: 'm_hero',
        name: 'Hero',
        history: [
          { season: '2023/24', team: 'H', rank: 3, points: 50, achievements: [] },
          { season: '2024/25', team: 'H', rank: 4, points: 48, achievements: [] }
        ]
      });

      const nemesis: Manager = createTestManager({
        id: 'm_nemesis',
        name: 'Lucchetto',
        history: [
          { season: '2023/24', team: 'L', rank: 1, points: 65, achievements: [] },
          { season: '2024/25', team: 'L', rank: 1, points: 68, achievements: [] }
        ]
      });

      state.managers = [hero, nemesis];

      const elements: Record<string, any> = {
        'profile-name': { textContent: '' },
        'profile-years-badge': { textContent: '' },
        'profile-score': { textContent: '' },
        'profile-success-rate': { textContent: '' },
        'profile-total-titles': { textContent: '' },
        'profile-badges-container': { innerHTML: '', appendChild: () => {} },
        'profile-rivalries-container': { innerHTML: '' },
        'profile-trophy-shelf': { innerHTML: '' }
      };

      (globalThis as any).document = {
        getElementById: (id: string) => elements[id] || null,
        createElement: () => ({ className: '', style: {}, innerHTML: '' })
      };

      populatePalmaresDOM(hero, 25, 2, 50);

      const rivalriesHTML = elements['profile-rivalries-container'].innerHTML;
      expect(rivalriesHTML).toContain('Bestia Nera');
      expect(rivalriesHTML).toContain('Lucchetto');
      expect(rivalriesHTML).toContain('0V - 0N - 2P');
      expect(rivalriesHTML).toContain('openH2HWithOpponent');
    });
  });
});
