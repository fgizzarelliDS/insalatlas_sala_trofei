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

let currentEloModalTab: EloModalTab = 'trajectories';
let selectedEloSeason: string = getDefaultEloSeason();
let selectedScatterSeason: string = '2026/27';
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
    if (container && (window as any).switchAnalyticsTab) {
      (window as any).switchAnalyticsTab('elo');
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

  const tabButton = (id: EloModalTab, label: string, mobileLabel: string, icon: string) => {
    const isActive = currentEloModalTab === id;
    return `
      <button 
        type="button" 
        onclick="window.switchEloModalTab && window.switchEloModalTab('${id}')" 
        class="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition shadow-sm whitespace-nowrap ${isActive ? '' : 'hover:bg-white/5'}"
        style="${isActive
        ? 'background-color: var(--btn-bg); color: var(--btn-text); border: 1px solid var(--btn-border);'
        : 'color: var(--text-muted); background: transparent; border: 1px solid transparent;'
      }"
      >
        <i class="${icon} text-[9px] sm:text-xs shrink-0"></i>
        <span>
          <span class="sm:hidden">${mobileLabel}</span>
          <span class="hidden sm:inline">${label}</span>
        </span>
      </button>
    `;
  };

  const bodyHTML = renderEloTab();

  container.innerHTML = `
    <!-- Modal Fixed Header -->
    <div class="px-3.5 py-2.5 sm:px-6 sm:py-3.5 border-b flex items-center justify-between shrink-0" style="border-color: var(--table-border);">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-sm" style="background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.3);">
          <i class="fa-solid fa-bolt text-violet-400"></i>
        </div>
        <div>
          <h2 class="flex items-center gap-2 text-sm sm:text-base font-black tracking-tight" style="color: var(--text-main);">
            <span>Elo Rating &amp; Power Studio</span>
            <img src="favicon-64x64.png" alt="InsalAtlas logo" class="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
          </h2>
          <span class="text-[11px]" style="color: var(--text-muted);">Calibrazione 3-Track • Studio Golo • Correlazione FP • Sfiga SOS</span>
        </div>
      </div>
      <button type="button" onclick="window.closeEloModal && window.closeEloModal()" class="w-7 h-7 rounded-full flex items-center justify-center transition border cursor-pointer"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>

    <!-- Navigation Tabs Bar -->
    <div class="px-2 sm:px-4 py-2 border-b grid grid-cols-4 sm:flex items-center gap-1 sm:gap-1.5 shrink-0 overflow-x-auto sm:overflow-x-visible" style="border-color: var(--table-border); background: rgba(0,0,0,0.08); scrollbar-width: none;">
      ${tabButton('trajectories', 'Traiettorie & Classifica', 'Traiettorie', 'fa-solid fa-chart-line')}
      ${tabButton('golo', 'Elo vs Golo', 'Golo', 'fa-solid fa-futbol')}
      ${tabButton('fp', 'Elo vs FantaPunti', 'FantaPunti', 'fa-solid fa-chart-simple')}
      ${tabButton('luck', 'Sfiga & SOS', 'Sfiga SOS', 'fa-solid fa-clover')}
    </div>

    <!-- Modal Scrollable Body -->
    <div class="px-3 py-2.5 sm:px-6 sm:py-3.5 overflow-y-auto space-y-2.5 flex-1 min-h-0" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
      ${bodyHTML}
    </div>

    <!-- Modal Fixed Footer -->
    <div class="px-3.5 py-2 sm:px-6 sm:py-3 border-t flex justify-end shrink-0" style="border-color: var(--table-border);">
      <button type="button" onclick="window.closeEloModal && window.closeEloModal()" class="px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition shadow-sm cursor-pointer"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        Chiudi
      </button>
    </div>
  `;
}

/**
 * Renders Elo content body for the active tab
 */
