import type { HeadToHeadStats, Manager } from '@/types';
import { formatScore } from '@/score';
import { renderTrophySVG } from '@/trophies';

/**
 * Renders an individual mirror comparison row
 */
function renderPalmaresRow(
  label: string,
  valA: number,
  valB: number,
  svgKey?: string,
  iconClass?: string,
  isNegative = false
): string {
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
}

/**
 * Renders the mirror trophy palmares table between two managers
 */
export function renderHeadToHeadPalmares(
  palmares: HeadToHeadStats['palmares'],
  managerA: Manager,
  managerB: Manager
): string {
  return `
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
  `;
}
