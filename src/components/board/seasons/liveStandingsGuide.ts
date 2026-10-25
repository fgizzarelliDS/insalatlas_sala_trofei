/**
 * Live Standings Guide & Legend Module
 * Provides expandable guide box, status momentum descriptions, and schedule luck definitions.
 */

export function buildLiveStandingsGuideHTML(): string {
  return `
    <!-- Expandable Collapsible Dynamic Guide Box -->
    <div id="live-standings-guide" class="hidden border-b p-3.5 sm:p-4 text-xs transition-all"
         style="border-color: var(--table-border); background-color: var(--table-surface);">
      <!-- Guide Content for Real View -->
      <div id="guide-content-real">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <i class="fa-solid fa-chart-line"></i>
            <span>Legenda Stato & Momentum (L5)</span>
          </div>
          <span class="text-[10px] font-semibold opacity-70" style="color: var(--text-muted);">
            Ponderato sulle ultime 5 gare (le più recenti incidono di più)
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5">
          <!-- 🔥 In Fiamme -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">🔥</span>
            <div>
              <div class="font-bold text-amber-800 dark:text-amber-400 text-xs">IN FIAMME</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Momentum &ge; 75% e fantapunti recenti sopra media lega.</div>
            </div>
          </div>

          <!-- 📈 In Ascesa -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">📈</span>
            <div>
              <div class="font-bold text-emerald-800 dark:text-emerald-400 text-xs">IN ASCESA</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Momentum &ge; 55% con vittoria nell'ultimo turno disputato.</div>
            </div>
          </div>

          <!-- ⚖️ Stabile -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-slate-500/10 border-slate-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">⚖️</span>
            <div>
              <div class="font-bold text-xs" style="color: var(--text-main);">STABILE</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Rendimento bilanciato e trend a centro classifica.</div>
            </div>
          </div>

          <!-- 📉 In Flessione -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-orange-500/10 border-orange-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">📉</span>
            <div>
              <div class="font-bold text-orange-800 dark:text-orange-400 text-xs">IN FLESSIONE</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Momentum &le; 35% oppure 2 sconfitte consecutive.</div>
            </div>
          </div>

          <!-- 🧊 Crisi Nera -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-cyan-500/10 border-cyan-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">🧊</span>
            <div>
              <div class="font-bold text-cyan-800 dark:text-cyan-400 text-xs">CRISI NERA</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Momentum &le; 15% (striscia prolungata negativa).</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Guide Content for Merit View -->
      <div id="guide-content-merit" class="hidden">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <i class="fa-solid fa-scale-balanced"></i>
            <span>Guida Merito (xPTS) & Calendario Monte Carlo</span>
          </div>
          <span class="text-[10px] font-semibold opacity-70" style="color: var(--text-muted);">
            1 vs Tutti a soglie gol (66/72/78) • 10.000 calendari alternativi simulati
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5">
          <!-- 🍀 Favorevole -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">🍀</span>
            <div>
              <div class="font-bold text-emerald-800 dark:text-emerald-400 text-xs">FAVOREVOLE (&ge; +1.0σ)</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Massima resa dagli incroci. Punti reali superiori al merito oggettivo.</div>
            </div>
          </div>

          <!-- ↗️ Positivo -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-teal-500/10 border-teal-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">↗️</span>
            <div>
              <div class="font-bold text-teal-800 dark:text-teal-400 text-xs">POSITIVO (+0.35..+1.0σ)</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Accoppiamenti favorevoli rispetto al volume di fantapunti prodotti.</div>
            </div>
          </div>

          <!-- ⚖️ Neutro -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-slate-500/10 border-slate-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">⚖️</span>
            <div>
              <div class="font-bold text-xs" style="color: var(--text-main);">NEUTRO (±0.35σ)</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Calendario bilanciato. Punti reali allineati al merito della squadra.</div>
            </div>
          </div>

          <!-- ↘️ Sfortunato -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">↘️</span>
            <div>
              <div class="font-bold text-amber-800 dark:text-amber-400 text-xs">SFORTUNATO (-0.35..-1.0σ)</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Penalizzato dal calendario. Ha affrontato avversari in gran spolvero.</div>
            </div>
          </div>

          <!-- ⛈️ Bersagliato -->
          <div class="p-2 sm:p-2.5 rounded-xl border bg-rose-500/10 border-rose-500/30 flex items-start gap-2">
            <span class="text-base leading-none shrink-0">⛈️</span>
            <div>
              <div class="font-bold text-rose-800 dark:text-rose-400 text-xs">BERSAGLIATO (&le; -1.0σ)</div>
              <div class="text-[10px] opacity-80 leading-snug" style="color: var(--text-main);">Fortissima sfortuna: punti persi in sfide proibitive nonostante punteggi alti.</div>
            </div>
          </div>
        </div>

        <div class="mt-2.5 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-80"
             style="border-color: var(--table-border); color: var(--text-muted);">
          <div><strong>Punti Attesi (xPTS):</strong> Media esatta dei punti meritati simulando ogni giornata contro tutti i 13 avversari.</div>
          <div><strong>ΔPunti:</strong> Punti Reali − xPTS (differenza dovuta unicamente alla casualità del calendario).</div>
          <div><strong>Elo Rating:</strong> Modello dinamico di forza tattica ponderato per scarto gol e fantapunti. Supporta traccia <em>Pura (1500)</em> e <em>Storica (Albo d'Oro)</em>.</div>
        </div>
      </div>

      <div class="mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] opacity-80"
           style="border-color: var(--table-border); color: var(--text-muted);">
        <div class="flex items-center gap-1.5">
          <i class="fa-regular fa-hand-pointer text-amber-400"></i>
          <span><strong>Tabellino gare:</strong> Clicca o tocca una squadra per vedere tutti gli incontri giornata per giornata.</span>
        </div>
        <span class="text-[10px] opacity-70 hidden sm:inline">Esiti: 🟢 V • 🟡 N • 🔴 P • - In programma</span>
      </div>
    </div>
  `;
}

/**
 * Toggles the Guide Box and updates chevron orientation in Desktop & Mobile headers
 */
export function toggleLiveStandingsGuide(): void {
  const guide = typeof document !== 'undefined' ? document.getElementById('live-standings-guide') : null;
  const chevron = typeof document !== 'undefined' ? document.getElementById('live-guide-chevron') : null;
  const chevronMobile = typeof document !== 'undefined' ? document.getElementById('live-guide-chevron-mobile') : null;
  if (guide) {
    const isHidden = guide.classList.contains('hidden');
    if (isHidden) {
      guide.classList.remove('hidden');
      chevron?.classList.add('rotate-180');
      chevronMobile?.classList.add('rotate-180');
    } else {
      guide.classList.add('hidden');
      chevron?.classList.remove('rotate-180');
      chevronMobile?.classList.remove('rotate-180');
    }
  }
}
