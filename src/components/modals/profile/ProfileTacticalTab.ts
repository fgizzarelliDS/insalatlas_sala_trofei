/**
 * src/components/modals/profile/ProfileTacticalTab.ts
 * Renders the Tactical Profiler & Psychological Identikit (Tab 2 in ProfileModal) 
 */

import type { Manager } from '@/types';
import {
  computeManagerTacticalProfile,
  calculateRadarSvgPoints,
  formatTacticalWhatsAppBanter,
  type TacticalProfile
} from '@/analytics/tacticalProfiler';
import { showToast } from '@/utils/toast';
import { escapeHtml } from '@/utils/dom';
import { openStoryExportModal } from '@/components/modals/export/StoryExportModal';
import { getLiveSeasonDetails } from '@/state';

let activeTacticalProfile: TacticalProfile | null = null;
let activeTacticalManager: Manager | null = null;
let activeTacticalAllManagers: Manager[] = [];
let activeTacticalScope: 'career' | 'season' = 'career';

/**
 * Toggles tactical profiler scope between career and live season
 */
export function setProfileTacticalScope(scope: 'career' | 'season'): void {
  activeTacticalScope = scope;
  if (activeTacticalManager && activeTacticalAllManagers.length > 0) {
    populateTacticalProfileDOM(activeTacticalManager, activeTacticalAllManagers);
  }
}

/**
 * Copies the preformatted WhatsApp banter message to the system clipboard
 */
export async function copyActiveManagerTacticalBanter(): Promise<void> {
  if (!activeTacticalProfile) {
    showToast('Nessun profilo tattico attivo da copiare', 'error');
    return;
  }
  const text = formatTacticalWhatsAppBanter(activeTacticalProfile);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showToast('Banter WhatsApp copiato negli appunti! 📋', 'success');
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('Banter WhatsApp copiato negli appunti! 📋', 'success');
    }
  } catch (err) {
    console.error('Failed to copy banter text:', err);
    showToast('Impossibile copiare negli appunti', 'error');
  }
}

/**
 * Opens 9:16 Visual Story Cards Hub for active manager with Tactical Identikit preselected
 */
export async function exportActiveManagerTacticalStory(): Promise<void> {
  if (!activeTacticalManager) {
    showToast('Nessun manager selezionato per la Story', 'error');
    return;
  }
  openStoryExportModal(activeTacticalManager.id, 'tactical', 'team');
}

// Global window bindings for inline onclick handlers
if (typeof window !== 'undefined') {
  (window as any).copyActiveManagerTacticalBanter = copyActiveManagerTacticalBanter;
  (window as any).exportActiveManagerTacticalStory = exportActiveManagerTacticalStory;
  (window as any).setProfileTacticalScope = setProfileTacticalScope;
}

/**
 * Populates DOM for Tab 2 (Identikit Tattico) in ProfileModal
 */
