/**
 * src/analytics/analyticsCore.ts
 * Client-side utilities and reactive state for League-Agnostic Dynamic Elo Analytics
 */

import { EloTrackMode, ManagerEloProfile, EloTrackData } from '../types/analytics';
import { LEAGUE } from '../config';

const STORAGE_KEY = 'insalatlas_elo_mode';
const ELO_EVENT = 'insalatlas:elo-mode-change';

const listeners = new Set<(mode: EloTrackMode) => void>();

let currentEloMode: EloTrackMode = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'flat' || saved === 'historical') {
      return saved;
    }
  } catch {
    // localStorage not available
  }
  return 'flat';
})();

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
 * Get manager's active track data depending on current or passed mode
 */
export function getManagerEloTrack(
  profile?: ManagerEloProfile,
  mode: EloTrackMode = getEloMode()
): EloTrackData | undefined {
  if (!profile) return undefined;
  return mode === 'historical' ? profile.historical : profile.flat;
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
 * Format Elo score to 1 decimal place
 */
export function formatElo(val?: number): string {
  if (val === undefined || isNaN(val)) return '1500.0';
  return val.toFixed(1);
}

/**
 * Format Elo delta with sign
 */
export function formatEloDelta(delta?: number): string {
  if (delta === undefined || isNaN(delta)) return '0.0';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
}
