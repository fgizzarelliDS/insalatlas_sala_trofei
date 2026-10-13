import { describe, it, expect, beforeEach } from 'vitest';
import { computeHeadToHead } from '@/analytics/headToHead';
import { getH2HParamFromURL, findManagerByParam } from '@/router';
import type { Manager } from '@/types';
import { createTestManager } from './test-utils';

describe('Head-to-Head (H2H) Engine & Router', () => {
  describe('computeHeadToHead', () => {
    it('accurately identifies shared seasons and assigns winners', () => {
      const managerA: Manager = createTestManager({
        id: 'm_alfo',
        name: 'Alfo',
        years: 3,
        gold: 1,
        history: [
          { season: '2022/23', team: 'A', rank: 2, points: 60, achievements: [] },
          { season: '2023/24', team: 'A', rank: 5, points: 45, achievements: [] },
          { season: '2024/25', team: 'A', rank: 1, points: 68, achievements: [] },
          { season: '2025/26', team: 'A', rank: 1, points: 20, achievements: [], in_progress: true }
        ]
      });

      const managerB: Manager = createTestManager({
        id: 'm_vannico',
        name: 'Vannico',
        years: 4,
        gold: 2,
        history: [
          { season: '2021/22', team: 'B', rank: 1, points: 70, achievements: [] }, // Only B
          { season: '2022/23', team: 'B', rank: 4, points: 52, achievements: [] }, // A ahead (2 vs 4) -> A wins
          { season: '2023/24', team: 'B', rank: 2, points: 58, achievements: [] }, // B ahead (5 vs 2) -> B wins
          { season: '2024/25', team: 'B', rank: 3, points: 55, achievements: [] }, // A ahead (1 vs 3) -> A wins
          { season: '2025/26', team: 'B', rank: 8, points: 10, achievements: [], in_progress: true } // in progress: ignored
        ]
      });

      const stats = computeHeadToHead(managerA, managerB);

      // 3 completed shared seasons (2022/23, 2023/24, 2024/25)
      expect(stats.sharedSeasonsCount).toBe(3);
      expect(stats.duels.length).toBe(3);

      // In-progress season 2025/26 should NOT be in duels
      expect(stats.duels.some(d => d.season === '2025/26')).toBe(false);

      // Wins A: 2022/23 (rank 2 vs 4) and 2024/25 (rank 1 vs 3)
      // Wins B: 2023/24 (rank 5 vs 2)
      expect(stats.winsA).toBe(2);
      expect(stats.winsB).toBe(1);
      expect(stats.ties).toBe(0);

      // Sorted chronologically (descending)
      expect(stats.duels[0].season).toBe('2024/25');
      expect(stats.duels[0].winner).toBe('A');
      expect(stats.duels[1].season).toBe('2023/24');
      expect(stats.duels[1].winner).toBe('B');
      expect(stats.duels[2].season).toBe('2022/23');
      expect(stats.duels[2].winner).toBe('A');

      // Narrative mentions Alfo leading
      expect(stats.narrativeVerdict).toContain('Alfo guida il bilancio');
    });

    it('correctly handles ties and equal duels', () => {
      const managerA: Manager = createTestManager({
        id: 'm1',
        name: 'Manager 1',
        years: 2,
        history: [
          { season: '2023/24', team: 'T1', rank: 3, points: 50, achievements: [] },
          { season: '2024/25', team: 'T1', rank: 4, points: 48, achievements: [] }
        ]
      });

      const managerB: Manager = createTestManager({
        id: 'm2',
        name: 'Manager 2',
        years: 2,
        history: [
          { season: '2023/24', team: 'T2', rank: 3, points: 50, achievements: [] }, // Tie (3 vs 3)
          { season: '2024/25', team: 'T2', rank: 2, points: 52, achievements: [] }  // B wins (4 vs 2)
        ]
      });

      const stats = computeHeadToHead(managerA, managerB);
      expect(stats.sharedSeasonsCount).toBe(2);
      expect(stats.winsA).toBe(0);
      expect(stats.winsB).toBe(1);
      expect(stats.ties).toBe(1);
      expect(stats.narrativeVerdict).toContain('Manager 2 comanda il testa a testa');
    });

    it('handles managers with zero shared seasons gracefully', () => {
      const managerA: Manager = createTestManager({
        id: 'veteran',
        name: 'Old Veteran',
        years: 2,
        history: [
          { season: '2016/17', team: 'A', rank: 1, points: 60, achievements: [] },
          { season: '2017/18', team: 'A', rank: 2, points: 55, achievements: [] }
        ]
      });

      const managerB: Manager = createTestManager({
        id: 'newbie',
        name: 'Newcomer',
        years: 1,
        history: [
          { season: '2024/25', team: 'B', rank: 5, points: 40, achievements: [] }
        ]
      });

      const stats = computeHeadToHead(managerA, managerB);
      expect(stats.sharedSeasonsCount).toBe(0);
      expect(stats.duels.length).toBe(0);
      expect(stats.winsA).toBe(0);
      expect(stats.winsB).toBe(0);
      expect(stats.ties).toBe(0);
      expect(stats.narrativeVerdict).toContain('Nessuna stagione disputata contemporaneamente');
    });

    it('computes correct palmares diff and econometric indicators for both managers', () => {
      const managerA: Manager = createTestManager({
        id: 'champA',
        name: 'Vannico',
        years: 9,
        gold: 3,
        silver: 1,
        bronze: 0,
        cup_gold: 2,
        supercup: 1,
        spoon: 0,
        cartonato: 1
      });

      const managerB: Manager = createTestManager({
        id: 'champB',
        name: 'Alfo',
        years: 9,
        gold: 1,
        silver: 3,
        bronze: 1,
        cup_gold: 1,
        supercup: 0,
        spoon: 1,
        cartonato: 0
      });

      const stats = computeHeadToHead(managerA, managerB);

      expect(stats.palmares.gold.a).toBe(3);
      expect(stats.palmares.gold.b).toBe(1);
      expect(stats.palmares.silver.a).toBe(1);
      expect(stats.palmares.silver.b).toBe(3);
      expect(stats.palmares.cupGold.a).toBe(2);
      expect(stats.palmares.cupGold.b).toBe(1);
      expect(stats.palmares.supercup.a).toBe(1);
      expect(stats.palmares.supercup.b).toBe(0);

      // Advanced metrics are populated
      expect(stats.metricsA.gci).toBeGreaterThan(0);
      expect(stats.metricsA.clutchLabel).toBeDefined();
      expect(stats.metricsA.clutchIcon).toBeDefined();
      expect(stats.metricsA.archetypeTag).toBeDefined();
      expect(stats.metricsA.polarityLabel).toBeDefined();

      expect(stats.metricsB.gci).toBeGreaterThan(0);
      expect(stats.metricsB.clutchLabel).toBeDefined();
    });
  });

  describe('getH2HParamFromURL', () => {
    beforeEach(() => {
      (globalThis as any).window = {
        location: {
          search: '',
          hash: ''
        }
      };
    });

    it('returns null when no h2h query param is present', () => {
      expect(getH2HParamFromURL()).toBeNull();
    });

    it('parses valid ?h2h=idA:idB parameter', () => {
      (globalThis as any).window.location.search = '?h2h=m_alfo:m_vannico';
      const param = getH2HParamFromURL();
      expect(param).not.toBeNull();
      expect(param?.managerA).toBe('m_alfo');
      expect(param?.managerB).toBe('m_vannico');
    });

    it('parses valid hash-based parameter', () => {
      (globalThis as any).window.location.hash = '#/route?h2h=m_alfo:m_vannico';
      const param = getH2HParamFromURL();
      expect(param).not.toBeNull();
      expect(param?.managerA).toBe('m_alfo');
      expect(param?.managerB).toBe('m_vannico');
    });

    it('returns null for malformed h2h param without colon', () => {
      (globalThis as any).window.location.search = '?h2h=m_alfo_only';
      expect(getH2HParamFromURL()).toBeNull();
    });

    it('resolves manager objects via findManagerByParam with fuzzy resilience', () => {
      const managers: Manager[] = [
        createTestManager({ id: 'm_alfo', name: 'Alfo', years: 5 }),
        createTestManager({ id: 'm_vannico', name: 'Vannico', years: 8 })
      ];

      const foundA = findManagerByParam('alfo', managers);
      const foundB = findManagerByParam('m_vannico', managers);

      expect(foundA?.id).toBe('m_alfo');
      expect(foundB?.id).toBe('m_vannico');
    });
  });

  describe('HeadToHeadRadar & Duel Bars', () => {
    it('computes 6 normalized axes within [0, 100] interval', async () => {
      const { computeH2HAxes } = await import('@/components/modals/h2h/HeadToHeadRadar');
      const managerA: Manager = createTestManager({ id: 'm1', name: 'Mister 1', gold: 2, years: 5 });
      const managerB: Manager = createTestManager({ id: 'm2', name: 'Mister 2', gold: 1, years: 4 });
      const stats = computeHeadToHead(managerA, managerB);

      const axes = computeH2HAxes(stats);
      expect(axes.length).toBe(6);

      const expectedKeys = ['prestige', 'gci', 'ki', 'cr', 'stability', 'nti'];
      expect(axes.map(a => a.key)).toEqual(expectedKeys);

      axes.forEach(axis => {
        expect(axis.valA).toBeGreaterThanOrEqual(0);
        expect(axis.valA).toBeLessThanOrEqual(100);
        expect(axis.valB).toBeGreaterThanOrEqual(0);
        expect(axis.valB).toBeLessThanOrEqual(100);
        expect(axis.rawA).toBeDefined();
        expect(axis.rawB).toBeDefined();
      });
    });

    it('renders valid SVG markup for Radar Plot', async () => {
      const { computeH2HAxes, renderH2HRadarSVG } = await import('@/components/modals/h2h/HeadToHeadRadar');
      const managerA: Manager = createTestManager({ id: 'm1', name: 'Alfo', gold: 3 });
      const managerB: Manager = createTestManager({ id: 'm2', name: 'Vannico', gold: 2 });
      const stats = computeHeadToHead(managerA, managerB);
      const axes = computeH2HAxes(stats);

      const svgHtml = renderH2HRadarSVG(axes, 'Alfo', 'Vannico');
      expect(svgHtml).toContain('<svg');
      expect(svgHtml).toContain('points=');
      expect(svgHtml).toContain('Alfo');
      expect(svgHtml).toContain('Vannico');
      expect(svgHtml).toContain('Prestigio');
      expect(svgHtml).toContain('Freddezza (GCI)');
    });

    it('renders mirrored duel bars markup', async () => {
      const { computeH2HAxes, renderH2HDuelBars } = await import('@/components/modals/h2h/HeadToHeadRadar');
      const managerA: Manager = createTestManager({ id: 'm1', name: 'Alfo', gold: 3 });
      const managerB: Manager = createTestManager({ id: 'm2', name: 'Vannico', gold: 2 });
      const stats = computeHeadToHead(managerA, managerB);
      const axes = computeH2HAxes(stats);

      const barsHtml = renderH2HDuelBars(axes, 'Alfo', 'Vannico');
      expect(barsHtml).toContain('Alfo');
      expect(barsHtml).toContain('Vannico');
      expect(barsHtml).toContain('Prestigio');
      expect(barsHtml).toContain('rounded-full');
    });

    it('toggles visual mode between radar and bars', async () => {
      const { setH2HVisualMode, getH2HVisualMode } = await import('@/components/modals/h2h/HeadToHeadModal');
      expect(getH2HVisualMode()).toBe('radar');

      setH2HVisualMode('bars');
      expect(getH2HVisualMode()).toBe('bars');

      setH2HVisualMode('radar');
      expect(getH2HVisualMode()).toBe('radar');
    });
  });

  describe('Modal Modularization & Mounting', () => {
    it('mounts modal shells into placeholder root divs if unmounted', async () => {
      const { initModalMounts } = await import('@/components/modals/initModals');

      const elements: Record<string, any> = {
        'manager-profile-modal-root': { innerHTML: '' },
        'manager-modal-root': { innerHTML: '' },
        'concentration-modal-root': { innerHTML: '' },
        'head-to-head-modal-root': { innerHTML: '' },
        'season-modal-root': { innerHTML: '' }
      };

      (globalThis as any).document = {
        getElementById: (id: string) => elements[id] || null
      };

      initModalMounts();

      expect(elements['manager-profile-modal-root'].innerHTML).toContain('manager-profile-modal');
      expect(elements['manager-modal-root'].innerHTML).toContain('manager-modal');
      expect(elements['concentration-modal-root'].innerHTML).toContain('concentration-modal');
      expect(elements['head-to-head-modal-root'].innerHTML).toContain('head-to-head-modal');
      expect(elements['season-modal-root'].innerHTML).toContain('season-modal');
    });
  });

  describe('H2H Modal Template & Backdrop Interaction', () => {
    it('renders thin scrollbar style in modal body', async () => {
      const { renderHeadToHeadModalHTML } = await import('@/components/modals/h2h/HeadToHeadTemplate');
      const managerA: Manager = createTestManager({ id: 'm1', name: 'Alfo' });
      const managerB: Manager = createTestManager({ id: 'm2', name: 'Vannico' });
      const stats = computeHeadToHead(managerA, managerB);

      const html = renderHeadToHeadModalHTML(stats, [managerA, managerB], false);
      expect(html).toContain('scrollbar-width: thin');
      expect(html).toContain('scrollbar-color: var(--table-border) transparent;');
    });

    it('attaches backdrop click listener and closes modal when clicking outside', async () => {
      const { state } = await import('@/state');
      const managerA: Manager = createTestManager({ id: 'm1', name: 'Alfo' });
      const managerB: Manager = createTestManager({ id: 'm2', name: 'Vannico' });
      state.managers = [managerA, managerB];

      const modalElement = {
        classList: {
          classes: new Set(['hidden']),
          remove(cls: string) { this.classes.delete(cls); },
          add(cls: string) { this.classes.add(cls); },
          contains(cls: string) { return this.classes.has(cls); }
        },
        listeners: {} as Record<string, (e: any) => void>,
        addEventListener(event: string, fn: (e: any) => void) {
          this.listeners[event] = fn;
        }
      };

      const containerElement = { innerHTML: '' };

      (globalThis as any).document = {
        getElementById: (id: string) => {
          if (id === 'head-to-head-modal') return modalElement;
          if (id === 'head-to-head-modal-content') return containerElement;
          return null;
        }
      };

      const { openHeadToHeadModal } = await import('@/components/modals/h2h/HeadToHeadModal');
      openHeadToHeadModal('m1', 'm2');

      expect(modalElement.classList.contains('flex')).toBe(true);
      expect(modalElement.classList.contains('hidden')).toBe(false);

      // Simulate clicking on inner card (e.target !== modalElement) -> should NOT close
      modalElement.listeners['click']({ target: {} });
      expect(modalElement.classList.contains('hidden')).toBe(false);

      // Simulate clicking on backdrop (e.target === modalElement) -> should close
      modalElement.listeners['click']({ target: modalElement });
      expect(modalElement.classList.contains('hidden')).toBe(true);
    });
  });
});
