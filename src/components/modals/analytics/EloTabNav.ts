/**
 * src/components/modals/analytics/EloTabNav.ts
 * Navigation bars, segment switchers, and explanation card templates for Elo Studio
 */

import type { EloModalTab, EloTrackMode } from '@/types/analytics';
import type { EloProfileEntry } from './EloKpis';

export function renderEloTabButton(
  id: EloModalTab,
  label: string,
  mobileLabel: string,
  icon: string,
  currentTab: EloModalTab
): string {
  const isActive = currentTab === id;
  return `
    <button 
      type="button" 
      onclick="window.switchEloModalTab && window.switchEloModalTab('${id}')" 
      class="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition shadow-sm whitespace-nowrap ${isActive ? '' : 'hover:bg-white/5'}"
      style="${isActive
      ? 'background-color: var(--btn-bg); color: var(--btn-text); border: 1px solid var(--btn-border);'
      : 'color: var(--text-muted); background: transparent; border: 1px solid transparent;'
    }"
    >
      <i class="${icon} text-[9px] sm:text-xs shrink-0"></i>
      <span>
        <span class="sm:hidden">${mobileLabel}</span>
        <span class="hidden sm:inline">${label}</span>
      </span>
    </button>
  `;
}

export function renderEloModalHeader(): string {
  return `
    <div class="px-3.5 py-2.5 sm:px-6 sm:py-3.5 border-b flex items-center justify-between shrink-0" style="border-color: var(--table-border);">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-sm" style="background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.3);">
          <i class="fa-solid fa-bolt text-violet-400"></i>
        </div>
        <div>
          <h2 class="flex items-center gap-2 text-sm sm:text-base font-black tracking-tight" style="color: var(--text-main);">
            <span>Elo Rating &amp; Power Studio</span>
            <img src="favicon-64x64.png" alt="InsalAtlas logo" class="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
          </h2>
          <span class="text-[11px]" style="color: var(--text-muted);">Calibrazione 3-Track • Studio Golo • Correlazione FP • Sfiga SOS</span>
        </div>
      </div>
      <button type="button" onclick="window.closeEloModal && window.closeEloModal()" class="w-7 h-7 rounded-full flex items-center justify-center transition border cursor-pointer"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>
  `;
}

export function renderEloModalFooter(): string {
  return `
    <div class="px-3.5 py-2 sm:px-6 sm:py-3 border-t flex justify-end shrink-0" style="border-color: var(--table-border);">
      <button type="button" onclick="window.closeEloModal && window.closeEloModal()" class="px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition shadow-sm cursor-pointer"
        style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
        Chiudi
      </button>
    </div>
  `;
}

export function renderEloModeSwitcher(activeMode: EloTrackMode): string {
  return `
    <div class="p-3 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div>
        <div class="flex items-center gap-2">
          <h3 class="font-sport font-black text-sm sm:text-base tracking-wide flex items-center gap-1.5" style="color: var(--text-main);">
            <i class="fa-solid fa-bolt text-amber-500"></i>
            <span>Dynamic Elo 3-Track System</span>
          </h3>
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 uppercase tracking-wider">
            ${activeMode === 'flat' ? '⚡ Puro' : activeMode === 'historical' ? '🏛️ Storico' : '🔮 Atlas Power'}
          </span>
        </div>
        <p class="text-[11px] opacity-75 mt-0.5 max-w-xl" style="color: var(--text-muted);">
          ${activeMode === 'flat'
            ? '<strong>Traccia Pura (1500 Baseline):</strong> Reset a 1500 per tutti alla prima stagione tracciata. Calibrazione Hybrid-Capped con risoluzione del paradosso dei pareggi e carryover inter-stagionale mean-centered.'
            : activeMode === 'historical'
              ? '<strong>Traccia Storica (Ponderata):</strong> Inizializzazione basata sull\'Indice di Prestigio dell\'Albo d\'Oro (1350-1650 pt) con aggiornamento bilaterale Hybrid-Capped.'
              : '<strong>Traccia Atlas Power (All-Play):</strong> Modello continuo basato sulla funzione sigmoide di Fermi-Dirac (s = 8.5) e kernel All-Play simmetrico, isolando la qualità assoluta del roster dal calendario.'}
        </p>
      </div>

      <!-- Mode Toggle 3-Track Segmented Control -->
      <div class="flex items-center p-1 rounded-xl border shrink-0 w-full sm:w-auto"
           style="background-color: var(--input-bg); border-color: var(--table-border);">
        <button type="button"
                onclick="window.switchEloMode && window.switchEloMode('flat')"
                class="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${activeMode === 'flat' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
          <span>⚡ Puro</span>
        </button>
        <button type="button"
                onclick="window.switchEloMode && window.switchEloMode('historical')"
                class="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${activeMode === 'historical' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
          <span>🏛️ Storico</span>
        </button>
        <button type="button"
                onclick="window.switchEloMode && window.switchEloMode('atlas')"
                class="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${activeMode === 'atlas' ? 'bg-purple-500 text-white shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
          <span>🔮 Atlas</span>
        </button>
      </div>
    </div>
  `;
}

