/**
 * src/components/modals/analytics/EloTab.ts
 * Dynamic Elo Rating Engine & Power Studio Modal Controller (Standalone Modal & 4 Tabs)
 * - Tab 1: 📈 Traiettorie & Classifica (Multi-Team Curves, 3-Track Toggle, Leaderboard Table, Guide)
 * - Tab 2: ⚽ Elo vs Golo Score (Tactical Efficiency & Overperformance Bubble Scatter)
 * - Tab 3: 📊 Elo vs FantaPunti (Scoring Output vs Elo Conversion Bubble Scatter)
 * - Tab 4: 🍀 Sfiga & SOS (Schedule Luck & H2H vs Atlas Power Disparity Scatter)
 */

import type { EloTrackMode, EloModalTab } from '@/types/analytics';
import {
  getEloMode,
  setEloMode,
  getManagerEloTrack,
  loadAnalyticsEloData,
  getCachedAnalyticsManagers,
  setCachedAnalyticsManagers,
  getActiveEloConfig,
  formatElo,
  formatEloDelta
} from '@/analytics/analyticsCore';
import { getLiveSeasonDetails, loadLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';

// Subcomponents
import { renderEloOverviewKpis, type EloProfileEntry } from './EloKpis';
import {
  renderEloTrajectoryChart,
  type LockedEloChartMatch,
  MANAGER_COLORS
} from './EloTrajectoryChart';
import {
  renderEloLeaderboardTable,
  type EloTableSortField
} from './EloLeaderboardTable';
import {
  renderEloGuideModal,
  formatKFactorsGuide
} from './EloGuideBox';
import {
  renderEloScatterChart,
  type ScatterMetricView,
  type LuckScatterSubMode
} from './EloScatterChart';
import {
  renderEloTabButton,
  renderEloModalHeader,
  renderEloModalFooter,
  renderEloModeSwitcher,
  renderScatterSeasonPills,
  renderGoloExplanationCard,
  renderFpExplanationCard,
  renderLuckExplanationCard,
  renderEloErrorState,
  renderEloLoadingState,
  renderEloEmptyState
} from './EloTabNav';

// Re-exports for consumers and unit tests
export {
  setCachedAnalyticsManagers,
  formatKFactorsGuide,
  renderEloGuideModal,
  renderEloOverviewKpis,
  renderEloTrajectoryChart,
  renderEloLeaderboardTable,
  renderEloScatterChart,
  MANAGER_COLORS,
  type EloProfileEntry,
  type LockedEloChartMatch,
  type EloTableSortField,
  type ScatterMetricView,
  type LuckScatterSubMode
};

let isFetchingElo = false;
let eloFetchError = false;

export function retryEloFetch(): void {
  eloFetchError = false;
  prefetchEloData();
}

// Chart state
const getDefaultEloSeason = (): string =>
  typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth > 0 && window.innerWidth < 640
    ? 'last10'
    : 'all';

const getDefaultScatterSeason = (): string => {
  if (typeof window !== 'undefined') {
    const w = window as any;
    if (w.liveSeasonData?.season) return w.liveSeasonData.season;
    if (w.fantasyData?.competitions && Array.isArray(w.fantasyData.competitions)) {
      const active = w.fantasyData.competitions.find((c: any) => c.in_progress || c.status === 'in_progress');
      if (active?.season) return active.season;
    }
  }
  return 'all';
};

let currentEloModalTab: EloModalTab = 'trajectories';
let selectedEloSeason: string = getDefaultEloSeason();
let selectedScatterSeason: string = getDefaultScatterSeason();
let currentLuckSubMode: LuckScatterSubMode = 'allPlay';
let eloSeasonUserModified = false;
const hiddenManagerIds: Set<string> = new Set();
let lockedEloChartMatch: (LockedEloChartMatch & { gf?: number; ga?: number; fpFor?: number; fpAgainst?: number }) | null = null;

// Leaderboard sort state
let eloTableSortField: EloTableSortField = 'elo';
let eloTableSortDirection: 'desc' | 'asc' = 'desc';

/**
 * Updates URL search params for deep linking
 */
function updateEloURL(clean: boolean = false): void {
  if (typeof window === 'undefined' || !window.history || !window.location) return;
  const url = new URL(window.location.href);
  if (clean) {
    url.searchParams.delete('modal');
    url.searchParams.delete('tab');
    url.searchParams.delete('elo_mode');
    url.searchParams.delete('season');
  } else {
    url.searchParams.set('modal', 'elo');
    url.searchParams.set('tab', currentEloModalTab);
    url.searchParams.set('elo_mode', getEloMode());
    if (currentEloModalTab !== 'trajectories') {
      url.searchParams.set('season', selectedScatterSeason);
    }
  }
  window.history.replaceState(null, '', url.toString());
}

/**
 * Opens dedicated Standalone Elo Modal
 */
export function openEloModal(
  initialTab: EloModalTab = 'trajectories',
  initialMode?: EloTrackMode,
  initialSeason?: string
): void {
  const modal = document.getElementById('elo-modal');
  currentEloModalTab = initialTab;
  if (initialMode) {
    setEloMode(initialMode);
  }
  if (initialSeason) {
    selectedScatterSeason = initialSeason;
  }

  if (!getCachedAnalyticsManagers() || !getLiveSeasonDetails()) {
    prefetchEloData();
  }

  renderEloModalDOM();
  updateEloURL(false);

  if (modal) {
    if (!(modal as any)._hasBackdropListener) {
      modal.addEventListener('click', (e: MouseEvent) => {
        if (e.target === modal) {
          closeEloModal();
        }
      });
      (modal as any)._hasBackdropListener = true;
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

/**
 * Closes Standalone Elo Modal
 */
export function closeEloModal(cleanUrl: boolean = true): void {
  const modal = document.getElementById('elo-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  if (cleanUrl) {
    updateEloURL(true);
  }
}

/**
 * Switches the active tab inside the Elo Modal
 */
export function switchEloModalTab(tab: EloModalTab): void {
  currentEloModalTab = tab;
  refreshEloModal();
  updateEloURL(false);
}

/**
 * Switches scatter season filter ('2026/27' | '2025/26' | 'all')
 */
export function switchEloScatterSeason(season: string): void {
  selectedScatterSeason = season;
  refreshEloModal();
  updateEloURL(false);
}

/**
 * Switches luck scatter submode ('allPlay' | 'h2hVsAtlas')
 */
export function switchEloLuckSubMode(subMode: LuckScatterSubMode): void {
  currentLuckSubMode = subMode;
  refreshEloModal();
}

/**
 * Re-renders the Elo modal while preserving scroll position
 */
export function refreshEloModal(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const scrollEl = typeof document.querySelector === 'function'
    ? (document.querySelector('#elo-modal-content .overflow-y-auto') as HTMLElement | null)
    : null;
  const currentScrollTop = scrollEl ? scrollEl.scrollTop : 0;
  
  renderEloModalDOM();

  if (typeof requestAnimationFrame === 'function' && typeof document.querySelector === 'function') {
    requestAnimationFrame(() => {
      const nextScrollEl = document.querySelector('#elo-modal-content .overflow-y-auto') as HTMLElement | null;
      if (nextScrollEl) nextScrollEl.scrollTop = currentScrollTop;
    });
  }
}

/**
 * Backwards compatibility alias for refreshEloModal & legacy container
 */
export function refreshEloTab(): void {
  refreshEloModal();
  // Also refresh legacy concentration container if present
  if (typeof window !== 'undefined') {
    const container = document.getElementById('concentration-modal-content');
    if (container && window.switchAnalyticsTab) {
      window.switchAnalyticsTab('elo');
    }
  }
}

/**
 * Prefetches both live season details and analytics_data.json, re-rendering modal when ready
 */
export function prefetchEloData(): void {
  if (isFetchingElo) return;
  isFetchingElo = true;
  eloFetchError = false;

  Promise.all([
    loadLiveSeasonDetails().catch(() => null),
    loadAnalyticsEloData().catch(() => null)
  ]).then(([_, analytics]) => {
    if (!analytics && !getCachedAnalyticsManagers()) {
      eloFetchError = true;
    }
  }).catch(() => {
    if (!getCachedAnalyticsManagers()) {
      eloFetchError = true;
    }
  }).finally(() => {
    isFetchingElo = false;
    refreshEloModal();
  });
}

/**
 * Switches season or recent window filter on the SVG trajectory chart
 */
export function switchEloChartSeason(season: string): void {
  selectedEloSeason = season;
  eloSeasonUserModified = true;
  if (lockedEloChartMatch && season !== 'all' && !season.startsWith('last') && lockedEloChartMatch.season !== season) {
    lockedEloChartMatch = null;
  }
  refreshEloModal();
}

/**
 * Toggles manager line visibility
 */
export function toggleEloManagerVisibility(mId: string): void {
  if (hiddenManagerIds.has(mId)) {
    hiddenManagerIds.delete(mId);
  } else {
    hiddenManagerIds.add(mId);
  }
  refreshEloModal();
}

export function showAllEloManagers(): void {
  hiddenManagerIds.clear();
  refreshEloModal();
}

export function hideAllEloManagers(): void {
  const liveData = getLiveSeasonDetails();
  (liveData?.standings || []).forEach(s => {
    if (s.managerId) hiddenManagerIds.add(s.managerId);
  });
  refreshEloModal();
}

/**
 * Locks on a clicked point so match details remain visible
 */
export function selectEloChartPoint(
  season: string,
  round: number,
  team: string,
  opponent: string,
  result: string,
  elo: number,
  delta: number,
  winProb: number,
  gf?: number,
  ga?: number,
  fpFor?: number,
  fpAgainst?: number
): void {
  lockedEloChartMatch = { season, round, team, opponent, result, elo, delta, winProb, gf, ga, fpFor, fpAgainst };
  showEloChartHover(season, round, team, opponent, result, elo, delta, winProb, gf, ga, fpFor, fpAgainst);
}

/**
 * Interactive hover banner updater (responsive layout, unclipped)
 */
export function showEloChartHover(
  season: string,
  round: number,
  team: string,
  opponent: string,
  result: string,
  elo: number,
  delta: number,
  winProb: number,
  _gf?: number,
  _ga?: number,
  _fpFor?: number,
  _fpAgainst?: number
): void {
  const banner = document.getElementById('elo-chart-hover-box');
  if (!banner) return;
  const deltaColor = delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-400';
  const resBadge = result === 'W' ? 'text-emerald-400 font-bold' : result === 'L' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold';

  banner.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 w-full text-[11px] sm:text-xs">
      <div class="flex items-center gap-1.5 font-bold min-w-0 flex-wrap">
        <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] shrink-0 font-mono">${season} G${round}</span>
        <span style="color: var(--text-main);" class="truncate max-w-[110px] sm:max-w-none">${team}</span>
        <span class="opacity-60 text-[10px] shrink-0">vs</span>
        <span style="color: var(--text-muted);" class="truncate max-w-[110px] sm:max-w-none">${opponent || 'Avversario'}</span>
        <span class="${resBadge} shrink-0">(${result})</span>
      </div>
      <div class="flex items-center gap-2 font-mono shrink-0">
        <span class="font-black text-amber-400 text-xs sm:text-sm">${formatElo(elo)} pt</span>
        <span class="${deltaColor} font-bold text-[11px]">(${formatEloDelta(delta)})</span>
        ${winProb > 0 ? `<span class="opacity-75 text-[10px] font-sans" style="color: var(--text-muted);">(Prob. ${winProb.toFixed(0)}%)</span>` : ''}
      </div>
    </div>
  `;
}

export function clearEloChartHover(): void {
  const banner = document.getElementById('elo-chart-hover-box');
  if (!banner) return;

  if (lockedEloChartMatch) {
    const activeMode = getEloMode();
    const liveData = getLiveSeasonDetails();
    const cachedAnalytics = getCachedAnalyticsManagers();
    let matchPt: any = null;

    const allProfiles = cachedAnalytics
      ? Object.values(cachedAnalytics)
      : (liveData?.standings || []).map(s => s.elo).filter(Boolean);

    for (const prof of allProfiles) {
      if (!prof) continue;
      const tName = (prof as any).teamName;
      if (tName === lockedEloChartMatch.team) {
        const tr = getManagerEloTrack(prof as any, activeMode);
        if (tr) {
          matchPt = tr.trajectory.find(
            p => p.season === lockedEloChartMatch!.season && p.round === lockedEloChartMatch!.round
          );
          if (matchPt) break;
        }
      }
    }

    if (matchPt) {
      showEloChartHover(
        matchPt.season,
        matchPt.round,
        lockedEloChartMatch.team,
        matchPt.opponentTeamName || lockedEloChartMatch.opponent,
        matchPt.result || lockedEloChartMatch.result || '',
        matchPt.elo,
        matchPt.delta,
        matchPt.winProbPreMatch || 0,
        matchPt.gf ?? lockedEloChartMatch.gf,
        matchPt.ga ?? lockedEloChartMatch.ga,
        matchPt.fpFor ?? lockedEloChartMatch.fpFor,
        matchPt.fpAgainst ?? lockedEloChartMatch.fpAgainst
      );
      return;
    } else {
      showEloChartHover(
        lockedEloChartMatch.season,
        lockedEloChartMatch.round,
        lockedProfileTeamSafe(lockedEloChartMatch.team),
        lockedEloChartMatch.opponent,
        lockedEloChartMatch.result || '',
        lockedEloChartMatch.elo ?? 1500,
        lockedEloChartMatch.delta ?? 0,
        lockedEloChartMatch.winProb ?? 50,
        lockedEloChartMatch.gf,
        lockedEloChartMatch.ga,
        lockedEloChartMatch.fpFor,
        lockedEloChartMatch.fpAgainst
      );
      return;
    }
  }

  banner.innerHTML = `
    <span class="opacity-70 truncate"><i class="fa-solid fa-hand-pointer mr-1.5 text-amber-500"></i>Tocca o passa sui punti per visualizzare i dettagli del match</span>
  `;
}

function lockedProfileTeamSafe(team: string): string {
  return team || 'Squadra';
}

/**
 * Switches Elo mode and refreshes
 */
export function switchEloMode(mode: EloTrackMode): void {
  setEloMode(mode);
  refreshEloModal();
  updateEloURL(false);
}

/**
 * Sorts Classifica Dinamica Elo
 */
export function sortEloLeaderboard(field: EloTableSortField): void {
  if (eloTableSortField === field) {
    eloTableSortDirection = eloTableSortDirection === 'desc' ? 'asc' : 'desc';
  } else {
    eloTableSortField = field;
    eloTableSortDirection = (field === 'rank' || field === 'name') ? 'asc' : 'desc';
  }
  refreshEloModal();
}

/**
 * Renders the Standalone Elo Modal DOM inside #elo-modal-content
 */
export function renderEloModalDOM(): void {
  const container = document.getElementById('elo-modal-content');
  if (!container) return;

  const bodyHTML = renderEloTab();

  container.innerHTML = `
    <!-- Modal Fixed Header -->
    ${renderEloModalHeader()}

    <!-- Navigation Tabs Bar -->
    <div class="px-2 sm:px-4 py-2 border-b grid grid-cols-4 sm:flex items-center gap-1 sm:gap-1.5 shrink-0 overflow-x-auto sm:overflow-x-visible" style="border-color: var(--table-border); background: rgba(0,0,0,0.08); scrollbar-width: none;">
      ${renderEloTabButton('trajectories', 'Traiettorie & Classifica', 'Traiettorie', 'fa-solid fa-chart-line', currentEloModalTab)}
      ${renderEloTabButton('golo', 'Elo vs Golo', 'Golo', 'fa-solid fa-futbol', currentEloModalTab)}
      ${renderEloTabButton('fp', 'Elo vs FantaPunti', 'FantaPunti', 'fa-solid fa-chart-simple', currentEloModalTab)}
      ${renderEloTabButton('luck', 'Sfiga & SOS', 'Sfiga SOS', 'fa-solid fa-clover', currentEloModalTab)}
    </div>

    <!-- Modal Scrollable Body -->
    <div class="px-3 py-2.5 sm:px-6 sm:py-3.5 overflow-y-auto space-y-2.5 flex-1 min-h-0" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
      ${bodyHTML}
    </div>

    <!-- Modal Fixed Footer -->
    ${renderEloModalFooter()}
  `;
}

/**
 * Renders Elo content body for the active tab
 */
export function renderEloTab(): string {
  const cachedAnalytics = getCachedAnalyticsManagers();

  if (!cachedAnalytics) {
    if (eloFetchError) {
      return renderEloErrorState();
    }

    prefetchEloData();
    return renderEloLoadingState();
  }

  const liveData = getLiveSeasonDetails();
  const standings = liveData?.standings || [];
  const activeMode = getEloMode();

  // Extract manager profiles combining live standings metadata with full multi-season analytics
  const profiles: EloProfileEntry[] = [];

  if (standings.length > 0) {
    for (const s of standings) {
      const eloProfile = (s.managerId ? cachedAnalytics[s.managerId] : null) || s.elo;
      if (eloProfile && eloProfile.flat && eloProfile.historical) {
        profiles.push({
          managerId: s.managerId || s.teamName,
          teamName: s.teamName,
          coach: s.coach || '',
          logo: s.logo,
          profile: eloProfile
        });
      }
    }
  } else {
    for (const [mId, prof] of Object.entries(cachedAnalytics)) {
      if (prof && prof.flat && prof.historical) {
        profiles.push({
          managerId: mId,
          teamName: prof.teamName || mId,
          coach: prof.coach || '',
          logo: undefined,
          profile: prof
        });
      }
    }
  }

  if (profiles.length === 0) {
    return renderEloEmptyState();
  }

  const isMobile = typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth > 0 && window.innerWidth < 640;
  if (!eloSeasonUserModified) {
    selectedEloSeason = isMobile ? 'last10' : 'all';
  }

  const eloConfig = getActiveEloConfig();
  const modeSwitcherHTML = renderEloModeSwitcher(activeMode);

  // Dynamically extract available seasons from profiles
  const extractedSeasons = Array.from(new Set(
    profiles.flatMap(p => [
      ...Object.keys(p.profile.seasonStats || {}),
      ...Object.keys(p.profile.flat?.seasons || {})
    ]).filter(k => k !== 'all')
  )).sort().reverse();
  const liveSeason = (typeof window !== 'undefined' && (window as any).liveSeasonData?.season) || '';
  const fallbackSeasons = liveSeason ? [liveSeason, '2025/26'] : ['2026/27', '2025/26'];
  const availableSeasons = extractedSeasons.length > 0 ? extractedSeasons : fallbackSeasons;
  if (selectedScatterSeason !== 'all' && !availableSeasons.includes(selectedScatterSeason)) {
    selectedScatterSeason = availableSeasons[0] || 'all';
  }

  const scatterSeasonPills = renderScatterSeasonPills(availableSeasons, selectedScatterSeason, profiles);

  if (currentEloModalTab === 'trajectories') {
    return `
      <div class="p-1 sm:p-2 flex flex-col gap-4 animate-fadeIn">
        ${modeSwitcherHTML}
        ${renderEloOverviewKpis(profiles, activeMode)}
        ${renderEloTrajectoryChart(profiles, activeMode, selectedEloSeason, hiddenManagerIds, lockedEloChartMatch)}
        ${renderEloLeaderboardTable(profiles, activeMode, eloTableSortField, eloTableSortDirection, selectedScatterSeason)}
        ${renderEloGuideModal(eloConfig)}
      </div>
    `;
  } else if (currentEloModalTab === 'golo') {
    return `
      <div class="p-1 sm:p-2 flex flex-col gap-4 animate-fadeIn">
        ${modeSwitcherHTML}
        ${scatterSeasonPills}
        ${renderEloScatterChart(profiles, 'golo', activeMode, selectedScatterSeason)}
        ${renderGoloExplanationCard()}
      </div>
    `;
  } else if (currentEloModalTab === 'fp') {
    return `
      <div class="p-1 sm:p-2 flex flex-col gap-4 animate-fadeIn">
        ${modeSwitcherHTML}
        ${scatterSeasonPills}
        ${renderEloScatterChart(profiles, 'fp', activeMode, selectedScatterSeason)}
        ${renderFpExplanationCard()}
      </div>
    `;
  } else {
    // currentEloModalTab === 'luck'
    return `
      <div class="p-1 sm:p-2 flex flex-col gap-4 animate-fadeIn">
        ${modeSwitcherHTML}
        ${scatterSeasonPills}
        ${renderEloScatterChart(profiles, 'luck', activeMode, selectedScatterSeason, currentLuckSubMode)}
        ${renderLuckExplanationCard()}
      </div>
    `;
  }
}

// Global window registration
if (typeof window !== 'undefined') {
  window.openEloModal = openEloModal;
  window.closeEloModal = closeEloModal;
  window.switchEloModalTab = switchEloModalTab;
  window.switchEloScatterSeason = switchEloScatterSeason;
  window.switchEloLuckSubMode = switchEloLuckSubMode;
  window.switchEloMode = switchEloMode;
  window.switchEloChartSeason = switchEloChartSeason;
  window.toggleEloManagerVisibility = toggleEloManagerVisibility;
  window.showAllEloManagers = showAllEloManagers;
  window.hideAllEloManagers = hideAllEloManagers;
  window.selectEloChartPoint = selectEloChartPoint;
  window.showEloChartHover = showEloChartHover;
  window.clearEloChartHover = clearEloChartHover;
  window.sortEloLeaderboard = sortEloLeaderboard;
  window.retryEloFetch = retryEloFetch;
}
