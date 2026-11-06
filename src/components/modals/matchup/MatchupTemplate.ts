/**
 * src/components/modals/matchup/MatchupTemplate.ts
 * Dedicated Pre-Match Tactical Matchup View Coordinator for Next Round & Fixture Clash
 */

import type { Manager, LiveSeasonDetails } from '@/types';
import { computeTacticalMatchup } from '@/analytics/tacticalMatchup';
import { renderDualRadar5AxesSVG } from '@/components/modals/h2h/HeadToHeadRadar';
import { renderPrecedentiCampionato, renderChiaveTattica } from '@/components/modals/h2h/HeadToHeadMatchupView';
import { renderMatchupContendersHTML } from './MatchupContenders';
import { renderMatchupFormWidgetHTML } from './MatchupFormWidget';
import { collectDirectRoundMatches, renderDirectMatchesCardHTML } from './MatchupDirectMatches';
import { escapeHtml } from '@/utils/dom';

// Re-export subcomponents and types for clean backwards compatibility
export { renderMatchupContendersHTML } from './MatchupContenders';
export { renderMatchupFormWidgetHTML } from './MatchupFormWidget';
export {
  collectDirectRoundMatches,
  renderDirectMatchesCardHTML,
  type DirectMatchEntry,
  type DirectMatchesSummary
} from './MatchupDirectMatches';

/**
 * Renders the dedicated Pre-Match Tactical Matchup Modal HTML
 */
