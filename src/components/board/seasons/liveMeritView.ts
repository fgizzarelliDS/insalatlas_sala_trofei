import type { LiveTeamMetrics } from '@/types';
import { state } from '@/state';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import {
  renderLuckBadgeHTML,
  renderDeltaRankPillHTML,
  renderDeltaPointsPillHTML,
  renderPodiumSVG
} from './liveAnalytics';

/**
 * Renders desktop table rows for the Merit & Schedule Luck Standings
 */
export function renderMeritDesktopRows(standings: LiveTeamMetrics[]): string {
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
export function renderMobileMeritCards(standings: LiveTeamMetrics[]): string {
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
              <div class="font-bold text-xs sm:text-sm leading-tight truncate" style="color: var(--text-main);">
                ${team.teamName}
              </div>
              <div class="text-[10px] sm:text-[11px] font-semibold opacity-80 truncate mt-0.5" style="color: var(--accent-color);">
                ${managerName}
              </div>
              <div class="text-[10px] font-semibold opacity-60 truncate mt-0.5" style="color: var(--text-muted);">
                Reale #${team.rank} (${isRealLoaded ? `${team.points} pt` : '- pt'})
              </div>
            </div>
          </div>
          <div class="shrink-0">
            ${renderLuckBadgeHTML(luckBadge, luckLabel, luckZ, true)}
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

/**
 * Renders the complete View 2 container for Merit & Schedule Luck Standings
 */
export function renderMeritViewContainer(standings: LiveTeamMetrics[]): string {
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

  const desktopMeritRowsXPTS = renderMeritDesktopRows(meritStandingsXPTS);
  const desktopMeritRowsLuck = renderMeritDesktopRows(meritStandingsLuck);
  const mobileMeritCardsXPTS = renderMobileMeritCards(meritStandingsXPTS);
  const mobileMeritCardsLuck = renderMobileMeritCards(meritStandingsLuck);

  return `
    <div id="live-view-merit-container" class="hidden animate-fadeIn">
      <!-- Mobile Micro-Sorter (< md) -->
      <div class="md:hidden px-3.5 py-1.5 border-b flex items-center justify-between text-xs"
           style="border-color: var(--table-border); background-color: var(--table-surface);">
        <span class="text-[11px] font-semibold opacity-70" style="color: var(--text-muted);">
          Ordina per:
        </span>
        <button id="btn-merit-sort-mobile-toggle"
                type="button"
                onclick="window.toggleMobileMeritSort && window.toggleMobileMeritSort()"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition shadow-xs cursor-pointer bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25 active:scale-95"
                title="Tocca per cambiare ordinamento">
          <i class="fa-solid fa-arrow-down-wide-short text-[10px]"></i>
          <span id="label-merit-sort-mobile">xPTS (Merito)</span>
        </button>
      </div>

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
        </table>
      </div>

      <!-- Mobile Clean View (< 768px) -->
      <div id="merit-mobile-cards-xpts" class="md:hidden flex flex-col divide-y divide-[var(--table-border)]">
        ${mobileMeritCardsXPTS}
      </div>
      <div id="merit-mobile-cards-luck" class="hidden md:hidden flex flex-col divide-y divide-[var(--table-border)]">
        ${mobileMeritCardsLuck}
      </div>
    </div>
  `;
}

// Interactive Merit Sorting State & Handlers
let currentMeritSort: 'xpts' | 'luck' = 'xpts';

export function toggleMobileMeritSort(): void {
  const nextOrder = currentMeritSort === 'xpts' ? 'luck' : 'xpts';
  switchMeritSort(nextOrder);
}

export function switchMeritSort(order: 'xpts' | 'luck'): void {
  currentMeritSort = order;
  if (typeof document === 'undefined') return;

  const thXPTS = document.getElementById('th-merit-sort-xpts');
  const thLuck = document.getElementById('th-merit-sort-luck');
  const iconXPTS = document.getElementById('sort-icon-merit-xpts');
  const iconLuck = document.getElementById('sort-icon-merit-luck');

  const labelMobile = document.getElementById('label-merit-sort-mobile');

  const desktopXPTS = document.getElementById('merit-desktop-tbody-xpts');
  const desktopLuck = document.getElementById('merit-desktop-tbody-luck');
  const mobileXPTS = document.getElementById('merit-mobile-cards-xpts');
  const mobileLuck = document.getElementById('merit-mobile-cards-luck');

  if (order === 'xpts') {
    thXPTS?.classList.remove('opacity-70');
    thXPTS?.classList.add('text-amber-500', 'dark:text-amber-400', 'font-black');
    iconXPTS?.classList.remove('hidden');

    thLuck?.classList.remove('text-amber-500', 'dark:text-amber-400', 'font-black');
    thLuck?.classList.add('opacity-70');
    iconLuck?.classList.add('hidden');

    if (labelMobile) labelMobile.textContent = 'xPTS (Merito)';

    desktopXPTS?.classList.remove('hidden');
    desktopLuck?.classList.add('hidden');
    mobileXPTS?.classList.remove('hidden');
    mobileLuck?.classList.add('hidden');
  } else {
    thLuck?.classList.remove('opacity-70');
    thLuck?.classList.add('text-amber-500', 'dark:text-amber-400', 'font-black');
    iconLuck?.classList.remove('hidden');

    thXPTS?.classList.remove('text-amber-500', 'dark:text-amber-400', 'font-black');
    thXPTS?.classList.add('opacity-70');
    iconXPTS?.classList.add('hidden');

    if (labelMobile) labelMobile.textContent = 'Fortuna (Z-Score)';

    desktopLuck?.classList.remove('hidden');
    desktopXPTS?.classList.add('hidden');
    mobileLuck?.classList.remove('hidden');
    mobileXPTS?.classList.add('hidden');
  }
}
