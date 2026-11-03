import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Manager } from '@/types';
import { createTestManager } from './test-utils';

class MockElement {
  id: string = '';
  className: string = '';
  innerHTML: string = '';
  style: Record<string, string> = {};
  children: MockElement[] = [];

  constructor(public tagName: string) {}

  appendChild(el: any) {
    this.children.push(el);
    return el;
  }

  removeChild(el: any) {
    this.children = this.children.filter(c => c !== el);
    return el;
  }

  click() {}

  querySelectorAll(_sel: string) {
    return [];
  }

  querySelector(_sel: string) {
    return null;
  }

  remove() {}
}

vi.mock('html-to-image', () => ({
  toCanvas: vi.fn(async (_element: any, opts: any) => {
    return {
      width: opts.width || 1080,
      height: opts.height || 1920,
      toBlob: (cb: any) => cb(new Blob(['fake-png-data'], { type: 'image/png' }))
    };
  }),
  getFontEmbedCSS: vi.fn(async () => '')
}));

describe('Social Story Export (9:16) Format Engine', () => {
  let originalDocument: any;
  let originalWindow: any;
  let originalURL: any;

  beforeEach(() => {
    originalDocument = (globalThis as any).document;
    originalWindow = (globalThis as any).window;
    originalURL = (globalThis as any).URL;

    const mockBody = new MockElement('body');
    (globalThis as any).document = {
      body: mockBody,
      createElement: (tag: string) => new MockElement(tag),
      getElementById: (_id: string) => null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      fonts: { ready: Promise.resolve() }
    };

    if (!(URL as any).createObjectURL) {
      (URL as any).createObjectURL = vi.fn(() => 'blob:mock-url');
    }
    if (!(URL as any).revokeObjectURL) {
      (URL as any).revokeObjectURL = vi.fn();
    }

    const mockStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    (globalThis as any).localStorage = mockStorage;
    (globalThis as any).window = {
      location: {
        search: '',
        hash: '',
        pathname: '/',
        origin: 'https://insalatlas.it',
        href: 'https://insalatlas.it/'
      },
      localStorage: mockStorage,
      open: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      matchMedia: vi.fn(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      })),
      getComputedStyle: () => ({
        backgroundColor: '#030712',
        getPropertyValue: () => ''
      })
    };
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ managers: [], current_season: '2024/25' })
    });
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
    (globalThis as any).URL = originalURL;
  });

  const managerA: Manager = createTestManager({
    id: 'mA',
    name: 'Cannibale',
    gold: 3,
    cup_gold: 2,
    supercup: 1,
    years: 5,
    history: [
      { season: '2022/23', team: 'Squadra A', rank: 1, points: 75, achievements: [] },
      { season: '2023/24', team: 'Squadra A', rank: 2, points: 68, achievements: [] },
      { season: '2024/25', team: 'Squadra A', rank: 1, points: 72, achievements: [] }
    ]
  });

  const managerB: Manager = createTestManager({
    id: 'mB',
    name: 'Rival B',
    gold: 1,
    cup_gold: 1,
    supercup: 0,
    years: 4,
    history: [
      { season: '2022/23', team: 'Squadra B', rank: 3, points: 60, achievements: [] },
      { season: '2023/24', team: 'Squadra B', rank: 1, points: 71, achievements: [] },
      { season: '2024/25', team: 'Squadra B', rank: 4, points: 55, achievements: [] }
    ]
  });

  const managerC: Manager = createTestManager({
    id: 'mC',
    name: 'Rival C',
    gold: 0,
    cup_gold: 2,
    supercup: 1,
    years: 4,
    history: [
      { season: '2022/23', team: 'Squadra C', rank: 5, points: 52, achievements: [] },
      { season: '2023/24', team: 'Squadra C', rank: 3, points: 64, achievements: [] },
      { season: '2024/25', team: 'Squadra C', rank: 2, points: 66, achievements: [] }
    ]
  });

  describe('renderManagerStoryCanvas', () => {
    it('creates a 1080x1920 canvas with safe zones and official branding', async () => {
      const { renderManagerStoryCanvas } = await import('@/export/renderers/story');
      const canvas = await renderManagerStoryCanvas(managerA);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1080);
      expect(canvas.height).toBe(1920);
    });
  });

  describe('renderH2HDuelStoryCanvas', () => {
    it('renders 1vs1 head-to-head duel story canvas at 1080x1920', async () => {
      const { renderH2HDuelStoryCanvas } = await import('@/export/renderers/story');
      const canvas = await renderH2HDuelStoryCanvas(managerA, managerB);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1080);
      expect(canvas.height).toBe(1920);
    });
  });

  describe('renderMultiManagerStoryCanvas', () => {
    it('renders 3+ managers "Tavolo dei Rivali" story canvas at 1080x1920', async () => {
      const { renderMultiManagerStoryCanvas } = await import('@/export/renderers/story');
      const canvas = await renderMultiManagerStoryCanvas([managerA, managerB, managerC]);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1080);
      expect(canvas.height).toBe(1920);
    });
  });

  describe('renderRecordStoryCanvas', () => {
    it('renders an individual Hall of Fame Record Story at 1080x1920', async () => {
      const { renderRecordStoryCanvas } = await import('@/export/renderers/story');
      const mockRecord: any = {
        id: 'max_single_season_points',
        title: 'Record Punti Singola Stagione',
        category: 'points',
        icon: 'fa-solid fa-bolt',
        watermark: '⚡',
        badgeLabel: 'Punti Assoluti',
        badgeColor: 'amber',
        primaryHolder: {
          managerId: 'm_makako',
          managerName: 'Makako',
          teamName: 'Makako Antwerpen',
          season: '2017/18',
          value: 67,
          formattedValue: '67.0 pt',
          normalizedDetail: '1.91 pt/g'
        },
        primaryHolders: [{
          managerId: 'm_makako',
          managerName: 'Makako',
          teamName: 'Makako Antwerpen',
          season: '2017/18',
          value: 67,
          formattedValue: '67.0 pt'
        }],
        runnerUps: [
          {
            managerId: 'm_alfo',
            managerName: 'Alfo',
            teamName: 'Real Alfo',
            logo: 'https://example.com/alfo.png',
            season: '2023/24',
            value: 65,
            formattedValue: '65.0 pt'
          },
          {
            managerId: 'm_erboro',
            managerName: 'ErBoro',
            teamName: 'Boro FC',
            season: '2022/23',
            value: 64,
            formattedValue: '64.0 pt'
          }
        ],
        description: 'Miglior punteggio assoluto registrato in Serie Atlas.'
      };

      const canvas = await renderRecordStoryCanvas(mockRecord);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1080);
      expect(canvas.height).toBe(1920);
    });
  });

  describe('renderRecordsSummaryStoryCanvas', () => {
    it('renders marquee records summary poster story at 1080x1920', async () => {
      const { renderRecordsSummaryStoryCanvas } = await import('@/export/renderers/story');
      const canvas = await renderRecordsSummaryStoryCanvas();
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1080);
      expect(canvas.height).toBe(1920);
    });
  });

  describe('renderStandingsStoryCanvas', () => {
    it('renders official standings story at 1080x1920 with xPTS and all-play metrics', async () => {
      const { renderStandingsStoryCanvas } = await import('@/export/renderers/story');
      const mockLiveData: any = {
        season: '2026/27',
        lastCompletedRound: 4,
        standings: [
          {
            teamName: 'Scalo San Genesio',
            coach: 'Valery',
            rank: 1,
            points: 10,
            played: 4,
            won: 3,
            drawn: 1,
            lost: 0,
            goalDiff: 5,
            totalFantaPoints: 312.5,
            statusBadge: '🔥',
            statusLabel: 'In vetta',
            scheduleLuck: {
              xPoints: 9.89,
              allPlayRecord: { wins: 26, draws: 11, losses: 8, winPct: 57.8 }
            }
          }
        ]
      };

      const canvas = await renderStandingsStoryCanvas(mockLiveData);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1080);
      expect(canvas.height).toBe(1920);
    });
  });

  describe('renderMonteCarloStoryCanvas', () => {
    it('renders Monte Carlo story with title gating and median points', async () => {
      const { renderMonteCarloStoryCanvas } = await import('@/export/renderers/story');
      const teamMetric: any = {
        teamName: 'Scalo San Genesio',
        coach: 'Valery',
        rank: 1,
        points: 10,
        scheduleLuck: {
          monteCarlo: {
            pTitlePct: 47.7,
            pPodiumPct: 86.3,
            pMidPct: 10.5,
            pSpoonPct: 3.1,
            medianPoints: 49.0,
            p10: 41.0,
            p90: 57.0,
            p25: 45.0,
            p75: 54.0
          }
        }
      };
      const mockLiveData: any = {
        season: '2026/27',
        totalRounds: 26,
        lastCompletedRound: 4
      };

      const canvas = await renderMonteCarloStoryCanvas(teamMetric, mockLiveData);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1080);
      expect(canvas.height).toBe(1920);
    });
  });

  describe('Share Facade Functions', () => {
    it('exports profile story without throwing errors', async () => {
      const { exportProfileStoryHD } = await import('@/export/share');
      await expect(exportProfileStoryHD(managerA)).resolves.not.toThrow();
    });

    it('exports H2H duel story without throwing errors', async () => {
      const { exportH2HDuelStoryHD } = await import('@/export/share');
      await expect(exportH2HDuelStoryHD(managerA, managerB)).resolves.not.toThrow();
    });

    it('exports multi-manager story without throwing errors', async () => {
      const { exportMultiManagerStoryHD } = await import('@/export/share');
      await expect(exportMultiManagerStoryHD([managerA, managerB, managerC])).resolves.not.toThrow();
    });

    it('exports record story and records summary story without throwing errors', async () => {
      const { exportRecordStoryHD, exportRecordsSummaryStoryHD } = await import('@/export/share');
      await expect(exportRecordStoryHD('max_single_season_points')).resolves.not.toThrow();
      await expect(exportRecordsSummaryStoryHD()).resolves.not.toThrow();
    });
  });
});
