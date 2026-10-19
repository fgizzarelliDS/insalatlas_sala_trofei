import type {
  FormResult,
  CompositeStatusBadge,
  LiveSeasonDetails
} from '@/types';

let cachedLiveSeasonDetails: LiveSeasonDetails | null = null;
let isFetchingLiveDetails = false;

/**
 * Returns currently cached live season details (if any)
 */
export function getLiveSeasonDetails(): LiveSeasonDetails | null {
  return cachedLiveSeasonDetails;
}

/**
 * Sets or overrides cached live season details
 */
export function setLiveSeasonDetails(details: LiveSeasonDetails | null): void {
  cachedLiveSeasonDetails = details;
}

/**
 * Loads live_season_details.json asynchronously from server/local
 */
export async function loadLiveSeasonDetails(season?: string): Promise<LiveSeasonDetails | null> {
  if (cachedLiveSeasonDetails && (!season || cachedLiveSeasonDetails.season === season)) {
    return cachedLiveSeasonDetails;
  }

  if (isFetchingLiveDetails) {
    return cachedLiveSeasonDetails;
  }

  isFetchingLiveDetails = true;
  try {
    const res = await fetch('live_season_details.json?t=' + Date.now());
    if (!res.ok) {
      cachedLiveSeasonDetails = null;
      return null;
    }
    const data = (await res.json()) as LiveSeasonDetails;
    if (data && data.standings && Array.isArray(data.standings)) {
      cachedLiveSeasonDetails = data;
      return data;
    }
    return null;
  } catch {
    cachedLiveSeasonDetails = null;
    return null;
  } finally {
    isFetchingLiveDetails = false;
  }
}

/**
 * Computes recency-weighted momentum in [0.0, 1.0]
 */
export function computeTeamMomentum(recentForm: FormResult[]): number {
  if (!recentForm || recentForm.length === 0) return 0.5;

  const k = recentForm.length;
  const denom = 3 * ((k * (k + 1)) / 2);
  if (denom === 0) return 0.5;

  const ptsMap: Record<FormResult, number> = { W: 3, D: 1, L: 0 };
  const weightedSum = recentForm.reduce((sum, res, i) => sum + (i + 1) * (ptsMap[res] ?? 0), 0);
  return Math.round((weightedSum / denom) * 100) / 100;
}

/**
 * Evaluates composite status badge (🔥, 📈, ⚖️, 📉, 🧊)
 */
export function computeStatusBadge(
  momentum: number,
  avgL3: number,
  leagueAvg: number,
  recentForm: FormResult[]
): { badge: CompositeStatusBadge; label: string } {
  const lastRes = recentForm.length > 0 ? recentForm[recentForm.length - 1] : undefined;
  const last2 = recentForm.slice(-2);

  if (momentum >= 0.75 && avgL3 >= leagueAvg + 2.0) {
    return { badge: '🔥', label: 'In Fiamme' };
  }
  if (momentum <= 0.15) {
    return { badge: '🧊', label: 'Crisi Nera' };
  }
  if (momentum >= 0.55 && lastRes === 'W') {
    return { badge: '📈', label: 'In Ascesa' };
  }
  if (momentum <= 0.35 || (last2.length === 2 && last2[0] === 'L' && last2[1] === 'L')) {
    return { badge: '📉', label: 'In Flessione' };
  }

  return { badge: '⚖️', label: 'Stabile' };
}

/**
 * Renders L5 form colored badges (V/N/P)
 */
export function renderFormDotsHTML(recentForm: FormResult[] = []): string {
  if (!recentForm || recentForm.length === 0) {
    return '<span class="opacity-40 text-xs">-</span>';
  }

  return `
    <div class="inline-flex items-center gap-1" title="Forma ultime 5 giornate: ${recentForm.join('-')}">
      ${recentForm
      .map(r => {
        if (r === 'W') {
          return '<span class="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-sm" title="Vittoria">V</span>';
        }
        if (r === 'D') {
          return '<span class="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-sm" title="Pareggio">N</span>';
        }
        return '<span class="w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow-sm" title="Sconfitta">P</span>';
      })
      .join('')}
    </div>
  `;
}

/**
 * Renders Schedule Luck (ΔLuck) badge
 */
export function renderDeltaLuckBadgeHTML(deltaLuck: number, expectedRank: number): string {
  if (deltaLuck > 0) {
    return `
      <span class="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-500 dark:text-amber-400" title="Favorito dal calendario: classifica reale superiore di +${deltaLuck} posizioni rispetto ai fantapunti puri (#${expectedRank})">
        <span>(#${expectedRank})</span>
        <span class="text-[9px] font-extrabold">(+${deltaLuck})</span>
      </span>
    `;
  }
  if (deltaLuck < 0) {
    return `
      <span class="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-500 dark:text-emerald-400" title="Sfortunato nel calendario: meriterebbe #${expectedRank} in classifica in base ai fantapunti realizzati (${deltaLuck})">
        <span>(#${expectedRank})</span>
        <span class="text-[9px] font-extrabold">(${deltaLuck})</span>
      </span>
    `;
  }
  return `
    <span class="inline-flex items-center gap-0.5 text-[10px] font-semibold opacity-60" title="Posizione perfettamente allineata al volume di fantapunti realizzati (#${expectedRank})">
      <span>(#${expectedRank})</span>
      <span class="text-[9px] font-mono">(=)</span>
    </span>
  `;
}

/**
 * Renders composite status pill with tooltip
 */
export function renderStatusBadgeHTML(badge: CompositeStatusBadge, label: string): string {
  let badgeStyle = 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  if (badge === '🔥') badgeStyle = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (badge === '📈') badgeStyle = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (badge === '📉') badgeStyle = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (badge === '🧊') badgeStyle = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';

  return `
    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${badgeStyle}" title="Stato e Momentum: ${label}">
      <span class="text-sm leading-none">${badge}</span>
      <span class="text-[10px] uppercase font-bold tracking-wider">${label}</span>
    </span>
  `;
}