export function renderScatterSeasonPills(
  availableSeasons: string[],
  selectedScatterSeason: string,
  profiles: EloProfileEntry[]
): string {
  const analyzedCount = profiles.filter(p => {
    if (!p.profile.seasonStats) return true;
    const st = selectedScatterSeason === 'all'
      ? p.profile.seasonStats['all']
      : p.profile.seasonStats[selectedScatterSeason];
    return Boolean(st && typeof st.played === 'number' ? st.played > 0 : true);
  }).length;

  return `
    <div class="flex items-center justify-between gap-2 p-2 rounded-xl border flex-wrap text-xs"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="flex items-center gap-2">
        <span class="text-[11px] font-bold opacity-75" style="color: var(--text-muted);">
          <i class="fa-solid fa-calendar-days mr-1 text-amber-400"></i>Periodo Analisi:
        </span>
        <div class="flex items-center p-0.5 rounded-lg border" style="background-color: var(--input-bg); border-color: var(--table-border);">
          ${availableSeasons.map((sKey, idx) => `
          <button type="button"
                  onclick="window.switchEloScatterSeason && window.switchEloScatterSeason('${sKey}')"
                  class="px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${selectedScatterSeason === sKey ? 'bg-amber-500 text-slate-950 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
            <span>${sKey}${idx === 0 ? ' (Attuale)' : ''}</span>
          </button>`).join('')}
          <button type="button"
                  onclick="window.switchEloScatterSeason && window.switchEloScatterSeason('all')"
                  class="px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${selectedScatterSeason === 'all' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'opacity-70 hover:opacity-100 text-slate-300'}">
            <span>Totale Era Elo</span>
          </button>
        </div>
      </div>
      <span class="text-[10px] font-mono opacity-60" style="color: var(--text-muted);">
        ${analyzedCount} team analizzati
      </span>
    </div>
  `;
}

export function renderGoloExplanationCard(): string {
  return `
    <div class="p-3.5 sm:p-4 rounded-2xl border text-xs leading-relaxed"
         style="background-color: var(--table-surface); border-color: var(--table-border); color: var(--text-muted);">
      <div class="font-bold text-xs sm:text-sm flex items-center gap-2 mb-1" style="color: var(--text-main);">
        <i class="fa-solid fa-futbol text-amber-400"></i>
        <span>Come Leggere lo Studio Golo Score</span>
      </div>
      <p class="text-[11px] leading-relaxed">
        Il <strong>Golo Score</strong> è l'indice proprietario di efficienza di conversione realizzativa: misura il rapporto tra i gol reali segnati e quelli attesi in base alla soglia dei FantaPunti (FP).
        La linea di parità a <strong>1.00</strong> separa i manager cinici capaci di massimizzare i gol con scarti minimi da chi disperde punti senza trasformarli in marcature.
      </p>
    </div>
  `;
}

