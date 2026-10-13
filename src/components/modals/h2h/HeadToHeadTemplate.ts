import type { Manager, HeadToHeadStats } from '@/types';
import { formatScore } from '@/score';
import { renderTrophySVG } from '@/trophies';
import { computeH2HAxes, renderH2HRadarSVG, renderH2HDuelBars } from './HeadToHeadRadar';

/**
 * Extracts initials for manager avatar
 */
function getInitials(name: string): string {
  const parts = name.split(/[ &+/,-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Renders an icon/emoji badge safely without leaking raw FontAwesome class strings
 */
function renderIconBadge(icon: string, label: string): string {
  if (!icon) return label;
  const iconHTML = icon.startsWith('fa-')
    ? `<i class="fa-solid ${icon} mr-1 text-[11px]"></i>`
    : `<span class="mr-1">${icon}</span>`;
  return `${iconHTML}${label}`;
}

/**
 * Renders HTML for the Head-to-Head Comparison modal
 */
export function renderHeadToHeadModalHTML(
  stats: HeadToHeadStats,
  allManagers: Manager[],
  isChronologyExpanded: boolean,
  visualMode: 'radar' | 'bars' = 'radar'
): string {
  const { managerA, managerB, metricsA, metricsB, palmares, duels, winsA, winsB, ties } = stats;
  const initialsA = getInitials(managerA.name);
  const initialsB = getInitials(managerB.name);

  // Options for dropdowns
  const optionsA = allManagers
    .map(
      m =>
        `<option value="${m.id}" ${m.id === managerA.id ? 'selected' : ''} ${m.id === managerB.id ? 'disabled' : ''}>${m.name}</option>`
    )
    .join('');

  const optionsB = allManagers
    .map(
      m =>
        `<option value="${m.id}" ${m.id === managerB.id ? 'selected' : ''} ${m.id === managerA.id ? 'disabled' : ''}>${m.name}</option>`
    )
    .join('');

  // Proportions for duels bar
  const totalDuels = duels.length;
  const pctA = totalDuels > 0 ? (winsA / totalDuels) * 100 : 33.3;
  const pctTie = totalDuels > 0 ? (ties / totalDuels) * 100 : 33.3;
  const pctB = totalDuels > 0 ? (winsB / totalDuels) * 100 : 33.3;

  // Duels detailed table
  let duelsRowsHTML = '';
  if (duels.length === 0) {
    duelsRowsHTML = `
      <tr>
        <td colspan="4" class="py-3 text-center text-xs opacity-60 italic">
          Nessuna stagione disputata contemporaneamente da entrambi i mister.
        </td>
      </tr>
    `;
  } else {
    duelsRowsHTML = duels
      .map(d => {
        let outcomeBadge = '';
        if (d.winner === 'A') {
          outcomeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-black border" style="background-color: rgba(125, 125, 125, 0.08); color: var(--h2h-contender-a); border-color: var(--h2h-contender-a);">Vince ${managerA.name}</span>`;
        } else if (d.winner === 'B') {
          outcomeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-black border" style="background-color: rgba(125, 125, 125, 0.08); color: var(--h2h-contender-b); border-color: var(--h2h-contender-b);">Vince ${managerB.name}</span>`;
        } else {
          outcomeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/40">Pari</span>`;
        }

        const rankClassA = d.winner === 'A' ? 'font-black' : 'opacity-80';
        const rankClassB = d.winner === 'B' ? 'font-black' : 'opacity-80';
        const rankStyleA = d.winner === 'A' ? 'color: var(--h2h-contender-a);' : '';
        const rankStyleB = d.winner === 'B' ? 'color: var(--h2h-contender-b);' : '';

        return `
          <tr class="border-b last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5 transition" style="border-color: var(--table-border);">
            <td class="py-2 px-2.5 font-bold text-xs" style="color: var(--text-main);">${d.season}</td>
            <td class="py-2 px-2 text-center text-xs ${rankClassA}" style="${rankStyleA}">
              <span class="font-extrabold">${d.rankA}°</span>
              ${d.teamA ? `<span class="block text-[10px] opacity-60 truncate max-w-[100px] mx-auto">${d.teamA}</span>` : ''}
            </td>
            <td class="py-2 px-2 text-center text-xs ${rankClassB}" style="${rankStyleB}">
              <span class="font-extrabold">${d.rankB}°</span>
              ${d.teamB ? `<span class="block text-[10px] opacity-60 truncate max-w-[100px] mx-auto">${d.teamB}</span>` : ''}
            </td>
            <td class="py-2 px-2 text-right">${outcomeBadge}</td>
          </tr>
        `;
      })
      .join('');
  }

  // Palmares comparison rows helper
  const renderPalmaresRow = (
    label: string,
    valA: number,
    valB: number,
    svgKey?: string,
    iconClass?: string,
    isNegative = false
  ) => {
    let highlightA = false;
    let highlightB = false;

    if (valA !== valB) {
      if (!isNegative) {
        if (valA > valB) highlightA = true;
        else highlightB = true;
      } else {
        // For spoons/cartonati, fewer is better
        if (valA < valB) highlightA = true;
        else highlightB = true;
      }
    }

    const styleA = highlightA
      ? 'color: var(--h2h-contender-a); background-color: rgba(125, 125, 125, 0.08);'
      : 'color: var(--text-main);';
    const styleB = highlightB
      ? 'color: var(--h2h-contender-b); background-color: rgba(125, 125, 125, 0.08);'
      : 'color: var(--text-main);';

    let iconHTML = '';
    if (svgKey) {
      iconHTML = renderTrophySVG(svgKey, 'compact', 'inline-block mr-1.5');
    } else if (iconClass) {
      iconHTML = `<i class="${iconClass} text-xs mr-1.5 opacity-80"></i>`;
    }

    return `
      <div class="flex items-center justify-between py-1.5 px-2.5 border-b last:border-b-0 text-xs" style="border-color: var(--table-border);">
        <span class="w-14 text-center ${highlightA ? 'font-black rounded px-1.5' : 'font-bold'}" style="${styleA}">${valA}</span>
        <span class="flex-1 text-center font-semibold opacity-90 flex items-center justify-center" style="color: var(--text-main);">
          ${iconHTML}${label}
        </span>
        <span class="w-14 text-center ${highlightB ? 'font-black rounded px-1.5' : 'font-bold'}" style="${styleB}">${valB}</span>
      </div>
    `;
  };

  // Metrics comparison row helper
  const renderMetricRow = (
    label: string,
    strA: string,
    strB: string,
    winner: 'A' | 'B' | 'none' = 'none'
  ) => {
    const classA = winner === 'A'
      ? 'font-black rounded px-1.5'
      : 'font-semibold opacity-85';
    const styleA = winner === 'A'
      ? 'color: var(--h2h-contender-a); background-color: rgba(125, 125, 125, 0.08);'
      : 'color: var(--text-main);';

    const classB = winner === 'B'
      ? 'font-black rounded px-1.5'
      : 'font-semibold opacity-85';
    const styleB = winner === 'B'
      ? 'color: var(--h2h-contender-b); background-color: rgba(125, 125, 125, 0.08);'
      : 'color: var(--text-main);';

    return `
      <div class="flex items-center justify-between py-1.5 px-2.5 border-b last:border-b-0 text-xs" style="border-color: var(--table-border);">
        <span class="w-32 text-left truncate ${classA}" style="${styleA}">${strA}</span>
        <span class="flex-1 text-center text-[10px] uppercase tracking-wider font-bold opacity-60 px-1" style="color: var(--text-main);">${label}</span>
        <span class="w-32 text-right truncate ${classB}" style="${styleB}">${strB}</span>
      </div>
    `;
  };

  // Compute 6-axis visual data
  const axesData = computeH2HAxes(stats);
  const radarHTML = renderH2HRadarSVG(axesData, managerA.name, managerB.name);
  const barsHTML = renderH2HDuelBars(axesData, managerA.name, managerB.name);

  return `
    <!-- Modal Header -->
    <div class="flex items-center justify-between border-b px-4 sm:px-6 py-3.5 shrink-0" style="border-color: var(--table-border);">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black border border-amber-500/30">
          <i class="fa-solid fa-code-compare text-sm"></i>
        </div>
        <div>
          <h2 class="font-sport font-black text-base sm:text-lg uppercase tracking-wide leading-none" style="color: var(--text-main);">
            Head-to-Head <span style="color: var(--accent-color);">Duello Diretto</span>
          </h2>
          <p class="text-[10px] sm:text-[11px] opacity-70 mt-0.5" style="color: var(--text-muted);">
            Confronto storico, palmarès e metriche di rendimento
          </p>
        </div>
      </div>
      <button onclick="closeHeadToHeadModal()"
        class="w-8 h-8 rounded-full flex items-center justify-center font-bold opacity-75 hover:opacity-100 transition border"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        ✕
      </button>
    </div>

    <!-- Scrollable Modal Body -->
    <div class="p-3 sm:p-5 overflow-y-auto flex-1 space-y-4" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">

      <!-- Manager Selectors -->
      <div class="p-3 rounded-2xl border" style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="grid grid-cols-2 gap-3 items-center">
          <!-- Select A -->
          <div class="min-w-0">
            <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style="color: var(--h2h-contender-a);">
              <span class="w-2 h-2 rounded-full inline-block" style="background-color: var(--h2h-contender-a);"></span>
              Mister A
            </label>
            <select id="h2h-select-a" onchange="changeH2HManagerA(this.value)"
              class="w-full text-xs font-bold rounded-xl px-2.5 py-2 border focus:outline-none cursor-pointer truncate shadow-sm transition"
              style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
              ${optionsA}
            </select>
          </div>

          <!-- Select B -->
          <div class="min-w-0">
            <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-end gap-1.5" style="color: var(--h2h-contender-b);">
              Mister B
              <span class="w-2 h-2 rounded-full inline-block" style="background-color: var(--h2h-contender-b);"></span>
            </label>
            <select id="h2h-select-b" onchange="changeH2HManagerB(this.value)"
              class="w-full text-xs font-bold rounded-xl px-2.5 py-2 border focus:outline-none cursor-pointer truncate text-right shadow-sm transition"
              style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
              ${optionsB}
            </select>
          </div>
        </div>

        <!-- Face-off Hero Cards -->
        <div class="grid grid-cols-11 gap-1 items-center mt-3 pt-3 border-t" style="border-color: var(--table-border);">
          <!-- Contender A Card -->
          <div class="col-span-5 text-center p-2.5 rounded-xl border" style="background-color: var(--modal-bg); border-color: var(--table-border);">
            <div class="w-11 h-11 mx-auto rounded-full flex items-center justify-center font-black text-sm border-2 mb-1.5 shadow"
                 style="background: radial-gradient(circle, var(--h2h-contender-a) 0%, transparent 80%), rgba(255,255,255,0.05); border-color: var(--h2h-contender-a); color: var(--text-main);">
              ${initialsA}
            </div>
            <h3 class="font-sport font-black text-sm uppercase truncate leading-tight mb-1" style="color: var(--text-main);">
              ${managerA.name}
            </h3>
            <div class="flex flex-wrap items-center justify-center gap-1">
              <span class="inline-block text-[10px] font-black px-2 py-0.5 rounded-full border"
                    style="color: var(--h2h-contender-a); border-color: var(--h2h-contender-a); background-color: rgba(125, 125, 125, 0.08);">
                ${formatScore(metricsA.score)} PT
              </span>
              <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style="background: ${metricsA.archetypeColor}20; color: ${metricsA.archetypeColor}; border-color: ${metricsA.archetypeColor}50;">
                <i class="fa-solid ${metricsA.archetypeIcon} text-[9px]"></i> ${metricsA.archetypeTag}
              </span>
            </div>
          </div>

          <!-- VS Emblem -->
          <div class="col-span-1 text-center font-sport font-black text-sm italic tracking-widest opacity-60 drop-shadow" style="color: var(--accent-color);">
            VS
          </div>

          <!-- Contender B Card -->
          <div class="col-span-5 text-center p-2.5 rounded-xl border" style="background-color: var(--modal-bg); border-color: var(--table-border);">
            <div class="w-11 h-11 mx-auto rounded-full flex items-center justify-center font-black text-sm border-2 mb-1.5 shadow"
                 style="background: radial-gradient(circle, var(--h2h-contender-b) 0%, transparent 80%), rgba(255,255,255,0.05); border-color: var(--h2h-contender-b); color: var(--text-main);">
              ${initialsB}
            </div>
            <h3 class="font-sport font-black text-sm uppercase truncate leading-tight mb-1" style="color: var(--text-main);">
              ${managerB.name}
            </h3>
            <div class="flex flex-wrap items-center justify-center gap-1">
              <span class="inline-block text-[10px] font-black px-2 py-0.5 rounded-full border"
                    style="color: var(--h2h-contender-b); border-color: var(--h2h-contender-b); background-color: rgba(125, 125, 125, 0.08);">
                ${formatScore(metricsB.score)} PT
              </span>
              <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style="background: ${metricsB.archetypeColor}20; color: ${metricsB.archetypeColor}; border-color: ${metricsB.archetypeColor}50;">
                <i class="fa-solid ${metricsB.archetypeIcon} text-[9px]"></i> ${metricsB.archetypeTag}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 1: Scoreboard Scontri Diretti in Campionato -->
      <div class="p-3.5 rounded-2xl border" style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between mb-2.5">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-flag-checkered text-xs" style="color: var(--accent-color);"></i>
            <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--text-main);">
              Scontri Diretti di Campionato
            </span>
          </div>
          <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
            ${stats.sharedSeasonsCount} ${stats.sharedSeasonsCount === 1 ? 'Stagione Condivisa' : 'Stagioni Condivise'}
          </span>
        </div>

        <!-- 3 Big Numbers Scoreboard -->
        <div class="grid grid-cols-3 gap-2 text-center py-2 px-1 rounded-xl border mb-2.5"
             style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div>
            <span class="block text-2xl font-sport font-black leading-none" style="color: var(--h2h-contender-a);">${winsA}</span>
            <span class="text-[10px] font-bold opacity-75 uppercase tracking-tight" style="color: var(--text-main);">Vittorie ${managerA.name}</span>
          </div>
          <div class="border-x" style="border-color: var(--table-border);">
            <span class="block text-2xl font-sport font-black leading-none opacity-80" style="color: var(--text-main);">${ties}</span>
            <span class="text-[10px] font-bold opacity-75 uppercase tracking-tight" style="color: var(--text-main);">Pari</span>
          </div>
          <div>
            <span class="block text-2xl font-sport font-black leading-none" style="color: var(--h2h-contender-b);">${winsB}</span>
            <span class="text-[10px] font-bold opacity-75 uppercase tracking-tight" style="color: var(--text-main);">Vittorie ${managerB.name}</span>
          </div>
        </div>

        <!-- Duel Progress Bar -->
        ${
          totalDuels > 0
            ? `
          <div class="w-full h-2 rounded-full overflow-hidden flex border mb-2.5"
               style="background-color: var(--modal-bg); border-color: var(--table-border);">
            <div style="width: ${pctA}%; background-color: var(--h2h-contender-a);" class="transition-all duration-500" title="Vittorie ${managerA.name}: ${winsA}"></div>
            <div style="width: ${pctTie}%; background-color: rgba(148, 163, 184, 0.4);" class="transition-all duration-500" title="Pari: ${ties}"></div>
            <div style="width: ${pctB}%; background-color: var(--h2h-contender-b);" class="transition-all duration-500" title="Vittorie ${managerB.name}: ${winsB}"></div>
          </div>
        `
            : ''
        }

        <!-- Toggle Chronology Button -->
        <div class="text-center">
          <button onclick="toggleH2HChronology()"
            class="text-[11px] font-bold px-3 py-1 rounded-lg border transition inline-flex items-center gap-1.5 opacity-80 hover:opacity-100"
            style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
            <i class="fa-solid fa-clock-rotate-left text-[10px]"></i>
            <span>${isChronologyExpanded ? 'Nascondi Tabellino Annate' : 'Mostra Tabellino Annate (' + duels.length + ')'}</span>
            <i class="fa-solid ${isChronologyExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[9px]"></i>
          </button>
        </div>

        <!-- Expandable Chronology Table -->
        ${
          isChronologyExpanded
            ? `
          <div class="mt-3 overflow-x-auto rounded-xl border" style="border-color: var(--table-border); scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b text-[10px] uppercase tracking-wider font-extrabold opacity-75"
                    style="background-color: var(--modal-bg); border-color: var(--table-border); color: var(--text-main);">
                  <th class="py-2 px-2.5">Stagione</th>
                  <th class="py-2 px-2 text-center">${managerA.name}</th>
                  <th class="py-2 px-2 text-center">${managerB.name}</th>
                  <th class="py-2 px-2 text-right">Esito</th>
                </tr>
              </thead>
              <tbody>
                ${duelsRowsHTML}
              </tbody>
            </table>
          </div>
        `
            : ''
        }
      </div>

      <!-- SECTION 2: Palmarès a Specchio -->
      <div class="p-3.5 rounded-2xl border" style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-trophy text-amber-500 text-xs"></i>
            <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--text-main);">
              Bacheca Trofei a Confronto
            </span>
          </div>
          <span class="text-[10px] opacity-60 font-semibold" style="color: var(--text-main);">${managerA.name} vs ${managerB.name}</span>
        </div>

        <div class="rounded-xl border overflow-hidden" style="background-color: var(--modal-bg); border-color: var(--table-border);">
          ${renderPalmaresRow('Scudetti (1° Posto)', palmares.gold.a, palmares.gold.b, 'gold_cup')}
          ${renderPalmaresRow('Coppe di Lega (Oro)', palmares.cupGold.a, palmares.cupGold.b, 'coppa_gold')}
          ${renderPalmaresRow('Supercoppe', palmares.supercup.a, palmares.supercup.b, 'supercup')}
          ${renderPalmaresRow('Mundialito', palmares.mundialito.a, palmares.mundialito.b, 'mundialito')}
          ${renderPalmaresRow('Totale Titoli Major', palmares.totalTitles.a, palmares.totalTitles.b, undefined, 'fa-solid fa-crown text-amber-500')}
          ${renderPalmaresRow('Secondi Posti', palmares.silver.a, palmares.silver.b, 'silver_cup')}
          ${renderPalmaresRow('Terzi Posti', palmares.bronze.a, palmares.bronze.b, 'bronze_cup')}
          ${renderPalmaresRow('Cucchiai di Legno', palmares.spoon.a, palmares.spoon.b, 'wooden_spoon', undefined, true)}
          ${renderPalmaresRow('Cartonati Playout', palmares.cartonato.a, palmares.cartonato.b, undefined, 'fa-solid fa-skull-crossbones text-rose-500', true)}
          ${renderPalmaresRow('Rating Storico (PT)', formatScore(palmares.ratingScore.a) as unknown as number, formatScore(palmares.ratingScore.b) as unknown as number, undefined, 'fa-solid fa-star text-amber-500')}
        </div>
      </div>

      <!-- SECTION 3: Indicatori di Performance & Grafico Comparativo Dual-Mode -->
      <div class="p-3.5 rounded-2xl border" style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-chart-line text-emerald-500 text-xs"></i>
            <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--text-main);">
              Indicatori &amp; Confronto Grafico
            </span>
          </div>

          <!-- Segmented Control for Dual Mode: Radar vs Bars -->
          <div class="flex items-center p-0.5 rounded-xl border text-[11px] font-bold shadow-sm"
               style="background-color: var(--modal-bg); border-color: var(--table-border);">
            <button type="button" onclick="setH2HVisualMode('radar')"
              class="px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${visualMode === 'radar' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
              style="${visualMode === 'radar' ? 'color: #020617;' : 'color: var(--text-main);'}">
              <i class="fa-solid fa-network-wired text-[10px]"></i>
              <span>Radar</span>
            </button>
            <button type="button" onclick="setH2HVisualMode('bars')"
              class="px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${visualMode === 'bars' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
              style="${visualMode === 'bars' ? 'color: #020617;' : 'color: var(--text-main);'}">
              <i class="fa-solid fa-chart-simple text-[10px]"></i>
              <span>Barre</span>
            </button>
          </div>
        </div>

        <!-- Visual Display: Radar or Duel Bars -->
        <div class="mb-3.5 p-2.5 rounded-xl border" style="background-color: var(--modal-bg); border-color: var(--table-border);">
          ${visualMode === 'radar' ? radarHTML : barsHTML}
        </div>

        <!-- Detailed Metrics Table -->
        <div class="rounded-xl border overflow-hidden" style="background-color: var(--modal-bg); border-color: var(--table-border);">
          ${renderMetricRow(
            'Freddezza (GCI)',
            renderIconBadge(metricsA.clutchIcon, metricsA.clutchLabel),
            renderIconBadge(metricsB.clutchIcon, metricsB.clutchLabel),
            metricsA.gci > metricsB.gci ? 'A' : metricsB.gci > metricsA.gci ? 'B' : 'none'
          )}
          ${renderMetricRow(
            'Killer Instinct Podio',
            `${metricsA.kiPct}%`,
            `${metricsB.kiPct}%`,
            metricsA.kiPct > metricsB.kiPct ? 'A' : metricsB.kiPct > metricsA.kiPct ? 'B' : 'none'
          )}
          ${renderMetricRow(
            'Conversione Finali Coppe',
            `${metricsA.crPct}%`,
            `${metricsB.crPct}%`,
            metricsA.crPct > metricsB.crPct ? 'A' : metricsB.crPct > metricsA.crPct ? 'B' : 'none'
          )}
          ${renderMetricRow(
            'Rischio di Coda (NTI)',
            renderIconBadge(metricsA.polarityIcon, metricsA.polarityLabel),
            renderIconBadge(metricsB.polarityIcon, metricsB.polarityLabel),
            metricsA.nti > metricsB.nti ? 'A' : metricsB.nti > metricsA.nti ? 'B' : 'none'
          )}
          ${renderMetricRow(
            'Stabilità Classifica',
            renderIconBadge(metricsA.stabilityIcon, metricsA.stabilityCategory),
            renderIconBadge(metricsB.stabilityIcon, metricsB.stabilityCategory),
            metricsA.stdDevRank < metricsB.stdDevRank ? 'A' : metricsB.stdDevRank < metricsA.stdDevRank ? 'B' : 'none'
          )}
        </div>
      </div>

      <!-- SECTION 4: Verdetto Narrativo Automatico -->
      <div class="p-3.5 rounded-2xl border border-l-4 shadow-sm"
           style="background-color: var(--table-surface); border-color: var(--table-border); border-left-color: var(--accent-color); color: var(--text-main);">
        <div class="flex items-center gap-2 mb-1.5 font-bold text-xs" style="color: var(--accent-color);">
          <i class="fa-solid fa-scroll"></i>
          <span>Verdetto Storico della Sfida</span>
        </div>
        <p class="text-xs leading-relaxed opacity-90 font-medium" style="color: var(--text-main);">
          ${stats.narrativeVerdict}
        </p>
      </div>

    </div>

    <!-- Modal Footer Actions -->
    <div class="flex items-center justify-between border-t px-4 sm:px-6 py-3 shrink-0" style="border-color: var(--table-border);">
      <button onclick="shareH2HWhatsApp()"
        class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25 shadow-sm">
        <i class="fa-brands fa-whatsapp text-sm"></i>
        <span>Condividi Duello</span>
      </button>

      <button onclick="closeHeadToHeadModal()"
        class="px-4 py-1.5 rounded-xl text-xs font-bold transition border"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        Chiudi
      </button>
    </div>
  `;
}
