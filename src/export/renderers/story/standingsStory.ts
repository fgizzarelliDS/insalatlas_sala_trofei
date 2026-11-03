import type { LiveSeasonDetails, LiveTeamMetrics } from '@/types';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { resolveTeamLogo } from '@/crests';
import { renderNodeToCanvas } from '../core';
import { LEAGUE } from '@/config';
import { createStoryContainer, STORY_WIDTH, STORY_HEIGHT } from './base';

/**
 * 6. Renders High-Definition Vertical 9:16 Story for Official League Standings
 */
export async function renderStandingsStoryCanvas(
  customLiveData?: LiveSeasonDetails
): Promise<HTMLCanvasElement> {
  const liveData = customLiveData || getLiveSeasonDetails() || (typeof window !== 'undefined' ? (window as any).liveSeasonData : null);
  if (!liveData) {
    throw new Error('Dati di stagione live non disponibili per la generazione della story');
  }

  const seasonLabel = liveData.season || 'Live';
  const standings: LiveTeamMetrics[] = liveData.standings || [];
  const lastRound = liveData.lastCompletedRound || 1;

  const { container, contentBox } = createStoryContainer(
    'Classifica Ufficiale',
    `Stagione ${seasonLabel}`
  );

  // Identify top offense and leader
  const leader = standings[0];
  const topOffense = standings.slice().sort((a, b) => (b.totalFantaPoints || 0) - (a.totalFantaPoints || 0))[0];

  const rowsHTML = standings.map((t, idx) => {
    const rank = idx + 1;
    let rankBadgeStyle = 'border-slate-700 bg-slate-800/80 text-slate-300';
    let rowBorder = 'border-slate-800/60';
    let rowBg = 'bg-slate-900/60';

    if (rank === 1) {
      rankBadgeStyle = 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-sm';
      rowBorder = 'border-amber-500/40';
      rowBg = 'bg-amber-950/20';
    } else if (rank === 2) {
      rankBadgeStyle = 'border-slate-300 bg-slate-400/25 text-slate-100 shadow-sm';
      rowBorder = 'border-slate-400/30';
      rowBg = 'bg-slate-800/40';
    } else if (rank === 3) {
      rankBadgeStyle = 'border-amber-700 bg-amber-800/25 text-amber-500 shadow-sm';
      rowBorder = 'border-amber-700/30';
      rowBg = 'bg-amber-950/10';
    } else if (rank >= standings.length - 1) {
      // Last 2 spots (Cucchiaio zone)
      rankBadgeStyle = 'border-rose-700 bg-rose-900/30 text-rose-300';
    } else if (rank >= standings.length - 3) {
      // Playout zone
      rankBadgeStyle = 'border-amber-800 bg-amber-950/40 text-amber-400';
    }

    const crest = t.logo || resolveTeamLogo(t.teamName);
    const pts = typeof t.points === 'number' ? t.points : (t.played ? (t.won || 0) * 3 + (t.drawn || 0) : 0);
    const played = t.played ?? 0;
    const record = `${t.won ?? 0}-${t.drawn ?? 0}-${t.lost ?? 0}`;
    const gd = (t.goalDiff ?? 0) > 0 ? `+${t.goalDiff}` : `${t.goalDiff ?? 0}`;
    const fp = typeof t.totalFantaPoints === 'number' ? t.totalFantaPoints.toFixed(1) : '-';
    const trend = t.statusBadge || '⚖️';

    // Merito & Fortuna (Schedule Luck & All-Play)
    const luck = t.scheduleLuck;
    const xPts = luck?.xPoints ?? (typeof t.points === 'number' ? t.points : 0);
    const ap = luck?.allPlayRecord ?? { wins: 0, draws: 0, losses: 0, winPct: 0 };
    const xPtsStr = typeof xPts === 'number' ? xPts.toFixed(2) : '-';
    const allPlayStr = `${ap.wins}V-${ap.draws}N-${ap.losses}P, ${ap.winPct}%`;

    return `
      <div class="flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${rowBorder} ${rowBg} text-xs">
        <!-- Rank & Team -->
        <div class="flex items-center gap-2.5 w-[42%] min-w-0">
          <span class="w-6 h-6 rounded-lg border font-sport font-black text-xs flex items-center justify-center shrink-0 ${rankBadgeStyle}">
            ${rank}
          </span>
          <img src="${crest}" alt="${t.teamName}" class="w-7 h-7 object-contain shrink-0" onerror="this.onerror=null; this.src='favicon-64x64.png'">
          <div class="min-w-0 flex-1">
            <div class="font-bold text-white text-sm truncate leading-tight">${t.teamName}</div>
            <div class="text-[10px] text-slate-400 truncate">${t.coach || ''}</div>
          </div>
        </div>

        <!-- Points -->
        <div class="w-[14%] text-center">
          <span class="font-sport font-black text-xl ${rank === 1 ? 'text-amber-400' : 'text-white'} leading-none">
            ${pts}
          </span>
          <span class="text-[9px] uppercase font-bold text-slate-400 block -mt-0.5">PT</span>
        </div>

        <!-- Stats: xPTS (V-N-P, %) & Match Record/FP -->
        <div class="w-[36%] text-right font-mono text-[11px] text-slate-300">
          <div class="truncate">
            <strong class="text-white">${xPtsStr}</strong> <span class="text-slate-400 font-semibold">xPTS</span>
            <span class="text-slate-400 text-[10px] ml-1">(${allPlayStr})</span>
          </div>
          <div class="text-[10px] text-slate-400 truncate mt-0.5">
            ${played} g. (${record}) · ${fp} FP · diff ${gd}
          </div>
        </div>

        <!-- Trend Status -->
        <div class="w-[8%] text-right text-base shrink-0">
          <span title="${t.statusLabel || ''}">${trend}</span>
        </div>
      </div>
    `;
  }).join('');

  contentBox.innerHTML = `
    <!-- Top Hero -->
    <div class="w-full flex flex-col items-center text-center">
      <div class="flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
        <span>📊 CLASSIFICA UFFICIALE</span>
      </div>
      <h1 class="font-sport font-black text-4xl uppercase tracking-wider text-white">
        Classifica Generale
      </h1>
      <p class="text-sm text-slate-400 font-bold mt-1">
        ${LEAGUE.brand.championshipLabel || 'Serie Atlas'} • Dopo la ${lastRound}ª Giornata
      </p>
    </div>

    <!-- Standings Table Container -->
    <div class="w-full space-y-1.5 my-2">
      ${rowsHTML}
    </div>

    <!-- Bottom Highlights Strip -->
    <div class="grid grid-cols-2 gap-3 w-full">
      <!-- Leader -->
      <div class="p-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex items-center gap-3">
        <span class="text-2xl">👑</span>
        <div class="min-w-0">
          <div class="text-[10px] uppercase font-black text-amber-400 tracking-wider">CAPOLISTA</div>
          <div class="font-bold text-sm text-white truncate">${leader?.teamName || '-'}</div>
          <div class="text-xs text-amber-300 font-sport font-black">${leader?.points ?? 0} Punti</div>
        </div>
      </div>

      <!-- Top Offense -->
      <div class="p-3 rounded-2xl border border-sky-500/40 bg-sky-500/10 flex items-center gap-3">
        <span class="text-2xl">⚡</span>
        <div class="min-w-0">
          <div class="text-[10px] uppercase font-black text-sky-400 tracking-wider">MIGLIOR ATTACCO</div>
          <div class="font-bold text-sm text-white truncate">${topOffense?.teamName || '-'}</div>
          <div class="text-xs text-sky-300 font-mono font-black">${topOffense?.totalFantaPoints ?? 0} Tot. FP</div>
        </div>
      </div>
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}
