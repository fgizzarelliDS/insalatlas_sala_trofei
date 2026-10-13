import type { LeagueConcentrationAnalysis } from '@/types';

export function renderRiskTab(analysis: LeagueConcentrationAnalysis): string {
  return `
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
            <div class="p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between" style="border-color: var(--table-border); background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);">
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
