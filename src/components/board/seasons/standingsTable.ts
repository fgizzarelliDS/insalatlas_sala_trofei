import type { CompetitionRecord } from '@/types';
import { state } from '@/state';
import { renderTrophySVG } from '@/trophies';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';

/**
 * Renders the Championship Standings table for a season
 */
export function renderChampionshipTable(championship: CompetitionRecord): string {
  if (!championship || !championship.ranking || championship.ranking.length === 0) {
    return '';
  }

  let rowsHtml = '';
  const numericRanks = championship.ranking
    .map(r => r.rank)
    .filter((rk): rk is number => typeof rk === 'number' && rk > 0);
  const lastRank = numericRanks.length > 0 ? Math.max(...numericRanks) : 0;
  const isSpoonCompetition = lastRank >= 8;

  const sortedRanking = [...championship.ranking].sort((a, b) => {
    const getWeight = (r: typeof a) => {
      if (typeof r.rank === 'number' && r.rank > 0) {
        if (isSpoonCompetition && r.rank === lastRank) return 999999;
        return r.rank;
      }
      return 500000;
    };
    return getWeight(a) - getWeight(b);
  });

  sortedRanking.forEach(r => {
    let rankLabel = 'N/D';
    let rankBadgeClass = 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/50';

    if (typeof r.rank === 'number' && r.rank > 0) {
      rankLabel = `#${r.rank}`;
      rankBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

      if (r.rank === 1) {
        rankLabel = '🥇 1°<span class="hidden sm:inline"> Scudetto</span>';
        rankBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40 font-black';
      } else if (r.rank === 2) {
        rankLabel = '🥈 2°<span class="hidden sm:inline"> Posto</span>';
        rankBadgeClass = 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600 font-bold';
      } else if (r.rank === 3) {
        rankLabel = '🥉 3°<span class="hidden sm:inline"> Posto</span>';
        rankBadgeClass = 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-700/25 dark:text-amber-400 dark:border-amber-700/40 font-bold';
      } else if (r.rank === lastRank && lastRank >= 8) {
        rankLabel = `🥄 ${r.rank}°<span class="hidden sm:inline"> Cucchiaio</span>`;
        rankBadgeClass = 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40 font-bold';
      }
    }

    // Canonical manager name
    const mgr = state.managers?.find(m => m.id === r.managerId);
    const managerName = mgr ? mgr.name : (r.coach || 'Sconosciuto');

    // Sanitized points
    const hasValidPoints = typeof r.points === 'number' && r.points > 0;
    const ptsStr = hasValidPoints ? `${r.points} pt` : '-';

    const clickHandler = r.managerId ? `onclick="openProfileModal('${r.managerId}')"` : '';
    const cursorClass = r.managerId ? 'cursor-pointer hover:bg-amber-500/10' : '';

    rowsHtml += `
      <tr ${clickHandler} class="border-b last:border-b-0 transition-colors ${cursorClass}" style="border-color: var(--table-border);">
        <td class="py-2 sm:py-2.5 px-1.5 sm:px-3 text-center align-middle whitespace-nowrap w-14 sm:w-28">
          <span class="px-1.5 sm:px-2 py-0.5 rounded-lg text-[11px] sm:text-xs border shadow-sm inline-block ${rankBadgeClass}">
            ${rankLabel}
          </span>
        </td>
        <td class="py-2 sm:py-2.5 px-2 sm:px-3 text-left align-middle min-w-0">
          <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <img src="${resolveTeamLogo(r.teamName, r.logo)}" alt="${r.teamName}" 
                 class="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700 shadow-sm"
                 onerror="this.onerror=null; this.src='${getTeamFallbackCrest(r.teamName)}'">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-xs sm:text-sm leading-snug break-words" style="color: var(--text-main); word-break: break-word;">
                ${r.teamName}
              </div>
              <div class="text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 mt-0.5 truncate" style="color: var(--accent-color, #f59e0b);">
                <i class="fa-solid fa-user-tie text-[9px] opacity-70 shrink-0"></i>
                <span class="truncate">${managerName}</span>
              </div>
            </div>
          </div>
        </td>
        <td class="py-2 sm:py-2.5 px-1.5 sm:px-3 text-right align-middle whitespace-nowrap font-mono text-xs sm:text-sm font-extrabold w-14 sm:w-20" style="color: var(--text-main);">
          ${ptsStr}
        </td>
      </tr>
    `;
  });

  return `
    <div class="albo-table-wrap rounded-2xl overflow-hidden border mb-6" style="border-color: var(--table-border); background-color: var(--table-surface);">
      <div class="px-3.5 sm:px-4 py-2.5 sm:py-3 border-b flex items-center justify-between" style="border-color: var(--table-border); background-color: var(--header-bg); color: var(--header-text);">
        <div class="flex items-center gap-2 font-sport font-bold text-xs sm:text-sm tracking-wide">
          ${renderTrophySVG('gold_cup', 'compact')}
          <span>${championship.name} (${championship.season}) • Classifica Ufficiale</span>
        </div>
        <span class="text-xs font-semibold opacity-75 shrink-0 ml-2">
          ${championship.ranking.length} Squadre
        </span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse table-auto sm:table-fixed">
          <thead>
            <tr class="border-b text-[10px] sm:text-[11px] uppercase tracking-wider opacity-70" style="border-color: var(--table-border);">
              <th class="py-2 px-1.5 sm:px-3 text-center w-14 sm:w-28">Posizione</th>
              <th class="py-2 px-2 sm:px-3 text-left">Squadra / Allenatore</th>
              <th class="py-2 px-1.5 sm:px-3 text-right w-14 sm:w-20">Punti</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
