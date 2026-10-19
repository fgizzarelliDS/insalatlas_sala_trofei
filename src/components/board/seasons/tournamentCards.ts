import type { CompetitionRecord } from '@/types';
import { state } from '@/state';
import { LEAGUE } from '@/config';
import { renderTrophySVG } from '@/trophies';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';

/**
 * Renders the tournament cards section for secondary cups, supercups, and playout
 */
export function renderOtherTournamentsSection(otherTournaments: CompetitionRecord[]): string {
  if (!otherTournaments || otherTournaments.length === 0) {
    return '';
  }

  const filteredTournaments = otherTournaments.filter(tourn => {
    const catLower = (tourn.category || '').toLowerCase();
    const nameLower = (tourn.name || '').toLowerCase();
    const isSupercoppa = catLower.includes('supercoppa') || nameLower.includes('supercup') || nameLower.includes('supercoppa');
    const isMundialito = catLower.includes('mundialito') || nameLower.includes('mundialito');
    const isPlayout = catLower.includes('perdenti') || catLower.includes('cartonato') || nameLower.includes('perdenti') || nameLower.includes('playout');

    if (!LEAGUE.features.mundialito && isMundialito) return false;
    if (!LEAGUE.features.supercup && isSupercoppa) return false;
    if (!LEAGUE.features.cartonato && isPlayout) return false;
    if (!LEAGUE.features.cup && !isSupercoppa && !isMundialito && !isPlayout) return false;
    return true;
  });

  if (filteredTournaments.length === 0) {
    return '';
  }

  const tournamentCards = filteredTournaments.map(tourn => {
    const catLower = (tourn.category || '').toLowerCase();
    const nameLower = (tourn.name || '').toLowerCase();
    const isSupercoppa = catLower.includes('supercoppa') || nameLower.includes('supercup') || nameLower.includes('supercoppa');
    const isMundialito = catLower.includes('mundialito') || nameLower.includes('mundialito');
    const isPlayout = catLower.includes('perdenti') || catLower.includes('cartonato') || nameLower.includes('perdenti') || nameLower.includes('playout');

    let trophyElement = renderTrophySVG('coppa_gold', 'compact');
    let categoryBadge = 'Coppa di Lega';
    let badgeStyleClass = 'bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30';

    if (isSupercoppa) {
      trophyElement = renderTrophySVG('supercup', 'compact');
      categoryBadge = 'Supercoppa';
      badgeStyleClass = 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30';
    } else if (isMundialito) {
      trophyElement = renderTrophySVG('mundialito', 'compact');
      categoryBadge = 'Mundialito';
      badgeStyleClass = 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30';
    } else if (isPlayout) {
      trophyElement = `<span class="px-1.5 py-0.5 rounded bg-blue-600 text-[10px] text-white font-extrabold shadow-sm tracking-wider">BANNER</span>`;
      categoryBadge = 'Playout';
      badgeStyleClass = 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/50';
    }

    let tournRows = '';
    const isInProgress = !!tourn.in_progress || tourn.status === 'in_progress';
    const hasRankings = Boolean(tourn.ranking && tourn.ranking.length > 0);

    if (hasRankings) {
      tourn.ranking?.forEach(r => {
        let rankBadge = `#${r.rank}`;
        let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

        if (!isInProgress) {
          if (r.rank === 1) {
            rankBadge = '🥇 Vincitore';
            badgeStyle = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40 font-black';
          } else if (r.rank === 2) {
            rankBadge = '🥈 Finalista';
            badgeStyle = 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600 font-bold';
          }
        }

        const mgr = state.managers?.find(m => m.id === r.managerId);
        const managerName = mgr ? mgr.name : (r.coach || 'Sconosciuto');
        const clickHandler = r.managerId ? `onclick="openProfileModal('${r.managerId}')"` : '';
        const cursorClass = r.managerId ? 'cursor-pointer hover:bg-amber-500/10' : '';

        tournRows += `
          <tr ${clickHandler} class="border-b last:border-b-0 transition-colors ${cursorClass}" style="border-color: var(--table-border);">
            <td class="py-2 px-1.5 sm:px-2.5 text-center align-middle whitespace-nowrap w-20 sm:w-24">
              <span class="px-2 py-0.5 rounded-lg text-[11px] border shadow-sm inline-block ${badgeStyle}">
                ${rankBadge}
              </span>
            </td>
            <td class="py-2 px-2 sm:px-2.5 text-left align-middle min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <img src="${resolveTeamLogo(r.teamName, r.logo)}" alt="${r.teamName}" 
                     class="w-6 h-6 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700 shadow-sm"
                     onerror="this.onerror=null; this.src='${getTeamFallbackCrest(r.teamName)}'">
                <div class="min-w-0 flex-1">
                  <div class="font-bold text-xs leading-snug break-words" style="color: var(--text-main); word-break: break-word;">
                    ${r.teamName}
                  </div>
                  <div class="text-[10px] font-semibold flex items-center gap-1 mt-0.5 truncate" style="color: var(--accent-color, #f59e0b);">
                    <i class="fa-solid fa-user-tie text-[9px] opacity-70 shrink-0"></i>
                    <span class="truncate">${managerName}</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        `;
      });
    }

    const cardBodyHtml = hasRankings
      ? `
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b text-[10px] uppercase tracking-wider opacity-70" style="border-color: var(--table-border);">
              <th class="py-1.5 px-2.5 text-center w-24">Esito</th>
              <th class="py-1.5 px-2.5 text-left">Squadra / Mister</th>
            </tr>
          </thead>
          <tbody>
            ${tournRows}
          </tbody>
        </table>
      `
      : `
        <div class="py-7 px-4 text-center flex flex-col items-center justify-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            In corso
          </span>
          <span class="text-xs italic font-medium" style="color: var(--text-muted);">
            Verdetti finali in definizione
          </span>
        </div>
      `;

    return `
      <div class="albo-table-wrap rounded-2xl overflow-hidden border flex flex-col justify-between" style="border-color: var(--table-border); background-color: var(--table-surface);">
        <div>
          <div class="px-3.5 py-2.5 border-b flex items-center justify-between" style="border-color: var(--table-border); background-color: var(--header-bg); color: var(--header-text);">
            <div class="flex items-center gap-2 font-sport font-bold text-xs sm:text-sm tracking-wide">
              ${trophyElement}
              <span>${tourn.name}</span>
            </div>
            <span class="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md border shadow-sm ${badgeStyleClass}">
              ${categoryBadge}
            </span>
          </div>
          ${cardBodyHtml}
        </div>
      </div>
    `;
  });

  return `
    <div class="mt-6">
      <h3 class="font-sport font-bold italic text-base uppercase mb-3 flex items-center gap-2" style="color: var(--accent-color);">
        <i class="fa-solid fa-shield"></i>
        <span>Coppe &amp; Tornei di Stagione</span>
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${tournamentCards.join('')}
      </div>
    </div>
  `;
}
