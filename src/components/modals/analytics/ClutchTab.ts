import type { LeagueConcentrationAnalysis, Tab2SortField, Tab2SortDirection } from '@/types';

export function renderClutchTab(
  analysis: LeagueConcentrationAnalysis,
  tab2SortField: Tab2SortField,
  tab2SortDirection: Tab2SortDirection
): string {
  const clutchSorted = [...analysis.profiles].sort((a, b) => {
    let cmp = 0;
    if (tab2SortField === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else if (tab2SortField === 'podiumRate') {
      cmp = (b.podiumRatePct - a.podiumRatePct) || (b.killerInstinctPct - a.killerInstinctPct) || (b.podiums - a.podiums) || (b.trophies - a.trophies);
    } else if (tab2SortField === 'killerInstinct') {
      cmp = (b.killerInstinctPct - a.killerInstinctPct) || (b.gold - a.gold) || (b.podiums - a.podiums);
    } else if (tab2SortField === 'clutch') {
      cmp = (b.conversionRatePct - a.conversionRatePct) || (b.finalsWon - a.finalsWon) || (b.finalsPlayed - a.finalsPlayed) || (b.trophies - a.trophies);
    }
    return tab2SortDirection === 'desc' ? cmp : -cmp;
  });

  const sortIcon = (field: Tab2SortField) => {
    if (tab2SortField !== field) {
      return '<i class="fa-solid fa-sort opacity-30 text-[9px] ml-1"></i>';
    }
    return tab2SortDirection === 'desc'
      ? '<i class="fa-solid fa-arrow-down-wide-short text-amber-400 text-[10px] ml-1"></i>'
      : '<i class="fa-solid fa-arrow-up-short-wide text-amber-400 text-[10px] ml-1"></i>';
  };

  return `
    <div class="px-3 py-2 rounded-xl border text-xs" style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-muted);">
      <p><strong class="font-bold" style="color: var(--text-main);">Cinismo, Podi &amp; Killer Instinct:</strong> Clicca sulle intestazioni delle colonne per ordinare alfabeticamente o per tasso podio, killer instinct e cinismo nelle finali.</p>
    </div>

    <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border);">
      <div class="px-2 sm:px-3 py-2 text-[10px] sm:text-[11px] uppercase font-bold tracking-wider grid grid-cols-[1fr_68px_60px_68px] sm:grid-cols-[1fr_120px_110px_120px] gap-1 sm:gap-2 items-center border-b select-none" style="border-color: var(--table-border); background: rgba(0,0,0,0.12); color: var(--text-muted);">
        <button type="button" onclick="changeTab2Sort('name')" class="flex items-center text-left hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider min-w-0">
          <span class="truncate">Allenatore</span>
          ${sortIcon('name')}
        </button>
        <button type="button" onclick="changeTab2Sort('podiumRate')" class="flex items-center justify-center hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="hidden sm:inline">Tasso Podio</span>
          <span class="sm:hidden">Podio</span>
          ${sortIcon('podiumRate')}
        </button>
        <button type="button" onclick="changeTab2Sort('killerInstinct')" class="flex items-center justify-center hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="hidden sm:inline">Killer Inst.</span>
          <span class="sm:hidden">Killer</span>
          ${sortIcon('killerInstinct')}
        </button>
        <button type="button" onclick="changeTab2Sort('clutch')" class="flex items-center justify-end hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="hidden sm:inline">Cinismo Finali</span>
          <span class="sm:hidden">Cinismo</span>
          ${sortIcon('clutch')}
        </button>
      </div>
      <div class="divide-y max-h-[195px] overflow-y-auto pr-0.5 sm:pr-1" style="border-color: var(--table-border); scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
        ${clutchSorted.map((p, idx) => `
          <div class="px-2 sm:px-3 py-1.5 grid grid-cols-[1fr_68px_60px_68px] sm:grid-cols-[1fr_120px_110px_120px] gap-1 sm:gap-2 items-center text-xs sm:text-sm hover:bg-white/5 transition">
            <!-- Allenatore -->
            <div class="min-w-0 flex items-center gap-1 sm:gap-1.5 pr-0.5">
              <span class="w-3.5 sm:w-4 text-center font-bold text-[10px] shrink-0 ${idx < 3 ? 'text-amber-400 font-black' : ''}" style="${idx >= 3 ? 'color: var(--text-muted);' : ''}">${idx + 1}</span>
              <div class="min-w-0 flex-1">
                <span class="font-bold block truncate text-xs sm:text-sm" style="color: var(--text-main);">${p.name}</span>
                <span class="text-[9px] sm:text-[10px] block truncate" style="color: var(--text-muted);">${p.years === 0 ? 'debuttante' : `${p.years} ann${p.years === 1 ? 'o' : 'i'}`}</span>
              </div>
            </div>

            <!-- Tasso Podio (PR%) -->
            <div class="text-center">
              <span class="font-mono font-bold text-[11px] sm:text-xs ${p.podiumRatePct >= 50 ? 'text-amber-400 font-black' : ''}" style="${p.podiumRatePct < 50 ? 'color: var(--text-main);' : ''}">
                ${p.podiumRatePct.toFixed(1)}%
              </span>
              <span class="block text-[8px] sm:text-[9px] font-mono" style="color: var(--text-muted);">${p.years > 0 ? `${p.podiums}/${p.years}` : '—'}</span>
            </div>

            <!-- Killer Instinct (KI%) -->
            <div class="text-center">
              <span class="font-mono font-bold text-[11px] sm:text-xs ${p.podiums === 0 ? 'opacity-40' : p.killerInstinctPct >= 60 ? 'text-emerald-400 font-black' : p.killerInstinctPct <= 25 ? 'text-orange-400' : ''}" style="${p.podiums > 0 && p.killerInstinctPct > 25 && p.killerInstinctPct < 60 ? 'color: var(--text-main);' : ''}">
                ${p.podiums > 0 ? `${p.killerInstinctPct.toFixed(0)}%` : '—'}
              </span>
              <span class="block text-[8px] sm:text-[9px] font-mono" style="color: var(--text-muted);">${p.podiums > 0 ? `${p.gold}/${p.podiums} ${p.gold === 1 ? 'oro' : 'ori'}` : '0 podi'}</span>
            </div>

            <!-- Cinismo Finali (CR%) -->
            <div class="text-right">
              <span class="font-mono font-bold text-[11px] sm:text-xs ${p.finalsPlayed === 0 ? 'opacity-40' : p.conversionRatePct >= 70 ? 'text-emerald-400 font-black' : p.conversionRatePct <= 35 && p.finalsPlayed >= 2 ? 'text-indigo-400 font-bold' : ''}" style="${p.finalsPlayed > 0 && (p.conversionRatePct > 35 || p.finalsPlayed < 2) && p.conversionRatePct < 70 ? 'color: var(--text-main);' : ''}">
                ${p.finalsPlayed > 0 ? `${p.conversionRatePct.toFixed(0)}%` : '—'}
              </span>
              <span class="block text-[8px] sm:text-[9px] font-mono" style="color: var(--text-muted);">${p.finalsPlayed > 0 ? `${p.finalsWon}/${p.finalsPlayed} v.` : '0 fin.'}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Collapsible Educational Info Box for Clutch & Podiums -->
    <div class="border rounded-xl overflow-hidden text-xs mt-2" style="border-color: var(--table-border); background: var(--table-surface);">
      <button type="button" onclick="toggleGuide('clutch-guide')" class="w-full px-3.5 py-2 flex items-center justify-between font-bold text-left transition hover:bg-white/5" style="color: var(--text-main);">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-circle-question text-amber-400 text-xs"></i>
          <span>Guida Matematica a Podi &amp; Cinismo</span>
        </div>
        <i id="clutch-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-xs" style="color: var(--text-muted);"></i>
      </button>
      <div id="clutch-guide-content" class="px-4 pb-4 pt-1 space-y-3 border-t hidden" style="border-color: var(--table-border); color: var(--text-muted);">
        <div>
          <div class="flex items-center justify-between">
            <strong class="font-semibold" style="color: var(--text-main);">Tasso di Presenza a Podio (PR%):</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">PR% = (Ori + Argenti + Bronzi) / Anni × 100</code>
          </div>
          <p class="mt-0.5">Misura la costanza al vertice nella stagione regolare. Valori ≥ 50% indicano un candidato permanente alle primissime posizioni della classifica.</p>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <strong class="font-semibold" style="color: var(--text-main);">Killer Instinct (KI%):</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">KI% = Scudetti / Podi × 100</code>
          </div>
          <p class="mt-0.5">Misura la letalità del podio: la capacità di convertire una stagione da vertice nel trionfo massimo (Scudetto) invece di accontentarsi dei piazzamenti (Argento o Bronzo). Se non ci sono podi, il valore è non definito (—).</p>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <strong class="font-semibold" style="color: var(--text-main);">Cinismo nelle Finali (CR%):</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">CR% = Coppe Vinte / Finali Coppe × 100</code>
          </div>
          <p class="mt-0.5">Rapporto di conversione nei trofei a scontro diretto secco (Coppa di Lega e Supercoppa). Misura la freddezza e la letalità quando c'è un trofeo in palio in una finale secca.</p>
        </div>
      </div>
    </div>
  `;
}
