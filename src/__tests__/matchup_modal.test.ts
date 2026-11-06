import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Manager, LiveSeasonDetails } from '@/types';
import {
  renderMatchupModalHTML,
  computeRoundByRoundMetrics
} from '@/components/modals/matchup/MatchupTemplate';
import {
  openMatchupModal,
  closeMatchupModal,
  changeMatchupManagerA,
  changeMatchupManagerB,
  isMatchupOpen,
  getSelectedMatchupManagers
} from '@/components/modals/matchup/MatchupModal';
import { state } from '@/state';

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
      classList: {
        classes: new Set(['hidden']),
        add(cls: string) { this.classes.add(cls); },
        remove(cls: string) { this.classes.delete(cls); },
        contains(cls: string) { return this.classes.has(cls); }
      },
      addEventListener: vi.fn()
    };

    const mockContent = {
      id: 'matchup-modal-content',
      innerHTML: ''
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
    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
  });

  describe('computeRoundByRoundMetrics', () => {
    it('returns zeros when liveData has no matches between the two contenders', () => {
      const res = computeRoundByRoundMetrics('m_tazio', 'm_avvisatina', null);
      expect(res.winsA).toBe(0);
      expect(res.winsB).toBe(0);
      expect(res.ties).toBe(0);
      expect(res.totalPlayed).toBe(0);
    });

    it('correctly tallies wins, draws, and losses from played match rounds', () => {
      const mockLiveData: LiveSeasonDetails = {
        season: '2026/27',
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
                homeOutcome: 'D',
                awayOutcome: 'D',
                isPlayed: true
              } as any
            ]
          }
        ],
        standings: []
      };

      const res = computeRoundByRoundMetrics('m_tazio', 'm_avvisatina', mockLiveData);
      expect(res.winsA).toBe(1);
      expect(res.winsB).toBe(0);
      expect(res.ties).toBe(1);
      expect(res.totalPlayed).toBe(2);
    });
  });

  describe('renderMatchupModalHTML', () => {
    it('renders the complete pre-match experience with all required cards and actions', () => {
      const html = renderMatchupModalHTML(mgrA, mgrB, allManagers, null);

      // Header
      expect(html).toContain('Matchup Tattico');
      expect(html).toContain('Pre-Partita');

      // Hero Contenders
      expect(html).toContain('Tazio');
      expect(html).toContain('Avvisatina');

      // 5-Axis Radar
      expect(html).toContain('Radar Tattico a 5 Assi');

      // Scontri diretti in campionato (Round-by-Round)
      expect(html).toContain('Scontri Diretti in Campionato (Round-by-Round)');
      expect(html).toContain('Vittorie Tazio');
      expect(html).toContain('Vittorie Avvisatina');
      expect(html).toContain('Pareggi');
      expect(html).toContain('Tabellino dettagliato delle singole sfide in arrivo');

      // Precedenti in campionato (Scoreboard)
      expect(html).toContain('Precedenti in Campionato');

      // Chiave tattica
      expect(html).toContain('Chiave Tattica');

      // 3 Action Buttons
      expect(html).toContain('Esporta Story 9:16');
      expect(html).toContain('Copia Banter WhatsApp');
      expect(html).toContain('Storico Completo H2H');
      expect(html).toContain('window.openHeadToHeadModal');
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
  });
});