export function renderFpExplanationCard(): string {
  return `
    <div class="p-3.5 sm:p-4 rounded-2xl border text-xs leading-relaxed"
         style="background-color: var(--table-surface); border-color: var(--table-border); color: var(--text-muted);">
      <div class="font-bold text-xs sm:text-sm flex items-center gap-2 mb-1" style="color: var(--text-main);">
        <i class="fa-solid fa-chart-simple text-purple-400"></i>
        <span>Potenza Roster vs Efficienza Elo</span>
      </div>
      <p class="text-[11px] leading-relaxed">
        La retta di regressione OLS evidenzia il tasso di conversione marginale: quanti punti Elo garantisce ogni FantaPunto medio addizionale.
        I manager nel quadrante in alto a sinistra (<em>Cinici / Fortunati</em>) raggiungono rating elevati nonostante medie punteggio contenute; al contrario, i <em>Giganti d'Argilla</em> producono punteggi mostruosi ma raccolgono meno rating del previsto per sfortuna nei match-up.
      </p>
    </div>
  `;
}

export function renderLuckExplanationCard(): string {
  return `
    <div class="p-3.5 sm:p-4 rounded-2xl border text-xs leading-relaxed"
         style="background-color: var(--table-surface); border-color: var(--table-border); color: var(--text-muted);">
      <div class="font-bold text-xs sm:text-sm flex items-center gap-2 mb-1" style="color: var(--text-main);">
        <i class="fa-solid fa-clover text-cyan-400"></i>
        <span>Diagnostica Schedule Luck &amp; Confronto All-Play</span>
      </div>
      <p class="text-[11px] leading-relaxed">
        La bisettrice perfetta <strong>Y = X</strong> rappresenta la neutralità statistica assoluta.
        Nel confronto <em>Punti Reali vs xPts</em>, i punti al di sopra della retta testimoniano un calendario benevolo (più punti vinti di quanti previsti affrontando l'intera lega contemporaneamente).
        Nel confronto <em>Elo Puro vs Atlas Power</em>, la distanza dalla bisettrice quantifica la discrepanza tra la fortuna degli incroci bilaterali e la vera forza intrinseca della rosa.
      </p>
    </div>
  `;
}

export function renderEloErrorState(): string {
  return `
    <div class="p-8 text-center text-xs opacity-80 flex flex-col items-center justify-center gap-3">
      <i class="fa-solid fa-triangle-exclamation text-amber-500 text-2xl"></i>
      <div class="font-bold text-sm" style="color: var(--text-main);">Dati Elo non disponibili</div>
      <p class="text-[11px] opacity-70 max-w-sm" style="color: var(--text-muted);">
        Impossibile caricare il file analytics_data.json. Verifica la connessione o prova a ricaricare.
      </p>
      <button type="button"
              onclick="window.retryEloFetch && window.retryEloFetch()"
              class="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition cursor-pointer">
        <i class="fa-solid fa-rotate-right mr-1.5"></i>
        <span>Riprova</span>
      </button>
    </div>
  `;
}

export function renderEloLoadingState(): string {
  return `
    <div class="p-8 text-center text-xs opacity-80 flex flex-col items-center justify-center gap-3">
      <i class="fa-solid fa-spinner fa-spin text-amber-500 text-2xl"></i>
      <div class="font-bold text-sm" style="color: var(--text-main);">Caricamento dati Elo & Power Studio in corso...</div>
      <p class="text-[11px] opacity-70 max-w-sm" style="color: var(--text-muted);">
        Recupero valutazioni dinamiche 3-track e diagnostiche multi-stagione.
      </p>
    </div>
  `;
}

export function renderEloEmptyState(): string {
  return `
    <div class="p-8 text-center text-xs opacity-80 flex flex-col items-center justify-center gap-3">
      <i class="fa-solid fa-circle-info text-amber-500 text-2xl"></i>
      <div class="font-bold text-sm" style="color: var(--text-main);">Nessun dato Elo disponibile</div>
      <p class="text-[11px] opacity-70 max-w-sm" style="color: var(--text-muted);">
        Nessuna valutazione registrata per la stagione corrente.
      </p>
    </div>
  `;
}
