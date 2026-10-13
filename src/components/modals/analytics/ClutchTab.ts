import type { LeagueConcentrationAnalysis, Tab2SortField, Tab2SortDirection } from '@/types';

export function renderClutchTab(
  analysis: LeagueConcentrationAnalysis,
  tab2SortField: Tab2SortField,
  tab2SortDirection: Tab2SortDirection
): string {
  const clutchSorted = [...analysis.profiles].sort((a, b) => {
    // Keep rookies at the bottom for metric sorts
    if (tab2SortField !== 'name') {
      if (a.years === 0 && b.years > 0) return 1;
      if (b.years === 0 && a.years > 0) return -1;
    }

    let cmp = 0;
    if (tab2SortField === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else if (tab2SortField === 'gci') {
      cmp = (b.globalClutchIndex - a.globalClutchIndex) || (b.killerInstinctPct - a.killerInstinctPct) || (b.conversionRatePct - a.conversionRatePct) || (b.trophies - a.trophies);
    } else if (tab2SortField === 'podiumRate') {
      cmp = (b.podiumRatePct - a.podiumRatePct) || (b.killerInstinctPct - a.killerInstinctPct) || (b.podiums - a.podiums) || (b.trophies - a.trophies);
    } else if (tab2SortField === 'killerInstinct') {
      cmp = (b.killerInstinctPct - a.killerInstinctPct) || (b.gold - a.gold) || (b.podiums - a.podiums);
    } else if (tab2SortField === 'clutch') {
      cmp = (b.conversionRatePct - a.conversionRatePct) || (b.finalsWon - a.finalsWon) || (b.finalsPlayed - a.finalsPlayed) || (b.trophies - a.trophies);
    }
    return tab2SortDirection === 'desc' ? cmp : -cmp;
  });

  // Highlight Cards Leaders
  const veteranProfiles = analysis.profiles.filter(p => p.years > 0);
  const topGciProfile = [...veteranProfiles].sort((a, b) => (b.globalClutchIndex - a.globalClutchIndex) || (b.trophies - a.trophies))[0];

  const finalistsWithExperience = analysis.profiles.filter(p => p.finalsPlayed >= 2);
  const eligibleFinalists = finalistsWithExperience.length > 0
    ? finalistsWithExperience
    : analysis.profiles.filter(p => p.finalsPlayed >= 1);
  const topFinalistProfile = [...eligibleFinalists].sort((a, b) => (b.conversionRatePct - a.conversionRatePct) || (b.finalsWon - a.finalsWon) || (b.finalsPlayed - a.finalsPlayed))[0];

  const topGciCardTitle = topGciProfile && topGciProfile.clutchTier === 'Glaciale'
    ? 'Mister Più Glaciale (Top GCI)'
    : 'Mister Più Cinico (Top GCI)';

  const sortIcon = (field: Tab2SortField) => {
    if (tab2SortField !== field) {
      return '<i class="fa-solid fa-sort opacity-30 text-[9px] ml-1"></i>';
    }
    return tab2SortDirection === 'desc'
      ? '<i class="fa-solid fa-arrow-down-wide-short text-amber-400 text-[10px] ml-1"></i>'
      : '<i class="fa-solid fa-arrow-up-short-wide text-amber-400 text-[10px] ml-1"></i>';
  };

  return `
    <!-- Top Highlight Cards (Option 2) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <!-- Card 1: Mister Più Cinico / Glaciale (Top GCI) -->
      <div class="p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-3 relative overflow-hidden" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">${topGciCardTitle}</span>
          </div>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-sm sm:text-base font-black truncate" style="color: var(--text-main);">${topGciProfile ? topGciProfile.name : '—'}</span>
            ${topGciProfile ? `
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1" style="background: ${topGciProfile.clutchColor}20; color: ${topGciProfile.clutchColor}; border: 1px solid ${topGciProfile.clutchColor}40;">
                <span>${topGciProfile.clutchIcon}</span>
                <span>${topGciProfile.clutchLabel}</span>
              </span>
            ` : ''}
          </div>
          <span class="block text-[9px] mt-1 truncate" style="color: var(--text-muted);">
            70% Scudetto (${topGciProfile ? topGciProfile.gold : 0} ori) + 30% Coppe (${topGciProfile ? topGciProfile.finalsWon : 0} v.) · Bayesian K=1.0
          </span>
        </div>
        <div class="text-right shrink-0">
          <span class="text-lg sm:text-2xl font-black font-mono block text-emerald-400">
            ${topGciProfile ? `${topGciProfile.globalClutchIndex.toFixed(1)}%` : '—'}
          </span>
          <span class="text-[9px] font-bold uppercase tracking-wider block" style="color: var(--text-muted);">Score GCI</span>
        </div>
      </div>

      <!-- Card 2: Cecchino delle Finali (Top CR%) -->
      <div class="p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-3 relative overflow-hidden" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Specialista Finali Secche (Top CR%)</span>
          </div>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-sm sm:text-base font-black truncate" style="color: var(--text-main);">${topFinalistProfile ? topFinalistProfile.name : '—'}</span>
            ${topFinalistProfile ? `
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);">
                <span>🏆</span>
                <span>${topFinalistProfile.conversionRatePct.toFixed(0)}%</span>
              </span>
            ` : ''}
          </div>
          <span class="block text-[9px] mt-1 truncate" style="color: var(--text-muted);">
            ${topFinalistProfile ? `${topFinalistProfile.finalsWon} v. su ${topFinalistProfile.finalsPlayed} fin. (Coppa &amp; Supercoppa)` : 'Nessuna finale'}
          </span>
        </div>
        <div class="text-right shrink-0">
          <span class="text-lg sm:text-2xl font-black font-mono block text-amber-400">
            ${topFinalistProfile ? `${topFinalistProfile.finalsWon}/${topFinalistProfile.finalsPlayed}` : '—'}
          </span>
          <span class="text-[9px] font-bold uppercase tracking-wider block" style="color: var(--text-muted);">Finali Vinte</span>
        </div>
      </div>
    </div>

    <!-- Diagnostic Helper Banner 
    <div class="px-3 py-2 rounded-xl border text-xs" style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-muted);">
      <p><strong class="font-bold" style="color: var(--text-main);">Cinismo, Podi &amp; Global Clutch Index:</strong> Clicca sulle intestazioni di colonna per ordinare per indice GCI complessivo, tasso podio, killer instinct o finali di coppa.</p>
    </div> -->

    <!-- Metrics Table -->
    <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border);">
      <div class="px-2 sm:px-3 py-2 text-[10px] sm:text-[11px] uppercase font-bold tracking-wider grid grid-cols-[1fr_48px_44px_46px_74px] sm:grid-cols-[1fr_95px_90px_95px_120px] gap-1 sm:gap-2 items-center border-b select-none" style="border-color: var(--table-border); background: rgba(0,0,0,0.12); color: var(--text-muted);">
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
        <button type="button" onclick="changeTab2Sort('clutch')" class="flex items-center justify-center hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="hidden sm:inline">Cinismo Fin.</span>
          <span class="sm:hidden">Finali</span>
          ${sortIcon('clutch')}
        </button>
        <button type="button" onclick="changeTab2Sort('gci')" class="flex items-center justify-end hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="hidden sm:inline">Indice GCI</span>
          <span class="sm:hidden">GCI</span>
          ${sortIcon('gci')}
        </button>
      </div>
      <div class="divide-y max-h-[195px] overflow-y-auto pr-0.5 sm:pr-1" style="border-color: var(--table-border); scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
        ${clutchSorted.map((p, idx) => `
          <div class="px-2 sm:px-3 py-1.5 grid grid-cols-[1fr_48px_44px_46px_74px] sm:grid-cols-[1fr_95px_90px_95px_120px] gap-1 sm:gap-2 items-center text-xs sm:text-sm hover:bg-white/5 transition">
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
            <div class="text-center">
              <span class="font-mono font-bold text-[11px] sm:text-xs ${p.finalsPlayed === 0 ? 'opacity-40' : p.conversionRatePct >= 70 ? 'text-emerald-400 font-black' : p.conversionRatePct <= 35 && p.finalsPlayed >= 2 ? 'text-indigo-400 font-bold' : ''}" style="${p.finalsPlayed > 0 && (p.conversionRatePct > 35 || p.finalsPlayed < 2) && p.conversionRatePct < 70 ? 'color: var(--text-main);' : ''}">
                ${p.finalsPlayed > 0 ? `${p.conversionRatePct.toFixed(0)}%` : '—'}
              </span>
              <span class="block text-[8px] sm:text-[9px] font-mono" style="color: var(--text-muted);">${p.finalsPlayed > 0 ? `${p.finalsWon}/${p.finalsPlayed} v.` : '0 fin.'}</span>
            </div>

            <!-- Global Clutch Index (GCI) -->
            <div class="text-right">
              <span class="font-mono font-black text-[11px] sm:text-xs block" style="color: ${p.clutchColor};">
                ${p.years === 0 ? '—' : `${p.globalClutchIndex.toFixed(1)}%`}
              </span>
              <span class="block text-[8px] sm:text-[9px] font-bold truncate" style="color: ${p.clutchColor};">
                ${p.clutchIcon} <span>${p.clutchLabel}</span>
              </span>
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
          <span>Guida Matematica a Podi &amp; Cinismo (GCI)</span>
        </div>
        <i id="clutch-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-xs" style="color: var(--text-muted);"></i>
      </button>
      <div id="clutch-guide-content" class="px-4 pb-4 pt-1 space-y-3 border-t hidden" style="border-color: var(--table-border); color: var(--text-muted);">
        <div>
          <div class="flex items-center justify-between">
            <strong class="font-semibold" style="color: var(--text-main);">Global Clutch Index (GCI):</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">GCI = (0.70 × KI_bayes + 0.30 × CR_bayes) × 100</code>
          </div>
          <p class="mt-0.5">Sintetizza in un unico indicatore pesato la letalità nelle volate scudetto (70%) e la freddezza nelle finali secche a eliminazione diretta (30%). Include regolarizzazione Bayesiana (<code class="font-mono text-[10px]">K=1.0</code>, prior campionato <code class="font-mono text-[10px]">0.33</code>, prior coppe <code class="font-mono text-[10px]">0.50</code>) per stabilizzare i piccoli campioni:</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">
            <div class="p-1.5 rounded border text-[10px]" style="border-color: var(--table-border); background: rgba(14,165,233,0.06);">
              <span class="font-bold text-sky-400 block">❄️ Glaciale (&ge; 70%)</span>
              <span class="block" style="color: var(--text-muted);">Traguardo leggendario, letalità quasi infallibile.</span>
            </div>
            <div class="p-1.5 rounded border text-[10px]" style="border-color: var(--table-border); background: rgba(52,211,153,0.06);">
              <span class="font-bold text-emerald-300 block">🏹 Cinico (55-69.9%)</span>
              <span class="block" style="color: var(--text-muted);">Freddezza d'élite nelle volate e nelle finali.</span>
            </div>
            <div class="p-1.5 rounded border text-[10px]" style="border-color: var(--table-border); background: rgba(6,182,212,0.06);">
              <span class="font-bold text-cyan-400 block">⚖️ Equilibrato (45-54.9%)</span>
              <span class="block" style="color: var(--text-muted);">Rendimento solido e bilanciato al vertice.</span>
            </div>
            <div class="p-1.5 rounded border text-[10px]" style="border-color: var(--table-border); background: rgba(245,158,11,0.06);">
              <span class="font-bold text-amber-400 block">😶‍🌫️ Incerto (25-44.9%)</span>
              <span class="block" style="color: var(--text-muted);">Fatica a capitalizzare le occasioni importanti.</span>
            </div>
            <div class="p-1.5 rounded border text-[10px]" style="border-color: var(--table-border); background: rgba(239,68,68,0.06);">
              <span class="font-bold text-rose-400 block">🥶 Choker (&lt; 25%)</span>
              <span class="block" style="color: var(--text-muted);">Frequenti crolli all'atto conclusivo o argenti non convertiti.</span>
            </div>
            <div class="p-1.5 rounded border text-[10px]" style="border-color: var(--table-border); background: rgba(148,163,184,0.06);">
              <span class="font-bold text-slate-400 block">🌱 Debuttante</span>
              <span class="block" style="color: var(--text-muted);">Nessuna stagione conclusa per calcolo storico.</span>
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <strong class="font-semibold" style="color: var(--text-main);">Tasso di Presenza a Podio (PR%):</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">PR% = (Ori + Argenti + Bronzi) / Anni × 100</code>
          </div>
          <p class="mt-0.5">Misura la costanza al vertice nella stagione regolare. Valori &ge; 50% indicano un candidato permanente alle primissime posizioni della classifica.</p>
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
