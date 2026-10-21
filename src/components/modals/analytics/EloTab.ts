/**
 * src/components/modals/analytics/EloTab.ts
 * Tab 5 in Analisi Modal: Dynamic Elo Engine & Manager Form Trajectories (Orchestrator)
 */

import {
  getEloMode,
  setEloMode,
  getManagerEloTrack,
  loadAnalyticsEloData,
  getCachedAnalyticsManagers,
  setCachedAnalyticsManagers,
  getActiveEloConfig
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

// Re-exports for consumers and unit tests
export {
  setCachedAnalyticsManagers,
  formatKFactorsGuide,
  renderEloGuideModal,
  renderEloOverviewKpis,
  renderEloTrajectoryChart,
  renderEloLeaderboardTable,
  MANAGER_COLORS,
  type EloProfileEntry,
  type LockedEloChartMatch,
  type EloTableSortField
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

let selectedEloSeason: string = getDefaultEloSeason();
let eloSeasonUserModified = false;
const hiddenManagerIds: Set<string> = new Set();
let lockedEloChartMatch: LockedEloChartMatch | null = null;

// Leaderboard sort state
let eloTableSortField: EloTableSortField = 'elo';
let eloTableSortDirection: 'desc' | 'asc' = 'desc';

/**
 * Re-renders the Elo tab while preserving scroll position to prevent jumping
 */
export function refreshEloTab(): void {
  if (typeof window !== 'undefined') {
    const scrollEl = document.querySelector('#concentration-modal-content .overflow-y-auto') as HTMLElement | null;
    const currentScrollTop = scrollEl ? scrollEl.scrollTop : 0;
    const container = document.getElementById('concentration-modal-content');
    if (container && (window as unknown as { switchAnalyticsTab?: (t: string) => void }).switchAnalyticsTab) {
      (window as unknown as { switchAnalyticsTab: (t: string) => void }).switchAnalyticsTab('elo');
      requestAnimationFrame(() => {
        const nextScrollEl = document.querySelector('#concentration-modal-content .overflow-y-auto') as HTMLElement | null;
        if (nextScrollEl) nextScrollEl.scrollTop = currentScrollTop;
      });
    }
  }
}

/**
 * Prefetches both live season details and analytics_data.json, re-rendering Elo tab when ready
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
    refreshEloTab();
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
  refreshEloTab();
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
  refreshEloTab();
}

export function showAllEloManagers(): void {
  hiddenManagerIds.clear();
  refreshEloTab();
}

export function hideAllEloManagers(): void {
  const liveData = getLiveSeasonDetails();
  (liveData?.standings || []).forEach(s => {
    if (s.managerId) hiddenManagerIds.add(s.managerId);
  });
  refreshEloTab();
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
  winProb: number
): void {
  lockedEloChartMatch = { season, round, team, opponent, result, elo, delta, winProb };
  showEloChartHover(season, round, team, opponent, result, elo, delta, winProb);
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
  winProb: number
): void {
  const banner = document.getElementById('elo-chart-hover-box');
  if (!banner) return;
  const deltaSign = delta > 0 ? '+' : '';
  const deltaColor = delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-400';
  const resBadge = result === 'W' ? 'text-emerald-400 font-bold' : result === 'L' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold';

  banner.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 w-full text-[11px] sm:text-xs">
      <div class="flex items-center gap-1.5 font-bold min-w-0 flex-wrap">
        <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] shrink-0">${season} G${round}</span>
        <span style="color: var(--text-main);" class="truncate max-w-[110px] sm:max-w-none">${team}</span>
        <span class="opacity-60 text-[10px] shrink-0">vs</span>
        <span style="color: var(--text-muted);" class="truncate max-w-[110px] sm:max-w-none">${opponent || 'Avversario'}</span>
        <span class="${resBadge} shrink-0">(${result})</span>
      </div>
      <div class="flex items-center gap-2 font-mono shrink-0">
        <span class="font-black text-amber-400 text-xs sm:text-sm">${elo.toFixed(1)} pt</span>
        <span class="${deltaColor} font-bold text-[11px]">(${deltaSign}${delta.toFixed(1)})</span>
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
        matchPt.winProbPreMatch || 0
      );
      return;
    } else {
      showEloChartHover(
        lockedEloChartMatch.season,
        lockedEloChartMatch.round,
        lockedEloChartMatch.team,
        lockedEloChartMatch.opponent,
        lockedEloChartMatch.result || '',
        lockedEloChartMatch.elo ?? 1500,
        lockedEloChartMatch.delta ?? 0,
        lockedEloChartMatch.winProb ?? 50
      );
      return;
    }
  }

  banner.innerHTML = `
    <span class="opacity-70 truncate"><i class="fa-solid fa-hand-pointer mr-1.5 text-amber-500"></i>Tocca o passa sui punti per visualizzare i dettagli del match</span>
  `;
}

/**
 * Switches Elo mode and refreshes
 */
export function switchEloMode(mode: 'flat' | 'historical'): void {
  setEloMode(mode);
  refreshEloTab();
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
  refreshEloTab();
}

/**
 * Renders Tab 5 (Elo Rating & Forma) HTML content
 */
export function renderEloTab(): string {
  const cachedAnalytics = getCachedAnalyticsManagers();

  // If full multi-season analytics data is not ready, handle loading or error state
  if (!cachedAnalytics) {
    if (eloFetchError) {
      return `
        <div class="p-8 text-center text-xs opacity-80 flex flex-col items-center justify-center gap-3">
          <i class="fa-solid fa-triangle-exclamation text-amber-500 text-2xl"></i>
          <div class="font-bold text-sm" style="color: var(--text-main);">Dati Elo non disponibili</div>
          <p class="text-[11px] opacity-70 max-w-sm" style="color: var(--text-muted);">
            Impossibile caricare il file analytics_data.json. Verifica la connessione o prova a ricaricare.
          </p>
          <button type="button"
                  onclick="window.retryEloFetch && window.retryEloFetch()"
                  class="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition cursor-pointer">
            <i class="fa-solid fa-rotate-right mr-1.5"></i>
            <span>Riprova</span>
          </button>
        </div>
      `;
    }

    prefetchEloData();

    return `
      <div class="p-8 text-center text-xs opacity-80 flex flex-col items-center justify-center gap-3">
        <i class="fa-solid fa-spinner fa-spin text-amber-500 text-2xl"></i>
        <div class="font-bold text-sm" style="color: var(--text-main);">Caricamento dati Elo in corso...</div>
        <p class="text-[11px] opacity-70 max-w-sm" style="color: var(--text-muted);">
          Recupero valutazioni dinamiche e traiettorie forma per tutti i manager della lega.
        </p>
        <button type="button"
                onclick="window.retryEloFetch && window.retryEloFetch()"
                class="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition cursor-pointer">
          <i class="fa-solid fa-rotate-right mr-1"></i>
          <span>Riprova</span>
        </button>
      </div>
    `;
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
    return `
      <div class="p-8 text-center text-xs opacity-80 flex flex-col items-center justify-center gap-3">
        <i class="fa-solid fa-circle-info text-amber-500 text-2xl"></i>
        <div class="font-bold text-sm" style="color: var(--text-main);">Nessun dato Elo disponibile</div>
        <p class="text-[11px] opacity-70 max-w-sm" style="color: var(--text-muted);">
          Nessuna valutazione registrata per la stagione corrente.
        </p>
      </div>
    `;
  }

  // Update default season on mobile if user has not explicitly modified it
  const isMobile = typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth > 0 && window.innerWidth < 640;
  if (!eloSeasonUserModified) {
    selectedEloSeason = isMobile ? 'last10' : 'all';
  }

  const eloConfig = getActiveEloConfig();

  return `
    <div class="p-3.5 sm:p-5 flex flex-col gap-4 animate-fadeIn">
      <!-- Mode Switcher & Explanation Banner -->
      <div class="p-3 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
           style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-sport font-black text-sm sm:text-base tracking-wide flex items-center gap-1.5" style="color: var(--text-main);">
              <i class="fa-solid fa-bolt text-amber-500"></i>
              <span>Dynamic Elo Rating Engine</span>
            </h3>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 uppercase tracking-wider">
              Dual-Track
            </span>
          </div>
          <p class="text-[11px] opacity-75 mt-0.5 max-w-xl" style="color: var(--text-muted);">
            ${activeMode === 'flat'
      ? '<strong>Traccia Pura (1500 Baseline):</strong> Reset a 1500 per tutti a inizio 2025/26. Misura la pura prestazione sul campo con carryover al 75% tra stagioni.'
      : '<strong>Traccia Storica (Ponderata):</strong> Inizializzazione basata sull\'indice di prestigio storico dell\'Albo d\'Oro e scalata in base al rendimento continuo.'}
          </p>
        </div>

        <!-- Mode Toggle Segmented Control -->
        <div class="flex items-center p-1 rounded-xl border shrink-0 w-full sm:w-auto"
             style="background-color: var(--input-bg); border-color: var(--table-border);">
          <button type="button"
                  onclick="window.switchEloMode && window.switchEloMode('flat')"
                  class="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${activeMode === 'flat' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
            <span>⚡ Elo Puro</span>
          </button>
          <button type="button"
                  onclick="window.switchEloMode && window.switchEloMode('historical')"
                  class="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${activeMode === 'historical' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
            <span>🏛️ Elo Storico</span>
          </button>
        </div>
      </div>

      <!-- Quick KPI Stats Cards -->
      ${renderEloOverviewKpis(profiles, activeMode)}

      <!-- Multi-Team Trajectory SVG Chart Card -->
      ${renderEloTrajectoryChart(profiles, activeMode, selectedEloSeason, hiddenManagerIds, lockedEloChartMatch)}

      <!-- Leaderboard Table Card -->
      ${renderEloLeaderboardTable(profiles, activeMode, eloTableSortField, eloTableSortDirection)}

      <!-- Collapsible Educational Info Box for Elo Rating Engine -->
      ${renderEloGuideModal(eloConfig)}
    </div>
  `;
}

// Global window registration
if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.switchEloMode = switchEloMode;
  w.switchEloChartSeason = switchEloChartSeason;
  w.toggleEloManagerVisibility = toggleEloManagerVisibility;
  w.showAllEloManagers = showAllEloManagers;
  w.hideAllEloManagers = hideAllEloManagers;
  w.selectEloChartPoint = selectEloChartPoint;
  w.showEloChartHover = showEloChartHover;
  w.clearEloChartHover = clearEloChartHover;
  w.sortEloLeaderboard = sortEloLeaderboard;
  w.retryEloFetch = retryEloFetch;
}
