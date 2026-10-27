import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  computeTeamMomentum,
  computeStatusBadge,
  renderFormDotsHTML,
  renderDeltaLuckBadgeHTML,
  renderStatusBadgeHTML,
  renderLuckBadgeHTML,
  renderDeltaRankPillHTML,
  renderDeltaPointsPillHTML,
  renderPodiumSVG,
  setLiveSeasonDetails
} from '@/components/board/seasons/liveAnalytics';
import {
  renderChampionshipTable,
  switchLiveStandingsView,
  switchMeritSort,
  toggleMobileMeritSort
} from '@/components/board/seasons/standingsTable';
import { openTeamMatchesModal, closeTeamMatchesModal } from '@/components/board/seasons/TeamMatchesModal';
import {
  renderNextRoundStrip,
  toggleNextRoundAccordion,
  toggleNextRoundGuide,
  buildNextRoundGuideHTML,
  computeMatchClima
} from '@/components/board/seasons/NextRoundStrip';
import {
  buildTeamMatchesShareText,
  buildMeritStandingsShareText,
  buildRealStandingsShareText
} from '@/export/share';
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

    it('renders analytical summary strip in TeamMatchesModal with all-play record and luck badge', () => {
      setLiveSeasonDetails({
        season: '2026/27',
        competitionId: 863632,
        lastCompletedRound: 1,
        totalRounds: 26,
        standings: [
          {
            rank: 1,
            points: 3,
            managerId: 'm_valery',
            teamName: 'Scalo San Genesio',
            coach: 'valeriodam',
            recentForm: ['W'],
            statusBadge: '🔥',
            statusLabel: 'In Fiamme',
            scheduleLuck: {
              xPoints: 2.85,
              deltaPoints: 0.15,
              xRank: 1,
              deltaRank: 0,
              allPlayRecord: { played: 13, wins: 12, draws: 0, losses: 1, winPct: 92.3 },
              luckZScore: 1.25,
              luckBadge: '🍀',
              luckLabel: 'Fortunato'
            }
          }
        ],
        rounds: [
          {
            roundNumber: 1,
            matches: [
              {
                homeTeam: 'Scalo San Genesio',
                awayTeam: 'Arcore 1936',
                homeOutcome: 'W',
                awayOutcome: 'L',
                isPlayed: true
              }
            ]
          }
        ]
      });

      openTeamMatchesModal('m_valery', 'Scalo San Genesio');
      const modalContent = elements['team-matches-modal-content'];
      expect(modalContent?.innerHTML).toContain('2.85 xPTS');
      expect(modalContent?.innerHTML).toContain('+0.15 pt');
      expect(modalContent?.innerHTML).toContain('vs 3 pt');
      expect(modalContent?.innerHTML).toContain('#1 in classifica (3 pt)');
      expect(modalContent?.innerHTML).toContain('12V 0N 1P');
      expect(modalContent?.innerHTML).toContain('92.3%');
      expect(modalContent?.innerHTML).toContain('Fortunato');
      closeTeamMatchesModal();
    });
  });

  describe('Schedule Luck, xPTS & 2-Way View Switching', () => {
    it('renders luck badges correctly for all 5 categories', () => {
      const lucky = renderLuckBadgeHTML('🍀', 'Favorevole', 1.45);
      expect(lucky).toContain('🍀');
      expect(lucky).toContain('Favorevole');
      expect(lucky).toContain('+1.45σ');
      expect(lucky).toContain('bg-emerald-500/20');

      const positive = renderLuckBadgeHTML('↗️', 'Positivo', 0.65);
      expect(positive).toContain('↗️');
      expect(positive).toContain('Positivo');
      expect(positive).toContain('+0.65σ');

      const neutral = renderLuckBadgeHTML('⚖️', 'Neutro', 0.0);
      expect(neutral).toContain('⚖️');
      expect(neutral).toContain('Neutro');
      expect(neutral).toContain('0.00σ');

      const unlucky = renderLuckBadgeHTML('↘️', 'Sfortunato', -0.75);
      expect(unlucky).toContain('↘️');
      expect(unlucky).toContain('Sfortunato');
      expect(unlucky).toContain('-0.75σ');

      const battered = renderLuckBadgeHTML('⛈️', 'Bersagliato', -1.82);
      expect(battered).toContain('⛈️');
      expect(battered).toContain('Bersagliato');
      expect(battered).toContain('-1.82σ');
      expect(battered).toContain('bg-rose-500/20');
    });

    it('renders delta rank comparison pills correctly', () => {
      const gain = renderDeltaRankPillHTML(3, 4);
      expect(gain).toContain('▲ +3');
      expect(gain).toContain('bg-emerald-100');

      const drop = renderDeltaRankPillHTML(-2, 1);
      expect(drop).toContain('▼ -2');
      expect(drop).toContain('bg-rose-100');

      const equal = renderDeltaRankPillHTML(0, 5);
      expect(equal).toContain('= 0');
      expect(equal).toContain('bg-slate-100');
    });

    it('renders delta points pills correctly', () => {
      const luckyPts = renderDeltaPointsPillHTML(1.42);
      expect(luckyPts).toContain('+1.42 pt');
      expect(luckyPts).toContain('text-emerald-800');

      const unluckyPts = renderDeltaPointsPillHTML(-1.85);
      expect(unluckyPts).toContain('-1.85 pt');
      expect(unluckyPts).toContain('text-rose-800');

      const neutralPts = renderDeltaPointsPillHTML(0.0);
      expect(neutralPts).toContain('0.00 pt');

      const placeholderPts = renderDeltaPointsPillHTML(1.42, false);
      expect(placeholderPts).toContain('-');
      expect(placeholderPts).not.toContain('+1.42 pt');
    });

    it('renders 2-way toggle in standings table and switches views smoothly', () => {
      const mockComp: CompetitionRecord = {
        id: 863632,
        name: 'Campionato',
        season: '2026/27',
        category: 'championship',
        in_progress: true,
        ranking: [
          { rank: 1, teamName: 'Steven Bradbury FC', coach: 'alfius91', managerId: 'm_alfo', points: 3 },
          { rank: 2, teamName: 'TorLupara FC', coach: 'cursimone', managerId: 'm_scurcio', points: 1 }
        ]
      };

      setLiveSeasonDetails({
        season: '2026/27',
        competitionId: 863632,
        lastCompletedRound: 1,
        totalRounds: 26,
        rounds: [],
        standings: [
          {
            rank: 1,
            points: 3,
            managerId: 'm_alfo',
            teamName: 'Steven Bradbury FC',
            coach: 'alfius91',
            recentForm: ['W'],
            statusBadge: '🔥',
            statusLabel: 'In Fiamme',
            scheduleLuck: {
              xPoints: 2.77,
              deltaPoints: 0.23,
              xRank: 1,
              deltaRank: 0,
              allPlayRecord: { played: 13, wins: 12, draws: 0, losses: 1, winPct: 92.3 },
              luckZScore: 0.0,
              luckBadge: '⚖️',
              luckLabel: 'Neutro'
            }
          },
          {
            rank: 2,
            managerId: 'm_scurcio',
            teamName: 'TorLupara FC',
            coach: 'cursimone',
            recentForm: ['D'],
            statusBadge: '📉',
            statusLabel: 'In Flessione',
            scheduleLuck: {
              xPoints: 2.08,
              deltaPoints: -1.08,
              xRank: 2,
              deltaRank: 0,
              allPlayRecord: { played: 13, wins: 8, draws: 3, losses: 2, winPct: 61.5 },
              luckZScore: -1.65,
              luckBadge: '⛈️',
              luckLabel: 'Bersagliato'
            }
          }
        ]
      });

      const tableHTML = renderChampionshipTable(mockComp);
      expect(tableHTML).toContain('btn-live-view-real');
      expect(tableHTML).toContain('btn-live-view-merit');
      expect(tableHTML).toContain('live-view-real-container');
      expect(tableHTML).toContain('live-view-merit-container');
      expect(tableHTML).toContain('guide-content-real');
      expect(tableHTML).toContain('guide-content-merit');
      // Assert dynamic real points when present and placeholder when undefined
      expect(tableHTML).toContain('Reale #1 (3 pt)');
      expect(tableHTML).toContain('vs 3 pt');
      expect(tableHTML).toContain('Reale #2 (- pt)');
      expect(tableHTML).toContain('vs - pt');

      // Test view switching DOM manipulation with Mock Elements
      class MockElement {
        classes = new Set<string>();
        classList = {
          add: (...cls: string[]) => cls.forEach(c => this.classes.add(c)),
          remove: (...cls: string[]) => cls.forEach(c => this.classes.delete(c)),
          contains: (cls: string) => this.classes.has(cls)
        };
      }

      const elements: Record<string, MockElement> = {
        'btn-live-view-real': new MockElement(),
        'btn-live-view-merit': new MockElement(),
        'live-view-real-container': new MockElement(),
        'live-view-merit-container': new MockElement(),
        'guide-content-real': new MockElement(),
        'guide-content-merit': new MockElement()
      };

      elements['live-view-merit-container'].classList.add('hidden');
      elements['guide-content-merit'].classList.add('hidden');

      const origDoc = (globalThis as any).document;
      (globalThis as any).document = {
        getElementById: (id: string) => elements[id] || null
      };

      try {
        expect(elements['live-view-real-container'].classList.contains('hidden')).toBe(false);
        expect(elements['live-view-merit-container'].classList.contains('hidden')).toBe(true);

        // Switch to merit view
        switchLiveStandingsView('merit');
        expect(elements['live-view-real-container'].classList.contains('hidden')).toBe(true);
        expect(elements['live-view-merit-container'].classList.contains('hidden')).toBe(false);
        expect(elements['guide-content-real'].classList.contains('hidden')).toBe(true);
        expect(elements['guide-content-merit'].classList.contains('hidden')).toBe(false);

        // Switch back to real view
        switchLiveStandingsView('real');
        expect(elements['live-view-real-container'].classList.contains('hidden')).toBe(false);
        expect(elements['live-view-merit-container'].classList.contains('hidden')).toBe(true);
        expect(elements['guide-content-real'].classList.contains('hidden')).toBe(false);
        expect(elements['guide-content-merit'].classList.contains('hidden')).toBe(true);
      } finally {
        (globalThis as any).document = origDoc;
      }
    });

    it('renders vector micro-SVG podium icon with correct viewBox and steps', () => {
      const svg = renderPodiumSVG(16, 'custom-podium');
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(svg).toContain('width="16"');
      expect(svg).toContain('height="16"');
      expect(svg).toContain('custom-podium');
      expect(svg).toContain('aria-label="Podio"');
      expect(svg).toContain('>1</text>');
      expect(svg).toContain('>2</text>');
      expect(svg).toContain('>3</text>');
    });

    it('toggles interactive merit sorting between xPTS and luck', () => {
      class MockElement {
        classes = new Set<string>();
        textContent: string = '';
        classList = {
          add: (...cls: string[]) => cls.forEach(c => this.classes.add(c)),
          remove: (...cls: string[]) => cls.forEach(c => this.classes.delete(c)),
          contains: (cls: string) => this.classes.has(cls)
        };
      }

      const elements: Record<string, MockElement> = {
        'th-merit-sort-xpts': new MockElement(),
        'th-merit-sort-luck': new MockElement(),
        'sort-icon-merit-xpts': new MockElement(),
        'sort-icon-merit-luck': new MockElement(),
        'label-merit-sort-mobile': new MockElement(),
        'merit-desktop-tbody-xpts': new MockElement(),
        'merit-desktop-tbody-luck': new MockElement(),
        'merit-mobile-cards-xpts': new MockElement(),
        'merit-mobile-cards-luck': new MockElement()
      };

      elements['merit-desktop-tbody-luck'].classList.add('hidden');
      elements['merit-mobile-cards-luck'].classList.add('hidden');
      elements['sort-icon-merit-luck'].classList.add('hidden');

      const origDoc = (globalThis as any).document;
      (globalThis as any).document = {
        getElementById: (id: string) => elements[id] || null
      };

      try {
        expect(elements['merit-desktop-tbody-xpts'].classList.contains('hidden')).toBe(false);
        expect(elements['merit-desktop-tbody-luck'].classList.contains('hidden')).toBe(true);

        switchMeritSort('luck');
        expect(elements['merit-desktop-tbody-xpts'].classList.contains('hidden')).toBe(true);
        expect(elements['merit-desktop-tbody-luck'].classList.contains('hidden')).toBe(false);
        expect(elements['merit-mobile-cards-xpts'].classList.contains('hidden')).toBe(true);
        expect(elements['merit-mobile-cards-luck'].classList.contains('hidden')).toBe(false);
        expect(elements['sort-icon-merit-luck'].classList.contains('hidden')).toBe(false);
        expect(elements['sort-icon-merit-xpts'].classList.contains('hidden')).toBe(true);
        expect(elements['label-merit-sort-mobile'].textContent).toBe('Fortuna (Z-Score)');

        toggleMobileMeritSort();
        expect(elements['merit-desktop-tbody-xpts'].classList.contains('hidden')).toBe(false);
        expect(elements['merit-desktop-tbody-luck'].classList.contains('hidden')).toBe(true);
        expect(elements['merit-mobile-cards-xpts'].classList.contains('hidden')).toBe(false);
        expect(elements['merit-mobile-cards-luck'].classList.contains('hidden')).toBe(true);
        expect(elements['sort-icon-merit-xpts'].classList.contains('hidden')).toBe(false);
        expect(elements['sort-icon-merit-luck'].classList.contains('hidden')).toBe(true);
        expect(elements['label-merit-sort-mobile'].textContent).toBe('xPTS (Merito)');
      } finally {
        (globalThis as any).document = origDoc;
      }
    });

    it('renders Monte Carlo podium SVG and Spoon pills on mobile cards when unlocked', () => {
      const mockComp: CompetitionRecord = {
        id: 863632,
        name: 'Campionato In Corso',
        season: '2025-2026',
        category: 'championship',
        in_progress: true,
        ranking: [{ rank: 1, teamName: 'FC Bovisa', managerId: 'm_lucar', points: 15, coach: 'Luca R.' }]
      };

      setLiveSeasonDetails({
        season: '2025-2026',
        competitionId: 863632,
        lastCompletedRound: 5,
        totalRounds: 26,
        rounds: [],
        standings: [
          {
            rank: 1,
            managerId: 'm_lucar',
            teamName: 'FC Bovisa',
            coach: 'Luca R.',
            recentForm: ['W', 'W', 'W', 'W', 'W'],
            statusBadge: '🔥',
            statusLabel: 'In Fiamme',
            scheduleLuck: {
              xPoints: 3.0,
              deltaPoints: 0.0,
              xRank: 1,
              deltaRank: 0,
              allPlayRecord: { played: 13, wins: 12, draws: 0, losses: 1, winPct: 92.3 },
              luckZScore: 0.0,
              luckBadge: '⚖️',
              luckLabel: 'Neutro',
              monteCarlo: {
                medianPoints: 45.0,
                stdDev: 6.2,
                pPodiumPct: 88.4,
                pSpoonPct: 0.2
              }
            }
          }
        ]
      });

      const tableHTML = renderChampionshipTable(mockComp);
      expect(tableHTML).toContain('88.4%');
      expect(tableHTML).toContain('0.2%');
      expect(tableHTML).toContain('aria-label="Podio"');
    });
  });

  describe('Live Standings & Team Matches Sharing and Deep-Linking', () => {
    const mockTeamMetric = {
      rank: 2,
      managerId: 'm_scurcio',
      teamName: 'TorLupara FC',
      coach: 'cursimone',
      scheduleLuck: {
        xPoints: 2.08,
        xRank: 2,
        deltaRank: 0,
        allPlayRecord: { played: 13, wins: 8, draws: 3, losses: 2, winPct: 61.5 },
        luckZScore: -1.65,
        luckBadge: '⛈️' as const,
        luckLabel: 'Bersagliato',
        monteCarlo: { medianPoints: 2.08, stdDev: 0.5, pPodiumPct: null, pSpoonPct: null }
      }
    };

    it('builds rich formatted WhatsApp share text for team matches', () => {
      const shareUrl = 'https://insalatlas.it/?tab=seasons&team=TorLupara%20FC';
      const text = buildTeamMatchesShareText(mockTeamMetric as any, shareUrl);

      expect(text).toContain('*TorLupara FC* (cursimone)');
      expect(text).toContain('Posizione Reale: #2');
      expect(text).toContain('Merito:* #2 (2.08 xPTS)');
      expect(text).toContain('⛈️ Bersagliato (-1.65σ)');
      expect(text).toContain('8V 3N 2P (61.5%)');
      expect(text).toContain(shareUrl);
    });

    it('builds rich formatted WhatsApp share text for Merit Standings', () => {
      const shareUrl = 'https://insalatlas.it/?tab=seasons&view=merit';
      const standings = [
        mockTeamMetric,
        {
          rank: 1,
          managerId: 'm_alfo',
          teamName: 'Steven Bradbury FC',
          coach: 'alfius91',
          scheduleLuck: {
            xPoints: 2.77,
            xRank: 1,
            deltaRank: 0,
            allPlayRecord: { played: 13, wins: 12, draws: 0, losses: 1, winPct: 92.3 },
            luckZScore: 0.0,
            luckBadge: '⚖️' as const,
            luckLabel: 'Neutro'
          }
        }
      ];

      const text = buildMeritStandingsShareText(standings as any, shareUrl);
      expect(text).toContain('Classifica di Merito (xPTS)');
      expect(text).toContain('🥇 #1 *Steven Bradbury FC* (2.77 xPTS)');
      expect(text).toContain('🥈 #2 *TorLupara FC* (2.08 xPTS)');
      expect(text).toContain(shareUrl);
    });

    it('syncs ?team= to window.history on openTeamMatchesModal and removes on close', () => {
      let currentUrl = 'https://insalatlas.it/?tab=seasons';
      const pushSpy = vi.fn((_state, _title, url) => {
        currentUrl = url.toString();
        if (typeof window !== 'undefined' && window.location) {
          (window.location as any).href = currentUrl;
          (window.location as any).search = currentUrl.includes('?') ? currentUrl.slice(currentUrl.indexOf('?')) : '';
        }
      });
      const replaceSpy = vi.fn((_state, _title, url) => {
        currentUrl = url.toString();
        if (typeof window !== 'undefined' && window.location) {
          (window.location as any).href = currentUrl;
          (window.location as any).search = currentUrl.includes('?') ? currentUrl.slice(currentUrl.indexOf('?')) : '';
        }
      });

      const origHistory = typeof window !== 'undefined' ? window.history : undefined;
      const origLocation = typeof window !== 'undefined' ? window.location : undefined;

      const elements: Record<string, any> = {
        'team-matches-modal': {
          classList: {
            classes: new Set<string>(['hidden']),
            add: (c: string) => elements['team-matches-modal'].classList.classes.add(c),
            remove: (c: string) => elements['team-matches-modal'].classList.classes.delete(c),
            contains: (c: string) => elements['team-matches-modal'].classList.classes.has(c)
          },
          innerHTML: ''
        },
        'team-matches-modal-content': { innerHTML: '' },
        'team-matches-dialog': { innerHTML: '' }
      };

      const origDoc = (globalThis as any).document;
      (globalThis as any).document = {
        getElementById: (id: string) => elements[id] || null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        body: { insertAdjacentHTML: vi.fn() }
      };

      (globalThis as any).window = (globalThis as any).window || {};
      (globalThis as any).window.history = { pushState: pushSpy, replaceState: replaceSpy };
      (globalThis as any).window.location = new URL(currentUrl);

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
                homeTeam: 'TorLupara FC',
                awayTeam: 'Levrieri d Abruzzo',
                homeManagerId: 'm_scurcio',
                awayManagerId: 'm_gizzagustacito',
                isPlayed: true,
                homeOutcome: 'D',
                awayOutcome: 'D'
              }
            ]
          }
        ],
        standings: [mockTeamMetric as any]
      });

      openTeamMatchesModal('m_scurcio', 'TorLupara FC', false, true);

      expect(pushSpy).toHaveBeenCalled();
      const calledUrl = pushSpy.mock.calls[0][2] as string;
      expect(calledUrl).toContain('team=TorLupara');

      // Verify 3 share dropdown options in DOM (PNG, Copia, WA Link)
      const content = elements['team-matches-modal-content'];
      expect(content.innerHTML).toContain('btn-team-matches-share');
      expect(content.innerHTML).toContain('team-matches-share-dropdown');
      expect(content.innerHTML).toContain('Scarica Scheda PNG (HD)');
      expect(content.innerHTML).toContain('Copia per WhatsApp');
      expect(content.innerHTML).toContain('Invia Link WhatsApp');

      closeTeamMatchesModal(true);
      expect(replaceSpy).toHaveBeenCalled();

      // Cleanup
      (globalThis as any).document = origDoc;
      if (origHistory) (globalThis as any).window.history = origHistory;
      if (origLocation) (globalThis as any).window.location = origLocation;
    });

    it('asynchronously fetches live_season_details and opens modal when cache is initially null', async () => {
      const origFetch = globalThis.fetch;
      const elements: Record<string, any> = {
        'team-matches-modal': {
          classList: {
            classes: new Set<string>(['hidden']),
            add: (c: string) => elements['team-matches-modal'].classList.classes.add(c),
            remove: (c: string) => elements['team-matches-modal'].classList.classes.delete(c),
            contains: (c: string) => elements['team-matches-modal'].classList.classes.has(c)
          },
          innerHTML: ''
        },
        'team-matches-modal-content': { innerHTML: '' },
        'team-matches-dialog': { innerHTML: '' }
      };

      const origDoc = (globalThis as any).document;
      (globalThis as any).document = {
        getElementById: (id: string) => elements[id] || null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        body: { insertAdjacentHTML: vi.fn() }
      };

      setLiveSeasonDetails(null);

      const fakePayload = {
        season: '2026/27',
        competitionId: 863632,
        lastCompletedRound: 1,
        totalRounds: 26,
        rounds: [
          {
            roundNumber: 1,
            matches: [
              {
                homeTeam: 'Sarviette FC',
                awayTeam: 'Arcore 1936',
                isPlayed: true,
                homeOutcome: 'W',
                awayOutcome: 'L'
              }
            ]
          }
        ],
        standings: [
          {
            rank: 1,
            teamName: 'Sarviette FC',
            coach: 'sarviette',
            managerId: 'm_sarviette',
            recentForm: ['W'],
            statusBadge: '🔥',
            statusLabel: 'In Fiamme',
            scheduleLuck: {
              xPoints: 3.0,
              deltaPoints: 0.0,
              allPlayRecord: { played: 13, wins: 13, draws: 0, losses: 0, winPct: 100 },
              luckZScore: 0.5,
              luckBadge: '🍀',
              luckLabel: 'Fortunato'
            }
          }
        ]
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => fakePayload
      });

      await openTeamMatchesModal(undefined, 'Sarviette FC', false, false);

      expect(elements['team-matches-modal'].classList.contains('flex')).toBe(true);
      expect(elements['team-matches-modal'].classList.contains('hidden')).toBe(false);
      expect(elements['team-matches-modal-content'].innerHTML).toContain('Sarviette FC');

      // Cleanup
      globalThis.fetch = origFetch;
      (globalThis as any).document = origDoc;
    });

    it('formats real standings snapshot text for WhatsApp correctly', () => {
      const mockStandings = [
        { rank: 1, teamName: 'TorLupara FC', points: 18 },
        { rank: 2, teamName: 'Scalo San Genesio', points: 16 },
        { rank: 3, teamName: 'Levrieri d Abruzzo', points: 14 }
      ];
      const text = buildRealStandingsShareText(mockStandings, 'https://insalatlas.it?tab=seasons&view=real');
      expect(text).toContain('Classifica Ufficiale');
      expect(text).toContain('TorLupara FC');
      expect(text).toContain('18 pt');
      expect(text).toContain('Scalo San Genesio');
      expect(text).toContain('16 pt');
      expect(text).toContain('https://insalatlas.it?tab=seasons&view=real');
    });

    it('renders NextRoundStrip with duel probability gauge and handles upcoming rounds', async () => {
      const { findUpcomingRound, renderNextRoundStrip } = await import('@/components/board/seasons/NextRoundStrip');
      const fakeLiveSeason: any = {
        season: '2026/27',
        lastCompletedRound: 3,
        totalRounds: 26,
        rounds: [
          {
            roundNumber: 1,
            matches: [{ homeTeam: 'A', awayTeam: 'B', isPlayed: true }]
          },
          {
            roundNumber: 2,
            matches: [
              {
                homeTeam: 'Team Alpha',
                awayTeam: 'Team Beta',
                homeManagerId: 'm_alpha',
                awayManagerId: 'm_beta',
                isPlayed: false,
                winProbHomeFlat: 62.0,
                winProbHomeHistorical: 58.0,
                winProbHomeAtlas: 65.5
              }
            ]
          }
        ],
        standings: [
          {
            managerId: 'm_alpha',
            teamName: 'Team Alpha',
            elo: {
              flat: { current: 1540.0 },
              historical: { current: 1520.0 },
              atlas: { current: 1560.0 }
            }
          },
          {
            managerId: 'm_beta',
            teamName: 'Team Beta',
            elo: {
              flat: { current: 1460.0 },
              historical: { current: 1480.0 },
              atlas: { current: 1440.0 }
            }
          }
        ]
      };

      const upcoming = findUpcomingRound(fakeLiveSeason);
      expect(upcoming?.roundNumber).toBe(2);

      // Render with default flat mode
      const htmlFlat = renderNextRoundStrip(fakeLiveSeason, 'flat');
      expect(htmlFlat).toContain('Prossimo Turno • Giornata 2');
      expect(htmlFlat).toContain('Team Alpha');
      expect(htmlFlat).toContain('Team Beta');
      expect(htmlFlat).toContain('62%');
      expect(htmlFlat).toContain('38%');
      expect(htmlFlat).toContain('⚡ Elo Puro (1500)');

      // Render with atlas mode
      const htmlAtlas = renderNextRoundStrip(fakeLiveSeason, 'atlas');
      expect(htmlAtlas).toContain('66%'); // 65.5 rounded
      expect(htmlAtlas).toContain('35%'); // 100 - 65.5 = 34.5 rounded to 35%
      expect(htmlAtlas).toContain('🔮 Atlas Power');
      expect(htmlAtlas).toContain('openHeadToHeadModal');
    });

    it('resolves Atlas track probabilities in TeamMatchesModal correctly', async () => {
      const { openTeamMatchesModal } = await import('@/components/board/seasons/TeamMatchesModal');
      const { setEloMode } = await import('@/analytics/analyticsCore');
      const { setLiveSeasonDetails } = await import('@/components/board/seasons/liveAnalytics');

      const elements: Record<string, any> = {
        'team-matches-modal': {
          classList: {
            classes: new Set<string>(['hidden']),
            add: (c: string) => elements['team-matches-modal'].classList.classes.add(c),
            remove: (c: string) => elements['team-matches-modal'].classList.classes.delete(c),
            contains: (c: string) => elements['team-matches-modal'].classList.classes.has(c)
          },
          innerHTML: ''
        },
        'team-matches-modal-content': { innerHTML: '' },
        'team-matches-dialog': { innerHTML: '' }
      };

      const origDoc = (globalThis as any).document;
      (globalThis as any).document = {
        getElementById: (id: string) => elements[id] || null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        body: { insertAdjacentHTML: vi.fn() }
      };

      setLiveSeasonDetails(null);
      setEloMode('atlas');

      const fakePayload: any = {
        season: '2026/27',
        lastCompletedRound: 1,
        totalRounds: 26,
        rounds: [
          {
            roundNumber: 1,
            matches: [
              {
                homeTeam: 'Team Atlas Home',
                awayTeam: 'Team Atlas Away',
                homeManagerId: 'm_atlas_h',
                awayManagerId: 'm_atlas_a',
                homeScore: 2,
                awayScore: 0,
                isPlayed: true,
                winProbHomeFlat: 50.0,
                winProbHomeAtlas: 75.0,
                eloDeltaHomeAtlas: 14.5
              }
            ]
          }
        ],
        standings: [
          {
            rank: 1,
            managerId: 'm_atlas_h',
            teamName: 'Team Atlas Home',
            elo: { atlas: { current: 1530.0 } }
          }
        ]
      };

      const origFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => fakePayload
      });

      await openTeamMatchesModal('m_atlas_h', 'Team Atlas Home', false, false);
      const content = elements['team-matches-modal-content'];
      expect(content?.innerHTML).toContain('Team Atlas Away');
      expect(content?.innerHTML).toContain('+15 pt');
      expect(content?.innerHTML).toContain('Probabilità Vittoria');
      expect(content?.innerHTML).toContain('75%');

      // Cleanup
      globalThis.fetch = origFetch;
      (globalThis as any).document = origDoc;
      setEloMode('flat');
    });

    it('renders Next Round strip (Option C) with educational guide, Bradley-Terry formula and 7 clima categories', async () => {
      const guideHtml = buildNextRoundGuideHTML();
      expect(guideHtml).toContain('Previsioni probabilistiche calcolate dal modello Elo Bradley-Terry prima del calcio d\'inizio.');
      expect(guideHtml).toContain('Formula Curva Logistica di Bradley-Terry');
      expect(guideHtml).toContain('Fattore di Scala');
      expect(guideHtml).toContain('AL VERTICE');
      expect(guideHtml).toContain('TESTACODA');
      expect(guideHtml).toContain('TRAPPOLA');
      expect(guideHtml).toContain('SUL FILO');
      expect(guideHtml).toContain('CORSA PLAYOFF');
      expect(guideHtml).toContain('SALVEZZA');
      expect(guideHtml).toContain('DUELLO');

      // Clima computation checks
      expect(computeMatchClima(1, 14, 1580, 1420, 75).label).toBe('↕️ TESTACODA');
      expect(computeMatchClima(1, 2, 1550, 1540, 52).label).toBe('🔥 AL VERTICE');
      expect(computeMatchClima(13, 14, 1410, 1400, 51).label).toBe('🪓 SALVEZZA');
      expect(computeMatchClima(5, 7, 1500, 1495, 50.5).label).toBe('⚖️ SUL FILO');
      expect(computeMatchClima(5, 6, 1500, 1470, 55).label).toBe('🎯 CORSA PLAYOFF');

      const mockLiveData: any = {
        season: '2025/2026',
        lastCompletedRound: 1,
        totalRounds: 26,
        rounds: [
          {
            roundNumber: 2,
            matches: [
              {
                homeTeam: 'Team Alpha',
                awayTeam: 'Team Beta',
                homeManagerId: 'm1',
                awayManagerId: 'm2',
                isPlayed: false,
                winProbHomeFlat: 54.0
              }
            ]
          }
        ],
        standings: [
          { rank: 1, managerId: 'm1', teamName: 'Team Alpha', elo: { flat: { current: 1530 } } },
          { rank: 2, managerId: 'm2', teamName: 'Team Beta', elo: { flat: { current: 1500 } } }
        ]
      };

      const stripHtml = renderNextRoundStrip(mockLiveData);
      expect(stripHtml).toContain('Prossimo Turno');
      expect(stripHtml).toContain('Giornata 2');
      expect(stripHtml).toContain('Team Alpha');
      expect(stripHtml).toContain('Team Beta');
      expect(stripHtml).toContain('#1');
      expect(stripHtml).toContain('#2');
      expect(stripHtml).toContain('1530');
      expect(stripHtml).toContain('1500');
      expect(stripHtml).toContain('54%');
      expect(stripHtml).toContain('46%');
      expect(stripHtml).toContain('Probabilità Vittoria');
      expect(stripHtml).toContain('btn-next-round-guide-toggle');
      expect(stripHtml).toContain('btn-next-round-share');
      expect(stripHtml).toContain('next-round-share-dropdown');
      expect(stripHtml).toContain('Scarica Duelli PNG (HD)');
      expect(stripHtml).toContain('Copia per WhatsApp / Telegram');

      // WhatsApp text formatting check
      const { buildNextRoundShareText } = await import('@/export/share/nextRound');
      const shareText = buildNextRoundShareText(mockLiveData, 'https://example.com/live');
      expect(shareText).toContain('PROSSIMO TURNO — GIORNATA 2');
      expect(shareText).toContain('Team Alpha');
      expect(shareText).toContain('Team Beta');
      expect(shareText).toContain('54%');
      expect(shareText).toContain('46%');
      expect(shareText).toContain('https://example.com/live');
      // Verify resolveMatchupMetrics extracts real Elo values from standings
      const { resolveMatchupMetrics } = await import('@/components/board/seasons/NextRoundStrip');
      const matchupMeta = resolveMatchupMetrics(mockLiveData.rounds[0].matches[0], 0, mockLiveData, 'flat');
      expect(matchupMeta.homeEloInt).toBe(1530);
      expect(matchupMeta.awayEloInt).toBe(1500);
      expect(matchupMeta.homeRank).toBe(1);
      expect(matchupMeta.awayRank).toBe(2);

      // Zero clutter: no Casa/Trasferta noise
      expect(stripHtml).not.toContain('(C)');
      expect(stripHtml).not.toContain('(T)');
      // Guide boxes have equal dimensions (no col-span-2)
      expect(guideHtml).not.toContain('col-span-2');
    });

    it('toggles Next Round accordion and guide box classes', () => {
      const origDoc = (globalThis as any).document;
      const elements: Record<string, any> = {
        'next-round-accordion-content': { classList: new Set(['hidden']) },
        'btn-next-round-guide-toggle': { classList: new Set(['hidden']) },
        'next-round-chevron': { style: { transform: '' } },
        'next-round-toggle-text': { textContent: 'Mostra Duelli' },
        'next-round-guide-box': { classList: new Set(['hidden']) },
        'next-round-guide-chevron': { style: { transform: '' } },
        'next-round-cards-grid': { classList: new Set([]) }
      };

      (globalThis as any).document = {
        getElementById: (id: string) => {
          const el = elements[id];
          if (!el) return null;
          return {
            classList: {
              contains: (c: string) => el.classList.has(c),
              add: (c: string) => el.classList.add(c),
              remove: (c: string) => el.classList.delete(c)
            },
            style: el.style,
            set textContent(val: string) { el.textContent = val; },
            get textContent() { return el.textContent; }
          };
        }
      };

      try {
        // Toggle accordion
        toggleNextRoundAccordion();
        expect(elements['next-round-accordion-content'].classList.has('hidden')).toBe(false);
        expect(elements['next-round-toggle-text'].textContent).toBe('Nascondi');

        // Toggle guide
        const stopPropMock = vi.fn();
        toggleNextRoundGuide({ stopPropagation: stopPropMock } as any);
        expect(stopPropMock).toHaveBeenCalled();
        expect(elements['next-round-guide-box'].classList.has('hidden')).toBe(false);
      } finally {
        (globalThis as any).document = origDoc;
      }
    });
  });
});

