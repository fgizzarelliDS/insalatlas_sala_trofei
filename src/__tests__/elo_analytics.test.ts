import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeEloWinProbability,
  getEloMode,
  setEloMode,
  onEloModeChange,
  getEloColorHex,
  getEloBadgeClasses,
  getEloTierTitle,
  formatElo,
  formatEloDelta,
  getManagerEloTrack
} from '@/analytics/analyticsCore';
import { switchMeritSort, toggleMobileMeritSort, toggleMeritEloMode } from '@/components/board/seasons/liveMeritView';
import { switchRealSort, toggleRealEloMode } from '@/components/board/seasons/liveRealView';
import {
  renderEloTrajectorySparkline,
  selectProfileEloPoint,
  clearProfileEloHover
} from '@/components/modals/profile/CareerTab';
import {
  renderEloTab,
  selectEloChartPoint,
  clearEloChartHover,
  setCachedAnalyticsManagers,
  formatKFactorsGuide,
  switchEloChartSeason
} from '@/components/modals/analytics/EloTab';
import {
  renderEloScatterChart,
  buildScatterPoints
} from '@/components/modals/analytics/EloScatterChart';
import type { EloProfileEntry } from '@/components/modals/analytics/EloKpis';
import type { ManagerEloProfile, EloTrajectoryPoint } from '@/types/analytics';