export function renderMatchupModalHTML(
  managerA: Manager,
  managerB: Manager,
  allManagers: Manager[],
  liveData?: LiveSeasonDetails | null,
  isDirectDetailsExpanded: boolean = false,
  scope: 'career' | 'season' = 'career'
): string {
  const matchup = computeTacticalMatchup(managerA, managerB, allManagers, liveData, scope);
  const { profileA, profileB, tacticalKey, h2hStats } = matchup;

  const directSummary = collectDirectRoundMatches(
    managerA.id,
    managerB.id,
    managerA.name,
    managerB.name,
    liveData
  );

  // Seasons badge text dynamically
  const seasonsBadgeText = directSummary.seasonsList.length > 0
    ? directSummary.seasonsList.join(' • ')
    : (liveData?.season || 'Campionato');

  const standingA = liveData?.standings?.find(
    s => s.managerId === managerA.id || s.coach?.toLowerCase() === managerA.name?.toLowerCase()
  );
  const standingB = liveData?.standings?.find(
    s => s.managerId === managerB.id || s.coach?.toLowerCase() === managerB.name?.toLowerCase()
  );
  const isBothActive = Boolean(standingA && standingB);

  return `
    <!-- Modal Header -->
    <div class="flex items-center justify-between border-b px-4 sm:px-6 py-3 shrink-0 gap-2.5" style="border-color: var(--table-border);">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black border border-indigo-500/30">
          <i class="fa-solid fa-bolt text-sm"></i>
        </div>
        <div>
          <h2 class="font-sport font-black text-sm sm:text-lg uppercase tracking-wide leading-tight sm:leading-none flex flex-col sm:flex-row sm:items-center sm:gap-1.5" style="color: var(--text-main);">
            <span>Matchup Tattico</span>
            <span style="color: var(--accent-color);">&amp; Pre-Partita</span>
          </h2>
          <p class="text-[10px] sm:text-[11px] opacity-70 mt-0.5" style="color: var(--text-muted);">
            Scontro di stili, radar &amp; precedenti diretti
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button onclick="closeMatchupModal()"
          class="w-8 h-8 rounded-full flex items-center justify-center font-bold opacity-75 hover:opacity-100 transition border cursor-pointer"
          style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
          ✕
        </button>
      </div>
    </div>

    <!-- Scrollable Modal Body -->
    <div class="p-3 sm:p-5 overflow-y-auto flex-1 space-y-3.5 sm:space-y-4" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
      
      <!-- 1. Hero Contenders with Selectors & Archetypes -->
      ${renderMatchupContendersHTML(managerA, managerB, allManagers, profileA, profileB)}

      <!-- 1b. Stato di Forma & Trend Live -->
      ${renderMatchupFormWidgetHTML(managerA, managerB, profileA, profileB, liveData, standingA, standingB)}

      <!-- 2. Dual-Polygon 5-Axis Tactical Radar Card -->
      <div class="p-3 sm:p-4 rounded-2xl border flex flex-col items-center justify-center shadow-sm transition-colors"
           style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between w-full mb-2 px-1 flex-wrap gap-2">
          <div class="flex items-center gap-1.5">
            <i class="fa-solid fa-compass text-amber-500 text-xs"></i>
            <span class="text-xs font-bold font-sport uppercase tracking-wider" style="color: var(--text-main);">
              Radar Tattico
            </span>
            <span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style="background-color: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.3); color: #818cf8;">
              ${scope === 'season' ? `Assetto Live ${escapeHtml(liveData?.season || '2026/27')}` : 'DNA All-Time'}
            </span>
          </div>

          <!-- Scope Switch Toggle: Carriera vs Stagione Live -->
          <div class="inline-flex p-0.5 rounded-xl border text-[10px] font-bold shadow-xs"
               style="background-color: var(--input-bg); border-color: var(--table-border);">
            <button type="button"
              onclick="window.setMatchupScope && window.setMatchupScope('career')"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer ${scope === 'career' ? 'shadow-xs font-black' : 'opacity-60 hover:opacity-100'}"
              style="${scope === 'career' ? 'background-color: var(--modal-bg); color: var(--text-main);' : 'color: var(--text-muted);'}">
              🏛️ Carriera
            </button>
            <button type="button"
              onclick="window.setMatchupScope && window.setMatchupScope('season')"
              ${!isBothActive ? 'disabled title="Dati stagionali non disponibili per entrambi i manager"' : ''}
              class="px-2.5 py-1 rounded-lg transition-all ${scope === 'season' ? 'shadow-xs font-black' : 'opacity-60 hover:opacity-100'} ${!isBothActive ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}"
              style="${scope === 'season' ? 'background-color: var(--modal-bg); color: var(--accent-color, #f59e0b);' : 'color: var(--text-muted);'}">
              ⚡ Stagione ${escapeHtml(liveData?.season ? liveData.season.replace(/^20/, '') : '26/27')}
            </button>
          </div>
        </div>

        ${renderDualRadar5AxesSVG(profileA, profileB, managerA.name, managerB.name)}
      </div>

      <!-- 3. Scontri Diretti in Partita (Round-by-Round) -->
      ${renderDirectMatchesCardHTML(managerA, managerB, directSummary, seasonsBadgeText, isDirectDetailsExpanded)}

      <!-- 4. Precedenti in Campionato (Scoreboard all-time) -->
      ${renderPrecedentiCampionato(h2hStats, managerA.name, managerB.name)}

      <!-- 5. Chiave Tattica del Duello -->
      ${renderChiaveTattica(tacticalKey)}

    </div>

    <!-- Modal Footer Actions (Pinned at bottom) -->
    <div class="flex items-center justify-between border-t px-4 sm:px-6 py-3 shrink-0 gap-2" style="border-color: var(--table-border);">
      <div class="flex items-center gap-2">
        <!-- H2H Button -->
        <button type="button"
          onclick="window.closeMatchupModal && window.closeMatchupModal(); window.openHeadToHeadModal && window.openHeadToHeadModal('${managerA.id}', '${managerB.id}');"
          class="px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm flex items-center gap-1.5 bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 active:scale-95 cursor-pointer"
          title="Apri lo storico Head-to-Head completo con tabellino annate e bacheca trofei">
          <i class="fa-solid fa-book-open text-indigo-400"></i>
          <span class="hidden sm:inline">Storico H2H</span>
          <span class="sm:hidden">H2H</span>
        </button>

        <!-- Dropdown Popover Menu: Scarica / Condividi (opens upward) -->
        <div class="relative">
          <button id="btn-matchup-share-dropdown" onclick="window.toggleMatchupShareDropdown && window.toggleMatchupShareDropdown(event);"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm flex items-center gap-1.5 opacity-90 hover:opacity-100 cursor-pointer active:scale-95"
            style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
            <i class="fa-solid fa-share-nodes text-xs"></i>
            <span class="hidden sm:inline">Scarica / Condividi</span>
            <span class="sm:hidden">Condividi</span>
            <i class="fa-solid fa-chevron-up text-[10px] ml-0.5"></i>
          </button>

          <div id="matchup-share-dropdown-menu"
            class="hidden absolute bottom-full left-0 mb-2 w-56 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
            style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
            <button onclick="window.exportMatchupCardHD && window.exportMatchupCardHD();"
              class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
              <i class="fa-solid fa-download text-amber-500"></i>
              <span>Scarica PNG Scheda</span>
            </button>
            <button onclick="window.exportMatchupStoryHD && window.exportMatchupStoryHD();"
              class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
              <i class="fa-solid fa-mobile-screen text-indigo-400"></i>
              <span>Story (9:16)</span>
            </button>
            <button onclick="window.copyMatchupBanter && window.copyMatchupBanter();"
              class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer">
              <i class="fa-brands fa-whatsapp text-emerald-500"></i>
              <span>Copia Banter WhatsApp</span>
            </button>
            <button onclick="window.shareMatchupWhatsApp && window.shareMatchupWhatsApp();"
              class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition border-t mt-1 pt-2 cursor-pointer"
              style="border-color: var(--table-border);">
              <i class="fa-solid fa-link text-indigo-400"></i>
              <span>Invia Link WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Chiudi Button -->
      <button onclick="window.closeMatchupModal && window.closeMatchupModal();"
        class="px-4 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer hover:opacity-100 opacity-90"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        Chiudi
      </button>
    </div>
  `;
}
