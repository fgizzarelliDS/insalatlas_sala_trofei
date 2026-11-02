import type { LiveSeasonDetails } from '@/types';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { resolveTeamLogo } from '@/crests';
import { renderNodeToCanvas } from '../core';
import { LEAGUE } from '@/config';
import { createStoryContainer, STORY_WIDTH, STORY_HEIGHT } from './base';

/**
 * 7. Renders High-Definition Vertical 9:16 Story for Matchday Recap & Results (Sky/Gazzetta Style)
 */
export async function renderMatchdayRecapStoryCanvas(
  targetRound?: number,
  customLiveData?: LiveSeasonDetails
): Promise<HTMLCanvasElement> {
  const liveData = customLiveData || getLiveSeasonDetails() || (typeof window !== 'undefined' ? (window as any).liveSeasonData : null);
  if (!liveData) {
    throw new Error('Dati di stagione live non disponibili per la generazione della story');
  }

  const seasonLabel = liveData.season || 'Live';
  const completedRounds = (liveData.rounds || []).filter((r: any) =>
    (r.matches || []).some((m: any) => m.isPlayed || m.played || (m.homeFantaPoints || 0) > 0 || (m.awayFantaPoints || 0) > 0)
  );

  const roundObj = targetRound
    ? (liveData.rounds || []).find((r: any) => r.roundNumber === targetRound)
    : (completedRounds.length > 0 ? completedRounds[completedRounds.length - 1] : liveData.rounds?.[0]);

  const rNum = roundObj?.roundNumber ?? 1;
  const matches = roundObj?.matches || [];

  const { container, contentBox } = createStoryContainer(
    `Giornata ${rNum}`,
    `Stagione ${seasonLabel}`
  );

  // 1. Compute round MVP (highest FP)
  let mvpTeam = '';
  let mvpScore = 0;
  let mvpLogo = '';
  let mvpOpponent = '';
  let mvpMatchOutcome = '';

  // 2. Track all round performances for single-round luck highlights
  interface TeamRoundPerf {
    team: string;
    logo: string;
    fp: number;
    goals: number;
    opponent: string;
    opponentGoals: number;
    opponentFp: number;
    outcome: 'W' | 'D' | 'L';
  }
  const perfs: TeamRoundPerf[] = [];

  matches.forEach((m: any) => {
    const hFp = Number(m.homeFantaPoints) || 0;
    const aFp = Number(m.awayFantaPoints) || 0;
    const hScore = typeof m.homeScore === 'number' ? m.homeScore : 0;
    const aScore = typeof m.awayScore === 'number' ? m.awayScore : 0;
    const hLogo = m.homeLogo || resolveTeamLogo(m.homeTeam);
    const aLogo = m.awayLogo || resolveTeamLogo(m.awayTeam);

    const hOutcome: 'W' | 'D' | 'L' = hScore > aScore ? 'W' : (hScore < aScore ? 'L' : 'D');
    const aOutcome: 'W' | 'D' | 'L' = aScore > hScore ? 'W' : (aScore < hScore ? 'L' : 'D');

    if (hFp > mvpScore) {
      mvpScore = hFp;
      mvpTeam = m.homeTeam;
      mvpLogo = hLogo;
      mvpOpponent = m.awayTeam;
      mvpMatchOutcome = `${hScore} - ${aScore}`;
    }
    if (aFp > mvpScore) {
      mvpScore = aFp;
      mvpTeam = m.awayTeam;
      mvpLogo = aLogo;
      mvpOpponent = m.homeTeam;
      mvpMatchOutcome = `${aScore} - ${hScore}`;
    }

    perfs.push({ team: m.homeTeam, logo: hLogo, fp: hFp, goals: hScore, opponent: m.awayTeam, opponentGoals: aScore, opponentFp: aFp, outcome: hOutcome });
    perfs.push({ team: m.awayTeam, logo: aLogo, fp: aFp, goals: aScore, opponent: m.homeTeam, opponentGoals: hScore, opponentFp: hFp, outcome: aOutcome });
  });

  // 3. Compute overall round stats for the 8th slot card
  let totalGoals = 0;
  let totalFP = 0;
  let maxGoalsMatch: any = null;
  let maxGoals = -1;

  matches.forEach((m: any) => {
    const g = (typeof m.homeScore === 'number' ? m.homeScore : 0) + (typeof m.awayScore === 'number' ? m.awayScore : 0);
    totalGoals += g;
    totalFP += (Number(m.homeFantaPoints) || 0) + (Number(m.awayFantaPoints) || 0);
    if (g > maxGoals) {
      maxGoals = g;
      maxGoalsMatch = m;
    }
  });
  const avgFP = matches.length > 0 ? (totalFP / (matches.length * 2)).toFixed(1) : '0.0';

  // Calculate single-round luck:
  // - Cynical winner: a winner who won with fewer FP than an unlucky non-winner (stolen win),
  //   OR won with low FP (< avgFP of the round and <= 1 goal).
  //   If all winners legitimately outscored all non-winners, there is NO cynical winner (Turno Regolare).
  const winners = perfs.filter(p => p.outcome === 'W').sort((a, b) => a.fp - b.fp);
  const nonWinners = perfs.filter(p => p.outcome !== 'W').sort((a, b) => b.fp - a.fp);
  const unluckyNonWinner = nonWinners.length > 0 ? nonWinners[0] : null;

  const lowestWinner = winners.length > 0 ? winners[0] : null;
  const avgFPNum = Number(avgFP) || 72.0;

  const isCynical = lowestWinner && (
    (unluckyNonWinner && lowestWinner.fp < unluckyNonWinner.fp) ||
    (lowestWinner.fp < avgFPNum && lowestWinner.goals <= 1)
  );
  const cynicalWinner = isCynical ? lowestWinner : null;

  // Build 2-column Duel Cards (No Name Truncation)
  const cardsHTML = matches.map((m: any, idx: number) => {
    const hScore = m.homeScore ?? '-';
    const aScore = m.awayScore ?? '-';
    const hFp = typeof m.homeFantaPoints === 'number' ? m.homeFantaPoints.toFixed(1) : '-';
    const aFp = typeof m.awayFantaPoints === 'number' ? m.awayFantaPoints.toFixed(1) : '-';
    const hLogo = m.homeLogo || resolveTeamLogo(m.homeTeam);
    const aLogo = m.awayLogo || resolveTeamLogo(m.awayTeam);

    const isHomeWinner = typeof m.homeScore === 'number' && typeof m.awayScore === 'number' && m.homeScore > m.awayScore;
    const isAwayWinner = typeof m.homeScore === 'number' && typeof m.awayScore === 'number' && m.awayScore > m.homeScore;

    return `
      <div class="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-3.5 flex flex-col justify-between shadow-lg">
        <!-- Card Top Bar: Duel Number & Status -->
        <div class="flex items-center justify-between text-[11px] font-mono pb-1.5 mb-1 border-b border-slate-800/80">
          <span class="text-[10px] uppercase font-extrabold tracking-wider text-amber-400/90">DUELLO #${idx + 1}</span>
          <span class="text-[9px] uppercase font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">FINALE</span>
        </div>

        <!-- Team A Row (Full Name, No Truncation) -->
        <div class="flex items-center justify-between gap-2 py-1">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <img src="${hLogo}" alt="${m.homeTeam}" class="w-7 h-7 object-contain rounded-full bg-white/10 shrink-0 drop-shadow" onerror="this.onerror=null; this.src='favicon-64x64.png'">
            <span class="font-bold text-sm leading-tight text-white ${isHomeWinner ? 'text-amber-400 font-black' : ''}">
              ${m.homeTeam}
            </span>
          </div>
          <div class="flex items-center gap-2 shrink-0 pl-1.5">
            <span class="font-sport font-black text-xl leading-none ${isHomeWinner ? 'text-amber-400' : 'text-slate-200'}">
              ${hScore}
            </span>
            <span class="text-xs font-mono font-bold text-slate-400">
              (${hFp} FP)
            </span>
          </div>
        </div>

        <!-- Divider -->
        <div class="h-px bg-slate-800/80 my-1"></div>

        <!-- Team B Row (Full Name, No Truncation) -->
        <div class="flex items-center justify-between gap-2 py-1">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <img src="${aLogo}" alt="${m.awayTeam}" class="w-7 h-7 object-contain rounded-full bg-white/10 shrink-0 drop-shadow" onerror="this.onerror=null; this.src='favicon-64x64.png'">
            <span class="font-bold text-sm leading-tight text-white ${isAwayWinner ? 'text-amber-400 font-black' : ''}">
              ${m.awayTeam}
            </span>
          </div>
          <div class="flex items-center gap-2 shrink-0 pl-1.5">
            <span class="font-sport font-black text-xl leading-none ${isAwayWinner ? 'text-amber-400' : 'text-slate-200'}">
              ${aScore}
            </span>
            <span class="text-xs font-mono font-bold text-slate-400">
              (${aFp} FP)
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 8th Slot: Round Stats Tile
  const roundStatsHTML = `
    <div class="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-transparent p-3.5 flex flex-col justify-between shadow-lg">
      <div class="flex items-center justify-between text-[11px] font-mono pb-1.5 mb-1 border-b border-amber-500/20">
        <span class="text-[10px] uppercase font-extrabold tracking-wider text-amber-400">📊 STATS GIORNATA</span>
        <span class="text-[9px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md">TURNO ${rNum}</span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-center py-1 flex-1 items-center">
        <div class="p-2 rounded-xl bg-slate-950/40 border border-slate-800">
          <div class="text-[10px] uppercase font-bold text-slate-400">Gol Totali</div>
          <div class="text-xl font-sport font-black text-amber-400">${totalGoals} Reti</div>
        </div>
        <div class="p-2 rounded-xl bg-slate-950/40 border border-slate-800">
          <div class="text-[10px] uppercase font-bold text-slate-400">Media FP</div>
          <div class="text-xl font-mono font-black text-sky-400">${avgFP} FP</div>
        </div>
      </div>
      ${maxGoalsMatch ? `
        <div class="text-[11px] text-center text-slate-300 border-t border-slate-800/60 pt-1.5 truncate">
          🔥 Spettacolo: <strong class="text-white">${maxGoalsMatch.homeTeam} ${maxGoalsMatch.homeScore}-${maxGoalsMatch.awayScore} ${maxGoalsMatch.awayTeam}</strong> (${maxGoals} gol)
        </div>
      ` : ''}
    </div>
  `;

  contentBox.innerHTML = `
    <!-- Top Hero -->
    <div class="w-full flex flex-col items-center text-center">
      <div class="flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
        <span>⚽ TABELLINO &amp; RISULTATI</span>
      </div>
      <h1 class="font-sport font-black text-5xl uppercase tracking-wider text-white">
        Giornata ${rNum}
      </h1>
      <p class="text-sm text-slate-400 font-bold mt-1">
        ${LEAGUE.brand.championshipLabel || 'Serie Atlas'} • Risultati Ufficiali del Turno
      </p>
    </div>

    <!-- 2-Column Duel Cards Grid (4x2 Balanced Layout) -->
    <div class="grid grid-cols-2 gap-3.5 w-full my-2">
      ${cardsHTML}
      ${roundStatsHTML}
    </div>

    <!-- Highlights Row: 2 Rich Structured Cards -->
    <div class="grid grid-cols-2 gap-3.5 w-full">
      <!-- MVP Card -->
      <div class="p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-slate-900/60 to-transparent flex items-center gap-3.5 shadow-lg">
        <img src="${mvpLogo}" alt="${mvpTeam}" class="w-14 h-14 object-contain shrink-0 drop-shadow-md" onerror="this.onerror=null; this.src='favicon-64x64.png'">
        <div class="min-w-0 flex-1">
          <div class="text-[10px] uppercase font-black text-amber-400 tracking-wider">🌟 MVP DI GIORNATA</div>
          <div class="font-bold text-base text-white truncate">${mvpTeam}</div>
          <div class="text-sm font-mono font-black text-amber-300 mt-0.5">${mvpScore.toFixed(1)} FantaPunti</div>
          <div class="text-[10px] text-slate-400 truncate mt-0.5">${mvpMatchOutcome} vs ${mvpOpponent}</div>
        </div>
      </div>

      <!-- Dea Bendata & Sfiga Card (Single Round Calculated) -->
      <div class="p-4 rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-500/15 via-slate-900/60 to-transparent flex flex-col justify-between shadow-lg">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-base">🎲</span>
          <span class="text-[10px] uppercase font-black text-indigo-300 tracking-wider">DEA BENDATA &amp; SFIGA</span>
        </div>
        <div class="space-y-1.5">
          <div class="text-xs text-slate-300 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="shrink-0">🍀</span>
              <strong class="text-white leading-tight break-words">${cynicalWinner ? cynicalWinner.team : 'Nessun regalo'}</strong>
            </div>
            <span class="text-[11px] font-mono text-emerald-400 font-bold shrink-0">${cynicalWinner ? `${cynicalWinner.fp.toFixed(1)} FP (W)` : 'Vittorie meritate'}</span>
          </div>
          <div class="text-xs text-slate-400 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="shrink-0">⚡</span>
              <strong class="text-slate-200 leading-tight break-words">${unluckyNonWinner ? unluckyNonWinner.team : '-'}</strong>
            </div>
            <span class="text-[11px] font-mono text-rose-400 font-bold shrink-0">${unluckyNonWinner ? `${unluckyNonWinner.fp.toFixed(1)} FP (${unluckyNonWinner.outcome})` : ''}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  return renderNodeToCanvas(container, STORY_WIDTH, '#030712', 1.5, STORY_HEIGHT);
}
