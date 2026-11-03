import type { Manager, TieredManagerBadge } from '@/types';
import { computeTieredManagerBadges, computeManagerBadgeScoreboard } from '@/analytics/badges';

/**
 * Maps category to readable Italian label and icon
 */
function getCategoryMeta(cat: string): { label: string; icon: string; colorClass: string } {
  switch (cat) {
    case 'dynasty':
      return { label: 'Dinastia', icon: 'fa-crown', colorClass: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
    case 'milestone':
      return { label: 'Traguardo', icon: 'fa-flag-checkered', colorClass: 'text-sky-400 bg-sky-400/10 border-sky-400/20' };
    case 'irony':
      return { label: 'Banter & Disonori', icon: 'fa-face-laugh-squint', colorClass: 'text-rose-400 bg-rose-400/10 border-rose-400/20' };
    case 'performance':
      return { label: 'Performance', icon: 'fa-shield-halved', colorClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
    default:
      return { label: 'Speciale', icon: 'fa-star', colorClass: 'text-purple-400 bg-purple-400/10 border-purple-400/20' };
  }
}

/**
 * Formats value display label for each badge metric
 */
function formatBadgeValue(badgeId: string, val: number): string {
  switch (badgeId) {
    case 'bacheca_reale':
      return `${val} ${val === 1 ? 'Trofeo' : 'Trofei'}`;
    case 'continuita_dinastica':
      return `${val} ${val === 1 ? 'Anno' : 'Anni'} a podio`;
    case 'maratoneta':
      return `${val} ${val === 1 ? 'Stagione' : 'Stagioni'}`;
    case 'mille_punti':
      return `${val} pt totali`;
    case 'duellante_eccelso':
      return `${val} ${val === 1 ? 'Duello' : 'Duelli'} vinti`;
    case 'collezionista_cucchiai':
      return `${val} ${val === 1 ? 'Cucchiaio' : 'Cucchiai'}`;
    case 'incubo_playout':
      return `${val} ${val === 1 ? 'Cartonato' : 'Cartonati'}`;
    default:
      return `${val}`;
  }
}

let isLeaderboardOpen = false;

/**
 * Toggles visibility of the full league Hall of Fame leaderboard within the tab
 */
export function toggleProfileHoFLeaderboard(): void {
  const container = document.getElementById('profile-hof-leaderboard-container');
  const btn = document.getElementById('profile-hof-leaderboard-toggle-btn');
  if (!container || !btn) return;

  isLeaderboardOpen = !isLeaderboardOpen;
  if (isLeaderboardOpen) {
    container.classList.remove('hidden');
    btn.innerHTML = `<i class="fa-solid fa-chevron-up"></i> <span>Nascondi Classifica Hall of Fame</span>`;
  } else {
    container.classList.add('hidden');
    btn.innerHTML = `<i class="fa-solid fa-trophy text-amber-400"></i> <span>Classifica Completa Hall of Fame</span>`;
  }
}

/**
 * Populates DOM for Tab 3: Hall of Fame & Badges
 */
export function populateProfileBadgesDOM(manager: Manager, allManagers: Manager[] = []): void {
  const container = document.getElementById('profile-badges-tab-container');
  if (!container) return;

  const badges = computeTieredManagerBadges(manager, allManagers);
  const scoreboard = computeManagerBadgeScoreboard(allManagers);
  const myRankIndex = scoreboard.findIndex(s => s.managerId === manager.id);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : 1;
  const myScoreEntry = scoreboard.find(s => s.managerId === manager.id);
  const totalScore = myScoreEntry ? myScoreEntry.totalScore : badges.reduce((sum, b) => sum + b.pointsScore, 0);

  const platinumCount = myScoreEntry?.platinumCount || badges.filter(b => b.currentTier === 'platinum').length;
  const goldCount = myScoreEntry?.goldCount || badges.filter(b => b.currentTier === 'gold').length;
  const silverCount = myScoreEntry?.silverCount || badges.filter(b => b.currentTier === 'silver').length;
  const bronzeCount = myScoreEntry?.bronzeCount || badges.filter(b => b.currentTier === 'bronze').length;

  container.innerHTML = `
    <!-- Top Summary Card: Hall of Fame Status -->
    <div class="p-4 sm:p-5 rounded-2xl border mb-5 shadow-sm"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <i class="fa-solid fa-award"></i> Hall of Fame Status
            </span>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              #${myRank} su ${scoreboard.length} Allenatori
            </span>
          </div>
          <h4 class="text-base sm:text-lg font-black tracking-tight mt-1" style="color: var(--text-main);">
            ${manager.name}
          </h4>
        </div>

        <div class="flex items-center gap-2 self-start sm:self-auto">
          <div class="px-3 py-1.5 rounded-xl border flex items-center gap-2"
               style="background-color: var(--input-bg); border-color: var(--table-border);">
            <div class="text-right">
              <div class="text-[9px] uppercase font-bold opacity-60">Punti Badge</div>
              <div class="font-sport font-black text-xl text-amber-400 leading-none">${totalScore} pt</div>
            </div>
            <i class="fa-solid fa-shield-cat text-amber-400 text-lg opacity-80"></i>
          </div>
        </div>
      </div>

      <!-- Badge Tier Counts Pills -->
      <div class="grid grid-cols-4 gap-1.5 sm:gap-2 text-center pt-2 border-t" style="border-color: var(--table-border);">
        <div class="p-2 rounded-xl border" style="background-color: rgba(56, 189, 248, 0.08); border-color: rgba(56, 189, 248, 0.25);">
          <div class="font-sport font-black text-base sm:text-lg text-sky-400 leading-none">${platinumCount}</div>
          <div class="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-sky-300 opacity-90">Platino</div>
        </div>
        <div class="p-2 rounded-xl border" style="background-color: rgba(234, 179, 8, 0.08); border-color: rgba(234, 179, 8, 0.25);">
          <div class="font-sport font-black text-base sm:text-lg text-yellow-400 leading-none">${goldCount}</div>
          <div class="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-yellow-300 opacity-90">Oro</div>
        </div>
        <div class="p-2 rounded-xl border" style="background-color: rgba(148, 163, 184, 0.08); border-color: rgba(148, 163, 184, 0.25);">
          <div class="font-sport font-black text-base sm:text-lg text-slate-300 leading-none">${silverCount}</div>
          <div class="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-slate-400 opacity-90">Argento</div>
        </div>
        <div class="p-2 rounded-xl border" style="background-color: rgba(217, 119, 6, 0.08); border-color: rgba(217, 119, 6, 0.25);">
          <div class="font-sport font-black text-base sm:text-lg text-amber-500 leading-none">${bronzeCount}</div>
          <div class="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-amber-600 opacity-90">Bronzo</div>
        </div>
      </div>
    </div>

    <!-- Toggle Leaderboard Button -->
    <div class="mb-4 flex items-center justify-between gap-2">
      <span class="text-xs font-bold uppercase tracking-wider opacity-75 flex items-center gap-1.5">
        <i class="fa-solid fa-list-check text-amber-400"></i> Traguardi &amp; Riconoscimenti
      </span>
      <button id="profile-hof-leaderboard-toggle-btn"
              type="button"
              onclick="window.toggleProfileHoFLeaderboard && window.toggleProfileHoFLeaderboard()"
              class="px-2.5 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer bg-slate-500/10 hover:bg-amber-500/15 text-slate-300 hover:text-amber-400 border-slate-700/50 hover:border-amber-500/40 active:scale-95">
        <i class="fa-solid fa-trophy text-amber-400"></i>
        <span>Classifica Completa Hall of Fame</span>
      </button>
    </div>

    <!-- Collapsible Full Hall of Fame Leaderboard -->
    <div id="profile-hof-leaderboard-container" class="hidden mb-5 p-3 sm:p-4 rounded-2xl border transition-all"
         style="background-color: var(--table-surface); border-color: var(--table-border);">
      <div class="text-xs font-bold uppercase tracking-wider mb-2.5 opacity-80 flex items-center justify-between">
        <span class="flex items-center gap-1.5">
          <i class="fa-solid fa-crown text-amber-400"></i> Classifica Ufficiale Hall of Fame
        </span>
        <span class="text-[10px] opacity-60">1 pt Bronzo · 3 pt Argento · 5 pt Oro · 10 pt Platino</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b opacity-60 text-[10px] uppercase font-bold" style="border-color: var(--table-border);">
              <th class="py-1.5 px-2">#</th>
              <th class="py-1.5 px-2">Mister</th>
              <th class="py-1.5 px-2 text-center">Badges</th>
              <th class="py-1.5 px-2 text-right">Punti</th>
            </tr>
          </thead>
          <tbody class="divide-y" style="border-color: var(--table-border);">
            ${scoreboard.map((s, idx) => {
              const isCurrent = s.managerId === manager.id;
              const rowClass = isCurrent
                ? 'bg-amber-500/15 font-bold text-amber-400'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-90';
              return `
                <tr class="${rowClass} transition">
                  <td class="py-2 px-2 font-mono text-[11px]">${idx + 1}</td>
                  <td class="py-2 px-2 flex items-center gap-1.5">
                    <span>${s.managerName}</span>
                    ${isCurrent ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black">TU</span>' : ''}
                  </td>
                  <td class="py-2 px-2 text-center">
                    <span class="inline-flex items-center gap-1 text-[11px]">
                      ${s.platinumCount > 0 ? `<span class="text-sky-400 font-bold">${s.platinumCount}💎</span>` : ''}
                      ${s.goldCount > 0 ? `<span class="text-amber-400 font-bold">${s.goldCount}🥇</span>` : ''}
                      ${s.silverCount > 0 ? `<span class="text-slate-300 font-bold">${s.silverCount}🥈</span>` : ''}
                      ${s.bronzeCount > 0 ? `<span class="text-amber-600 font-bold">${s.bronzeCount}🥉</span>` : ''}
                      ${(s.platinumCount + s.goldCount + s.silverCount + s.bronzeCount === 0) ? '<span class="opacity-40">-</span>' : ''}
                    </span>
                  </td>
                  <td class="py-2 px-2 text-right font-sport font-black text-sm">${s.totalScore} pt</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Badges Grid: Responsive 1 col mobile / 2 col tablet+ -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
      ${badges.map(b => renderBadgeCardHTML(b)).join('')}
    </div>
  `;
}

/**
 * Renders individual badge card HTML
 */
function renderBadgeCardHTML(b: TieredManagerBadge): string {
  const cat = getCategoryMeta(b.category);
  const formattedCur = formatBadgeValue(b.id, b.currentValue);
  const formattedTgt = b.nextTargetValue !== null ? formatBadgeValue(b.id, b.nextTargetValue) : 'Massimo';

  return `
    <div class="p-3.5 rounded-2xl border transition-all flex flex-col justify-between"
         style="background-color: var(--table-surface); border-color: ${b.isUnlocked ? b.tierBorder : 'var(--table-border)'};">
      <div>
        <!-- Card Header: Icon, Category & Tier Pill -->
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm border shrink-0"
                 style="background-color: ${b.tierBg}; border-color: ${b.tierBorder}; color: ${b.tierColor};">
              <i class="${b.icon}"></i>
            </div>
            <div>
              <h5 class="text-xs font-black leading-tight" style="color: var(--text-main);">
                ${b.name}
              </h5>
              <span class="inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded border mt-0.5 ${cat.colorClass}">
                <i class="fa-solid ${cat.icon} mr-0.5"></i> ${cat.label}
              </span>
            </div>
          </div>

          <div class="shrink-0 text-right">
            <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border"
                  style="background-color: ${b.tierBg}; border-color: ${b.tierBorder}; color: ${b.tierColor};">
              ${b.tierLabel} ${b.pointsScore > 0 ? `(${b.pointsScore} pt)` : ''}
            </span>
          </div>
        </div>

        <!-- Description -->
        <p class="text-[11px] leading-relaxed opacity-75 mb-3" style="color: var(--text-main);">
          ${b.description}
        </p>
      </div>

      <!-- Footer: Metric Value & Progress Meter -->
      <div class="pt-2 border-t mt-1" style="border-color: var(--table-border);">
        <div class="flex items-center justify-between text-[10px] font-bold mb-1 opacity-80">
          <span>Attuale: <strong class="text-amber-400 font-sport">${formattedCur}</strong></span>
          <span>
            ${b.isPlaceholder
              ? 'In Arrivo'
              : (b.nextTier
                  ? `Obiettivo: <strong>${formattedTgt}</strong> (${b.nextTier})`
                  : 'Massimo Raggiunto 🎉')
            }
          </span>
        </div>

        <div class="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-slate-700/50">
          <div class="h-full rounded-full transition-all duration-500"
               style="width: ${b.progressPercent}%; background-color: ${b.tierColor};"></div>
        </div>
      </div>
    </div>
  `;
}

// Window binding for zero-framework HTML event handler
if (typeof window !== 'undefined') {
  (window as any).toggleProfileHoFLeaderboard = toggleProfileHoFLeaderboard;
}
