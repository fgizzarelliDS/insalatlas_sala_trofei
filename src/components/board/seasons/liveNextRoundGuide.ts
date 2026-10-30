/**
 * src/components/board/seasons/liveNextRoundGuide.ts
 * Educational guide component for Next Round duels:
 * - Bradley-Terry Logistic Curve formula rendering (native HTML/CSS math)
 * - Scaling Factor (/400) explanation
 * - Tactical Clima Match category legend
 */

/**
 * Renders the Bradley-Terry mathematical formula in crisp, native HTML/CSS
 */
export function renderBradleyTerryFormulaHTML(): string {
  return `
    <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-1.5 px-3 text-xs sm:text-sm font-sport select-none" style="color: var(--text-main);">
      <!-- P_A Formula -->
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded-md font-mono font-black text-xs sm:text-sm bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shrink-0 shadow-2xs">P<sub>A</sub></span>
        <span class="opacity-70 font-mono text-sm font-bold" style="color: var(--text-main);">=</span>
        <div class="inline-flex flex-col items-center justify-center font-mono">
          <span class="px-2 font-bold text-xs sm:text-sm leading-tight" style="color: var(--text-main);">1</span>
          <span class="w-full border-t border-slate-400 dark:border-slate-500 my-0.5 opacity-60"></span>
          <span class="px-2 font-bold text-xs sm:text-sm leading-tight flex items-center" style="color: var(--text-main);">
            1 + 10<sup class="text-[9.5px] sm:text-[10.5px] ml-1 font-bold tracking-tight inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/5 dark:bg-white/10">(<span class="text-rose-700 dark:text-rose-400 font-extrabold">R<sub>B</sub></span> - <span class="text-emerald-700 dark:text-emerald-400 font-extrabold">R<sub>A</sub></span>)<span class="text-amber-800 dark:text-amber-300 font-black">/400</span></sup>
          </span>
        </div>
      </div>

      <span class="opacity-30 hidden sm:inline text-xs font-mono">•</span>

      <!-- P_B Formula -->
      <div class="flex items-center gap-2 font-mono text-xs sm:text-sm">
        <span class="px-2 py-0.5 rounded-md font-mono font-black text-xs sm:text-sm bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30 shrink-0 shadow-2xs">P<sub>B</sub></span>
        <span class="opacity-70 font-mono text-sm font-bold" style="color: var(--text-main);">=</span>
        <span class="font-bold font-mono text-xs sm:text-sm" style="color: var(--text-main);">1.0 - <span class="text-emerald-700 dark:text-emerald-400 font-black">P<sub>A</sub></span></span>
      </div>
    </div>
  `;
}

/**
 * Builds the HTML markup for the educational Next Round guide box
 */
