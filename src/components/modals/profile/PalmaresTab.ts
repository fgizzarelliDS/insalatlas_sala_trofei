import type { Manager, TradingCardBadge } from '@/types';
import { formatScore } from '@/score';
import { renderTrophySVG, renderCoachBanner } from '@/trophies';
import { computeManagerBadges, computeManagerRivalries } from '@/analytics';
import { state } from '@/state';

/**
 * Updates DOM elements for vital stats, badges, and trophy shelf inside the profile modal (Palmares tab)
 */
export function populatePalmaresDOM(m: Manager, score: number, totalMajor: number, successRate: number): void {
  // 1. Vital stats
  const nameEl = document.getElementById('profile-name');
  const yearsEl = document.getElementById('profile-years-badge');
  const scoreEl = document.getElementById('profile-score');
  const rateEl = document.getElementById('profile-success-rate');
  const totalEl = document.getElementById('profile-total-titles');

  if (nameEl) nameEl.textContent = m.name;
  if (yearsEl) yearsEl.textContent = `${m.years} ${m.years === 1 ? 'Stagione disputata' : 'Stagioni disputate'}`;
  if (scoreEl) scoreEl.textContent = `${formatScore(score)} pt`;
  if (rateEl) rateEl.textContent = `${successRate}%`;
  if (totalEl) totalEl.textContent = String(totalMajor);

  // 2. Honorary and Behavioral Badges
  const badgesContainer = document.getElementById('profile-badges-container');
  if (badgesContainer) {
    badgesContainer.innerHTML = '';
    const badges: TradingCardBadge[] = computeManagerBadges(m);

    if (badges.length === 0) {
      badgesContainer.innerHTML =
        '<span class="text-xs opacity-50 italic">Nessun riconoscimento speciale sbloccato.</span>';
    } else {
      badges.forEach(b => {
        const el = document.createElement('span');
        el.className = `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${b.color || ''}`;
        if (b.customStyle) el.style.cssText = b.customStyle;
        const iconHtml = b.icon && b.icon.startsWith('fa-')
          ? `<i class="fa-solid ${b.icon}"></i>`
          : `<span class="inline-block text-[11px] leading-none">${b.icon || ''}</span>`;
        el.innerHTML = `${iconHtml} ${b.label}`;
        badgesContainer.appendChild(el);
      });
    }
  }

  // 2.1 Rivalità Storiche: Bestia Nera (Nemesis) & Babbo Natale (Victim)
  const rivalriesContainer = document.getElementById('profile-rivalries-container');
  if (rivalriesContainer) {
    const rivalries = computeManagerRivalries(m, state.managers || []);

    let nemesisHTML = '';
    if (rivalries.nemesis) {
      const nem = rivalries.nemesis;
      const ptsPrefix = nem.pointsDiff > 0 ? '+' : '';
      nemesisHTML = `
        <button type="button" onclick="window.openH2HWithOpponent('${m.id}', '${nem.opponent.id}')"
          class="flex items-center justify-between p-2.5 rounded-xl border text-left transition hover:scale-[1.01] shadow-sm bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 group cursor-pointer"
          title="Clicca per aprire il duello Head-to-Head contro ${nem.opponent.name}">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center font-bold text-sm shrink-0 border border-rose-500/30">
              👹
            </div>
            <div class="min-w-0">
              <span class="block text-[9px] uppercase tracking-wider font-extrabold opacity-70">Bestia Nera</span>
              <span class="block text-xs font-black truncate">${nem.opponent.name}</span>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="block text-[11px] font-black">${nem.wins}V - ${nem.ties}N - ${nem.losses}P</span>
            <span class="block text-[10px] font-bold text-rose-600 dark:text-rose-400">${ptsPrefix}${nem.pointsDiff} pt</span>
          </div>
        </button>
      `;
    } else {
      nemesisHTML = `
        <div class="flex items-center gap-2 p-2.5 rounded-xl border opacity-60 border-slate-700/40 bg-black/5 dark:bg-white/5">
          <div class="w-8 h-8 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">
            👹
          </div>
          <div>
            <span class="block text-[9px] uppercase tracking-wider font-extrabold opacity-70">Bestia Nera</span>
            <span class="block text-xs font-bold italic opacity-80">Nessun tabù storico</span>
          </div>
        </div>
      `;
    }

    let victimHTML = '';
    if (rivalries.victim) {
      const vic = rivalries.victim;
      const ptsPrefix = vic.pointsDiff > 0 ? '+' : '';
      victimHTML = `
        <button type="button" onclick="window.openH2HWithOpponent('${m.id}', '${vic.opponent.id}')"
          class="flex items-center justify-between p-2.5 rounded-xl border text-left transition hover:scale-[1.01] shadow-sm bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 group cursor-pointer"
          title="Clicca per aprire il duello Head-to-Head contro ${vic.opponent.name}">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-500/30">
              🎅
            </div>
            <div class="min-w-0">
              <span class="block text-[9px] uppercase tracking-wider font-extrabold opacity-70">Babbo Natale</span>
              <span class="block text-xs font-black truncate">${vic.opponent.name}</span>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="block text-[11px] font-black">${vic.wins}V - ${vic.ties}N - ${vic.losses}P</span>
            <span class="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400">${ptsPrefix}${vic.pointsDiff} pt</span>
          </div>
        </button>
      `;
    } else {
      victimHTML = `
        <div class="flex items-center gap-2 p-2.5 rounded-xl border opacity-60 border-slate-700/40 bg-black/5 dark:bg-white/5">
          <div class="w-8 h-8 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">
            🎅
          </div>
          <div>
            <span class="block text-[9px] uppercase tracking-wider font-extrabold opacity-70">Babbo Natale</span>
            <span class="block text-xs font-bold italic opacity-80">Nessuna preda fissa</span>
          </div>
        </div>
      `;
    }

    rivalriesContainer.innerHTML = nemesisHTML + victimHTML;
  }

  // 3. Graphic Trophy Shelf
  const shelf = document.getElementById('profile-trophy-shelf');
  if (shelf) {
    shelf.innerHTML = '';

    const trophyTypes = [
      { label: 'Scudetti (1° Posto)', count: m.gold || 0, svg: 'gold_cup' },
      { label: 'Secondi Posti', count: m.silver || 0, svg: 'silver_cup' },
      { label: 'Terzi Posti', count: m.bronze || 0, svg: 'bronze_cup' },
      { label: 'Coppe di Lega (Oro)', count: m.cup_gold || 0, svg: 'coppa_gold' },
      { label: 'Coppe di Lega (Argento)', count: m.cup_silver || 0, svg: 'coppa_silver' },
      { label: 'Supercoppe', count: m.supercup || 0, svg: 'supercup' },
      { label: 'Mundialito', count: m.mundialito || 0, svg: 'mundialito' },
      { label: 'Cucchiai di Legno', count: m.spoon || 0, svg: 'wooden_spoon' }
    ];

    trophyTypes.forEach(t => {
      if (t.count > 0) {
        let icons = '';
        for (let i = 0; i < t.count; i++) icons += renderTrophySVG(t.svg);
        shelf.innerHTML += `
          <div class="flex items-center justify-between border-b pb-2 last:border-b-0 gap-2" style="border-color: var(--table-border);">
            <span class="text-xs font-semibold opacity-80 shrink-0">${t.label} (x${t.count})</span>
            <div class="flex items-center gap-1 flex-wrap justify-end">${icons}</div>
          </div>
        `;
      }
    });

    // Cartonati / Playout Banners
    const cartonatiCount = m.cartonato || 0;
    const coaches = m.coach_banners || m.cartonato_coaches || [];
    if (cartonatiCount > 0 || coaches.length > 0) {
      let banners: string[] = [];
      if (coaches.length > 0) {
        banners = coaches.map(c => renderCoachBanner(c));
      } else {
        for (let i = 0; i < cartonatiCount; i++) banners.push(renderCoachBanner('CARTONATO'));
      }
      shelf.innerHTML += `
        <div class="flex items-center justify-between pt-1">
          <span class="text-xs font-semibold opacity-80">Banner Playout</span>
          <div class="flex items-center gap-1.5 flex-wrap justify-end">${banners.join('')}</div>
        </div>
      `;
    }

    if (shelf.innerHTML.trim() === '') {
      shelf.innerHTML = '<div class="text-xs opacity-50 italic py-2 text-center">Bacheca ancora vuota.</div>';
    }
  }
}
