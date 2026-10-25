import type { LiveTeamMetrics } from '@/types';
import { state } from '@/state';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import {
  renderLuckBadgeHTML,
  renderDeltaRankPillHTML,
  renderDeltaPointsPillHTML,
  renderPodiumSVG
} from './liveAnalytics';
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

/**
 * Renders desktop table rows for the Merit & Schedule Luck Standings
 */
export function renderMeritDesktopRows(standings: LiveTeamMetrics[], mode: EloTrackMode = getEloMode()): string {
  return standings.map(team => {
    const mgr = state.managers?.find(m => m.id === team.managerId);
    const managerName = mgr ? mgr.name : (team.coach || 'Allenatore');
    const teamLogo = resolveTeamLogo(team.teamName, team.logo);
    const escapedTeamName = team.teamName.replace(/'/g, "\\'");
    const luck = team.scheduleLuck;
    const xRank = luck?.xRank ?? team.rank;
    const deltaRank = luck?.deltaRank ?? 0;
    const xPts = luck?.xPoints ?? 0;
    const deltaPts = luck?.deltaPoints ?? 0;
    const isRealLoaded = team.points !== undefined && team.points !== null;
    const ap = luck?.allPlayRecord ?? { played: 0, wins: 0, draws: 0, losses: 0, winPct: 0 };
    const luckBadge = luck?.luckBadge ?? '⚖️';
    const luckLabel = luck?.luckLabel ?? 'Neutro';
    const luckZ = luck?.luckZScore ?? 0;

    // Dynamic Elo Metrics
    const eloTrack = getManagerEloTrack(team.elo, mode);
    const eloCurrent = eloTrack?.current ?? 1500.0;
    const eloDelta = eloTrack?.lastDelta ?? 0.0;
    const eloBadge = getEloBadgeClasses(eloCurrent);
    const eloTier = getEloTierTitle(eloCurrent);
    const eloDeltaColor = eloDelta > 0 ? 'text-emerald-400' : eloDelta < 0 ? 'text-rose-400' : 'text-slate-400';

    let rankBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-bold';
    if (xRank === 1) {
      rankBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40 font-black';
    } else if (xRank === 2) {
      rankBadgeClass = 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600 font-bold';
    } else if (xRank === 3) {
      rankBadgeClass = 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-700/25 dark:text-amber-400 dark:border-amber-700/40 font-bold';
    } else if (xRank >= 12) {
      rankBadgeClass = 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 font-bold';
    }

    const mcPodium = luck?.monteCarlo?.pPodiumPct;
    const mcSpoon = luck?.monteCarlo?.pSpoonPct;
    const mcDisplayHTML = (mcPodium !== null && mcPodium !== undefined && mcSpoon !== null && mcSpoon !== undefined)
      ? `<div class="flex flex-col items-center">
           <div class="flex items-center gap-1 text-[11px] font-bold text-amber-500 dark:text-amber-400">
             ${renderPodiumSVG(14)}
             <span>${mcPodium.toFixed(1)}%</span>
           </div>
           <div class="text-[9px] opacity-70 font-semibold" style="color: var(--text-muted);">
             🥄 ${mcSpoon.toFixed(1)}%
           </div>
         </div>`
      : `<span class="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700" title="Le proiezioni probabilistiche di fine stagione si sbloccano dopo 5 giornate">Dalla 5ª g.</span>`;

    return `
      <tr onclick="window.openTeamMatchesModal && window.openTeamMatchesModal('${team.managerId || ''}', '${escapedTeamName}')"
          class="border-b last:border-b-0 transition-colors cursor-pointer hover:bg-amber-500/10 group"
          style="border-color: var(--table-border);">
        <!-- Pos. xPTS & Delta vs Reale -->
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-24">
          <div class="flex flex-col items-center gap-0.5">
            <div class="flex items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-lg text-xs border shadow-xs inline-block ${rankBadgeClass}">
                #${xRank}
              </span>
              ${renderDeltaRankPillHTML(deltaRank, team.rank)}
            </div>
            <span class="text-[10px] font-semibold opacity-60" style="color: var(--text-muted);">Reale #${team.rank}</span>
          </div>
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
        <!-- Punti Attesi (xPTS) & Delta -->
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-28">
          <div class="font-bold font-mono text-xs sm:text-sm" style="color: var(--text-main);">
            ${xPts.toFixed(2)} xPTS
          </div>
          <div class="mt-0.5 flex items-center justify-center gap-1 text-[10px]">
            ${renderDeltaPointsPillHTML(deltaPts, isRealLoaded)}
            <span class="opacity-60 font-semibold whitespace-nowrap" style="color: var(--text-muted);">vs ${isRealLoaded ? `${team.points} pt` : '- pt'}</span>
          </div>
        </td>
        <!-- Record Tutti vs Tutti -->
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-32">
          <div class="font-bold font-mono text-xs" style="color: var(--text-main);">
            ${ap.wins}V ${ap.draws}N ${ap.losses}P
          </div>
          <div class="text-[10px] font-semibold mt-0.5" style="color: var(--text-muted);">
            ${ap.winPct}% vittorie
          </div>
        </td>
        <!-- Indice Fortuna Z-Score -->
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-36">
          ${renderLuckBadgeHTML(luckBadge, luckLabel, luckZ)}
        </td>
        <!-- Elo Rating & Delta -->
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-32">
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
        <!-- Scenari Monte Carlo -->
        <td class="py-2.5 px-3 text-center align-middle whitespace-nowrap w-28">
          ${mcDisplayHTML}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Renders mobile cards (< 768px) for the Merit & Schedule Luck Standings
 */
export function renderMobileMeritCards(standings: LiveTeamMetrics[], mode: EloTrackMode = getEloMode()): string {
  return standings.map(team => {
    const mgr = state.managers?.find(m => m.id === team.managerId);
    const managerName = mgr ? mgr.name : (team.coach || 'Allenatore');
    const teamLogo = resolveTeamLogo(team.teamName, team.logo);
    const escapedTeamName = team.teamName.replace(/'/g, "\\'");
    const luck = team.scheduleLuck;
    const xRank = luck?.xRank ?? team.rank;
    const deltaRank = luck?.deltaRank ?? 0;
    const xPts = luck?.xPoints ?? 0;
    const deltaPts = luck?.deltaPoints ?? 0;
    const isRealLoaded = team.points !== undefined && team.points !== null;
    const ap = luck?.allPlayRecord ?? { played: 0, wins: 0, draws: 0, losses: 0, winPct: 0 };
    const luckBadge = luck?.luckBadge ?? '⚖️';
    const luckLabel = luck?.luckLabel ?? 'Neutro';
    const luckZ = luck?.luckZScore ?? 0;

    // Dynamic Elo Metrics
    const eloTrack = getManagerEloTrack(team.elo, mode);
    const eloCurrent = eloTrack?.current ?? 1500.0;
    const eloDelta = eloTrack?.lastDelta ?? 0.0;
    const eloBadge = getEloBadgeClasses(eloCurrent);
    const eloDeltaColor = eloDelta > 0 ? 'text-emerald-400' : eloDelta < 0 ? 'text-rose-400' : 'text-slate-400';

    let rankBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 font-bold';
    if (xRank === 1) {
      rankBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 font-black';
    } else if (xRank <= 3) {
      rankBadgeClass = 'bg-slate-200 text-slate-800 dark:bg-slate-700/60 dark:text-slate-200 font-bold';
    }

    const mcPodium = luck?.monteCarlo?.pPodiumPct;
    const mcSpoon = luck?.monteCarlo?.pSpoonPct;

    return `
      <div onclick="window.openTeamMatchesModal && window.openTeamMatchesModal('${team.managerId || ''}', '${escapedTeamName}')"
           class="p-2.5 sm:p-3 border-b last:border-b-0 transition-colors active:bg-amber-500/10 cursor-pointer"
           style="border-color: var(--table-border);">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <div class="flex flex-col items-center shrink-0">
              <span class="w-7 h-6 rounded-md text-[11px] border flex items-center justify-center ${rankBadgeClass}">
                #${xRank}
              </span>
              <div class="mt-0.5">
                ${renderDeltaRankPillHTML(deltaRank, team.rank)}
              </div>
            </div>
            <img src="${teamLogo}" alt="${team.teamName}"
                 class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700 shadow-xs"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(team.teamName)}'">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-xs sm:text-sm leading-snug break-words" style="color: var(--text-main);">
                ${team.teamName}
              </div>
              <div class="text-[10px] sm:text-[11px] font-semibold opacity-80 break-words mt-0.5" style="color: var(--accent-color);">
                ${managerName}
              </div>
              <div class="text-[10px] font-semibold opacity-60 truncate mt-0.5" style="color: var(--text-muted);">
                Reale #${team.rank} (${isRealLoaded ? `${team.points} pt` : '- pt'})
              </div>
            </div>
          </div>
          <div class="shrink-0 flex flex-col items-end gap-1">
            ${renderLuckBadgeHTML(luckBadge, luckLabel, luckZ, true)}
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono border ${eloBadge.bg} ${eloBadge.text} ${eloBadge.border}">
              <span>⚡</span>
              <span>${formatElo(eloCurrent)}</span>
              <span class="text-[9px] ${eloDeltaColor}">(${formatEloDelta(eloDelta)})</span>
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between gap-1.5 mt-2 pt-2 border-t text-[11px]"
             style="border-color: var(--table-border);">
          <div class="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <span class="font-bold font-mono text-xs" style="color: var(--text-main);">${xPts.toFixed(2)} xPTS</span>
            ${renderDeltaPointsPillHTML(deltaPts, isRealLoaded)}
          </div>
          ${(mcPodium !== null && mcPodium !== undefined && mcSpoon !== null && mcSpoon !== undefined) ? `
            <div class="flex items-center gap-1 shrink-0">
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30" title="Probabilità di Podio (1°-3° posto)">
                ${renderPodiumSVG(13)}
                <span>${mcPodium.toFixed(1)}%</span>
              </span>
              <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/25" title="Rischio Cucchiaio di Legno">
                <span>🥄</span>
                <span>${mcSpoon.toFixed(1)}%</span>
              </span>
            </div>
          ` : `
            <div class="text-[10px] font-mono opacity-75 shrink-0" style="color: var(--text-muted);">
              TvT: <strong style="color: var(--text-main);">${ap.wins}V-${ap.draws}N-${ap.losses}P</strong> (${ap.winPct}%)
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

let cachedMeritStandings: LiveTeamMetrics[] = [];

/**
 * Renders the complete View 2 container for Merit & Schedule Luck Standings
 */
export function renderMeritViewContainer(standings: LiveTeamMetrics[]): string {
  cachedMeritStandings = standings;
  const activeMode = getEloMode();

  // Sort 1: by xRank ascending (default)
  const meritStandingsXPTS = [...standings].sort((a, b) => {
    const rA = a.scheduleLuck?.xRank ?? a.rank;
    const rB = b.scheduleLuck?.xRank ?? b.rank;
    return rA - rB;
  });

  // Sort 2: by luckZScore descending (from luckiest 🍀 down to most unlucky ⛈️)
  const meritStandingsLuck = [...standings].sort((a, b) => {
    const zA = a.scheduleLuck?.luckZScore ?? 0;
    const zB = b.scheduleLuck?.luckZScore ?? 0;
    if (zB !== zA) return zB - zA;
    const dPA = a.scheduleLuck?.deltaPoints ?? 0;
    const dPB = b.scheduleLuck?.deltaPoints ?? 0;
    if (dPB !== dPA) return dPB - dPA;
    return a.teamName.localeCompare(b.teamName);
  });

  // Sort 3: by Elo rating descending
  const meritStandingsElo = [...standings].sort((a, b) => {
    const rA = getManagerEloTrack(a.elo, activeMode)?.current ?? 1500.0;
    const rB = getManagerEloTrack(b.elo, activeMode)?.current ?? 1500.0;
    return rB - rA;
  });

  const desktopMeritRowsXPTS = renderMeritDesktopRows(meritStandingsXPTS, activeMode);
  const desktopMeritRowsLuck = renderMeritDesktopRows(meritStandingsLuck, activeMode);
  const desktopMeritRowsElo = renderMeritDesktopRows(meritStandingsElo, activeMode);

  const mobileMeritCardsXPTS = renderMobileMeritCards(meritStandingsXPTS, activeMode);
  const mobileMeritCardsLuck = renderMobileMeritCards(meritStandingsLuck, activeMode);
  const mobileMeritCardsElo = renderMobileMeritCards(meritStandingsElo, activeMode);

  return `
    <div id="live-view-merit-container" class="hidden animate-fadeIn">
      <!-- Desktop View (>= 768px) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left border-collapse table-auto">
          <thead>
            <tr class="border-b text-[10px] sm:text-[11px] uppercase tracking-wider opacity-70 font-bold"
                style="border-color: var(--table-border); background-color: var(--table-surface);">
              <th class="py-2.5 px-3 text-center w-24">Pos. xPTS</th>
              <th class="py-2.5 px-3 text-left">Squadra / Allenatore</th>
              <th class="py-2.5 px-3 text-center w-28">
                <button id="th-merit-sort-xpts"
                        type="button"
                        onclick="window.switchMeritSort && window.switchMeritSort('xpts')"
                        class="inline-flex items-center justify-center gap-1 w-full text-center hover:text-amber-500 transition cursor-pointer text-amber-500 dark:text-amber-400 font-black uppercase text-[10px] sm:text-[11px] tracking-wider"
                        title="Clicca per ordinare per Punti Attesi (xPTS)">
                  <span>Punti Attesi</span>
                  <i id="sort-icon-merit-xpts" class="fa-solid fa-arrow-down text-[10px] ml-0.5"></i>
                </button>
              </th>
              <th class="py-2.5 px-3 text-center w-32">Tutti vs Tutti</th>
              <th class="py-2.5 px-3 text-center w-36">
                <button id="th-merit-sort-luck"
                        type="button"
                        onclick="window.switchMeritSort && window.switchMeritSort('luck')"
                        class="inline-flex items-center justify-center gap-1 w-full text-center hover:text-amber-500 transition cursor-pointer opacity-70 hover:opacity-100 font-bold uppercase text-[10px] sm:text-[11px] tracking-wider"
                        title="Clicca per ordinare per Indice Fortuna (Z-Score)">
                  <span>Indice Fortuna</span>
                  <i id="sort-icon-merit-luck" class="fa-solid fa-arrow-down text-[10px] ml-0.5 hidden"></i>
                </button>
              </th>
              <th class="py-2.5 px-3 text-center w-44">
                <!-- ELO Toggle as Column Header itself + direction arrow -->
                <div class="inline-flex items-center justify-center gap-1.5">
                  <button id="th-merit-sort-elo"
                          type="button"
                          onclick="window.switchMeritSort && window.switchMeritSort('elo')"
                          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition shadow-xs cursor-pointer ${currentMeritSort === 'elo' ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30' : 'bg-slate-500/10 text-slate-300 border-slate-600/40 hover:border-amber-500/30'}"
                          title="Ordina per Elo Rating (Clicca per invertire)">
                    <span id="label-merit-elo-track">${activeMode === 'flat' ? '⚡ Elo Puro (1500)' : '🏛️ Elo Storico'}</span>
                    <i id="sort-icon-merit-elo" class="fa-solid ${currentMeritEloDirection === 'desc' ? 'fa-arrow-down' : 'fa-arrow-up'} text-[10px] ${currentMeritSort === 'elo' ? 'text-amber-400' : 'opacity-40'}"></i>
                  </button>
                  <button id="btn-merit-elo-toggle"
                          type="button"
                          onclick="window.toggleMeritEloMode && window.toggleMeritEloMode(event)"
                          class="w-7 h-7 rounded-xl text-xs flex items-center justify-center border transition shadow-xs cursor-pointer bg-slate-500/10 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 border-slate-600/40 hover:border-amber-500/30 active:scale-95 shrink-0"
                          title="Commuta tra modalità Puro (1500) e Storico">
                    <i class="fa-solid fa-rotate text-[10px]"></i>
                  </button>
                </div>
              </th>
              <th class="py-2.5 px-3 text-center w-28">
                <div class="flex items-center justify-center gap-1">
                  ${renderPodiumSVG(15)}
                  <span>Scenari MC</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody id="merit-desktop-tbody-xpts">
            ${desktopMeritRowsXPTS}
          </tbody>
          <tbody id="merit-desktop-tbody-luck" class="hidden">
            ${desktopMeritRowsLuck}
          </tbody>
          <tbody id="merit-desktop-tbody-elo" class="hidden">
            ${desktopMeritRowsElo}
          </tbody>
        </table>
      </div>

      <!-- Mobile Clean View (< 768px) -->
      <div id="merit-mobile-cards-xpts" class="md:hidden flex flex-col divide-y divide-[var(--table-border)]">
        ${mobileMeritCardsXPTS}
      </div>
      <div id="merit-mobile-cards-luck" class="hidden md:hidden flex flex-col divide-y divide-[var(--table-border)]">
        ${mobileMeritCardsLuck}
      </div>
      <div id="merit-mobile-cards-elo" class="hidden md:hidden flex flex-col divide-y divide-[var(--table-border)]">
        ${mobileMeritCardsElo}
      </div>
    </div>
  `;
}

// Interactive Merit Sorting State & Handlers
let currentMeritSort: 'xpts' | 'luck' | 'elo' = 'xpts';
let currentMeritEloDirection: 'desc' | 'asc' = 'desc';

export function toggleMobileMeritSort(): void {
  const nextOrder = currentMeritSort === 'xpts' ? 'elo' : currentMeritSort === 'elo' ? 'luck' : 'xpts';
  switchMeritSort(nextOrder);
}

export function toggleMeritEloMode(event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const nextMode: EloTrackMode = getEloMode() === 'flat' ? 'historical' : 'flat';
  setEloMode(nextMode);

  // Update labels across views
  const label = document.getElementById('label-merit-elo-track');
  if (label) {
    label.textContent = nextMode === 'flat' ? '⚡ Elo Puro (1500)' : '🏛️ Elo Storico';
  }
  const realLabel = document.getElementById('label-real-elo-track');
  if (realLabel) {
    realLabel.textContent = nextMode === 'flat' ? '⚡ Elo Puro (1500)' : '🏛️ Elo Storico';
  }

  // Re-render bodies with new mode
  if (cachedMeritStandings.length > 0) {
    const meritStandingsXPTS = [...cachedMeritStandings].sort((a, b) => {
      const rA = a.scheduleLuck?.xRank ?? a.rank;
      const rB = b.scheduleLuck?.xRank ?? b.rank;
      return rA - rB;
    });

    const meritStandingsLuck = [...cachedMeritStandings].sort((a, b) => {
      const zA = a.scheduleLuck?.luckZScore ?? 0;
      const zB = b.scheduleLuck?.luckZScore ?? 0;
      if (zB !== zA) return zB - zA;
      return (b.scheduleLuck?.deltaPoints ?? 0) - (a.scheduleLuck?.deltaPoints ?? 0);
    });

    const dir = currentMeritEloDirection;
    const meritStandingsElo = [...cachedMeritStandings].sort((a, b) => {
      const rA = getManagerEloTrack(a.elo, nextMode)?.current ?? 1500.0;
      const rB = getManagerEloTrack(b.elo, nextMode)?.current ?? 1500.0;
      return dir === 'desc' ? rB - rA : rA - rB;
    });

    const desktopXPTS = document.getElementById('merit-desktop-tbody-xpts');
    const desktopLuck = document.getElementById('merit-desktop-tbody-luck');
    const desktopElo = document.getElementById('merit-desktop-tbody-elo');
    const mobileXPTS = document.getElementById('merit-mobile-cards-xpts');
    const mobileLuck = document.getElementById('merit-mobile-cards-luck');
    const mobileElo = document.getElementById('merit-mobile-cards-elo');

    if (desktopXPTS) desktopXPTS.innerHTML = renderMeritDesktopRows(meritStandingsXPTS, nextMode);
    if (desktopLuck) desktopLuck.innerHTML = renderMeritDesktopRows(meritStandingsLuck, nextMode);
    if (desktopElo) desktopElo.innerHTML = renderMeritDesktopRows(meritStandingsElo, nextMode);

    if (mobileXPTS) mobileXPTS.innerHTML = renderMobileMeritCards(meritStandingsXPTS, nextMode);
    if (mobileLuck) mobileLuck.innerHTML = renderMobileMeritCards(meritStandingsLuck, nextMode);
    if (mobileElo) mobileElo.innerHTML = renderMobileMeritCards(meritStandingsElo, nextMode);
  }
}

export function switchMeritSort(order: 'xpts' | 'luck' | 'elo'): void {
  if (order === 'elo' && currentMeritSort === 'elo') {
    currentMeritEloDirection = currentMeritEloDirection === 'desc' ? 'asc' : 'desc';
  }
  currentMeritSort = order;
  if (typeof document === 'undefined') return;

  const thXPTS = document.getElementById('th-merit-sort-xpts');
  const thLuck = document.getElementById('th-merit-sort-luck');
  const thElo = document.getElementById('th-merit-sort-elo');
  const iconXPTS = document.getElementById('sort-icon-merit-xpts');
  const iconLuck = document.getElementById('sort-icon-merit-luck');
  const iconElo = document.getElementById('sort-icon-merit-elo');

  const labelMobile = document.getElementById('label-merit-sort-mobile');

  const desktopXPTS = document.getElementById('merit-desktop-tbody-xpts');
  const desktopLuck = document.getElementById('merit-desktop-tbody-luck');
  const desktopElo = document.getElementById('merit-desktop-tbody-elo');
  const mobileXPTS = document.getElementById('merit-mobile-cards-xpts');
  const mobileLuck = document.getElementById('merit-mobile-cards-luck');
  const mobileElo = document.getElementById('merit-mobile-cards-elo');

  // Reset text-based headers
  [thXPTS, thLuck].forEach(th => {
    th?.classList.remove('text-amber-500', 'dark:text-amber-400', 'font-black');
    th?.classList.add('opacity-70');
  });
  [iconXPTS, iconLuck].forEach(ic => ic?.classList.add('hidden'));

  // Reset Elo button styles
  thElo?.classList.remove('bg-amber-500/15', 'text-amber-500', 'dark:text-amber-400', 'border-amber-500/30');
  thElo?.classList.add('bg-slate-500/10', 'text-slate-300', 'border-slate-600/40');
  if (iconElo) {
    iconElo.className = `fa-solid fa-arrow-down text-[10px] opacity-40`;
  }

  // Hide all tbodies and card containers
  [desktopXPTS, desktopLuck, desktopElo, mobileXPTS, mobileLuck, mobileElo].forEach(el => el?.classList.add('hidden'));

  if (order === 'xpts') {
    thXPTS?.classList.remove('opacity-70');
    thXPTS?.classList.add('text-amber-500', 'dark:text-amber-400', 'font-black');
    iconXPTS?.classList.remove('hidden');

    if (labelMobile) labelMobile.textContent = 'xPTS (Merito)';
    desktopXPTS?.classList.remove('hidden');
    mobileXPTS?.classList.remove('hidden');
  } else if (order === 'luck') {
    thLuck?.classList.remove('opacity-70');
    thLuck?.classList.add('text-amber-500', 'dark:text-amber-400', 'font-black');
    iconLuck?.classList.remove('hidden');

    if (labelMobile) labelMobile.textContent = 'Fortuna (Z-Score)';
    desktopLuck?.classList.remove('hidden');
    mobileLuck?.classList.remove('hidden');
  } else if (order === 'elo') {
    thElo?.classList.add('bg-amber-500/15', 'text-amber-500', 'dark:text-amber-400', 'border-amber-500/30');
    thElo?.classList.remove('bg-slate-500/10', 'text-slate-300', 'border-slate-600/40', 'opacity-70');

    if (iconElo) {
      iconElo.classList.remove('hidden', 'opacity-40');
      iconElo.className = `fa-solid ${currentMeritEloDirection === 'desc' ? 'fa-arrow-down' : 'fa-arrow-up'} text-[10px] text-amber-400`;
    }

    if (cachedMeritStandings.length > 0) {
      const nextMode = getEloMode();
      const dir = currentMeritEloDirection;
      const meritStandingsElo = [...cachedMeritStandings].sort((a, b) => {
        const rA = getManagerEloTrack(a.elo, nextMode)?.current ?? 1500.0;
        const rB = getManagerEloTrack(b.elo, nextMode)?.current ?? 1500.0;
        return dir === 'desc' ? rB - rA : rA - rB;
      });
      if (desktopElo) desktopElo.innerHTML = renderMeritDesktopRows(meritStandingsElo, nextMode);
      if (mobileElo) mobileElo.innerHTML = renderMobileMeritCards(meritStandingsElo, nextMode);
    }

    if (labelMobile) labelMobile.textContent = 'Elo Rating';
    desktopElo?.classList.remove('hidden');
    mobileElo?.classList.remove('hidden');
  }
}
