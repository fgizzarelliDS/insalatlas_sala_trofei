import { state } from '@/state';
import { renderTrophySVG } from '@/trophies';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';

let currentSelectedSeason: string | null = null;

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
 * Switches the main view between Albo d'Oro and Archivio Stagioni & Classifiche
 */
export function switchMainViewTab(tab: 'albo' | 'seasons'): void {
  const alboContent = document.getElementById('main-tab-albo-content');
  const seasonsContent = document.getElementById('main-tab-seasons-content');
  const btnAlbo = document.getElementById('main-tab-btn-albo');
  const btnSeasons = document.getElementById('main-tab-btn-seasons');

  const activeBtnClass =
    'flex-1 sm:flex-initial justify-center sm:justify-start px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm bg-amber-500 text-slate-950';
  const inactiveBtnClass =
    'flex-1 sm:flex-initial justify-center sm:justify-start px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-1.5 border border-transparent';

  if (tab === 'albo') {
    alboContent?.classList.remove('hidden');
    seasonsContent?.classList.add('hidden');
    if (btnAlbo) {
      btnAlbo.className = activeBtnClass;
      btnAlbo.style.color = '#020617';
    }
    if (btnSeasons) {
      btnSeasons.className = inactiveBtnClass;
      btnSeasons.style.color = 'var(--text-main)';
    }
  } else {
    alboContent?.classList.add('hidden');
    seasonsContent?.classList.remove('hidden');
    if (btnSeasons) {
      btnSeasons.className = activeBtnClass;
      btnSeasons.style.color = '#020617';
    }
    if (btnAlbo) {
      btnAlbo.className = inactiveBtnClass;
      btnAlbo.style.color = 'var(--text-main)';
    }
    renderSeasonsArchive();
  }
}

/**
 * Sets active archive season and updates view
 */
export function selectArchiveSeason(season: string): void {
  currentSelectedSeason = season;
  renderSeasonsArchive();
}

/**
 * Renders the full seasonal tournament archive view
 */
export function renderSeasonsArchive(): void {
  const container = document.getElementById('main-tab-seasons-content');
  if (!container) return;

  const seasons = getAvailableSeasons();
  if (seasons.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-sm font-bold opacity-60 italic">
        Nessun dato sulle stagioni archiviato.
      </div>
    `;
    return;
  }

  if (!currentSelectedSeason || !seasons.includes(currentSelectedSeason)) {
    currentSelectedSeason = seasons[0];
  }

  // 1. Season Pills Bar
  let pillsHtml = '';
  seasons.forEach(season => {
    const isActive = season === currentSelectedSeason;
    const activeClass = isActive
      ? 'bg-amber-500 text-slate-950 font-black shadow-md border-amber-400 scale-105'
      : 'opacity-70 hover:opacity-100 font-bold border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5';
    pillsHtml += `
      <button type="button" onclick="selectArchiveSeason('${season}')"
        class="px-3.5 py-1.5 rounded-xl text-xs transition border flex items-center gap-1.5 shrink-0 ${activeClass}"
        style="${isActive ? '' : 'color: var(--text-main); background-color: var(--table-surface);'}">
        <i class="fa-solid fa-calendar-check text-[10px] ${isActive ? 'text-slate-950' : 'text-amber-500 dark:text-amber-400'}"></i>
        <span>${season}</span>
      </button>
    `;
  });

  // 2. Competitions in current season
  const comps = (state.competitions || []).filter(c => c.season === currentSelectedSeason);

  // Separate into Championship vs Other tournaments
  const championship = comps.find(c => c.category === 'championship' || /serie\s*atlas|campionato/i.test(c.name));
  const otherTournaments = comps.filter(c => c !== championship);

  // Season Header Summary
  const totalTeams = championship?.ranking?.length || comps[0]?.ranking?.length || 0;
  const seasonSummaryHtml = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6 p-4 rounded-2xl border albo-table-wrap">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-2xl font-black font-sport italic uppercase" style="color: var(--accent-color);">
            Stagione ${currentSelectedSeason}
          </span>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            ${comps.length} ${comps.length === 1 ? 'Competizione' : 'Competizioni'}
          </span>
        </div>
        <p class="text-xs font-semibold mt-1 opacity-70" style="color: var(--text-muted);">
          Archivio ufficiale dei piazzamenti, podi e verdetti storici InsalAtlas
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

  // Render Championship Standings Table
  let championshipHtml = '';
  if (championship && championship.ranking && championship.ranking.length > 0) {
    let rowsHtml = '';
    const lastRank = Math.max(...championship.ranking.map(r => r.rank));

    championship.ranking.forEach(r => {
      let rankLabel = `#${r.rank}`;
      let rankBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

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

      // Canonical manager name
      const mgr = state.managers?.find(m => m.id === r.managerId);
      const managerName = mgr ? mgr.name : (r.coach || 'Sconosciuto');

      // Sanitized points
      const hasValidPoints = typeof r.points === 'number' && r.points > 0 && currentSelectedSeason !== '2020/21';
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

    championshipHtml = `
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

  // Render Other Tournaments (Cups, Supercups, Mundialito, Playout)
  let othersHtml = '';
  if (otherTournaments.length > 0) {
    const tournamentCards = otherTournaments.map(tourn => {
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
      tourn.ranking?.forEach(r => {
        let rankBadge = `#${r.rank}`;
        let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

        if (r.rank === 1) {
          rankBadge = '🥇 Vincitore';
          badgeStyle = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40 font-black';
        } else if (r.rank === 2) {
          rankBadge = '🥈 Finalista';
          badgeStyle = 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600 font-bold';
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
          </div>
        </div>
      `;
    });

    othersHtml = `
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

  container.innerHTML = `
    <!-- Season Pills Bar -->
    <div class="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
      ${pillsHtml}
    </div>

    <!-- Season Header -->
    ${seasonSummaryHtml}

    <!-- Championship Standings -->
    ${championshipHtml}

    <!-- Other Competitions Grid -->
    ${othersHtml}
  `;
}

// Global window assignments for inline HTML handlers
if (typeof window !== 'undefined') {
  (window as unknown as { switchMainViewTab?: typeof switchMainViewTab }).switchMainViewTab = switchMainViewTab;
  (window as unknown as { selectArchiveSeason?: typeof selectArchiveSeason }).selectArchiveSeason = selectArchiveSeason;
  (window as unknown as { renderSeasonsArchive?: typeof renderSeasonsArchive }).renderSeasonsArchive = renderSeasonsArchive;
}
