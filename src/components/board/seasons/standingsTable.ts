import type { CompetitionRecord } from '@/types';
import { state } from '@/state';
import { renderTrophySVG } from '@/trophies';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { LEAGUE } from '@/config';
import {
  getLiveSeasonDetails,
  renderFormDotsHTML,
  renderStatusBadgeHTML
} from './liveAnalytics';

/**
 * Renders the enhanced Live In-Progress Standings Table (Desktop & Mobile)
 */
function renderLiveChampionshipTable(
  championship: CompetitionRecord,
  liveData: ReturnType<typeof getLiveSeasonDetails>
): string {
  if (!liveData || !liveData.standings || liveData.standings.length === 0) {
    return '';
  }

  const standings = liveData.standings;
  const lastCompleted = liveData.lastCompletedRound || 0;
  const totalRounds = liveData.totalRounds || 0;

  // Desktop Table Rows
  const desktopRowsHTML = standings.map(team => {
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

  // Mobile Clean Cards (< 768px)
  const mobileCardsHTML = standings.map(team => {
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
        <!-- Top Row: Rank + Team/Coach + Status -->
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

        <!-- Sub-Detail Row: ONLY Forma L5 -->
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

  return `
    <div class="albo-table-wrap rounded-2xl overflow-hidden border mb-6 shadow-sm" style="border-color: var(--table-border); background-color: var(--table-surface);">
      <!-- Table Header Banner -->
      <div class="px-3.5 sm:px-4 py-2.5 sm:py-3 border-b flex flex-wrap items-center justify-between gap-2"
           style="border-color: var(--table-border); background-color: var(--header-bg); color: var(--header-text);">
        <div class="flex items-center gap-2 font-sport font-bold text-xs sm:text-sm tracking-wide">
          ${renderTrophySVG('gold_cup', 'compact')}
          <span>${championship.name} (${championship.season})</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse"></span>
            In corso • G${lastCompleted}/${totalRounds}
          </span>
        </div>
        <button type="button"
                onclick="window.toggleLiveStandingsGuide && window.toggleLiveStandingsGuide()"
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition hover:bg-amber-500/15 active:scale-95 cursor-pointer shadow-xs bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30"
                title="Clicca per aprire la legenda dello stato di forma e guida partite">
          <i class="fa-solid fa-circle-info text-amber-400"></i>
          <span class="hidden sm:inline">Clicca su una squadra per le partite • Guida Stato</span>
          <span class="sm:hidden">Tocca per le partite • Guida</span>
          <i id="live-guide-chevron" class="fa-solid fa-chevron-down text-[10px] ml-0.5 transition-transform duration-200"></i>
        </button>
      </div>

      <!-- Expandable Collapsible Guide Box -->
      <div id="live-standings-guide" class="hidden border-b p-3.5 sm:p-4 text-xs transition-all"
           style="border-color: var(--table-border); background-color: var(--table-surface);">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-500 dark:text-amber-400">
            <i class="fa-solid fa-chart-line"></i>
            <span>Legenda Stato & Momentum (L5)</span>
          </div>
          <span class="text-[10px] font-semibold opacity-70" style="color: var(--text-muted);">
            Ponderato sulle ultime 5 gare (le più recenti incidono di più)
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5">
          <!-- 🔥 In Fiamme -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">🔥</span>
            <div>
              <div class="font-bold text-amber-500 dark:text-amber-400 text-xs">IN FIAMME</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Momentum &ge; 75% e fantapunti recenti sopra media lega.</div>
            </div>
          </div>

          <!-- 📈 In Ascesa -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">📈</span>
            <div>
              <div class="font-bold text-emerald-500 dark:text-emerald-400 text-xs">IN ASCESA</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Momentum &ge; 55% con vittoria nell'ultimo turno disputato.</div>
            </div>
          </div>

          <!-- ⚖️ Stabile -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-slate-500/10 border-slate-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">⚖️</span>
            <div>
              <div class="font-bold text-slate-500 dark:text-slate-300 text-xs">STABILE</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Rendimento bilanciato e trend a centro classifica.</div>
            </div>
          </div>

          <!-- 📉 In Flessione -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-orange-500/10 border-orange-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">📉</span>
            <div>
              <div class="font-bold text-orange-500 dark:text-orange-400 text-xs">IN FLESSIONE</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Momentum &le; 35% oppure 2 sconfitte consecutive.</div>
            </div>
          </div>

          <!-- 🧊 Crisi Nera -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-cyan-500/10 border-cyan-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">🧊</span>
            <div>
              <div class="font-bold text-cyan-500 dark:text-cyan-400 text-xs">CRISI NERA</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Momentum &le; 15% (striscia prolungata negativa).</div>
            </div>
          </div>
        </div>

        <div class="mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] opacity-80"
             style="border-color: var(--table-border); color: var(--text-muted);">
          <div class="flex items-center gap-1.5">
            <i class="fa-regular fa-hand-pointer text-amber-400"></i>
            <span><strong>Tabellino gare:</strong> Clicca o tocca una squadra per vedere tutti gli incontri giornata per giornata.</span>
          </div>
          <span class="text-[10px] opacity-70 hidden sm:inline">Esiti: 🟢 V • 🟡 N • 🔴 P • - In programma</span>
        </div>
      </div>

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
            ${desktopRowsHTML}
          </tbody>
        </table>
      </div>

      <!-- Mobile Clean View (< 768px) -->
      <div class="md:hidden flex flex-col divide-y divide-[var(--table-border)]">
        ${mobileCardsHTML}
      </div>
    </div>
  `;
}

/**
 * Renders the Championship Standings table for a season (with live analytics if in-progress)
 */
export function renderChampionshipTable(championship: CompetitionRecord): string {
  if (!championship || !championship.ranking || championship.ranking.length === 0) {
    return '';
  }

  const isInProgress = !!championship.in_progress || championship.status === 'in_progress';

  // If in progress, check if live season details are loaded
  if (isInProgress) {
    const liveData = getLiveSeasonDetails();
    if (liveData && liveData.season === championship.season && liveData.standings && liveData.standings.length > 0) {
      return renderLiveChampionshipTable(championship, liveData);
    }
  }

  // Graceful fallback: Classic 3-column table
  let rowsHtml = '';
  const numericRanks = championship.ranking
    .map(r => r.rank)
    .filter((rk): rk is number => typeof rk === 'number' && rk > 0);
  const lastRank = numericRanks.length > 0 ? Math.max(...numericRanks) : 0;
  const isSpoonCompetition = LEAGUE.features.spoon && lastRank >= (LEAGUE.rules.spoonMinTeams || 8);

  const sortedRanking = [...championship.ranking].sort((a, b) => {
    const getWeight = (r: typeof a) => {
      if (typeof r.rank === 'number' && r.rank > 0) {
        if (!isInProgress && isSpoonCompetition && r.rank === lastRank) return 999999;
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

      if (!isInProgress) {
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
      } else {
        if (r.rank === 1) {
          rankBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 font-bold';
        }
      }
    }

    const mgr = state.managers?.find(m => m.id === r.managerId);
    const managerName = mgr ? mgr.name : (r.coach || 'Sconosciuto');
    const hasValidPoints = typeof r.points === 'number' && r.points > 0;
    const ptsStr = hasValidPoints ? `${r.points} pt` : '-';
    const clickHandler = r.managerId ? `onclick="openProfileModal('${r.managerId}')"` : '';
    const cursorClass = r.managerId ? 'cursor-pointer hover:bg-amber-500/10' : '';

    rowsHtml += `
      <tr ${clickHandler} data-manager-id="${r.managerId || ''}" id="standings-row-${r.managerId || ''}" class="border-b last:border-b-0 transition-colors ${cursorClass}" style="border-color: var(--table-border);">
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
          <span>${championship.name} (${championship.season})</span>
          ${isInProgress ? `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse"></span>
              In corso
            </span>
          ` : ''}
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

declare global {
  interface Window {
    toggleLiveStandingsGuide?: () => void;
  }
}

if (typeof window !== 'undefined') {
  window.toggleLiveStandingsGuide = () => {
    const guide = document.getElementById('live-standings-guide');
    const chevron = document.getElementById('live-guide-chevron');
    if (guide) {
      const isHidden = guide.classList.contains('hidden');
      if (isHidden) {
        guide.classList.remove('hidden');
        chevron?.classList.add('rotate-180');
      } else {
        guide.classList.add('hidden');
        chevron?.classList.remove('rotate-180');
      }
    }
  };
}
