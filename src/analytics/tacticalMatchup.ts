/**
 * src/analytics/tacticalMatchup.ts
 * Tactical Matchup Engine for Head-to-Head Duels & Pre-Match Analysis 
 */

import type { Manager, LiveSeasonDetails, HeadToHeadStats } from '@/types';
import { state } from '@/state';
import { LEAGUE } from '@/config';
import { escapeHtml } from '@/utils/dom';
import {
  computeManagerTacticalProfile,
  type TacticalProfile,
  type TacticalAxisKey
} from './tacticalProfiler';
import { computeHeadToHead } from './headToHead';

export interface TacticalMatchupAxisComparison {
  key: TacticalAxisKey;
  label: string;
  shortTitle: string;
  rawA: string;
  rawB: string;
  scoreA: number;
  scoreB: number;
  diff: number; // scoreA - scoreB
  winner: 'A' | 'B' | 'tie';
}

export interface TacticalMatchup {
  managerA: Manager;
  managerB: Manager;
  profileA: TacticalProfile;
  profileB: TacticalProfile;
  h2hStats: HeadToHeadStats;
  axes: Record<TacticalAxisKey, TacticalMatchupAxisComparison>;
  axesList: TacticalMatchupAxisComparison[];
  tacticalKey: {
    headline: string;
    description: string;
    edgeA: string;
    edgeB: string;
  };
  banterText: string;
  scope?: 'career' | 'season';
}

/**
 * Computes comparative tactical matchup between two managers on 5 axes:
 * POT (Potenza Offensiva), CIN (Cinismo Corto Muso), LUK (Fattore Fortuna),
 * REG (Stabilità Rendimento), KOC (Freddezza da Coppe)
 */
export function computeTacticalMatchup(
  managerA: Manager,
  managerB: Manager,
  allManagers: Manager[] = state.managers || [],
  liveData?: LiveSeasonDetails | null,
  scope: 'career' | 'season' = 'career'
): TacticalMatchup {
  const pool = allManagers.length > 0 ? allManagers : [managerA, managerB];
  const profileA = computeManagerTacticalProfile(managerA, pool, liveData, undefined, scope);
  const profileB = computeManagerTacticalProfile(managerB, pool, liveData, undefined, scope);
  const h2hStats = computeHeadToHead(managerA, managerB);

  const axisKeys: TacticalAxisKey[] = ['pot', 'cin', 'luk', 'reg', 'koc'];
  const axesRecord = {} as Record<TacticalAxisKey, TacticalMatchupAxisComparison>;
  const axesList: TacticalMatchupAxisComparison[] = [];

  axisKeys.forEach(key => {
    const axA = profileA.axes[key];
    const axB = profileB.axes[key];
    const diff = axA.score - axB.score;
    const winner: 'A' | 'B' | 'tie' = diff >= 4 ? 'A' : diff <= -4 ? 'B' : 'tie';

    const item: TacticalMatchupAxisComparison = {
      key,
      label: axA.label,
      shortTitle: axA.shortTitle,
      rawA: axA.raw,
      rawB: axB.raw,
      scoreA: axA.score,
      scoreB: axB.score,
      diff,
      winner
    };

    axesRecord[key] = item;
    axesList.push(item);
  });

  // Narrative generation: synthesize greatest edges
  const sortedForA = [...axesList].sort((a, b) => b.diff - a.diff);
  const bestForA = sortedForA[0];
  const sortedForB = [...axesList].sort((a, b) => a.diff - b.diff);
  const bestForB = sortedForB[0];

  const edgeA = `${bestForA.shortTitle} (${bestForA.rawA} vs ${bestForA.rawB})`;
  const edgeB = `${bestForB.shortTitle} (${bestForB.rawB} vs ${bestForB.rawA})`;

  // Construct intelligent dynamic tactical narrative
  let headline = `Scontro di Filosofie: ${profileA.archetype.title} vs ${profileB.archetype.title}`;
  if (bestForA.diff >= 8 && Math.abs(bestForB.diff) >= 8) {
    headline = `Duello di Contrasti: ${bestForA.shortTitle} vs ${bestForB.shortTitle}`;
  } else if (Math.abs(bestForA.diff) <= 5 && Math.abs(bestForB.diff) <= 5) {
    headline = `Testa a Testa Equilibrato sul Filo dei Dettagli`;
  }

  const descParts: string[] = [];

  const safeNameA = escapeHtml(managerA.name);
  const safeNameB = escapeHtml(managerB.name);

  // Edge A narrative
  if (bestForA.diff > 3) {
    descParts.push(
      `<strong>${safeNameA}</strong> (${escapeHtml(profileA.archetype.title)}) impone la propria superiorità su <strong>${escapeHtml(bestForA.label)}</strong> con un netto vantaggio relativo.`
    );
  } else {
    descParts.push(
      `<strong>${safeNameA}</strong> imposta la gara su un piano di solida parità tattica.`
    );
  }

  // Edge B narrative
  if (Math.abs(bestForB.diff) > 3) {
    descParts.push(
      `Dall'altra parte, <strong>${safeNameB}</strong> (${escapeHtml(profileB.archetype.title)}) risponde con un decisivo punto di forza su <strong>${escapeHtml(bestForB.label)}</strong>.`
    );
  } else {
    descParts.push(
      `<strong>${safeNameB}</strong> cerca l'allungo affidandosi all'equilibrio complessivo.`
    );
  }

  // Momentum / Live mindset clause
  if (profileA.mindset.isActive && profileB.mindset.isActive) {
    descParts.push(
      `Fattore inerzia live: momento <em>${escapeHtml(profileA.mindset.pill)}</em> per ${safeNameA} contro <em>${escapeHtml(profileB.mindset.pill)}</em> per ${safeNameB}.`
    );
  }

  const description = descParts.join(' ');

  const matchup: TacticalMatchup = {
    managerA,
    managerB,
    profileA,
    profileB,
    h2hStats,
    axes: axesRecord,
    axesList,
    tacticalKey: {
      headline,
      description,
      edgeA,
      edgeB
    },
    banterText: '',
    scope
  };

  matchup.banterText = formatTacticalDuelWhatsAppBanter(matchup);
  return matchup;
}

