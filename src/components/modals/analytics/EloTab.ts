/**
 * src/components/modals/analytics/EloTab.ts
 * Tab 5 in Analisi Modal: Dynamic Elo Engine & Manager Form Trajectories
 */

import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import {
  getEloMode,
  setEloMode,
  getManagerEloTrack,
  getEloBadgeClasses,
  getEloTierTitle,
  formatElo,
  loadAnalyticsEloData,
  getCachedAnalyticsManagers,
  setCachedAnalyticsManagers,
  getActiveEloConfig,
  computeEloWinProbability
} from '@/analytics/analyticsCore';
import { getLiveSeasonDetails, loadLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import type { ManagerEloProfile } from '@/types/analytics';

export { setCachedAnalyticsManagers };

let isFetchingElo = false;
let eloFetchError = false;

export function retryEloFetch(): void {
  eloFetchError = false;
  prefetchEloData();
}

// Chart state
let selectedEloSeason: string = 'all';
const hiddenManagerIds: Set<string> = new Set();

// Leaderboard sort state
type EloTableSortField = 'rank' | 'name' | 'elo' | 'delta' | 'peak' | 'floor';
let eloTableSortField: EloTableSortField = 'elo';
let eloTableSortDirection: 'desc' | 'asc' = 'desc';

/**
 * Re-renders the Elo tab while preserving scroll position to prevent jumping
 */
function refreshEloTab(): void {
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

// Palette of 14 distinct high-contrast colors for manager trajectory paths
const MANAGER_COLORS = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#10b981', // emerald
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#eab308', // yellow
  '#a855f7', // violet
  '#6366f1', // indigo
  '#84cc16', // lime
  '#ef4444', // red
  '#64748b'  // slate
];

interface LockedEloChartMatch {
  season: string;
  round: number;
  team: string;
  opponent: string;
  result?: string;
  elo?: number;
  delta?: number;
  winProb?: number;
}

let lockedEloChartMatch: LockedEloChartMatch | null = null;

/**
 * Switches season or recent window filter on the SVG trajectory chart
 */
export function switchEloChartSeason(season: string): void {
  selectedEloSeason = season;
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
 * Formats competition K-Factors dynamically into a badge and descriptive Italian text
 */
export function formatKFactorsGuide(kFactors: Record<string, number>): { badge: string; description: string } {
  const nameMap: Record<string, string> = {
    Campionato: 'il Campionato',
    Mundialito: 'il Mundialito',
    Coppa: 'le gare di Coppa',
    Supercoppa: 'la Supercoppa',
    Coppa_Knockout: 'le Fasi Finali di Coppa',
    Perdenti: 'il Torneo Perdenti'
  };

  const badgeNameMap: Record<string, string> = {
    Campionato: 'Campionato',
    Mundialito: 'Mundialito',
    Coppa: 'Coppa',
    Supercoppa: 'Supercoppa',
    Coppa_Knockout: 'Coppa KO',
    Perdenti: 'Perdenti'
  };

  const groupsByK = new Map<number, string[]>();
  const badgeGroupsByK = new Map<number, string[]>();

  for (const [comp, kVal] of Object.entries(kFactors)) {
    if (comp === 'default') continue;
    const label = nameMap[comp] || comp;
    const badgeLabel = badgeNameMap[comp] || comp;
    if (!groupsByK.has(kVal)) {
      groupsByK.set(kVal, []);
      badgeGroupsByK.set(kVal, []);
    }
    groupsByK.get(kVal)!.push(label);
    badgeGroupsByK.get(kVal)!.push(badgeLabel);
  }

  const sortedKs = Array.from(groupsByK.keys()).sort((a, b) => b - a);

  const badgeParts = sortedKs.map(k => {
    const comps = badgeGroupsByK.get(k)!;
    return `${comps.join(' / ')}: K=${k}`;
  });
  const badge = badgeParts.join(' • ') || 'K=32';

  const clauses: string[] = [];
  sortedKs.forEach((k) => {
    const comps = groupsByK.get(k)!;
    const compsText = comps.length > 1
      ? `${comps.slice(0, -1).join(', ')} e ${comps[comps.length - 1]}`
      : comps[0];
    const isPlural = comps.length > 1 || comps[0].startsWith('le ') || comps[0].startsWith('i ');
    const verb = isPlural ? 'hanno' : 'ha';

    if (k >= 40) {
      clauses.push(`${compsText} ${verb} K=${k} (massimo impatto per le sfide decisive a eliminazione diretta)`);
    } else if (k >= 32) {
      clauses.push(`${compsText} ${verb} K=${k} (massima rilevanza per la stagione regolare)`);
    } else if (k >= 24) {
      clauses.push(`${compsText} ${verb} K=${k} per moderare la volatilità dei match di coppa`);
    } else {
      clauses.push(`${compsText} ${verb} K=${k} (impatto contenuto per i tornei secondari)`);
    }
  });

  const description = `Il fattore K definisce il peso del torneo: ${clauses.join(', mentre ')}.`;
  return { badge, description };
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
        <div class="p-8 text-center text-xs opacity-90 flex flex-col items-center justify-center gap-3">
          <i class="fa-solid fa-triangle-exclamation text-rose-500 text-3xl"></i>
          <div class="font-bold text-sm" style="color: var(--text-main);">Impossibile caricare i dati Elo completi</div>
          <p class="text-[11px] opacity-75 max-w-sm" style="color: var(--text-muted);">
            Si è verificato un errore durante il recupero delle metriche e delle traiettorie multi-stagione.
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

  // Active Elo configuration parameters for guide & formulas
  const eloConfig = getActiveEloConfig();
  const scaleFactor = eloConfig.scaleFactor || 400;
  const baseRating = eloConfig.baseRating || 1500;
  const carryoverAlpha = eloConfig.carryoverAlpha ?? 0.75;
  const carryoverBetaStr = (1 - carryoverAlpha).toFixed(2);
  const carryoverPreservedPct = Math.round(carryoverAlpha * 100);
  const carryoverRegressedPct = Math.round((1 - carryoverAlpha) * 100);
  const probDiff100 = computeEloWinProbability(baseRating + 100, baseRating, scaleFactor).toFixed(0);
  const kGuide = formatKFactorsGuide(eloConfig.kFactors || {});

  // Extract manager profiles combining live standings metadata with full multi-season analytics
  const profiles: Array<{
    managerId: string;
    teamName: string;
    coach: string;
    logo?: string;
    profile: ManagerEloProfile;
  }> = [];

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

  // Default sorted by rating descending for KPIs
  const kpiProfiles = [...profiles].sort((a, b) => {
    const rA = getManagerEloTrack(a.profile, activeMode)?.current ?? 1500;
    const rB = getManagerEloTrack(b.profile, activeMode)?.current ?? 1500;
    return rB - rA;
  });

  // Calculate KPI stats
  const topManager = kpiProfiles[0];
  const topTrack = getManagerEloTrack(topManager?.profile, activeMode);

  // Best last round delta
  let bestDelta = -999;
  let topGainer = kpiProfiles[0];
  for (const p of kpiProfiles) {
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (tr && tr.lastDelta > bestDelta) {
      bestDelta = tr.lastDelta;
      topGainer = p;
    }
  }

  // All-time highest peak
  let highestPeak = 1500;
  let peakManager = kpiProfiles[0];
  for (const p of kpiProfiles) {
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (tr && tr.peak.value > highestPeak) {
      highestPeak = tr.peak.value;
      peakManager = p;
    }
  }

  // Lowest rating
  const lowestManager = kpiProfiles[kpiProfiles.length - 1];
  const lowestTrack = getManagerEloTrack(lowestManager?.profile, activeMode);
  const spread = ((topTrack?.current ?? 1500) - (lowestTrack?.current ?? 1500)).toFixed(1);

  // SVG Chart Dimensions
  const svgWidth = 640;
  const svgHeight = 280;
  const pad = { top: 25, right: 35, bottom: 40, left: 45 };
  const innerW = svgWidth - pad.left - pad.right;
  const innerH = svgHeight - pad.top - pad.bottom;

  // Collect all distinct global (season, round) pairs present across managers
  const allGlobalRoundsMap = new Map<string, { season: string; round: number }>();
  kpiProfiles.forEach(p => {
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (!tr) return;
    tr.trajectory.forEach(pt => {
      const key = `${pt.season}-G${pt.round}`;
      if (!allGlobalRoundsMap.has(key)) {
        allGlobalRoundsMap.set(key, { season: pt.season, round: pt.round });
      }
    });
  });

  const allOrderedGlobalRounds = Array.from(allGlobalRoundsMap.values()).sort((a, b) => {
    if (a.season !== b.season) return a.season.localeCompare(b.season);
    return a.round - b.round;
  });

  const isLastN = selectedEloSeason.startsWith('last');
  const lastNCount = isLastN
    ? (selectedEloSeason === 'last10' ? 10 : selectedEloSeason === 'last20' ? 20 : 30)
    : null;

  let orderedRounds: Array<{ season: string; round: number }> = [];
  let allowedRoundKeys: Set<string> | null = null;

  if (lastNCount !== null) {
    orderedRounds = allOrderedGlobalRounds.slice(-lastNCount);
    allowedRoundKeys = new Set(orderedRounds.map(r => `${r.season}-G${r.round}`));
  } else {
    const roundsSet = new Map<string, { season: string; round: number }>();
    kpiProfiles.forEach(p => {
      const tr = getManagerEloTrack(p.profile, activeMode);
      if (!tr) return;
      const pts = (selectedEloSeason !== 'all' && tr.seasons?.[selectedEloSeason])
        ? tr.seasons[selectedEloSeason]
        : tr.trajectory.filter(pt => selectedEloSeason === 'all' || pt.season === selectedEloSeason);
      pts.forEach(pt => {
        const key = `${pt.season}-G${pt.round}`;
        if (!roundsSet.has(key)) {
          roundsSet.set(key, { season: pt.season, round: pt.round });
        }
      });
    });
    orderedRounds = Array.from(roundsSet.values()).sort((a, b) => {
      if (a.season !== b.season) return a.season.localeCompare(b.season);
      return a.round - b.round;
    });
  }

  // Calculate dynamic min/max Elo rating for visible points in window
  let minRating = 9999;
  let maxRating = -9999;

  kpiProfiles.forEach(p => {
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (!tr) return;
    const pts = allowedRoundKeys !== null
      ? tr.trajectory.filter(pt => allowedRoundKeys!.has(`${pt.season}-G${pt.round}`))
      : (selectedEloSeason !== 'all' && tr.seasons?.[selectedEloSeason])
        ? tr.seasons[selectedEloSeason]
        : tr.trajectory.filter(pt => selectedEloSeason === 'all' || pt.season === selectedEloSeason);
    pts.forEach(pt => {
      if (pt.elo < minRating) minRating = Math.floor(pt.elo - 20);
      if (pt.elo > maxRating) maxRating = Math.ceil(pt.elo + 20);
    });
  });

  if (minRating === 9999 || maxRating === -9999) {
    minRating = 1400;
    maxRating = 1650;
  }

  const totalPointsCount = orderedRounds.length;
  const roundIndexMap = new Map<string, number>();
  orderedRounds.forEach((r, idx) => {
    roundIndexMap.set(`${r.season}-G${r.round}`, idx);
  });

  const getX = (idx: number) => {
    if (totalPointsCount <= 1) return pad.left + innerW / 2;
    return pad.left + (idx / (totalPointsCount - 1)) * innerW;
  };

  const getY = (val: number) => {
    return pad.top + ((maxRating - val) / (maxRating - minRating)) * innerH;
  };

  // Generate SVG gridlines
  const ySteps = 5;
  let gridLines = '';
  for (let i = 0; i <= ySteps; i++) {
    const val = minRating + ((maxRating - minRating) / ySteps) * i;
    const y = getY(val);
    gridLines += `
      <line x1="${pad.left}" y1="${y}" x2="${pad.left + innerW}" y2="${y}" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="3,3" />
      <text x="${pad.left - 8}" y="${y + 3.5}" text-anchor="end" font-size="9" font-family="monospace" fill="currentColor" opacity="0.5">${Math.round(val)}</text>
    `;
  }

  // X Axis labels
  let xLabels = '';
  const labelInterval = totalPointsCount > 20 ? Math.ceil(totalPointsCount / 10) : 1;
  orderedRounds.forEach((r, idx) => {
    const isSeasonStart = idx === 0 || r.season !== orderedRounds[idx - 1].season;
    if (idx % labelInterval === 0 || idx === totalPointsCount - 1 || isSeasonStart) {
      const x = getX(idx);
      const isBoundary = isSeasonStart && idx > 0;
      if (isBoundary) {
        xLabels += `
          <line x1="${x}" y1="${pad.top}" x2="${x}" y2="${pad.top + innerH}" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3,3" />
          <text x="${x + 4}" y="${pad.top + 10}" font-size="8.5" font-weight="bold" fill="currentColor" opacity="0.7">${r.season}</text>
        `;
      }
      xLabels += `
        <line x1="${x}" y1="${pad.top}" x2="${x}" y2="${pad.top + innerH}" stroke="currentColor" stroke-opacity="0.05" />
        <text x="${x}" y="${pad.top + innerH + 16}" text-anchor="middle" font-size="8.5" font-weight="bold" fill="currentColor" opacity="0.6">G${r.round}</text>
      `;
    }
  });

  // Build Trajectory Paths, Dots and Legend Items
  let pathsHTML = '';
  let dotsHTML = '';
  let legendItems = '';

  kpiProfiles.forEach((p, idx) => {
    const color = MANAGER_COLORS[idx % MANAGER_COLORS.length];
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (!tr) return;

    const isHidden = hiddenManagerIds.has(p.managerId);

    const ptsSource = allowedRoundKeys !== null
      ? tr.trajectory.filter(pt => allowedRoundKeys!.has(`${pt.season}-G${pt.round}`))
      : (selectedEloSeason !== 'all' && tr.seasons?.[selectedEloSeason])
        ? tr.seasons[selectedEloSeason]
        : tr.trajectory.filter(pt => selectedEloSeason === 'all' || pt.season === selectedEloSeason);

    const trajectoryPts = [...ptsSource].sort((a, b) => {
      if (a.season !== b.season) return a.season.localeCompare(b.season);
      return a.round - b.round;
    });

    if (!isHidden && trajectoryPts.length > 0) {
      let pathD = '';
      trajectoryPts.forEach((pt, pIdx) => {
        const ptIdx = roundIndexMap.get(`${pt.season}-G${pt.round}`) ?? pIdx;
        const x = getX(ptIdx);
        const y = getY(pt.elo);
        if (pIdx === 0) {
          pathD += `M ${x} ${y}`;
        } else {
          pathD += ` L ${x} ${y}`;
        }

        const escapedTeam = p.teamName.replace(/'/g, "\\'");
        const escapedOpp = (pt.opponentTeamName || '').replace(/'/g, "\\'");

        const isSelected = lockedEloChartMatch &&
          lockedEloChartMatch.team === p.teamName &&
          lockedEloChartMatch.season === pt.season &&
          lockedEloChartMatch.round === pt.round;
        const ringHTML = isSelected
          ? `<circle class="elo-active-ring" cx="${x}" cy="${y}" r="7" fill="none" stroke="#fbbf24" stroke-width="2" pointer-events="none"></circle>`
          : '';

        // Visible node dot (pointer-events none) + transparent hit target circle (r=12)
        dotsHTML += `
          ${ringHTML}
          <circle cx="${x}" cy="${y}" r="3.2" fill="${color}" stroke="#0f172a" stroke-width="1.5" pointer-events="none"></circle>
          <circle cx="${x}" cy="${y}" r="12" fill="transparent" stroke="transparent" class="cursor-pointer"
                  onclick="window.selectEloChartPoint && window.selectEloChartPoint('${pt.season}', ${pt.round}, '${escapedTeam}', '${escapedOpp}', '${pt.result || '-'}', ${pt.elo}, ${pt.delta}, ${pt.winProbPreMatch ?? 0})"
                  onmouseenter="window.showEloChartHover && window.showEloChartHover('${pt.season}', ${pt.round}, '${escapedTeam}', '${escapedOpp}', '${pt.result || '-'}', ${pt.elo}, ${pt.delta}, ${pt.winProbPreMatch ?? 0})"
                  onmouseleave="window.clearEloChartHover && window.clearEloChartHover()">
            <title>${p.teamName} (${pt.season} G${pt.round}): ${pt.elo.toFixed(1)} (${pt.delta > 0 ? '+' : ''}${pt.delta.toFixed(1)})</title>
          </circle>
        `;
      });

      pathsHTML += `
        <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
              class="transition-opacity opacity-85 hover:opacity-100 hover:stroke-[3.5] cursor-pointer">
          <title>${p.teamName}: ${formatElo(tr.current)}</title>
        </path>
      `;
    }

    // Clickable Legend item chip
    const chipOpacity = isHidden ? 'opacity-40 grayscale line-through' : 'opacity-100';
    legendItems += `
      <button type="button"
              onclick="window.toggleEloManagerVisibility && window.toggleEloManagerVisibility('${p.managerId}')"
              class="flex items-center gap-1.5 text-[10px] font-semibold whitespace-nowrap px-2 py-1 rounded-lg border transition cursor-pointer hover:scale-105 active:scale-95 ${chipOpacity}"
              style="border-color: var(--table-border); background-color: var(--table-surface);"
              title="Clicca per mostrare o nascondere ${p.teamName}">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${color};"></span>
        <span class="truncate max-w-[85px] sm:max-w-[110px]" style="color: var(--text-main);">${p.teamName}</span>
        <span class="font-mono font-bold" style="color: ${color};">${formatElo(tr.current)}</span>
      </button>
    `;
  });

  // Sort profiles for the table according to eloTableSortField & eloTableSortDirection
  const dirMultiplier = eloTableSortDirection === 'desc' ? -1 : 1;
  const tableProfiles = [...profiles].sort((a, b) => {
    const trA = getManagerEloTrack(a.profile, activeMode);
    const trB = getManagerEloTrack(b.profile, activeMode);
    if (!trA || !trB) return 0;

    if (eloTableSortField === 'name') {
      return dirMultiplier * a.teamName.localeCompare(b.teamName);
    } else if (eloTableSortField === 'delta') {
      return dirMultiplier * (trA.lastDelta - trB.lastDelta);
    } else if (eloTableSortField === 'peak') {
      return dirMultiplier * (trA.peak.value - trB.peak.value);
    } else if (eloTableSortField === 'floor') {
      return dirMultiplier * (trA.floor.value - trB.floor.value);
    } else {
      // 'elo' or 'rank'
      return dirMultiplier * (trA.current - trB.current);
    }
  });

  // Build Leaderboard Table Rows
  const tableRows = tableProfiles.map((p, idx) => {
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (!tr) return '';

    const badge = getEloBadgeClasses(tr.current);
    const tierTitle = getEloTierTitle(tr.current);
    const teamLogo = resolveTeamLogo(p.teamName, p.logo);
    const escapedTeamName = p.teamName.replace(/'/g, "\\'");
    const rank = idx + 1;

    let rankBadge = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    if (rank === 1) rankBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black';
    else if (rank === 2) rankBadge = 'bg-slate-300/20 text-slate-200 border-slate-300/40 font-bold';
    else if (rank === 3) rankBadge = 'bg-amber-700/20 text-amber-400 border-amber-700/40 font-bold';

    const deltaSign = tr.lastDelta > 0 ? '+' : '';
    const deltaColor = tr.lastDelta > 0 ? 'text-emerald-400' : tr.lastDelta < 0 ? 'text-rose-400' : 'text-slate-400';

    return `
      <tr onclick="window.openTeamMatchesModal && window.openTeamMatchesModal('${p.managerId}', '${escapedTeamName}')"
          class="border-b last:border-b-0 hover:bg-amber-500/10 cursor-pointer transition select-none group"
          style="border-color: var(--table-border);">
        <td class="py-2.5 px-3 text-center align-middle w-12">
          <span class="w-6 h-6 rounded-lg text-xs border flex items-center justify-center mx-auto ${rankBadge}">
            #${rank}
          </span>
        </td>
        <td class="py-2.5 px-3 text-left align-middle min-w-0">
          <div class="flex items-center gap-2.5">
            <img src="${teamLogo}" alt="${p.teamName}"
                 class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700 shadow-sm transition-transform group-hover:scale-105"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(p.teamName)}'">
            <div class="min-w-0">
              <div class="font-bold text-xs sm:text-sm truncate" style="color: var(--text-main);">${p.teamName}</div>
              <div class="text-[10px] font-semibold flex items-center gap-1 opacity-75 truncate" style="color: var(--accent-color);">
                <i class="fa-solid fa-user-tie text-[9px]"></i>
                <span>${p.coach}</span>
              </div>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-32">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs sm:text-sm font-bold font-mono border shadow-xs ${badge.bg} ${badge.text} ${badge.border}">
            <span>${formatElo(tr.current)}</span>
          </span>
          <div class="text-[9px] font-bold uppercase tracking-wider mt-0.5 opacity-60" style="color: var(--text-muted);">${tierTitle}</div>
        </td>
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-24">
          <span class="font-mono font-bold text-xs ${deltaColor}">
            ${deltaSign}${tr.lastDelta.toFixed(1)}
          </span>
        </td>
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-28">
          <div class="font-mono font-bold text-xs" style="color: var(--text-main);">${formatElo(tr.peak.value)}</div>
          <div class="text-[9px] opacity-60" style="color: var(--text-muted);">${tr.peak.season} G${tr.peak.round}</div>
        </td>
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-28">
          <div class="font-mono font-bold text-xs" style="color: var(--text-main);">${formatElo(tr.floor.value)}</div>
          <div class="text-[9px] opacity-60" style="color: var(--text-muted);">${tr.floor.season} G${tr.floor.round}</div>
        </td>
      </tr>
    `;
  }).join('');

  // Build Leaderboard Mobile Clean Cards (< 768px)
  const mobileCards = tableProfiles.map((p, idx) => {
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (!tr) return '';

    const badge = getEloBadgeClasses(tr.current);
    const tierTitle = getEloTierTitle(tr.current);
    const teamLogo = resolveTeamLogo(p.teamName, p.logo);
    const escapedTeamName = p.teamName.replace(/'/g, "\\'");
    const rank = idx + 1;

    let rankBadge = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    if (rank === 1) rankBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black';
    else if (rank === 2) rankBadge = 'bg-slate-300/20 text-slate-200 border-slate-300/40 font-bold';
    else if (rank === 3) rankBadge = 'bg-amber-700/20 text-amber-400 border-amber-700/40 font-bold';

    const deltaSign = tr.lastDelta > 0 ? '+' : '';
    const deltaColor = tr.lastDelta > 0 ? 'text-emerald-400' : tr.lastDelta < 0 ? 'text-rose-400' : 'text-slate-400';

    return `
      <div onclick="window.openTeamMatchesModal && window.openTeamMatchesModal('${p.managerId}', '${escapedTeamName}')"
           class="p-2.5 sm:p-3 transition-colors active:bg-amber-500/10 cursor-pointer select-none"
           style="border-color: var(--table-border);">
        <div class="flex items-center justify-between gap-2">
          <!-- Left: Rank, Crest, Team & Coach -->
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="w-6 h-6 rounded-md text-[11px] border flex items-center justify-center shrink-0 ${rankBadge}">
              #${rank}
            </span>
            <img src="${teamLogo}" alt="${p.teamName}"
                 class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700 shadow-xs"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(p.teamName)}'">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-xs sm:text-sm leading-snug break-words" style="color: var(--text-main);">
                ${p.teamName}
              </div>
              <div class="text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 mt-0.5 truncate" style="color: var(--accent-color);">
                <i class="fa-solid fa-user-tie text-[9px] opacity-70 shrink-0"></i>
                <span class="truncate">${p.coach}</span>
              </div>
            </div>
          </div>

          <!-- Right: Rating Pill + Delta & Tier -->
          <div class="flex flex-col items-end shrink-0 text-right">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-mono font-bold border shadow-xs ${badge.bg} ${badge.text} ${badge.border}">
              ${formatElo(tr.current)}
            </span>
            <div class="mt-0.5 flex items-center gap-1 text-[10px]">
              <span class="font-mono font-bold ${deltaColor}">${deltaSign}${tr.lastDelta.toFixed(1)}</span>
              <span class="text-[9px] opacity-60 font-semibold" style="color: var(--text-muted);">${tierTitle}</span>
            </div>
          </div>
        </div>

        <!-- Bottom Subrow: Peak and Floor -->
        <div class="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t text-[10px] font-mono opacity-80"
             style="border-color: var(--table-border); color: var(--text-muted);">
          <div>
            Picco: <strong class="text-purple-400 font-bold">${formatElo(tr.peak.value)}</strong>
            <span class="opacity-60 text-[9px]">(${tr.peak.season} G${tr.peak.round})</span>
          </div>
          <div>
            Min: <strong style="color: var(--text-main); font-bold;">${formatElo(tr.floor.value)}</strong>
            <span class="opacity-60 text-[9px]">(${tr.floor.season} G${tr.floor.round})</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Helper for sort arrow icons
  const sortIcon = (field: EloTableSortField) => {
    if (eloTableSortField !== field) return '';
    return `<i class="fa-solid ${eloTableSortDirection === 'desc' ? 'fa-arrow-down' : 'fa-arrow-up'} text-[9px] ml-1 text-amber-400"></i>`;
  };

  let hoverBoxContent = `<span class="opacity-70 truncate"><i class="fa-solid fa-hand-pointer mr-1.5 text-amber-500"></i>Tocca o passa sui punti per visualizzare i dettagli del match</span>`;
  if (lockedEloChartMatch) {
    let matchPt: any = null;
    for (const p of profiles) {
      if (p.teamName === lockedEloChartMatch.team) {
        const tr = getManagerEloTrack(p.profile, activeMode);
        if (tr) {
          matchPt = tr.trajectory.find(
            pt => pt.season === lockedEloChartMatch!.season && pt.round === lockedEloChartMatch!.round
          );
          if (matchPt) break;
        }
      }
    }
    if (matchPt) {
      const deltaSign = matchPt.delta > 0 ? '+' : '';
      const deltaColor = matchPt.delta > 0 ? 'text-emerald-400' : matchPt.delta < 0 ? 'text-rose-400' : 'text-slate-400';
      const resBadge = matchPt.result === 'W' ? 'text-emerald-400 font-bold' : matchPt.result === 'L' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold';
      const winProb = matchPt.winProbPreMatch ?? 0;
      hoverBoxContent = `
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 w-full text-[11px] sm:text-xs">
          <div class="flex items-center gap-1.5 font-bold min-w-0 flex-wrap">
            <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] shrink-0">${matchPt.season} G${matchPt.round}</span>
            <span style="color: var(--text-main);" class="truncate max-w-[110px] sm:max-w-none">${lockedEloChartMatch.team}</span>
            <span class="opacity-60 text-[10px] shrink-0">vs</span>
            <span style="color: var(--text-muted);" class="truncate max-w-[110px] sm:max-w-none">${matchPt.opponentTeamName || lockedEloChartMatch.opponent}</span>
            <span class="${resBadge} shrink-0">(${matchPt.result || '-'})</span>
          </div>
          <div class="flex items-center gap-2 font-mono shrink-0">
            <span class="font-black text-amber-400 text-xs sm:text-sm">${matchPt.elo.toFixed(1)} pt</span>
            <span class="${deltaColor} font-bold text-[11px]">(${deltaSign}${matchPt.delta.toFixed(1)})</span>
            ${winProb > 0 ? `<span class="opacity-75 text-[10px] font-sans" style="color: var(--text-muted);">(Prob. ${winProb.toFixed(0)}%)</span>` : ''}
          </div>
        </div>
      `;
    }
  }

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

      <!-- Quick KPI Stats Cards (Compact & sleek) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        <!-- Leader -->
        <div class="p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between" style="background-color: var(--table-surface); border-color: var(--table-border);">
          <div class="min-w-0">
            <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60 truncate" style="color: var(--text-muted);">Leader Elo</div>
            <div class="font-sport font-black text-xs sm:text-[13px] text-amber-500 truncate leading-tight mt-0.5" title="${topManager?.teamName}">${topManager?.teamName}</div>
          </div>
          <div class="text-[11px] sm:text-xs font-mono font-bold mt-1" style="color: var(--text-main);">${formatElo(topTrack?.current)} pt</div>
        </div>

        <!-- Top Gainer -->
        <div class="p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between" style="background-color: var(--table-surface); border-color: var(--table-border);">
          <div class="min-w-0">
            <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60 truncate" style="color: var(--text-muted);">Miglior Balzo (L1)</div>
            <div class="font-sport font-black text-xs sm:text-[13px] text-emerald-500 truncate leading-tight mt-0.5" title="${topGainer?.teamName}">${topGainer?.teamName}</div>
          </div>
          <div class="text-[11px] sm:text-xs font-mono font-bold text-emerald-400 mt-1">+${bestDelta.toFixed(1)} pt</div>
        </div>

        <!-- Historical Peak -->
        <div class="p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between" style="background-color: var(--table-surface); border-color: var(--table-border);">
          <div class="min-w-0">
            <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60 truncate" style="color: var(--text-muted);">Picco Massimo</div>
            <div class="font-sport font-black text-xs sm:text-[13px] text-purple-400 truncate leading-tight mt-0.5" title="${peakManager?.teamName}">${peakManager?.teamName}</div>
          </div>
          <div class="text-[11px] sm:text-xs font-mono font-bold mt-1" style="color: var(--text-main);">${formatElo(highestPeak)} pt</div>
        </div>

        <!-- Rating Spread -->
        <div class="p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between" style="background-color: var(--table-surface); border-color: var(--table-border);">
          <div class="min-w-0">
            <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60 truncate" style="color: var(--text-muted);">Dispersione Lega</div>
            <div class="font-sport font-black text-xs sm:text-[13px] text-cyan-400 truncate leading-tight mt-0.5">${spread} pt</div>
          </div>
          <div class="text-[9px] opacity-60 mt-1 truncate" style="color: var(--text-muted);">Max − Min attivo</div>
        </div>
      </div>

      <!-- Multi-Team Trajectory SVG Chart Card -->
      <div class="p-3.5 sm:p-4 rounded-2xl border flex flex-col gap-3"
           style="background-color: var(--table-surface); border-color: var(--table-border);">
        
        <!-- Chart Controls Header: Season dropdown & visibility actions -->
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-chart-line text-amber-500 text-xs"></i>
            <h4 class="font-bold text-xs sm:text-sm uppercase tracking-wider" style="color: var(--text-main);">
              Traiettoria Elo
            </h4>
          </div>

          <!-- Season Selector Dropdown & Quick Actions -->
          <div class="flex items-center gap-2 flex-wrap">
            <select onchange="window.switchEloChartSeason && window.switchEloChartSeason(this.value)"
                    class="px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer"
                    style="background-color: var(--input-bg); border-color: var(--table-border); color: var(--text-main);">
              <optgroup label="Stagioni">
                <option value="all" ${selectedEloSeason === 'all' ? 'selected' : ''}>Tutte le stagioni (Continuo)</option>
                <option value="2026/27" ${selectedEloSeason === '2026/27' ? 'selected' : ''}>2026/27 (Corrente)</option>
                <option value="2025/26" ${selectedEloSeason === '2025/26' ? 'selected' : ''}>2025/26</option>
              </optgroup>
              <optgroup label="Finestra Recente">
                <option value="last10" ${selectedEloSeason === 'last10' ? 'selected' : ''}>Ultimi 10 match</option>
                <option value="last20" ${selectedEloSeason === 'last20' ? 'selected' : ''}>Ultimi 20 match</option>
                <option value="last30" ${selectedEloSeason === 'last30' ? 'selected' : ''}>Ultimi 30 match</option>
              </optgroup>
            </select>

            <button type="button"
                    onclick="window.showAllEloManagers && window.showAllEloManagers()"
                    class="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-600/40 bg-slate-500/10 text-slate-300 hover:text-amber-400 hover:bg-amber-500/10 transition cursor-pointer">
              Tutti
            </button>
            <button type="button"
                    onclick="window.hideAllEloManagers && window.hideAllEloManagers()"
                    class="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-600/40 bg-slate-500/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer">
              Nessuno
            </button>
          </div>
        </div>

        <!-- Interactive Hover Status Box with responsive min-height (unclipped) -->
        <div id="elo-chart-hover-box"
             class="min-h-[44px] sm:min-h-[38px] px-3 py-1.5 rounded-xl border flex items-center justify-center text-xs font-semibold text-center transition-colors"
             style="background-color: var(--input-bg); border-color: var(--table-border); color: var(--text-muted);">
          ${hoverBoxContent}
        </div>

        <!-- Responsive SVG Chart -->
        <div class="w-full overflow-hidden flex items-center justify-center">
          <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="w-full h-auto max-h-[320px] select-none">
            ${gridLines}
            ${xLabels}
            ${pathsHTML}
            ${dotsHTML}
          </svg>
        </div>

        <!-- Interactive Manager Legend (Clickable Chips) -->
        <div class="flex items-center gap-1.5 flex-wrap pt-2.5 border-t" style="border-color: var(--table-border);">
          ${legendItems}
        </div>
      </div>

      <!-- Leaderboard Table Card -->
      <div class="rounded-2xl border overflow-hidden"
           style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="px-3.5 py-2.5 border-b flex items-center justify-between"
             style="border-color: var(--table-border); background-color: var(--header-bg); color: var(--header-text);">
          <div class="flex items-center gap-2 font-sport font-bold text-xs sm:text-sm uppercase tracking-wider">
            <i class="fa-solid fa-ranking-star text-amber-400"></i>
            <span>Classifica Dinamica Elo</span>
          </div>
          <span class="text-[10px] opacity-75 font-semibold">Clicca sulle colonne per ordinare</span>
        </div>

        <!-- Mobile Sort Bar (< md) -->
        <div class="md:hidden px-2.5 py-1.5 border-b flex items-center justify-between gap-1 overflow-x-auto"
             style="border-color: var(--table-border); background: rgba(0,0,0,0.04);">
          <span class="text-[9px] font-bold uppercase tracking-wider opacity-60 shrink-0 mr-0.5">Ordina:</span>
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('rank')"
                    class="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${eloTableSortField === 'rank' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-black' : 'bg-slate-500/10 text-slate-400 border-slate-600/30'}">
              # Pos ${sortIcon('rank')}
            </button>
            <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('elo')"
                    class="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${eloTableSortField === 'elo' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-black' : 'bg-slate-500/10 text-slate-400 border-slate-600/30'}">
              ⚡ Elo ${sortIcon('elo')}
            </button>
            <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('delta')"
                    class="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${eloTableSortField === 'delta' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-black' : 'bg-slate-500/10 text-slate-400 border-slate-600/30'}">
              Δ Ultima ${sortIcon('delta')}
            </button>
            <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('peak')"
                    class="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${eloTableSortField === 'peak' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-black' : 'bg-slate-500/10 text-slate-400 border-slate-600/30'}">
              Picco ${sortIcon('peak')}
            </button>
            <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('floor')"
                    class="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${eloTableSortField === 'floor' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-black' : 'bg-slate-500/10 text-slate-400 border-slate-600/30'}">
              Minimo ${sortIcon('floor')}
            </button>
          </div>
        </div>

        <!-- Mobile Clean Cards (< md) -->
        <div class="md:hidden flex flex-col divide-y divide-[var(--table-border)]">
          ${mobileCards}
        </div>

        <!-- Desktop Full Table (>= md) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left border-collapse table-auto">
            <thead>
              <tr class="border-b text-[10px] sm:text-[11px] uppercase tracking-wider opacity-70 font-bold select-none"
                  style="border-color: var(--table-border); background-color: var(--table-surface);">
                <th class="py-2.5 px-3 text-center w-12">
                  <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('rank')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center">
                    <span>#</span>${sortIcon('rank')}
                  </button>
                </th>
                <th class="py-2.5 px-3 text-left">
                  <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('name')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center">
                    <span>Squadra / Allenatore</span>${sortIcon('name')}
                  </button>
                </th>
                <th class="py-2.5 px-3 text-center w-32">
                  <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('elo')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center justify-center">
                    <span>Rating Elo</span>${sortIcon('elo')}
                  </button>
                </th>
                <th class="py-2.5 px-3 text-center w-24">
                  <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('delta')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center justify-center">
                    <span>Δ Ultima</span>${sortIcon('delta')}
                  </button>
                </th>
                <th class="py-2.5 px-3 text-center w-28">
                  <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('peak')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center justify-center">
                    <span>Picco</span>${sortIcon('peak')}
                  </button>
                </th>
                <th class="py-2.5 px-3 text-center w-28">
                  <button type="button" onclick="window.sortEloLeaderboard && window.sortEloLeaderboard('floor')" class="hover:text-amber-400 transition cursor-pointer inline-flex items-center justify-center">
                    <span>Minimo</span>${sortIcon('floor')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Collapsible Educational Info Box for Elo Rating Engine -->
      <div class="border rounded-2xl overflow-hidden text-xs mt-1" style="border-color: var(--table-border); background: var(--table-surface);">
        <button type="button" onclick="window.toggleGuide && window.toggleGuide('elo-guide')" class="w-full px-3.5 py-2.5 flex items-center justify-between font-bold text-left transition hover:bg-white/5 cursor-pointer" style="color: var(--text-main);">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-circle-question text-amber-400 text-xs"></i>
            <span class="font-bold text-xs sm:text-sm">Guida al Calcolo dell'Elo Rating Dinamico</span>
          </div>
          <i id="elo-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-xs" style="color: var(--text-muted);"></i>
        </button>
        <div id="elo-guide-content" class="px-4 pb-4 pt-2 space-y-3.5 border-t hidden" style="border-color: var(--table-border); color: var(--text-muted);">
          <div>
            <div class="flex items-center justify-between flex-wrap gap-1">
              <strong class="font-semibold text-xs" style="color: var(--text-main);">1. Probabilità Attesa di Vittoria (Curva Logistica):</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">E_A = 1 / (1 + 10^((R_B - R_A) / ${scaleFactor}))</code>
            </div>
            <p class="mt-1 text-[11px] leading-relaxed">
              Stima la probabilità percentuale di successo prima del calcio d'inizio. Se due squadre hanno pari punteggio, entrambe partono al 50.0%. Un vantaggio di +100 pt Elo attribuisce circa il ${probDiff100}% di probabilità stimata alla squadra favorita.
            </p>
          </div>

          <div>
            <div class="flex items-center justify-between flex-wrap gap-1">
              <strong class="font-semibold text-xs" style="color: var(--text-main);">2. Aggiornamento Dinamico Post-Match:</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">Δ = K · (S - E) → R' = R + Δ</code>
            </div>
            <p class="mt-1 text-[11px] leading-relaxed">
              Il rating viene aggiornato dopo ogni singola sfida. Il risultato reale <em>S</em> vale <strong>1.0</strong> per la vittoria, <strong>0.5</strong> per il pareggio e <strong>0.0</strong> per la sconfitta. Battere una squadra con rating più alto frutta un balzo consistente; vincere una sfida già ampiamente prevista attribuisce invece pochi decimali.
            </p>
          </div>

          <div>
            <div class="flex items-center justify-between flex-wrap gap-1">
              <strong class="font-semibold text-xs" style="color: var(--text-main);">3. Sensibilità K-Factor per Competizione:</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">${kGuide.badge}</code>
            </div>
            <p class="mt-1 text-[11px] leading-relaxed">
              ${kGuide.description}
            </p>
          </div>

          <div>
            <div class="flex items-center justify-between flex-wrap gap-1">
              <strong class="font-semibold text-xs" style="color: var(--text-main);">4. Architettura Dual-Track (Puro vs Storico):</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">⚡ Puro: ${baseRating} baseline • 🏛️ Storico: Seed Albo d'Oro</code>
            </div>
            <p class="mt-1 text-[11px] leading-relaxed">
              <strong>⚡ Elo Puro:</strong> Reset a ${baseRating} per tutti a inizio 2025/26, misura unicamente la prestazione sportiva sul campo senza considerare il passato.<br/>
              <strong>🏛️ Elo Storico:</strong> Inizializza i manager con un bonus/malus calcolato sull'Indice di Prestigio del Palmarès storico (Scudetti, Coppe e podi), ponderando la tradizione di lega.
            </p>
          </div>

          <div>
            <div class="flex items-center justify-between flex-wrap gap-1">
              <strong class="font-semibold text-xs" style="color: var(--text-main);">5. Regressione alla Media Inter-Stagionale (Carryover):</strong>
              <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">R_start = ${carryoverAlpha} · R_end + ${carryoverBetaStr} · ${baseRating}</code>
            </div>
            <p class="mt-1 text-[11px] leading-relaxed">
              A ogni cambio di stagione il ${carryoverPreservedPct}% del rating viene preservato, mentre il ${carryoverRegressedPct}% regredisce verso la media di lega (${baseRating}). Questo simula fedelmente l'effetto livellante delle aste estive e dei nuovi acquisti di mercato.
            </p>
          </div>
        </div>
      </div>
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