export function buildNextRoundGuideHTML(isExpanded: boolean = false): string {
  return `
    <!-- Collapsible Educational Guide Box for Next Round Probabilities & Categories (Shown inside exposed area) -->
    <div id="next-round-guide-box" class="${isExpanded ? '' : 'hidden'} rounded-2xl border p-3.5 sm:p-4 text-xs transition-all space-y-3.5 mb-3.5 shadow-2xs"
         style="border-color: var(--table-border); background-color: var(--modal-bg);">
      
      <!-- Header Info & Official Methodology Label -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-[var(--table-border)]/60">
        <div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
          <i class="fa-solid fa-circle-info text-sm"></i>
          <span>Guida Duelli &amp; Previsioni H2H (Modello Ibrido Z-Score)</span>
        </div>
        <span class="text-[11px] font-medium leading-snug" style="color: var(--text-main); opacity: 0.85;">
          Previsioni probabilistiche calcolate dall'Indice Z-Score composito (Elo + Media FantaPunti regolarizzata).
        </span>
      </div>

      <!-- Mathematical Formula & /400 Scaling Explanation Card (Theme-Adaptive Surfaces, Zero Muddy Washes) -->
      <div class="p-3 sm:p-3.5 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 overflow-hidden shadow-2xs"
           style="border-color: var(--table-border); background-color: var(--table-surface);">
        
        <!-- Left: Crisp Native Formula (High Contrast, Responsive, No Overflow) -->
        <div class="space-y-2 min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-extrabold text-xs tracking-wide" style="color: var(--text-main);">
              Formula Curva Logistica di Bradley-Terry
            </span>
            <span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border"
                  style="border-color: var(--input-border); background-color: var(--input-bg); color: var(--text-muted);">
              Base 10 • Scala 400
            </span>
          </div>
          
          <div class="p-2.5 sm:p-3 rounded-xl border shadow-inner overflow-x-auto"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            ${renderBradleyTerryFormulaHTML()}
          </div>

          <div class="flex items-center gap-1.5 text-[10.5px] opacity-85 leading-snug" style="color: var(--text-main);">
            <i class="fa-solid fa-circle-check text-emerald-700 dark:text-emerald-400 text-xs shrink-0"></i>
            <span>Se due squadre hanno rating identico (<strong class="font-mono">R<sub>A</sub> = R<sub>B</sub></strong>) entrambe partono con il <strong>50%</strong> di probabilità stimata.</span>
          </div>
        </div>

        <!-- Right: Shortened Scaling Explanation -->
        <div class="p-2.5 sm:p-3 rounded-xl border text-[11px] leading-relaxed lg:max-w-xs shrink-0 flex flex-col justify-center shadow-2xs"
             style="background-color: var(--input-bg); border-color: var(--input-border);">
          <div class="font-extrabold text-amber-800 dark:text-amber-300 text-xs mb-1 flex items-center gap-1.5">
            <span class="w-5 h-5 rounded-md flex items-center justify-center bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] shrink-0 border border-amber-500/30">
              <i class="fa-solid fa-scale-balanced"></i>
            </span>
            <span>Fattore di Scala &amp; Quote 1X2</span>
          </div>
          <p class="text-[10px] sm:text-[10.5px] opacity-90 leading-snug" style="color: var(--text-main);">
            La barra bicolore mostra la <strong>Probabilità H2H</strong> (testa-a-testa senza pareggio). Le quote <strong>1X2</strong> derivano dal modello di Davidson con pareggio dinamico (<strong class="font-mono">&nu;<sub>0</sub> = 0.72</strong>) ed aggio realistico da bookmaker (<strong class="font-mono">4.5%</strong>).
          </p>
        </div>
      </div>

      <!-- Clima Match Categories Legend (Theme Harmonious Equal Sized Boxes) -->
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-75" style="color: var(--text-muted);">
          Legenda Categorie Clima Match &amp; Contesto Tattico
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
          <!-- 1. AL VERTICE -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">🔥</span>
            <div>
              <div class="font-extrabold text-amber-700 dark:text-amber-400 text-xs tracking-wide">AL VERTICE</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Scontro d'alta classifica: entrambe in Top 3 o con rating di prima fascia (&ge; 1525).</div>
            </div>
          </div>

          <!-- 2. TESTACODA -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">↕️</span>
            <div>
              <div class="font-extrabold text-purple-700 dark:text-purple-400 text-xs tracking-wide">TESTACODA</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Sfida asimmetrica tra estremi: una squadra della Top 3 affronta una delle ultime 3.</div>
            </div>
          </div>

          <!-- 3. TRAPPOLA -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">⚠️</span>
            <div>
              <div class="font-extrabold text-rose-700 dark:text-rose-400 text-xs tracking-wide">TRAPPOLA</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Allerta insidia: elevato dislivello Elo (&ge; 50 pt) o stima estrema (&ge; 65% / &le; 35%).</div>
            </div>
          </div>

          <!-- 4. SUL FILO -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">⚖️</span>
            <div>
              <div class="font-extrabold text-teal-700 dark:text-cyan-400 text-xs tracking-wide">SUL FILO</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Equilibrio quasi assoluto: formazioni con gap Elo &le; 12 pt o probabilità 48.5%-51.5%.</div>
            </div>
          </div>

          <!-- 5. CORSA PLAYOFF -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">🎯</span>
            <div>
              <div class="font-extrabold text-blue-700 dark:text-blue-400 text-xs tracking-wide">CORSA PLAYOFF</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Scontro cruciale di centro classifica tra squadre in lizza piazzamento (4ª - 9ª pos).</div>
            </div>
          </div>

          <!-- 6. SALVEZZA -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">🪓</span>
            <div>
              <div class="font-extrabold text-stone-700 dark:text-stone-300 text-xs tracking-wide">SALVEZZA</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Scontro diretto rovente dei bassifondi: entrambe le formazioni nelle ultime 4 posizioni.</div>
            </div>
          </div>

          <!-- 7. DUELLO (Identical single-column dimension) -->
          <div class="p-2.5 rounded-xl border flex items-start gap-2.5 h-full min-h-[64px] shadow-2xs"
               style="background-color: var(--input-bg); border-color: var(--input-border);">
            <span class="text-base leading-none shrink-0 pt-0.5">🥊</span>
            <div>
              <div class="font-extrabold text-slate-700 dark:text-slate-300 text-xs tracking-wide">DUELLO</div>
              <div class="text-[10.5px] opacity-80 leading-snug mt-0.5" style="color: var(--text-main);">Confronto ordinario di campionato senza condizioni estreme di classifica o rating.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