/**
 * Formats WhatsApp Banter text for a direct head-to-head tactical duel
 */
export function formatTacticalDuelWhatsAppBanter(
  matchup: TacticalMatchup,
  baseUrl = LEAGUE.siteUrl
): string {
  const { managerA, managerB, profileA, profileB, axesList, h2hStats, tacticalKey } = matchup;
  const cleanUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : 'https://insalatlas.it';
  const duelUrl = `${cleanUrl}/?duel=${managerA.id}_vs_${managerB.id}`;

  const iconWinner = (winner: 'A' | 'B' | 'tie') =>
    winner === 'A' ? `(${managerA.name} ▲)` : winner === 'B' ? `(${managerB.name} ▲)` : '(=)';

  const lines = [
    `⚔️ *DUELLO TATTICO • ${LEAGUE.brand.name.toUpperCase()} SALA TROFEI*`,
    `*${managerA.name}* (${profileA.archetype.trait}) vs *${managerB.name}* (${profileB.archetype.trait})`,
    '',
    `🎭 *Scontro di Filosofie:*`,
    `• ${profileA.archetype.title}`,
    `  ${profileA.archetype.motto}`,
    `• ${profileB.archetype.title}`,
    `  ${profileB.archetype.motto}`,
    '',
    `📊 *Confronto 5 Assi Tattici:*`,
    ...axesList.map(
      ax => `• *${ax.shortTitle}:* ${ax.rawA} vs ${ax.rawB} ${iconWinner(ax.winner)}`
    ),
    '',
    `📜 *Precedenti in Campionato (${h2hStats.sharedSeasonsCount} stagioni):*`,
    `🏆 ${h2hStats.winsA} Vittorie ${managerA.name} • 🤝 ${h2hStats.ties} Pari • 🏆 ${h2hStats.winsB} Vittorie ${managerB.name}`,
    '',
    `💡 *Chiave del Match:*`,
    tacticalKey.description.replace(/<[^>]+>/g, ''),
    '',
    `Analisi e Radar H2H: ${duelUrl}`
  ];

  return lines.join('\n');
}
