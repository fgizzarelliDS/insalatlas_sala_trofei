import type {
  FormResult,
  CompositeStatusBadge,
  LuckBadge,
  LiveSeasonDetails
} from '@/types';

let cachedLiveSeasonDetails: LiveSeasonDetails | null = null;
let activeLiveFetchPromise: Promise<LiveSeasonDetails | null> | null = null;

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

  if (activeLiveFetchPromise) {
    return activeLiveFetchPromise;
  }

  activeLiveFetchPromise = (async () => {
    try {
      const timestamp = Date.now();
      const candidates: string[] = [
        `live_season_details.json?t=${timestamp}`,
        `./live_season_details.json?t=${timestamp}`,
        `/live_season_details.json?t=${timestamp}`
      ];

      if (typeof window !== 'undefined' && window.location && window.location.pathname) {
        const p = window.location.pathname;
        const dir = p.substring(0, p.lastIndexOf('/') + 1);
        if (dir && !candidates.includes(`${dir}live_season_details.json?t=${timestamp}`)) {
          candidates.unshift(`${dir}live_season_details.json?t=${timestamp}`);
        }
      }

      let data: LiveSeasonDetails | null = null;
      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const parsed = (await res.json()) as LiveSeasonDetails;
            if (parsed && parsed.standings && Array.isArray(parsed.standings)) {
              data = parsed;
              break;
            }
          }
        } catch {
          // try next candidate
        }
      }

      if (data) {
        cachedLiveSeasonDetails = data;
        return data;
      }
      cachedLiveSeasonDetails = null;
      return null;
    } catch {
      cachedLiveSeasonDetails = null;
      return null;
    } finally {
      activeLiveFetchPromise = null;
    }
  })();

  return activeLiveFetchPromise;
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
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30';
  if (badge === '🔥') badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300/80 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30';
  if (badge === '📈') badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300/80 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30';
  if (badge === '📉') badgeStyle = 'bg-orange-100 text-orange-800 border-orange-300/80 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30';
  if (badge === '🧊') badgeStyle = 'bg-cyan-100 text-cyan-800 border-cyan-300/80 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30';

  return `
    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${badgeStyle}" title="Stato e Momentum: ${label}">
      <span class="text-sm leading-none">${badge}</span>
      <span class="text-[10px] uppercase font-bold tracking-wider">${label}</span>
    </span>
  `;
}

/**
 * Renders Schedule Luck Z-score badge with color and tooltip
 */
export function renderLuckBadgeHTML(
  badge: LuckBadge,
  label: string,
  zScore: number,
  compact: boolean = false
): string {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600';
  if (badge === '🍀') {
    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300/80 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40';
  } else if (badge === '↗️') {
    badgeStyle = 'bg-teal-50 text-teal-800 border-teal-300/80 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/40';
  } else if (badge === '⚖️') {
    badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600';
  } else if (badge === '↘️') {
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300/80 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40';
  } else if (badge === '⛈️') {
    badgeStyle = 'bg-rose-50 text-rose-800 border-rose-300/80 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40';
  }

  const sign = zScore > 0 ? '+' : '';
  const zFormatted = `${sign}${zScore.toFixed(2)}σ`;

  if (compact) {
    return `
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${badgeStyle} whitespace-nowrap"
            title="Indice Calendario (Z-Score): ${label} (${zFormatted})">
        <span class="text-xs leading-none">${badge}</span>
        <span class="text-[10px] font-bold tracking-wide">${label}</span>
      </span>
    `;
  }

  return `
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${badgeStyle} whitespace-nowrap"
          title="Indice Calendario (Z-Score): ${label} (${zFormatted})">
      <span class="text-sm leading-none">${badge}</span>
      <span class="text-[10px] font-bold tracking-wide">${label}</span>
      <span class="text-[9px] font-mono opacity-80 ml-0.5">(${zFormatted})</span>
    </span>
  `;
}

/**
 * Renders minimalist comparison delta pill vs Real Rank
 * (e.g. ▲ +3 vs Reale #4, ▼ -2 vs Reale #5, = 0)
 */
export function renderDeltaRankPillHTML(deltaRank: number, realRank: number): string {
  if (deltaRank > 0) {
    return `
      <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/80 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40 whitespace-nowrap"
            title="Meriterebbe #${realRank - deltaRank} su merito, mentre in classifica reale è #${realRank} (+${deltaRank} posizioni di merito)">
        <span>▲ +${deltaRank}</span>
      </span>
    `;
  }
  if (deltaRank < 0) {
    return `
      <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300/80 dark:bg-rose-500/25 dark:text-rose-300 dark:border-rose-500/40 whitespace-nowrap"
            title="In classifica reale è #${realRank}, ma in merito oggettivo è #${realRank - deltaRank} (${deltaRank} posizioni di calendario)">
        <span>▼ ${deltaRank}</span>
      </span>
    `;
  }
  return `
    <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700 whitespace-nowrap"
          title="Posizione di merito identica alla classifica reale (#${realRank})">
      <span>= 0</span>
    </span>
  `;
}

/**
 * Renders Delta Points pill (Actual Points - xPTS)
 * When isRealPointsLoaded is false, renders a neutral '-' placeholder pill.
 */
export function renderDeltaPointsPillHTML(deltaPoints: number, isRealPointsLoaded: boolean = true): string {
  if (!isRealPointsLoaded) {
    return `
      <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700 whitespace-nowrap"
            title="Punti reali non ancora disponibili">
        -
      </span>
    `;
  }
  if (deltaPoints > 0) {
    return `
      <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/80 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 whitespace-nowrap"
            title="Fortuna da calendario: +${deltaPoints.toFixed(2)} punti conquistati rispetto al merito matematico">
        +${deltaPoints.toFixed(2)} pt
      </span>
    `;
  }
  if (deltaPoints < 0) {
    return `
      <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300/80 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 whitespace-nowrap"
            title="Sfortuna da calendario: ${deltaPoints.toFixed(2)} punti persi a causa di incroci avversi">
        ${deltaPoints.toFixed(2)} pt
      </span>
    `;
  }
  return `
    <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700 whitespace-nowrap"
          title="Punti reali perfettamente allineati ai punti attesi">
      0.00 pt
    </span>
  `;
}

/**
 * Renders a compact micro-SVG podium icon [2 | 1 | 3]
 * Inspired by classic sports podium: gold center (#1), silver left (#2), bronze right (#3)
 */
export function renderPodiumSVG(size: number = 16, className: string = ''): string {
  return `
    <svg class="inline-block shrink-0 ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Podio" title="Podio">
      <!-- Step 2 (Left / Silver) -->
      <rect x="2" y="10" width="6.5" height="12" rx="1" fill="#94A3B8" class="dark:fill-slate-400" />
      <text x="5.25" y="18" font-size="7" font-weight="bold" fill="#0F172A" text-anchor="middle" font-family="sans-serif">2</text>
      <!-- Step 1 (Center / Gold) -->
      <rect x="8.75" y="5" width="6.5" height="17" rx="1" fill="#F59E0B" class="dark:fill-amber-400" />
      <text x="12" y="14" font-size="8" font-weight="900" fill="#0F172A" text-anchor="middle" font-family="sans-serif">1</text>
      <!-- Step 3 (Right / Bronze) -->
      <rect x="15.5" y="13" width="6.5" height="9" rx="1" fill="#D97706" class="dark:fill-amber-600" />
      <text x="18.75" y="20" font-size="6.5" font-weight="bold" fill="#0F172A" text-anchor="middle" font-family="sans-serif">3</text>
    </svg>
  `.trim();
}

