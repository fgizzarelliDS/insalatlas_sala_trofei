import type { LiveSeasonDetails, LiveTeamMetrics } from '@/types';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { renderH2HRadarSVG, type H2HAxisData } from '@/components/modals/h2h/HeadToHeadRadar';
import { resolveTeamLogo } from '@/crests';
import { renderNodeToCanvas } from '../core';
import { createStoryContainer, STORY_WIDTH, STORY_HEIGHT } from './base';

/**
 * 8. Renders High-Definition Vertical 9:16 Story for Team Power & 3-Track Elo Radar
 */
export async function renderTeamPowerRadarStoryCanvas(
  teamMetric: LiveTeamMetrics,
  customLiveData?: LiveSeasonDetails
): Promise<HTMLCanvasElement> {
  const liveData = customLiveData || getLiveSeasonDetails() || (typeof window !== 'undefined' ? (window as any).liveSeasonData : null);
  const seasonLabel = liveData?.season || 'Live';
  const { container, contentBox } = createStoryContainer(
    'Potenza & Elo',
    `Stagione ${seasonLabel}`
  );

  const logoUrl = teamMetric.logo || resolveTeamLogo(teamMetric.teamName);

  const flatElo = Math.round(teamMetric.elo?.flat?.current ?? 1500);
  const histElo = Math.round(teamMetric.elo?.historical?.current ?? 1500);
  const atlasElo = Math.round(teamMetric.elo?.atlas?.current ?? 1500);

  // 5 Tactical Radar Axes: Attacco, Difesa, Continuità, Golo/Freddezza, Elo Power
  const avgFP = teamMetric.avgFantaPoints || 70.0;
  const attScore = Math.max(10, Math.min(100, Math.round(((avgFP - 60) / 24) * 100)));

  const ga = teamMetric.goalsAgainst || 0;
  const played = teamMetric.played || 1;
  const gaPerMatch = ga / played;
  const defScore = Math.max(10, Math.min(100, Math.round(((2.5 - gaPerMatch) / 2.0) * 100)));

  const won = teamMetric.won || 0;
  const formScore = Math.max(10, Math.min(100, Math.round((won / played) * 100)));

  const goloVal = (teamMetric.elo?.seasonStats?.[seasonLabel]?.golo ?? 1.0);
  const goloScore = Math.max(10, Math.min(100, Math.round(goloVal * 50)));

  const eloPowerScore = Math.max(10, Math.min(100, Math.round(((atlasElo - 1400) / 200) * 100)));

  const radarAxes: H2HAxisData[] = [
    { key: 'att', label: 'Attacco (FP)', shortTitle: 'Attacco', acronym: 'ATT', valA: attScore, valB: 0, rawA: `${avgFP.toFixed(1)} FP`, rawB: '' },
    { key: 'def', label: 'Difesa (Solidità)', shortTitle: 'Difesa', acronym: 'DIF', valA: defScore, valB: 0, rawA: `${gaPerMatch.toFixed(2)} GA`, rawB: '' },
    { key: 'con', label: 'Continuità', shortTitle: 'Vittorie', acronym: 'CON', valA: formScore, valB: 0, rawA: `${won}/${played} W`, rawB: '' },
    { key: 'gol', label: 'Freddezza (Golo)', shortTitle: 'Golo', acronym: 'GOL', valA: goloScore, valB: 0, rawA: `${goloVal.toFixed(2)}x`, rawB: '' },
    { key: 'elo', label: 'Atlas Power', shortTitle: 'Power', acronym: 'ELO', valA: eloPowerScore, valB: 0, rawA: `${atlasElo} pt`, rawB: '' }
  ];

  const radarSvg = renderH2HRadarSVG(radarAxes, teamMetric.teamName, '', 860, 680);

  contentBox.innerHTML = `
    <!-- Team Identity Header -->
    <div class="flex flex-col items-center text-center">
      <div class="w-24 h-24 rounded-3xl border-2 border-amber-400/50 p-2 bg-slate-900/80 shadow-2xl flex items-center justify-center mb-2">
        <img src="${logoUrl}" alt="${teamMetric.teamName}" class="w-full h-full object-contain drop-shadow-xl" onerror="this.onerror=null; this.src='favicon-64x64.png'">
      </div>

      <h1 class="font-sport font-black text-3xl uppercase tracking-wider text-white">
        ${teamMetric.teamName}
      </h1>
      <p class="text-xs uppercase tracking-widest text-slate-400 font-bold mt-0.5">
        ${teamMetric.coach || 'Allenatore'}
      </p>
    </div>

    <!-- 3-Track Elo Metrics Row -->
    <div class="grid grid-cols-3 gap-2.5 w-full my-2">
      <div class="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-center">
        <div class="text-[10px] uppercase font-bold text-amber-400">⚡ Elo Puro</div>
        <div class="font-sport font-black text-2xl text-white font-mono mt-0.5">${flatElo}</div>
        <div class="text-[9px] text-slate-400 mt-0.5">Stagionale</div>
      </div>

      <div class="p-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-center">
        <div class="text-[10px] uppercase font-bold text-indigo-400">🏛️ Storico</div>
        <div class="font-sport font-black text-2xl text-white font-mono mt-0.5">${histElo}</div>
        <div class="text-[9px] text-slate-400 mt-0.5">Con Palmarès</div>
      </div>

      <div class="p-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 text-center">
        <div class="text-[10px] uppercase font-bold text-purple-400">🔮 Atlas Power</div>
        <div class="font-sport font-black text-2xl text-white font-mono mt-0.5">${atlasElo}</div>
        <div class="text-[9px] text-slate-400 mt-0.5">All-Play</div>
      </div>
    </div>

    <!-- 5-Axis Tactical Radar Showcase -->
    <div class="w-full flex justify-center my-auto">
      ${radarSvg}
    </div>

    <!-- Bottom Tactical Callout -->
    <div class="w-full p-3 rounded-2xl border border-slate-800 bg-slate-900/60 text-center text-xs text-slate-400">
      Radar tattico normalizzato su 5 dimensioni chiave di rendimento atletico e strategico.
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}
