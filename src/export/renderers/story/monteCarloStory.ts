import type { LiveSeasonDetails, LiveTeamMetrics } from '@/types';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { resolveTeamLogo } from '@/crests';
import { renderNodeToCanvas } from '../core';
import { createStoryContainer, STORY_WIDTH, STORY_HEIGHT } from './base';

/**
 * 7. Renders High-Definition Vertical 9:16 Story for Monte Carlo Odds & Projections
 */
export async function renderMonteCarloStoryCanvas(
  teamMetric: LiveTeamMetrics,
  customLiveData?: LiveSeasonDetails
): Promise<HTMLCanvasElement> {
  const liveData = customLiveData || getLiveSeasonDetails() || (typeof window !== 'undefined' ? (window as any).liveSeasonData : null);
  const seasonLabel = liveData?.season || 'Live';
  const { container, contentBox } = createStoryContainer(
    'Quote Scudetto',
    `Stagione ${seasonLabel}`
  );

  const logoUrl = teamMetric.logo || resolveTeamLogo(teamMetric.teamName);
  const mc = (teamMetric as any).monteCarlo || teamMetric.scheduleLuck?.monteCarlo;

  // Title Gating: Unlocked only after half the tournament (giro di boa)
  const totalRounds = liveData?.totalRounds || liveData?.rounds?.length || 26;
  const lastCompletedRound = liveData?.lastCompletedRound || 0;
  const midpointRound = Math.ceil(totalRounds / 2);
  const isTitleGated = lastCompletedRound >= midpointRound;

  // MC Projection Gating: Full season projections activate when lastCompletedRound >= mcMinRounds
  const mcMinRounds = liveData?.mcMinRounds ?? 5;
  const isMcUnlocked = mc?.pPodiumPct != null || typeof mc?.pMidPct === 'number';

  const titlePctVal = (isTitleGated && isMcUnlocked && typeof mc?.pTitlePct === 'number') ? mc.pTitlePct : null;
  const pTitle = titlePctVal !== null ? `${titlePctVal.toFixed(1)}%` : `G${midpointRound}+`;
  const titleSublabel = titlePctVal !== null ? 'Vittoria Scudetto' : `Sblocco da G${midpointRound}`;
  const titleIcon = titlePctVal !== null ? '🏆' : '🔒';

  const pPodium = (isMcUnlocked && mc?.pPodiumPct != null) ? `${mc.pPodiumPct.toFixed(1)}%` : '--';
  const pMid = (isMcUnlocked && mc?.pMidPct != null) ? `${mc.pMidPct.toFixed(1)}%` : '--';
  const pFlop = (isMcUnlocked && mc?.pFlopPct != null) ? `${mc.pFlopPct.toFixed(1)}%` : '--';

  const pointsStr = typeof teamMetric.points === 'number' ? ` (${teamMetric.points} pt)` : ' (- pt)';
  const medianPts = (isMcUnlocked && mc?.medianPoints != null)
    ? `${mc.medianPoints.toFixed(1)} pt`
    : `In calibrazione (da G${mcMinRounds})`;
  const p10 = (isMcUnlocked && mc?.p10 != null) ? mc.p10.toFixed(1) : '-';
  const p90 = (isMcUnlocked && mc?.p90 != null) ? mc.p90.toFixed(1) : '-';
  const p25 = (isMcUnlocked && mc?.p25 != null) ? mc.p25.toFixed(1) : '-';
  const p75 = (isMcUnlocked && mc?.p75 != null) ? mc.p75.toFixed(1) : '-';

  contentBox.innerHTML = `
    <!-- Team Identity Hero -->
    <div class="flex flex-col items-center text-center">
      <div class="w-28 h-28 rounded-3xl border-2 border-amber-400/50 p-2.5 bg-slate-900/80 shadow-2xl flex items-center justify-center mb-3">
        <img src="${logoUrl}" alt="${teamMetric.teamName}" class="w-full h-full object-contain drop-shadow-xl" onerror="this.onerror=null; this.src='favicon-64x64.png'">
      </div>

      <h1 class="font-sport font-black text-4xl uppercase tracking-wider text-white">
        ${teamMetric.teamName}
      </h1>
      <p class="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">
        ${teamMetric.coach || 'Allenatore'} • Attuale #${teamMetric.rank}${pointsStr}
      </p>
    </div>

    <!-- Probability Matrix -->
    <div class="w-full space-y-3 my-auto">
      <div class="text-xs font-black uppercase tracking-wider text-slate-400 text-center mb-1">
        🎲 10.000 Simulazioni Monte Carlo
      </div>

      <div class="grid grid-cols-2 gap-3">
        <!-- Scudetto (Gated until midpoint round) -->
        <div class="p-4 rounded-2xl border ${isTitleGated ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/20' : 'border-amber-500/30 bg-slate-900/60'} to-transparent flex flex-col items-center text-center">
          <span class="text-3xl mb-1">${titleIcon}</span>
          <span class="font-sport font-black text-3xl ${isTitleGated ? 'text-amber-400' : 'text-amber-400/80'} font-mono">${pTitle}</span>
          <span class="text-xs uppercase font-extrabold ${isTitleGated ? 'text-amber-200' : 'text-amber-300/70'} mt-1">${titleSublabel}</span>
        </div>

        <!-- Podio -->
        <div class="p-4 rounded-2xl border border-cyan-500/50 bg-gradient-to-br from-cyan-500/20 to-transparent flex flex-col items-center text-center">
          <span class="text-3xl mb-1">🥉</span>
          <span class="font-sport font-black text-3xl text-cyan-300 font-mono">${pPodium}</span>
          <span class="text-xs uppercase font-extrabold text-cyan-200 mt-1">Piazzamento Podio</span>
        </div>

        <!-- Metà Classifica -->
        <div class="p-4 rounded-2xl border border-emerald-500/50 bg-gradient-to-br from-emerald-500/20 to-transparent flex flex-col items-center text-center">
          <span class="text-3xl mb-1">⚖️</span>
          <span class="font-sport font-black text-3xl text-emerald-400 font-mono">${pMid}</span>
          <span class="text-xs uppercase font-extrabold text-emerald-200 mt-1">Metà Classifica</span>
        </div>

        <!-- Cucchiaio -->
        <div class="p-4 rounded-2xl border border-rose-500/50 bg-gradient-to-br from-rose-500/20 to-transparent flex flex-col items-center text-center">
          <span class="text-3xl mb-1">🥄</span>
          <span class="font-sport font-black text-3xl text-rose-400 font-mono">${pFlop}</span>
          <span class="text-xs uppercase font-extrabold text-rose-200 mt-1">Cucchiaio di Legno</span>
        </div>
      </div>

      <!-- Projected Finish Box (Displays projected score when MC is active) -->
      <div class="p-4 rounded-2xl border border-slate-800 bg-slate-900/80 mt-2">
        <div class="flex items-center justify-between text-xs text-slate-400 mb-2 font-bold">
          <span>Punteggio Finale Previsto:</span>
          <span class="text-amber-400 font-black font-mono text-sm">${isMcUnlocked ? `${medianPts} (Mediana)` : medianPts}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono pt-2 border-t border-slate-800">
          <div>Intervallo 50% (IQR): <strong>${isMcUnlocked ? `${p25} &ndash; ${p75} pt` : '--'}</strong></div>
          <div class="text-right">Intervallo 80%: <strong>${isMcUnlocked ? `${p10} &ndash; ${p90} pt` : '--'}</strong></div>
        </div>
      </div>
    </div>

    <!-- Footer Advice -->
    <div class="w-full p-3 rounded-2xl border border-slate-800 bg-slate-900/60 text-center text-xs text-slate-400">
      Simulazione Davidson 1X2 ponderata su Elo &amp; Potenza Offensiva con decay asta.
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}
