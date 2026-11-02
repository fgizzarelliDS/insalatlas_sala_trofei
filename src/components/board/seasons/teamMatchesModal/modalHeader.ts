/**
 * src/components/board/seasons/teamMatchesModal/modalHeader.ts
 * Renders the top header, manager profile summary, SoS difficulty badge,
 * analytical merit strip, and the two dedicated tab switchers.
 */

import { escapeHtml } from '@/utils/dom';
import { formatElo } from '@/analytics/analyticsCore';
import { getTeamFallbackCrest } from '@/crests';
import { renderLuckBadgeHTML, renderDeltaPointsPillHTML } from '../liveAnalytics';
import { getSoSBadgeInfo } from '@/analytics/sosEngine';
import type { ModalHeaderProps } from './types';

export function renderModalHeaderHTML(props: ModalHeaderProps): string {
  const {
    resolvedTeamName,
    managerDisplayName,
    teamLogo,
    teamMetric,
    eloTrack,
    eloBadge,
    teamSoS,
    statusBadge,
    statusLabel,
    hasHistory,
    activeTab,
    luck,
    xPts,
    deltaPts,
    ap,
    luckBadge,
    luckLabel,
    luckZ
  } = props;

  const escapedTeamName = resolvedTeamName.replace(/'/g, "\\'");
  const sosInfo = teamSoS ? getSoSBadgeInfo(teamSoS) : null;

  return `
    <div class="flex flex-col shrink-0">
      <!-- Top Header Bar matching SeasonModal & TrophyModal -->
      <div class="p-4 sm:p-5 border-b flex items-center justify-between gap-3 shrink-0"
           style="border-color: var(--table-border);">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          ${hasHistory ? `
            <button type="button" onclick="window.navigateBackTeamMatchesModal && window.navigateBackTeamMatchesModal()"
                    class="w-8 h-8 rounded-full flex items-center justify-center font-bold transition border shadow-xs hover:bg-amber-500/10 active:scale-95 text-amber-500 shrink-0 cursor-pointer"
                    style="background-color: var(--btn-bg); border-color: var(--btn-border);"
                    title="Torna alla squadra precedente">
              <i class="fa-solid fa-arrow-left text-xs"></i>
            </button>
          ` : ''}

          <img src="${teamLogo}" alt="${escapeHtml(resolvedTeamName)}"
               class="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-contain shrink-0 bg-white/20 border border-slate-300 dark:border-slate-700 shadow-md"
               onerror="this.onerror=null; this.src='${getTeamFallbackCrest(resolvedTeamName)}'">

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-sport font-black text-base sm:text-lg leading-snug break-words" style="color: var(--text-main);" title="${escapeHtml(resolvedTeamName)}">
                ${escapeHtml(resolvedTeamName)}
              </h3>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shadow-xs bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30">
                <span>${statusBadge}</span>
                <span class="uppercase">${statusLabel}</span>
              </span>
            </div>

            <div class="text-xs font-semibold flex items-center gap-2 mt-1 flex-wrap" style="color: var(--text-muted);">
              ${eloTrack ? `
                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border flex items-center gap-1 shadow-xs ${eloBadge.bg} ${eloBadge.text} ${eloBadge.border}">
                  <i class="fa-solid fa-bolt text-[10px]"></i>
                  <span>${formatElo(eloTrack.current)} Elo</span>
                </span>
              ` : ''}

              ${sosInfo ? `
                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border flex items-center gap-1 shadow-xs ${sosInfo.badgeClass}"
                      title="Strength of Schedule residuo: 50% Elo avversari + 50% Punti classifica avversari futuri">
                  <span>${sosInfo.icon}</span>
                  <span>SoS: #${teamSoS?.sosRank}</span>
                  <span class="opacity-75 font-normal">${sosInfo.eloSubtext}</span>
                </span>
              ` : ''}

              <span class="flex items-center gap-1">
                <i class="fa-solid fa-user-tie text-[10px] opacity-70" style="color: var(--accent-color);"></i>
                <span class="font-bold" style="color: var(--accent-color);">${escapeHtml(managerDisplayName)}</span>
              </span>

              ${teamMetric ? `<span class="opacity-60 text-[11px] whitespace-nowrap">• #${teamMetric.rank} in classifica (${teamMetric.points !== undefined && teamMetric.points !== null ? `${teamMetric.points} pt` : '- pt'})</span>` : ''}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <!-- Share Dropdown Button -->
          <div class="relative">
            <button type="button"
                    id="btn-team-matches-share"
                    onclick="window.toggleTeamMatchesShareDropdown && window.toggleTeamMatchesShareDropdown(event)"
                    class="px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer text-amber-500 shadow-xs"
                    style="background-color: var(--btn-bg); border-color: var(--btn-border);"
                    title="Condividi calendario e statistiche">
              <i class="fa-solid fa-share-nodes"></i>
              <span class="hidden sm:inline">Condividi</span>
              <i class="fa-solid fa-chevron-down text-[10px] ml-0.5 opacity-70"></i>
            </button>

            <!-- Dropdown Popover -->
            <div id="team-matches-share-dropdown"
                 class="hidden absolute right-0 top-full mt-1.5 w-60 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
                 style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
              <button type="button"
                      onclick="window.openStoryExportModal && window.openStoryExportModal('${escapedTeamName}', 'mc', 'team'); window.closeTeamMatchesShareDropdown && window.closeTeamMatchesShareDropdown();"
                      class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer text-amber-500 dark:text-amber-400">
                <i class="fa-solid fa-mobile-screen text-indigo-400"></i>
                <span>Story (9:16)</span>
              </button>
              <button type="button"
                      onclick="window.exportTeamMatchesPNG && window.exportTeamMatchesPNG('${escapedTeamName}'); window.closeTeamMatchesShareDropdown && window.closeTeamMatchesShareDropdown();"
                      class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                <i class="fa-solid fa-download text-amber-500"></i>
                <span>Scarica Scheda PNG (HD)</span>
              </button>
              <button type="button"
                      onclick="window.copyTeamMatchesToClipboard && window.copyTeamMatchesToClipboard('${escapedTeamName}'); window.closeTeamMatchesShareDropdown && window.closeTeamMatchesShareDropdown();"
                      class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                <i class="fa-solid fa-copy text-emerald-500"></i>
                <span>Copia per WhatsApp</span>
              </button>
              <button type="button"
                      onclick="window.shareTeamMatchesWhatsApp && window.shareTeamMatchesWhatsApp('${escapedTeamName}'); window.closeTeamMatchesShareDropdown && window.closeTeamMatchesShareDropdown();"
                      class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
                <i class="fa-brands fa-whatsapp text-emerald-500"></i>
                <span>Invia Link WhatsApp</span>
              </button>
            </div>
          </div>

          <button type="button" onclick="window.closeTeamMatchesModal && window.closeTeamMatchesModal()"
                  class="w-8 h-8 rounded-full flex items-center justify-center font-bold opacity-75 hover:opacity-100 transition border shadow-xs"
                  style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);"
                  title="Chiudi">
            ✕
          </button>
        </div>
      </div>

      <!-- Analytical Summary Strip (Merit & Schedule Luck) -->
      ${luck && xPts !== undefined && deltaPts !== undefined && ap ? `
        <div class="px-4 py-2 sm:px-5 sm:py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs shrink-0"
             style="border-color: var(--table-border); background-color: var(--table-surface);">
          <!-- xPTS & Delta & Luck Badge -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono font-bold text-xs" style="color: var(--text-main);">${xPts.toFixed(2)} xPTS</span>
            <span class="text-[11px] opacity-75 font-semibold" style="color: var(--text-muted);">vs ${teamMetric?.points !== undefined && teamMetric?.points !== null ? `${teamMetric.points} pt` : '- pt'}</span>
            ${renderDeltaPointsPillHTML(deltaPts, teamMetric?.points !== undefined && teamMetric?.points !== null)}
            ${luckBadge && luckLabel && luckZ !== undefined ? renderLuckBadgeHTML(luckBadge, luckLabel, luckZ, true) : ''}
          </div>
          <div class="flex items-center gap-2">
            <div class="text-[11px] font-mono opacity-80" style="color: var(--text-muted);">
              Tutti vs Tutti: <strong style="color: var(--text-main);">${ap.wins}V ${ap.draws}N ${ap.losses}P</strong> (${ap.winPct}%)
            </div>
          </div>
        </div>
      ` : ''}

      <!-- 2 TABS SWITCHER (Pill Segmented Controls) -->
      <div class="px-3 sm:px-5 py-2 border-b flex items-center gap-1.5 sm:gap-2 shrink-0 select-none bg-slate-500/5"
           style="border-color: var(--table-border);">
        <button type="button"
                id="tab-btn-calendar"
                onclick="window.switchTeamMatchesTab && window.switchTeamMatchesTab('calendar')"
                class="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-xs ${activeTab === 'calendar' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}"
                style="${activeTab !== 'calendar' ? 'color: var(--text-muted);' : ''}">
          <i class="fa-solid fa-calendar-days text-xs shrink-0"></i>
          <span>
            <span class="sm:hidden">Calendario</span>
            <span class="hidden sm:inline">Calendario Partite</span>
          </span>
        </button>

        <button type="button"
                id="tab-btn-montecarlo"
                onclick="window.switchTeamMatchesTab && window.switchTeamMatchesTab('montecarlo')"
                class="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-xs ${activeTab === 'montecarlo' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}"
                style="${activeTab !== 'montecarlo' ? 'color: var(--text-muted);' : ''}">
          <i class="fa-solid fa-chart-line text-xs shrink-0"></i>
          <span>
            <span class="sm:hidden">Scheda MC</span>
            <span class="hidden sm:inline">Scheda MC &amp; SoS</span>
          </span>
        </button>
      </div>
    </div>
  `;
}
