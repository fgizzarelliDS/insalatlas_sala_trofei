import type {
  AnalyticsTab,
  Tab2SortField,
  Tab2SortDirection,
  MacroMetricMode,
  ChronologySubView,
  ChronologySortField,
  SeasonSortField,
  ManagerFilterMode
} from '@/types';
import { state } from '@/state';
import {
  computeLeagueConcentration,
  computeManagerTrajectoryMetrics,
  computeSeasonalParityMetrics
} from '@/analytics';

/**
 * Builds and renders the multi-tab HTML inside #concentration-modal-content
 */
export function renderAnalyticsModalDOM(
  currentTab: AnalyticsTab,
  currentMacroMetricMode: MacroMetricMode,
  tab2SortField: Tab2SortField,
  tab2SortDirection: Tab2SortDirection,
  currentChronologySubView: ChronologySubView = 'managers',
  chronologySortField: ChronologySortField = 'avg_rank',
  chronologySortDirection: 'asc' | 'desc' = 'asc',
  seasonSortField: SeasonSortField = 'season',
  seasonSortDirection: 'asc' | 'desc' = 'desc',
  managerFilterMode: ManagerFilterMode = 'all'
): void {
  const container = document.getElementById('concentration-modal-content');
  if (!container) return;

  const analysis = computeLeagueConcentration(state.managers);
  const isPrestige = currentMacroMetricMode === 'prestige';

  const activeGini = isPrestige ? analysis.giniPrestige : analysis.giniTrophies;
  const activeGiniLabel = isPrestige ? 'Gini Prestigio' : 'Gini Trofei';
  const activeCR3 = isPrestige ? analysis.cr3PrestigePct : analysis.cr3Pct;
  const activeCR3Sub = isPrestige ? 'del prestigio ai primi 3' : 'dei titoli ai primi 3';
  const activeTop3Names = isPrestige ? analysis.top3PrestigeNames : analysis.top3SilverwareNames;
  const activeTop3Label = activeTop3Names.length > 0 ? activeTop3Names.join(', ') : 'Nessuno';
  const activeHHI = isPrestige ? analysis.hhiPrestige : analysis.hhi;
  const activeHHIDesc = isPrestige ? analysis.hhiPrestigeDescription : analysis.hhiDescription;
  const activeEntropy = isPrestige ? analysis.relativeEntropyPrestige : analysis.relativeEntropy;

  const tableProfiles = isPrestige
    ? [...analysis.profiles].sort((a, b) => b.prestigeScore - a.prestigeScore || b.prestigeEfficiency - a.prestigeEfficiency)
    : [...analysis.profiles].sort((a, b) => b.trophies - a.trophies || b.efficiency - a.efficiency);

  // Sub-tab Navigation button generator
  const tabButton = (id: AnalyticsTab, label: string, icon: string) => {
    const isActive = currentTab === id;
    return `
      <button 
        type="button" 
        onclick="switchAnalyticsTab('${id}')" 
        class="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition shadow-sm ${isActive ? '' : 'hover:bg-white/5'}"
        style="${isActive
        ? 'background-color: var(--btn-bg); color: var(--btn-text); border: 1px solid var(--btn-border);'
        : 'color: var(--text-muted); background: transparent; border: 1px solid transparent;'
      }"
      >
        <i class="${icon} text-[10px] sm:text-xs"></i>
        <span class="truncate">${label}</span>
      </button>
    `;
  };

  let tabContentHTML = '';

  // TAB 1: Macro Balance & Econometrics
  if (currentTab === 'macro') {
    tabContentHTML = `
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

  // TAB 2: Clutch vs Bottler & Podiums
  else if (currentTab === 'clutch') {
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

    tabContentHTML = `
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
                  <span class="text-[9px] sm:text-[10px] block truncate" style="color: var(--text-muted);">${p.years} ann${p.years === 1 ? 'o' : 'i'}</span>
                </div>
              </div>

              <!-- Tasso Podio (PR%) -->
              <div class="text-center">
                <span class="font-mono font-bold text-[11px] sm:text-xs ${p.podiumRatePct >= 50 ? 'text-amber-400 font-black' : ''}" style="${p.podiumRatePct < 50 ? 'color: var(--text-main);' : ''}">
                  ${p.podiumRatePct.toFixed(1)}%
                </span>
                <span class="block text-[8px] sm:text-[9px] font-mono" style="color: var(--text-muted);">${p.podiums}/${p.years}</span>
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

  // TAB 3: Risk Archetypes & Feast-or-Famine
  else if (currentTab === 'risk') {
    tabContentHTML = `
      <div class="px-3 py-2 rounded-xl border text-xs" style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-muted);">
        <p><strong class="font-bold" style="color: var(--text-main);">Archetipi &amp; Filosofie di Roster:</strong> Analisi di coda per misurare la volatilità estrema di ciascun mister (Scudetti vs Retrocessioni e Playout) tramite regolarizzazione Bayesiana e Net Tail Skew.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 h-[238px] max-h-[238px] overflow-y-auto pr-1 snap-y snap-mandatory scroll-smooth" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
        ${analysis.profiles.map(p => `
          <div class="px-2.5 py-1.5 rounded-xl border flex flex-col justify-between snap-start" style="height: 74px; background: var(--table-surface); border-color: var(--table-border);">
            <div class="flex items-center justify-between gap-1.5 min-w-0">
              <span class="font-bold text-xs sm:text-sm truncate" style="color: var(--text-main);">${p.name}</span>
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0" style="background: ${p.archetypeColor}20; color: ${p.archetypeColor}; border: 1px solid ${p.archetypeColor}40;">
                <i class="fa-solid ${p.archetypeIcon} text-[8px]"></i>
                ${p.archetypeTag}
              </span>
            </div>
            <div class="grid grid-cols-3 gap-1 text-[10px] border-t pt-1 mt-1" style="border-color: var(--table-border); color: var(--text-muted);">
              <div>
                <span class="block text-[8px] uppercase font-bold opacity-60 leading-none mb-0.5 truncate">FF Bayes</span>
                <span class="font-mono font-bold text-xs leading-none" style="color: var(--text-main);">${p.smoothedFeastOrFamine.toFixed(2)}</span>
              </div>
              <div class="text-center">
                <span class="block text-[8px] uppercase font-bold opacity-60 leading-none mb-0.5 truncate">Net Skew</span>
                <span class="font-mono font-bold text-xs leading-none ${p.netTailSkew > 0 ? 'text-emerald-400 font-bold' : p.netTailSkew < 0 ? 'text-rose-400 font-bold' : ''}">${p.netTailSkew > 0 ? '+' : ''}${p.netTailSkew.toFixed(2)}</span>
              </div>
              <div class="text-right">
                <span class="block text-[8px] uppercase font-bold opacity-60 leading-none mb-0.5 truncate">Indice NTI</span>
                <span class="font-mono font-bold text-xs leading-none block" style="color: ${p.polarityColor};">
                  <i class="fa-solid ${p.polarityIcon} text-[8px] mr-0.5"></i>${p.netTailIndex > 0 ? '+' : ''}${p.netTailIndex.toFixed(2)}
                </span>
                <span class="block text-[8px] font-semibold leading-tight truncate mt-0.5" style="color: ${p.polarityColor};">${p.polarityLabel}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Collapsible Educational Info Box for Risk Profiles & Archetypes -->
      <div class="border rounded-xl overflow-hidden text-xs mt-2" style="border-color: var(--table-border); background: var(--table-surface);">
        <button type="button" onclick="toggleGuide('risk-guide')" class="w-full px-3.5 py-2 flex items-center justify-between font-bold text-left transition hover:bg-white/5" style="color: var(--text-main);">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-circle-question text-amber-400 text-xs"></i>
            <span>Guida agli Archetipi &amp; Indici di Coda (FF, NTS, NTI)</span>
          </div>
          <i id="risk-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-xs" style="color: var(--text-muted);"></i>
        </button>
        <div id="risk-guide-content" class="px-4 pb-4 pt-2 space-y-3.5 border-t hidden" style="border-color: var(--table-border); color: var(--text-muted);">
          
          <!-- Feast-or-Famine Hero Banner -->
          <div class="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3" style="border-color: var(--table-border); background: rgba(0,0,0,0.03);">
            <div>
              <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Indici di Coda &amp; Volatilità</span>
              <strong class="text-xs sm:text-sm font-bold block" style="color: var(--text-main);">Feast-or-Famine (FF̃), Net Skew (NTS) &amp; Net Tail Index (NTI)</strong>
              <p class="text-[11px] mt-0.5 leading-relaxed" style="color: var(--text-muted);">
                La regolarizzazione Bayesiana stabilizza gli estremi verso la media di lega (${analysis.leagueAverageFF.toFixed(2)}/anno). Il Net Tail Skew misura lo sbilanciamento tra trionfi e baratro (con prior M=1.5). L'indice NTI sintetizza magnitudo e polarità in 5 profili comportamentali.
              </p>
            </div>
            <div class="shrink-0 flex flex-col gap-1.5 self-start sm:self-center font-mono text-[9px] text-center">
              <div class="px-2 py-0.5 rounded-lg border font-bold" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                FF̃ = (Coda + 2 × FF̄) / (Anni + 2)
              </div>
              <div class="px-2 py-0.5 rounded-lg border font-bold" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                NTS = (Feast - Disaster) / (Coda + 1.5)
              </div>
              <div class="px-2 py-0.5 rounded-lg border font-bold" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                NTI = FF̃ × NTS ∈ [-1.0, +1.0]
              </div>
            </div>
          </div>

          <!-- NTI Tiers Summary -->
          <div class="border rounded-xl p-3" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
            <span class="block text-[10px] uppercase font-bold tracking-wider mb-2" style="color: var(--text-main);">Fasce di Rischio NTI (Net Tail Index)</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div class="flex items-center gap-2 p-1.5 rounded-lg border" style="border-color: var(--table-border); background: var(--table-surface);">
                <i class="fa-solid fa-bolt text-emerald-400 text-xs shrink-0"></i>
                <div>
                  <strong style="color: #10b981;">Cannibale Assoluto</strong> (NTI &gt; +0.30)
                  <p class="text-[10px] opacity-75">Alta volatilità tutta orientata al trionfo</p>
                </div>
              </div>
              <div class="flex items-center gap-2 p-1.5 rounded-lg border" style="border-color: var(--table-border); background: var(--table-surface);">
                <i class="fa-solid fa-crosshairs text-emerald-400 text-xs shrink-0"></i>
                <div>
                  <strong style="color: #34d399;">Attaccante Efficace</strong> (+0.08 .. +0.30)
                  <p class="text-[10px] opacity-75">Rischia e ottiene più vittorie che baratro</p>
                </div>
              </div>
              <div class="flex items-center gap-2 p-1.5 rounded-lg border" style="border-color: var(--table-border); background: var(--table-surface);">
                <i class="fa-solid fa-scale-balanced text-slate-400 text-xs shrink-0"></i>
                <div>
                  <strong style="color: #94a3b8;">Neutro / Bilanciato</strong> (-0.08 .. +0.08)
                  <p class="text-[10px] opacity-75">Rendimento costante a metà o 50/50 puro</p>
                </div>
              </div>
              <div class="flex items-center gap-2 p-1.5 rounded-lg border" style="border-color: var(--table-border); background: var(--table-surface);">
                <i class="fa-solid fa-shield-halved text-amber-400 text-xs shrink-0"></i>
                <div>
                  <strong style="color: #f59e0b;">Vulnerabile</strong> (-0.30 .. -0.08)
                  <p class="text-[10px] opacity-75">Spesso a rischio nei bassifondi della classifica</p>
                </div>
              </div>
              <div class="flex items-center gap-2 p-1.5 rounded-lg border sm:col-span-2" style="border-color: var(--table-border); background: var(--table-surface);">
                <i class="fa-solid fa-bullseye text-rose-400 text-xs shrink-0"></i>
                <div>
                  <strong style="color: #ef4444;">Bersaglio Mobile</strong> (NTI &le; -0.30)
                  <p class="text-[10px] opacity-75">Alta volatilità con tendenza autodistruttiva (cucchiai/playout)</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Collapsible Waterfall Rules -->
          <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
            <button type="button" onclick="toggleGuide('waterfall-rules')" class="w-full px-3 py-2 flex items-center justify-between text-left text-[11px] font-bold transition hover:bg-white/5" style="color: var(--text-main);">
              <div class="flex items-center gap-1.5">
                <i class="fa-solid fa-layer-group text-amber-400 text-[10px]"></i>
                <span>Regole di Assegnazione &amp; Priorità (Waterfall a 9 Livelli)</span>
              </div>
              <i id="waterfall-rules-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-[10px]" style="color: var(--text-muted);"></i>
            </button>
            <div id="waterfall-rules-content" class="px-3 pb-3 pt-1 border-t hidden space-y-1.5" style="border-color: var(--table-border); color: var(--text-muted);">
              <p class="text-[11px] leading-relaxed">
                Se un manager soddisfa più requisiti, il motore assegna l'archetipo che compare prima in questo ordine gerarchico deterministico:
              </p>
              <div class="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">1. Dominatore</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">2. Vittima</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">3. Cannibale</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">4. Cinico</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">5. Grande Piazzato</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">6. Eterno 2°</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">7. All-or-Nothing</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">8. Grinder</span>
                <span class="opacity-50">&gt;</span>
                <span class="px-2 py-0.5 rounded border font-semibold" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-main);">9. Partecipante</span>
              </div>
            </div>
          </div>

          <!-- Archetypes Cards Grid (Clean 2-Column Micro-Cards) -->
          <div>
            <span class="block text-[11px] uppercase font-bold tracking-wider mb-2" style="color: var(--text-main);">Tassonomia dei 9 Archetipi</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              <!-- 1. Dominatore Dinastico -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(234,179,8,0.15); color: #eab308; border: 1px solid rgba(234,179,8,0.3);">
                      <i class="fa-solid fa-crown text-[9px]"></i> Dominatore Dinastico
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Titoli ≥ 4 &amp; (Efficienza ≥ 0.40 o Scudetti ≥ 2)
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Egemone cannibale: accumula vittorie a ritmo insostenibile e impone cicli dittatoriali.
                  </p>
                </div>
              </div>

              <!-- 2. Vittima Sacrificale -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3);">
                      <i class="fa-solid fa-skull-crossbones text-[9px]"></i> Vittima Sacrificale
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Disonori ≥ 3 oppure (Disonori ≥ 2 &amp; Titoli = 0)
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Abbonato al muro della vergogna: colleziona retrocessioni e cucchiai senza aver mai assaporato l'oro.
                  </p>
                </div>
              </div>

              <!-- 3. Cannibale del Podio -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3);">
                      <i class="fa-solid fa-trophy text-[9px]"></i> Cannibale del Podio
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Tasso Podio ≥ 50% &amp; KI ≥ 60% (min. 2 Podi)
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Sentenza in campionato: frequenta stabilmente il vertice e converte quasi ogni podio in Scudetto.
                  </p>
                </div>
              </div>

              <!-- 4. Cinico Chirurgico -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);">
                      <i class="fa-solid fa-crosshairs text-[9px]"></i> Cinico Chirurgico
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Finali ≥ 2 &amp; Conversione Finali ≥ 70%
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Freddo e letale nelle partite secche: trasforma quasi ogni finale scudetto o coppa in trionfo.
                  </p>
                </div>
              </div>

              <!-- 5. Il Grande Piazzato -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(217,119,6,0.15); color: #d97706; border: 1px solid rgba(217,119,6,0.3);">
                      <i class="fa-solid fa-ranking-star text-[9px]"></i> Il Grande Piazzato
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Podi ≥ 3 &amp; Killer Instinct ≤ 25%
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Presenza costante nei quartieri alti, ma condannato a fare da testimone ai trionfi altrui.
                  </p>
                </div>
              </div>

              <!-- 6. Eterno Secondo -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(99,102,241,0.15); color: #6366f1; border: 1px solid rgba(99,102,241,0.3);">
                      <i class="fa-solid fa-medal text-[9px]"></i> Eterno Secondo
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Argenti (Camp.+Coppa) ≥ 2 &amp; Conversione ≤ 35%
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Sindrome di Cúper: costantemente all'atto conclusivo ma punito dal destino o dalla tensione.
                  </p>
                </div>
              </div>

              <!-- 7. All-or-Nothing -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(249,115,22,0.15); color: #f97316; border: 1px solid rgba(249,115,22,0.3);">
                      <i class="fa-solid fa-dice text-[9px]"></i> All-or-Nothing
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    FF̃ ≥ 0.45 &amp; Titoli ≥ 1 &amp; Disonori ≥ 1
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Roster spericolato: vive oscillando tra l'estasi del trionfo e l'onta del cucchiaio o playout.
                  </p>
                </div>
              </div>

              <!-- 8. Grinder Metodico -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(6,182,212,0.15); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3);">
                      <i class="fa-solid fa-shield-halved text-[9px]"></i> Grinder Metodico
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Tasso Podio ≥ 30% &amp; Disonori = 0 &amp; Anni ≥ 3
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Gestione solida e pragmatica: evita costantemente i bassifondi e macina piazzamenti regolari.
                  </p>
                </div>
              </div>

              <!-- 9. Partecipante -->
              <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-1">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider" style="background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3);">
                      <i class="fa-solid fa-user-tie text-[9px]"></i> Partecipante
                    </span>
                  </div>
                  <code class="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded my-1 border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">
                    Profilo standard o storico in consolidamento
                  </code>
                  <p class="text-[11px] leading-relaxed" style="color: var(--text-muted);">
                    Condotta di gara senza eccessi agli estremi, in attesa della stagione della svolta.
                  </p>
                </div>
              </div>

            </div>
          </div>

          <!-- Archetipo vs Badge Note -->
          <div class="p-2.5 rounded-xl border text-[10px] sm:text-[11px] flex items-center gap-2" style="border-color: var(--table-border); background: rgba(0,0,0,0.02); color: var(--text-muted);">
            <i class="fa-solid fa-circle-info text-blue-400 shrink-0 text-xs"></i>
            <span><strong style="color: var(--text-main);">Archetipo Primario vs Badge:</strong> Ciascun mister riceve un solo <em>Archetipo Primario</em> distintivo del proprio stile storico, mentre i <em>Badge di Merito</em> (es. Triplete, Decano, Stella) si accumulano liberamente nella bacheca personale.</span>
          </div>

        </div>
      </div>
    `;
  }

  // TAB 4: Dinamica & Trend Storico
  if (currentTab === 'chronology') {
    const trajectoryProfiles = computeManagerTrajectoryMetrics(state.managers, state.competitions);
    const seasonalParity = computeSeasonalParityMetrics(state.competitions, state.managers);

    const totalCount = trajectoryProfiles.length;
    const veteransCount = trajectoryProfiles.filter(p => p.seasonsPlayed >= 3).length;
    const activeCount = trajectoryProfiles.filter(p => p.isActive).length;

    // Filter managers according to managerFilterMode
    const filteredTrajectory = trajectoryProfiles.filter(p => {
      if (managerFilterMode === 'veterans') return p.seasonsPlayed >= 3;
      if (managerFilterMode === 'active') return p.isActive;
      return true;
    });

    // Helper for table header sort icon (Manager)
    const chronoSortIcon = (field: ChronologySortField) => {
      if (chronologySortField !== field) {
        return '<i class="fa-solid fa-sort opacity-30 text-[9px] ml-1"></i>';
      }
      return chronologySortDirection === 'asc'
        ? '<i class="fa-solid fa-arrow-up-short-wide text-amber-400 text-[10px] ml-1"></i>'
        : '<i class="fa-solid fa-arrow-down-wide-short text-amber-400 text-[10px] ml-1"></i>';
    };

    // Helper for table header sort icon (Season)
    const seasonSortIcon = (field: SeasonSortField) => {
      if (seasonSortField !== field) {
        return '<i class="fa-solid fa-sort opacity-30 text-[9px] ml-1"></i>';
      }
      return seasonSortDirection === 'asc'
        ? '<i class="fa-solid fa-arrow-up-short-wide text-amber-400 text-[10px] ml-1"></i>'
        : '<i class="fa-solid fa-arrow-down-wide-short text-amber-400 text-[10px] ml-1"></i>';
    };

    // Sorted trajectory profiles
    const sortedTrajectory = [...filteredTrajectory].sort((a, b) => {
      let cmp = 0;
      if (chronologySortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (chronologySortField === 'avg_rank') {
        cmp = a.avgRank - b.avgRank || b.tierDistribution.baricenterScore - a.tierDistribution.baricenterScore;
      } else if (chronologySortField === 'baricenter') {
        cmp = a.tierDistribution.baricenterScore - b.tierDistribution.baricenterScore || a.avgRank - b.avgRank;
      } else if (chronologySortField === 'seasons') {
        cmp = a.seasonsPlayed - b.seasonsPlayed || a.avgRank - b.avgRank;
      } else if (chronologySortField === 'oscillation') {
        if (a.seasonsPlayed > 1 && b.seasonsPlayed > 1) {
          cmp = a.stdDevRank - b.stdDevRank;
        } else {
          cmp = b.seasonsPlayed - a.seasonsPlayed;
        }
      } else if (chronologySortField === 'podiums') {
        cmp = a.totalPodiums - b.totalPodiums || a.avgRank - b.avgRank;
      } else if (chronologySortField === 'spoons') {
        cmp = a.totalSpoons - b.totalSpoons || a.avgRank - b.avgRank;
      } else if (chronologySortField === 'merit') {
        cmp = a.avgMeritPct - b.avgMeritPct || a.seasonsPlayed - b.seasonsPlayed;
      }
      return chronologySortDirection === 'asc' ? cmp : -cmp;
    });

    // Sorted seasonal parity
    const sortedSeasons = [...seasonalParity].sort((a, b) => {
      let cmp = 0;
      const yA = parseInt(a.season.slice(0, 4), 10);
      const yB = parseInt(b.season.slice(0, 4), 10);
      if (seasonSortField === 'season') {
        cmp = yA - yB;
      } else if (seasonSortField === 'step_gap') {
        cmp = (a.stepGap ?? 999) - (b.stepGap ?? 999);
      } else if (seasonSortField === 'compactness') {
        cmp = (a.compactnessScore ?? -1) - (b.compactnessScore ?? -1);
      } else if (seasonSortField === 'total_gap') {
        cmp = (a.totalGap ?? 999) - (b.totalGap ?? 999);
      } else if (seasonSortField === 'podium_gap') {
        cmp = (a.podiumGap ?? 999) - (b.podiumGap ?? 999);
      } else if (seasonSortField === 'spoon_gap') {
        cmp = (a.spoonGap ?? 999) - (b.spoonGap ?? 999);
      }
      return seasonSortDirection === 'asc' ? cmp : -cmp;
    });

    // Sub-view Switcher HTML
    const subViewPills = `
      <div class="flex items-center justify-center p-1 rounded-xl border max-w-sm mx-auto mb-2.5" style="background: rgba(0,0,0,0.06); border-color: var(--table-border);">
        <button 
          type="button" 
          onclick="switchChronologyView('managers')" 
          class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          style="${currentChronologySubView === 'managers'
        ? 'background-color: var(--btn-bg); color: var(--btn-text); border: 1px solid var(--btn-border);'
        : 'color: var(--text-muted); background: transparent; border: 1px solid transparent;'}"
        >
          <i class="fa-solid fa-user-astronaut text-[11px]"></i>
          <span>Prospettiva Manager</span>
        </button>
        <button 
          type="button" 
          onclick="switchChronologyView('seasons')" 
          class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          style="${currentChronologySubView === 'seasons'
        ? 'background-color: var(--btn-bg); color: var(--btn-text); border: 1px solid var(--btn-border);'
        : 'color: var(--text-muted); background: transparent; border: 1px solid transparent;'}"
        >
          <i class="fa-solid fa-calendar-days text-[11px]"></i>
          <span>Evoluzione Stagioni</span>
        </button>
      </div>
    `;

    if (currentChronologySubView === 'managers') {
      const poolForHighlights = filteredTrajectory.length > 0 ? filteredTrajectory : trajectoryProfiles;
      const qualified = poolForHighlights.filter(p => p.seasonsPlayed >= 2);
      const topBaricenter = [...(qualified.length > 0 ? qualified : poolForHighlights)].sort((a, b) => b.tierDistribution.baricenterScore - a.tierDistribution.baricenterScore || a.avgRank - b.avgRank)[0];
      const topMetronome = [...(qualified.length > 0 ? qualified : poolForHighlights)].sort((a, b) => a.stdDevRank - b.stdDevRank)[0];
      const topPodiums = [...poolForHighlights].sort((a, b) => b.totalPodiums - a.totalPodiums)[0];

      let managerRowsHTML = '';
      sortedTrajectory.forEach((m, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}°`;

        managerRowsHTML += `
          <tr class="border-b transition hover:bg-white/[0.02]" style="border-color: var(--table-border);">
            <td class="py-2 px-2 text-center text-xs font-bold" style="color: var(--text-muted);">${medal}</td>
            <td class="py-2 px-2 min-w-[110px] sm:min-w-[125px]">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-xs block leading-tight" style="color: var(--text-main);">${m.name}</span>
                ${m.isActive ? '<span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-sm" title="Attivo nella stagione 2025/26"></span>' : ''}
              </div>
              <span class="text-[10px] font-normal" style="color: var(--text-muted);">${m.seasonsPlayed} ${m.seasonsPlayed === 1 ? 'stagione' : 'stagioni'}</span>
            </td>
            <td class="py-2 px-2 min-w-[170px] sm:min-w-[185px]">
              <div class="flex items-baseline justify-between mb-1">
                <span class="text-xs sm:text-sm font-black font-mono whitespace-nowrap" style="color: var(--text-main);">
                  ${m.avgRank.toFixed(1)}° <span class="text-[10px] font-normal opacity-90">medio</span>
                </span>
                <span class="text-[9px] font-mono whitespace-nowrap" style="color: var(--text-muted);">
                  Best #${m.bestRank || '—'} / Worst #${m.worstRank || '—'}
                </span>
              </div>
              
              <!-- 4-Color Segmented Mini Bar (8px height) -->
              <div class="w-full h-2 rounded-full overflow-hidden flex bg-white/10 shadow-inner" 
                   title="🥇 Vertice (Podio): ${m.tierDistribution.podiumCount} st. (${m.tierDistribution.podiumPct}%) | ⭐ Alta Classifica: ${m.tierDistribution.highCount} st. (${m.tierDistribution.highPct}%) | ⚖️ Metà Classifica: ${m.tierDistribution.midCount} st. (${m.tierDistribution.midPct}%) | 🥄 Rischio Cucchiaio: ${m.tierDistribution.riskCount} st. (${m.tierDistribution.riskPct}%)">
                ${m.tierDistribution.podiumPct > 0 ? `<div style="width: ${m.tierDistribution.podiumPct}%; background-color: #eab308;" class="h-full"></div>` : ''}
                ${m.tierDistribution.highPct > 0 ? `<div style="width: ${m.tierDistribution.highPct}%; background-color: #10b981;" class="h-full"></div>` : ''}
                ${m.tierDistribution.midPct > 0 ? `<div style="width: ${m.tierDistribution.midPct}%; background-color: #3b82f6;" class="h-full"></div>` : ''}
                ${m.tierDistribution.riskPct > 0 ? `<div style="width: ${m.tierDistribution.riskPct}%; background-color: #ef4444;" class="h-full"></div>` : ''}
              </div>
              
              <!-- Centered Prominent Fascia Pill Badge (single row) -->
              <div class="flex justify-center mt-1">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-sm tracking-tight whitespace-nowrap" 
                      style="border-color: ${m.tierDistribution.baricenterColor}40; background-color: ${m.tierDistribution.baricenterColor}15; color: ${m.tierDistribution.baricenterColor};">
                  <span>${m.tierDistribution.baricenterIcon || '🎯'}</span>
                  <span>${m.tierDistribution.baricenterLabel} · ${m.tierDistribution.baricenterScore.toFixed(1)}/4</span>
                </span>
              </div>
            </td>
            <td class="py-2 px-2 text-center min-w-[115px]">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm whitespace-nowrap" style="border-color: ${m.volatilityColor}40; background-color: ${m.volatilityColor}15; color: ${m.volatilityColor};">
                <span>${m.volatilityIcon}</span>
                <span>${m.volatilityLabel}</span>
              </span>
              <span class="block text-[10px] font-mono mt-0.5" style="color: var(--text-muted);">
                ${m.seasonsPlayed > 1 ? `±${m.stdDevRank.toFixed(1)} pos.` : '—'}
              </span>
            </td>
            <td class="py-2 px-2 text-center min-w-[110px]">
              <div class="flex items-center justify-center gap-2 text-xs font-mono font-bold">
                <span class="inline-flex items-center gap-1 ${m.totalPodiums > 0 ? 'text-amber-400 font-black' : 'opacity-30'}" title="${m.totalPodiums} podi conquistati">
                  🏆 ${m.totalPodiums}
                </span>
                <span class="opacity-30">|</span>
                <span class="inline-flex items-center gap-1 ${m.totalSpoons > 0 ? 'text-rose-400 font-black' : 'opacity-30'}" title="${m.totalSpoons} cucchiai di legno">
                  🥄 ${m.totalSpoons}
                </span>
              </div>
              <span class="block text-[9px] opacity-60 mt-0.5 font-mono text-center">Rec. podi: ${m.maxPodiumStreak} st.</span>
            </td>
          </tr>
        `;
      });

      tabContentHTML = `
        ${subViewPills}

        <!-- Top Manager Highlights -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 mb-2.5">
          <div class="p-2.5 sm:p-3 rounded-xl border flex items-center gap-3" style="border-color: var(--table-border); background: var(--table-surface);">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              🥇
            </div>
            <div class="min-w-0">
              <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Miglior Baricentro Storico</span>
              <span class="block text-sm font-black truncate" style="color: var(--text-main);">${topBaricenter?.name || 'N/D'}</span>
              <span class="text-[11px] font-mono font-bold text-amber-400">${topBaricenter?.tierDistribution.baricenterScore.toFixed(1)}/4.0 · ${topBaricenter?.tierDistribution.baricenterLabel} <span class="text-[10px] font-normal opacity-70">(${topBaricenter?.seasonsPlayed} st.)</span></span>
            </div>
          </div>

          <div class="p-2.5 sm:p-3 rounded-xl border flex items-center gap-3" style="border-color: var(--table-border); background: var(--table-surface);">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ⏱️
            </div>
            <div class="min-w-0">
              <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Il Più Costante (Metronomo)</span>
              <span class="block text-sm font-black truncate" style="color: var(--text-main);">${topMetronome?.name || 'N/D'}</span>
              <span class="text-[11px] font-mono font-bold text-emerald-400">±${topMetronome?.stdDevRank.toFixed(1)} posizioni <span class="text-[10px] font-normal opacity-70">(${topMetronome?.seasonsPlayed} st.)</span></span>
            </div>
          </div>

          <div class="p-2.5 sm:p-3 rounded-xl border flex items-center gap-3" style="border-color: var(--table-border); background: var(--table-surface);">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-blue-500/10 text-blue-400 border border-blue-500/20">
              🏆
            </div>
            <div class="min-w-0">
              <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Più Presenze sul Podio</span>
              <span class="block text-sm font-black truncate" style="color: var(--text-main);">${topPodiums?.name || 'N/D'}</span>
              <span class="text-[11px] font-mono font-bold text-blue-400">${topPodiums?.totalPodiums} podi <span class="text-[10px] font-normal opacity-70">in ${topPodiums?.seasonsPlayed} stagioni</span></span>
            </div>
          </div>
        </div>

        <!-- Filter Pills Toolbar -->
        <div class="p-2 sm:p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 mb-2" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-[10px] uppercase font-bold tracking-wider mr-1" style="color: var(--text-muted);">Mostra:</span>
            <button 
              type="button" 
              onclick="setManagerFilter('all')" 
              class="px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${managerFilterMode === 'all' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' : 'opacity-70 hover:opacity-100'}" 
              style="border-color: var(--table-border);"
            >
              Tutti (${totalCount})
            </button>
            <button 
              type="button" 
              onclick="setManagerFilter('veterans')" 
              class="px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${managerFilterMode === 'veterans' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' : 'opacity-70 hover:opacity-100'}" 
              style="border-color: var(--table-border);"
            >
              Veterani (≥ 3 st.) (${veteransCount})
            </button>
            <button 
              type="button" 
              onclick="setManagerFilter('active')" 
              class="px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${managerFilterMode === 'active' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' : 'opacity-70 hover:opacity-100'}" 
              style="border-color: var(--table-border);"
            >
              Attivi in corso (${activeCount})
            </button>
          </div>
          <span class="text-[11px] font-mono text-muted" style="color: var(--text-muted);">${sortedTrajectory.length} ${sortedTrajectory.length === 1 ? 'manager' : 'manager'}</span>
        </div>

        <!-- Manager Regularity Table with Interactive Headers & Scrollbar -->
        <div class="rounded-xl border overflow-hidden mb-3" style="border-color: var(--table-border); background: var(--table-surface);">
          <div class="overflow-x-auto max-h-[250px] sm:max-h-[280px] overflow-y-auto pr-0.5 sm:pr-1" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
            <table class="w-full text-left text-xs">
              <thead class="sticky top-0 z-10 border-b text-[10px] uppercase tracking-wider font-bold select-none backdrop-blur-md" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-muted);">
                <tr>
                  <th class="py-2.5 px-2 text-center w-8">#</th>
                  <th class="py-2.5 px-2 min-w-[110px] sm:min-w-[125px]">
                    <button type="button" onclick="toggleChronologySort('name')" class="flex items-center text-left hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider">
                      <span>Manager</span>
                      ${chronoSortIcon('name')}
                    </button>
                  </th>
                  <th class="py-2.5 px-2 min-w-[170px] sm:min-w-[185px]">
                    <button type="button" onclick="toggleChronologySort('avg_rank')" class="flex items-center text-left hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider">
                      <span>Piazzamento &amp; Fasce</span>
                      ${chronoSortIcon('avg_rank')}
                    </button>
                  </th>
                  <th class="py-2.5 px-2 text-center min-w-[115px]">
                    <button type="button" onclick="toggleChronologySort('oscillation')" class="flex items-center justify-center hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider mx-auto">
                      <span>Stabilità</span>
                      ${chronoSortIcon('oscillation')}
                    </button>
                  </th>
                  <th class="py-2.5 px-2 text-center min-w-[110px]">
                    <button type="button" onclick="toggleChronologySort('podiums')" class="flex items-center justify-center hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider mx-auto">
                      <span>Podi &amp; Cucchiai</span>
                      ${chronoSortIcon('podiums')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                ${managerRowsHTML}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Collapsible Methodology Guide -->
        <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
          <button type="button" onclick="toggleGuide('chronology-manager-guide')" class="w-full px-3 py-2 flex items-center justify-between text-left text-[11px] font-bold transition hover:bg-white/5" style="color: var(--text-main);">
            <div class="flex items-center gap-1.5">
              <i class="fa-solid fa-graduation-cap text-amber-400 text-[10px]"></i>
              <span>Guida: Fasce Dinamiche, Baricentro, Stabilità &amp; Normalizzazione Multi-Formato</span>
            </div>
            <i id="chronology-manager-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-[10px]" style="color: var(--text-muted);"></i>
          </button>
          <div id="chronology-manager-guide-content" class="px-3 pb-3 pt-1 border-t hidden space-y-2 text-xs" style="border-color: var(--table-border); color: var(--text-muted);">
            <p class="text-[11px] leading-relaxed">
              <strong>Normalizzazione a 4 Fasce Dinamiche:</strong> Nel corso delle 10 stagioni il campionato è passato da 8 a 10 e 12 squadre. Per eliminare la distorsione (un 4° posto a 8 squadre è a metà classifica, a 12 squadre è in zona nobile), ogni piazzamento è mappato proporzionalmente:
              <br>• <strong style="color: #eab308;">🥇 Vertice / Podio (4 pt):</strong> primi 3 posti (tutti i formati).
              <br>• <strong style="color: #10b981;">⭐ Alta Classifica (3 pt):</strong> 4° a 8 sq; 4°–5° a 10 sq; 4°–6° a 12 sq.
              <br>• <strong style="color: #3b82f6;">⚖️ Metà Classifica (2 pt):</strong> 5°–6° a 8 sq; 6°–8° a 10 sq; 7°–10° a 12 sq.
              <br>• <strong style="color: #ef4444;">🥄 Rischio Cucchiaio (1 pt):</strong> ultime due posizioni di ogni formato.
            </p>
            <p class="text-[11px] leading-relaxed">
              <strong>Baricentro Storico (da 1.0 a 4.0):</strong> Media ponderata del tempo trascorso nelle fasce: &ge; 3.5 <em>Élite Vertice</em>, 2.8–3.4 <em>Alta Classifica</em>, 2.0–2.7 <em>Metà Classifica</em>, &lt; 2.0 <em>Zona Rischio</em>. La mini-barra segmentata a 4 colori illustra visivamente la distribuzione storica.
            </p>
            <p class="text-[11px] leading-relaxed">
              <strong>Stabilità &amp; Oscillazione Tipica (&sigma;<sub>R</sub>):</strong> Misura la dispersione delle posizioni finali occupate in carriera (&sigma;<sub>R</sub>, deviazione standard del rank con min. 3 stagioni):
              <br>• <strong style="color: #10b981;">⏱️ Metronomo (&sigma;<sub>R</sub> &lt; 2.0 pos):</strong> Iper-stabilità statistica. Il mister naviga costantemente nello stesso fazzoletto di posizioni (es. Valery con &sigma;<sub>R</sub> = 1.34).
              <br>• <strong style="color: #3b82f6;">⚖️ Equilibrato (2.0 &le; &sigma;<sub>R</sub> &le; 3.5 pos):</strong> La fisiologica alternanza competitiva della lega. Normale variabilità tra annate di vertice e campionati di transizione, senza tracolli estremi.
              <br>• <strong style="color: #f59e0b;">🎢 Montagna Russa (&sigma;<sub>R</sub> &gt; 3.5 pos):</strong> Elevata polarizzazione. Alternanza estrema tra lotta scudetto e rischio cucchiaio (es. Makako con &sigma;<sub>R</sub> = 3.92, Tazio con &sigma;<sub>R</sub> = 3.61).
              <br>• <strong style="color: #94a3b8;">🌱 Esordiente (&lt; 3 stagioni):</strong> Meno di 3 campionati disputati; campione statistico non consolidato per stimare l'oscillazione tipica.
            </p>
          </div>
        </div>
      `;
    } else {
      // Seasons View
      const validSeasons = seasonalParity.filter(s => s.hasPointsData && s.stepGap !== null);
      const topCompact = [...validSeasons].sort((a, b) => (a.stepGap ?? 999) - (b.stepGap ?? 999))[0];
      const tightestPodium = [...validSeasons].filter(s => s.podiumGap !== null).sort((a, b) => (a.podiumGap ?? 999) - (b.podiumGap ?? 999))[0];
      const tightestSpoon = [...validSeasons].filter(s => s.spoonGap !== null).sort((a, b) => (a.spoonGap ?? 999) - (b.spoonGap ?? 999))[0];

      let seasonRowsHTML = '';
      sortedSeasons.forEach(s => {
        const compactBar = s.compactnessScore !== null ? Math.max(5, s.compactnessScore) : 0;
        const compactLabel = s.compactnessScore !== null ? `${s.compactnessScore} / 100` : 'N/D';
        const stdDevLabel = s.stdDevPts !== null ? `σ ${s.stdDevPts} pt` : 'Dato parziale';
        const podiumGapLabel = s.podiumGap !== null ? `${s.podiumGap} pt` : 'N/D';
        const spoonGapLabel = s.spoonGap !== null ? `${s.spoonGap} pt` : 'N/D';

        seasonRowsHTML += `
          <tr class="border-b transition hover:bg-white/[0.02]" style="border-color: var(--table-border);">
            <td class="py-2 px-2">
              <span class="font-bold text-xs block leading-tight text-amber-400">${s.season}</span>
              <span class="text-[10px]" style="color: var(--text-muted);">${s.teamCount} squadre</span>
            </td>
            <td class="py-2 px-2 min-w-[130px]">
              ${s.hasPointsData && s.stepGap !== null
            ? `
                  <span class="font-mono text-xs font-black block" style="color: var(--text-main);">Δ ${s.stepGap.toFixed(2)} pt/pos</span>
                  <span class="text-[9px] block mt-0.5" style="color: var(--text-muted);">Forbice tot. Δ ${s.totalGap?.toFixed(1)} pt (${s.teamCount} sq)</span>
                `
            : `
                  <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400/90 italic">
                    <i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Punti non archiviati
                  </span>
                `}
            </td>
            <td class="py-2 px-2 min-w-[120px]">
              ${s.hasPointsData && s.compactnessScore !== null
            ? `
                  <div class="flex items-center justify-between text-xs font-mono font-bold mb-1">
                    <span style="color: var(--text-main);">${compactLabel}</span>
                    <span class="text-[10px] opacity-70 font-normal">${stdDevLabel}</span>
                  </div>
                  <div class="w-full h-1.5 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.08);">
                    <div class="h-full rounded-full transition-all duration-300" style="width: ${compactBar}%; background-color: ${s.compactnessScore >= 65 ? '#10b981' : s.compactnessScore >= 40 ? '#3b82f6' : '#f59e0b'};"></div>
                  </div>
                `
            : `
                  <span class="text-[10px] opacity-40 font-mono">Dato parziale</span>
                `}
            </td>
            <td class="py-2 px-2 text-center">
              <span class="font-mono text-xs font-bold block" style="color: var(--text-main);">${podiumGapLabel}</span>
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border mt-0.5 shadow-sm" style="border-color: ${s.podiumBadgeColor}40; background-color: ${s.podiumBadgeColor}15; color: ${s.podiumBadgeColor};">
                ${s.podiumBadge}
              </span>
            </td>
            <td class="py-2 px-2 text-center">
              <span class="font-mono text-xs font-bold block" style="color: var(--text-main);">${spoonGapLabel}</span>
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border mt-0.5 shadow-sm" style="border-color: ${s.spoonBadgeColor}40; background-color: ${s.spoonBadgeColor}15; color: ${s.spoonBadgeColor};">
                ${s.spoonBadge}
              </span>
            </td>
            <td class="py-2 px-2">
              <div class="text-[11px] leading-tight flex flex-col gap-0.5">
                <span class="font-bold text-amber-400 truncate">🥇 ${s.championName} <span class="opacity-60 text-[10px] font-normal">(${s.championPts ? s.championPts + ' pt' : 'Campione'})</span></span>
                <span class="font-bold text-rose-400 truncate">🥄 ${s.spoonName} <span class="opacity-60 text-[10px] font-normal">(${s.spoonPts ? s.spoonPts + ' pt' : 'Cucchiaio'})</span></span>
              </div>
            </td>
          </tr>
        `;
      });

      tabContentHTML = `
        ${subViewPills}

        <!-- Top Seasons Highlights -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 mb-2.5">
          <div class="p-2.5 sm:p-3 rounded-xl border flex items-center gap-3" style="border-color: var(--table-border); background: var(--table-surface);">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ⚖️
            </div>
            <div class="min-w-0">
              <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Campionato Più Compatto</span>
              <span class="block text-sm font-black truncate" style="color: var(--text-main);">${topCompact?.season || 'N/D'}</span>
              <span class="text-[11px] font-mono font-bold text-emerald-400">Δ ${topCompact?.stepGap?.toFixed(2) ?? '—'} pt/pos <span class="text-[10px] font-normal opacity-70">(Tot. ${topCompact?.totalGap} pt su ${topCompact?.teamCount} sq)</span></span>
            </div>
          </div>

          <div class="p-2.5 sm:p-3 rounded-xl border flex items-center gap-3" style="border-color: var(--table-border); background: var(--table-surface);">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              🏁
            </div>
            <div class="min-w-0">
              <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Podio Più Serrato</span>
              <span class="block text-sm font-black truncate" style="color: var(--text-main);">${tightestPodium?.season || 'N/D'}</span>
              <span class="text-[11px] font-mono font-bold text-amber-400">Δ 1°–3°: ${tightestPodium?.podiumGap} pt <span class="text-[10px] font-normal opacity-70">(Fotofinish)</span></span>
            </div>
          </div>

          <div class="p-2.5 sm:p-3 rounded-xl border flex items-center gap-3" style="border-color: var(--table-border); background: var(--table-surface);">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-rose-500/10 text-rose-400 border border-rose-500/20">
              ⚡
            </div>
            <div class="min-w-0">
              <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Fuga Cucchiaio Più Tirata</span>
              <span class="block text-sm font-black truncate" style="color: var(--text-main);">${tightestSpoon?.season || 'N/D'}</span>
              <span class="text-[11px] font-mono font-bold text-rose-400">Δ Penultimo–Ultimo: ${tightestSpoon?.spoonGap} pt</span>
            </div>
          </div>
        </div>

        <!-- Seasons Parity Table with Interactive Headers & Scrollbar -->
        <div class="rounded-xl border overflow-hidden mb-3" style="border-color: var(--table-border); background: var(--table-surface);">
          <div class="overflow-x-auto max-h-[250px] sm:max-h-[280px] overflow-y-auto pr-0.5 sm:pr-1" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
            <table class="w-full text-left text-xs">
              <thead class="sticky top-0 z-10 border-b text-[10px] uppercase tracking-wider font-bold select-none backdrop-blur-md" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-muted);">
                <tr>
                  <th class="py-2.5 px-2">
                    <button type="button" onclick="toggleSeasonSort('season')" class="flex items-center text-left hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider">
                      <span>Stagione</span>
                      ${seasonSortIcon('season')}
                    </button>
                  </th>
                  <th class="py-2.5 px-2">
                    <button type="button" onclick="toggleSeasonSort('step_gap')" class="flex items-center text-left hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider">
                      <span>Gradino Medio</span>
                      ${seasonSortIcon('step_gap')}
                    </button>
                  </th>
                  <th class="py-2.5 px-2">
                    <button type="button" onclick="toggleSeasonSort('compactness')" class="flex items-center text-left hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider">
                      <span>Compattezza</span>
                      ${seasonSortIcon('compactness')}
                    </button>
                  </th>
                  <th class="py-2.5 px-2 text-center">
                    <button type="button" onclick="toggleSeasonSort('podium_gap')" class="flex items-center justify-center hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider mx-auto">
                      <span>Volata Podio</span>
                      ${seasonSortIcon('podium_gap')}
                    </button>
                  </th>
                  <th class="py-2.5 px-2 text-center">
                    <button type="button" onclick="toggleSeasonSort('spoon_gap')" class="flex items-center justify-center hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider mx-auto">
                      <span>Fuga Cucchiaio</span>
                      ${seasonSortIcon('spoon_gap')}
                    </button>
                  </th>
                  <th class="py-2.5 px-2">Verdetti Chiave</th>
                </tr>
              </thead>
              <tbody>
                ${seasonRowsHTML}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Collapsible Methodology Guide -->
        <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
          <button type="button" onclick="toggleGuide('chronology-season-guide')" class="w-full px-3 py-2 flex items-center justify-between text-left text-[11px] font-bold transition hover:bg-white/5" style="color: var(--text-main);">
            <div class="flex items-center gap-1.5">
              <i class="fa-solid fa-graduation-cap text-amber-400 text-[10px]"></i>
              <span>Guida: Gradino Medio (pt/posizione) &amp; Compattezza Normalizzata</span>
            </div>
            <i id="chronology-season-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-[10px]" style="color: var(--text-muted);"></i>
          </button>
          <div id="chronology-season-guide-content" class="px-3 pb-3 pt-1 border-t hidden space-y-2 text-xs" style="border-color: var(--table-border); color: var(--text-muted);">
            <p class="text-[11px] leading-relaxed">
              <strong>Gradino Medio di Classifica (pt/posizione):</strong> Divide la forbice totale (1° - Ultimo) per il numero di salti di classifica (N - 1). Questo parametro rende perfettamente confrontabili campionati a 8 squadre (7 salti), 10 squadre (9 salti) e 12 squadre (11 salti): un gradino più basso indica che ogni posizione era contesa punto su punto.
            </p>
            <p class="text-[11px] leading-relaxed">
              <strong>Record Storico Decennale:</strong> La stagione 2022/23 a 12 squadre detiene il record assoluto di compattezza con soli <strong>1.91 pt per gradino</strong> (forbice totale di 21 pt spalmata su 12 squadre), battendo il campionato 2018/19 a 10 squadre (2.22 pt/gradino).
            </p>
            <p class="text-[11px] leading-relaxed">
              <strong>Archivio Storico 2020/21:</strong> Per la stagione 2020/21 i punti di classifica non sono stati registrati nella banca dati; l'applicazione preserva la coerenza mostrando i verdetti ufficiali (Campione e Cucchiaio) con un'indicazione esplicita senza inficiare i calcoli degli altri anni.
            </p>
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = `
    <!-- Modal Fixed Header -->
    <div class="px-3.5 py-2.5 sm:px-6 sm:py-3.5 border-b flex items-center justify-between shrink-0" style="border-color: var(--table-border);">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-sm" style="background: rgba(255,255,255,0.05); border: 1px solid var(--table-border);">
          <i class="fa-solid fa-chart-pie text-amber-400"></i>
        </div>
        <div>
          <h2 class="flex items-center gap-2 text-sm sm:text-base font-black tracking-tight" style="color: var(--text-main);">
            <span>Analisi InsalAtlas</span>
            <img src="favicon-64x64.png" alt="InsalAtlas logo" class="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
          </h2>
          <span class="text-[11px]" style="color: var(--text-muted);">Analisi &amp; Filosofie di Roster</span>
        </div>
      </div>
      <button type="button" onclick="closeConcentrationModal()" class="w-7 h-7 rounded-full flex items-center justify-center transition border"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>

    <!-- Navigation Tabs Bar -->
    <div class="px-3 sm:px-6 py-2 border-b flex items-center gap-1.5 sm:gap-2 overflow-x-auto shrink-0" style="border-color: var(--table-border); background: rgba(0,0,0,0.08);">
      ${tabButton('macro', 'Equilibrio & Macro', 'fa-solid fa-scale-balanced')}
      ${tabButton('clutch', 'Cinismo & Podi', 'fa-solid fa-bullseye')}
      ${tabButton('risk', 'Archetipi', 'fa-solid fa-dice')}
      ${tabButton('chronology', 'Dinamica Storica', 'fa-solid fa-timeline')}
    </div>

    <!-- Modal Scrollable Body -->
    <div class="px-3 py-2.5 sm:px-6 sm:py-3.5 overflow-y-auto space-y-2.5 flex-1 min-h-0">
      
      <!-- Dynamic Tab Content -->
      ${tabContentHTML}

    </div>

    <!-- Modal Fixed Footer -->
    <div class="px-3.5 py-2 sm:px-6 sm:py-3 border-t flex justify-end shrink-0" style="border-color: var(--table-border);">
      <button type="button" onclick="closeConcentrationModal()" class="px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition shadow-sm"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        Chiudi
      </button>
    </div>
  `;
}
