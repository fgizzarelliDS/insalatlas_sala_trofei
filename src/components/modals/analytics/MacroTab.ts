import type { LeagueConcentrationAnalysis, ManagerAnalyticsProfile } from '@/types';

export function renderMacroTab(
  analysis: LeagueConcentrationAnalysis,
  isPrestige: boolean,
  tableProfiles: ManagerAnalyticsProfile[]
): string {
  const activeGini = isPrestige ? analysis.giniPrestige : analysis.giniTrophies;
  const activeGiniLabel = isPrestige ? 'Gini Prestigio' : 'Gini Trofei';
  const activeCR3 = isPrestige ? analysis.cr3PrestigePct : analysis.cr3Pct;
  const activeCR3Sub = isPrestige ? 'del prestigio ai primi 3' : 'dei titoli ai primi 3';
  const activeTop3Names = isPrestige ? analysis.top3PrestigeNames : analysis.top3SilverwareNames;
  const activeTop3Label = activeTop3Names.length > 0 ? activeTop3Names.join(', ') : 'Nessuno';
  const activeHHI = isPrestige ? analysis.hhiPrestige : analysis.hhi;
  const activeHHIDesc = isPrestige ? analysis.hhiPrestigeDescription : analysis.hhiDescription;
  const activeEntropy = isPrestige ? analysis.relativeEntropyPrestige : analysis.relativeEntropy;

  return `
    <!-- Diagnostic Banner -->
    <div class="p-3 sm:px-3.5 sm:py-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
      <div class="relative">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${analysis.tierColor};"></span>
          <span class="text-xs sm:text-sm uppercase tracking-wider font-black" style="color: ${analysis.tierColor};">${analysis.tierTitle}</span>
          <button 
            type="button" 
            id="btn-tier-info"
            onclick="toggleTierInfo(event)" 
            class="w-4 h-4 rounded-full flex items-center justify-center transition cursor-pointer hover:bg-white/10" 
            title="Informazioni sul Tier di Lega" 
            style="color: var(--text-muted);"
          >
            <i class="fa-solid fa-circle-info text-[11px]"></i>
          </button>
        </div>
        <p class="text-xs mt-0.5 leading-snug" style="color: var(--text-main);">${analysis.tierDescription}</p>

        <!-- Floating Tier Info Popover -->
        <div 
          id="tier-info-popover" 
          class="hidden absolute z-30 top-full left-0 mt-2 w-[calc(100vw-3.5rem)] sm:w-[480px] max-w-full p-3 sm:p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md text-xs transition-all duration-200 max-h-[calc(100vh-220px)] sm:max-h-[350px] overflow-y-auto pr-1"
          style="background: var(--modal-bg); border-color: var(--table-border); color: var(--text-main); scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;"
          onclick="event.stopPropagation()"
        >
          <!-- Popover Header -->
          <div class="flex items-center justify-between pb-1.5 border-b mb-2" style="border-color: var(--table-border);">
            <div class="flex items-center gap-1.5 font-bold">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${analysis.tierColor};"></span>
              <span class="text-[11px] uppercase tracking-wider font-black" style="color: ${analysis.tierColor};">${analysis.tierTitle}</span>
            </div>
            <button type="button" onclick="closeTierInfo()" class="w-5 h-5 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition" style="color: var(--text-main);">
              <i class="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>

          <!-- Current League Explanation -->
          <div class="p-2 rounded-xl mb-2" style="background: var(--table-surface); border: 1px solid var(--table-border);">
            <span class="block text-[9px] uppercase font-bold tracking-wider mb-0.5" style="color: var(--text-muted);">Perché questo Tier?</span>
            <p class="text-[11px] leading-snug">
              ${isPrestige
      ? `Nella visualizzazione <strong>Prestigio (SPI)</strong>, i primi 3 club accentrano il <strong class="text-amber-400 font-mono">${analysis.cr3PrestigePct}%</strong> del prestigio totale e l'indice Gini Prestigio è <strong class="text-amber-400 font-mono">${analysis.giniPrestige.toFixed(2)}</strong>, configurando una <strong>Lega a Tre Velocità</strong> guidata da potenze storiche.`
      : `Nel conteggio dei <strong>Trofei Assoluti (1:1)</strong>, i primi 3 club accentrano il <strong class="text-amber-400 font-mono">${analysis.cr3Pct}%</strong> delle bacheche e l'indice antitrust <strong class="text-amber-400 font-mono">HHI (${analysis.hhi})</strong> supera la soglia di moderata concentrazione (&ge; 1800).`
    }
            </p>
          </div>

          <!-- 4 Tiers Quick Overview -->
          <span class="block text-[9px] uppercase font-bold tracking-wider mb-1" style="color: var(--text-muted);">I 4 Stadi di Competitività</span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
            <div class="p-1.5 rounded-lg border flex items-start gap-1.5" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
              <span class="w-2 h-2 rounded-full bg-emerald-400 mt-0.5 shrink-0"></span>
              <div>
                <strong class="text-emerald-400 font-bold block">Far West:</strong>
                <span class="block text-[9px] leading-tight" style="color: var(--text-muted);">G &le; 0.40, CR3 &le; 45%, HHI &lt; 1400. Anarchia e massima alternanza.</span>
              </div>
            </div>
            <div class="p-1.5 rounded-lg border flex items-start gap-1.5" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
              <span class="w-2 h-2 rounded-full bg-blue-400 mt-0.5 shrink-0"></span>
              <div>
                <strong class="text-blue-400 font-bold block">Competizione Aperta:</strong>
                <span class="block text-[9px] leading-tight" style="color: var(--text-muted);">Equilibrio intermedio con rotazione dei campioni e classe media attiva.</span>
              </div>
            </div>
            <div class="p-1.5 rounded-lg border flex items-start gap-1.5" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
              <span class="w-2 h-2 rounded-full bg-amber-400 mt-0.5 shrink-0"></span>
              <div>
                <strong class="text-amber-400 font-bold block">Lega a Tre Velocità:</strong>
                <span class="block text-[9px] leading-tight" style="color: var(--text-muted);">G &gt; 0.55 o CR3 &ge; 58% o HHI &ge; 1800. Oligarchia di 3-4 potenze.</span>
              </div>
            </div>
            <div class="p-1.5 rounded-lg border flex items-start gap-1.5" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
              <span class="w-2 h-2 rounded-full bg-rose-400 mt-0.5 shrink-0"></span>
              <div>
                <strong class="text-rose-400 font-bold block">Feudalesimo Assoluto:</strong>
                <span class="block text-[9px] leading-tight" style="color: var(--text-muted);">(G &gt; 0.75 e CR3 &ge; 72%) o HHI &ge; 2500. Monopolio di 1-2 club.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 text-right shrink-0 self-end sm:self-center">
        <div class="px-2.5 py-1 rounded-lg border text-center" style="border-color: var(--table-border); background: var(--table-surface);">
          <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">${activeGiniLabel}</span>
          <span class="text-sm sm:text-base font-black text-amber-400">${activeGini.toFixed(2)}</span>
        </div>
        <div class="px-2.5 py-1 rounded-lg border text-center" style="border-color: var(--table-border); background: var(--table-surface);">
          <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">Gini Rating</span>
          <span class="text-sm sm:text-base font-black text-blue-400">${analysis.giniRating.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Core Metrics Matrix -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div class="p-2 sm:p-2.5 rounded-lg border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
        <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">${isPrestige ? 'Prestigio Top 3 (CR3)' : 'Top 3 (CR3)'}</span>
        <span class="text-base sm:text-lg font-black text-amber-400">${activeCR3}%</span>
        <span class="block text-[9px] mt-0.5 truncate" style="color: var(--text-muted);">${activeCR3Sub}</span>
      </div>

      <div class="p-2 sm:p-2.5 rounded-lg border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
        <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">Entropia (H_rel)</span>
        <span class="text-base sm:text-lg font-black text-emerald-400">${activeEntropy.toFixed(2)}</span>
        <span class="block text-[9px] mt-0.5" style="color: var(--text-muted);">1.0 = Max Parità</span>
      </div>

      <div class="p-2 sm:p-2.5 rounded-lg border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
        <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">${isPrestige ? 'Indice HHI (Prestigio)' : 'Indice HHI'}</span>
        <span class="text-base sm:text-lg font-black text-amber-400">${activeHHI}</span>
        <span class="block text-[9px] mt-0.5 truncate" style="color: var(--text-muted);">${activeHHIDesc}</span>
      </div>

      <div class="p-2 sm:p-2.5 rounded-lg border text-center" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
        <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">Malus Lega (CR3)</span>
        <span class="text-base sm:text-lg font-black text-rose-400">${analysis.cr3DishonorPct}%</span>
        <span class="block text-[9px] mt-0.5 truncate" style="color: var(--text-muted);">Cuc. &amp; Cart. nei 3 peggiori</span>
      </div>
    </div>

    <!-- Stacked Dominance Bar -->
    <div>
      <div class="flex items-center justify-between text-[11px] mb-1" style="color: var(--text-main);">
        <span class="font-bold">Egemoni del Torneo (Top 3): <span class="text-amber-400 font-semibold">${activeTop3Label}</span></span>
        <span class="font-mono font-bold">${activeCR3}%</span>
      </div>
      <div class="w-full h-2 rounded-full overflow-hidden flex bg-white/5 border" style="border-color: var(--table-border);">
        <div style="width: ${activeCR3}%; background-color: ${analysis.tierColor};" class="h-full transition-all duration-500"></div>
        <div style="width: ${100 - activeCR3}%; background: rgba(255,255,255,0.15);" class="h-full"></div>
      </div>
    </div>

    <!-- Standings Table Sub-header with Segmented Pill Toggle -->
    <div class="flex items-center justify-between gap-2 mt-2 mb-1">
      <span class="text-xs font-bold" style="color: var(--text-main);">Classifica di Rendimento</span>
      <div class="inline-flex p-0.5 rounded-lg border text-[10px]" style="background: rgba(0,0,0,0.15); border-color: var(--table-border);">
        <button 
          type="button" 
          onclick="setMacroMetricMode('prestige')" 
          class="px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1.5 ${isPrestige ? 'shadow-sm' : 'hover:bg-white/5'}"
          style="${isPrestige
      ? 'background-color: var(--btn-bg); color: var(--btn-text); border: 1px solid var(--btn-border);'
      : 'color: var(--text-muted); background: transparent; border: 1px solid transparent;'}"
          title="Ponderazione per difficoltà: Scudetto (3.0), Coppa (1.5), Supercoppa (0.75), Mundialito (0.50)"
        >
          <i class="fa-solid fa-crown text-[9px]"></i>
          <span>Prestigio</span>
        </button>
        <button 
          type="button" 
          onclick="setMacroMetricMode('raw')" 
          class="px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1.5 ${!isPrestige ? 'shadow-sm' : 'hover:bg-white/5'}"
          style="${!isPrestige
      ? 'background-color: var(--btn-bg); color: var(--btn-text); border: 1px solid var(--btn-border);'
      : 'color: var(--text-muted); background: transparent; border: 1px solid transparent;'}"
          title="Conteggio complessivo non ponderato dei titoli maggiori (1:1)"
        >
          <i class="fa-solid fa-trophy text-[9px]"></i>
          <span>Trofei Assoluti</span>
        </button>
      </div>
    </div>

    <!-- Silverware & Efficiency Share Table -->
    <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border);">
      <div class="px-2.5 sm:px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider grid grid-cols-[1fr_82px_64px] sm:grid-cols-[1fr_140px_90px] items-center border-b" style="border-color: var(--table-border); background: rgba(0,0,0,0.12); color: var(--text-muted);">
        <span class="truncate">Allenatore</span>
        <span class="text-center">${isPrestige ? '<span class="hidden sm:inline">Punti Prestigio</span><span class="sm:hidden">Prestigio</span>' : 'Trofei'}</span>
        <span class="text-right"><span class="hidden sm:inline">Quota (%)</span><span class="sm:hidden">Quota</span></span>
      </div>
      <div class="divide-y max-h-[145px] overflow-y-auto pr-0.5 sm:pr-1" style="border-color: var(--table-border); scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
        ${tableProfiles.map((p, idx) => `
          <div class="px-2.5 sm:px-3 py-1.5 grid grid-cols-[1fr_82px_64px] sm:grid-cols-[1fr_140px_90px] items-center text-xs sm:text-sm hover:bg-white/5 transition">
            <div class="flex items-center gap-1.5 sm:gap-2 min-w-0 pr-1 sm:pr-2">
              <span class="w-3.5 sm:w-4 text-center font-bold text-[10px] sm:text-[11px] shrink-0 ${idx < 3 ? 'text-amber-400 font-black' : ''}" style="${idx >= 3 ? 'color: var(--text-muted);' : ''}">${idx + 1}</span>
              <span class="font-bold truncate" style="color: var(--text-main);">${p.name}</span>
              <span class="text-[11px] shrink-0 hidden sm:inline" style="color: var(--text-muted);">
                ${isPrestige ? `(${p.trophies} tit. | ${p.prestigeScore} pt)` : `(${p.trophies} titol${p.trophies === 1 ? 'o' : 'i'})`}
              </span>
            </div>
            <span class="font-mono text-[11px] sm:text-xs text-center" style="color: var(--text-muted);">
              ${isPrestige
          ? `<span class="hidden sm:inline">${p.prestigeEfficiency} pt/anno</span><span class="sm:hidden">${p.prestigeEfficiency} pt/a</span>`
          : `<span class="hidden sm:inline">${p.efficiency} tit/anno</span><span class="sm:hidden">${p.efficiency} t/a</span>`
        }
            </span>
            <span class="font-mono font-bold text-xs text-right" style="color: var(--text-main);">
              ${(isPrestige ? p.prestigeSharePct : p.trophySharePct).toFixed(1)}%
            </span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Collapsible Educational Info Box for Macro Econometrics -->
    <div class="border rounded-xl overflow-hidden text-xs mt-2" style="border-color: var(--table-border); background: var(--table-surface);">
      <button type="button" onclick="toggleGuide('macro-guide')" class="w-full px-3.5 py-2 flex items-center justify-between font-bold text-left transition hover:bg-white/5" style="color: var(--text-main);">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-circle-question text-amber-400 text-xs"></i>
          <span>Guida Matematica agli Indici Econometrici</span>
        </div>
        <i id="macro-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-xs" style="color: var(--text-muted);"></i>
      </button>
      <div id="macro-guide-content" class="px-4 pb-4 pt-1 space-y-3 border-t hidden" style="border-color: var(--table-border); color: var(--text-muted);">
        <div>
          <div class="flex items-center justify-between">
            <strong class="font-semibold" style="color: var(--text-main);">Indice di Prestigio (SPI):</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">3.0·Scud + 1.5·Coppa + 0.75·SC + 0.50·Mund</code>
          </div>
          <p class="mt-0.5">Pondera le competizioni in base alla loro difficoltà strutturale, distinguendo le maratone di 38 turni dalla varianza delle coppe a gara secca. Il selettore sopra la classifica consente di alternare la vista tra Prestigio (SPI) e Trofei Assoluti.</p>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <strong class="font-semibold" style="color: var(--text-main);">Gini Prestigio / Trofei:</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">G = (2 ∑ i·Y_i) / (n ∑ Y_i) - (n+1)/n</code>
          </div>
          <p class="mt-0.5">Misura la disuguaglianza nella distribuzione del prestigio ponderato o dei titoli assoluti. Varia tra 0.0 (parità assoluta) e 1.0 (monopolio totale).</p>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <strong class="font-semibold" style="color: var(--text-main);">Gini Rating (G_rating):</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">R'_i = R_i - min(0, min R_j)</code>
          </div>
          <p class="mt-0.5">Misura la concentrazione del punteggio storico normalizzato su scala non-negativa (include podi, coppe, cucchiai e malus playout).</p>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <strong class="font-semibold" style="color: var(--text-main);">Entropia Relativa di Informazione (H_rel):</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">H_rel = (-∑ p_i ln p_i) / ln(n)</code>
          </div>
          <p class="mt-0.5">Indica il grado di dispersione informativa dei titoli (1.0 = massima alternanza e parità fra tutti i partecipanti, 0.0 = accentramento estremo).</p>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <strong class="font-semibold" style="color: var(--text-main);">Indice HHI (Herfindahl-Hirschman):</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">HHI = ∑ (Quota_i %)^2</code>
          </div>
          <p class="mt-0.5">Misura antitrust standard di mercato: &lt;1500 (mercato aperto), 1500-2500 (moderata concentrazione), &gt;2500 (oligopolio dinastico).</p>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <strong class="font-semibold" style="color: var(--text-main);">Malus di Lega (CR3 Disonori):</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">(Top 3 Disonori / Totale Disonori) × 100</code>
          </div>
          <p class="mt-0.5">Percentuale di Cucchiai di Legno e Cartonati subiti dai 3 manager più penalizzati. Misura se le sventure sono concentrate su pochi o distribuite democraticamente.</p>
        </div>
      </div>
    </div>
  `;
}
