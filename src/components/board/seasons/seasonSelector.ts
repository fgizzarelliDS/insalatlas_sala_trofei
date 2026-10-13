import { state } from '@/state';

/**
 * Returns distinct seasons sorted descending chronologically (e.g. 2025/26 down to 2016/17)
 */
export function getAvailableSeasons(): string[] {
  if (!state.competitions || state.competitions.length === 0) return [];
  const seasonsSet = new Set<string>();
  state.competitions.forEach(c => {
    if (c.season) seasonsSet.add(c.season);
  });
  return Array.from(seasonsSet).sort((a, b) => {
    const yA = parseInt(a.match(/\d{4}/)?.[0] || '0', 10);
    const yB = parseInt(b.match(/\d{4}/)?.[0] || '0', 10);
    return yB - yA;
  });
}

/**
 * Renders the top selector bar with season buttons
 */
export function renderSeasonPills(seasons: string[], currentSelectedSeason: string): string {
  let pillsHtml = '';
  seasons.forEach(season => {
    const isActive = season === currentSelectedSeason;
    const isInProgress = state.competitions.some(
      c => c.season === season && (c.in_progress || c.status === 'in_progress')
    );

    const activeClass = isActive
      ? 'bg-amber-500 text-slate-950 font-black shadow-md border-amber-400 scale-105'
      : 'opacity-70 hover:opacity-100 font-bold border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5';
    pillsHtml += `
      <button type="button" onclick="selectArchiveSeason('${season}')"
        class="px-3.5 py-1.5 rounded-xl text-xs transition border flex items-center gap-1.5 shrink-0 ${activeClass}"
        style="${isActive ? '' : 'color: var(--text-main); background-color: var(--table-surface);'}">
        <i class="fa-solid fa-calendar-check text-[10px] ${isActive ? 'text-slate-950' : 'text-amber-500 dark:text-amber-400'}"></i>
        <span>${season}</span>
        ${isInProgress ? `
          <span class="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-1 shrink-0 ${
            isActive
              ? 'bg-slate-950/20 text-slate-950 border border-slate-950/30'
              : 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30'
          }">
            <span class="w-1 h-1 rounded-full ${isActive ? 'bg-slate-950' : 'bg-amber-500 dark:bg-amber-400'} animate-pulse"></span>
            In corso
          </span>
        ` : ''}
      </button>
    `;
  });

  return `
    <div class="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
      ${pillsHtml}
    </div>
  `;
}

/**
 * Renders the season overview banner with competition and team counts
 */
export function renderSeasonHeaderSummary(
  currentSelectedSeason: string,
  compsCount: number,
  totalTeams: number,
  isInProgress: boolean = false
): string {
  return `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6 p-4 rounded-2xl border albo-table-wrap">
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-2xl font-black font-sport italic uppercase" style="color: var(--accent-color);">
            Stagione ${currentSelectedSeason}
          </span>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            ${compsCount} ${compsCount === 1 ? 'Competizione' : 'Competizioni'}
          </span>
          ${isInProgress ? `
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              In corso
            </span>
          ` : ''}
        </div>
        <p class="text-xs font-semibold mt-1 opacity-70" style="color: var(--text-muted);">
          ${isInProgress
            ? 'Stagione attualmente in corso • Classifiche e verdetti provvisori'
            : 'Archivio ufficiale dei piazzamenti, podi e verdetti storici InsalAtlas'}
        </p>
      </div>
      ${totalTeams > 0 ? `
        <div class="flex items-center gap-2 text-xs font-bold opacity-80" style="color: var(--text-muted);">
          <i class="fa-solid fa-users text-amber-400"></i>
          <span>${totalTeams} Squadre partecipanti</span>
        </div>
      ` : ''}
    </div>
  `;
}
