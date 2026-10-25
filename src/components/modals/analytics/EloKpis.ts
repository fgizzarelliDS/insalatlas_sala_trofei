/**
 * src/components/modals/analytics/EloKpis.ts
 * Overview KPI cards for Tab 5 (Leader, Top Gainer, Historical Peak, Rating Spread)
 */

import type { ManagerEloProfile, EloTrackMode } from '@/types/analytics';
import { getManagerEloTrack, formatElo } from '@/analytics/analyticsCore';

export interface EloProfileEntry {
  managerId: string;
  teamName: string;
  coach: string;
  logo?: string;
  profile: ManagerEloProfile;
}

/**
 * Renders the top 4 compact KPI statistics cards for Elo rating
 */
export function renderEloOverviewKpis(
  profiles: EloProfileEntry[],
  activeMode: EloTrackMode
): string {
  if (!profiles || profiles.length === 0) return '';

  // Sort descending by rating
  const kpiProfiles = [...profiles].sort((a, b) => {
    const rA = getManagerEloTrack(a.profile, activeMode)?.current ?? 1500;
    const rB = getManagerEloTrack(b.profile, activeMode)?.current ?? 1500;
    return rB - rA;
  });

  const topManager = kpiProfiles[0];
  const topTrack = getManagerEloTrack(topManager?.profile, activeMode);

  // Best last round delta
  let bestDelta = -999;
  let topGainer = kpiProfiles[0];
  for (const p of kpiProfiles) {
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (tr && tr.lastDelta > bestDelta) {
      bestDelta = tr.lastDelta;
      topGainer = p;
    }
  }

  // All-time highest peak
  let highestPeak = 1500;
  let peakManager = kpiProfiles[0];
  for (const p of kpiProfiles) {
    const tr = getManagerEloTrack(p.profile, activeMode);
    if (tr && tr.peak.value > highestPeak) {
      highestPeak = tr.peak.value;
      peakManager = p;
    }
  }

  // Lowest rating & spread
  const lowestManager = kpiProfiles[kpiProfiles.length - 1];
  const lowestTrack = getManagerEloTrack(lowestManager?.profile, activeMode);
  const spread = ((topTrack?.current ?? 1500) - (lowestTrack?.current ?? 1500)).toFixed(1);

  return `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
      <!-- Leader -->
      <div class="p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between" style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="min-w-0">
          <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60 truncate" style="color: var(--text-muted);">Leader Elo</div>
          <div class="font-sport font-black text-xs sm:text-[13px] text-amber-500 truncate leading-tight mt-0.5" title="${topManager?.teamName}">${topManager?.teamName}</div>
        </div>
        <div class="text-[11px] sm:text-xs font-mono font-bold mt-1" style="color: var(--text-main);">${formatElo(topTrack?.current)} pt</div>
      </div>

      <!-- Top Gainer -->
      <div class="p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between" style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="min-w-0">
          <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60 truncate" style="color: var(--text-muted);">Miglior Balzo (L1)</div>
          <div class="font-sport font-black text-xs sm:text-[13px] text-emerald-500 truncate leading-tight mt-0.5" title="${topGainer?.teamName}">${topGainer?.teamName}</div>
        </div>
        <div class="text-[11px] sm:text-xs font-mono font-bold text-emerald-400 mt-1">+${bestDelta.toFixed(1)} pt</div>
      </div>

      <!-- Historical Peak -->
      <div class="p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between" style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="min-w-0">
          <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60 truncate" style="color: var(--text-muted);">Picco Massimo</div>
          <div class="font-sport font-black text-xs sm:text-[13px] text-purple-400 truncate leading-tight mt-0.5" title="${peakManager?.teamName}">${peakManager?.teamName}</div>
        </div>
        <div class="text-[11px] sm:text-xs font-mono font-bold mt-1" style="color: var(--text-main);">${formatElo(highestPeak)} pt</div>
      </div>

      <!-- Rating Spread -->
      <div class="p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between" style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="min-w-0">
          <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60 truncate" style="color: var(--text-muted);">Dispersione Lega</div>
          <div class="font-sport font-black text-xs sm:text-[13px] text-cyan-400 truncate leading-tight mt-0.5">${spread} pt</div>
        </div>
        <div class="text-[9px] opacity-60 mt-1 truncate" style="color: var(--text-muted);">Max − Min attivo</div>
      </div>
    </div>
  `;
}
