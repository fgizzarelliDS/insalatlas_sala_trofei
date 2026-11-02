import type { LeagueRecord } from '@/types';
import { state } from '@/state';
import { computeAllLeagueRecords } from '@/analytics/records';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { renderNodeToCanvas } from '../core';
import { LEAGUE } from '@/config';
import { createStoryContainer, STORY_WIDTH, STORY_HEIGHT } from './base';

/**
 * 4. Renders High-Definition Vertical 9:16 Story for an Individual Hall of Fame Record
 */
export async function renderRecordStoryCanvas(record: LeagueRecord): Promise<HTMLCanvasElement> {
  const { container, contentBox } = createStoryContainer('Primato Storico', record.category.toUpperCase());
  contentBox.className = 'flex-1 flex flex-col justify-between py-4 w-full max-w-[960px] mx-auto';

  const isCoHolders = record.primaryHolders && record.primaryHolders.length > 1;
  const primary = record.primaryHolder;

  // Render Co-holders or single holder hero
  const coHoldersHTML = isCoHolders ? `
    <div class="w-full rounded-3xl border border-slate-800 bg-slate-900/85 p-5 shadow-2xl">
      <div class="text-xs uppercase font-extrabold text-amber-400 tracking-wider mb-3 text-center">
        🤝 Co-Primatisti Ufficiali (Pari Merito)
      </div>
      <div class="grid grid-cols-${Math.min(record.primaryHolders.length, 3)} gap-3">
        ${record.primaryHolders.map(h => `
          <div class="flex flex-col items-center p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            ${h.logo ? `<img src="${h.logo}" class="w-16 h-16 object-contain drop-shadow-md mb-2" onerror="this.onerror=null; this.src='${h.fallbackCrest || 'favicon-64x64.png'}'">` : `<div class="w-16 h-16 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-black text-xl mb-2">${h.fallbackCrest || h.managerName.charAt(0)}</div>`}
            <span class="font-sport font-black text-lg uppercase text-white truncate max-w-full">${h.managerName}</span>
            ${h.season ? `<span class="text-xs text-amber-400 font-bold mt-0.5">${h.season}</span>` : ''}
            ${h.teamName ? `<span class="text-[11px] text-slate-400 truncate max-w-full italic mt-0.5">${h.teamName}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : `
    <div class="w-full flex flex-col items-center text-center p-6 rounded-3xl border border-slate-800 bg-slate-900/85 shadow-2xl">
      <div class="relative mb-3">
        ${primary.logo ? `<img src="${primary.logo}" class="w-28 h-28 object-contain drop-shadow-xl" onerror="this.onerror=null; this.src='${primary.fallbackCrest || 'favicon-64x64.png'}'">` : `<div class="w-28 h-28 rounded-full bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center font-sport font-black text-4xl shadow-xl">${primary.fallbackCrest || primary.managerName.charAt(0)}</div>`}
        <span class="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-lg border-2 border-slate-900">👑</span>
      </div>
      <h2 class="font-sport font-black text-4xl uppercase tracking-wider text-white">
        ${primary.managerName}
      </h2>
      ${primary.teamName ? `<p class="text-sm text-slate-400 font-semibold italic mt-1">${primary.teamName}</p>` : ''}
      ${primary.season ? `<div class="mt-2 px-3.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">${primary.season}</div>` : ''}
    </div>
  `;

  // Runner-ups podium box (if any)
  const runnerUpsHTML = (record.runnerUps && record.runnerUps.length > 0) ? `
    <div class="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl">
      <div class="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2.5 text-center">
        🏆 Podio Storico
      </div>
      <div class="flex items-center justify-around divide-x divide-slate-800">
        ${record.runnerUps.slice(0, 3).map((r, i) => {
          const medal = i === 0 ? '🥈' : i === 1 ? '🥉' : '🎖️';
          const posLabel = `${i + 2}° Classificato`;
          const logo = r.logo || (r.teamName ? resolveTeamLogo(r.teamName) : null);
          const fallback = r.fallbackCrest || (r.teamName ? getTeamFallbackCrest(r.teamName) : null);
          const crestImg = logo
            ? `<img src="${logo}" class="w-10 h-10 object-contain drop-shadow-md rounded-full bg-slate-800/50 p-0.5" onerror="this.onerror=null; this.src='${fallback || 'favicon-64x64.png'}'">`
            : fallback
              ? `<img src="${fallback}" class="w-10 h-10 object-contain drop-shadow-md rounded-full bg-slate-800/50 p-0.5" onerror="this.onerror=null; this.src='favicon-64x64.png'">`
              : `<div class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm shadow">${r.managerName.charAt(0)}</div>`;

          return `
            <div class="flex-1 px-3 flex flex-col items-center text-center">
              <span class="text-[11px] font-bold text-slate-400 mb-1.5">${posLabel}</span>
              <div class="relative inline-flex mb-1.5">
                ${crestImg}
                <span class="absolute -bottom-1 -right-1.5 text-xs drop-shadow">${medal}</span>
              </div>
              <div class="font-bold text-sm text-slate-200 truncate max-w-full">${r.managerName}</div>
              ${r.teamName ? `<div class="text-[10px] text-slate-400 italic truncate max-w-full mt-0.5">${r.teamName}</div>` : ''}
              <div class="text-xs text-amber-400 font-mono font-bold mt-1">${r.formattedValue || r.value}</div>
              ${r.season ? `<div class="text-[10px] text-slate-500 font-medium mt-0.5">${r.season}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  contentBox.innerHTML = `
    <!-- Top Header: Title & Category -->
    <div class="w-full flex flex-col items-center text-center">
      <div class="flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
        <i class="${record.icon}"></i>
        <span>${record.badgeLabel || 'Primato Storico'}</span>
      </div>
      <h1 class="font-sport font-black text-4xl uppercase tracking-wider text-white leading-tight">
        ${record.title}
      </h1>
      ${record.description ? `<p class="text-sm text-slate-400 font-medium max-w-[800px] mt-2 italic">"${record.description}"</p>` : ''}
    </div>

    <!-- Big Value Showcase Box -->
    <div class="w-full p-6 rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
      <span class="text-7xl absolute opacity-10 select-none">${record.watermark || '🏆'}</span>
      <span class="text-xs font-extrabold uppercase tracking-widest text-amber-400/80 mb-1">Valore Ufficiale Record</span>
      <div class="font-sport font-black text-6xl text-amber-400 font-mono tracking-tight drop-shadow-md">
        ${primary.formattedValue}
      </div>
      ${(primary.normalizedDetail || primary.detail) ? `
        <div class="text-sm font-bold text-slate-300 mt-2 px-4 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80">
          ${primary.normalizedDetail || primary.detail}
        </div>
      ` : ''}
    </div>

    <!-- Holder(s) Section -->
    ${coHoldersHTML}

    <!-- Runner-ups Section -->
    ${runnerUpsHTML}
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}

/**
 * 5. Renders High-Definition Vertical 9:16 Story for Marquee Records Summary Poster
 */
export async function renderRecordsSummaryStoryCanvas(recordsList?: LeagueRecord[]): Promise<HTMLCanvasElement> {
  const champLabel = LEAGUE.brand.championshipLabel || LEAGUE.brand.name;
  const { container, contentBox } = createStoryContainer('Hall of Fame', `Top Primati di ${champLabel}`);
  contentBox.className = 'flex-1 flex flex-col justify-between py-3 w-full max-w-[960px] mx-auto';

  const allRecords = recordsList || computeAllLeagueRecords(state.managers, state.competitions);

  // Marquee record IDs to feature in the top story summary
  const targetIds = [
    'max_single_season_points',
    'most_scudetti',
    'most_cups',
    'debut_best_ppg',
    'debut_best_rank',
    'debut_disaster'
  ];

  const marquee = targetIds
    .map(id => allRecords.find(r => r.id === id))
    .filter((r): r is LeagueRecord => Boolean(r));

  const rowsHTML = marquee.map(r => {
    const h = r.primaryHolder;
    const isTied = r.primaryHolders && r.primaryHolders.length > 1;
    const holderText = isTied
      ? `${r.primaryHolders.map(x => x.managerName).join(' & ')} (Pari)`
      : `${h.managerName}${h.season ? ` (${h.season})` : ''}`;

    return `
      <div class="flex items-center justify-between p-3.5 rounded-2xl border border-slate-800 bg-slate-900/85 shadow-lg">
        <div class="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 text-base">
            <i class="${r.icon}"></i>
          </div>
          <div class="min-w-0">
            <h4 class="font-sport font-black text-sm uppercase text-white truncate">
              ${r.title}
            </h4>
            <div class="flex items-center gap-1.5 text-xs text-slate-400 truncate mt-0.5">
              <span class="text-amber-400 font-bold">👑 ${holderText}</span>
            </div>
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="font-sport font-black text-lg text-amber-300 font-mono leading-none">
            ${h.formattedValue}
          </div>
          <span class="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            ${r.badgeLabel || ''}
          </span>
        </div>
      </div>
    `;
  }).join('');

  contentBox.innerHTML = `
    <!-- Poster Top Header -->
    <div class="w-full flex flex-col items-center text-center">
      <div class="flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
        <span>🏆 ALBO DEI PRIMATI ASSOLUTI</span>
      </div>
      <h1 class="font-sport font-black text-5xl uppercase tracking-wider text-white">
        Hall of Fame
      </h1>
      <p class="text-sm text-slate-400 font-bold mt-1.5">
        Le grandi pietre miliari e le leggende di ${champLabel}
      </p>
    </div>

    <!-- Curated Marquee Records Stack -->
    <div class="w-full space-y-2.5 my-auto">
      ${rowsHTML}
    </div>

    <!-- Bottom Trivia Banner -->
    <div class="w-full p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 text-center text-xs text-slate-400 font-medium">
      I record ufficiali sono calcolati su tutte le edizioni storiche disputate.
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}
