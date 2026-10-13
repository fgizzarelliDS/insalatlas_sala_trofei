/**
 * Template shell for the Season Creation modal (#season-modal)
 */
export function getSeasonModalShellHTML(): string {
  return `
  <!-- Modal: Nuova Stagione & Importazione Fantacalcio -->
  <div id="season-modal"
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden items-center justify-center p-2 sm:p-4">
    <div
      class="border w-full max-w-3xl lg:max-w-4xl rounded-3xl shadow-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto transition-colors flex flex-col"
      style="background-color: var(--modal-bg); border-color: var(--modal-border); color: var(--modal-text);">

      <div class="flex items-center justify-between border-b pb-3 mb-4 shrink-0"
        style="border-color: var(--table-border);">
        <div class="flex items-center gap-2.5">
          <div
            class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <i class="fa-solid fa-calendar-plus text-base"></i>
          </div>
          <div>
            <h3 class="font-sport font-bold text-lg sm:text-xl text-amber-400 uppercase tracking-wide">
              Nuova Stagione &amp; Importazione Classifica
            </h3>
            <p class="text-[11px] opacity-75">Configura una nuova stagione o importa i dati direttamente da Fantacalcio
            </p>
          </div>
        </div>
        <button onclick="closeSeasonModal()"
          class="w-8 h-8 rounded-full flex items-center justify-center font-bold opacity-75 hover:opacity-100 transition border"
          style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
          ✕
        </button>
      </div>

      <div id="season-modal-content" class="overflow-y-auto"></div>
    </div>
  </div>
  `;
}
