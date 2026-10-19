import type { ParsedFantacalcioData, ParsedChampionshipRow } from '@/utils/fantacalcioParser';
import { getSuggestedNextSeason } from '@/utils/fantacalcioParser';
import { state } from '@/state';
import { LEAGUE } from '@/config';

/**
 * Builds HTML option tags for manager dropdowns
 */
export function buildManagerSelectOptions(
  selectedId?: string,
  placeholder = '-- Seleziona Mister --'
): string {
  const managers = [...(state.managers || [])].sort((a, b) => a.name.localeCompare(b.name));
  let options = `<option value="">${placeholder}</option>`;
  managers.forEach(m => {
    const isSelected = m.id === selectedId ? 'selected' : '';
    options += `<option value="${m.id}" ${isSelected}>${m.name}</option>`;
  });
  return options;
}

/**
 * Generates championship ranking rows HTML
 */
export function renderChampionshipRowsHTML(
  teamCount: number,
  initialRows?: ParsedChampionshipRow[]
): string {
  let rowsHtml = '';
  for (let i = 1; i <= teamCount; i++) {
    const row = initialRows && initialRows[i - 1] ? initialRows[i - 1] : undefined;

    let rankBadge = `#${i}`;
    let rankBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

    if (i === 1) {
      rankBadge = '🥇 1°';
      rankBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/40 font-black';
    } else if (i === 2) {
      rankBadge = '🥈 2°';
      rankBadgeClass = 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600 font-bold';
    } else if (i === 3) {
      rankBadge = '🥉 3°';
      rankBadgeClass = 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-700/25 dark:text-amber-400 dark:border-amber-700/40 font-bold';
    } else if (i === teamCount && teamCount >= 8) {
      rankBadge = `🥄 ${i}°`;
      rankBadgeClass = 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40 font-bold';
    }

    const teamVal = row?.teamName || '';
    const coachVal = row?.coachName || '';
    const managerVal = row?.matchedManagerId || '';
    const pointsVal = row?.points !== undefined ? String(row.points) : '';
    const unmappedBorder = !managerVal && row ? 'border-amber-500 ring-1 ring-amber-500/40' : '';

    rowsHtml += `
      <tr class="border-b transition hover:bg-white/[0.02]" style="border-color: var(--table-border);">
        <td class="py-2 px-2 text-center align-middle whitespace-nowrap w-12 sm:w-16">
          <span class="px-2 py-0.5 rounded-lg text-xs border shadow-sm inline-block ${rankBadgeClass}">
            ${rankBadge}
          </span>
        </td>
        <td class="py-2 px-2 align-middle">
          <input type="text" id="season-team-${i}" list="season-team-list-${i}" required
            placeholder="es. Steven Bradbury FC" value="${teamVal.replace(/"/g, '&quot;')}"
            class="w-full px-2.5 py-1.5 rounded-lg border font-semibold text-xs transition"
            style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);" />
          <datalist id="season-team-list-${i}"></datalist>
        </td>
        <td class="py-2 px-2 align-middle">
          <input type="text" id="season-coach-${i}" placeholder="es. alfius91" value="${coachVal.replace(/"/g, '&quot;')}"
            class="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono transition"
            style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);" />
        </td>
        <td class="py-2 px-2 align-middle min-w-[140px] sm:min-w-[170px]">
          <select id="season-manager-${i}" required onchange="handleManagerSelectChange(${i}, this.value)"
            class="w-full px-2.5 py-1.5 rounded-lg border font-semibold text-xs transition cursor-pointer ${unmappedBorder}"
            style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
            ${buildManagerSelectOptions(managerVal)}
          </select>
        </td>
        <td class="py-2 px-2 align-middle w-20 sm:w-24">
          <input type="number" id="season-points-${i}" step="0.5" required placeholder="0.0" value="${pointsVal}"
            class="w-full p-1.5 border rounded-lg text-right font-mono font-bold text-xs transition"
            style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);" />
        </td>
      </tr>
    `;
  }
  return rowsHtml;
}

