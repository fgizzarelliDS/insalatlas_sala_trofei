import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Manager, LiveSeasonDetails } from '@/types';
import {
  renderMatchupModalHTML,
  collectDirectRoundMatches
} from '@/components/modals/matchup/MatchupTemplate';
import {
  mountMatchupModal,
  openMatchupModal,
  closeMatchupModal,
  changeMatchupManagerA,
  changeMatchupManagerB,
  toggleMatchupDirectDetails,
  toggleMatchupShareDropdown,
  closeMatchupShareDropdown,
  exportMatchupStoryHD,
  setMatchupScope,
  toggleTacticalRadarGuide,
  isMatchupOpen,
  getSelectedMatchupManagers
} from '@/components/modals/matchup/MatchupModal';
import { state, setLiveSeasonDetails } from '@/state';

function createMockManager(id: string, name: string): Manager {
  return {
    id,
    name,
    years: 5,
    gold: 1,
    silver: 0,
    bronze: 0,
    wooden: 0,
    podiums: 1,
    points: 250,
    cup_gold: 1,
    history: [
      {
        season: '2023/24',
        team: `${name} FC`,
        rank: 1,
        points: 68,
        fanta_points: 75.2,
        titles: ['Serie A'],
        trophies: [{ name: 'Scudetto', type: 'gold', icon: '🏆' }],
        achievements: []
      }
    ]
  } as unknown as Manager;
}

