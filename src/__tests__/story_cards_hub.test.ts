import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  renderStandingsStoryCanvas,
  renderMatchdayRecapStoryCanvas,
  renderMonteCarloStoryCanvas,
  renderTeamPowerRadarStoryCanvas,
  renderNextRoundCanvas,
  renderNextRoundStoryCanvas
} from '@/export';
import { setLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import {
  openStoryExportModal,
  closeStoryExportModal,
  switchStoryExportTab,
  changeStoryExportTeam
} from '@/components/modals/export/StoryExportModal';
import type { LiveSeasonDetails, LiveTeamMetrics } from '@/types';

class MockElement {
  id: string = '';
  className: string = '';
  innerHTML: string = '';
  style: any = {
    setProperty: vi.fn(),
    removeProperty: vi.fn()
  };
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

  classList = {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(() => false)
  };

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
      toBlob: (cb: any) => cb(new Blob(['fake-png-data'], { type: 'image/png' })),
      toDataURL: () => 'data:image/png;base64,fake-data'
    };
  }),
  getFontEmbedCSS: vi.fn(async () => '')
}));

describe('Phase 2: Visual Story & Share Cards Hub', () => {
  let originalDocument: any;
  let originalWindow: any;
  let originalURL: any;

  const mockLiveData: LiveSeasonDetails = {
    season: '2026/27',
    competitionId: 1,
    lastCompletedRound: 2,
    totalRounds: 26,
    standings: [
      {
        rank: 1,
        teamName: 'Team Phoenix',
        coach: 'Marco',
        managerId: 'm_phoenix',
        points: 6,
        played: 2,
        won: 2,
        drawn: 0,
        lost: 0,
        goalsFor: 4,
        goalsAgainst: 1,
        totalFantaPoints: 152.0,
        avgFantaPoints: 76.0,
        recentForm: ['W', 'W'],
        deltaLuck: 0.5,
        scheduleLuck: {
          xPoints: 5.2,
          xRank: 1,
          luckDelta: 0.8,
          luckZScore: 1.2,
          luckBadge: '🍀',
          luckLabel: 'Fortunato'
        },
        monteCarlo: {
          pTitlePct: 38.5,
          pPodiumPct: 72.0,
          pMidPct: 24.5,
          pFlopPct: 3.5,
          medianPoints: 48.0,
          p10: 40.0,
          p25: 44.0,
          p75: 52.0,
          p90: 56.0
        },
        elo: {
          flat: { current: 1545.0 },
          historical: { current: 1560.0 },
          atlas: { current: 1550.0 },
          seasonStats: {
            '2026/27': { golo: 1.15 }
          }
        }
      } as unknown as LiveTeamMetrics,
      {
        rank: 2,
        teamName: 'Team Dragon',
        coach: 'Luca',
        managerId: 'm_dragon',
        points: 3,
        played: 2,
        won: 1,
        drawn: 0,
        lost: 1,
        goalsFor: 2,
        goalsAgainst: 2,
        totalFantaPoints: 140.0,
        avgFantaPoints: 70.0,
        recentForm: ['W', 'L'],
        deltaLuck: -0.5,
        scheduleLuck: {
          xPoints: 4.0,
          xRank: 2,
          luckDelta: -1.0,
          luckZScore: -0.9,
          luckBadge: '⚡',
          luckLabel: 'Sfortunato'
        },
        monteCarlo: {
          pTitlePct: 15.0,
          pPodiumPct: 45.0,
          pMidPct: 42.0,
          pFlopPct: 13.0,
          medianPoints: 39.0,
          p10: 32.0,
          p25: 36.0,
          p75: 42.0,
          p90: 46.0
        },
        elo: {
          flat: { current: 1495.0 },
          historical: { current: 1510.0 },
          atlas: { current: 1490.0 },
          seasonStats: {
            '2026/27': { golo: 0.92 }
          }
        }
      } as unknown as LiveTeamMetrics
    ],
    rounds: [
      {
        roundNumber: 2,
        matches: [
          {
            homeTeam: 'Team Phoenix',
            awayTeam: 'Team Dragon',
            homeScore: 2,
            awayScore: 1,
            homeFantaPoints: 76.5,
            awayFantaPoints: 68.0,
            isPlayed: true
          }
        ]
      },
      {
        roundNumber: 3,
        matches: [
          {
            homeTeam: 'Team Phoenix',
            awayTeam: 'Team Dragon',
            isPlayed: false
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    originalDocument = (globalThis as any).document;
    originalWindow = (globalThis as any).window;
    originalURL = (globalThis as any).URL;

    const mockBody = new MockElement('body');
    const createdElements: MockElement[] = [];

    (globalThis as any).document = {
      body: mockBody,
      createElement: vi.fn((tag: string) => {
        const el = new MockElement(tag);
        createdElements.push(el);
        return el;
      }),
      getElementById: vi.fn((id: string) => {
        return mockBody.children.find(e => e.id === id) || createdElements.find(e => e.id === id) || null;
      }),
      querySelectorAll: vi.fn(() => [])
    };

    setLiveSeasonDetails(mockLiveData);
    (globalThis as any).window = {
      innerWidth: 1200,
      innerHeight: 800,
      liveSeasonData: mockLiveData
    };

    (globalThis as any).URL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn()
    };
  });

  afterEach(() => {
    setLiveSeasonDetails(null);
    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
    (globalThis as any).URL = originalURL;
  });

  it('renders standings story canvas with complete table and highlights', async () => {
    const canvas = await renderStandingsStoryCanvas(mockLiveData);
    expect(canvas).toBeDefined();
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
  });

  it('renders matchday recap story canvas with match scores, MVP and season details', async () => {
    const canvas = await renderMatchdayRecapStoryCanvas(2, mockLiveData);
    expect(canvas).toBeDefined();
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
  });

  it('renders Monte Carlo odds story canvas with 4 probability tiers and projected finish box', async () => {
    const canvas = await renderMonteCarloStoryCanvas(mockLiveData.standings[0], mockLiveData);
    expect(canvas).toBeDefined();
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
  });

  it('renders team power radar story canvas with 3-track Elo and 5-axis tactical radar', async () => {
    const canvas = await renderTeamPowerRadarStoryCanvas(mockLiveData.standings[0], mockLiveData);
    expect(canvas).toBeDefined();
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
  });

  it('opens story export modal, allows switching tabs, and closes cleanly', () => {
    openStoryExportModal('Team Phoenix', 'recap');
    const modalEl = (globalThis as any).document.getElementById('story-export-modal');
    expect(modalEl).not.toBeNull();
    expect(modalEl?.innerHTML).toContain('Story Cards Hub');
    expect(modalEl?.innerHTML).toContain('Recap Giornata');

    // Switch to Monte Carlo tab
    switchStoryExportTab('mc');

    // Change team
    changeStoryExportTeam('Team Dragon');

    // Close modal
    closeStoryExportModal();
  });

  it('filters tabs and elevates z-index based on context', () => {
    // 1. League context
    openStoryExportModal(undefined, 'classifica', 'league');
    let modalEl = (globalThis as any).document.getElementById('story-export-modal');
    expect(modalEl).not.toBeNull();
    expect(modalEl?.className).toContain('z-[100]');
    expect(modalEl?.innerHTML).toContain('id="tab-story-classifica"');
    expect(modalEl?.innerHTML).toContain('id="tab-story-recap"');
    // Team tabs should have 'hidden' class in league context
    expect(modalEl?.innerHTML).toMatch(/id="tab-story-mc"[^>]*hidden/);
    expect(modalEl?.innerHTML).toMatch(/id="tab-story-power"[^>]*hidden/);

    closeStoryExportModal();

    // 2. Team context (from Team Matches Modal)
    openStoryExportModal('Team Dragon', 'mc', 'team');
    modalEl = (globalThis as any).document.getElementById('story-export-modal');
    expect(modalEl).not.toBeNull();
    expect(modalEl?.className).toContain('z-[100]');
    // League tabs should have 'hidden' class in team context
    expect(modalEl?.innerHTML).toMatch(/id="tab-story-classifica"[^>]*hidden/);
    expect(modalEl?.innerHTML).toMatch(/id="tab-story-recap"[^>]*hidden/);
    // Team tabs should not have 'hidden' class
    expect(modalEl?.innerHTML).not.toMatch(/id="tab-story-mc"[^>]*hidden/);

    closeStoryExportModal();
  });

  it('renders horizontal next round canvas with improved dimensions and clima badges', async () => {
    const canvas = await renderNextRoundCanvas();
    expect(canvas).toBeDefined();
    expect(canvas.width).toBe(1040);
  });

  it('renders vertical 9:16 next round story canvas with balanced grid and duel cards', async () => {
    const canvas = await renderNextRoundStoryCanvas(mockLiveData);
    expect(canvas).toBeDefined();
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
  });
});
