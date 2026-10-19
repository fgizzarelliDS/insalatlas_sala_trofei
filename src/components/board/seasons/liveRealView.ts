import type { LiveTeamMetrics } from '@/types';
import { state } from '@/state';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { renderFormDotsHTML, renderStatusBadgeHTML } from './liveAnalytics';

/**
 * Renders desktop table rows for the Real Championship Standings
 */
export function renderRealDesktopRows(standings: LiveTeamMetrics[]): string {
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
      </tr>
    `;
  }).join('');
}

/**
 * Renders mobile clean cards (< 768px) for the Real Championship Standings
 */
export function renderRealMobileCards(standings: LiveTeamMetrics[]): string {
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

    return `
      <div onclick="window.openTeamMatchesModal && window.openTeamMatchesModal('${team.managerId || ''}', '${escapedTeamName}')"
           class="p-3 border-b last:border-b-0 transition-colors active:bg-amber-500/10 cursor-pointer"
           style="border-color: var(--table-border);">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <span class="w-7 h-6 rounded-md text-[11px] border flex items-center justify-center shrink-0 ${rankBadgeClass}">
              #${team.rank}
            </span>
            <img src="${teamLogo}" alt="${team.teamName}"
                 class="w-7 h-7 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(team.teamName)}'">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-xs truncate" style="color: var(--text-main);">
                ${team.teamName}
              </div>
              <div class="text-[10px] font-semibold opacity-80 truncate" style="color: var(--accent-color);">
                ${managerName}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
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
 * Renders the complete View 1 container for Real Standings (Desktop table & Mobile cards)
 */
export function renderRealViewContainer(standings: LiveTeamMetrics[]): string {
  const desktopRows = renderRealDesktopRows(standings);
  const mobileCards = renderRealMobileCards(standings);

  return `
    <div id="live-view-real-container" class="animate-fadeIn">
      <!-- Desktop View (>= 768px) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left border-collapse table-auto">
          <thead>
            <tr class="border-b text-[10px] sm:text-[11px] uppercase tracking-wider opacity-70 font-bold"
                style="border-color: var(--table-border); background-color: var(--table-surface);">
              <th class="py-2.5 px-3 text-center w-14">Pos</th>
              <th class="py-2.5 px-3 text-left">Squadra / Allenatore</th>
              <th class="py-2.5 px-3 text-center w-36">Forma (L5)</th>
              <th class="py-2.5 px-3 text-center w-32">Stato</th>
            </tr>
          </thead>
          <tbody>
            ${desktopRows}
          </tbody>
        </table>
      </div>

      <!-- Mobile Clean View (< 768px) -->
      <div class="md:hidden flex flex-col divide-y divide-[var(--table-border)]">
        ${mobileCards}
      </div>
    </div>
  `;
}
