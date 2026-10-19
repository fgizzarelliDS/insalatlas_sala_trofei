import type { CompetitionRecord } from '@/types';
import { state } from '@/state';
import { renderTrophySVG } from '@/trophies';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { LEAGUE } from '@/config';
import {
  getLiveSeasonDetails,
  renderFormDotsHTML,
  renderStatusBadgeHTML,
  renderLuckBadgeHTML,
  renderDeltaRankPillHTML,
  renderDeltaPointsPillHTML,
  renderPodiumSVG
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

  // Real View: Desktop Rows
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

  // Real View: Mobile Clean Cards (< 768px)
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

  // Helper to render desktop rows for merit view
  const renderDesktopMeritRows = (teamList: typeof standings) => teamList.map(team => {
    const mgr = state.managers?.find(m => m.id === team.managerId);
    const managerName = mgr ? mgr.name : (team.coach || 'Allenatore');
    const teamLogo = resolveTeamLogo(team.teamName, team.logo);
    const escapedTeamName = team.teamName.replace(/'/g, "\\'");
    const luck = team.scheduleLuck;
    const xRank = luck?.xRank ?? team.rank;
    const deltaRank = luck?.deltaRank ?? 0;
    const xPts = luck?.xPoints ?? 0;
    const deltaPts = luck?.deltaPoints ?? 0;
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
            ${renderDeltaPointsPillHTML(deltaPts)}
            <span class="opacity-60 font-semibold whitespace-nowrap" style="color: var(--text-muted);">vs ${team.points !== undefined && team.points !== null ? `${team.points} pt` : '- pt'}</span>
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

  // Helper to render mobile cards for merit view
  const renderMobileMeritCards = (teamList: typeof standings) => teamList.map(team => {
    const mgr = state.managers?.find(m => m.id === team.managerId);
    const managerName = mgr ? mgr.name : (team.coach || 'Allenatore');
    const teamLogo = resolveTeamLogo(team.teamName, team.logo);
    const escapedTeamName = team.teamName.replace(/'/g, "\\'");
    const luck = team.scheduleLuck;
    const xRank = luck?.xRank ?? team.rank;
    const deltaRank = luck?.deltaRank ?? 0;
    const xPts = luck?.xPoints ?? 0;
    const deltaPts = luck?.deltaPoints ?? 0;
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
              <div class="font-bold text-xs sm:text-sm leading-tight line-clamp-2 break-words" style="color: var(--text-main);">
                ${team.teamName}
              </div>
              <div class="text-[10px] sm:text-[11px] font-semibold opacity-80 flex items-center gap-1 mt-0.5 min-w-0" style="color: var(--accent-color);">
                <span class="truncate">${managerName}</span>
                <span class="opacity-60 shrink-0 whitespace-nowrap" style="color: var(--text-muted);">• Reale #${team.rank} (${team.points !== undefined && team.points !== null ? `${team.points} pt` : '- pt'})</span>
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
            ${renderDeltaPointsPillHTML(deltaPts)}
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

  const desktopMeritRowsXPTS = renderDesktopMeritRows(meritStandingsXPTS);
  const desktopMeritRowsLuck = renderDesktopMeritRows(meritStandingsLuck);
  const mobileMeritCardsXPTS = renderMobileMeritCards(meritStandingsXPTS);
  const mobileMeritCardsLuck = renderMobileMeritCards(meritStandingsLuck);

  return `
    <div class="albo-table-wrap rounded-2xl overflow-hidden border mb-6 shadow-sm" style="border-color: var(--table-border); background-color: var(--table-surface);">
      <!-- Table Header Banner (Integrated with Switcher & Compact Guide Toggle) -->
      <div class="px-3 sm:px-4 py-2 sm:py-2.5 border-b"
           style="border-color: var(--table-border); background-color: var(--header-bg); color: var(--header-text);">
        
        <!-- Desktop Layout (>= md): Single Sleek Broadcast Row -->
        <div class="hidden md:flex items-center justify-between gap-3">
          <!-- Left: Trophy + Title + In Corso Badge -->
          <div class="flex items-center gap-2.5 font-sport font-bold text-sm tracking-wide shrink-0">
            ${renderTrophySVG('gold_cup', 'compact')}
            <span>${championship.name} (${championship.season})</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              In corso • G${lastCompleted}/${totalRounds}
            </span>
          </div>

          <!-- Center: 2-Way View Switcher -->
          <div class="inline-flex items-center p-0.5 rounded-xl bg-black/25 backdrop-blur-xs border border-white/15 shadow-inner">
            <button id="btn-live-view-real"
                    type="button"
                    onclick="window.switchLiveStandingsView && window.switchLiveStandingsView('real')"
                    class="px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-amber-500 text-slate-950 shadow-xs">
              <i class="fa-solid fa-list-ol text-[11px]"></i>
              <span>Classifica Reale</span>
            </button>
            <button id="btn-live-view-merit"
                    type="button"
                    onclick="window.switchLiveStandingsView && window.switchLiveStandingsView('merit')"
                    class="px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-white/75 hover:text-white hover:bg-white/10">
              <i class="fa-solid fa-scale-balanced text-[11px]"></i>
              <span>Merito & Fortuna</span>
            </button>
          </div>

          <!-- Right: Guide Toggle + Teams Count -->
          <div class="flex items-center gap-2 shrink-0">
            <button type="button"
                    onclick="window.toggleLiveStandingsGuide && window.toggleLiveStandingsGuide()"
                    class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition hover:bg-white/20 active:scale-95 cursor-pointer shadow-xs bg-white/10 text-white/90 border-white/20 backdrop-blur-xs"
                    title="Clicca per aprire la guida">
              <i class="fa-solid fa-circle-info text-amber-300"></i>
              <span>Guida & Legenda</span>
              <i id="live-guide-chevron" class="fa-solid fa-chevron-down text-[10px] ml-0.5 transition-transform duration-200"></i>
            </button>
            <div class="text-xs font-semibold opacity-75">
              ${standings.length} Squadre
            </div>
          </div>
        </div>

        <!-- Mobile Layout (< md): 2 Clean Rows with Compact Guida Button in Row 1 -->
        <div class="md:hidden flex flex-col gap-2">
          <!-- Row 1: Title (left) & Live Badge + Compact Guide Button (right) -->
          <div class="flex items-center justify-between gap-2 min-w-0">
            <div class="flex items-center gap-1.5 font-sport font-bold text-xs tracking-wide truncate min-w-0">
              ${renderTrophySVG('gold_cup', 'compact')}
              <span class="truncate">${championship.name}</span>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <!-- Live Badge (Adaptive width: shows 'In corso • G1/26' on xs+ and 'G1/26' on tight screens) -->
              <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 whitespace-nowrap shadow-xs">
                <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span class="hidden xs:inline">In corso • </span>
                <span>G${lastCompleted}/${totalRounds}</span>
              </span>

              <!-- Compact Guide Button in Row 1 -->
              <button type="button"
                      onclick="window.toggleLiveStandingsGuide && window.toggleLiveStandingsGuide()"
                      class="flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold transition hover:bg-white/20 active:scale-95 cursor-pointer shadow-xs bg-white/10 text-white/90 border-white/20 backdrop-blur-xs"
                      title="Apri guida e legenda">
                <i class="fa-solid fa-circle-info text-amber-300 text-xs"></i>
                <i id="live-guide-chevron-mobile" class="fa-solid fa-chevron-down text-[9px] opacity-75 transition-transform duration-200"></i>
              </button>
            </div>
          </div>

          <!-- Row 2: Full-Width 50/50 Glass Switcher -->
          <div class="grid grid-cols-2 p-0.5 rounded-xl bg-black/25 backdrop-blur-xs border border-white/15 shadow-inner w-full">
            <button id="btn-live-view-real-mobile"
                    type="button"
                    onclick="window.switchLiveStandingsView && window.switchLiveStandingsView('real')"
                    class="px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer bg-amber-500 text-slate-950 shadow-xs">
              <i class="fa-solid fa-list-ol text-[11px]"></i>
              <span>Classifica Reale</span>
            </button>
            <button id="btn-live-view-merit-mobile"
                    type="button"
                    onclick="window.switchLiveStandingsView && window.switchLiveStandingsView('merit')"
                    class="px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-white/75 hover:text-white hover:bg-white/10">
              <i class="fa-solid fa-scale-balanced text-[11px]"></i>
              <span>Merito & Fortuna</span>
            </button>
          </div>
        </div>

      </div>

      <!-- Expandable Collapsible Dynamic Guide Box -->
      <div id="live-standings-guide" class="hidden border-b p-3.5 sm:p-4 text-xs transition-all"
           style="border-color: var(--table-border); background-color: var(--table-surface);">
        <!-- Guide Content for Real View -->
        <div id="guide-content-real">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
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
                <div class="font-bold text-amber-800 dark:text-amber-400 text-xs">IN FIAMME</div>
                <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Momentum &ge; 75% e fantapunti recenti sopra media lega.</div>
              </div>
            </div>

            <!-- 📈 In Ascesa -->
            <div class="p-2 sm:p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 flex items-start gap-2">
              <span class="text-base leading-none shrink-0">📈</span>
              <div>
                <div class="font-bold text-emerald-800 dark:text-emerald-400 text-xs">IN ASCESA</div>
                <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Momentum &ge; 55% con vittoria nell'ultimo turno disputato.</div>
              </div>
            </div>

            <!-- ⚖️ Stabile -->
            <div class="p-2 sm:p-2.5 rounded-xl border bg-slate-500/10 border-slate-500/30 flex items-start gap-2">
              <span class="text-base leading-none shrink-0">⚖️</span>
              <div>
                <div class="font-bold text-xs" style="color: var(--text-main);">STABILE</div>
                <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Rendimento bilanciato e trend a centro classifica.</div>
              </div>
            </div>

            <!-- 📉 In Flessione -->
            <div class="p-2 sm:p-2.5 rounded-xl border bg-orange-500/10 border-orange-500/30 flex items-start gap-2">
              <span class="text-base leading-none shrink-0">📉</span>
              <div>
                <div class="font-bold text-orange-800 dark:text-orange-400 text-xs">IN FLESSIONE</div>
                <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Momentum &le; 35% oppure 2 sconfitte consecutive.</div>
              </div>
            </div>

            <!-- 🧊 Crisi Nera -->
            <div class="p-2 sm:p-2.5 rounded-xl border bg-cyan-500/10 border-cyan-500/30 flex items-start gap-2">
              <span class="text-base leading-none shrink-0">🧊</span>
              <div>
                <div class="font-bold text-cyan-800 dark:text-cyan-400 text-xs">CRISI NERA</div>
                <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Momentum &le; 15% (striscia prolungata negativa).</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Guide Content for Merit View -->
        <div id="guide-content-merit" class="hidden">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <i class="fa-solid fa-scale-balanced"></i>
              <span>Guida Merito (xPTS) & Calendario Monte Carlo</span>
            </div>
            <span class="text-[10px] font-semibold opacity-70" style="color: var(--text-muted);">
              1 vs Tutti a soglie gol (66/72/78) • 10.000 calendari alternativi simulati
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5">
            <!-- 🍀 Favorevole -->
            <div class="p-2 sm:p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 flex items-start gap-2">
              <span class="text-base leading-none shrink-0">🍀</span>
              <div>
                <div class="font-bold text-emerald-800 dark:text-emerald-400 text-xs">FAVOREVOLE (&ge; +1.0σ)</div>
                <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Massima resa dagli incroci. Punti reali superiori al merito oggettivo.</div>
              </div>
            </div>

            <!-- ↗️ Positivo -->
            <div class="p-2 sm:p-2.5 rounded-xl border bg-teal-500/10 border-teal-500/30 flex items-start gap-2">
              <span class="text-base leading-none shrink-0">↗️</span>
              <div>
                <div class="font-bold text-teal-800 dark:text-teal-400 text-xs">POSITIVO (+0.35..+1.0σ)</div>
                <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Accoppiamenti favorevoli rispetto al volume di fantapunti prodotti.</div>
              </div>
            </div>

            <!-- ⚖️ Neutro -->
            <div class="p-2 sm:p-2.5 rounded-xl border bg-slate-500/10 border-slate-500/30 flex items-start gap-2">
              <span class="text-base leading-none shrink-0">⚖️</span>
              <div>
                <div class="font-bold text-xs" style="color: var(--text-main);">NEUTRO (±0.35σ)</div>
                <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Calendario bilanciato. Punti reali allineati al merito della squadra.</div>
              </div>
            </div>

            <!-- ↘️ Sfortunato -->
            <div class="p-2 sm:p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/30 flex items-start gap-2">
              <span class="text-base leading-none shrink-0">↘️</span>
              <div>
                <div class="font-bold text-amber-800 dark:text-amber-400 text-xs">SFORTUNATO (-0.35..-1.0σ)</div>
                <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Penalizzato dal calendario. Ha affrontato avversari in gran spolvero.</div>
              </div>
            </div>

            <!-- ⛈️ Bersagliato -->
            <div class="p-2 sm:p-2.5 rounded-xl border bg-rose-500/10 border-rose-500/30 flex items-start gap-2">
              <span class="text-base leading-none shrink-0">⛈️</span>
              <div>
                <div class="font-bold text-rose-800 dark:text-rose-400 text-xs">BERSAGLIATO (&le; -1.0σ)</div>
                <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Fortissima sfortuna: punti persi in sfide proibitive nonostante punteggi alti.</div>
              </div>
            </div>
          </div>

          <div class="mt-2.5 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-80"
               style="border-color: var(--table-border); color: var(--text-muted);">
            <div><strong>Punti Attesi (xPTS):</strong> Media esatta dei punti meritati simulando ogni giornata contro tutti i 13 avversari.</div>
            <div><strong>ΔPunti:</strong> Punti Reali − xPTS (differenza dovuta unicamente alla casualità del calendario).</div>
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

      <!-- View 1: Real Standings Container -->
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
              ${desktopRowsHTML}
            </tbody>
          </table>
        </div>

        <!-- Mobile Clean View (< 768px) -->
        <div class="md:hidden flex flex-col divide-y divide-[var(--table-border)]">
          ${mobileCardsHTML}
        </div>
      </div>

      <!-- View 2: Merit & Fortuna Standings Container -->
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
    switchLiveStandingsView?: (mode: 'real' | 'merit') => void;
    switchMeritSort?: (order: 'xpts' | 'luck') => void;
    toggleMobileMeritSort?: () => void;
  }
}

export function toggleLiveStandingsGuide(): void {
  const guide = typeof document !== 'undefined' ? document.getElementById('live-standings-guide') : null;
  const chevron = typeof document !== 'undefined' ? document.getElementById('live-guide-chevron') : null;
  const chevronMobile = typeof document !== 'undefined' ? document.getElementById('live-guide-chevron-mobile') : null;
  if (guide) {
    const isHidden = guide.classList.contains('hidden');
    if (isHidden) {
      guide.classList.remove('hidden');
      chevron?.classList.add('rotate-180');
      chevronMobile?.classList.add('rotate-180');
    } else {
      guide.classList.add('hidden');
      chevron?.classList.remove('rotate-180');
      chevronMobile?.classList.remove('rotate-180');
    }
  }
}

const INACTIVE_TAB_CLASSES = ['text-white/75', 'hover:text-white', 'hover:bg-white/10'];
const ACTIVE_TAB_CLASSES = ['bg-amber-500', 'text-slate-950', 'shadow-xs'];

export function switchLiveStandingsView(mode: 'real' | 'merit'): void {
  if (typeof document === 'undefined') return;

  const btnReal = document.getElementById('btn-live-view-real');
  const btnRealMobile = document.getElementById('btn-live-view-real-mobile');
  const btnMerit = document.getElementById('btn-live-view-merit');
  const btnMeritMobile = document.getElementById('btn-live-view-merit-mobile');

  const viewReal = document.getElementById('live-view-real-container');
  const viewMerit = document.getElementById('live-view-merit-container');

  const guideReal = document.getElementById('guide-content-real');
  const guideMerit = document.getElementById('guide-content-merit');

  const realButtons = [btnReal, btnRealMobile].filter(Boolean) as HTMLElement[];
  const meritButtons = [btnMerit, btnMeritMobile].filter(Boolean) as HTMLElement[];

  if (mode === 'real') {
    realButtons.forEach(btn => {
      btn.classList.remove(...INACTIVE_TAB_CLASSES);
      btn.classList.add(...ACTIVE_TAB_CLASSES);
    });

    meritButtons.forEach(btn => {
      btn.classList.remove(...ACTIVE_TAB_CLASSES);
      btn.classList.add(...INACTIVE_TAB_CLASSES);
    });

    viewReal?.classList.remove('hidden');
    viewMerit?.classList.add('hidden');

    guideReal?.classList.remove('hidden');
    guideMerit?.classList.add('hidden');
  } else {
    meritButtons.forEach(btn => {
      btn.classList.remove(...INACTIVE_TAB_CLASSES);
      btn.classList.add(...ACTIVE_TAB_CLASSES);
    });

    realButtons.forEach(btn => {
      btn.classList.remove(...ACTIVE_TAB_CLASSES);
      btn.classList.add(...INACTIVE_TAB_CLASSES);
    });

    viewReal?.classList.add('hidden');
    viewMerit?.classList.remove('hidden');

    guideReal?.classList.add('hidden');
    guideMerit?.classList.remove('hidden');
  }
}

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

if (typeof window !== 'undefined') {
  window.toggleLiveStandingsGuide = toggleLiveStandingsGuide;
  window.switchLiveStandingsView = switchLiveStandingsView;
  window.switchMeritSort = switchMeritSort;
  window.toggleMobileMeritSort = toggleMobileMeritSort;
}


