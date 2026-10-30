/**
 * src/components/modals/analytics/EloGuideBox.ts
 * Educational drawer explaining Elo rating mathematics, formulas, and league parameters
 */

import type { EloConfig } from '@/types/analytics';
import { computeEloWinProbability, getActiveEloConfig } from '@/analytics/analyticsCore';

/**
 * Formats competition K-Factors dynamically into a badge and descriptive Italian text
 */
export function formatKFactorsGuide(kFactors: Record<string, number>): { badge: string; description: string } {
  const nameMap: Record<string, string> = {
    Campionato: 'il Campionato',
    Mundialito: 'il Mundialito',
    Coppa: 'le gare di Coppa',
    Supercoppa: 'la Supercoppa',
    Coppa_Knockout: 'le Fasi Finali di Coppa',
    Perdenti: 'il Torneo Perdenti'
  };

  const badgeNameMap: Record<string, string> = {
    Campionato: 'Campionato',
    Mundialito: 'Mundialito',
    Coppa: 'Coppa',
    Supercoppa: 'Supercoppa',
    Coppa_Knockout: 'Coppa KO',
    Perdenti: 'Perdenti'
  };

  const groupsByK = new Map<number, string[]>();
  const badgeGroupsByK = new Map<number, string[]>();

  for (const [comp, kVal] of Object.entries(kFactors)) {
    if (comp === 'default') continue;
    const label = nameMap[comp] || comp;
    const badgeLabel = badgeNameMap[comp] || comp;
    if (!groupsByK.has(kVal)) {
      groupsByK.set(kVal, []);
      badgeGroupsByK.set(kVal, []);
    }
    groupsByK.get(kVal)!.push(label);
    badgeGroupsByK.get(kVal)!.push(badgeLabel);
  }

  const sortedKs = Array.from(groupsByK.keys()).sort((a, b) => b - a);

  const badgeParts = sortedKs.map(k => {
    const comps = badgeGroupsByK.get(k)!;
    return `${comps.join(' / ')}: K=${k}`;
  });
  const badge = badgeParts.join(' • ') || 'K=32';

  const clauses: string[] = [];
  sortedKs.forEach((k) => {
    const comps = groupsByK.get(k)!;
    const compsText = comps.length > 1
      ? `${comps.slice(0, -1).join(', ')} e ${comps[comps.length - 1]}`
      : comps[0];
    const isPlural = comps.length > 1 || comps[0].startsWith('le ') || comps[0].startsWith('i ');
    const verb = isPlural ? 'hanno' : 'ha';

    if (k >= 40) {
      clauses.push(`${compsText} ${verb} K=${k} (massimo impatto per le sfide decisive a eliminazione diretta)`);
    } else if (k >= 32) {
      clauses.push(`${compsText} ${verb} K=${k} (massima rilevanza per la stagione regolare)`);
    } else if (k >= 24) {
      clauses.push(`${compsText} ${verb} K=${k} per moderare la volatilità dei match di coppa`);
    } else {
      clauses.push(`${compsText} ${verb} K=${k} (impatto contenuto per i tornei secondari)`);
    }
  });

  const description = `Il fattore K definisce il peso del torneo: ${clauses.join(', mentre ')}.`;
  return { badge, description };
}

/**
 * Renders the collapsible educational guide explaining formulas and configurations
 */
