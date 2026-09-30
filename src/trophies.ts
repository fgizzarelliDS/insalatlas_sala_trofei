export interface TrophySvgMeta {
  w: number;
  h: number;
  vb: string;
  t: string;
  content: string;
}

export const TROPHY_SVGS: Record<string, TrophySvgMeta> = {
  gold_cup: {
    w: 24,
    h: 32,
    vb: '0 0 24 30',
    t: '1° Posto Campionato (Scudetto)',
    content:
      '<path d="M5 4H19V11C19 14.866 15.866 18 12 18C8.134 18 5 14.866 5 11V4Z" fill="#FACC15" stroke="#CA8A04" stroke-width="1.2"/><path d="M7 6H17V11C17 13.761 14.761 16 12 16C9.239 16 7 13.761 7 11V6Z" fill="#FDE047"/><path d="M5 6H3C1.895 6 1 6.895 1 8V10C1 12.209 2.791 14 5 14H6" stroke="#CA8A04" stroke-width="1.4" stroke-linecap="round"/><path d="M19 6H21C22.105 6 23 6.895 23 8V10C23 12.209 21.209 14 19 14H18" stroke="#CA8A04" stroke-width="1.4" stroke-linecap="round"/><path d="M11 18H13V24H11V18Z" fill="#EAB308"/><rect x="5" y="24" width="14" height="5" rx="1.5" fill="#0F172A" stroke="#334155" stroke-width="0.8"/><rect x="7" y="25.5" width="10" height="2" fill="#EAB308" opacity="0.9"/>'
  },
  silver_cup: {
    w: 24,
    h: 32,
    vb: '0 0 24 30',
    t: '2° Posto Campionato',
    content:
      '<path d="M5 4H19V11C19 14.866 15.866 18 12 18C8.134 18 5 14.866 5 11V4Z" fill="#CBD5E1" stroke="#64748B" stroke-width="1.2"/><path d="M7 6H17V11C17 13.761 14.761 16 12 16C9.239 16 7 13.761 7 11V6Z" fill="#F1F5F9"/><path d="M5 6H3C1.895 6 1 6.895 1 8V10C1 12.209 2.791 14 5 14H6" stroke="#64748B" stroke-width="1.4" stroke-linecap="round"/><path d="M19 6H21C22.105 6 23 6.895 23 8V10C23 12.209 21.209 14 19 14H18" stroke="#64748B" stroke-width="1.4" stroke-linecap="round"/><path d="M11 18H13V24H11V18Z" fill="#94A3B8"/><rect x="5" y="24" width="14" height="5" rx="1.5" fill="#0F172A" stroke="#334155" stroke-width="0.8"/><rect x="7" y="25.5" width="10" height="2" fill="#CBD5E1" opacity="0.9"/>'
  },
  bronze_cup: {
    w: 24,
    h: 32,
    vb: '0 0 24 30',
    t: '3° Posto Campionato',
    content:
      '<path d="M5 4H19V11C19 14.866 15.866 18 12 18C8.134 18 5 14.866 5 11V4Z" fill="#D97706" stroke="#92400E" stroke-width="1.2"/><path d="M7 6H17V11C17 13.761 14.761 16 12 16C9.239 16 7 13.761 7 11V6Z" fill="#F59E0B"/><path d="M5 6H3C1.895 6 1 6.895 1 8V10C1 12.209 2.791 14 5 14H6" stroke="#92400E" stroke-width="1.4" stroke-linecap="round"/><path d="M19 6H21C22.105 6 23 6.895 23 8V10C23 12.209 21.209 14 19 14H18" stroke="#92400E" stroke-width="1.4" stroke-linecap="round"/><path d="M11 18H13V24H11V18Z" fill="#B45309"/><rect x="5" y="24" width="14" height="5" rx="1.5" fill="#0F172A" stroke="#334155" stroke-width="0.8"/><rect x="7" y="25.5" width="10" height="2" fill="#D97706" opacity="0.9"/>'
  },
  wooden_spoon: {
    w: 16,
    h: 32,
    vb: '0 0 16 36',
    t: 'Cucchiaio di Legno',
    content:
      '<path d="M7 11V34H9V11H7Z" fill="#B45309" stroke="#78350F" stroke-width="0.9"/><ellipse cx="8" cy="7" rx="5" ry="6" fill="#D97706" stroke="#78350F" stroke-width="1.1"/><ellipse cx="8" cy="7" rx="3" ry="4" fill="#F59E0B" opacity="0.85"/>'
  },
  coppa_gold: {
    w: 24,
    h: 32,
    vb: '0 0 24 30',
    t: 'Coppa di Lega (Oro)',
    content:
      '<path d="M6 3H18V12C18 15.314 15.314 18 12 18C8.686 18 6 15.314 6 12V3Z" fill="#FBBF24" stroke="#B45309" stroke-width="1.2"/><path d="M8 5H16V11C16 13.209 14.209 15 12 15C9.791 15 8 13.209 8 11V5Z" fill="#FDE047"/><path d="M6 5C2 5 2 13 6 14" stroke="#B45309" stroke-width="1.5" fill="none"/><path d="M18 5C22 5 22 13 18 14" stroke="#B45309" stroke-width="1.5" fill="none"/><path d="M11 18H13V24H11V18Z" fill="#CA8A04"/><rect x="6" y="24" width="12" height="4" rx="1" fill="#78350F"/>'
  },
  coppa_silver: {
    w: 24,
    h: 32,
    vb: '0 0 24 30',
    t: 'Coppa di Lega (Argento)',
    content:
      '<path d="M6 3H18V12C18 15.314 15.314 18 12 18C8.686 18 6 15.314 6 12V3Z" fill="#CBD5E1" stroke="#475569" stroke-width="1.2"/><path d="M8 5H16V11C16 13.209 14.209 15 12 15C9.791 15 8 13.209 8 11V5Z" fill="#F1F5F9"/><path d="M6 5C2 5 2 13 6 14" stroke="#475569" stroke-width="1.5" fill="none"/><path d="M18 5C22 5 22 13 18 14" stroke="#475569" stroke-width="1.5" fill="none"/><path d="M11 18H13V24H11V18Z" fill="#94A3B8"/><rect x="6" y="24" width="12" height="4" rx="1" fill="#334155"/>'
  },
  supercup: {
    w: 20,
    h: 32,
    vb: '0 0 20 30',
    t: 'Supercoppa',
    content:
      '<path d="M6 2H14V10C14 12.209 12.209 14 10 14C7.791 14 6 12.209 6 10V2Z" fill="#FBBF24" stroke="#B45309" stroke-width="1.1"/><circle cx="10" cy="8" r="4.5" fill="#F59E0B"/><polygon points="10,4.5 11.2,7.5 14,7.8 12,9.8 12.5,12.5 10,11 7.5,12.5 8,9.8 6,7.8 8.8,7.5" fill="#FEF08A"/><path d="M9 14H11V23H9V14Z" fill="#CA8A04"/><rect x="5" y="23" width="10" height="5" rx="1" fill="#0F172A" stroke="#CA8A04" stroke-width="0.8"/>'
  },
  mundialito: {
    w: 24,
    h: 32,
    vb: '0 0 26 34',
    t: 'Trofeo Mundialito',
    content:
      '<circle cx="13" cy="10" r="7.5" fill="#F59E0B" stroke="#B45309" stroke-width="1.2"/><ellipse cx="13" cy="10" rx="4" ry="7.5" fill="none" stroke="#FEF08A" stroke-width="0.8" opacity="0.8"/><line x1="5.5" y1="10" x2="20.5" y2="10" stroke="#FEF08A" stroke-width="0.8" opacity="0.8"/><path d="M5 16C7 19 10 21 13 21C16 21 19 19 21 16L18 24H8L5 16Z" fill="#D97706" stroke="#92400E" stroke-width="1.1"/><path d="M9 22H17V26H9V22Z" fill="#B45309"/><rect x="4" y="26" width="18" height="6" rx="1.5" fill="#0F172A" stroke="#334155" stroke-width="1"/><rect x="6" y="28" width="14" height="2.5" rx="0.5" fill="#FBBF24"/><text x="13" y="30" font-family="sans-serif" font-size="2.2" font-weight="900" fill="#78350F" text-anchor="middle">MUNDIALITO</text>'
  }
};