export function populateTacticalProfileDOM(
  manager: Manager,
  allManagers: Manager[]
): void {
  activeTacticalManager = manager;
  activeTacticalAllManagers = allManagers;
  const liveData = getLiveSeasonDetails();
  const profile = computeManagerTacticalProfile(manager, allManagers, liveData, undefined, activeTacticalScope);
  activeTacticalProfile = profile;

  const container = document.getElementById('profile-tab-tactical-content');
  if (!container) return;

  const arch = profile.archetype;
  const axes = profile.axes;
  const mindset = profile.mindset;
  const liveSeasonLabel = liveData?.season || '2026/27';
  const shortSeasonLabel = liveSeasonLabel.replace(/^20/, '');
  const isManagerActive = Boolean(
    liveData?.standings?.some(s => s.managerId === manager.id || s.coach?.toLowerCase() === manager.name?.toLowerCase())
  );

  // Full-width radar league average polygon points (baseline Score = 50 on all 5 axes)
  // viewBox = 440x305, cx = 220, cy = 156, r = 110 (baseline r = 55)
  const avgPolygonPoints = '220,101 272,139 252,200 188,200 168,139';
  const radarPolygonPoints = calculateRadarSvgPoints(
    {
      pot: axes.pot.score,
      cin: axes.cin.score,
      luk: axes.luk.score,
      reg: axes.reg.score,
      koc: axes.koc.score
    },
    220,
    156,
    110
  );

  container.innerHTML = `
    <!-- 1. HERO ARCHETYPE CARD -->
    <div class="relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-lg transition-colors"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-20"
           style="background-color: ${arch.color};"></div>

      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0"
               style="background-color: ${arch.color}15; border-color: ${arch.color}40; color: ${arch.color};">
            <i class="fa-solid ${arch.icon}"></i>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest"
                    style="color: var(--accent-color, #f59e0b);">
                DNA DI CARRIERA ALL-TIME
              </span>
              <span class="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border"
                style="background-color: ${arch.color}20; color: ${arch.color}; border-color: ${arch.color}50;">
                ${escapeHtml(arch.trait)}
              </span>
            </div>
            <h3 class="text-lg sm:text-xl font-black font-sport tracking-tight mt-0.5" style="color: ${arch.color};">
              ${escapeHtml(arch.title)}
            </h3>
          </div>
        </div>

        <!-- Quick Action Buttons -->
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <button type="button" onclick="window.exportActiveManagerTacticalStory()"
            class="flex-1 sm:flex-initial px-3 py-1.5 sm:py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
            <i class="fa-solid fa-camera" style="color: var(--accent-color, #f59e0b);"></i>
            <span>Story 9:16</span>
          </button>
          <button type="button" onclick="window.copyActiveManagerTacticalBanter()"
            class="flex-1 sm:flex-initial px-3 py-1.5 sm:py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            style="background-color: var(--btn-bg); border-color: var(--btn-border); color: var(--btn-text);">
            <i class="fa-brands fa-whatsapp text-emerald-500"></i>
            <span>Copia Banter</span>
          </button>
        </div>
      </div>

      <!-- Tactical Motto Banner -->
      <div class="mt-3 sm:mt-4 pt-3 border-t flex items-start gap-2" style="border-color: var(--table-border);">
        <i class="fa-solid fa-quote-left text-sm opacity-75 mt-0.5 shrink-0" style="color: var(--accent-color, #f59e0b);"></i>
        <p class="text-xs sm:text-sm font-medium italic leading-snug" style="color: var(--text-main);">
          ${escapeHtml(arch.motto)}
        </p>
      </div>
    </div>

    <!-- 2. SEASONAL MINDSET TILE -->
    <div class="rounded-2xl border p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm transition-colors"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center text-base sm:text-lg shrink-0"
             style="background-color: var(--input-bg); border-color: var(--table-border); color: var(--accent-color, #f59e0b);">
          <i class="fa-solid ${mindset.icon}"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">
              ${mindset.isActive ? `MINDSET LIVE ${escapeHtml(liveSeasonLabel)}` : 'STATO ATTIVITÀ'}
            </span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${mindset.isActive ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 dark:text-amber-300' : ''
    }" style="${mindset.isActive ? '' : 'background-color: var(--input-bg); border-color: var(--table-border); color: var(--text-muted);'}">
              ${escapeHtml(mindset.pill)}
            </span>
          </div>
          <p class="text-xs mt-0.5" style="color: var(--text-main);">
            ${escapeHtml(mindset.desc)}
          </p>
        </div>
      </div>
      ${mindset.isActive ? `
      <div class="flex items-center gap-3 self-end sm:self-center shrink-0">
        <div class="text-right">
          <span class="block text-[9px] font-bold uppercase" style="color: var(--text-muted);">MOMENTUM L5</span>
          <span class="text-xs font-mono font-bold text-emerald-500 dark:text-emerald-400">${escapeHtml(mindset.momentum)}</span>
        </div>
        <div class="text-right">
          <span class="block text-[9px] font-bold uppercase" style="color: var(--text-muted);">ΔLUCK ${escapeHtml(shortSeasonLabel)}</span>
          <span class="text-xs font-mono font-bold" style="color: var(--accent-color, #f59e0b);">${escapeHtml(mindset.luckDelta)}</span>
        </div>
      </div>
      ` : ''}
    </div>

    <!-- 3. FULL-WIDTH TACTICAL RADAR + 5 STYLE DEVIATION BARS -->
    <div class="space-y-3 sm:space-y-4">
      
      <!-- Full-Width Radar SVG Card -->
      <div class="rounded-2xl border p-4 sm:p-5 flex flex-col items-center justify-center transition-colors"
           style="background-color: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
        <div class="flex items-center justify-between gap-2 flex-wrap w-full mb-2">
          <div class="flex items-center gap-2">
            <span class="text-xs sm:text-sm font-bold font-sport uppercase tracking-wider flex items-center gap-1.5" style="color: var(--text-main);">
              <i class="fa-solid fa-compass" style="color: var(--accent-color, #f59e0b);"></i>
              <span>Radar Tattico (5 Assi)</span>
            </span>
            <span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style="background-color: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.3); color: #818cf8;">
              ${profile.scope === 'season' ? `Assetto Live ${escapeHtml(liveSeasonLabel)}` : 'DNA All-Time'}
            </span>
          </div>

          <!-- Scope Switch Toggle: Carriera vs Stagione Live -->
          <div class="inline-flex p-0.5 rounded-xl border text-[10px] font-bold shadow-xs"
               style="background-color: var(--input-bg); border-color: var(--table-border);">
            <button type="button"
              onclick="window.setProfileTacticalScope && window.setProfileTacticalScope('career')"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeTacticalScope === 'career' ? 'shadow-xs font-black' : 'opacity-60 hover:opacity-100'}"
              style="${activeTacticalScope === 'career' ? 'background-color: var(--modal-bg); color: var(--text-main);' : 'color: var(--text-muted);'}">
              🏛️ Carriera
            </button>
            <button type="button"
              onclick="window.setProfileTacticalScope && window.setProfileTacticalScope('season')"
              ${!isManagerActive ? 'disabled title="Il mister non partecipa alla stagione in corso"' : ''}
              class="px-2.5 py-1 rounded-lg transition-all ${activeTacticalScope === 'season' ? 'shadow-xs font-black' : 'opacity-60 hover:opacity-100'} ${!isManagerActive ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}"
              style="${activeTacticalScope === 'season' ? 'background-color: var(--modal-bg); color: var(--accent-color, #f59e0b);' : 'color: var(--text-muted);'}">
              ⚡ Stagione ${escapeHtml(shortSeasonLabel)}
            </button>
          </div>
        </div>

        <!-- Prominent SVG Radar (440x305 viewBox, cx=220, cy=156, r=110) -->
        <svg viewBox="0 0 440 305" class="w-full max-w-[400px] sm:max-w-[430px] h-auto my-1 mx-auto">
          <!-- Concentric Pentagons (100%, 75%, 25%) -->
          <polygon points="220,46 325,122 285,245 155,245 115,122" fill="none" stroke="currentColor" stroke-opacity="0.20" stroke-width="1.4"></polygon>
          <polygon points="220,74 298,131 268,223 172,223 142,131" fill="none" stroke="currentColor" stroke-opacity="0.14" stroke-width="1.1"></polygon>
          <polygon points="220,129 246,148 236,178 204,178 194,148" fill="none" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"></polygon>
          
          <!-- Axes Lines from Center (220, 156) -->
          <line x1="220" y1="156" x2="220" y2="46" stroke="currentColor" stroke-opacity="0.18" stroke-width="1.2"></line>
          <line x1="220" y1="156" x2="325" y2="122" stroke="currentColor" stroke-opacity="0.18" stroke-width="1.2"></line>
          <line x1="220" y1="156" x2="285" y2="245" stroke="currentColor" stroke-opacity="0.18" stroke-width="1.2"></line>
          <line x1="220" y1="156" x2="155" y2="245" stroke="currentColor" stroke-opacity="0.18" stroke-width="1.2"></line>
          <line x1="220" y1="156" x2="115" y2="122" stroke="currentColor" stroke-opacity="0.18" stroke-width="1.2"></line>

          <!-- League Average Baseline (Dashed 50%) -->
          <polygon points="${avgPolygonPoints}" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.40" stroke-width="1.8" stroke-dasharray="5 3"></polygon>

          <!-- Manager Polygon (Amber Fill) -->
          <polygon points="${radarPolygonPoints}" fill="rgba(245, 158, 11, 0.30)" stroke="#f59e0b" stroke-width="2.8" style="filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.45));"></polygon>

          <!-- Axis Labels + Raw Metric Values -->
          <!-- 0: POTENZA (Top) -->
          <text x="220" y="19" text-anchor="middle" fill="currentColor" opacity="0.92" font-size="11" font-weight="800" letter-spacing="0.5">POTENZA</text>
          <text x="220" y="34" text-anchor="middle" fill="#f59e0b" font-size="10.5" font-weight="800">${axes.pot.raw}</text>

          <!-- 1: CINISMO (Top Right) -->
          <text x="338" y="118" text-anchor="start" fill="currentColor" opacity="0.92" font-size="11" font-weight="800" letter-spacing="0.5">CINISMO</text>
          <text x="338" y="133" text-anchor="start" fill="#f59e0b" font-size="10.5" font-weight="800">${axes.cin.raw}</text>

          <!-- 2: FORTUNA (Bottom Right) -->
          <text x="292" y="269" text-anchor="middle" fill="currentColor" opacity="0.92" font-size="11" font-weight="800" letter-spacing="0.5">FORTUNA</text>
          <text x="292" y="284" text-anchor="middle" fill="#f59e0b" font-size="10.5" font-weight="800">${axes.luk.raw}</text>

          <!-- 3: STABILITÀ (Bottom Left) -->
          <text x="148" y="269" text-anchor="middle" fill="currentColor" opacity="0.92" font-size="11" font-weight="800" letter-spacing="0.5">STABILITÀ</text>
          <text x="148" y="284" text-anchor="middle" fill="#f59e0b" font-size="10.5" font-weight="800">${axes.reg.raw}</text>

          <!-- 4: COPPE / BIG MATCH (Top Left) -->
          <text x="102" y="118" text-anchor="end" fill="currentColor" opacity="0.92" font-size="11" font-weight="800" letter-spacing="0.5">${axes.koc.shortTitle || 'COPPE'}</text>
          <text x="102" y="133" text-anchor="end" fill="#f59e0b" font-size="10.5" font-weight="800">${axes.koc.raw}${axes.koc.subRaw ? ` <tspan font-size="9" opacity="0.65">${axes.koc.subRaw}</tspan>` : ''}</text>
        </svg>
      </div>

      <!-- Full-Width 5 Style Bars against League Average -->
      <div class="rounded-2xl border p-4 sm:p-5 space-y-3 transition-colors"
           style="background-color: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs sm:text-sm font-bold font-sport uppercase tracking-wider" style="color: var(--text-main);">
            Deviazione dalla Media di Lega
          </span>
          <span class="text-[10px] font-semibold" style="color: var(--text-muted);">
            Tacca centrale = Media Lega (50%)
          </span>
        </div>

        <div class="space-y-2.5">
          ${[axes.pot, axes.cin, axes.luk, axes.reg, axes.koc].map(ax => `
            <div>
              <div class="flex items-center justify-between gap-2 text-xs mb-1">
                <span class="font-semibold text-xs truncate" style="color: var(--text-muted);">${ax.label}</span>
                <span class="font-bold text-xs whitespace-nowrap shrink-0" style="color: var(--text-main);">
                  ${ax.raw}${ax.subRaw ? ` <span class="opacity-60 text-[10px] font-normal">${ax.subRaw}</span>` : ''} <span class="font-mono text-[11px] ${ax.deltaNumeric >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${ax.deltaPct}</span>
                </span>
              </div>
              <div class="w-full h-2.5 rounded-full overflow-hidden relative border" style="background-color: var(--input-bg); border-color: var(--table-border);">
                <div class="h-full ${ax.barColor} rounded-full transition-all duration-500" style="width: ${ax.score}%;"></div>
                <div class="absolute top-0 bottom-0 left-1/2 w-0.5" style="background-color: var(--text-muted); opacity: 0.45;" title="Media di Lega (50%)"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- 4. I NUMERI DELLA FILOSOFIA (3 KEY METRICS TILES) -->
    <div>
      <span class="text-[11px] font-bold font-sport uppercase tracking-wider block mb-2" style="color: var(--text-muted);">
        I Numeri della Filosofia
      </span>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
        ${profile.stats.map(s => `
          <div class="rounded-xl border p-2.5 sm:p-3 text-center transition-colors"
               style="background-color: var(--table-surface); border-color: var(--table-border);">
            <span class="block text-[9px] sm:text-[10px] uppercase font-bold" style="color: var(--text-muted);">${s.title}</span>
            <span class="text-base sm:text-lg font-black font-sport mt-0.5 block" style="color: var(--accent-color, #f59e0b);">${s.val}</span>
            <span class="text-[10px] sm:text-[11px] block" style="color: var(--text-muted);">${s.lbl}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