/**
 * Builds the full Season Creation Modal content HTML
 */
export function renderSeasonModalContent(
  teamCount = 12,
  initialData?: ParsedFantacalcioData
): string {
  const suggestedSeason = initialData?.season || getSuggestedNextSeason(state.competitions);
  const suggestedCompName = initialData?.competitionName || `${LEAGUE.brand.championshipLabel || 'Serie ' + LEAGUE.brand.name} ${suggestedSeason.replace('/', '-')}`;
  const rows = initialData?.rows;
  const activeCount = rows && rows.length >= 6 ? rows.length : teamCount;

  return `
    <form id="season-creation-form" onsubmit="saveSeason(event)" class="space-y-4">
      
      <!-- Top Settings Card -->
      <div class="p-3.5 sm:p-4 rounded-2xl border space-y-3" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-[10px] uppercase font-bold tracking-wider mb-1" style="color: var(--text-muted);">
              Edizione Stagione
            </label>
            <input type="text" id="season-field-year" required placeholder="es. ${suggestedSeason}" value="${suggestedSeason}"
              class="w-full px-3 py-1.5 rounded-xl border text-xs font-mono font-black"
              style="background: var(--table-surface); border-color: var(--table-border); color: var(--accent-color, #f59e0b);" />
          </div>

          <div>
            <label class="block text-[10px] uppercase font-bold tracking-wider mb-1" style="color: var(--text-muted);">
              Nome Campionato
            </label>
            <input type="text" id="season-field-comp-name" required placeholder="es. ${suggestedCompName.replace(/"/g, '&quot;')}" value="${suggestedCompName.replace(/"/g, '&quot;')}"
              class="w-full px-3 py-1.5 rounded-xl border text-xs font-bold"
              style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);" />
          </div>

          <div>
            <label class="block text-[10px] uppercase font-bold tracking-wider mb-1" style="color: var(--text-muted);">
              Numero Squadre
            </label>
            <select id="season-field-team-count" onchange="changeSeasonTeamCount(this.value)"
              class="w-full px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer"
              style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
              ${[8, 10, 12, 14, 16].map(n => `<option value="${n}" ${n === activeCount ? 'selected' : ''}>${n} Squadre</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- In Progress Switch -->
        <div class="pt-2 border-t flex flex-wrap items-center justify-between gap-2" style="border-color: var(--table-border);">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" id="season-field-in-progress" class="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer" />
            <span class="text-xs font-bold flex items-center gap-1.5" style="color: var(--text-main);">
              <i class="fa-solid fa-spinner text-blue-400 text-xs"></i> Stagione in corso
            </span>
          </label>
          <span class="text-[10px] opacity-70" style="color: var(--text-muted);">
            Mostra la classifica nell'Archivio ma non assegna lo Scudetto/trofei definitivi nell'Albo d'Oro
          </span>
        </div>
      </div>

      <!-- Rapid Ingestion Box -->
      <div class="p-3.5 sm:p-4 rounded-2xl border space-y-2.5" style="background: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between border-b pb-2" style="border-color: var(--table-border);">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-wand-magic-sparkles text-amber-400 text-xs"></i>
            <span class="text-xs font-black uppercase tracking-wider" style="color: var(--text-main);">
              Importazione Rapida da Fantacalcio
            </span>
          </div>
          <span class="text-[10px] opacity-70" style="color: var(--text-muted);">CSV, Excel, Tabella Copiata o URL</span>
        </div>

        <div class="space-y-2">
          <!-- Textarea / File input -->
          <div>
            <textarea id="season-fanta-paste" rows="3"
              placeholder="Incolla qui la classifica copiata da Leghe Fantacalcio o il contenuto esportato in Excel/CSV..."
              class="w-full p-2.5 rounded-xl border text-xs font-mono transition"
              style="background: rgba(0,0,0,0.2); border-color: var(--table-border); color: var(--text-main);"></textarea>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <button type="button" onclick="handleFantacalcioPasteParse()"
                class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-sm">
                <i class="fa-solid fa-bolt text-[11px]"></i>
                <span>Elabora e Compila Classifica</span>
              </button>
              
              <label class="px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 hover:bg-white/5"
                style="border-color: var(--table-border); color: var(--text-muted);">
                <i class="fa-solid fa-file-arrow-up text-[11px]"></i>
                <span>Carica file .CSV</span>
                <input type="file" id="season-file-input" accept=".csv,.txt" class="hidden" onchange="handleFantacalcioFileUpload(event)" />
              </label>
            </div>

            <!-- Optional URL input -->
            <div class="flex items-center gap-1.5 w-full sm:w-auto">
              <input type="url" id="season-fanta-url" placeholder="https://leghe.fantacalcio.it/..."
                value="${initialData?.leagueUrl || ''}"
                class="flex-1 sm:w-56 px-2.5 py-1 rounded-lg border text-xs"
                style="background: rgba(0,0,0,0.15); border-color: var(--table-border); color: var(--text-main);" />
              <button type="button" onclick="handleFantacalcioUrlFetch()"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition shrink-0 hover:bg-white/5"
                style="border-color: var(--table-border); color: var(--text-muted);">
                <i class="fa-solid fa-cloud-arrow-down text-[10px]"></i> Scarica URL
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Championship Standings Table -->
      <div class="rounded-2xl border overflow-hidden" style="border-color: var(--table-border); background: var(--table-surface);">
        <div class="px-3.5 py-2.5 border-b flex items-center justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.1);">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-trophy text-amber-400 text-xs"></i>
            <span class="text-xs font-black uppercase tracking-wider" style="color: var(--text-main);">
              Classifica Ufficiale Campionato
            </span>
          </div>
          <span class="text-[11px] font-mono font-bold text-amber-400">
            ${activeCount} Squadre
          </span>
        </div>

        <div class="overflow-x-auto max-h-[360px] overflow-y-auto" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="sticky top-0 z-10 border-b text-[10px] uppercase font-bold tracking-wider backdrop-blur-md"
              style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-muted);">
              <tr>
                <th class="py-2 px-2 text-center w-12 sm:w-16">Pos</th>
                <th class="py-2 px-2 text-left">Squadra (Testo Libero)</th>
                <th class="py-2 px-2 text-left">Coach (Fantacalcio)</th>
                <th class="py-2 px-2 text-left min-w-[140px] sm:min-w-[170px]">Mister ${LEAGUE.brand.name}</th>
                <th class="py-2 px-2 text-right w-20 sm:w-24">Punti</th>
              </tr>
            </thead>
            <tbody id="season-standings-tbody">
              ${renderChampionshipRowsHTML(activeCount, rows)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Secondary Tournaments & Playout Collapsible Section -->
      <div class="border rounded-2xl overflow-hidden text-xs" style="border-color: var(--table-border); background: var(--table-surface);">
        <button type="button" onclick="toggleSeasonSection('season-cups-section')"
          class="w-full px-3.5 py-2.5 flex items-center justify-between font-bold text-left transition hover:bg-white/5"
          style="color: var(--text-main);">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-shield text-blue-400 text-xs"></i>
            <span>Coppe &amp; Tornei di Stagione (Opzionali)</span>
          </div>
          <i id="season-cups-section-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-xs" style="color: var(--text-muted);"></i>
        </button>

        <div id="season-cups-section-content" class="p-3.5 space-y-3 border-t hidden" style="border-color: var(--table-border);">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <!-- Coppa ${LEAGUE.brand.name} -->
            <div class="p-3 rounded-xl border space-y-2" style="background: rgba(0,0,0,0.03); border-color: var(--table-border);">
              <span class="text-xs font-bold block text-blue-400">🏆 Coppa ${LEAGUE.brand.name}</span>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label class="block text-[9px] uppercase font-bold opacity-70 mb-0.5">Vincitore (Oro)</label>
                  <select id="season-cup-gold" class="w-full p-1.5 rounded-lg border text-xs"
                    style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
                    ${buildManagerSelectOptions(undefined, '-- Nessuno --')}
                  </select>
                </div>
                <div>
                  <label class="block text-[9px] uppercase font-bold opacity-70 mb-0.5">Finalista (Argento)</label>
                  <select id="season-cup-silver" class="w-full p-1.5 rounded-lg border text-xs"
                    style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
                    ${buildManagerSelectOptions(undefined, '-- Nessuno --')}
                  </select>
                </div>
              </div>
            </div>

            <!-- Supercoppa ${LEAGUE.brand.name} -->
            <div class="p-3 rounded-xl border space-y-2" style="background: rgba(0,0,0,0.03); border-color: var(--table-border);">
              <span class="text-xs font-bold block text-amber-400">⭐ Supercoppa ${LEAGUE.brand.name}</span>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label class="block text-[9px] uppercase font-bold opacity-70 mb-0.5">Vincitore (Oro)</label>
                  <select id="season-supercup-gold" class="w-full p-1.5 rounded-lg border text-xs"
                    style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
                    ${buildManagerSelectOptions(undefined, '-- Nessuno --')}
                  </select>
                </div>
                <div>
                  <label class="block text-[9px] uppercase font-bold opacity-70 mb-0.5">Finalista (Argento)</label>
                  <select id="season-supercup-silver" class="w-full p-1.5 rounded-lg border text-xs"
                    style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
                    ${buildManagerSelectOptions(undefined, '-- Nessuno --')}
                  </select>
                </div>
              </div>
            </div>

            <!-- Mundialito -->
            <div class="p-3 rounded-xl border space-y-2" style="background: rgba(0,0,0,0.03); border-color: var(--table-border);">
              <span class="text-xs font-bold block text-emerald-400">🌍 Mundialito (2ª Divisione)</span>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label class="block text-[9px] uppercase font-bold opacity-70 mb-0.5">Vincitore (Oro)</label>
                  <select id="season-mundialito-gold" class="w-full p-1.5 rounded-lg border text-xs"
                    style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
                    ${buildManagerSelectOptions(undefined, '-- Nessuno --')}
                  </select>
                </div>
                <div>
                  <label class="block text-[9px] uppercase font-bold opacity-70 mb-0.5">Finalista (Argento)</label>
                  <select id="season-mundialito-silver" class="w-full p-1.5 rounded-lg border text-xs"
                    style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
                    ${buildManagerSelectOptions(undefined, '-- Nessuno --')}
                  </select>
                </div>
              </div>
            </div>

            <!-- Playout / Cartonato -->
            <div class="p-3 rounded-xl border space-y-2" style="background: rgba(0,0,0,0.03); border-color: var(--table-border);">
              <span class="text-xs font-bold block text-rose-400">📦 Playout / Cartonato</span>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label class="block text-[9px] uppercase font-bold opacity-70 mb-0.5">Vincitore Playout</label>
                  <select id="season-cartonato-winner" class="w-full p-1.5 rounded-lg border text-xs"
                    style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
                    ${buildManagerSelectOptions(undefined, '-- Nessuno --')}
                  </select>
                </div>
                <div>
                  <label class="block text-[9px] uppercase font-bold opacity-70 mb-0.5">Banner Coach</label>
                  <input type="text" id="season-cartonato-coach" placeholder="es. MAZZARRI" value="CARTONATO"
                    class="w-full p-1.5 rounded-lg border text-xs font-mono uppercase font-bold"
                    style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="pt-3 border-t flex items-center justify-end gap-2.5 shrink-0" style="border-color: var(--table-border);">
        <button type="button" onclick="closeSeasonModal()"
          class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition hover:bg-white/5"
          style="border-color: var(--table-border); color: var(--text-muted);">
          Annulla
        </button>
        <button type="submit"
          class="px-5 py-2 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition shadow-md flex items-center gap-1.5">
          <i class="fa-solid fa-check"></i>
          <span>Salva Stagione</span>
        </button>
      </div>

    </form>
  `;
}
