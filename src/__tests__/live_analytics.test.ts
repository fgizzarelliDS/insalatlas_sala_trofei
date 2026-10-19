import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  computeTeamMomentum,
  computeStatusBadge,
  renderFormDotsHTML,
  renderDeltaLuckBadgeHTML,
  renderStatusBadgeHTML,
  setLiveSeasonDetails
} from '@/components/board/seasons/liveAnalytics';
import { renderChampionshipTable } from '@/components/board/seasons/standingsTable';
import { openTeamMatchesModal, closeTeamMatchesModal } from '@/components/board/seasons/TeamMatchesModal';
import type { CompetitionRecord, LiveSeasonDetails } from '@/types';
import { state } from '@/state';

describe('Live In-Progress Form & Analytics Engine', () => {
  describe('computeTeamMomentum', () => {
    it('returns 1.0 for 5 consecutive wins', () => {
      expect(computeTeamMomentum(['W', 'W', 'W', 'W', 'W'])).toBe(1.0);
    });

    it('returns 0.0 for 5 consecutive losses', () => {
      expect(computeTeamMomentum(['L', 'L', 'L', 'L', 'L'])).toBe(0.0);
    });

    it('returns 0.33 for 5 consecutive draws', () => {
      expect(computeTeamMomentum(['D', 'D', 'D', 'D', 'D'])).toBe(0.33);
    });

    it('applies higher weight to recent matches (recency-weighted momentum)', () => {
      const recentHot = computeTeamMomentum(['L', 'L', 'W', 'W', 'W']);
      const recentCold = computeTeamMomentum(['W', 'W', 'W', 'L', 'L']);
      expect(recentHot).toBe(0.8);
      expect(recentCold).toBe(0.4);
      expect(recentHot).toBeGreaterThan(recentCold);
    });

    it('handles short form arrays (< 5 matches) dynamically', () => {
      expect(computeTeamMomentum(['W', 'W'])).toBe(1.0);
      expect(computeTeamMomentum(['L'])).toBe(0.0);
      expect(computeTeamMomentum([])).toBe(0.5);
    });
  });

  describe('computeStatusBadge', () => {
    it('awards 🔥 In Fiamme when momentum >= 0.75 and avgL3 >= leagueAvg + 2.0', () => {
      const res = computeStatusBadge(0.8, 78.0, 72.0, ['W', 'W', 'W', 'W', 'W']);
      expect(res.badge).toBe('🔥');
      expect(res.label).toBe('In Fiamme');
    });

    it('awards 🧊 Crisi Nera when momentum <= 0.15', () => {
      const res = computeStatusBadge(0.1, 62.0, 72.0, ['L', 'L', 'L', 'L', 'L']);
      expect(res.badge).toBe('🧊');
      expect(res.label).toBe('Crisi Nera');
    });

    it('awards 📈 In Ascesa when momentum >= 0.55 and last match is a Win', () => {
      const res = computeStatusBadge(0.6, 73.0, 72.0, ['L', 'D', 'W', 'L', 'W']);
      expect(res.badge).toBe('📈');
      expect(res.label).toBe('In Ascesa');
    });

    it('awards 📉 In Flessione when momentum <= 0.35 or last 2 matches are losses', () => {
      const res1 = computeStatusBadge(0.3, 67.0, 72.0, ['D', 'D', 'L', 'D', 'L']);
      expect(res1.badge).toBe('📉');

      const res2 = computeStatusBadge(0.4, 70.0, 72.0, ['W', 'W', 'W', 'L', 'L']);
      expect(res2.badge).toBe('📉');
    });

    it('awards ⚖️ Stabile for balanced mid-table momentum', () => {
      const res = computeStatusBadge(0.45, 71.0, 72.0, ['L', 'W', 'D', 'W', 'D']);
      expect(res.badge).toBe('⚖️');
      expect(res.label).toBe('Stabile');
    });
  });

  describe('renderFormDotsHTML & renderDeltaLuckBadgeHTML', () => {
    it('renders colored dots with V, N, P letters', () => {
      const html = renderFormDotsHTML(['W', 'D', 'L']);
      expect(html).toContain('>V</span>');
      expect(html).toContain('>N</span>');
      expect(html).toContain('>P</span>');
      expect(html).toContain('bg-emerald-500');
      expect(html).toContain('bg-amber-400');
      expect(html).toContain('bg-rose-500');
    });

    it('renders empty indicator when no matches played', () => {
      expect(renderFormDotsHTML([])).toContain('-');
    });

    it('renders schedule luck with colored badges', () => {
      const lucky = renderDeltaLuckBadgeHTML(3, 1);
      expect(lucky).toContain('+3');
      expect(lucky).toContain('#1');
      expect(lucky).toContain('text-amber-500');

      const unlucky = renderDeltaLuckBadgeHTML(-4, 2);
      expect(unlucky).toContain('-4');
      expect(unlucky).toContain('#2');
      expect(unlucky).toContain('text-emerald-500');

      const neutral = renderDeltaLuckBadgeHTML(0, 5);
      expect(neutral).toContain('#5');
      expect(neutral).toContain('(=)');
    });

    it('renders status badge pill with tooltip', () => {
      const badge = renderStatusBadgeHTML('🔥', 'In Fiamme');
      expect(badge).toContain('🔥');
      expect(badge).toContain('In Fiamme');
    });
  });

  describe('renderChampionshipTable with Live Analytics vs Graceful Fallback', () => {
    const mockChampionship: CompetitionRecord = {
      id: 863632,
      name: 'Serie Atlas',
      season: '2026/27',
      category: 'Campionato',
      in_progress: true,
      status: 'in_progress',
      ranking: [
        { rank: 1, teamName: 'Scalo San Genesio', coach: 'valeriodam', managerId: 'm_valery', points: 18 },
        { rank: 2, teamName: 'TorLupara FC', coach: 'cursimone', managerId: 'm_scurcio', points: 16 }
      ]
    };

    const mockLiveDetails: LiveSeasonDetails = {
      season: '2026/27',
      competitionId: 863632,
      lastCompletedRound: 8,
      totalRounds: 26,
      rounds: [
        {
          roundNumber: 1,
          matches: [
            {
              homeTeam: 'Scalo San Genesio',
              awayTeam: 'TorLupara FC',
              homeManagerId: 'm_valery',
              awayManagerId: 'm_scurcio',
              homeScore: 2,
              awayScore: 1,
              homeFantaPoints: 76.0,
              awayFantaPoints: 69.5
            }
          ]
        }
      ],
      standings: [
        {
          rank: 1,
          managerId: 'm_valery',
          teamName: 'Scalo San Genesio',
          coach: 'valeriodam',
          points: 18,
          played: 8,
          won: 6,
          drawn: 0,
          lost: 2,
          goalsFor: 15,
          goalsAgainst: 8,
          goalDiff: 7,
          totalFantaPoints: 612.5,
          avgFantaPoints: 76.56,
          expectedRank: 2,
          deltaLuck: 1,
          momentum: 0.8,
          recentForm: ['W', 'W', 'L', 'W', 'W'],
          statusBadge: '🔥',
          statusLabel: 'In Fiamme'
        },
        {
          rank: 2,
          managerId: 'm_scurcio',
          teamName: 'TorLupara FC',
          coach: 'cursimone',
          points: 16,
          played: 8,
          won: 5,
          drawn: 1,
          lost: 2,
          goalsFor: 13,
          goalsAgainst: 10,
          goalDiff: 3,
          totalFantaPoints: 598.0,
          avgFantaPoints: 74.75,
          expectedRank: 4,
          deltaLuck: 2,
          momentum: 0.65,
          recentForm: ['W', 'D', 'W', 'W', 'L'],
          statusBadge: '📈',
          statusLabel: 'In Ascesa'
        }
      ]
    };

    beforeEach(() => {
      state.managers = [
        { id: 'm_valery', name: 'Valerio', years: 5, gold: 1, silver: 0, bronze: 0, spoon: 0, cup_gold: 0, cup_silver: 0, supercup: 0, mundialito: 0, cartonato: 0 },
        { id: 'm_scurcio', name: 'Simone', years: 6, gold: 0, silver: 1, bronze: 0, spoon: 0, cup_gold: 1, cup_silver: 0, supercup: 0, mundialito: 0, cartonato: 0 }
      ];
    });

    afterEach(() => {
      setLiveSeasonDetails(null);
    });

    it('renders clean in-progress standings table (Pos, Squadra, Forma L5, Stato) without numeric stats clutter', () => {
      setLiveSeasonDetails(mockLiveDetails);
      const html = renderChampionshipTable(mockChampionship);

      // Verify essential columns and live indicators
      expect(html).toContain('Pos');
      expect(html).toContain('Squadra / Allenatore');
      expect(html).toContain('Forma (L5)');
      expect(html).toContain('Stato');
      expect(html).toContain('In corso • G8/26');
      expect(html).toContain('openTeamMatchesModal');

      // Verify that numeric stats (GF-GS, FantaPt) are NOT present in the table
      expect(html).not.toContain('GF-GS');
      expect(html).not.toContain('FantaPt (Exp)');

      // Verify values & badges
      expect(html).toContain('Scalo San Genesio');
      expect(html).toContain('TorLupara FC');
      expect(html).toContain('🔥');
      expect(html).toContain('📈');
    });

    it('falls back to classic 3-column table when live data is null', () => {
      setLiveSeasonDetails(null);
      const html = renderChampionshipTable(mockChampionship);

      expect(html).toContain('Posizione');
      expect(html).toContain('Squadra / Allenatore');
      expect(html).toContain('Punti');
      expect(html).not.toContain('GF-GS');
      expect(html).not.toContain('Forma (L5)');
    });
  });

  describe('TeamMatchesModal', () => {
    let origDoc: unknown;
    let origWin: unknown;
    let elements: Record<string, any>;

    beforeEach(() => {
      origDoc = (globalThis as any).document;
      origWin = (globalThis as any).window;

      class MockDOMElement {
        id: string;
        innerHTML: string = '';
        classes = new Set<string>();
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
        addEventListener() { }
      }

      elements = {
        'team-matches-modal': new MockDOMElement('team-matches-modal'),
        'team-matches-modal-content': new MockDOMElement('team-matches-modal-content')
      };
      elements['team-matches-modal'].classList.add('hidden');

      (globalThis as any).document = {
        getElementById: (id: string) => elements[id] || null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        body: {
          insertAdjacentHTML: vi.fn()
        }
      };
      (globalThis as any).window = {
        location: { search: '', href: 'http://localhost/', pathname: '/' },
        history: { pushState: vi.fn(), replaceState: vi.fn() },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        matchMedia: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
      };
    });

    afterEach(() => {
      (globalThis as any).document = origDoc;
      (globalThis as any).window = origWin;
    });

    it('opens and closes modal cleanly, displaying calendar and outcome without numeric scores', () => {
      setLiveSeasonDetails({
        season: '2026/27',
        competitionId: 863632,
        lastCompletedRound: 1,
        totalRounds: 26,
        rounds: [
          {
            roundNumber: 1,
            date: '2026-09-15',
            matches: [
              {
                homeTeam: 'Scalo San Genesio',
                awayTeam: 'Arcore 1936',
                homeManagerId: 'm_valery',
                awayManagerId: 'm_sebba',
                homeScore: 3,
                awayScore: 1,
                homeFantaPoints: 78.5,
                awayFantaPoints: 68.5
              }
            ]
          }
        ],
        standings: [
          {
            rank: 1,
            managerId: 'm_valery',
            teamName: 'Scalo San Genesio',
            coach: 'valeriodam',
            points: 3,
            played: 1,
            won: 1,
            drawn: 0,
            lost: 0,
            goalsFor: 3,
            goalsAgainst: 1,
            goalDiff: 2,
            totalFantaPoints: 78.5,
            avgFantaPoints: 78.5,
            expectedRank: 1,
            deltaLuck: 0,
            momentum: 1.0,
            recentForm: ['W'],
            statusBadge: '🔥',
            statusLabel: 'In Fiamme'
          }
        ]
      });

      openTeamMatchesModal('m_valery', 'Scalo San Genesio');
      const modal = document.getElementById('team-matches-modal');
      expect(modal).not.toBeNull();
      expect(modal?.classList.contains('hidden')).toBe(false);

      const content = document.getElementById('team-matches-modal-content');
      expect(content?.innerHTML).toContain('Scalo San Genesio');
      expect(content?.innerHTML).toContain('Arcore 1936');
      expect(content?.innerHTML).toContain('VITTORIA');

      // Verify that numeric scores and fantapoints are NOT rendered
      expect(content?.innerHTML).not.toContain('78.5');
      expect(content?.innerHTML).not.toContain('68.5');

      closeTeamMatchesModal();
      expect(modal?.classList.contains('hidden')).toBe(true);
    });

    it('manages return navigation stack between TeamMatchesModal and ProfileModal', async () => {
      const {
        openManagerProfileFromMatches,
        getTeamMatchesReturnContext
      } = await import('@/components/board/seasons/TeamMatchesModal');
      const { closeProfileModal } = await import('@/components/modals/ProfileModal');

      // Setup mock profile modal element
      class MockEl {
        classList = {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn().mockReturnValue(false)
        };
      }
      elements['manager-profile-modal'] = new MockEl();

      const openProfileSpy = vi.fn();
      const openTeamMatchesSpy = vi.fn();
      (globalThis as any).window.openProfileModal = openProfileSpy;
      (globalThis as any).window.openTeamMatchesModal = openTeamMatchesSpy;

      // 1. User clicks "Vedi Profilo Storico Allenatore" from Team Matches modal
      openManagerProfileFromMatches('m_valery', 'Scalo San Genesio');

      expect(openProfileSpy).toHaveBeenCalledWith('m_valery');
      expect(getTeamMatchesReturnContext()).toEqual({
        managerId: 'm_valery',
        teamName: 'Scalo San Genesio'
      });

      // 2. User closes Profile modal -> automatically re-opens Team Matches modal
      closeProfileModal();
      expect(openTeamMatchesSpy).toHaveBeenCalledWith('m_valery', 'Scalo San Genesio');
      expect(getTeamMatchesReturnContext()).toBeNull();
    });

    it('renders minimalist match row and supports history back navigation between teams', async () => {
      const {
        openTeamMatchesModal: openModal,
        navigateBackTeamMatchesModal,
        closeTeamMatchesModal: closeModal
      } = await import('@/components/board/seasons/TeamMatchesModal');

      setLiveSeasonDetails({
        season: '2026/27',
        competitionId: 863632,
        lastCompletedRound: 1,
        totalRounds: 26,
        rounds: [
          {
            roundNumber: 1,
            matches: [
              {
                homeTeam: 'Scalo San Genesio',
                awayTeam: 'Arcore 1936',
                homeManagerId: 'm_valery',
                awayManagerId: 'm_sebba',
                homeScore: 3,
                awayScore: 1,
                homeFantaPoints: 78.5,
                awayFantaPoints: 68.5
              }
            ]
          },
          {
            roundNumber: 2,
            matches: [
              {
                homeTeam: 'Scalo San Genesio',
                awayTeam: 'Arcore 1936',
                homeManagerId: 'm_valery',
                awayManagerId: 'm_sebba',
                homeScore: 0,
                awayScore: 0,
                homeFantaPoints: 0.0,
                awayFantaPoints: 0.0
              }
            ]
          }
        ],
        standings: [
          {
            rank: 1,
            managerId: 'm_valery',
            teamName: 'Scalo San Genesio',
            coach: 'valeriodam',
            points: 3,
            played: 1,
            won: 1,
            drawn: 0,
            lost: 0,
            goalsFor: 3,
            goalsAgainst: 1,
            goalDiff: 2,
            totalFantaPoints: 78.5,
            avgFantaPoints: 78.5,
            expectedRank: 1,
            deltaLuck: 0,
            momentum: 1.0,
            recentForm: ['W'],
            statusBadge: '🔥',
            statusLabel: 'In Fiamme'
          },
          {
            rank: 2,
            managerId: 'm_sebba',
            teamName: 'Arcore 1936',
            coach: 'sebbadavid',
            points: 0,
            played: 1,
            won: 0,
            drawn: 0,
            lost: 1,
            goalsFor: 1,
            goalsAgainst: 3,
            goalDiff: -2,
            totalFantaPoints: 68.5,
            avgFantaPoints: 68.5,
            expectedRank: 2,
            deltaLuck: 0,
            momentum: 0.0,
            recentForm: ['L'],
            statusBadge: '🧊',
            statusLabel: 'Crisi Nera'
          }
        ]
      });

      // 1. Open for Scalo San Genesio
      openModal('m_valery', 'Scalo San Genesio');
      const content = document.getElementById('team-matches-modal-content');
      expect(content?.innerHTML).toContain('Arcore 1936');
      expect(content?.innerHTML).toContain('VITTORIA');
      expect(content?.innerHTML).not.toContain('CASA');
      expect(content?.innerHTML).not.toContain('TRASFERTA');
      expect(content?.innerHTML).not.toContain('vs sebbadavid');
      // Unplayed G2 match has no outcome yet and renders simple '-' instead of PAREGGIO
      expect(content?.innerHTML).toContain('G2');
      expect(content?.innerHTML).toContain('select-none">-</span>');
      expect(content?.innerHTML).not.toContain('PAREGGIO');
      // No back button initially
      expect(content?.innerHTML).not.toContain('navigateBackTeamMatchesModal');

      // 2. Click opponent to open Arcore 1936
      openModal('m_sebba', 'Arcore 1936');
      expect(content?.innerHTML).toContain('Scalo San Genesio');
      expect(content?.innerHTML).toContain('SCONFITTA');
      // Back button appears
      expect(content?.innerHTML).toContain('navigateBackTeamMatchesModal');

      // 3. Navigate back
      navigateBackTeamMatchesModal();
      expect(content?.innerHTML).toContain('Scalo San Genesio');
      expect(content?.innerHTML).toContain('Arcore 1936');
      expect(content?.innerHTML).toContain('VITTORIA');

      closeModal();
    });
  });
});
