import type { MultiManagerProfileData, MiniTournamentEntry } from '@/analytics/multiManager';
import { formatScore } from '@/score';

/**
 * Renders the Mini-Tournament Standings table computed exclusively across direct clashes
 * between the selected managers in shared completed seasons.
 */
export function renderMiniTournamentTable(
  miniTournament: MiniTournamentEntry[],
  sharedSeasonsCount: number,
  mode: 'ppg' | 'simultaneous' = 'simultaneous',
  totalPairwiseSeasonsCount = 0
): string {
  if (!miniTournament || miniTournament.length === 0) {
    return `<div class="p-4 text-center text-xs opacity-60">Nessun confronto disponibile</div>`;
  }

  const isSimultaneous = mode === 'simultaneous';

  const rows = miniTournament
    .map((entry, index) => {
      const isLeader = index === 0;
      const rankBadge = isLeader
        ? `<span class="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500/20 text-amber-400 font-black text-[10px] sm:text-[11px] border border-amber-500/30">👑</span>`
        : `<span class="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-800/40 text-slate-300 font-bold text-[9px] sm:text-[10px]">${index + 1}°</span>`;

      const diffClass = entry.pointsDiff > 0 ? 'text-emerald-400 font-bold' : entry.pointsDiff < 0 ? 'text-rose-400 font-bold' : 'opacity-60';
      const formattedDiff = entry.pointsDiff > 0 ? `+${entry.pointsDiff}` : `${entry.pointsDiff}`;

      const ppgDisplay = entry.ppg.toFixed(2);

      return `
        <tr class="border-b transition hover:bg-white/5" style="border-color: var(--table-border);">
          <td class="py-1.5 px-1 text-center">
            ${rankBadge}
          </td>
          <td class="py-1.5 px-1 sm:px-1.5 font-bold">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${entry.color}; box-shadow: 0 0 5px ${entry.color}80;"></span>
              <span class="truncate text-[11px] sm:text-xs max-w-[85px] sm:max-w-[140px]" style="color: var(--text-main);">${entry.managerName}</span>
            </div>
          </td>
          <td class="py-1.5 px-1 text-center opacity-75 font-mono text-[10px] sm:text-[11px]">${entry.matches}</td>
          <td class="py-1.5 px-1 text-center text-emerald-400 font-bold font-mono text-[10px] sm:text-[11px]">${entry.wins}</td>
          <td class="py-1.5 px-1 text-center opacity-60 font-mono text-[10px] sm:text-[11px]">${entry.ties}</td>
          <td class="py-1.5 px-1 text-center text-rose-400 font-bold font-mono text-[10px] sm:text-[11px]">${entry.losses}</td>
          <td class="py-1.5 px-1 text-center font-mono text-[10px] sm:text-[11px] ${diffClass}">${formattedDiff}</td>
          <td class="py-1.5 px-1 text-center font-mono text-[10px] sm:text-[11px] opacity-80">${entry.winRate}%</td>
          <td class="py-1.5 px-1 sm:px-1.5 text-center font-mono text-[11px] sm:text-xs ${isSimultaneous ? 'font-black text-amber-400' : 'opacity-80'}">
            <span class="${isSimultaneous && isLeader ? 'text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20' : ''}">
              ${entry.points}
            </span>
          </td>
          ${!isSimultaneous ? `
            <td class="py-1.5 px-1 sm:px-1.5 text-center font-mono text-[11px] sm:text-xs font-black">
              <span class="${isLeader ? 'text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20' : 'text-amber-300 font-bold'}">
                ${ppgDisplay}
              </span>
            </td>
          ` : ''}
        </tr>
      `;
    })
    .join('');

  const toggleButtons = `
    <div class="flex items-center p-0.5 rounded-xl border text-[11px] font-bold shadow-sm"
         style="background-color: var(--modal-bg); border-color: var(--table-border);">
      <button type="button" onclick="window.setMultiTournamentMode && window.setMultiTournamentMode('simultaneous')"
        class="px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${isSimultaneous ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
        style="${isSimultaneous ? 'color: #020617;' : 'color: var(--text-main);'}">
        <i class="fa-solid fa-equals text-[10px]"></i>
        <span>Solo Contemporanee</span>
      </button>
      <button type="button" onclick="window.setMultiTournamentMode && window.setMultiTournamentMode('ppg')"
        class="px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${!isSimultaneous ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'opacity-70 hover:opacity-100'}"
        style="${!isSimultaneous ? 'color: #020617;' : 'color: var(--text-main);'}">
        <i class="fa-solid fa-calculator text-[10px]"></i>
        <span>Tutte le Stagioni (PPG)</span>
      </button>
    </div>
  `;

  return `
    <div class="rounded-xl border overflow-hidden" style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="px-3.5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2" style="border-color: var(--table-border);">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-trophy text-amber-400 text-xs"></i>
          <h3 class="font-bold text-xs uppercase tracking-wider" style="color: var(--text-main);">
            Mini-Torneo Incrociato
          </h3>
        </div>
        ${toggleButtons}
      </div>

      ${isSimultaneous && sharedSeasonsCount === 0 ? `
        <div class="p-6 text-center">
          <div class="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-2 text-base border border-amber-500/20">
            <i class="fa-solid fa-calendar-xmark"></i>
          </div>
          <h4 class="font-bold text-xs uppercase tracking-wider text-amber-400">Nessun Campionato Comune Simultaneo</h4>
          <p class="text-[11px] opacity-75 mt-1 max-w-md mx-auto leading-relaxed" style="color: var(--text-muted);">
            I manager selezionati hanno militato in periodi differenti e non hanno mai disputato lo stesso campionato tutti insieme.
          </p>
          <button type="button" onclick="window.setMultiTournamentMode && window.setMultiTournamentMode('ppg')"
            class="mt-3 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow transition hover:opacity-90">
            <i class="fa-solid fa-calculator text-[11px]"></i>
            <span>Passa a Tutte le Stagioni (Media Punti PPG)</span>
          </button>
        </div>
      ` : `
        <div class="w-full overflow-x-auto scrollbar-none">
          <table class="w-full text-xs text-left table-auto">
            <thead>
              <tr class="border-b uppercase text-[9px] tracking-wider opacity-60 font-bold" style="border-color: var(--table-border); background-color: var(--table-header-bg);">
                <th class="py-1.5 px-1 text-center w-5 sm:w-6">#</th>
                <th class="py-1.5 px-1 sm:px-1.5">Manager</th>
                <th class="py-1.5 px-1 text-center w-6 sm:w-7" title="Partite Giocate">PG</th>
                <th class="py-1.5 px-1 text-center text-emerald-400 w-6 sm:w-7" title="Vittorie">V</th>
                <th class="py-1.5 px-1 text-center opacity-70 w-6 sm:w-7" title="Pareggi">N</th>
                <th class="py-1.5 px-1 text-center text-rose-400 w-6 sm:w-7" title="Sconfitte">P</th>
                <th class="py-1.5 px-1 text-center w-8 sm:w-10" title="Differenza Fantapunti">Diff</th>
                <th class="py-1.5 px-1 text-center w-9 sm:w-11" title="Percentuale Vittorie">Win%</th>
                <th class="py-1.5 px-1 sm:px-1.5 text-center ${isSimultaneous ? 'text-amber-400 font-black' : ''} w-7 sm:w-8" title="Punti Classifica (3 pt V, 1 pt N)">PT</th>
                ${!isSimultaneous ? '<th class="py-1.5 px-1 sm:px-1.5 text-center text-amber-400 font-black w-12 sm:w-14" title="Punti per Partita (Normalizzazione)">Media Pt</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `}
      <div class="px-3 py-1.5 bg-black/10 border-t text-[10px] opacity-65 flex items-center justify-between" style="border-color: var(--table-border);">
        <span>${isSimultaneous ? `${sharedSeasonsCount} ${sharedSeasonsCount === 1 ? 'stagione contemporanea' : 'stagioni contemporanee'} (pari partite giocate)` : `Tutti gli scontri diretti (${totalPairwiseSeasonsCount} stagioni incrociate)`}</span>
        <span>${isSimultaneous ? 'Classifica per Punti Assoluti' : 'Classifica ordinata per Media Punti (PPG)'}</span>
      </div>
    </div>
  `;
}

/**
 * Renders parallel career comparison table for all selected managers
 * Uses a fluid table-fixed layout without horizontal scrolling on desktop
 */
export function renderCareerComparisonTable(profiles: MultiManagerProfileData[]): string {
  if (!profiles || profiles.length === 0) return '';

  const colWidthPct = profiles.length > 0 ? (76 / profiles.length).toFixed(1) : '15';

  const headers = profiles
    .map(p => `
      <th class="py-1.5 sm:py-2 px-1 sm:px-2 text-center border-l min-w-[105px] sm:min-w-[120px] md:min-w-0 md:w-[${colWidthPct}%]" style="border-color: var(--table-border);">
        <div class="flex flex-col items-center gap-0.5 sm:gap-1">
          <div class="flex items-center gap-1.5 max-w-[95px] sm:max-w-none">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${p.color}; box-shadow: 0 0 6px ${p.color}80;"></span>
            <span class="font-sport font-black text-[11px] sm:text-xs uppercase truncate" style="color: var(--text-main);">${p.manager.name}</span>
          </div>
          <span class="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full font-bold border truncate max-w-[95px] sm:max-w-none" style="color: ${p.metrics.archetypeColor}; border-color: ${p.metrics.archetypeColor}40; background-color: ${p.metrics.archetypeColor}15;">
            ${p.metrics.archetypeTag}
          </span>
        </div>
      </th>
    `)
    .join('');

  interface MetricRowDef {
    label: string;
    icon: string;
    getValue: (p: MultiManagerProfileData) => string;
  }

  const metricRows: MetricRowDef[] = [
    {
      label: 'Rating All-Time',
      icon: 'fa-solid fa-star text-amber-400',
      getValue: p => `<span class="font-black font-mono text-amber-400 text-xs sm:text-sm">${formatScore(p.metrics.score)} PT</span>`
    },
    {
      label: 'Presenze (Anni)',
      icon: 'fa-regular fa-calendar text-slate-400',
      getValue: p => `<span class="font-mono font-bold text-xs sm:text-sm">${p.metrics.completedYears}</span>`
    },
    {
      label: 'Scudetti 🥇',
      icon: 'fa-solid fa-award text-amber-400',
      getValue: p => `<span class="font-mono font-bold text-xs sm:text-sm ${p.manager.gold ? 'text-amber-400 font-black' : 'opacity-40'}">${p.manager.gold || 0}</span>`
    },
    {
      label: 'Coppe di Lega 🏆',
      icon: 'fa-solid fa-trophy text-amber-500',
      getValue: p => `<span class="font-mono font-bold text-xs sm:text-sm ${p.manager.cup_gold ? 'text-amber-300 font-black' : 'opacity-40'}">${p.manager.cup_gold || 0}</span>`
    },
    {
      label: 'Supercoppe ⭐',
      icon: 'fa-solid fa-bolt text-yellow-400',
      getValue: p => `<span class="font-mono font-bold text-xs sm:text-sm ${p.manager.supercup ? 'text-yellow-400 font-black' : 'opacity-40'}">${p.manager.supercup || 0}</span>`
    },
    {
      label: 'Mundialito 🌍',
      icon: 'fa-solid fa-earth-americas text-emerald-400',
      getValue: p => `<span class="font-mono font-bold text-xs sm:text-sm ${p.manager.mundialito ? 'text-emerald-400 font-black' : 'opacity-40'}">${p.manager.mundialito || 0}</span>`
    },
    {
      label: 'Cucchiai 🥄',
      icon: 'fa-solid fa-utensils text-rose-400',
      getValue: p => `<span class="font-mono font-bold text-xs sm:text-sm ${p.manager.spoon ? 'text-rose-400 font-black' : 'opacity-40'}">${p.manager.spoon || 0}</span>`
    },
    {
      label: 'Miglior Posto',
      icon: 'fa-solid fa-chart-line text-cyan-400',
      getValue: p => p.metrics.bestRank ? `<span class="font-mono font-bold text-xs sm:text-sm">${p.metrics.bestRank}°</span>` : '<span class="opacity-40">-</span>'
    },
    {
      label: 'Freddezza (GCI)',
      icon: 'fa-solid fa-snowflake text-cyan-400',
      getValue: p => `<span class="font-bold text-[10px] sm:text-[11px] inline-flex items-center justify-center gap-1">${p.metrics.clutchIcon} <span class="truncate max-w-[85px] sm:max-w-none">${p.metrics.clutchLabel}</span></span>`
    },
    {
      label: 'Anti-Baratro (NTI)',
      icon: 'fa-solid fa-shield-halved text-emerald-400',
      getValue: p => `
        <span class="font-bold text-[9.5px] sm:text-[11px] inline-flex items-center justify-center gap-1">
          <i class="fa-solid ${p.metrics.polarityIcon.replace(/^fa-solid\s+/, '')} text-[9px] sm:text-[10px] shrink-0" style="color: ${p.metrics.polarityColor};"></i>
          <span class="truncate max-w-[85px] sm:max-w-none" title="${p.metrics.polarityLabel}">${p.metrics.polarityLabel}</span>
        </span>
      `
    }
  ];

  const bodyRows = metricRows
    .map(row => `
      <tr class="border-b transition hover:bg-white/5" style="border-color: var(--table-border);">
        <td class="py-1.5 sm:py-2 px-1.5 sm:px-2.5 font-semibold text-[10px] sm:text-xs opacity-90 sticky left-0 md:static z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] md:shadow-none border-r md:border-r-0 min-w-[95px] w-[95px] sm:min-w-[120px] sm:w-[120px] md:min-w-0 md:w-[24%]"
            style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div class="flex items-center gap-1.5 whitespace-nowrap">
            <i class="${row.icon} w-3 sm:w-3.5 text-center text-[10px] sm:text-xs shrink-0"></i>
            <span>${row.label}</span>
          </div>
        </td>
        ${profiles
          .map(
            p => `
          <td class="py-1.5 sm:py-2 px-1 sm:px-2 text-center border-l text-xs min-w-[105px] sm:min-w-[120px] md:min-w-0" style="border-color: var(--table-border);">
            ${row.getValue(p)}
          </td>
        `
          )
          .join('')}
      </tr>
    `)
    .join('');

  return `
    <div class="rounded-xl border overflow-hidden" style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="px-3.5 py-2.5 border-b flex items-center justify-between" style="border-color: var(--table-border);">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-table-columns text-cyan-400 text-xs"></i>
          <h3 class="font-bold text-xs uppercase tracking-wider" style="color: var(--text-main);">
            Confronto Carriera a Colonne Parallele
          </h3>
        </div>
        <span class="text-[10px] font-semibold opacity-60">Metriche All-Time di Lega</span>
      </div>

      <div class="w-full overflow-x-auto md:overflow-x-visible scrollbar-thin">
        <table class="w-full text-xs md:table-fixed">
          <thead>
            <tr class="border-b uppercase text-[9px] tracking-wider font-bold" style="border-color: var(--table-border); background-color: var(--table-header-bg);">
              <th class="py-1.5 sm:py-2 px-1.5 sm:px-2.5 text-left sticky left-0 md:static z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] md:shadow-none border-r md:border-r-0 min-w-[95px] w-[95px] sm:min-w-[120px] sm:w-[120px] md:min-w-0 md:w-[24%]"
                  style="background-color: var(--modal-bg); border-color: var(--table-border);">Metrica</th>
              ${headers}
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
