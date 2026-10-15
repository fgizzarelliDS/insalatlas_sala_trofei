import type { HeadToHeadStats, Manager } from '@/types';

/**
 * Renders the direct championship duels scoreboard:
 * - 3 Big Numbers (Wins A, Ties, Wins B)
 * - Proportional duel progress bar
 * - Collapsible chronology table of all shared seasons
 */
export function renderHeadToHeadScoreboard(
  stats: HeadToHeadStats,
  managerA: Manager,
  managerB: Manager,
  isChronologyExpanded: boolean
): string {
  const { duels, winsA, winsB, ties } = stats;

  const totalDuels = duels.length;
  const pctA = totalDuels > 0 ? (winsA / totalDuels) * 100 : 33.3;
  const pctTie = totalDuels > 0 ? (ties / totalDuels) * 100 : 33.3;
  const pctB = totalDuels > 0 ? (winsB / totalDuels) * 100 : 33.3;

  // Duels detailed table
  let duelsRowsHTML = '';
  if (duels.length === 0) {
    duelsRowsHTML = `
      <tr>
        <td colspan="3" class="py-3 text-center text-xs opacity-60 italic">
          Nessuna stagione disputata contemporaneamente da entrambi i mister.
        </td>
      </tr>
    `;
  } else {
    duelsRowsHTML = duels
      .map(d => {
        const rankClassA = d.winner === 'A' ? 'font-black' : 'opacity-80';
        const rankClassB = d.winner === 'B' ? 'font-black' : 'opacity-80';
        const rankStyleA = d.winner === 'A' ? 'color: var(--h2h-contender-a);' : '';
        const rankStyleB = d.winner === 'B' ? 'color: var(--h2h-contender-b);' : '';

        return `
          <tr class="border-b last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5 transition" style="border-color: var(--table-border);">
            <td class="py-2 px-2.5 font-bold text-xs" style="color: var(--text-main);">${d.season}</td>
            <td class="py-2 px-2 text-center text-xs ${rankClassA}" style="${rankStyleA}">
              <span class="font-extrabold">${d.rankA}°</span>
              ${d.teamA ? `<span class="block text-[10px] opacity-65 truncate max-w-[140px] mx-auto">${d.teamA}</span>` : ''}
            </td>
            <td class="py-2 px-2 text-center text-xs ${rankClassB}" style="${rankStyleB}">
              <span class="font-extrabold">${d.rankB}°</span>
              ${d.teamB ? `<span class="block text-[10px] opacity-65 truncate max-w-[140px] mx-auto">${d.teamB}</span>` : ''}
            </td>
          </tr>
        `;
      })
      .join('');
  }

  return `
    <div class="p-3.5 rounded-2xl border" style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="flex items-center justify-between mb-2.5">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-flag-checkered text-xs" style="color: var(--accent-color);"></i>
          <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--text-main);">
            Scontri Diretti di Campionato
          </span>
        </div>
        <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
          ${stats.sharedSeasonsCount} ${stats.sharedSeasonsCount === 1 ? 'Stagione Condivisa' : 'Stagioni Condivise'}
        </span>
      </div>

      <!-- 3 Big Numbers Scoreboard -->
      <div class="grid grid-cols-3 gap-2 text-center py-2 px-1 rounded-xl border mb-2.5"
           style="background-color: var(--modal-bg); border-color: var(--table-border);">
        <div>
          <span class="block text-2xl font-sport font-black leading-none" style="color: var(--h2h-contender-a);">${winsA}</span>
          <span class="text-[10px] font-bold opacity-75 uppercase tracking-tight" style="color: var(--text-main);">Vittorie ${managerA.name}</span>
        </div>
        <div class="border-x" style="border-color: var(--table-border);">
          <span class="block text-2xl font-sport font-black leading-none opacity-80" style="color: var(--text-main);">${ties}</span>
          <span class="text-[10px] font-bold opacity-75 uppercase tracking-tight" style="color: var(--text-main);">Pari</span>
        </div>
        <div>
          <span class="block text-2xl font-sport font-black leading-none" style="color: var(--h2h-contender-b);">${winsB}</span>
          <span class="text-[10px] font-bold opacity-75 uppercase tracking-tight" style="color: var(--text-main);">Vittorie ${managerB.name}</span>
        </div>
      </div>

      <!-- Duel Progress Bar -->
      ${
        totalDuels > 0
          ? `
        <div class="w-full h-2 rounded-full overflow-hidden flex border mb-2.5"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div style="width: ${pctA}%; background-color: var(--h2h-contender-a);" class="transition-all duration-500" title="Vittorie ${managerA.name}: ${winsA}"></div>
          <div style="width: ${pctTie}%; background-color: rgba(148, 163, 184, 0.4);" class="transition-all duration-500" title="Pari: ${ties}"></div>
          <div style="width: ${pctB}%; background-color: var(--h2h-contender-b);" class="transition-all duration-500" title="Vittorie ${managerB.name}: ${winsB}"></div>
        </div>
      `
          : ''
      }

      <!-- Toggle Chronology Button -->
      <div class="text-center">
        <button onclick="toggleH2HChronology()"
          class="text-[11px] font-bold px-3 py-1 rounded-lg border transition inline-flex items-center gap-1.5 opacity-80 hover:opacity-100"
          style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
          <i class="fa-solid fa-clock-rotate-left text-[10px]"></i>
          <span>${isChronologyExpanded ? 'Nascondi Tabellino Annate' : 'Mostra Tabellino Annate (' + duels.length + ')'}</span>
          <i class="fa-solid ${isChronologyExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[9px]"></i>
        </button>
      </div>

      <!-- Expandable Chronology Table -->
      ${
        isChronologyExpanded
          ? `
        <div class="mt-3 overflow-x-auto rounded-xl border" style="border-color: var(--table-border); scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b text-[10px] uppercase tracking-wider font-extrabold opacity-75"
                  style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--text-main);">
                <th class="py-2 px-2.5">Stagione</th>
                <th class="py-2 px-2 text-center">${managerA.name}</th>
                <th class="py-2 px-2 text-center">${managerB.name}</th>
              </tr>
            </thead>
            <tbody>
              ${duelsRowsHTML}
            </tbody>
          </table>
        </div>
      `
          : ''
      }
    </div>
  `;
}
