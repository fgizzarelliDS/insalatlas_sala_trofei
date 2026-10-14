import type { Manager, NemesisMatrixData } from '@/types';
import { computeNemesisMatrix, filterManagersForMatrix, getLatestSeason } from '@/analytics/nemesis';
import { getInitials } from './HeadToHeadHero';

/**
 * Computes unique initials for a list of managers, resolving collisions
 * (e.g. Vannico -> VN vs Valery -> VL)
 */
export function computeDisambiguatedInitials(managers: Manager[]): Map<string, string> {
  const map = new Map<string, string>();
  const groups = new Map<string, Manager[]>();

  for (const m of managers) {
    const init = getInitials(m.name);
    const list = groups.get(init) || [];
    list.push(m);
    groups.set(init, list);
  }

  for (const [init, list] of groups.entries()) {
    if (list.length === 1) {
      map.set(list[0].id, init);
    } else {
      const used = new Set<string>();
      for (const m of list) {
        const parts = m.name.split(/[ &+/,-]/).filter(Boolean);
        let candidate = '';
        if (parts.length >= 2) {
          candidate = (parts[0][0] + parts[1][0]).toUpperCase();
        } else {
          const clean = m.name.toUpperCase();
          for (let i = 2; i < clean.length; i++) {
            const cand = clean[0] + clean[i];
            if (!groups.has(cand) && !used.has(cand)) {
              candidate = cand;
              break;
            }
          }
        }
        if (!candidate || used.has(candidate)) {
          candidate = m.name.slice(0, 2).toUpperCase();
        }
        used.add(candidate);
        map.set(m.id, candidate);
      }
    }
  }

  return map;
}

/**
 * Renders the full N x N interactive Nemesis cross-table matrix view
 */
