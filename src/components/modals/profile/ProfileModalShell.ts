/**
 * Template shell for the Manager Profile modal (#manager-profile-modal)
 */
export function getProfileModalShellHTML(): string {
  return `
  <!-- MODAL: SCHEDA PROFILO ALLENATORE (SOLA LETTURA) -->
  <div id="manager-profile-modal"
    class="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] hidden items-center justify-center p-3 sm:p-4 overflow-x-hidden">
    <div id="manager-profile-card"
      class="border w-full max-w-xl min-w-0 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto overflow-x-hidden transition-colors"
      style="background-color: var(--modal-bg); border-color: var(--modal-border); color: var(--modal-text); scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">

      <!-- H2H Return Banner (contextual when opened from an active duel) -->
      <div id="profile-h2h-return-banner" class="hidden mb-3 px-3 py-2 rounded-xl border flex items-center justify-between text-xs font-bold transition shadow-sm"
        style="background-color: var(--table-surface); border-color: rgba(245, 158, 11, 0.4); color: var(--text-main);">
        <button type="button" onclick="window.returnToPreviousH2HDuel()"
          class="flex items-center gap-2 transition hover:opacity-80 cursor-pointer"
          style="color: var(--accent-color);">
          <i class="fa-solid fa-arrow-left text-[11px]"></i>
          <span>Torna al Duello H2H vs <span id="profile-h2h-opponent-name" class="underline font-black">-</span></span>
        </button>
        <span class="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10">
          ⚔️ Duello Attivo
        </span>
      </div>

      <!-- Header Profilo -->
      <div class="flex items-center justify-between border-b pb-4 mb-4 sm:mb-5 min-w-0 gap-2"
        style="border-color: var(--table-border);">
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-sport font-black text-lg sm:text-xl border border-amber-500/30 shrink-0">
            <i class="fa-solid fa-user-tie"></i>
          </div>
          <div class="flex flex-col justify-center min-w-0 flex-1">
            <h3 id="profile-name"
              class="font-sport font-extrabold text-xl sm:text-2xl uppercase tracking-wide leading-tight mb-1 truncate"
              style="color: var(--text-main);">
              -
            </h3>
            <div>
              <span id="profile-years-badge"
                class="inline-block text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 truncate self-start">
                0 Anni di Partecipazione
              </span>
            </div>
          </div>
        </div>
        <button id="profile-modal-close-btn" onclick="closeProfileModal()"
          class="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full flex items-center justify-center font-bold opacity-75 hover:opacity-100 transition border"
          style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
          ✕
        </button>
      </div>

      <!-- Profile Modal Tabs -->
      <div id="profile-modal-tabs" class="flex items-center gap-1.5 sm:gap-2 border-b pb-2 mb-4 w-full min-w-0"
        style="border-color: var(--table-border);">
        <button id="profile-tab-btn-palmares" type="button" onclick="switchProfileModalTab('palmares')"
          class="min-w-0 flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 border border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-sm">
          <i class="fa-solid fa-trophy text-[11px] sm:text-xs shrink-0"></i>
          <span class="truncate"><span class="hidden sm:inline">Bacheca &amp; </span>Palmarès</span>
        </button>
        <button id="profile-tab-btn-career" type="button" onclick="switchProfileModalTab('career')"
          class="min-w-0 flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 border border-transparent opacity-60 hover:opacity-100"
          style="color: var(--text-main);">
          <i class="fa-solid fa-clock-rotate-left text-[11px] sm:text-xs shrink-0"></i>
          <span class="truncate"><span class="hidden sm:inline">Cronologia &amp; </span>Piazzamenti</span>
        </button>
      </div>

      <!-- TAB 1: Bacheca & Palmarès -->
      <div id="profile-tab-palmares-content" class="min-w-0">
        <!-- Quick Metrics Grid -->
        <div class="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5 text-center min-w-0">
          <div class="p-2 sm:p-3 rounded-xl sm:rounded-2xl border min-w-0 overflow-hidden"
            style="background-color: var(--table-surface); border-color: var(--table-border);">
            <div id="profile-score"
              class="font-sport font-extrabold text-xl sm:text-2xl text-amber-400 leading-none truncate">0</div>
            <div
              class="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight sm:tracking-wider mt-1 opacity-70 leading-tight truncate sm:whitespace-normal">
              Rating Storico</div>
          </div>
          <div class="p-2 sm:p-3 rounded-xl sm:rounded-2xl border min-w-0 overflow-hidden"
            style="background-color: var(--table-surface); border-color: var(--table-border);">
            <div id="profile-success-rate"
              class="font-sport font-extrabold text-xl sm:text-2xl text-emerald-400 leading-none truncate">0%
            </div>
            <div
              class="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight sm:tracking-wider mt-1 opacity-70 leading-tight truncate sm:whitespace-normal">
              Tasso di Successo</div>
          </div>
          <div class="p-2 sm:p-3 rounded-xl sm:rounded-2xl border min-w-0 overflow-hidden"
            style="background-color: var(--table-surface); border-color: var(--table-border);">
            <div id="profile-total-titles" class="font-sport font-extrabold text-xl sm:text-2xl leading-none truncate"
              style="color: var(--text-main);">0</div>
            <div
              class="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight sm:tracking-wider mt-1 opacity-70 leading-tight truncate sm:whitespace-normal">
              Trofei Maggiori</div>
          </div>
        </div>

        <!-- Badge Onorari Assegnati -->
        <div class="mb-5">
          <div class="text-xs font-bold uppercase tracking-wider mb-2 opacity-75 flex items-center gap-1.5">
            <i class="fa-solid fa-medal text-amber-400"></i> Riconoscimenti di Lega
          </div>
          <div id="profile-badges-container" class="flex flex-wrap gap-1.5"></div>
        </div>

        <!-- Rivalità Storiche Head-to-Head -->
        <div id="profile-rivalries-section" class="mb-5">
          <div class="text-xs font-bold uppercase tracking-wider mb-2 opacity-75 flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <i class="fa-solid fa-handshake-angle text-amber-400"></i> Rivalità Storiche Head-to-Head
            </span>
            <span class="text-[10px] opacity-60 font-semibold">Duelli Diretti (≥ 2 st.)</span>
          </div>
          <div id="profile-rivalries-container" class="grid grid-cols-1 sm:grid-cols-2 gap-2"></div>
        </div>

        <!-- Bacheca Trofei del Mister -->
        <div class="p-4 rounded-2xl border mb-5"
          style="background-color: var(--table-surface); border-color: var(--table-border);">
          <div class="text-xs font-bold uppercase tracking-wider mb-3 opacity-80 flex items-center justify-between">
            <span><i class="fa-solid fa-trophy text-amber-400 mr-1.5"></i> Bacheca Completa</span>
            <span class="text-[10px] opacity-60">Albo d'Oro</span>
          </div>
          <div id="profile-trophy-shelf" class="space-y-3"></div>
        </div>
      </div>

      <!-- TAB 2: Cronologia & Piazzamenti -->
      <div id="profile-tab-career-content" class="hidden">
        <!-- Denominazioni Storiche Squadra -->
        <div id="profile-historical-teams-card" class="p-4 rounded-2xl border mb-5 hidden"
          style="background-color: var(--table-surface); border-color: var(--table-border);">
          <div class="text-xs font-bold uppercase tracking-wider mb-2.5 opacity-80 flex items-center justify-between">
            <span><i class="fa-solid fa-shield text-amber-400 mr-1.5"></i> Squadre</span>
            <span id="profile-historical-teams-count" class="text-[10px] opacity-60 font-semibold"></span>
          </div>
          <div id="profile-historical-teams-list" class="flex flex-wrap gap-1.5"></div>
        </div>

        <!-- Piazzamenti (Serie InsalAtlas) -->
        <div id="profile-trajectory-card" class="p-4 rounded-2xl border mb-5 hidden"
          style="background-color: var(--table-surface); border-color: var(--table-border);">
          <div class="text-xs font-bold uppercase tracking-wider mb-2 opacity-80 flex items-center justify-between">
            <span><i class="fa-solid fa-chart-line text-amber-400 mr-1.5"></i> Piazzamenti</span>
            <span class="text-[10px] opacity-60">Serie A InsalAtlas</span>
          </div>
          <div id="profile-trajectory-sparkline" class="w-full overflow-x-auto py-1"></div>
        </div>

        <!-- Cronologia & Palmarès Annuale -->
        <div id="profile-career-timeline-card" class="p-4 rounded-2xl border mb-5 hidden"
          style="background-color: var(--table-surface); border-color: var(--table-border);">
          <div class="text-xs font-bold uppercase tracking-wider mb-3 opacity-80 flex items-center justify-between">
            <span><i class="fa-solid fa-clock-rotate-left text-amber-400 mr-1.5"></i> Cronologia &amp; Palmarès</span>
            <span class="text-[10px] opacity-60">Stagione per Stagione</span>
          </div>
          <div id="profile-career-timeline" class="space-y-3"></div>
        </div>
      </div>

      <!-- Footer Buttons: Compact Share Dropdown & Chiudi Scheda -->
      <div id="profile-modal-footer-actions" class="flex items-center justify-between pt-3 border-t relative"
        style="border-color: var(--table-border);">
        <div class="relative">
          <button id="btn-share-dropdown" onclick="toggleShareDropdown(event)"
            class="px-4 py-2 rounded-xl text-xs font-bold border transition shadow-sm flex items-center gap-1.5 opacity-90 hover:opacity-100"
            style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
            <i class="fa-solid fa-share-nodes text-xs"></i>
            <span>Scarica / Condividi</span>
            <i class="fa-solid fa-chevron-up text-[10px] ml-0.5"></i>
          </button>

          <!-- Dropdown Popover Menu (opens upward) -->
          <div id="share-dropdown-menu"
            class="hidden absolute bottom-full left-0 mb-2 w-56 rounded-2xl border shadow-2xl p-1.5 z-50 text-xs backdrop-blur-md"
            style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--modal-text);">
            <button onclick="exportCurrentProfileModalHD(); closeShareDropdown();"
              class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition">
              <i class="fa-solid fa-download text-amber-500"></i>
              <span>Scarica PNG Scheda</span>
            </button>
            <button onclick="window.exportCurrentProfileStoryHD && window.exportCurrentProfileStoryHD(); closeShareDropdown();"
              class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition">
              <i class="fa-solid fa-mobile-screen text-indigo-400"></i>
              <span>Story (9:16)</span>
            </button>
            <button onclick="copyCurrentProfileModalToClipboard(); closeShareDropdown();"
              class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition">
              <i class="fa-solid fa-copy text-emerald-500"></i>
              <span>Copia per WhatsApp</span>
            </button>
            <button onclick="shareCurrentManagerWhatsApp(); closeShareDropdown();"
              class="w-full px-3 py-2 rounded-xl text-left font-bold flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 transition border-t mt-1 pt-2"
              style="border-color: var(--table-border);">
              <i class="fa-brands fa-whatsapp text-emerald-500"></i>
              <span>Invia Link WhatsApp</span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button id="btn-profile-h2h" onclick="openH2HFromProfile()"
            class="px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-sm flex items-center gap-1.5 border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20"
            title="Confronta questo manager in un duello testa a testa">
            <i class="fa-solid fa-code-compare text-xs"></i>
            <span>Confronta</span>
          </button>

          <button onclick="closeProfileModal()" class="px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
            style="background-color: var(--btn-bg); border: 1px solid var(--btn-border); color: var(--btn-text);">
            Chiudi Scheda
          </button>
        </div>
      </div>

    </div>
  </div>
  `;
}
