import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  COMPETITION_REGISTRY,
  getActiveCompetitions,
  getCompetitionDef,
  buildAlboColumns,
  ALBO_COLUMNS
} from '@/config';
import {
  calculateManagerScore,
  getManagerTrophyCount,
  getManagerTotalTrophies,
  getSortedManagers
} from '@/score';
import { renderBoardHeader, renderBoard, syncAlboGridColumns } from '@/components/board/tableBoard';
import { renderTopStatsCards, updateStatistics } from '@/components/board/statsCounter';
import { getTrophyHeaderConfig } from '@/components/modals/trophy/TrophyModalShell';
import { renderGenericCompetitionRollHTML } from '@/components/modals/trophy/TrophyModalContent';
import { CompetitionDefinition, Manager, CompetitionRecord } from '@/types';
import { state } from '@/state';
import { createTestManager } from './test-utils';

class MockElement {
  id: string;
  innerHTML: string = '';
  textContent: string = '';
  style: Record<string, string> = { setProperty: vi.fn() as any };
  classes = new Set<string>();
  children: MockElement[] = [];

  constructor(id: string) {
    this.id = id;
  }

  get classList() {
    return {
      add: (...c: string[]) => c.forEach(cls => this.classes.add(cls)),
      remove: (...c: string[]) => c.forEach(cls => this.classes.delete(cls)),
      contains: (cls: string) => this.classes.has(cls)
    };
  }

  appendChild(el: MockElement) {
    this.children.push(el);
  }

  querySelector(selector: string): MockElement | null {
    if (selector.startsWith('#')) {
      const targetId = selector.slice(1);
      if (this.id === targetId) return this;
      for (const child of this.children) {
        const found = child.querySelector(selector);
        if (found) return found;
      }
    }
    return null;
  }

  closest() {
    return null;
  }
}