describe('Dynamic Elo Engine Client Analytics', () => {
  beforeEach(() => {
    setEloMode('flat');
  });

  describe('Logistic Win Probability Calculation', () => {
    it('returns 50.0% for equal Elo ratings', () => {
      expect(computeEloWinProbability(1500, 1500)).toBe(50.0);
      expect(computeEloWinProbability(1650, 1650)).toBe(50.0);
    });

    it('returns symmetrical probabilities for rating disparities', () => {
      const probA = computeEloWinProbability(1600, 1400);
      const probB = computeEloWinProbability(1400, 1600);
      expect(probA).toBe(76.0);
      expect(probB).toBe(24.0);
      expect(Math.round((probA + probB) * 10) / 10).toBe(100.0);
    });

    it('handles extreme rating spreads safely without NaN', () => {
      const dominant = computeEloWinProbability(2000, 1200);
      const underdog = computeEloWinProbability(1200, 2000);
      expect(dominant).toBeGreaterThan(98.0);
      expect(underdog).toBeLessThan(2.0);
    });

    it('handles NaN gracefully with 50.0% fallback', () => {
      expect(computeEloWinProbability(NaN, 1500)).toBe(50.0);
      expect(computeEloWinProbability(1500, NaN)).toBe(50.0);
    });
  });

  describe('Elo Mode Reactive State', () => {
    it('defaults to flat mode and toggles to historical', () => {
      expect(getEloMode()).toBe('flat');
      setEloMode('historical');
      expect(getEloMode()).toBe('historical');
    });

    it('notifies subscribers upon mode change', () => {
      let notifiedMode = '';
      const unsubscribe = onEloModeChange((mode) => {
        notifiedMode = mode;
      });

      setEloMode('historical');
      expect(notifiedMode).toBe('historical');

      setEloMode('flat');
      expect(notifiedMode).toBe('flat');

      unsubscribe();
      setEloMode('historical');
      expect(notifiedMode).toBe('flat'); // Not called after unsubscribe
    });
  });

  describe('Elo Formatting & Badges', () => {
    it('formats ratings and deltas with proper signs', () => {
      expect(formatElo(1532.44)).toBe('1532.4');
      expect(formatElo(undefined)).toBe('1500.0');

      expect(formatEloDelta(12.3)).toBe('+12.3');
      expect(formatEloDelta(-8.4)).toBe('-8.4');
      expect(formatEloDelta(0.0)).toBe('0.0');
    });

    it('returns proper colors and tier titles across rating bands', () => {
      expect(getEloTierTitle(1650)).toBe('Leggenda');
      expect(getEloTierTitle(1580)).toBe('Maestro');
      expect(getEloTierTitle(1520)).toBe('Veterano');
      expect(getEloTierTitle(1450)).toBe('Sfidante');
      expect(getEloTierTitle(1400)).toBe('In Crisi');

      expect(getEloColorHex(1650)).toBe('#f59e0b');
      expect(getEloColorHex(1550)).toBe('#a855f7');
      expect(getEloColorHex(1480)).toBe('#3b82f6');
      expect(getEloBadgeClasses(1650).text).toBe('text-amber-400');
    });

    it('extracts track data according to mode', () => {
      const mockProfile: ManagerEloProfile = {
        managerId: 'm1',
        teamName: 'Team One',
        flat: {
          current: 1540.0,
          peak: { value: 1560.0, season: '2025/26', round: 10 },
          floor: { value: 1490.0, season: '2025/26', round: 3 },
          lastDelta: 8.5,
          trajectory: []
        },
        historical: {
          current: 1610.0,
          peak: { value: 1630.0, season: '2025/26', round: 10 },
          floor: { value: 1570.0, season: '2025/26', round: 3 },
          lastDelta: 9.0,
          trajectory: []
        }
      };

      expect(getManagerEloTrack(mockProfile, 'flat')?.current).toBe(1540.0);
      expect(getManagerEloTrack(mockProfile, 'historical')?.current).toBe(1610.0);
    });

    it('lazily reconstructs seasons map from trajectory when omitted from payload', () => {
      const mockProfile: ManagerEloProfile = {
        managerId: 'm1',
        teamName: 'Team One',
        flat: {
          current: 1540.0,
          peak: { value: 1560.0, season: '2025/26', round: 10 },
          floor: { value: 1490.0, season: '2025/26', round: 3 },
          lastDelta: 8.5,
          trajectory: [
            { season: '2024/25', round: 1, elo: 1510.0, delta: 10.0, opponentId: 'm2', opponentTeamName: 'T2', winProbPreMatch: 52.0, isHome: true, result: 'W' },
            { season: '2025/26', round: 1, elo: 1525.0, delta: 15.0, opponentId: 'm3', opponentTeamName: 'T3', winProbPreMatch: 48.0, isHome: false, result: 'W' }
          ]
        },
        historical: {
          current: 1610.0,
          peak: { value: 1630.0, season: '2025/26', round: 10 },
          floor: { value: 1570.0, season: '2025/26', round: 3 },
          lastDelta: 9.0,
          trajectory: []
        }
      };

      const track = getManagerEloTrack(mockProfile, 'flat');
      expect(track?.seasons).toBeDefined();
      expect(track?.seasons?.['2024/25']?.length).toBe(1);
      expect(track?.seasons?.['2025/26']?.length).toBe(1);
      expect(track?.seasons?.['2024/25']?.[0].round).toBe(1);
    });
  });

  describe('Merit View Elo Sorting & Mode Toggles', () => {
    class MockElement {
      classes = new Set<string>();
      textContent: string = '';
      innerHTML: string = '';
      className: string = '';
      classList = {
        add: (...cls: string[]) => cls.forEach(c => this.classes.add(c)),
        remove: (...cls: string[]) => cls.forEach(c => this.classes.delete(c)),
        contains: (cls: string) => this.classes.has(cls)
      };
    }

    let elements: Record<string, MockElement>;

    beforeEach(() => {
      elements = {
        'th-merit-sort-xpts': new MockElement(),
        'th-merit-sort-luck': new MockElement(),
        'th-merit-sort-elo': new MockElement(),
        'sort-icon-merit-xpts': new MockElement(),
        'sort-icon-merit-luck': new MockElement(),
        'sort-icon-merit-elo': new MockElement(),
        'label-merit-sort-mobile': new MockElement(),
        'label-merit-elo-track': new MockElement(),
        'merit-desktop-tbody-xpts': new MockElement(),
        'merit-desktop-tbody-luck': new MockElement(),
        'merit-desktop-tbody-elo': new MockElement(),
        'merit-mobile-cards-xpts': new MockElement(),
        'merit-mobile-cards-luck': new MockElement(),
        'merit-mobile-cards-elo': new MockElement()
      };

      elements['th-merit-sort-xpts'].classList.add('text-amber-500', 'font-black');
      elements['th-merit-sort-luck'].classList.add('opacity-70');
      elements['th-merit-sort-elo'].classList.add('opacity-70');
      elements['sort-icon-merit-luck'].classList.add('hidden');
      elements['sort-icon-merit-elo'].classList.add('hidden');
      elements['label-merit-sort-mobile'].textContent = 'xPTS (Merito)';
      elements['label-merit-elo-track'].textContent = '⚡ Elo Puro (1500)';

      (globalThis as any).document = {
        getElementById: (id: string) => elements[id] || null
      };
    });

    it('switches to Elo sorting order and activates proper DOM elements', () => {
      switchMeritSort('elo');

      expect(elements['th-merit-sort-elo'].classList.contains('text-amber-500')).toBe(true);
      expect(elements['sort-icon-merit-elo'].classList.contains('hidden')).toBe(false);
      expect(elements['merit-desktop-tbody-elo'].classList.contains('hidden')).toBe(false);
      expect(elements['label-merit-sort-mobile'].textContent).toBe('Elo Rating');
    });

    it('cycles mobile sort between xpts -> elo -> luck -> xpts', () => {
      switchMeritSort('xpts');
      toggleMobileMeritSort(); // from default xpts -> elo
      expect(elements['label-merit-sort-mobile'].textContent).toBe('Elo Rating');

      toggleMobileMeritSort(); // from elo -> luck
      expect(elements['label-merit-sort-mobile'].textContent).toBe('Fortuna (Z-Score)');

      toggleMobileMeritSort(); // from luck -> xpts
      expect(elements['label-merit-sort-mobile'].textContent).toBe('xPTS (Merito)');
    });

    it('toggles merit Elo mode between flat, historical, and atlas', () => {
      expect(getEloMode()).toBe('flat');
      toggleMeritEloMode();
      expect(getEloMode()).toBe('historical');
      expect(elements['label-merit-elo-track'].textContent).toBe('🏛️ Elo Storico');

      toggleMeritEloMode();
      expect(getEloMode()).toBe('atlas');
      expect(elements['label-merit-elo-track'].textContent).toBe('🔮 Atlas Power');

      toggleMeritEloMode();
      expect(getEloMode()).toBe('flat');
      expect(elements['label-merit-elo-track'].textContent).toBe('⚡ Elo Puro (1500)');
    });

    it('inverts sorting direction between desc and asc on repeat click', () => {
      switchMeritSort('elo');
      expect(elements['sort-icon-merit-elo'].className).toContain('fa-arrow-down');

      switchMeritSort('elo');
      expect(elements['sort-icon-merit-elo'].className).toContain('fa-arrow-up');

      switchMeritSort('elo');
      expect(elements['sort-icon-merit-elo'].className).toContain('fa-arrow-down');
    });
  });

  describe('Real View Elo Sorting & Direction Inversion', () => {
    class MockElement {
      classes = new Set<string>();
      textContent: string = '';
      innerHTML: string = '';
      className: string = '';
      classList = {
        add: (...cls: string[]) => cls.forEach(c => this.classes.add(c)),
        remove: (...cls: string[]) => cls.forEach(c => this.classes.delete(c)),
        contains: (cls: string) => this.classes.has(cls)
      };
    }

    let elements: Record<string, MockElement>;

    beforeEach(() => {
      elements = {
        'th-real-sort-rank': new MockElement(),
        'th-real-sort-elo': new MockElement(),
        'sort-icon-real-rank': new MockElement(),
        'sort-icon-real-elo': new MockElement(),
        'label-real-elo-track': new MockElement(),
        'real-desktop-tbody-rank': new MockElement(),
        'real-desktop-tbody-elo': new MockElement(),
        'real-mobile-cards-rank': new MockElement(),
        'real-mobile-cards-elo': new MockElement()
      };

      (globalThis as any).document = {
        getElementById: (id: string) => elements[id] || null
      };
    });

    it('activates Elo sort and inverts direction upon repeat clicks', () => {
      switchRealSort('elo');
      expect(elements['th-real-sort-elo'].classList.contains('bg-amber-500/15')).toBe(true);
      expect(elements['sort-icon-real-elo'].className).toContain('fa-arrow-down');

      switchRealSort('elo');
      expect(elements['sort-icon-real-elo'].className).toContain('fa-arrow-up');

      switchRealSort('rank');
      expect(elements['th-real-sort-rank'].classList.contains('text-amber-500')).toBe(true);
      expect(elements['th-real-sort-elo'].classList.contains('bg-amber-500/15')).toBe(false);
    });

    it('toggles real Elo mode label', () => {
      expect(getEloMode()).toBe('flat');
      toggleRealEloMode();
      expect(getEloMode()).toBe('historical');
      expect(elements['label-real-elo-track'].textContent).toBe('🏛️ Elo Storico');
    });
  });

  describe('Manager Career Elo Trajectory Sparkline', () => {
    const mockTrajectory: EloTrajectoryPoint[] = [
      {
        round: 1,
        season: '2025/26',
        elo: 1515.0,
        opponentId: 'opp1',
        opponentTeamName: 'Rival A',
        result: 'W',
        delta: 15.0,
        winProbPreMatch: 50.0,
        isHome: true
      },
      {
        round: 2,
        season: '2025/26',
        elo: 1505.0,
        opponentId: 'opp2',
        opponentTeamName: 'Rival B',
        result: 'L',
        delta: -10.0,
        winProbPreMatch: 52.0,
        isHome: false
      },
      {
        round: 1,
        season: '2026/27',
        elo: 1520.0,
        opponentId: 'opp3',
        opponentTeamName: 'Rival C',
        result: 'W',
        delta: 15.0,
        winProbPreMatch: 49.0,
        isHome: true
      }
    ];

    it('renders all trajectory points with season dividers when filter is "all"', () => {
      const svg = renderEloTrajectorySparkline(mockTrajectory, 'all', 'My Team');
      expect(svg).toContain('<svg');
      expect(svg).toContain('2026/27'); // season divider
      expect(svg).toContain('circle');
      expect(svg).toContain('1520'); // end point label
    });

    it('filters strictly by season when "2025/26" is chosen', () => {
      const svg = renderEloTrajectorySparkline(mockTrajectory, '2025/26', 'My Team');
      expect(svg).toContain('<svg');
      expect(svg).toContain('1515');
      expect(svg).not.toContain('Rival C');
    });

    it('filters strictly by season when "2026/27" is chosen', () => {
      const svg = renderEloTrajectorySparkline(mockTrajectory, '2026/27', 'My Team');
      expect(svg).toContain('<svg');
      expect(svg).toContain('1520');
      expect(svg).not.toContain('Rival A');
    });

    it('returns empty message if no matches match selected season', () => {
      const svg = renderEloTrajectorySparkline(mockTrajectory, '2024/25' as any, 'My Team');
      expect(svg).toContain('Nessun match disputato nella stagione selezionata');
    });

    it('filters by recent match window (last10, last20, last30)', () => {
      const svgLast10 = renderEloTrajectorySparkline(mockTrajectory, 'last10', 'My Team');
      expect(svgLast10).toContain('<svg');
      expect(svgLast10).toContain('1520');

      const svgLast20 = renderEloTrajectorySparkline(mockTrajectory, 'last20', 'My Team');
      expect(svgLast20).toContain('<svg');
      expect(svgLast20).toContain('1520');
    });

    it('locks on clicked point and keeps match details visible without reverting to idle prompt', () => {
      class MockBox {
        innerHTML = '';
      }
      const box = new MockBox();
      (globalThis as any).document = {
        getElementById: (id: string) => (id === 'profile-elo-hover-box' ? box : null),
        querySelector: () => null
      };

      // Initial clear shows idle prompt
      clearProfileEloHover();
      expect(box.innerHTML).toContain('Tocca o passa sui punti');

      // Click on a point
      selectProfileEloPoint(1, '2025/26', 2, 'My Team', 'Rival B', 'L', 1505.0, -10.0, 52.0);
      expect(box.innerHTML).toContain('2025/26 G2');
      expect(box.innerHTML).toContain('Rival B');
      expect(box.innerHTML).toContain('(L)');
      expect(box.innerHTML).not.toContain('Tocca o passa sui punti');

      // Subsequent mouseleave must NOT reset to idle prompt because point is locked!
      clearProfileEloHover();
      expect(box.innerHTML).toContain('2025/26 G2');
      expect(box.innerHTML).toContain('Rival B');
      expect(box.innerHTML).not.toContain('Tocca o passa sui punti');
    });

    it('locks on clicked chart point in Analisi tab and prevents reverting to idle prompt', () => {
      class MockBox {
        innerHTML = '';
      }
      const box = new MockBox();
      (globalThis as any).document = {
        getElementById: (id: string) => (id === 'elo-chart-hover-box' ? box : null)
      };

      // Click on chart point
      selectEloChartPoint('2025/26', 22, 'Steven Bradbury FC', 'TorLupara', 'W', 1595.1, 15.7, 70.0);
      expect(box.innerHTML).toContain('2025/26 G22');
      expect(box.innerHTML).toContain('Steven Bradbury FC');
      expect(box.innerHTML).toContain('TorLupara');
      expect(box.innerHTML).toContain('(W)');
      expect(box.innerHTML).not.toContain('Tocca o passa sui punti');

      // Subsequent clear must keep match details visible
      clearEloChartHover();
      expect(box.innerHTML).toContain('2025/26 G22');
      expect(box.innerHTML).toContain('TorLupara');
    });

    it('renders the educational Elo computation guide box in Tab 5', () => {
      setCachedAnalyticsManagers({
        m1: {
          managerId: 'm1',
          teamName: 'Team One',
          coach: 'Coach One',
          flat: {
            current: 1540.0,
            peak: { value: 1560.0, season: '2025/26', round: 10 },
            floor: { value: 1490.0, season: '2025/26', round: 3 },
            lastDelta: 8.5,
            trajectory: []
          },
          historical: {
            current: 1610.0,
            peak: { value: 1630.0, season: '2025/26', round: 10 },
            floor: { value: 1570.0, season: '2025/26', round: 3 },
            lastDelta: 9.0,
            trajectory: []
          }
        }
      });

      const html = renderEloTab();
      expect(html).toContain("Guida al Calcolo dell'Elo Rating Dinamico");
      expect(html).toContain('id="elo-guide-content"');
      expect(html).toContain('Probabilità Attesa di Vittoria');
      expect(html).toContain('Sensibilità K-Factor per Competizione');
      expect(html).toContain('Regressione alla Media Inter-Stagionale');
    });

    it('switches multi-manager trajectory window to last10 and renders properly', () => {
      setCachedAnalyticsManagers({
        m1: {
          managerId: 'm1',
          teamName: 'Team One',
          coach: 'Coach One',
          flat: {
            current: 1550.0,
            peak: { value: 1560.0, season: '2025/26', round: 10 },
            floor: { value: 1490.0, season: '2025/26', round: 3 },
            lastDelta: 8.5,
            trajectory: [
              { round: 1, season: '2025/26', elo: 1510.0, opponentId: 'm2', opponentTeamName: 'Team Two', result: 'W', delta: 10.0, winProbPreMatch: 50.0, isHome: true },
              { round: 2, season: '2025/26', elo: 1520.0, opponentId: 'm2', opponentTeamName: 'Team Two', result: 'W', delta: 10.0, winProbPreMatch: 50.0, isHome: false },
              { round: 1, season: '2026/27', elo: 1530.0, opponentId: 'm2', opponentTeamName: 'Team Two', result: 'W', delta: 10.0, winProbPreMatch: 50.0, isHome: true }
            ]
          },
          historical: {
            current: 1610.0,
            peak: { value: 1630.0, season: '2025/26', round: 10 },
            floor: { value: 1570.0, season: '2025/26', round: 3 },
            lastDelta: 9.0,
            trajectory: [
              { round: 1, season: '2025/26', elo: 1600.0, opponentId: 'm2', opponentTeamName: 'Team Two', result: 'W', delta: 10.0, winProbPreMatch: 50.0, isHome: true },
              { round: 2, season: '2025/26', elo: 1610.0, opponentId: 'm2', opponentTeamName: 'Team Two', result: 'W', delta: 10.0, winProbPreMatch: 50.0, isHome: false }
            ]
          }
        }
      });

      switchEloChartSeason('last10');
      const html = renderEloTab();
      expect(html).toContain('value="last10" selected');
      expect(html).toContain('<svg');
      expect(html).toContain('G1');
    });
    it('renders loading spinner in Tab 5 when cachedAnalytics is null', () => {
      setCachedAnalyticsManagers(null);
      const html = renderEloTab();
      expect(html).toContain('Caricamento dati Elo');
      expect(html).toContain('fa-spinner');
    });

    it('formats K-Factors guide dynamically with tournament grouping', () => {
      const guide = formatKFactorsGuide({
        Coppa_Knockout: 40,
        Campionato: 32,
        Coppa: 24,
        Supercoppa: 24,
        Mundialito: 16,
        Perdenti: 16
      });

      expect(guide.badge).toContain('Coppa KO: K=40');
      expect(guide.badge).toContain('Campionato: K=32');
      expect(guide.badge).toContain('Coppa / Supercoppa: K=24');
      expect(guide.badge).toContain('Mundialito / Perdenti: K=16');
      expect(guide.description).toContain('le Fasi Finali di Coppa hanno K=40');
      expect(guide.description).toContain('il Campionato ha K=32');
      expect(guide.description).toContain('le gare di Coppa e la Supercoppa hanno K=24');
      expect(guide.description).toContain('il Mundialito e il Torneo Perdenti hanno K=16');
    });

    it('renders the educational guide with dynamically injected config parameters', () => {
      setCachedAnalyticsManagers(
        {
          m1: {
            managerId: 'm1',
            teamName: 'Team One',
            coach: 'Coach One',
            flat: {
              current: 1620.0,
              peak: { value: 1620.0, season: '2025/26', round: 1 },
              floor: { value: 1600.0, season: '2025/26', round: 1 },
              lastDelta: 5.0,
              trajectory: []
            },
            historical: {
              current: 1650.0,
              peak: { value: 1650.0, season: '2025/26', round: 1 },
              floor: { value: 1600.0, season: '2025/26', round: 1 },
              lastDelta: 5.0,
              trajectory: []
            }
          }
        },
        {
          baseRating: 1400.0,
          scaleFactor: 500.0,
          carryoverAlpha: 0.80,
          historicalSeeding: { scale: 50, minRating: 1300, maxRating: 1500 },
          kFactors: {
            Campionato: 40.0,
            Coppa: 20.0
          }
        }
      );

      const html = renderEloTab();
      // Section 1: scaleFactor 500
      expect(html).toContain('(R_B - R_A) / 500');
      // Section 3: K=40 and K=20
      expect(html).toContain('K=40');
      expect(html).toContain('K=20');
      // Section 4: baseRating 1400
      expect(html).toContain('⚡ Puro: 1400 baseline');
      expect(html).toContain('Reset a 1400 per tutti');
      // Section 5: carryoverAlpha 0.8 / 80% / 20%
      expect(html).toContain('R_start = 0.8 · R_end + 0.20 · 1400');
      expect(html).toContain('80% del rating viene preservato');
      expect(html).toContain('20% regredisce verso la media di lega (1400)');
    });

    it('uses a 1:1 adaptive mobile viewBox when viewport width is < 640px and keeps all match circles visible', () => {
      const prevWidth = (globalThis as any).window?.innerWidth;
      (globalThis as any).window = { ...(globalThis as any).window, innerWidth: 375 };

      try {
        const denseTrajectory: EloTrajectoryPoint[] = Array.from({ length: 25 }, (_, i) => ({
          round: i + 1,
          season: '2025/26',
          elo: i === 0 ? 1500 : i === 12 ? 1600 : i === 24 ? 1550 : 1520,
          opponentId: `opp_${i}`,
          opponentTeamName: `Rival ${i}`,
          result: 'W' as const,
          delta: 5.0,
          winProbPreMatch: 50.0,
          isHome: true
        }));

        const sparklineSvg = renderEloTrajectorySparkline(denseTrajectory, 'all', 'My Team');
        expect(sparklineSvg).toContain('viewBox="0 0 340 165"');
        // Points have their visible circles rendered with adaptive radius
        expect(sparklineSvg).toContain('r="2.5"');
        // Full-height hit slice rect is present
        expect(sparklineSvg).toContain('<rect ');
        // X-axis round labels are rendered
        expect(sparklineSvg).toContain('G1');

        const eloTabHtml = renderEloTab();
        expect(eloTabHtml).toContain('viewBox="0 0 360 240"');
      } finally {
        if ((globalThis as any).window) {
          (globalThis as any).window.innerWidth = prevWidth ?? 1024;
        }
      }
    });

    it('renders Standalone Elo Modal DOM and switches tabs cleanly', async () => {
      const {
        openEloModal,
        closeEloModal,
        switchEloModalTab,
        switchEloScatterSeason,
        switchEloLuckSubMode
      } = await import('@/components/modals/analytics/EloTab');

      const mockModal = {
        classList: {
          contains: (cls: string) => cls === 'hidden',
          remove: () => {},
          add: () => {}
        },
        addEventListener: () => {}
      };
      const mockContent = { innerHTML: '' };
      const originalGetElementById = document.getElementById;
      document.getElementById = (id: string) => {
        if (id === 'elo-modal') return mockModal as any;
        if (id === 'elo-modal-content') return mockContent as any;
        return originalGetElementById.call(document, id);
      };

      try {
        openEloModal('trajectories', 'flat');
        expect(mockContent.innerHTML).toContain('Elo Rating &amp; Power Studio');
        expect(mockContent.innerHTML).toContain('Traiettorie');

        switchEloModalTab('golo');
        expect(mockContent.innerHTML).toContain('Elo vs Golo');
        expect(mockContent.innerHTML).toContain('Golo Score');

        switchEloScatterSeason('2025/26');
        expect(mockContent.innerHTML).toContain('2025/26');

        switchEloModalTab('fp');
        expect(mockContent.innerHTML).toContain('Media FantaPunti');

        switchEloModalTab('luck');
        expect(mockContent.innerHTML).toContain('Sfiga & SOS');

        switchEloLuckSubMode('h2hVsAtlas');
        expect(mockContent.innerHTML).toContain('H2H vs Atlas');

        closeEloModal();
      } finally {
        document.getElementById = originalGetElementById;
      }
    });

    it('computes linear regression and renders native SVG bubble scatter with quadrant watermarks', async () => {
      const {
        computeLinearRegression,
        renderEloScatterChart
      } = await import('@/components/modals/analytics/EloScatterChart');

      // Test OLS
      const pts = [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }];
      const reg = computeLinearRegression(pts);
      expect(reg.slope).toBeCloseTo(2.0, 4);
      expect(reg.intercept).toBeCloseTo(0.0, 4);
      expect(reg.r2).toBeCloseTo(1.0, 4);

      // Test scatter rendering
      const mockProfiles = [
        {
          managerId: 'm1',
          teamName: 'Team Alpha',
          coach: 'Coach A',
          profile: {
            managerId: 'm1',
            teamName: 'Team Alpha',
            flat: {
              current: 1620.0,
              peak: { value: 1620.0, season: '2026/27', round: 1 },
              floor: { value: 1500.0, season: '2026/27', round: 0 },
              lastDelta: 10.0,
              trajectory: []
            },
            historical: {
              current: 1630.0,
              peak: { value: 1630.0, season: '2026/27', round: 1 },
              floor: { value: 1500.0, season: '2026/27', round: 0 },
              lastDelta: 10.0,
              trajectory: []
            },
            atlas: {
              current: 1590.0,
              peak: { value: 1590.0, season: '2026/27', round: 1 },
              floor: { value: 1500.0, season: '2026/27', round: 0 },
              lastDelta: 5.0,
              trajectory: []
            },
            seasonStats: {
              '2026/27': {
                played: 2,
                gf: 4,
                ga: 1,
                gd: 3,
                avgFP: 74.5,
                totalFP: 149.0,
                golo: 1.45,
                actualPts: 6,
                xPts: 4.5,
                luckDelta: 1.5
              }
            }
          }
        }
      ];

      const goloSvg = renderEloScatterChart(mockProfiles, 'golo', 'flat', '2026/27');
      expect(goloSvg).toContain('viewBox="0 0 740 440"');
      expect(goloSvg).toContain('Parità Golo = 1.00');
      expect(goloSvg).toContain('TITANI');
      expect(goloSvg).toContain('scatter-clip-');
      expect(goloSvg).toContain('scatter-chip-');
      expect(goloSvg).toContain('grad-quad-');

      const fpSvg = renderEloScatterChart(mockProfiles, 'fp', 'flat', '2026/27');
      expect(fpSvg).toContain('DOMINATORI');
      expect(fpSvg).toContain('OLS Trend');

      const luckSvg = renderEloScatterChart(mockProfiles, 'luck', 'flat', '2026/27', 'allPlay');
      expect(luckSvg).toContain('Bisettrice Y = X');
      expect(luckSvg).toContain('xPts');
    });

    it('renders clean hover tooltip without exact match results or fantasy points', async () => {
      const { showProfileEloHover } = await import('@/components/modals/profile/EloSparklineChart');
      const { showEloChartHover } = await import('@/components/modals/analytics/EloTab');

      const mockHoverBox = { innerHTML: '' };
      const originalGetElementById = document.getElementById;
      document.getElementById = (id: string) => {
        if (id === 'profile-elo-hover-box' || id === 'elo-chart-hover-box') return mockHoverBox as any;
        return originalGetElementById.call(document, id);
      };

      try {
        // Profile hover: verify absence of score and FP telemetry, presence of match details
        showProfileEloHover('2026/27', 2, 'Team Alpha', 'Team Beta', 'W', 1580.0, 15.0, 55.0, 2, 1, 74.5, 68.0);
        expect(mockHoverBox.innerHTML).not.toContain('2-1');
        expect(mockHoverBox.innerHTML).not.toContain('74.5');
        expect(mockHoverBox.innerHTML).not.toContain('68.0');
        expect(mockHoverBox.innerHTML).not.toContain('FP');
        expect(mockHoverBox.innerHTML).toContain('Team Alpha');
        expect(mockHoverBox.innerHTML).toContain('Team Beta');
        expect(mockHoverBox.innerHTML).toContain('(W)');
        expect(mockHoverBox.innerHTML).toContain('1580.0 pt');
        expect(mockHoverBox.innerHTML).toContain('(+15.0)');
        expect(mockHoverBox.innerHTML).toContain('Prob. 55%');

        // Analytics chart hover: verify clean output
        showEloChartHover('2026/27', 2, 'Team Alpha', 'Team Beta', 'W', 1580.0, 15.0, 55.0, 2, 1, 74.5, 68.0);
        expect(mockHoverBox.innerHTML).not.toContain('2-1');
        expect(mockHoverBox.innerHTML).not.toContain('74.5');
        expect(mockHoverBox.innerHTML).not.toContain('68.0');
        expect(mockHoverBox.innerHTML).not.toContain('FP');
        expect(mockHoverBox.innerHTML).toContain('Team Alpha');
        expect(mockHoverBox.innerHTML).toContain('Team Beta');
        expect(mockHoverBox.innerHTML).toContain('(W)');
        expect(mockHoverBox.innerHTML).toContain('1580.0 pt');
        expect(mockHoverBox.innerHTML).toContain('(+15.0)');
        expect(mockHoverBox.innerHTML).toContain('Prob. 55%');
      } finally {
        document.getElementById = originalGetElementById;
      }
    });

    it('switches between Puro, Storico, and Atlas modes seamlessly and updates Elo modal', async () => {
      const { switchEloMode } = await import('@/components/modals/analytics/EloTab');
      const { getEloMode } = await import('@/analytics/analyticsCore');

      const mockModalContent = { innerHTML: '', scrollTop: 0 };
      const originalGetElementById = document.getElementById;
      const originalQuerySelector = document.querySelector;

      document.getElementById = (id: string) => {
        if (id === 'elo-modal-content') return mockModalContent as any;
        return originalGetElementById.call(document, id);
      };
      document.querySelector = (selector: string) => {
        if (selector.includes('#elo-modal-content')) return mockModalContent as any;
        return originalQuerySelector.call(document, selector);
      };

      try {
        switchEloMode('historical');
        expect(getEloMode()).toBe('historical');

        switchEloMode('atlas');
        expect(getEloMode()).toBe('atlas');

        switchEloMode('flat');
        expect(getEloMode()).toBe('flat');
      } finally {
        document.getElementById = originalGetElementById;
        document.querySelector = originalQuerySelector;
      }
    });

    describe('EloScatterData Statistical & Geometric Helpers', () => {
      it('calculates linear regression slope, intercept, and R2 accurately', async () => {
        const { computeLinearRegression } = await import('@/components/modals/analytics/EloScatterData');

        // Perfect line Y = 2X + 1
        const perfectPoints = [
          { x: 1, y: 3 },
          { x: 2, y: 5 },
          { x: 3, y: 7 },
          { x: 4, y: 9 }
        ];
        const res = computeLinearRegression(perfectPoints);
        expect(res.slope).toBeCloseTo(2.0, 5);
        expect(res.intercept).toBeCloseTo(1.0, 5);
        expect(res.r2).toBeCloseTo(1.0, 5);

        // Degenerate single point
        const single = computeLinearRegression([{ x: 1, y: 1 }]);
        expect(single.slope).toBe(0);
        expect(single.intercept).toBe(0);
        expect(single.r2).toBe(0);
      });

      it('applies cluster repulsion so overlapping points are visibly separated within bounds', async () => {
        const { applyClusterRepulsion } = await import('@/components/modals/analytics/EloScatterData');

        const overlappingPoints = [
          {
            managerId: 'm1',
            teamName: 'Team 1',
            coach: 'Coach 1',
            logo: 'logo1.svg',
            x: 3.0,
            y: 3.0,
            radius: 15,
            color: '#f59e0b',
            metricLabelX: '3.0',
            metricLabelY: '3.0',
            extraMeta: '',
            quadrant: 'Test',
            rawX: 300,
            rawY: 200,
            cx: 300,
            cy: 200,
            cleanId: 'm1'
          },
          {
            managerId: 'm2',
            teamName: 'Team 2',
            coach: 'Coach 2',
            logo: 'logo2.svg',
            x: 3.0,
            y: 3.0,
            radius: 15,
            color: '#3b82f6',
            metricLabelX: '3.0',
            metricLabelY: '3.0',
            extraMeta: '',
            quadrant: 'Test',
            rawX: 300,
            rawY: 200,
            cx: 300,
            cy: 200,
            cleanId: 'm2'
          }
        ];

        const bounds = { minX: 50, maxX: 700, minY: 30, maxY: 400 };
        const repulsed = applyClusterRepulsion(overlappingPoints, 26, bounds);

        expect(repulsed.length).toBe(2);
        // The two points must no longer share identical cx, cy
        const dist = Math.hypot(repulsed[0].cx - repulsed[1].cx, repulsed[0].cy - repulsed[1].cy);
        expect(dist).toBeGreaterThan(10);

        // Both points must stay within bounds
        expect(repulsed[0].cx).toBeGreaterThanOrEqual(bounds.minX);
        expect(repulsed[0].cx).toBeLessThanOrEqual(bounds.maxX);
        expect(repulsed[1].cx).toBeGreaterThanOrEqual(bounds.minX);
        expect(repulsed[1].cx).toBeLessThanOrEqual(bounds.maxX);
      });

      it('handles negative Golo (Scalo -0.50, Partizan -2.00) and preserves 0.0 without clamping', () => {
        const makeMockProfile = (mId: string, team: string, coach: string, elo: number, stats: any): EloProfileEntry => {
          const track = {
            current: elo,
            peak: { value: elo, round: 1, season: '2026/27' },
            floor: { value: 1500, round: 0, season: '2026/27' },
            lastDelta: 0,
            trajectory: []
          };
          return {
            managerId: mId,
            teamName: team,
            coach,
            logo: '',
            profile: {
              managerId: mId,
              teamName: team,
              flat: track,
              historical: track,
              atlas: track,
              seasonStats: {
                '2026/27': stats
              }
            }
          };
        };

        const mockProfiles: EloProfileEntry[] = [
          makeMockProfile('m_valery', 'Scalo San Genesio', 'Valery', 1478.2, {
            played: 2, gf: 2, ga: 5, gd: -3, golo: -0.5, avgFP: 70.0, totalFP: 140.0, actualPts: 0, xPts: 2.69, luckDelta: -2.69
          }),
          makeMockProfile('m_pippo', 'Partizan Peroni', 'Pippo', 1420.0, {
            played: 2, gf: 0, ga: 6, gd: -6, golo: -2.0, avgFP: 61.5, totalFP: 123.0, actualPts: 0, xPts: 0.46, luckDelta: -0.46
          }),
          makeMockProfile('m_sebba', 'Arcore 1936', 'Sebba', 1510.0, {
            played: 2, gf: 1, ga: 3, gd: -2, golo: 0.0, avgFP: 65.0, totalFP: 130.0, actualPts: 0, xPts: 1.38, luckDelta: -1.38
          }),
          makeMockProfile('m_alfo', 'Steven Bradbury FC', 'Alfo', 1560.0, {
            played: 2, gf: 4, ga: 1, gd: 3, golo: 2.5, avgFP: 74.0, totalFP: 148.0, actualPts: 4, xPts: 4.08, luckDelta: -0.08
          })
        ];

        const dataset = buildScatterPoints(mockProfiles, 'golo', 'flat', '2026/27');
        const scaloPt = dataset.points.find(p => p.managerId === 'm_valery')!;
        const partizanPt = dataset.points.find(p => p.managerId === 'm_pippo')!;
        const arcorePt = dataset.points.find(p => p.managerId === 'm_sebba')!;

        expect(scaloPt.y).toBe(-0.5);
        expect(partizanPt.y).toBe(-2.0);
        // Ensure 0.0 is not falsy-coerced to 1.0
        expect(arcorePt.y).toBe(0.0);

        const svgHtml = renderEloScatterChart(mockProfiles, 'golo', 'flat', '2026/27');
        expect(svgHtml).toContain('Scalo San Genesio');
        expect(svgHtml).toContain('Partizan Peroni');

        // Check that Trend OLS badge does not overlap top-right TITANI badge
        expect(svgHtml).toContain('Trend OLS');
        expect(svgHtml).toContain('TITANI (Dominanti)');
      });

      it('ensures boundary nodes with actualPts = 0 in luck allPlay view do not get cut in half by border', () => {
        const track = {
          current: 1478.2,
          peak: { value: 1500, round: 1, season: '2026/27' },
          floor: { value: 1478.2, round: 2, season: '2026/27' },
          lastDelta: -5.0,
          trajectory: []
        };
        const mockProfiles: EloProfileEntry[] = [
          {
            managerId: 'm_valery',
            teamName: 'Scalo San Genesio',
            coach: 'Valery',
            logo: '',
            profile: {
              managerId: 'm_valery',
              teamName: 'Scalo San Genesio',
              flat: track,
              historical: track,
              atlas: track,
              seasonStats: {
                '2026/27': {
                  played: 2,
                  gf: 2,
                  ga: 5,
                  gd: -3,
                  golo: -0.5,
                  avgFP: 70.0,
                  totalFP: 140.0,
                  actualPts: 0,
                  xPts: 2.69,
                  luckDelta: -2.69
                }
              }
            }
          }
        ];

        const luckSvg = renderEloScatterChart(mockProfiles, 'luck', 'flat', '2026/27', 'allPlay');
        // Match the circle for Scalo
        const cyMatch = luckSvg.match(/<g class="scatter-bubble"[^>]*id="scatter-node-m_valery"[^>]*>[\s\S]*?<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/);
        expect(cyMatch).not.toBeNull();
        if (cyMatch) {
          const cx = parseFloat(cyMatch[1]);
          const cy = parseFloat(cyMatch[2]);
          const r = parseFloat(cyMatch[3]);
          // padLeft = 68, plotW = 640 -> max plot X = 708
          // padTop = 36, plotH = 348 -> max plot Y = 384
          expect(cx - r).toBeGreaterThanOrEqual(68);
          expect(cx + r).toBeLessThanOrEqual(708);
          expect(cy - r).toBeGreaterThanOrEqual(36);
          // Circle bottom must not spill below plot border (384)
          expect(cy + r).toBeLessThanOrEqual(384);
        }
      });

      it('does not include points in manager detail when season is in corso (2026/27)', () => {
        const makeTrack = (elo: number) => ({
          current: elo,
          peak: { value: elo, round: 1, season: '2026/27' },
          floor: { value: 1500, round: 0, season: '2026/27' },
          lastDelta: 0,
          trajectory: []
        });

        const profiles: EloProfileEntry[] = [
          {
            managerId: 'm_sarviette',
            teamName: 'Sarviette FC',
            coach: 'petrubik88',
            logo: '',
            profile: {
              managerId: 'm_sarviette',
              teamName: 'Sarviette FC',
              flat: makeTrack(1594.0),
              historical: makeTrack(1594.0),
              atlas: makeTrack(1594.0),
              seasonStats: {
                '2026/27': {
                  played: 2, gf: 2, ga: 0, gd: 2, golo: 2.0, avgFP: 67.3, totalFP: 134.5, actualPts: 6, xPts: 2.46, luckDelta: 3.54
                },
                '2025/26': {
                  played: 33, gf: 40, ga: 35, gd: 5, golo: 1.15, avgFP: 71.2, totalFP: 2350.0, actualPts: 48, xPts: 45.0, luckDelta: 3.0
                }
              }
            }
          }
        ];

        // Season in corso: 2026/27 -> points should NOT be included in extraMeta
        const datasetInCorso = buildScatterPoints(profiles, 'fp', 'flat', '2026/27');
        expect(datasetInCorso.points.length).toBe(1);
        expect(datasetInCorso.points[0].extraMeta).not.toContain('Punti Classifica');
        expect(datasetInCorso.points[0].extraMeta).not.toContain('6 pt');
        expect(datasetInCorso.points[0].extraMeta).toContain('2 giornate giocate');

        // Completed season: 2025/26 -> points SHOULD be included in extraMeta
        const datasetCompleted = buildScatterPoints(profiles, 'fp', 'flat', '2025/26');
        expect(datasetCompleted.points.length).toBe(1);
        expect(datasetCompleted.points[0].extraMeta).toContain('Punti Classifica: 48 pt');
        expect(datasetCompleted.points[0].extraMeta).toContain('33 giornate');
      });

      it('excludes managers who did not take part in the selected season across all scatter plots', () => {
        const makeTrack = (elo: number) => ({
          current: elo,
          peak: { value: elo, round: 1, season: '2026/27' },
          floor: { value: 1500, round: 0, season: '2026/27' },
          lastDelta: 0,
          trajectory: []
        });

        const profiles: EloProfileEntry[] = [
          {
            managerId: 'm_veteran',
            teamName: 'Veteran Team',
            coach: 'Coach A',
            logo: '',
            profile: {
              managerId: 'm_veteran',
              teamName: 'Veteran Team',
              flat: makeTrack(1550),
              historical: makeTrack(1550),
              atlas: makeTrack(1550),
              seasonStats: {
                '2025/26': { played: 33, gf: 35, ga: 30, gd: 5, golo: 1.15, avgFP: 72.0, totalFP: 2376, actualPts: 45, xPts: 42, luckDelta: 3 },
                '2026/27': { played: 2, gf: 3, ga: 2, gd: 1, golo: 1.5, avgFP: 73.0, totalFP: 146, actualPts: 4, xPts: 3.5, luckDelta: 0.5 },
                'all': { played: 35, gf: 38, ga: 32, gd: 6, golo: 1.17, avgFP: 72.1, totalFP: 2522, actualPts: 49, xPts: 45.5, luckDelta: 3.5 }
              }
            }
          },
          {
            managerId: 'm_retired',
            teamName: 'Retired Team',
            coach: 'Coach B',
            logo: '',
            profile: {
              managerId: 'm_retired',
              teamName: 'Retired Team',
              flat: makeTrack(1480),
              historical: makeTrack(1480),
              atlas: makeTrack(1480),
              seasonStats: {
                '2025/26': { played: 33, gf: 30, ga: 35, gd: -5, golo: 0.85, avgFP: 68.0, totalFP: 2244, actualPts: 38, xPts: 40, luckDelta: -2 },
                '2026/27': { played: 0, gf: 0, ga: 0, gd: 0, golo: 1.0, avgFP: 0.0, totalFP: 0, actualPts: 0, xPts: 0, luckDelta: 0 },
                'all': { played: 33, gf: 30, ga: 35, gd: -5, golo: 0.85, avgFP: 68.0, totalFP: 2244, actualPts: 38, xPts: 40, luckDelta: -2 }
              }
            }
          },
          {
            managerId: 'm_newcomer',
            teamName: 'AS Qualo',
            coach: 'Zatte',
            logo: '',
            profile: {
              managerId: 'm_newcomer',
              teamName: 'AS Qualo',
              flat: makeTrack(1512),
              historical: makeTrack(1512),
              atlas: makeTrack(1512),
              seasonStats: {
                '2025/26': { played: 0, gf: 0, ga: 0, gd: 0, golo: 1.0, avgFP: 0.0, totalFP: 0, actualPts: 0, xPts: 0, luckDelta: 0 },
                '2026/27': { played: 2, gf: 2, ga: 1, gd: 1, golo: 1.5, avgFP: 71.0, totalFP: 142, actualPts: 3, xPts: 2.69, luckDelta: 0.31 },
                'all': { played: 2, gf: 2, ga: 1, gd: 1, golo: 1.5, avgFP: 71.0, totalFP: 142, actualPts: 3, xPts: 2.69, luckDelta: 0.31 }
              }
            }
          }
        ];

        // 1. Season 2025/26: AS Qualo (played 0) MUST BE EXCLUDED from ALL scatter plots
        const golo25 = buildScatterPoints(profiles, 'golo', 'flat', '2025/26');
        expect(golo25.points.length).toBe(2);
        expect(golo25.points.some(p => p.managerId === 'm_newcomer')).toBe(false);
        expect(golo25.points.some(p => p.managerId === 'm_veteran')).toBe(true);
        expect(golo25.points.some(p => p.managerId === 'm_retired')).toBe(true);

        const fp25 = buildScatterPoints(profiles, 'fp', 'flat', '2025/26');
        expect(fp25.points.length).toBe(2);
        expect(fp25.points.some(p => p.managerId === 'm_newcomer')).toBe(false);

        const luckAllPlay25 = buildScatterPoints(profiles, 'luck', 'flat', '2025/26', 'allPlay');
        expect(luckAllPlay25.points.length).toBe(2);
        expect(luckAllPlay25.points.some(p => p.managerId === 'm_newcomer')).toBe(false);

        const luckAtlas25 = buildScatterPoints(profiles, 'luck', 'flat', '2025/26', 'h2hVsAtlas');
        expect(luckAtlas25.points.length).toBe(2);
        expect(luckAtlas25.points.some(p => p.managerId === 'm_newcomer')).toBe(false);

        // 2. Season 2026/27: Retired team (played 0) MUST BE EXCLUDED from ALL scatter plots
        const golo26 = buildScatterPoints(profiles, 'golo', 'flat', '2026/27');
        expect(golo26.points.length).toBe(2);
        expect(golo26.points.some(p => p.managerId === 'm_retired')).toBe(false);
        expect(golo26.points.some(p => p.managerId === 'm_veteran')).toBe(true);
        expect(golo26.points.some(p => p.managerId === 'm_newcomer')).toBe(true);

        const fp26 = buildScatterPoints(profiles, 'fp', 'flat', '2026/27');
        expect(fp26.points.length).toBe(2);
        expect(fp26.points.some(p => p.managerId === 'm_retired')).toBe(false);

        const luckAllPlay26 = buildScatterPoints(profiles, 'luck', 'flat', '2026/27', 'allPlay');
        expect(luckAllPlay26.points.length).toBe(2);
        expect(luckAllPlay26.points.some(p => p.managerId === 'm_retired')).toBe(false);

        const luckAtlas26 = buildScatterPoints(profiles, 'luck', 'flat', '2026/27', 'h2hVsAtlas');
        expect(luckAtlas26.points.length).toBe(2);
        expect(luckAtlas26.points.some(p => p.managerId === 'm_retired')).toBe(false);
      });
    });
  });
});
