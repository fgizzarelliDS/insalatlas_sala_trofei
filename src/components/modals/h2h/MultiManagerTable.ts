import type { MultiManagerProfileData, MiniTournamentEntry } from '@/analytics/multiManager';
import { formatScore } from '@/score';

/**
 * Renders the Mini-Tournament Standings table computed exclusively across direct clashes
 * between the selected managers in shared completed seasons.
 */
export function renderMiniTournamentTable(
  miniTournament: MiniTournamentEntry[],
  sharedSeasonsCount: number
): string {
  if (!miniTournament || miniTournament.length === 0) {
    return `<div class="p-4 text-center text-xs opacity-60">Nessun confronto disponibile</div>`;
  }

  if (sharedSeasonsCount === 0) {
    return `
      <div class="rounded-xl border overflow-hidden p-6 text-center shadow-sm"
           style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-2 text-base border border-amber-500/20">
          <i class="fa-solid fa-calendar-xmark"></i>
        </div>
        <h4 class="font-bold text-xs uppercase tracking-wider text-amber-400">Nessun Campionato Comune Simultaneo</h4>
        <p class="text-[11px] opacity-75 mt-1 max-w-md mx-auto leading-relaxed" style="color: var(--text-muted);">
          I manager selezionati hanno militato in periodi storici differenti e non hanno mai disputato lo stesso campionato insieme. Il mini-torneo richiede almeno una stagione comune.
        </p>
      </div>
    `;
  }

  const rows = miniTournament
    .map((entry, index) => {
      const isLeader = index === 0;
      const rankBadge = isLeader
        ? `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-black text-[11px] border border-amber-500/30">👑</span>`
        : `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800/40 text-slate-300 font-bold text-[10px]">${index + 1}°</span>`;

      const diffClass = entry.pointsDiff > 0 ? 'text-emerald-400 font-bold' : entry.pointsDiff < 0 ? 'text-rose-400 font-bold' : 'opacity-60';
      const formattedDiff = entry.pointsDiff > 0 ? `+${entry.pointsDiff}` : `${entry.pointsDiff}`;

      return `
        <tr class="border-b transition hover:bg-white/5" style="border-color: var(--table-border);">
          <td class="py-2 px-2 text-center whitespace-nowrap">
            ${rankBadge}
          </td>
          <td class="py-2 px-2 font-bold whitespace-nowrap">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${entry.color}; box-shadow: 0 0 6px ${entry.color}80;"></span>
              <span class="truncate max-w-[120px] sm:max-w-[160px]" style="color: var(--text-main);">${entry.managerName}</span>
            </div>
          </td>
          <td class="py-2 px-2 text-center opacity-75 font-mono text-xs">${entry.matches}</td>
          <td class="py-2 px-2 text-center text-emerald-400 font-bold font-mono text-xs">${entry.wins}</td>
          <td class="py-2 px-2 text-center opacity-60 font-mono text-xs">${entry.ties}</td>
          <td class="py-2 px-2 text-center text-rose-400 font-bold font-mono text-xs">${entry.losses}</td>
          <td class="py-2 px-2 text-center font-mono text-xs ${diffClass}">${formattedDiff}</td>
          <td class="py-2 px-2 text-center font-mono text-xs opacity-80">${entry.winRate}%</td>
          <td class="py-2 px-2.5 text-center font-black font-mono text-sm">
            <span class="${isLeader ? 'text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20' : ''}">
              ${entry.points}
            </span>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="rounded-xl border overflow-hidden" style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="px-3.5 py-2.5 border-b flex items-center justify-between" style="border-color: var(--table-border);">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-trophy text-amber-400 text-xs"></i>
          <h3 class="font-bold text-xs uppercase tracking-wider" style="color: var(--text-main);">
            Mini-Torneo Incrociato
          </h3>
        </div>
        <span class="text-[10px] font-semibold opacity-75">
          ${sharedSeasonsCount} ${sharedSeasonsCount === 1 ? 'stagione contemporanea' : 'stagioni contemporanee'}
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead>
            <tr class="border-b uppercase text-[9px] tracking-wider opacity-60 font-bold" style="border-color: var(--table-border); background-color: var(--table-header-bg);">
              <th class="py-1.5 px-2 text-center">#</th>
              <th class="py-1.5 px-2">Manager</th>
              <th class="py-1.5 px-2 text-center" title="Partite Giocate">PG</th>
              <th class="py-1.5 px-2 text-center text-emerald-400" title="Vittorie">V</th>
              <th class="py-1.5 px-2 text-center opacity-70" title="Pareggi">N</th>
              <th class="py-1.5 px-2 text-center text-rose-400" title="Sconfitte">P</th>
              <th class="py-1.5 px-2 text-center" title="Differenza Fantapunti">Diff</th>
              <th class="py-1.5 px-2 text-center" title="Percentuale Vittorie">Win%</th>
              <th class="py-1.5 px-2.5 text-center font-black" title="Punti Classifica (3 pt V, 1 pt N)">PT</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      <div class="px-3 py-1.5 bg-black/10 border-t text-[10px] opacity-60 flex items-center justify-between" style="border-color: var(--table-border);">
        <span>3 pt per vittoria, 1 pt per pareggio</span>
        <span>Classifica calcolata esclusivamente sulle stagioni disputate insieme</span>
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

  const colWidthPct = profiles.length > 0 ? (75 / profiles.length).toFixed(1) : '15';

  const headers = profiles
    .map(p => `
      <th class="py-2 px-1.5 sm:px-2 text-center border-l truncate" style="border-color: var(--table-border); width: ${colWidthPct}%;">
        <div class="flex flex-col items-center gap-0.5">
          <div class="flex items-center gap-1.5 max-w-full truncate">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${p.color}; box-shadow: 0 0 6px ${p.color}80;"></span>
            <span class="font-sport font-black text-xs uppercase truncate" style="color: var(--text-main);">${p.manager.name}</span>
          </div>
          <span class="text-[8.5px] px-1.5 py-0.5 rounded-full font-bold border max-w-full truncate" style="color: ${p.metrics.archetypeColor}; border-color: ${p.metrics.archetypeColor}40; background-color: ${p.metrics.archetypeColor}15;">
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
      getValue: p => `<span class="font-black font-mono text-amber-400">${formatScore(p.metrics.score)} PT</span>`
    },
    {
      label: 'Presenze (Anni)',
      icon: 'fa-regular fa-calendar',
      getValue: p => `<span class="font-mono font-bold">${p.metrics.completedYears}</span>`
    },
    {
      label: 'Scudetti 🥇',
      icon: 'fa-solid fa-award text-amber-400',
      getValue: p => `<span class="font-mono font-bold ${p.manager.gold ? 'text-amber-400 font-black' : 'opacity-40'}">${p.manager.gold || 0}</span>`
    },
    {
      label: 'Coppe di Lega 🏆',
      icon: 'fa-solid fa-trophy text-amber-500',
      getValue: p => `<span class="font-mono font-bold ${p.manager.cup_gold ? 'text-amber-300 font-black' : 'opacity-40'}">${p.manager.cup_gold || 0}</span>`
    },
    {
      label: 'Supercoppe ⭐',
      icon: 'fa-solid fa-bolt text-yellow-400',
      getValue: p => `<span class="font-mono font-bold ${p.manager.supercup ? 'text-yellow-400 font-black' : 'opacity-40'}">${p.manager.supercup || 0}</span>`
    },
    {
      label: 'Mundialito 🌍',
      icon: 'fa-solid fa-earth-americas text-emerald-400',
      getValue: p => `<span class="font-mono font-bold ${p.manager.mundialito ? 'text-emerald-400 font-black' : 'opacity-40'}">${p.manager.mundialito || 0}</span>`
    },
    {
      label: 'Cucchiai 🥄',
      icon: 'fa-solid fa-utensils text-rose-400',
      getValue: p => `<span class="font-mono font-bold ${p.manager.spoon ? 'text-rose-400 font-black' : 'opacity-40'}">${p.manager.spoon || 0}</span>`
    },
    {
      label: 'Miglior Posto',
      icon: 'fa-solid fa-chart-line-up',
      getValue: p => p.metrics.bestRank ? `<span class="font-mono font-bold">${p.metrics.bestRank}°</span>` : '<span class="opacity-40">-</span>'
    },
    {
      label: 'Freddezza (GCI)',
      icon: 'fa-solid fa-snowflake text-cyan-400',
      getValue: p => `<span class="font-bold text-xs">${p.metrics.clutchIcon} ${p.metrics.clutchLabel}</span>`
    },
    {
      label: 'Anti-Baratro (NTI)',
      icon: 'fa-solid fa-shield-halved text-emerald-400',
      getValue: p => `
        <span class="font-bold text-xs inline-flex items-center justify-center gap-1.5">
          <i class="fa-solid ${p.metrics.polarityIcon.replace(/^fa-solid\s+/, '')} text-[11px]" style="color: ${p.metrics.polarityColor};"></i>
          <span>${p.metrics.polarityLabel}</span>
        </span>
      `
    }
  ];

  const bodyRows = metricRows
    .map(row => `
      <tr class="border-b transition hover:bg-white/5" style="border-color: var(--table-border);">
        <td class="py-1.5 sm:py-2 px-2 sm:px-2.5 font-semibold text-xs opacity-80" style="color: var(--text-main);">
          <div class="flex items-center gap-1.5 truncate">
            <i class="${row.icon} w-3.5 text-center text-xs shrink-0"></i>
            <span class="truncate">${row.label}</span>
          </div>
        </td>
        ${profiles
          .map(
            p => `
          <td class="py-1.5 sm:py-2 px-1 text-center border-l text-xs" style="border-color: var(--table-border);">
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

      <div class="overflow-x-auto lg:overflow-x-visible">
        <table class="w-full table-fixed text-xs">
          <thead>
            <tr class="border-b uppercase text-[9px] tracking-wider font-bold" style="border-color: var(--table-border); background-color: var(--table-header-bg);">
              <th class="py-2 px-2 sm:px-2.5 text-left w-[25%] sm:w-[22%]">Metrica</th>
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
