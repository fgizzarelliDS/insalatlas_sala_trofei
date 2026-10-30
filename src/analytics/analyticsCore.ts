/**
 * src/analytics/analyticsCore.ts
 * Client-side utilities and reactive state for League-Agnostic Dynamic Elo Analytics
 */

import { EloTrackMode, ManagerEloProfile, EloTrackData, EloConfig } from '../types/analytics';
import { LEAGUE } from '../config';

const STORAGE_KEY = 'insalatlas_elo_mode';
const ELO_EVENT = 'insalatlas:elo-mode-change';

const listeners = new Set<(mode: EloTrackMode) => void>();

let currentEloMode: EloTrackMode = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'flat' || saved === 'historical' || saved === 'atlas') {
      return saved;
    }
  } catch {
    // localStorage not available
  }
  return 'flat';
})();

/**
 * Cycle to the next Elo mode: flat -> historical -> atlas -> flat
 */
export function getNextEloMode(mode: EloTrackMode = getEloMode()): EloTrackMode {
  if (mode === 'flat') return 'historical';
  if (mode === 'historical') return 'atlas';
  return 'flat';
}

export function getEloModeLabel(mode: EloTrackMode): string {
  if (mode === 'historical') return '🏛️ Storico';
  if (mode === 'atlas') return '🔮 Atlas Power';
  return '⚡ Puro';
}

export function getEloModeDescription(mode: EloTrackMode): string {
  if (mode === 'historical') return 'H2H dinastico con seed basato sui trofei';
  if (mode === 'atlas') return 'Dual-Kernel All-Play con Fermi-Dirac (s=8.5)';
  return 'H2H calibrato da 1500 (Hybrid-Capped)';
}

/**
 * Get active Elo tracking mode ('flat' | 'historical')
 */
export function getEloMode(): EloTrackMode {
  return currentEloMode;
}

/**
 * Set active Elo tracking mode and notify listeners
 */
export function setEloMode(mode: EloTrackMode): void {
  if (currentEloMode === mode) return;
  currentEloMode = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage not available
  }
  listeners.forEach(cb => {
    try { cb(mode); } catch { /* ignore */ }
  });
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(ELO_EVENT, { detail: { mode } }));
  }
}

/**
 * Subscribe to Elo tracking mode changes
 */
export function onEloModeChange(callback: (mode: EloTrackMode) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Calculates win probability of Team A against Team B using the logistic formula:
 * P(A) = 1 / (1 + 10^((eloB - eloA) / scaleFactor))
 */
export function computeEloWinProbability(
  eloA: number,
  eloB: number,
  scaleFactor: number = LEAGUE.elo?.scaleFactor || 400.0
): number {
  if (isNaN(eloA) || isNaN(eloB)) return 50.0;
  const exponent = (eloB - eloA) / scaleFactor;
  const prob = 1.0 / (1.0 + Math.pow(10.0, exponent));
  return Math.round(prob * 1000) / 10;
}

/**
 * Get manager's active track data depending on current or passed mode.
 * Automatically reconstructs the per-season index in memory if omitted in serialized payload.
 */
export function getManagerEloTrack(
  profile?: ManagerEloProfile,
  mode: EloTrackMode = getEloMode()
): EloTrackData | undefined {
  if (!profile) return undefined;
  let track: EloTrackData | undefined;
  if (mode === 'historical') {
    track = profile.historical;
  } else if (mode === 'atlas') {
    track = profile.atlas || profile.flat;
  } else {
    track = profile.flat;
  }
  if (track && !track.seasons && track.trajectory) {
    track.seasons = {};
    for (const pt of track.trajectory) {
      if (pt.season) {
        if (!track.seasons[pt.season]) track.seasons[pt.season] = [];
        track.seasons[pt.season].push(pt);
      }
    }
  }
  return track;
}

/**
 * Color coding for Elo ratings
 */
export function getEloColorHex(elo: number): string {
  if (elo >= 1600) return '#f59e0b'; // Gold / Master
  if (elo >= 1540) return '#a855f7'; // Purple / Elite
  if (elo >= 1470) return '#3b82f6'; // Blue / Standard
  if (elo >= 1420) return '#94a3b8'; // Slate / Challenging
  return '#ef4444'; // Red / Danger
}

export function getEloBadgeClasses(elo: number): { bg: string; text: string; border: string } {
  if (elo >= 1600) {
    return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
  }
  if (elo >= 1540) {
    return { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' };
  }
  if (elo >= 1470) {
    return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' };
  }
  if (elo >= 1420) {
    return { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30' };
  }
  return { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' };
}

export function getEloTierTitle(elo: number): string {
  if (elo >= 1620) return 'Leggenda';
  if (elo >= 1560) return 'Maestro';
  if (elo >= 1500) return 'Veterano';
  if (elo >= 1440) return 'Sfidante';
  return 'In Crisi';
}

/**
 * Format Elo score to integer
 */
export function formatElo(val?: number): string {
  if (val === undefined || isNaN(val)) return '1500';
  return Math.round(val).toString();
}

/**
 * Format Elo delta to signed integer
 */
export function formatEloDelta(delta?: number): string {
  if (delta === undefined || isNaN(delta)) return '0';
  const rounded = Math.round(delta);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}`;
}

let cachedAnalyticsManagers: Record<string, ManagerEloProfile> | null = null;
let cachedAnalyticsConfig: EloConfig | null = null;
let analyticsFetchPromise: Promise<Record<string, ManagerEloProfile> | null> | null = null;

/**
 * Loads analytics_data.json containing full multi-season Elo trajectories and profiles
 */
export async function loadAnalyticsEloData(): Promise<Record<string, ManagerEloProfile> | null> {
  if (cachedAnalyticsManagers) return cachedAnalyticsManagers;
  if (analyticsFetchPromise) return analyticsFetchPromise;

  analyticsFetchPromise = (async () => {
    const timestamp = Date.now();
    const urls = [
      `analytics_data.json?t=${timestamp}`,
      `./analytics_data.json?t=${timestamp}`,
      `/analytics_data.json?t=${timestamp}`
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.managers) {
            cachedAnalyticsManagers = data.managers;
            if (data.config) {
              cachedAnalyticsConfig = data.config;
            }
            return cachedAnalyticsManagers;
          }
        }
      } catch {
        // try next candidate
      }
    }
    return null;
  })();

  return analyticsFetchPromise;
}

export function getCachedAnalyticsManagers(): Record<string, ManagerEloProfile> | null {
  return cachedAnalyticsManagers;
}

export function getCachedAnalyticsConfig(): EloConfig | null {
  return cachedAnalyticsConfig;
}

export function getActiveEloConfig(): EloConfig {
  return cachedAnalyticsConfig || (LEAGUE.elo as EloConfig);
}

export function setCachedAnalyticsManagers(
  data: Record<string, ManagerEloProfile> | null,
  config?: EloConfig | null
): void {
  cachedAnalyticsManagers = data;
  if (config !== undefined) {
    cachedAnalyticsConfig = config;
  }
}

export function getCachedEloProfile(managerId: string): ManagerEloProfile | undefined {
  return cachedAnalyticsManagers?.[managerId];
}