export function renderEloTab(): string {
  const cachedAnalytics = getCachedAnalyticsManagers();

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
        <div class="font-bold text-sm" style="color: var(--text-main);">Caricamento dati Elo & Power Studio in corso...</div>
        <p class="text-[11px] opacity-70 max-w-sm" style="color: var(--text-muted);">
          Recupero valutazioni dinamiche 3-track e diagnostiche multi-stagione.
        </p>
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

  const isMobile = typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth > 0 && window.innerWidth < 640;
  if (!eloSeasonUserModified) {
    selectedEloSeason = isMobile ? 'last10' : 'all';
  }

  const eloConfig = getActiveEloConfig();

  // 3-Track Mode Switcher Bar
  const modeSwitcherHTML = `
    <div class="p-3 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div>
        <div class="flex items-center gap-2">
          <h3 class="font-sport font-black text-sm sm:text-base tracking-wide flex items-center gap-1.5" style="color: var(--text-main);">
            <i class="fa-solid fa-bolt text-amber-500"></i>
            <span>Dynamic Elo 3-Track System</span>
          </h3>
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 uppercase tracking-wider">
            ${activeMode === 'flat' ? '⚡ Puro' : activeMode === 'historical' ? '🏛️ Storico' : '🔮 Atlas Power'}
          </span>
        </div>
        <p class="text-[11px] opacity-75 mt-0.5 max-w-xl" style="color: var(--text-muted);">
          ${activeMode === 'flat'
            ? '<strong>Traccia Pura (1500 Baseline):</strong> Reset a 1500 per tutti a inizio 2025/26. Calibrazione Hybrid-Capped con risoluzione del paradosso dei pareggi e carryover inter-stagionale mean-centered.'
            : activeMode === 'historical'
              ? '<strong>Traccia Storica (Ponderata):</strong> Inizializzazione basata sull\'Indice di Prestigio dell\'Albo d\'Oro (1350-1650 pt) con aggiornamento bilaterale Hybrid-Capped.'
              : '<strong>Traccia Atlas Power (All-Play):</strong> Modello continuo basato sulla funzione sigmoide di Fermi-Dirac (s = 8.5) e kernel All-Play simmetrico, isolando la qualità assoluta del roster dal calendario.'}
        </p>
      </div>

      <!-- Mode Toggle 3-Track Segmented Control -->
      <div class="flex items-center p-1 rounded-xl border shrink-0 w-full sm:w-auto"
           style="background-color: var(--input-bg); border-color: var(--table-border);">
        <button type="button"
                onclick="window.switchEloMode && window.switchEloMode('flat')"
                class="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${activeMode === 'flat' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
          <span>⚡ Puro</span>
        </button>
        <button type="button"
                onclick="window.switchEloMode && window.switchEloMode('historical')"
                class="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${activeMode === 'historical' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
          <span>🏛️ Storico</span>
        </button>
        <button type="button"
                onclick="window.switchEloMode && window.switchEloMode('atlas')"
                class="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${activeMode === 'atlas' ? 'bg-purple-500 text-white shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
          <span>🔮 Atlas</span>
        </button>
      </div>
    </div>
  `;

  // Season Pills for Scatter Tabs
  const scatterSeasonPills = `
    <div class="flex items-center justify-between gap-2 p-2 rounded-xl border flex-wrap text-xs"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="flex items-center gap-2">
        <span class="text-[11px] font-bold opacity-75" style="color: var(--text-muted);">
          <i class="fa-solid fa-calendar-days mr-1 text-amber-400"></i>Periodo Analisi:
        </span>
        <div class="flex items-center p-0.5 rounded-lg border" style="background-color: var(--input-bg); border-color: var(--table-border);">
          <button type="button"
                  onclick="window.switchEloScatterSeason && window.switchEloScatterSeason('2026/27')"
                  class="px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${selectedScatterSeason === '2026/27' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
            <span>2026/27 (Attuale)</span>
          </button>
          <button type="button"
                  onclick="window.switchEloScatterSeason && window.switchEloScatterSeason('2025/26')"
                  class="px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${selectedScatterSeason === '2025/26' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
            <span>2025/26</span>
          </button>
          <button type="button"
                  onclick="window.switchEloScatterSeason && window.switchEloScatterSeason('all')"
                  class="px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${selectedScatterSeason === 'all' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
            <span>Totale Era Elo</span>
          </button>
        </div>
      </div>
      <span class="text-[10px] font-mono opacity-60" style="color: var(--text-muted);">
        ${
          profiles.filter(p => {
            if (!p.profile.seasonStats) return true;
            const st = selectedScatterSeason === 'all'
              ? p.profile.seasonStats['all']
              : p.profile.seasonStats[selectedScatterSeason];
            return Boolean(st && typeof st.played === 'number' ? st.played > 0 : true);
          }).length
        } team analizzati
      </span>
    </div>
  `;

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
        
        <!-- Explanation card for Golo Score -->
        <div class="p-3.5 sm:p-4 rounded-2xl border text-xs leading-relaxed"
             style="background-color: var(--table-surface); border-color: var(--table-border); color: var(--text-muted);">
          <div class="font-bold text-xs sm:text-sm flex items-center gap-2 mb-1" style="color: var(--text-main);">
            <i class="fa-solid fa-futbol text-amber-400"></i>
            <span>Come Leggere lo Studio Golo Score</span>
          </div>
          <p class="text-[11px] leading-relaxed">
            Il <strong>Golo Score</strong> è l'indice proprietario di efficienza di conversione realizzativa: misura il rapporto tra i gol reali segnati e quelli attesi in base alla soglia dei FantaPunti (FP).
            La linea di parità a <strong>1.00</strong> separa i manager cinici capaci di massimizzare i gol con scarti minimi da chi disperde punti senza trasformarli in marcature.
          </p>
        </div>
      </div>
    `;
  } else if (currentEloModalTab === 'fp') {
    return `
      <div class="p-1 sm:p-2 flex flex-col gap-4 animate-fadeIn">
        ${modeSwitcherHTML}
        ${scatterSeasonPills}
        ${renderEloScatterChart(profiles, 'fp', activeMode, selectedScatterSeason)}
        
        <!-- Explanation card for FP vs Elo -->
        <div class="p-3.5 sm:p-4 rounded-2xl border text-xs leading-relaxed"
             style="background-color: var(--table-surface); border-color: var(--table-border); color: var(--text-muted);">
          <div class="font-bold text-xs sm:text-sm flex items-center gap-2 mb-1" style="color: var(--text-main);">
            <i class="fa-solid fa-chart-simple text-purple-400"></i>
            <span>Potenza Roster vs Efficienza Elo</span>
          </div>
          <p class="text-[11px] leading-relaxed">
            La retta di regressione OLS evidenzia il tasso di conversione marginale: quanti punti Elo garantisce ogni FantaPunto medio addizionale.
            I manager nel quadrante in alto a sinistra (<em>Cinici / Fortunati</em>) raggiungono rating elevati nonostante medie punteggio contenute; al contrario, i <em>Giganti d'Argilla</em> producono punteggi mostruosi ma raccolgono meno rating del previsto per sfortuna nei match-up.
          </p>
        </div>
      </div>
    `;
  } else {
    // currentEloModalTab === 'luck'
    return `
      <div class="p-1 sm:p-2 flex flex-col gap-4 animate-fadeIn">
        ${modeSwitcherHTML}
        ${scatterSeasonPills}
        ${renderEloScatterChart(profiles, 'luck', activeMode, selectedScatterSeason, currentLuckSubMode)}
        
        <!-- Explanation card for Sfiga & SOS -->
        <div class="p-3.5 sm:p-4 rounded-2xl border text-xs leading-relaxed"
             style="background-color: var(--table-surface); border-color: var(--table-border); color: var(--text-muted);">
          <div class="font-bold text-xs sm:text-sm flex items-center gap-2 mb-1" style="color: var(--text-main);">
            <i class="fa-solid fa-clover text-cyan-400"></i>
            <span>Diagnostica Schedule Luck &amp; Confronto All-Play</span>
          </div>
          <p class="text-[11px] leading-relaxed">
            La bisettrice perfetta <strong>Y = X</strong> rappresenta la neutralità statistica assoluta.
            Nel confronto <em>Punti Reali vs xPts</em>, i punti al di sopra della retta testimoniano un calendario benevolo (più punti vinti di quanti previsti affrontando l'intera lega contemporaneamente).
            Nel confronto <em>Elo Puro vs Atlas Power</em>, la distanza dalla bisettrice quantifica la discrepanza tra la fortuna degli incroci bilaterali e la vera forza intrinseca della rosa.
          </p>
        </div>
      </div>
    `;
  }
}

// Global window registration
if (typeof window !== 'undefined') {
  (window as any).openEloModal = openEloModal;
  (window as any).closeEloModal = closeEloModal;
  (window as any).switchEloModalTab = switchEloModalTab;
  (window as any).switchEloScatterSeason = switchEloScatterSeason;
  (window as any).switchEloLuckSubMode = switchEloLuckSubMode;
  (window as any).switchEloMode = switchEloMode;
  (window as any).switchEloChartSeason = switchEloChartSeason;
  (window as any).toggleEloManagerVisibility = toggleEloManagerVisibility;
  (window as any).showAllEloManagers = showAllEloManagers;
  (window as any).hideAllEloManagers = hideAllEloManagers;
  (window as any).selectEloChartPoint = selectEloChartPoint;
  (window as any).showEloChartHover = showEloChartHover;
  (window as any).clearEloChartHover = clearEloChartHover;
  (window as any).sortEloLeaderboard = sortEloLeaderboard;
  (window as any).retryEloFetch = retryEloFetch;
}