export function renderNemesisMatrixView(
  allManagers: Manager[],
  filterMode: 'active' | 'veterans' | 'all' = 'active'
): string {
  const latestSeason = getLatestSeason(allManagers);
  const activeCount = filterManagersForMatrix(allManagers, 'active', latestSeason).length;
  const veteransCount = filterManagersForMatrix(allManagers, 'veterans', latestSeason).length;
  const totalCount = allManagers.length;

  const scopedManagers = filterManagersForMatrix(allManagers, filterMode, latestSeason);
  const matrixData: NemesisMatrixData = computeNemesisMatrix(scopedManagers);
  const initialsMap = computeDisambiguatedInitials(scopedManagers);

  // Column header row (Contender B) with color-matched circular avatar badge
  const colHeadersHTML = scopedManagers
    .map(m => {
      const initials = initialsMap.get(m.id) || getInitials(m.name);
      return `
      <th class="p-1 text-center font-sport font-black uppercase sticky top-0 z-20 border-b border-l min-w-[48px] max-w-[58px] h-12 align-middle overflow-visible"
          style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--text-main);"
          title="${m.name} (Mister B)">
        <div class="flex items-center justify-center w-full h-full">
          <!-- Mister B Color-Matched Circled Avatar Badge -->
          <span class="w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 shadow-sm transition hover:scale-110"
                style="background-color: color-mix(in srgb, var(--accent-color) 18%, transparent); color: var(--accent-color); border: 1.5px solid color-mix(in srgb, var(--accent-color) 45%, transparent);"
                title="${m.name}">
            ${initials}
          </span>
        </div>
      </th>
    `;
    })
    .join('');

  // Table rows (Contender A vs all Contenders B)
  const rowsHTML = scopedManagers
    .map(mA => {
      const initialsA = initialsMap.get(mA.id) || getInitials(mA.name);
      const cellsHTML = scopedManagers
        .map(mB => {
          const cell = matrixData.matrix[mA.id]?.[mB.id];
          if (!cell || cell.status === 'self') {
            return `
              <td class="p-1 text-center font-bold text-[10px] opacity-30 border-b border-l select-none cursor-default"
                  style="border-color: var(--table-border); background-color: rgba(0,0,0,0.12);">
                —
              </td>
            `;
          }

          if (cell.status === 'none') {
            return `
              <td class="p-1 text-center font-medium text-[10px] opacity-35 border-b border-l select-none cursor-default"
                  style="border-color: var(--table-border);"
                  title="Nessuna stagione condivisa tra ${mA.name} e ${mB.name}">
                -
              </td>
            `;
          }

          let colorClasses = '';
          if (cell.status === 'positive') {
            colorClasses = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30';
          } else if (cell.status === 'negative') {
            colorClasses = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/30';
          } else {
            colorClasses = 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/40 hover:bg-slate-500/30';
          }

          const diffSign = cell.pointsDiffA > 0 ? '+' : '';
          const tooltip = `${mA.name} vs ${mB.name}: ${cell.winsA}V - ${cell.ties}N - ${cell.winsB}P (${cell.sharedSeasons} st., ${diffSign}${cell.pointsDiffA} pt diff) • Clicca per aprire il duello 1vs1`;

          return `
            <td class="p-0.5 border-b border-l" style="border-color: var(--table-border);">
              <button type="button"
                onclick="window.selectH2HDuel('${mA.id}', '${mB.id}')"
                class="w-full h-8 sm:h-9 flex flex-col items-center justify-center rounded-lg text-[10px] font-black transition cursor-pointer border ${colorClasses}"
                title="${tooltip}">
                <span>${cell.winsA}-${cell.ties}-${cell.winsB}</span>
              </button>
            </td>
          `;
        })
        .join('');

      return `
        <tr class="hover:bg-white/5 transition">
          <!-- Sticky Row Header: Manager A -->
          <th class="p-1.5 sm:p-2 text-left font-bold text-xs sticky left-0 z-10 border-b min-w-[100px] max-w-[135px] truncate"
              style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--text-main);"
              title="${mA.name}">
            <div class="flex items-center gap-1.5 truncate">
              <span class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-black text-[9px] shrink-0 border border-amber-500/30">
                ${initialsA}
              </span>
              <span class="truncate text-[11px] font-bold leading-tight">${mA.name}</span>
            </div>
          </th>
          ${cellsHTML}
        </tr>
      `;
    })
    .join('');

  return `
    <div class="space-y-3">
      <!-- Section Header with Filters -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b" style="border-color: var(--table-border);">
        <div>
          <h3 class="font-sport font-black text-sm sm:text-base uppercase tracking-wide leading-tight flex items-center gap-2" style="color: var(--text-main);">
            <i class="fa-solid fa-table-cells text-amber-500"></i>
            Matrice Nemesi <span style="color: var(--accent-color);">Head-to-Head</span>
          </h3>
          <p class="text-[10px] sm:text-[11px] opacity-70 mt-0.5" style="color: var(--text-muted);">
            Tabellone incrociato dei duelli storici in campionato (Riga: Mister A vs Colonna: Mister B)
          </p>
        </div>

        <!-- Filter Scope Pills: Active / Veterans / All -->
        <div class="flex items-center gap-1 p-0.5 rounded-xl border shrink-0 text-[10px] sm:text-[11px] font-bold shadow-sm"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <button type="button" onclick="window.setNemesisFilter('active')"
            class="px-2.5 sm:px-3 py-1 rounded-lg transition ${filterMode === 'active' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
            style="${filterMode === 'active' ? 'color: #020617;' : 'color: var(--text-main);'}">
            Attivi (${activeCount})
          </button>
          <button type="button" onclick="window.setNemesisFilter('veterans')"
            class="px-2.5 sm:px-3 py-1 rounded-lg transition ${filterMode === 'veterans' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
            style="${filterMode === 'veterans' ? 'color: #020617;' : 'color: var(--text-main);'}">
            Veterani (${veteransCount})
          </button>
          <button type="button" onclick="window.setNemesisFilter('all')"
            class="px-2.5 sm:px-3 py-1 rounded-lg transition ${filterMode === 'all' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
            style="${filterMode === 'all' ? 'color: #020617;' : 'color: var(--text-main);'}">
            Tutti (${totalCount})
          </button>
        </div>
      </div>

      <!-- Cross-Table Matrix Container with Sticky Corner and Headers -->
      <div class="relative overflow-auto max-h-[56vh] border rounded-2xl shadow-inner"
           style="border-color: var(--table-border); background-color: var(--table-surface); scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr>
              <!-- Sticky Top-Left Corner Cell: Directional Mister B (Cols) and Mister A (Rows) -->
              <th class="p-1.5 sm:p-2 sticky top-0 left-0 z-30 border-b border-r min-w-[105px] max-w-[135px] h-12 align-middle"
                  style="background-color: var(--modal-bg); border-color: var(--table-border);">
                <div class="flex flex-col justify-center h-full text-[10px] font-sport font-black uppercase tracking-tight leading-tight select-none">
                  <div class="flex items-center justify-end gap-1 pb-1" style="color: var(--accent-color);">
                    <span>Mister B</span>
                    <i class="fa-solid fa-arrow-right text-[8px]"></i>
                  </div>
                  <div class="flex items-center justify-start gap-1 pt-1 border-t opacity-75" style="border-color: var(--table-border); color: var(--text-main);">
                    <i class="fa-solid fa-arrow-down text-[8px]"></i>
                    <span>Mister A</span>
                  </div>
                </div>
              </th>
              ${colHeadersHTML}
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>

      <!-- Heatmap Legend & Interaction Tip -->
      <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border text-[11px]"
           style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/50 inline-block"></span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400">Saldo Favorevole (V &gt; P)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-md bg-rose-500/20 border border-rose-500/50 inline-block"></span>
            <span class="font-bold text-rose-600 dark:text-rose-400">Bestia Nera (V &lt; P)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-md bg-slate-500/20 border border-slate-500/50 inline-block"></span>
            <span class="font-bold opacity-75" style="color: var(--text-main);">Pari (V = P)</span>
          </div>
        </div>
        <div class="text-[10px] opacity-75 italic flex items-center gap-1" style="color: var(--text-muted);">
          <i class="fa-solid fa-arrow-pointer"></i>
          <span>Clicca su qualsiasi casella (V-N-P) per aprire il duello diretto 1vs1</span>
        </div>
      </div>
    </div>
  `;
}
