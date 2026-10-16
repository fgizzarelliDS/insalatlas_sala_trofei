import type { Manager, HeadToHeadStats } from '@/types';
import { renderHeadToHeadHero } from './HeadToHeadHero';
import { renderHeadToHeadScoreboard } from './HeadToHeadScoreboard';
import { renderHeadToHeadPalmares } from './HeadToHeadPalmares';
import { renderHeadToHeadMetrics } from './HeadToHeadMetrics';
import { renderNemesisMatrixView } from './NemesisMatrixView';
import { renderMultiManagerView } from './MultiManagerView';

export type H2HTabMode = 'duel' | 'multi' | 'matrix';

/**
 * Renders the complete Head-to-Head Modal HTML shell
 * Supports three sub-modes:
 * 1. 'duel': Side-by-side 1vs1 breakdown (Hero, Scoreboard, Palmares, Metrics)
 * 2. 'multi': "Tavolo dei Rivali" (3+ managers multi-radar, mini-torneo, parallel career)
 * 3. 'matrix': Full N x N Nemesis Cross-Table Matrix
 */
export function renderHeadToHeadModalHTML(
  stats: HeadToHeadStats,
  allManagers: Manager[],
  isChronologyExpanded: boolean,
  visualMode: 'radar' | 'bars' = 'radar',
  activeTab: H2HTabMode = 'duel',
  nemesisFilter: 'active' | 'veterans' | 'all' = 'active',
  profileReturnName?: string | null,
  multiManagers: Manager[] = [],
  hiddenMultiManagerIds: Set<string> = new Set(),
  multiTournamentMode: 'ppg' | 'simultaneous' = 'simultaneous'
): string {
  const { managerA, managerB, palmares } = stats;

  return `
    <!-- Modal Header with Sub-tab Switcher -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b px-4 sm:px-6 py-3 shrink-0 gap-2.5" style="border-color: var(--table-border);">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black border border-amber-500/30">
          <i class="fa-solid fa-code-compare text-sm"></i>
        </div>
        <div>
          <h2 class="font-sport font-black text-base sm:text-lg uppercase tracking-wide leading-none" style="color: var(--text-main);">
            Head-to-Head <span style="color: var(--accent-color);">&amp; Nemesi</span>
          </h2>
          <p class="text-[10px] sm:text-[11px] opacity-70 mt-0.5" style="color: var(--text-muted);">
            Duelli diretti, storico scontri e matrice incrociata
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 self-end sm:self-auto">
        <!-- Sub-tab Switcher: Duello 1vs1 vs Tavolo Rivali vs Matrice Nemesi -->
        <div class="flex items-center p-0.5 rounded-xl border text-xs font-bold shadow-sm"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <button type="button" onclick="window.setH2HTab('duel')"
            class="px-2.5 sm:px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeTab === 'duel' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
            style="${activeTab === 'duel' ? 'color: #020617;' : 'color: var(--text-main);'}">
            <i class="fa-solid fa-user-ninja text-[11px]"></i>
            <span>Duello 1 vs 1</span>
          </button>
          <button type="button" onclick="window.setH2HTab('multi')"
            class="px-2.5 sm:px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeTab === 'multi' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
            style="${activeTab === 'multi' ? 'color: #020617;' : 'color: var(--text-main);'}">
            <i class="fa-solid fa-circle-nodes text-[11px]"></i>
            <span>Tavolo Rivali</span>
          </button>
          <button type="button" onclick="window.setH2HTab('matrix')"
            class="px-2.5 sm:px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeTab === 'matrix' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
            style="${activeTab === 'matrix' ? 'color: #020617;' : 'color: var(--text-main);'}">
            <i class="fa-solid fa-table-cells text-[11px]"></i>
            <span>Matrice Nemesi</span>
          </button>
        </div>

        <button onclick="closeHeadToHeadModal()"
          class="w-8 h-8 rounded-full flex items-center justify-center font-bold opacity-75 hover:opacity-100 transition border"
          style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
          ✕
        </button>
      </div>
    </div>

    ${profileReturnName ? `
      <!-- Profile Return Banner (contextual when opened from a manager profile) -->
      <div id="h2h-profile-return-banner" class="mx-3 sm:mx-6 mt-3 px-3 py-2 rounded-xl border flex items-center justify-between text-xs font-bold transition shadow-sm shrink-0"
        style="background-color: var(--table-surface); border-color: rgba(245, 158, 11, 0.4); color: var(--text-main);">
        <button type="button" onclick="window.returnToPreviousProfile && window.returnToPreviousProfile()"
          class="flex items-center gap-2 transition hover:opacity-80 cursor-pointer"
          style="color: var(--accent-color);">
          <i class="fa-solid fa-arrow-left text-[11px]"></i>
          <span>Torna alla Scheda Profilo di <span class="underline font-black">${profileReturnName}</span></span>
        </button>
        <span class="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10">
          👤 Profilo Attivo
        </span>
      </div>
    ` : ''}

    <!-- Scrollable Modal Body -->
    <div class="p-3 sm:p-5 overflow-y-auto flex-1 space-y-4" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
      ${activeTab === 'duel'
      ? `
            <!-- 1. Hero Selectors & Face-off Cards -->
            ${renderHeadToHeadHero(stats, allManagers)}

            <!-- 2. Scoreboard Scontri Diretti in Campionato -->
            ${renderHeadToHeadScoreboard(stats, managerA, managerB, isChronologyExpanded)}

            <!-- 3. Palmarès a Specchio -->
            ${renderHeadToHeadPalmares(palmares, managerA, managerB)}

            <!-- 4. Indicatori di Performance & Grafico Dual-Mode -->
            ${renderHeadToHeadMetrics(stats, managerA, managerB, visualMode)}
          `
      : activeTab === 'multi'
        ? `
            <!-- 3+ Managers "Tavolo dei Rivali" Multi-Radar & Mini-Tournament -->
            ${renderMultiManagerView(multiManagers, allManagers, hiddenMultiManagerIds, multiTournamentMode)}
          `
        : `
            <!-- Full N x N Nemesis Cross-Table Matrix View -->
            ${renderNemesisMatrixView(allManagers, nemesisFilter)}
          `
    }
    </div>

    <!-- Modal Footer Actions -->
    <div class="flex items-center justify-between border-t px-4 sm:px-6 py-3 shrink-0 gap-2" style="border-color: var(--table-border);">
      <div class="flex items-center gap-2">
        ${activeTab === 'duel'
      ? `
              <!-- Dropdown Popover Menu for H2H Duel (opens upward) -->
              <div class="relative">
                <button id="btn-h2h-share-dropdown" onclick="toggleH2HShareDropdown(event)"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm flex items-center gap-1.5 opacity-90 hover:opacity-100"
                  style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
                  <i class="fa-solid fa-share-nodes text-xs"></i>
                  <span>Scarica / Condividi</span>
                  <i class="fa-solid fa-chevron-up text-[10px] ml-0.5"></i>
                </button>

                <div id="h2h-share-dropdown-menu"
                  class="hidden absolute bottom-full left-0 mb-2 w-56 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
                  style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
                  <button onclick="exportCurrentH2HDuelHD(); closeH2HShareDropdown();"
                    class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition">
                    <i class="fa-solid fa-download text-amber-500"></i>
                    <span>Scarica PNG Scheda</span>
                  </button>
                  <button onclick="window.exportCurrentH2HDuelStoryHD && window.exportCurrentH2HDuelStoryHD(); closeH2HShareDropdown();"
                    class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition">
                    <i class="fa-solid fa-mobile-screen text-indigo-400"></i>
                    <span>Story (9:16)</span>
                  </button>
                  <button onclick="copyCurrentH2HDuelToClipboard(); closeH2HShareDropdown();"
                    class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition">
                    <i class="fa-solid fa-copy text-emerald-500"></i>
                    <span>Copia per WhatsApp</span>
                  </button>
                  <button onclick="shareH2HWhatsApp(); closeH2HShareDropdown();"
                    class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition border-t mt-1 pt-2"
                    style="border-color: var(--table-border);">
                    <i class="fa-brands fa-whatsapp text-emerald-500"></i>
                    <span>Invia Link WhatsApp</span>
                  </button>
                </div>
              </div>
            `
      : activeTab === 'multi'
        ? `
              <!-- Dropdown Popover Menu for Tavolo Rivali Multi-Manager -->
              <div class="relative">
                <button id="btn-h2h-share-dropdown" onclick="toggleH2HShareDropdown(event)"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm flex items-center gap-1.5 opacity-90 hover:opacity-100"
                  style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
                  <i class="fa-solid fa-share-nodes text-xs"></i>
                  <span>Scarica / Condividi</span>
                  <i class="fa-solid fa-chevron-up text-[10px] ml-0.5"></i>
                </button>

                <div id="h2h-share-dropdown-menu"
                  class="hidden absolute bottom-full left-0 mb-2 w-56 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
                  style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
                  <button onclick="window.exportCurrentMultiManagerHD && window.exportCurrentMultiManagerHD(); closeH2HShareDropdown();"
                    class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition">
                    <i class="fa-solid fa-download text-amber-500"></i>
                    <span>Scarica PNG Scheda</span>
                  </button>
                  <button onclick="window.exportMultiManagerStoryHD && window.exportMultiManagerStoryHD(); closeH2HShareDropdown();"
                    class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition">
                    <i class="fa-solid fa-mobile-screen text-indigo-400"></i>
                    <span>Story (9:16)</span>
                  </button>
                  <button onclick="window.copyCurrentMultiManagerToClipboard && window.copyCurrentMultiManagerToClipboard(); closeH2HShareDropdown();"
                    class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition">
                    <i class="fa-solid fa-copy text-emerald-500"></i>
                    <span>Copia per WhatsApp</span>
                  </button>
                  <button onclick="window.shareMultiManagerWhatsApp && window.shareMultiManagerWhatsApp(); closeH2HShareDropdown();"
                    class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition border-t mt-1 pt-2"
                    style="border-color: var(--table-border);">
                    <i class="fa-brands fa-whatsapp text-emerald-500"></i>
                    <span>Invia Link WhatsApp</span>
                  </button>
                </div>
              </div>
            `
        : ''
    }
      </div>

      <button onclick="closeHeadToHeadModal()"
        class="px-4 py-1.5 rounded-xl text-xs font-bold transition border"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        Chiudi
      </button>
    </div>
  `;
}
