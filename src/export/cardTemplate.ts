import type { Manager, TradingCardBadge } from '@/types';
import { calculateManagerScore, formatScore } from '@/score';
import { renderTrophySVG, renderCoachBanner } from '@/trophies';
import { getManagerArchetype, computeTailRiskProfile } from '@/analytics';

/**
 * Computes dynamic merit and behavioral badges for a manager's trading card
 */
export function computeTradingCardBadges(manager: Manager): TradingCardBadge[] {
  const badges: TradingCardBadge[] = [];

  const totalMajor = (manager.gold || 0) + (manager.cup_gold || 0) + (manager.supercup || 0) + (manager.mundialito || 0);
  const efficiency = manager.years > 0 ? parseFloat((totalMajor / manager.years).toFixed(2)) : 0;

  // 1. Behavioral Archetype
  const arch = getManagerArchetype(manager, totalMajor, efficiency);
  badges.push({
    label: `Profilo: ${arch.tag}`,
    icon: arch.icon,
    customStyle: `background: ${arch.color}25; color: ${arch.color}; border: 1px solid ${arch.color}60;`
  });

  // 2. Net Tail Risk (NTI) Polarity
  const risk = computeTailRiskProfile(manager);
  badges.push({
    label: `Rischio: ${risk.label}`,
    icon: risk.icon,
    customStyle: `background: ${risk.color}25; color: ${risk.color}; border: 1px solid ${risk.color}60;`
  });

  // 3. Historical Merit Badges
  if (manager.years >= 6) {
    badges.push({
      label: 'Veterano della Lega',
      icon: 'fa-shield-halved',
      color: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/60'
    });
  }
  if (totalMajor >= 4) {
    badges.push({
      label: 'Re dei Titoli',
      icon: 'fa-crown',
      color: 'bg-amber-900/60 text-amber-300 border-amber-600/60'
    });
  }
  if ((manager.gold || 0) >= 1 && (manager.cup_gold || 0) >= 1) {
    badges.push({
      label: 'Double Winner',
      icon: 'fa-star',
      color: 'bg-yellow-900/60 text-yellow-300 border-yellow-600/60'
    });
  }
  if ((manager.cartonato || 0) >= 2) {
    badges.push({
      label: 'Incubo Playout',
      icon: 'fa-skull-crossbones',
      color: 'bg-rose-950/70 text-rose-300 border-rose-700/60'
    });
  }
  if ((manager.spoon || 0) >= 2) {
    badges.push({
      label: 'Collezionista Cucchiai',
      icon: 'fa-utensils',
      color: 'bg-amber-950/80 text-amber-500 border-amber-800/60'
    });
  }

  return badges;
}

/**
 * Extracts initials from manager name for card avatar
 */