export function renderEloGuideModal(customConfig?: EloConfig): string {
  const eloConfig = customConfig || getActiveEloConfig();
  const scaleFactor = eloConfig.scaleFactor || 400;
  const baseRating = eloConfig.baseRating || 1500;
  const carryoverAlpha = eloConfig.carryoverAlpha ?? 0.75;
  const carryoverBetaStr = (1 - carryoverAlpha).toFixed(2);
  const carryoverPreservedPct = Math.round(carryoverAlpha * 100);
  const carryoverRegressedPct = Math.round((1 - carryoverAlpha) * 100);
  const probDiff100 = computeEloWinProbability(baseRating + 100, baseRating, scaleFactor).toFixed(0);
  const kGuide = formatKFactorsGuide(eloConfig.kFactors || {});

  return `
    <div class="border rounded-2xl overflow-hidden text-xs mt-1" style="border-color: var(--table-border); background: var(--table-surface);">
      <button type="button" onclick="window.toggleGuide && window.toggleGuide('elo-guide')" class="w-full px-3.5 py-2.5 flex items-center justify-between font-bold text-left transition hover:bg-white/5 cursor-pointer" style="color: var(--text-main);">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-circle-question text-amber-400 text-xs"></i>
          <span class="font-bold text-xs sm:text-sm">Guida al Calcolo dell'Elo Rating Dinamico</span>
        </div>
        <i id="elo-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-xs" style="color: var(--text-muted);"></i>
      </button>
      <div id="elo-guide-content" class="px-4 pb-4 pt-2 space-y-3.5 border-t hidden" style="border-color: var(--table-border); color: var(--text-muted);">
        <div>
          <div class="flex items-center justify-between flex-wrap gap-1">
            <strong class="font-semibold text-xs" style="color: var(--text-main);">1. Probabilità Attesa di Vittoria (Curva Logistica):</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">E_A = 1 / (1 + 10^((R_B - R_A) / ${scaleFactor}))</code>
          </div>
          <p class="mt-1 text-[11px] leading-relaxed">
            Stima la probabilità percentuale di successo prima del calcio d'inizio. Se due squadre hanno pari punteggio, entrambe partono al 50.0%. Un vantaggio di +100 pt Elo attribuisce circa il ${probDiff100}% di probabilità stimata alla squadra favorita.
          </p>
        </div>

        <div>
          <div class="flex items-center justify-between flex-wrap gap-1">
            <strong class="font-semibold text-xs" style="color: var(--text-main);">2. Calibrazione Hybrid-Capped &amp; Risoluzione Paradosso Pareggi:</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">S^hyb = 0.5 + 0.15·tanh(ΔFP/6) • G_cap ∈ [1.0, 1.75]</code>
          </div>
          <p class="mt-1 text-[11px] leading-relaxed">
            Nelle sfide vinte, il moltiplicatore di margine scala con i gol e il gap FantaPunti (FP limitati all'intervallo [60, 90] contro gli outlier) fino a un tetto di 1.75. Nei pareggi, lo shift direzionale tanh premia la squadra che ha prodotto più punteggio senza mai penalizzare il favorito più dello sfavorito.
          </p>
        </div>

        <div>
          <div class="flex items-center justify-between flex-wrap gap-1">
            <strong class="font-semibold text-xs" style="color: var(--text-main);">3. Sensibilità K-Factor per Competizione:</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">${kGuide.badge}</code>
          </div>
          <p class="mt-1 text-[11px] leading-relaxed">
            ${kGuide.description}
          </p>
        </div>

        <div>
          <div class="flex items-center justify-between flex-wrap gap-1">
            <strong class="font-semibold text-xs" style="color: var(--text-main);">4. Architettura a 3 Tracce (Puro, Storico, Atlas Power):</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">⚡ Puro: ${baseRating} baseline • 🏛️ Storico: Seed Albo d'Oro • 🔮 Atlas Power</code>
          </div>
          <p class="mt-1 text-[11px] leading-relaxed">
            <strong>⚡ Elo Puro:</strong> Reset a ${baseRating} per tutti a inizio 2025/26, misura unicamente la prestazione sportiva sul campo senza considerare il passato.<br/>
            <strong>🏛️ Elo Storico:</strong> Inizializza i manager con un bonus/malus calcolato sull'Indice di Prestigio del Palmarès storico (Scudetti, Coppe e podi), ponderando la tradizione di lega.<br/>
            <strong>🔮 Atlas Power:</strong> Sistema continuo Dual-Kernel All-Play basato sulla funzione sigmoide di Fermi-Dirac (s = 8.5) e decay dell'incertezza post-asta, isolando la qualità assoluta del roster dal calendario.
          </p>
        </div>

        <div>
          <div class="flex items-center justify-between flex-wrap gap-1">
            <strong class="font-semibold text-xs" style="color: var(--text-main);">5. Metriche Studio: Golo Score &amp; Sfiga di Calendario:</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">Golo = Gol Reali / xG • Sfiga Δ = Punti Reali - xPts All-Play</code>
          </div>
          <p class="mt-1 text-[11px] leading-relaxed">
            <strong>Golo Score:</strong> Rapporto di efficacia realizzativa. Un valore > 1.00 indica cinismo e conversione letale dei fanta-punti in gol.<br/>
            <strong>Sfiga Δ:</strong> Misura quanti punti di classifica sono stati guadagnati o persi per pura casualità dell'accoppiamento del calendario rispetto a una simulazione All-Play perfetta.
          </p>
        </div>

        <div>
          <div class="flex items-center justify-between flex-wrap gap-1">
            <strong class="font-semibold text-xs" style="color: var(--text-main);">6. Regressione alla Media Inter-Stagionale (Carryover):</strong>
            <code class="font-mono text-[10px] px-1.5 py-0.5 rounded border" style="border-color: var(--table-border); background: var(--modal-bg); color: var(--text-main);">R_start = ${carryoverAlpha} · R_end + ${carryoverBetaStr} · ${baseRating}</code>
          </div>
          <p class="mt-1 text-[11px] leading-relaxed">
            A ogni cambio di stagione il ${carryoverPreservedPct}% del rating viene preservato, mentre il ${carryoverRegressedPct}% regredisce verso la media di lega (${baseRating}). Questo simula fedelmente l'effetto livellante delle aste estive e dei nuovi acquisti di mercato.
          </p>
        </div>
      </div>
    </div>
  `;
}
