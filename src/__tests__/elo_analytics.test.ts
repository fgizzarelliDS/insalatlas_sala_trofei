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
  setCachedAnalyticsManagers
} from '@/components/modals/analytics/EloTab';
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

    it('toggles merit Elo mode between flat and historical', () => {
      expect(getEloMode()).toBe('flat');
      toggleMeritEloMode();
      expect(getEloMode()).toBe('historical');
      expect(elements['label-merit-elo-track'].textContent).toBe('🏛️ Elo Storico');

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
  });
});