export function getManagerInitials(name: string): string {
  const parts = name.split(/[ &+/,-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Builds HTML template for 9:16 high-resolution Trading Card
 */
export function buildTradingCardHTML(manager: Manager): string {
  const score = calculateManagerScore(manager);
  const initials = getManagerInitials(manager.name);
  const badges = computeTradingCardBadges(manager);

  const coaches = manager.coach_banners || manager.cartonato_coaches || [];
  const cartonatiCount = manager.cartonato || 0;

  let bannersMarkup = '';
  if (coaches.length > 0) {
    bannersMarkup = coaches.map(c => renderCoachBanner(c)).join('');
  } else if (cartonatiCount > 0) {
    bannersMarkup = Array(cartonatiCount).fill(0).map(() => renderCoachBanner('CARTONATO')).join('');
  } else {
    bannersMarkup = '<span class="text-xs opacity-40 italic">Nessun cartonato in bacheca</span>';
  }

  const badgesMarkup = badges.map(b => {
    const styleAttr = b.customStyle ? `style="${b.customStyle}"` : '';
    const classAttr = b.color ? b.color : 'bg-white/10 border-white/20 text-slate-200';
    return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold border ${classAttr}" ${styleAttr}><i class="fa-solid ${b.icon}"></i> ${b.label}</span>`;
  }).join('');

  return `
    <div class="trading-card">
      <!-- Card Top Header -->
      <div class="flex items-center justify-between border-b pb-3" style="border-color: var(--table-border);">
        <div class="flex items-center gap-3">
          <img src="favicon-64x64.png" alt="InsalAtlas" class="w-10 h-10 object-contain drop-shadow" />
          <div>
            <span class="block text-xs uppercase font-black tracking-widest" style="color: var(--accent-color, #eab308);">InsalAtlas Lega</span>
            <span class="block text-[11px] opacity-70">Scheda Ufficiale Palmarès</span>
          </div>
        </div>
        <div class="text-right">
          <span class="inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border"
                style="background: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
            ${manager.years} ${manager.years === 1 ? 'Edizione' : 'Edizioni'}
          </span>
        </div>
      </div>

      <!-- Hero Section: Avatar, Name & Overall Rating -->
      <div class="text-center my-3">
        <div class="w-24 h-24 mx-auto rounded-full flex items-center justify-center shadow-2xl mb-2.5 border-2"
             style="background: radial-gradient(circle, var(--accent-color) 0%, transparent 80%), rgba(255,255,255,0.05); border-color: var(--accent-color);">
          <span class="text-3xl font-black tracking-wider" style="color: var(--text-main);">${initials}</span>
        </div>
        <h2 class="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2 leading-none" style="color: var(--text-main);">
          ${manager.name.toUpperCase()}
        </h2>
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-md font-extrabold text-lg"
             style="background: var(--table-surface); border-color: var(--accent-color); color: var(--accent-color);">
          <i class="fa-solid fa-star text-sm"></i>
          <span>${formatScore(score)} PT</span>
        </div>
      </div>

      <!-- Badges Pills -->
      <div class="flex items-center justify-center flex-wrap gap-1.5 my-2">
        ${badgesMarkup}
      </div>

      <!-- 6 Trophy Stat Boxes (2 columns x 3 rows) -->
      <div class="grid grid-cols-2 gap-2.5 my-2 flex-grow">
        <!-- Scudetti -->
        <div class="trading-card-stat-box p-3 flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            ${renderTrophySVG('gold_cup')}
          </div>
          <div>
            <span class="block text-2xl font-black leading-none">${manager.gold || 0}</span>
            <span class="text-[11px] uppercase font-bold opacity-70">Scudetti</span>
          </div>
        </div>

        <!-- Coppe di Lega -->
        <div class="trading-card-stat-box p-3 flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            ${renderTrophySVG('coppa_gold')}
          </div>
          <div>
            <span class="block text-2xl font-black leading-none">${manager.cup_gold || 0}</span>
            <span class="text-[11px] uppercase font-bold opacity-70">Coppe Lega</span>
          </div>
        </div>

        <!-- Supercoppe -->
        <div class="trading-card-stat-box p-3 flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            ${renderTrophySVG('supercup')}
          </div>
          <div>
            <span class="block text-2xl font-black leading-none">${manager.supercup || 0}</span>
            <span class="text-[11px] uppercase font-bold opacity-70">Supercoppe</span>
          </div>
        </div>

        <!-- Mundialito -->
        <div class="trading-card-stat-box p-3 flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            ${renderTrophySVG('mundialito')}
          </div>
          <div>
            <span class="block text-2xl font-black leading-none">${manager.mundialito || 0}</span>
            <span class="text-[11px] uppercase font-bold opacity-70">Mundialito</span>
          </div>
        </div>

        <!-- Cucchiai di Legno -->
        <div class="trading-card-stat-box p-3 flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            ${renderTrophySVG('wooden_spoon')}
          </div>
          <div>
            <span class="block text-2xl font-black leading-none text-amber-500">${manager.spoon || 0}</span>
            <span class="text-[11px] uppercase font-bold opacity-70">Cucchiai Legno</span>
          </div>
        </div>

        <!-- Cartonati Playout -->
        <div class="trading-card-stat-box p-3 flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            <i class="fa-solid fa-skull-crossbones text-rose-400 text-2xl"></i>
          </div>
          <div>
            <span class="block text-2xl font-black leading-none text-rose-400">${manager.cartonato || 0}</span>
            <span class="text-[11px] uppercase font-bold opacity-70">Cartonati</span>
          </div>
        </div>
      </div>

      <!-- Playout Coach Banners Strip -->
      <div class="my-2 p-3 trading-card-stat-box">
        <span class="block text-[10px] uppercase font-extrabold tracking-wider opacity-60 mb-2">Bacheca Allenatori Cartonato</span>
        <div class="flex items-center flex-wrap gap-1.5">${bannersMarkup}</div>
      </div>

      <!-- Card Footer -->
      <div class="border-t pt-2.5 flex items-center justify-between text-[11px] opacity-50 font-mono" style="border-color: var(--table-border);">
        <span>fgizzarellids.github.io/insalatlas_sala_trofei</span>
        <span>Scheda Ufficiale ${new Date().getFullYear()}</span>
      </div>
    </div>
  `;
}