describe('Dynamic Competition Registry Engine', () => {
  let originalDocument: unknown;
  let originalWindow: unknown;

  beforeEach(() => {
    originalDocument = (globalThis as unknown as { document?: unknown }).document;
    originalWindow = (globalThis as unknown as { window?: unknown }).window;
  });

  afterEach(() => {
    (globalThis as unknown as { document?: unknown }).document = originalDocument;
    (globalThis as unknown as { window?: unknown }).window = originalWindow;
    vi.restoreAllMocks();
  });

  describe('COMPETITION_REGISTRY & getActiveCompetitions', () => {
    it('defines canonical competitions with correct archetypes and scoring weights', () => {
      const champ = getCompetitionDef('championship');
      expect(champ).toBeDefined();
      expect(champ?.type).toBe('tier3');
      expect(champ?.scoringPoints.gold).toBe(3.0);
      expect(champ?.scoringPoints.silver).toBe(0.5);
      expect(champ?.scoringPoints.bronze).toBe(0.25);

      const cup = getCompetitionDef('cup');
      expect(cup).toBeDefined();
      expect(cup?.type).toBe('tier2');
      expect(cup?.scoringPoints.gold).toBe(2.0);

      const supercup = getCompetitionDef('supercup');
      expect(supercup?.type).toBe('single');
      expect(supercup?.scoringPoints.gold).toBe(1.0);

      const spoon = getCompetitionDef('spoon');
      expect(spoon?.type).toBe('dishonor');
      expect(spoon?.scoringPoints.gold).toBe(-1.0);

      const cartonato = getCompetitionDef('cartonato');
      expect(cartonato?.type).toBe('banners');
      expect(cartonato?.scoringPoints.gold).toBe(-2.0);
    });

    it('orders active competitions monotonically by order property', () => {
      const active = getActiveCompetitions();
      for (let i = 0; i < active.length - 1; i++) {
        expect(active[i].order).toBeLessThanOrEqual(active[i + 1].order);
      }
    });

    it('buildAlboColumns respects league features', () => {
      const fullColumns = buildAlboColumns({
        cup: true,
        supercup: true,
        mundialito: true,
        spoon: true,
        cartonato: true
      });
      expect(fullColumns.map(c => c.key)).toContain('cup');
      expect(fullColumns.map(c => c.key)).toContain('supercup');
      expect(fullColumns.map(c => c.key)).toContain('cartonato');

      const minimalColumns = buildAlboColumns({
        cup: false,
        supercup: false,
        mundialito: false,
        spoon: false,
        cartonato: false
      });
      expect(minimalColumns.map(c => c.key)).toEqual(['manager', 'championship']);
      expect(ALBO_COLUMNS.length).toBeGreaterThan(0);
    });
  });

  describe('Dynamic Palmares Scoring Engine (score.ts)', () => {
    it('computes manager score dynamically using trophies bag and legacy fallbacks', () => {
      const m1 = createTestManager({
        id: 'dyn1',
        name: 'Manager Dynamic',
        gold: 2,
        trophies: {
          championship: 2,
          cup: 1,
          supercup: 1,
          spoon: 1
        }
      });
      // 2 * 3.0 (champ) + 1 * 2.0 (cup) + 1 * 1.0 (supercup) + 1 * -1.0 (spoon) = 6 + 2 + 1 - 1 = 8.0
      expect(calculateManagerScore(m1)).toBe(8.0);
      expect(getManagerTrophyCount(m1, 'championship', 'gold')).toBe(2);
      expect(getManagerTrophyCount(m1, 'cup', 'gold')).toBe(1);
    });

    it('supports custom 8th competition in registry and scores correctly', () => {
      const customChampionsLeague: CompetitionDefinition = {
        id: 'champions',
        name: 'Champions League',
        shortName: 'Champions',
        category: 'Champions',
        trophyIcon: 'gold_cup',
        type: 'tier3',
        scoringPoints: { gold: 5.0, silver: 2.0, bronze: 1.0 },
        grid: { desktopTrack: '180px', desktopWidthPx: 180, mobileWidthPx: 100 },
        order: 8,
        enabled: true
      };

      const customRegistry = [...getActiveCompetitions(), customChampionsLeague];

      const m = createTestManager({
        id: 'champs_winner',
        name: 'Euro Master',
        trophies: {
          championship: 1, // 3.0
          champions: 2,    // 2 * 5.0 = 10.0
          champions_silver: 1 // 1 * 2.0 = 2.0
        }
      });

      const score = calculateManagerScore(m, customRegistry);
      expect(score).toBe(3.0 + 10.0 + 2.0); // 15.0
    });

    it('getManagerTotalTrophies excludes dishonor and banners while summing positive cups', () => {
      const m = createTestManager({
        id: 'multi_trophy',
        name: 'Winner and Loser',
        trophies: {
          championship: 3,
          cup: 2,
          supercup: 1,
          spoon: 4,      // dishonor -> should NOT be included
          cartonato: 2   // banners -> should NOT be included
        }
      });
      expect(getManagerTotalTrophies(m)).toBe(3 + 2 + 1); // 6
    });

    it('getSortedManagers dynamically sorts by arbitrary competition key with _desc suffix', () => {
      const list: Manager[] = [
        createTestManager({ id: 'mA', name: 'Alpha', trophies: { champions: 1 } }),
        createTestManager({ id: 'mB', name: 'Beta', trophies: { champions: 3 } }),
        createTestManager({ id: 'mC', name: 'Gamma', trophies: { champions: 0 } })
      ];

      const sorted = getSortedManagers(list, 'champions_desc' as any);
      expect(sorted[0].id).toBe('mB');
      expect(sorted[1].id).toBe('mA');
      expect(sorted[2].id).toBe('mC');
    });
  });

  describe('Board Rendering Invariance (tableBoard.ts)', () => {
    let mockHeader: MockElement;
    let mockBody: MockElement;

    beforeEach(() => {
      mockHeader = new MockElement('albo-table-header');
      mockBody = new MockElement('managers-table-body');

      const mockDoc = {
        documentElement: {
          style: {
            setProperty: vi.fn()
          }
        },
        getElementById: (id: string) => {
          if (id === 'albo-table-header') return mockHeader;
          if (id === 'managers-table-body') return mockBody;
          return null;
        },
        createElement: (tag: string) => new MockElement(tag)
      };

      (globalThis as unknown as { document: unknown }).document = mockDoc;
      (globalThis as unknown as { window: unknown }).window = {
        matchMedia: () => ({ matches: false, addEventListener: vi.fn() })
      };

      state.managers = [
        createTestManager({
          id: 'test_m1',
          name: 'Mister Uno',
          years: 4,
          trophies: {
            championship: 1,
            championship_silver: 1,
            cup: 2,
            supercup: 1,
            spoon: 1,
            cartonato: 1
          }
        })
      ];
    });

    it('renders board header with correct column keys and titles', () => {
      renderBoardHeader();
      expect(mockHeader.innerHTML).toContain('th-col-1');
      expect(mockHeader.innerHTML).toContain('th-col-2');
      expect(mockHeader.innerHTML).toContain('Campionato');
    });

    it('renders manager rows using generic cell dispatcher across all archetypes', () => {
      renderBoard();
      expect(mockBody.children.length).toBe(1);
      const row = mockBody.children[0];
      expect(row.innerHTML).toContain('Mister Uno');
      expect(row.innerHTML).toContain('🏆');
      expect(row.innerHTML).toContain('pt');
    });

    it('synchronizes albo grid columns property', () => {
      syncAlboGridColumns();
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--albo-cols',
        expect.any(String)
      );
    });
  });

  describe('Top Summary Cards (statsCounter.ts)', () => {
    let elements: Record<string, MockElement>;

    beforeEach(() => {
      elements = {
        'top-stats-cards-container': new MockElement('top-stats-cards-container'),
        'stat-total-seasons': new MockElement('stat-total-seasons'),
        'stat-seasons-detail': new MockElement('stat-seasons-detail'),
        'stat-total-scudetti': new MockElement('stat-total-scudetti'),
        'stat-total-cups': new MockElement('stat-total-cups'),
        'stat-total-mundialito': new MockElement('stat-total-mundialito'),
        'stat-total-spoons': new MockElement('stat-total-spoons'),
        'stat-total-cartonati': new MockElement('stat-total-cartonati')
      };

      for (const comp of getActiveCompetitions()) {
        elements[`stat-total-${comp.id}`] = new MockElement(`stat-total-${comp.id}`);
      }

      const mockDoc = {
        getElementById: (id: string) => elements[id] || null
      };

      (globalThis as unknown as { document: unknown }).document = mockDoc;

      state.managers = [
        createTestManager({
          id: 'm1',
          name: 'Manager 1',
          trophies: { championship: 2, cup: 1, supercup: 1, mundialito: 1, spoon: 1, cartonato: 1 }
        }),
        createTestManager({
          id: 'm2',
          name: 'Manager 2',
          trophies: { championship: 1, cup: 0, supercup: 1, mundialito: 0, spoon: 2, cartonato: 0 }
        })
      ];
      state.competitions = [
        {
          id: 1,
          name: 'Serie A 2024/25',
          season: '2024/25',
          category: 'Campionato',
          in_progress: false,
          ranking: []
        } as unknown as CompetitionRecord
      ];
    });

    it('renderTopStatsCards creates cards for seasons and all enabled competitions with responsive static grid', () => {
      renderTopStatsCards();
      const container = elements['top-stats-cards-container'] as any;
      expect(container.innerHTML).toContain('STAGIONI');
      expect(container.innerHTML).toContain('stat-total-scudetti');
      // With 7 cards (1 season + 6 active comps), grid should use lg:grid-cols-4
      expect(container.className).toContain('lg:grid-cols-4');

      updateStatistics();
      expect(elements['stat-total-scudetti'].textContent).toBe('3');
      expect(elements['stat-total-spoons'].textContent).toBe('3');
    });

    it('respects optional custom cardIcon and cardBadgeStyle on competitions', () => {
      const customComp: CompetitionDefinition = {
        id: 'mock_league',
        name: 'Mock League',
        shortName: 'Mock',
        category: 'Coppa',
        trophyIcon: 'gold_cup',
        type: 'tier2',
        cardIcon: '🌟',
        cardBadgeStyle: 'bg-orange-500/20 text-orange-400',
        scoringPoints: { gold: 2.0 },
        grid: { desktopTrack: '120px', desktopWidthPx: 120, mobileWidthPx: 90 },
        order: 9,
        enabled: true
      };
      COMPETITION_REGISTRY.push(customComp);
      try {
        renderTopStatsCards();
        const container = elements['top-stats-cards-container'];
        expect(container.innerHTML).toContain('🌟');
        expect(container.innerHTML).toContain('bg-orange-500/20 text-orange-400');
        expect(container.innerHTML).toContain('Mock');
      } finally {
        const idx = COMPETITION_REGISTRY.indexOf(customComp);
        if (idx !== -1) COMPETITION_REGISTRY.splice(idx, 1);
      }
    });
  });

  describe('Generic Trophy Modal Shell & Content', () => {
    it('generates dynamic header config for arbitrary registered competition', () => {
      const customComp: CompetitionDefinition = {
        id: 'winter_cup',
        name: 'Coppa d’Inverno',
        shortName: 'Inverno',
        category: 'Inverno',
        nameKeywords: ['inverno'],
        trophyIcon: 'gold_cup',
        type: 'tier2',
        scoringPoints: { gold: 2.0 },
        grid: { desktopTrack: '140px', desktopWidthPx: 140, mobileWidthPx: 90 },
        order: 9,
        enabled: true
      };

      const competitions: CompetitionRecord[] = [
        {
          id: 99,
          name: 'Coppa d’Inverno 2024',
          season: '2024/25',
          category: 'Inverno',
          in_progress: false,
          ranking: [
            { rank: 1, coach: 'Mister Winner', teamName: 'Team Alpha', points: 30 }
          ]
        } as unknown as CompetitionRecord
      ];

      COMPETITION_REGISTRY.push(customComp);

      const headerCfg = getTrophyHeaderConfig('winter_cup' as any, undefined, competitions, []);
      expect(headerCfg.title).toBe('Albo d’Oro Coppa d’Inverno');
      expect(headerCfg.badgeLabel).toBe('1 Edizioni Concluse');

      const bodyHTML = renderGenericCompetitionRollHTML(customComp, competitions, []);
      expect(bodyHTML).toContain('Coppa d’Inverno 2024');
      expect(bodyHTML).toContain('Mister Winner');
      expect(bodyHTML).toContain('Vincitore');

      // Cleanup registry
      const idx = COMPETITION_REGISTRY.findIndex(c => c.id === 'winter_cup');
      if (idx !== -1) COMPETITION_REGISTRY.splice(idx, 1);
    });
  });
});