describe('Dedicated Matchup Modal (Pre-Match & Next Round Experience)', () => {
  let mgrA: Manager;
  let mgrB: Manager;
  let allManagers: Manager[];
  let originalDocument: any;
  let originalWindow: any;

  beforeEach(() => {
    mgrA = createMockManager('m_tazio', 'Tazio');
    mgrB = createMockManager('m_avvisatina', 'Avvisatina');
    allManagers = [mgrA, mgrB, createMockManager('m_alfo', 'Alfo')];
    state.managers = allManagers;

    originalDocument = (globalThis as any).document;
    originalWindow = (globalThis as any).window;

    const mockModal = {
      id: 'matchup-modal',
      className: '',
      classList: {
        classes: new Set(['hidden']),
        add(cls: string) { this.classes.add(cls); },
        remove(cls: string) { this.classes.delete(cls); },
        contains(cls: string) { return this.classes.has(cls); }
      },
      addEventListener: vi.fn()
    };

    const mockShareDropdown = {
      id: 'matchup-share-dropdown-menu',
      classList: {
        classes: new Set(['hidden']),
        add(cls: string) { this.classes.add(cls); },
        remove(cls: string) { this.classes.delete(cls); },
        toggle(cls: string) {
          if (this.classes.has(cls)) this.classes.delete(cls);
          else this.classes.add(cls);
        },
        contains(cls: string) { return this.classes.has(cls); }
      }
    };

    const mockGuidePanel = {
      id: 'tactical-radar-guide-panel',
      classList: {
        classes: new Set(['hidden']),
        add(cls: string) { this.classes.add(cls); },
        remove(cls: string) { this.classes.delete(cls); },
        toggle(cls: string) {
          if (this.classes.has(cls)) this.classes.delete(cls);
          else this.classes.add(cls);
        },
        contains(cls: string) { return this.classes.has(cls); }
      }
    };

    let mockScrollEl: any = { scrollTop: 0 };
    const mockContent = {
      id: 'matchup-modal-content',
      innerHTML: '',
      querySelector: vi.fn((sel: string) => {
        if (sel === '.overflow-y-auto') return mockScrollEl;
        return null;
      })
    };

    (globalThis as any).document = {
      body: {
        appendChild: vi.fn()
      },
      createElement: vi.fn((tag: string) => {
        if (tag === 'div') return mockModal;
        return {};
      }),
      getElementById: vi.fn((id: string) => {
        if (id === 'matchup-modal') return mockModal;
        if (id === 'matchup-modal-content') return mockContent;
        if (id === 'matchup-share-dropdown-menu') return mockShareDropdown;
        if (id === 'tactical-radar-guide-panel') return mockGuidePanel;
        return null;
      }),
      addEventListener: vi.fn()
    };

    (globalThis as any).window = {
      location: { href: 'https://insalatlas.it' },
      history: { pushState: vi.fn() }
    };
  });

  afterEach(() => {
    setLiveSeasonDetails(null);
    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
  });

  describe('collectDirectRoundMatches', () => {
    it('returns empty list and zeros when no rounds exist between contenders', () => {
      const res = collectDirectRoundMatches('m_tazio', 'm_avvisatina', 'Tazio', 'Avvisatina', null);
      expect(res.matches).toHaveLength(0);
      expect(res.winsA).toBe(0);
      expect(res.winsB).toBe(0);
      expect(res.ties).toBe(0);
      expect(res.totalPlayed).toBe(0);
    });

    it('correctly collects played and scheduled matches dynamically without hardcoded seasons', () => {
      const dynamicSeason = '2030/31';
      const mockLiveData: LiveSeasonDetails = {
        season: dynamicSeason,
        competitionId: 1,
        lastCompletedRound: 2,
        totalRounds: 26,
        rounds: [
          {
            roundNumber: 1,
            matches: [
              {
                homeManagerId: 'm_tazio',
                awayManagerId: 'm_avvisatina',
                homeTeam: 'Kiwi FC',
                awayTeam: 'LoTUS FC',
                homeOutcome: 'W',
                awayOutcome: 'L',
                isPlayed: true
              } as any
            ]
          },
          {
            roundNumber: 2,
            matches: [
              {
                homeManagerId: 'm_avvisatina',
                awayManagerId: 'm_tazio',
                homeTeam: 'LoTUS FC',
                awayTeam: 'Kiwi FC',
                isPlayed: false
              } as any
            ]
          }
        ],
        standings: []
      };

      const res = collectDirectRoundMatches('m_tazio', 'm_avvisatina', 'Tazio', 'Avvisatina', mockLiveData);
      expect(res.matches).toHaveLength(2);
      expect(res.seasonsList).toEqual([dynamicSeason]);
      expect(res.winsA).toBe(1);
      expect(res.winsB).toBe(0);
      expect(res.ties).toBe(0);
      expect(res.totalPlayed).toBe(1);
      expect(res.totalScheduled).toBe(1);

      // Verify scheduled match outcome
      const scheduledMatch = res.matches.find(m => !m.isPlayed);
      expect(scheduledMatch).toBeDefined();
      expect(scheduledMatch?.outcome).toBe('scheduled');
    });

    it('orders matches chronologically from past to future across seasons and rounds', () => {
      const mockLiveData: LiveSeasonDetails = {
        season: '2026/27',
        competitionId: 1,
        lastCompletedRound: 2,
        totalRounds: 26,
        rounds: [
          {
            roundNumber: 25,
            matches: [{ homeManagerId: 'm_tazio', awayManagerId: 'm_avvisatina', homeTeam: 'Kiwi', awayTeam: 'LoTUS', isPlayed: false } as any]
          },
          {
            roundNumber: 6,
            matches: [{ homeManagerId: 'm_avvisatina', awayManagerId: 'm_tazio', homeTeam: 'LoTUS', awayTeam: 'Kiwi', isPlayed: false } as any]
          }
        ],
        standings: []
      };

      const res = collectDirectRoundMatches('m_tazio', 'm_avvisatina', 'Tazio', 'Avvisatina', mockLiveData);
      // In the mock, rounds are 6 and 25
      expect(res.matches[0].roundNumber).toBe(6);
      expect(res.matches[1].roundNumber).toBe(25);
    });
  });

  describe('renderMatchupModalHTML', () => {
    it('renders aggregated WA, X, WB and the accordion button when collapsed', () => {
      const html = renderMatchupModalHTML(mgrA, mgrB, allManagers, null, false);

      // Header
      expect(html).toContain('Matchup Tattico');
      expect(html).toContain('Pre-Partita');

      // 5-Axis Radar & Guide Panel
      expect(html).toContain('Radar Tattico');
      expect(html).toContain('tactical-radar-guide-panel');
      expect(html).toContain('Guida ai 5 Assi Tattici');

      // Scontri diretti in campionato (Round-by-Round)
      expect(html).toContain('Scontri Diretti in Campionato (Round-by-Round)');
      expect(html).toContain('Vittorie Tazio');
      expect(html).toContain('Vittorie Avvisatina');
      expect(html).toContain('Pareggi');

      // Accordion toggle button
      expect(html).toContain('Mostra Dettaglio Gare');

      // When collapsed, detail match rows should not be rendered
      expect(html).not.toContain('Risultato numerico non mostrato');

      // Precedenti in campionato & Chiave tattica
      expect(html).toContain('Precedenti in Campionato');
      expect(html).toContain('Chiave Tattica');

      // Pinned Footer & Share Popover Dropdown
      expect(html).toContain('Storico H2H');
      expect(html).toContain('btn-matchup-share-dropdown');
      expect(html).toContain('matchup-share-dropdown-menu');
      expect(html).toContain('Scarica PNG Scheda');
      expect(html).toContain('Story (9:16)');
      expect(html).toContain('Copia Banter WhatsApp');
      expect(html).toContain('Invia Link WhatsApp');
      expect(html).toContain('Chiudi');
    });

    it('renders detail match rows with placeholder - when accordion is expanded', () => {
      const mockLiveData: LiveSeasonDetails = {
        season: '2026/27',
        competitionId: 1,
        lastCompletedRound: 1,
        totalRounds: 26,
        rounds: [
          {
            roundNumber: 1,
            matches: [
              {
                homeManagerId: 'm_tazio',
                awayManagerId: 'm_avvisatina',
                homeTeam: 'Kiwi FC',
                awayTeam: 'LoTUS FC',
                homeOutcome: 'W',
                awayOutcome: 'L',
                isPlayed: true
              } as any
            ]
          },
          {
            roundNumber: 14,
            matches: [
              {
                homeManagerId: 'm_avvisatina',
                awayManagerId: 'm_tazio',
                homeTeam: 'LoTUS FC',
                awayTeam: 'Kiwi FC',
                isPlayed: false
              } as any
            ]
          }
        ],
        standings: []
      };

      const html = renderMatchupModalHTML(mgrA, mgrB, allManagers, mockLiveData, true);

      // Accordion button changes to Nascondi
      expect(html).toContain('Nascondi Dettaglio Gare');

      // Both matches rendered with season/round
      expect(html).toContain('2026/27 &bull; G1');
      expect(html).toContain('2026/27 &bull; G14');

      // Team names
      expect(html).toContain('Kiwi FC');
      expect(html).toContain('LoTUS FC');

      // Explicit '-' placeholder present instead of numbers
      expect(html).toContain('title="Risultato numerico non mostrato"');
      expect(html).toContain('-');

      // Status badges
      expect(html).toContain('W Tazio');
      expect(html).toContain('In programma');
    });
  });

  describe('MatchupModal Lifecycle & State Controller', () => {
    it('opens and closes the matchup modal properly', () => {
      openMatchupModal('m_tazio', 'm_avvisatina');
      expect(isMatchupOpen()).toBe(true);

      const selected = getSelectedMatchupManagers();
      expect(selected.idA).toBe('m_tazio');
      expect(selected.idB).toBe('m_avvisatina');

      closeMatchupModal();
      expect(isMatchupOpen()).toBe(false);
    });

    it('closes HeadToHead modal if open when opening Matchup modal and mounts with z-[90]', () => {
      const closeH2HSpy = vi.fn();
      (window as any).closeHeadToHeadModal = closeH2HSpy;

      const modalEl = mountMatchupModal();
      expect(modalEl.classList.contains('z-[90]')).toBe(true);

      openMatchupModal('m_tazio', 'm_avvisatina');
      expect(closeH2HSpy).toHaveBeenCalledWith(false);
      delete (window as any).closeHeadToHeadModal;
    });

    it('toggles detailed matches accordion via toggleMatchupDirectDetails', () => {
      openMatchupModal('m_tazio', 'm_avvisatina');
      expect(isMatchupOpen()).toBe(true);

      // Toggle expansion
      toggleMatchupDirectDetails();
      const contentEl = document.getElementById('matchup-modal-content');
      expect(contentEl?.innerHTML).toContain('Nascondi Dettaglio Gare');

      // Toggle back
      toggleMatchupDirectDetails();
      expect(contentEl?.innerHTML).toContain('Mostra Dettaglio Gare');
    });

    it('preserves scroll position when toggling direct details accordion', () => {
      openMatchupModal('m_tazio', 'm_avvisatina');
      const contentEl = document.getElementById('matchup-modal-content');
      const scrollEl = contentEl?.querySelector('.overflow-y-auto') as HTMLElement | null;
      if (scrollEl) {
        scrollEl.scrollTop = 350;
      }

      toggleMatchupDirectDetails();

      const newScrollEl = contentEl?.querySelector('.overflow-y-auto') as HTMLElement | null;
      expect(newScrollEl?.scrollTop).toBe(350);
    });

    it('swaps managers if selecting the opponent on manager A change', () => {
      openMatchupModal('m_tazio', 'm_avvisatina');
      changeMatchupManagerA('m_avvisatina');

      const selected = getSelectedMatchupManagers();
      expect(selected.idA).toBe('m_avvisatina');
      expect(selected.idB).toBe('m_tazio');
    });

    it('swaps managers if selecting the contender on manager B change', () => {
      openMatchupModal('m_tazio', 'm_avvisatina');
      changeMatchupManagerB('m_tazio');

      const selected = getSelectedMatchupManagers();
      expect(selected.idA).toBe('m_avvisatina');
      expect(selected.idB).toBe('m_tazio');
    });

    it('toggles and closes the matchup share dropdown menu', () => {
      openMatchupModal('m_tazio', 'm_avvisatina');
      const menu = document.getElementById('matchup-share-dropdown-menu');
      expect(menu?.classList.contains('hidden')).toBe(true);

      toggleMatchupShareDropdown();
      expect(menu?.classList.contains('hidden')).toBe(false);

      closeMatchupShareDropdown();
      expect(menu?.classList.contains('hidden')).toBe(true);
    });

    it('toggles the tactical radar guide explanation panel', () => {
      openMatchupModal('m_tazio', 'm_avvisatina');
      const panel = document.getElementById('tactical-radar-guide-panel');
      expect(panel?.classList.contains('hidden')).toBe(true);

      toggleTacticalRadarGuide();
      expect(panel?.classList.contains('hidden')).toBe(false);

      toggleTacticalRadarGuide();
      expect(panel?.classList.contains('hidden')).toBe(true);
    });

    it('exports 9:16 Story using selected matchup managers', async () => {
      const exportModule = await import('@/export');
      const storySpy = vi.spyOn(exportModule, 'exportH2HDuelStoryHD').mockResolvedValue(undefined as any);

      openMatchupModal('m_tazio', 'm_avvisatina');
      await exportMatchupStoryHD();

      expect(storySpy).toHaveBeenCalled();
      const calledWithMgrA = storySpy.mock.calls[0][0];
      const calledWithMgrB = storySpy.mock.calls[0][1];
      expect(calledWithMgrA.id).toBe('m_tazio');
      expect(calledWithMgrB.id).toBe('m_avvisatina');
      storySpy.mockRestore();
    });

    it('renders the live form widget, displays N for draws, and toggles radar scope with BIG MATCH', () => {
      // Mock live standing with draws to verify 'N' badge
      const mockLiveWithDraw: LiveSeasonDetails = {
        season: '2026/27',
        competitionId: 1,
        lastCompletedRound: 1,
        totalRounds: 26,
        rounds: [
          {
            roundNumber: 1,
            matches: [
              {
                homeTeam: 'Tazio FC',
                awayTeam: 'Avvisatina FC',
                homeManagerId: mgrA.id,
                awayManagerId: mgrB.id,
                isPlayed: true,
                homeScore: 1,
                awayScore: 1,
                homeFantaPoints: 72.5,
                awayFantaPoints: 70.0,
                homeOutcome: 'D',
                awayOutcome: 'D'
              }
            ]
          }
        ],
        standings: [
          {
            rank: 1,
            managerId: mgrA.id,
            teamName: 'Tazio FC',
            coach: 'Tazio',
            points: 1,
            avgFantaPoints: 72.5,
            recentForm: ['W', 'D', 'L', 'D', 'W']
          } as any,
          {
            rank: 2,
            managerId: mgrB.id,
            teamName: 'Avvisatina FC',
            coach: 'Avvisatina',
            points: 1,
            avgFantaPoints: 70.0,
            recentForm: ['D', 'W', 'L', 'W', 'D']
          } as any
        ]
      };
      setLiveSeasonDetails(mockLiveWithDraw);

      openMatchupModal('m_tazio', 'm_avvisatina');
      const contentEl = document.getElementById('matchup-modal-content');
      expect(contentEl?.innerHTML).toContain('Stato di Forma &amp; Trend Live');
      expect(contentEl?.innerHTML).toContain('Carriera');
      expect(contentEl?.innerHTML).toContain('Stagione');

      // Verify 'N' is rendered for draws, not 'X'
      expect(contentEl?.innerHTML).toContain('>N<');

      // When in career scope, radar shows COPPE
      expect(contentEl?.innerHTML).toContain('COPPE');

      // Toggle to season scope -> shows BIG MATCH instead of COPPE
      setMatchupScope('season');
      expect(contentEl?.innerHTML).toContain('Assetto Live');
      expect(contentEl?.innerHTML).toContain('BIG MATCH');

      setMatchupScope('career');
      expect(contentEl?.innerHTML).toContain('DNA All-Time');

      // Verify placeholder '-' when points are undefined (e.g. Levrieri)
      const mockLiveUndefinedPts: LiveSeasonDetails = {
        ...mockLiveWithDraw,
        standings: [
          {
            ...mockLiveWithDraw.standings[0],
            points: undefined
          } as any,
          mockLiveWithDraw.standings[1]
        ]
      };
      setLiveSeasonDetails(mockLiveUndefinedPts);
      openMatchupModal('m_tazio', 'm_avvisatina');
      const updatedContentEl = document.getElementById('matchup-modal-content');
      expect(updatedContentEl?.innerHTML).toContain('1&deg; • -');
    });
  });
});
