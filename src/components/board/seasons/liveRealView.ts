import type { LiveTeamMetrics } from '@/types';
import { state } from '@/state';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { renderFormDotsHTML, renderStatusBadgeHTML } from './liveAnalytics';
import {
  getEloMode,
  setEloMode,
  getManagerEloTrack,
  getEloBadgeClasses,
  getEloTierTitle,
  formatElo,
  formatEloDelta
} from '@/analytics/analyticsCore';
import type { EloTrackMode } from '@/types/analytics';

let cachedRealStandings: LiveTeamMetrics[] = [];
let currentRealSort: 'rank' | 'elo' = 'rank';
let currentRealEloDirection: 'desc' | 'asc' = 'desc';

export function getCurrentRealSort(): 'rank' | 'elo' {
  return currentRealSort;
}

/**
 * Renders desktop table rows for the Real Championship Standings
 */
export function renderRealDesktopRows(standings: LiveTeamMetrics[], mode: EloTrackMode = getEloMode()): string {
  return standings.map(team => {
    const mgr = state.managers?.find(m => m.id === team.managerId);
    const managerName = mgr ? mgr.name : (team.coach || 'Allenatore');
    const teamLogo = resolveTeamLogo(team.teamName, team.logo);
    const escapedTeamName = team.teamName.replace(/'/g, "\\'");

    let rankBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-bold';
    if (team.rank === 1) {
      rankBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40 font-black';
    } else if (team.rank === 2) {
      rankBadgeClass = 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600 font-bold';
    } else if (team.rank === 3) {
      rankBadgeClass = 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-700/25 dark:text-amber-400 dark:border-amber-700/40 font-bold';
    } else if (team.rank >= 12) {
      rankBadgeClass = 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 font-bold';
    }

    // Dynamic Elo Metrics
    const eloTrack = getManagerEloTrack(team.elo, mode);
    const eloCurrent = eloTrack?.current ?? 1500.0;
    const eloDelta = eloTrack?.lastDelta ?? 0.0;
    const eloBadge = getEloBadgeClasses(eloCurrent);
    const eloTier = getEloTierTitle(eloCurrent);
    const eloDeltaColor = eloDelta > 0 ? 'text-emerald-400' : eloDelta < 0 ? 'text-rose-400' : 'text-slate-400';

    return `
      <tr onclick="window.openTeamMatchesModal && window.openTeamMatchesModal('${team.managerId || ''}', '${escapedTeamName}')"
          class="border-b last:border-b-0 transition-colors cursor-pointer hover:bg-amber-500/10 group"
          style="border-color: var(--table-border);">
        <!-- Pos -->
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-14">
          <span class="px-2 py-0.5 rounded-lg text-xs border shadow-xs inline-block ${rankBadgeClass}">
            #${team.rank}
          </span>
        </td>
        <!-- Squadra & Manager -->
        <td class="py-2.5 px-3 text-left align-middle min-w-0">
          <div class="flex items-center gap-2.5 min-w-0">
            <img src="${teamLogo}" alt="${team.teamName}"
                 class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700 shadow-sm transition-transform group-hover:scale-105"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(team.teamName)}'">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-xs sm:text-sm leading-snug truncate" style="color: var(--text-main);">
                ${team.teamName}
              </div>
              <div class="text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 mt-0.5 truncate" style="color: var(--accent-color);">
                <i class="fa-solid fa-user-tie text-[9px] opacity-70 shrink-0"></i>
                <span class="truncate">${managerName}</span>
              </div>
            </div>
          </div>
        </td>
        <!-- Forma L5 -->
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-36">
          ${renderFormDotsHTML(team.recentForm)}
        </td>
        <!-- Stato Badge -->
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-32">
          ${renderStatusBadgeHTML(team.statusBadge, team.statusLabel)}
        </td>
        <!-- Elo Rating & Delta -->
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-44">
          <div class="flex flex-col items-center">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold border shadow-xs ${eloBadge.bg} ${eloBadge.text} ${eloBadge.border}">
              ${formatElo(eloCurrent)}
            </span>
            <div class="mt-0.5 flex items-center gap-1 text-[10px]">
              <span class="font-mono font-bold ${eloDeltaColor}">${formatEloDelta(eloDelta)}</span>
              <span class="text-[9px] opacity-60 font-semibold" style="color: var(--text-muted);">${eloTier}</span>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Renders mobile clean cards (< 768px) for the Real Championship Standings
 */
export function renderRealMobileCards(standings: LiveTeamMetrics[], mode: EloTrackMode = getEloMode()): string {
  return standings.map(team => {
    const mgr = state.managers?.find(m => m.id === team.managerId);
    const managerName = mgr ? mgr.name : (team.coach || 'Allenatore');
    const teamLogo = resolveTeamLogo(team.teamName, team.logo);
    const escapedTeamName = team.teamName.replace(/'/g, "\\'");

    let rankBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 font-bold';
    if (team.rank === 1) {
      rankBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 font-black';
    } else if (team.rank <= 3) {
      rankBadgeClass = 'bg-slate-200 text-slate-800 dark:bg-slate-700/60 dark:text-slate-200 font-bold';
    }

    const eloTrack = getManagerEloTrack(team.elo, mode);
    const eloCurrent = eloTrack?.current ?? 1500.0;
    const eloDelta = eloTrack?.lastDelta ?? 0.0;
    const eloBadge = getEloBadgeClasses(eloCurrent);
    const eloDeltaColor = eloDelta > 0 ? 'text-emerald-400' : eloDelta < 0 ? 'text-rose-400' : 'text-slate-400';

    return `
      <div onclick="window.openTeamMatchesModal && window.openTeamMatchesModal('${team.managerId || ''}', '${escapedTeamName}')"
           class="p-2.5 sm:p-3 border-b last:border-b-0 transition-colors active:bg-amber-500/10 cursor-pointer select-none"
           style="border-color: var(--table-border);">
        <div class="flex items-center justify-between gap-2">
          <!-- Left: Rank, Logo & Full Team / Coach Names (anti-truncation) -->
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="w-7 h-6 rounded-md text-[11px] border flex items-center justify-center shrink-0 ${rankBadgeClass}">
              #${team.rank}
            </span>
            <img src="${teamLogo}" alt="${team.teamName}"
                 class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(team.teamName)}'">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-xs sm:text-sm leading-snug break-words" style="color: var(--text-main);">
                ${team.teamName}
              </div>
              <div class="text-[10px] sm:text-[11px] font-semibold opacity-80 break-words mt-0.5" style="color: var(--accent-color);">
                ${managerName}
              </div>
            </div>
          </div>

          <!-- Right: Elo Pill & Status Badge -->
          <div class="flex flex-col items-end gap-1 shrink-0">
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono border ${eloBadge.bg} ${eloBadge.text} ${eloBadge.border}">
              <span>⚡</span>
              <span>${formatElo(eloCurrent)}</span>
              <span class="text-[9px] ${eloDeltaColor}">(${formatEloDelta(eloDelta)})</span>
            </span>
            ${renderStatusBadgeHTML(team.statusBadge, team.statusLabel)}
          </div>
        </div>

        <div class="flex items-center justify-between gap-1 mt-2 pt-1.5 border-t text-[10px] font-semibold opacity-90"
             style="border-color: var(--table-border); color: var(--text-muted);">
          <span class="text-[10px] uppercase font-bold tracking-wider opacity-60">Forma Recente (L5)</span>
          <div class="shrink-0 scale-95 origin-right">
            ${renderFormDotsHTML(team.recentForm)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Sorts standing list by Elo in current direction
 */
function sortStandingsByElo(standings: LiveTeamMetrics[], mode: EloTrackMode, dir: 'desc' | 'asc'): LiveTeamMetrics[] {
  return [...standings].sort((a, b) => {
    const rA = getManagerEloTrack(a.elo, mode)?.current ?? 1500.0;
    const rB = getManagerEloTrack(b.elo, mode)?.current ?? 1500.0;
    return dir === 'desc' ? rB - rA : rA - rB;
  });
}

/**
 * Renders the complete View 1 container for Real Standings (Desktop table & Mobile cards)
 */
export function renderRealViewContainer(standings: LiveTeamMetrics[]): string {
  cachedRealStandings = standings;
  const activeMode = getEloMode();

  const sortedRank = [...standings].sort((a, b) => a.rank - b.rank);
  const sortedElo = sortStandingsByElo(standings, activeMode, currentRealEloDirection);

  const desktopRowsRank = renderRealDesktopRows(sortedRank, activeMode);
  const desktopRowsElo = renderRealDesktopRows(sortedElo, activeMode);
  const mobileCardsRank = renderRealMobileCards(sortedRank, activeMode);
  const mobileCardsElo = renderRealMobileCards(sortedElo, activeMode);

  return `
    <div id="live-view-real-container" class="animate-fadeIn">
      <!-- Desktop View (>= 768px) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left border-collapse table-auto">
          <thead>
            <tr class="border-b text-[10px] sm:text-[11px] uppercase tracking-wider opacity-70 font-bold"
                style="border-color: var(--table-border); background-color: var(--table-surface);">
              <th class="py-2.5 px-3 text-center w-16">
                <button id="th-real-sort-rank"
                        type="button"
                        onclick="window.switchRealSort && window.switchRealSort('rank')"
                        class="hover:text-amber-500 transition cursor-pointer text-amber-500 dark:text-amber-400 font-black uppercase text-[10px] sm:text-[11px] tracking-wider"
                        title="Ordina per Posizione Reale">
                  <span>Pos</span>
                  <i id="sort-icon-real-rank" class="fa-solid fa-arrow-down text-[10px] ml-0.5"></i>
                </button>
              </th>
              <th class="py-2.5 px-3 text-left">Squadra / Allenatore</th>
              <th class="py-2.5 px-3 text-center w-36">Forma (L5)</th>
              <th class="py-2.5 px-3 text-center w-32">Stato</th>
              <th class="py-2.5 px-3 text-center w-44">
                <!-- ELO Toggle as Column Header itself + direction arrow -->
                <div class="inline-flex items-center justify-center gap-1.5">
                  <button id="th-real-sort-elo"
                          type="button"
                          onclick="window.switchRealSort && window.switchRealSort('elo')"
                          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition shadow-xs cursor-pointer ${currentRealSort === 'elo' ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30' : 'bg-slate-500/10 text-slate-300 border-slate-600/40 hover:border-amber-500/30'}"
                          title="Ordina per Elo Rating (Clicca per invertire)">
                    <span id="label-real-elo-track">${activeMode === 'flat' ? '⚡ Elo Puro (1500)' : '🏛️ Elo Storico'}</span>
                    <i id="sort-icon-real-elo" class="fa-solid ${currentRealEloDirection === 'desc' ? 'fa-arrow-down' : 'fa-arrow-up'} text-[10px] ${currentRealSort === 'elo' ? 'text-amber-400' : 'opacity-40'}"></i>
                  </button>
                  <button id="btn-real-elo-toggle"
                          type="button"
                          onclick="window.toggleRealEloMode && window.toggleRealEloMode(event)"
                          class="w-7 h-7 rounded-xl text-xs flex items-center justify-center border transition shadow-xs cursor-pointer bg-slate-500/10 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 border-slate-600/40 hover:border-amber-500/30 active:scale-95 shrink-0"
                          title="Commuta tra modalità Puro (1500) e Storico">
                    <i class="fa-solid fa-rotate text-[10px]"></i>
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody id="real-desktop-tbody-rank">
            ${desktopRowsRank}
          </tbody>
          <tbody id="real-desktop-tbody-elo" class="hidden">
            ${desktopRowsElo}
          </tbody>
        </table>
      </div>

      <!-- Mobile Clean View (< 768px) -->
      <div id="real-mobile-cards-rank" class="md:hidden flex flex-col divide-y divide-[var(--table-border)]">
        ${mobileCardsRank}
      </div>
      <div id="real-mobile-cards-elo" class="hidden md:hidden flex flex-col divide-y divide-[var(--table-border)]">
        ${mobileCardsElo}
      </div>
    </div>
  `;
}

export function switchRealSort(order: 'rank' | 'elo'): void {
  const activeMode = getEloMode();

  if (order === 'elo' && currentRealSort === 'elo') {
    // Invert direction
    currentRealEloDirection = currentRealEloDirection === 'desc' ? 'asc' : 'desc';
  }
  currentRealSort = order;
  if (typeof document === 'undefined') return;

  const thRank = document.getElementById('th-real-sort-rank');
  const thElo = document.getElementById('th-real-sort-elo');
  const iconRank = document.getElementById('sort-icon-real-rank');
  const iconElo = document.getElementById('sort-icon-real-elo');

  const desktopRank = document.getElementById('real-desktop-tbody-rank');
  const desktopElo = document.getElementById('real-desktop-tbody-elo');
  const mobileRank = document.getElementById('real-mobile-cards-rank');
  const mobileElo = document.getElementById('real-mobile-cards-elo');

  if (order === 'rank') {
    thRank?.classList.add('text-amber-500', 'dark:text-amber-400', 'font-black');
    thRank?.classList.remove('opacity-70');
    iconRank?.classList.remove('hidden');

    thElo?.classList.remove('bg-amber-500/15', 'text-amber-500', 'dark:text-amber-400', 'border-amber-500/30');
    thElo?.classList.add('bg-slate-500/10', 'text-slate-300', 'border-slate-600/40');
    if (iconElo) iconElo.className = `fa-solid fa-arrow-down text-[10px] opacity-40`;

    desktopRank?.classList.remove('hidden');
    desktopElo?.classList.add('hidden');
    mobileRank?.classList.remove('hidden');
    mobileElo?.classList.add('hidden');
  } else {
    thElo?.classList.add('bg-amber-500/15', 'text-amber-500', 'dark:text-amber-400', 'border-amber-500/30');
    thElo?.classList.remove('bg-slate-500/10', 'text-slate-300', 'border-slate-600/40');
    if (iconElo) {
      iconElo.className = `fa-solid ${currentRealEloDirection === 'desc' ? 'fa-arrow-down' : 'fa-arrow-up'} text-[10px] text-amber-400`;
    }

    thRank?.classList.remove('text-amber-500', 'dark:text-amber-400', 'font-black');
    thRank?.classList.add('opacity-70');
    iconRank?.classList.add('hidden');

    // Re-render Elo table body with current direction
    if (cachedRealStandings.length > 0) {
      const sortedElo = sortStandingsByElo(cachedRealStandings, activeMode, currentRealEloDirection);
      if (desktopElo) desktopElo.innerHTML = renderRealDesktopRows(sortedElo, activeMode);
      if (mobileElo) mobileElo.innerHTML = renderRealMobileCards(sortedElo, activeMode);
    }

    desktopElo?.classList.remove('hidden');
    desktopRank?.classList.add('hidden');
    mobileElo?.classList.remove('hidden');
    mobileRank?.classList.add('hidden');
  }
}

export function toggleRealEloMode(event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const nextMode: EloTrackMode = getEloMode() === 'flat' ? 'historical' : 'flat';
  setEloMode(nextMode);

  // Update button labels across all views
  const realLabel = document.getElementById('label-real-elo-track');
  if (realLabel) realLabel.textContent = nextMode === 'flat' ? '⚡ Elo Puro (1500)' : '🏛️ Elo Storico';

  const meritLabel = document.getElementById('label-merit-elo-track');
  if (meritLabel) meritLabel.textContent = nextMode === 'flat' ? '⚡ Elo Puro (1500)' : '🏛️ Elo Storico';

  if (cachedRealStandings.length > 0) {
    const sortedRank = [...cachedRealStandings].sort((a, b) => a.rank - b.rank);
    const sortedElo = sortStandingsByElo(cachedRealStandings, nextMode, currentRealEloDirection);

    const desktopRank = document.getElementById('real-desktop-tbody-rank');
    const desktopElo = document.getElementById('real-desktop-tbody-elo');
    const mobileRank = document.getElementById('real-mobile-cards-rank');
    const mobileElo = document.getElementById('real-mobile-cards-elo');

    if (desktopRank) desktopRank.innerHTML = renderRealDesktopRows(sortedRank, nextMode);
    if (desktopElo) desktopElo.innerHTML = renderRealDesktopRows(sortedElo, nextMode);
    if (mobileRank) mobileRank.innerHTML = renderRealMobileCards(sortedRank, nextMode);
    if (mobileElo) mobileElo.innerHTML = renderRealMobileCards(sortedElo, nextMode);
  }
}

// Global window registration
if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.switchRealSort = switchRealSort;
  w.toggleRealEloMode = toggleRealEloMode;
}