/**
 * Returns SVG markup string for a specified trophy identifier
 * @param type - Key in TROPHY_SVGS
 */
export function renderTrophySVG(type: string): string {
  const m = TROPHY_SVGS[type];
  if (!m) return '';
  return `<svg class="trophy-svg shrink-0" width="${m.w}" height="${m.h}" viewBox="${m.vb}" fill="none" title="${m.t}">${m.content}</svg>`;
}

/**
 * Renders HTML badge for a playout / cartonato coach banner
 * @param badgeName - Coach tag string (e.g. 'JURIC', 'MAZZARRI', 'ALLEGRI', '???')
 */
export function renderCoachBanner(badgeName: string): string {
  if (!badgeName) return '';
  const b = badgeName.trim().toUpperCase();

  if (b === 'JURIC') {
    return `<div class="coach-banner bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white border border-blue-400/80" title="Banner Cartonato: Ivan Juric"><span>📢</span><span>JURIC</span></div>`;
  }
  if (b === 'MAZZARRI') {
    return `<div class="coach-banner bg-gradient-to-r from-sky-700 via-sky-800 to-blue-950 text-sky-100 border border-sky-400/80" title="Banner Cartonato: Walter Mazzarri (Orologio)"><span>⌚</span><span>MAZZARRI</span></div>`;
  }
  if (b === '???') {
    return `<div class="coach-banner bg-gradient-to-r from-blue-800 to-indigo-950 text-amber-300 border border-blue-400 font-extrabold px-2.5" title="Banner Cartonato: Mister Misterioso (???)"><span>❓</span><span>???</span></div>`;
  }
  if (b === 'ALLEGRI') {
    return `<div class="coach-banner bg-gradient-to-r from-zinc-800 to-neutral-950 text-slate-100 border border-zinc-500" title="Banner Cartonato: Max Allegri (Corto Muso)"><span>🐎</span><span>ALLEGRI</span></div>`;
  }

  return `<div class="coach-banner bg-gradient-to-r from-blue-900 to-slate-900 text-blue-200 border border-blue-500/60" title="Banner Cartonato: ${b}"><span>🏷️</span><span>${b}</span></div>`;
}
