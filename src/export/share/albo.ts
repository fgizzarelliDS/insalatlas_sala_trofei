import { state } from '@/state';
import { showToast } from '@/ui';
import { getLeagueYearSpan } from '@/analytics/records/helpers';
import { LEAGUE } from '@/config';

/**
 * Formats rich banter text and direct link for sharing the Albo d'Oro ranking on WhatsApp
 */
export function buildAlboWhatsAppShareText(customBaseUrl?: string): string {
  let baseUrl = LEAGUE.siteUrl;
  if (customBaseUrl) {
    baseUrl = customBaseUrl;
  } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }
  }
  const shareUrl = `${baseUrl}?tab=albo`;

  // Sort managers by trophies then gold
  const sorted = [...state.managers].sort((a, b) => {
    const totalA = (a.gold || 0) + (a.cup_gold || 0) + (a.supercup || 0) + (a.mundialito || 0);
    const totalB = (b.gold || 0) + (b.cup_gold || 0) + (b.supercup || 0) + (b.mundialito || 0);
    if (totalB !== totalA) return totalB - totalA;
    return (b.gold || 0) - (a.gold || 0);
  });

  const top3 = sorted.slice(0, 3).map((m, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
    const trophies = (m.gold || 0) + (m.cup_gold || 0) + (m.supercup || 0) + (m.mundialito || 0);
    return `${medal} *${m.name}*: ${trophies} Titoli (${m.gold || 0} Scudetti)`;
  }).join('\n');

  const leagueSpan = getLeagueYearSpan(state.competitions);

  return `🏆 *${LEAGUE.brand.name} • ${LEAGUE.brand.subtitle} (${leagueSpan.spanText})*
📜 *CLASSIFICA STORICA DEI PIÙ TITOLATI*

${top3}

📊 ${leagueSpan.completedCount} Campionati • ${state.managers.length} Fantallenatori • Albo d'Oro Ufficiale

👉 Esplora la bacheca completa e le stagioni storiche:
${shareUrl}`;
}

/**
 * Opens WhatsApp directly with pre-filled message and direct link to the Albo d'Oro
 */
export function shareAlboWhatsApp(): void {
  const text = buildAlboWhatsAppShareText();
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }
  showToast('Apertura WhatsApp in corso...', 'info');
}

import { exportGraphicHD } from '@/export/canvas';

/**
 * Triggers high-resolution Albo d'Oro export PNG download
 */
export async function exportAlboHD(): Promise<void> {
  await exportGraphicHD();
}
