/**
 * Template shell for the Add/Edit Manager modal (#manager-modal)
 */
export function getManagerModalShellHTML(): string {
  return `
  <!-- MODAL: ADD / EDIT MANAGER -->
  <div id="manager-modal"
    class="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] hidden flex items-center justify-center p-4">
    <div class="border w-full max-w-xl rounded-3xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto transition-colors"
      style="background-color: var(--modal-bg); border-color: var(--modal-border); color: var(--modal-text);">

      <div class="flex items-center justify-between border-b pb-3 mb-4" style="border-color: var(--table-border);">
        <div>
          <h3 id="modal-title" class="font-sport font-bold text-xl text-amber-400 uppercase tracking-wide">
            Modifica Allenatore
          </h3>
          <p class="text-xs opacity-75">Aggiorna presenze, titoli, Mundialito o assegna il Banner Cartonato</p>
        </div>
        <button onclick="closeManagerModal()"
          class="w-8 h-8 rounded-full flex items-center justify-center font-bold opacity-75 hover:opacity-100 transition border"
          style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
          ✕
        </button>
      </div>

      <form id="manager-form" onsubmit="saveManager(event)" class="space-y-4 text-xs">
        <input type="hidden" id="field-id">

        <!-- Name & Years -->
        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2">
            <label class="block font-bold mb-1 opacity-90">Nome Squadra / Fantallenatore</label>
            <input type="text" id="field-name" required placeholder="es. Gigi&amp;Dr.Cholo"
              class="w-full px-3 py-2 rounded-xl font-semibold border focus:outline-none focus:border-amber-500"
              style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
          </div>
          <div>
            <label class="block font-bold mb-1 opacity-90">Anni (Presenze)</label>
            <input type="number" id="field-years" min="1" max="50" required
              class="w-full px-3 py-2 rounded-xl font-semibold border focus:outline-none focus:border-amber-500"
              style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
          </div>
        </div>

        <!-- Campionato (Podi) -->
        <div class="p-3.5 rounded-2xl border"
          style="background-color: var(--table-surface); border-color: var(--table-border);">
          <div class="font-sport font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-trophy"></i> Campionato (Podi)
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="text-amber-400 block mb-1 font-semibold">🥇 1° Posto</label>
              <input type="number" id="field-gold" min="0" value="0"
                class="w-full p-2 border rounded-lg text-center font-bold text-sm"
                style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            </div>
            <div>
              <label class="block mb-1 font-semibold opacity-90">🥈 2° Posto</label>
              <input type="number" id="field-silver" min="0" value="0"
                class="w-full p-2 border rounded-lg text-center font-bold text-sm"
                style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            </div>
            <div>
              <label class="text-amber-600 block mb-1 font-semibold">🥉 3° Posto</label>
              <input type="number" id="field-bronze" min="0" value="0"
                class="w-full p-2 border rounded-lg text-center font-bold text-sm"
                style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            </div>
          </div>
        </div>

        <!-- Coppe, Cucchiai & Mundialito -->
        <div class="p-3.5 rounded-2xl border"
          style="background-color: var(--table-surface); border-color: var(--table-border);">
          <div class="font-sport font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
            style="color: var(--text-main);">
            <i class="fa-solid fa-award text-amber-400"></i> Coppe di Lega, Cucchiai, Supercoppe &amp; Mundialito
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="text-amber-500 block mb-1 font-semibold text-xs sm:text-sm">🥄 Cucchiaio</label>
              <input type="number" id="field-spoon" min="0" value="0"
                class="w-full p-2 border rounded-lg text-center font-bold text-sm"
                style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            </div>
            <div>
              <label class="text-amber-400 block mb-1 font-semibold text-xs sm:text-sm">🏆 Coppa 1°</label>
              <input type="number" id="field-cup-gold" min="0" value="0"
                class="w-full p-2 border rounded-lg text-center font-bold text-sm"
                style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            </div>
            <div>
              <label class="block mb-1 font-semibold opacity-90 text-xs sm:text-sm">🥈 Coppa 2°</label>
              <input type="number" id="field-cup-silver" min="0" value="0"
                class="w-full p-2 border rounded-lg text-center font-bold text-sm"
                style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            </div>
            <div>
              <label class="text-yellow-400 block mb-1 font-semibold text-xs sm:text-sm">⭐ Supercoppa</label>
              <input type="number" id="field-supercup" min="0" value="0"
                class="w-full p-2 border rounded-lg text-center font-bold text-sm"
                style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            </div>
            <div>
              <label class="block mb-1 font-semibold opacity-90 text-xs sm:text-sm">🥈 Superc. 2°</label>
              <input type="number" id="field-supercup-silver" min="0" value="0"
                class="w-full p-2 border rounded-lg text-center font-bold text-sm"
                style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            </div>
            <div>
              <label class="text-cyan-400 block mb-1 font-semibold text-xs sm:text-sm">🌍 Mundialito</label>
              <input type="number" id="field-mundialito" min="0" value="0"
                class="w-full p-2 border rounded-lg text-center font-bold text-sm"
                style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            </div>
          </div>
        </div>

        <!-- Sezione Banner Cartonato (Playout) -->
        <div class="p-3.5 rounded-2xl border"
          style="background-color: rgba(30, 58, 138, 0.15); border-color: rgba(59, 130, 246, 0.4);">
          <div
            class="font-sport font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <i class="fa-solid fa-rectangle-ad"></i> Banner Cartonato (Playout)
            </span>
            <span class="text-[10px] opacity-75 font-normal">Sconfitto ai Playout (Solo Banner)</span>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label class="text-blue-300 block mb-1 font-semibold">Numero Cartonati</label>
              <input type="number" id="field-cartonato" min="0" value="0"
                class="w-full p-2 border rounded-lg text-center font-bold text-sm"
                style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            </div>
            <div>
              <label class="text-blue-300 block mb-1 font-semibold">Banner Mister Assegnati</label>
              <input type="text" id="field-cartonato-badges" placeholder="es. ???, MAZZARRI oppure JURIC"
                class="w-full p-2 border rounded-lg font-semibold uppercase text-xs"
                style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
              <p class="text-[10px] opacity-75 mt-1">Separa con virgola (es. JURIC, ???, MAZZARRI, VENTURA)</p>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-between pt-3 border-t" style="border-color: var(--table-border);">
          <button type="button" id="btn-delete-manager" onclick="deleteCurrentManager()"
            class="px-3 py-2 rounded-xl bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-600/40 font-bold transition hidden">
            <i class="fa-solid fa-trash-can mr-1"></i> Elimina
          </button>

          <div class="flex items-center gap-2 ml-auto">
            <button type="button" onclick="closeManagerModal()" class="px-4 py-2 rounded-xl border font-bold transition"
              style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
              Annulla
            </button>
            <button type="submit"
              class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wide shadow-lg transition">
              Salva Modifiche
            </button>
          </div>
        </div>

      </form>
    </div>
  </div>
  `;
}
