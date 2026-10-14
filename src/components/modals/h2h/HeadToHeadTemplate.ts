import type { Manager, HeadToHeadStats } from '@/types';
import { renderHeadToHeadHero } from './HeadToHeadHero';
import { renderHeadToHeadScoreboard } from './HeadToHeadScoreboard';
import { renderHeadToHeadPalmares } from './HeadToHeadPalmares';
import { renderHeadToHeadMetrics } from './HeadToHeadMetrics';
import { renderNemesisMatrixView } from './NemesisMatrixView';

export type H2HTabMode = 'duel' | 'matrix';

/**
 * Renders the complete Head-to-Head Modal HTML shell
 * Supports two sub-modes:
 * 1. 'duel': Side-by-side 1vs1 breakdown (Hero, Scoreboard, Palmares, Metrics)
 * 2. 'matrix': Full N x N Nemesis Cross-Table Matrix
 */
export function renderHeadToHeadModalHTML(
  stats: HeadToHeadStats,
  allManagers: Manager[],
  isChronologyExpanded: boolean,
  visualMode: 'radar' | 'bars' = 'radar',
  activeTab: H2HTabMode = 'duel',
  nemesisFilter: 'active' | 'veterans' | 'all' = 'active'
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
        <!-- Sub-tab Switcher: Duello 1vs1 vs Matrice Globale -->
        <div class="flex items-center p-0.5 rounded-xl border text-xs font-bold shadow-sm"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <button type="button" onclick="window.setH2HTab('duel')"
            class="px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeTab === 'duel' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
            style="${activeTab === 'duel' ? 'color: #020617;' : 'color: var(--text-main);'}">
            <i class="fa-solid fa-user-ninja text-[11px]"></i>
            <span>Duello 1 vs 1</span>
          </button>
          <button type="button" onclick="window.setH2HTab('matrix')"
            class="px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeTab === 'matrix' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
            style="${activeTab === 'matrix' ? 'color: #020617;' : 'color: var(--text-main);'}">
            <i class="fa-solid fa-table-cells text-[11px]"></i>
            <span>Matrice Globale</span>
          </button>
        </div>

        <button onclick="closeHeadToHeadModal()"
          class="w-8 h-8 rounded-full flex items-center justify-center font-bold opacity-75 hover:opacity-100 transition border"
          style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
          ✕
        </button>
      </div>
    </div>

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
                  class="hidden absolute bottom-full left-0 mb-2 w-52 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
                  style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
                  <button onclick="exportCurrentH2HDuelHD(); closeH2HShareDropdown();"
                    class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition">
                    <i class="fa-solid fa-download text-amber-500"></i>
                    <span>Scarica PNG</span>
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
