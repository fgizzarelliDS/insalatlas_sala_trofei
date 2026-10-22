import type { Manager } from '@/types';
import { formatScore } from '@/score';
import { computeHeadToHead } from '@/analytics';
import { LEAGUE } from '@/config';

/**
 * Formats rich banter text and direct link for WhatsApp sharing of a 1vs1 Head-to-Head duel
 */
export function buildH2HWhatsAppShareText(
  managerA: Manager,
  managerB: Manager,
  customBaseUrl?: string
): string {
  const stats = computeHeadToHead(managerA, managerB);

  let baseUrl = LEAGUE.siteUrl;
  if (customBaseUrl) {
    baseUrl = customBaseUrl;
  } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }
  }

  const shareUrl = `${baseUrl}?h2h=${encodeURIComponent(managerA.id)}:${encodeURIComponent(managerB.id)}`;

  return `⚔️ *${LEAGUE.brand.name} • Duello Head-to-Head*
👤 *${managerA.name.toUpperCase()}* vs *${managerB.name.toUpperCase()}*

🏁 *Scontri Diretti in Campionato:*
${stats.winsA} Vittorie ${managerA.name} • ${stats.ties} Pari • ${stats.winsB} Vittorie ${managerB.name} (${stats.sharedSeasonsCount} campionati condivisi)

🏆 *Palmarès a Confronto:*
• Scudetti: ${managerA.gold || 0} vs ${managerB.gold || 0}
• Coppe di Lega: ${managerA.cup_gold || 0} vs ${managerB.cup_gold || 0}
• Rating Storico: ${formatScore(stats.palmares.ratingScore.a)} PT vs ${formatScore(stats.palmares.ratingScore.b)} PT

📊 *Indice di Freddezza:*
• ${managerA.name}: ${stats.metricsA.clutchIcon} ${stats.metricsA.clutchLabel}
• ${managerB.name}: ${stats.metricsB.clutchIcon} ${stats.metricsB.clutchLabel}

📜 *Verdetto:* ${stats.narrativeVerdict}

👉 Guarda il duello completo:
${shareUrl}`;
}

/**
 * Formats rich banter text and direct link for WhatsApp sharing of Tavolo dei Rivali multi-manager cluster
 */
export function buildMultiManagerWhatsAppShareText(
  managers: Manager[],
  multiSelectedIds: string[],
  customBaseUrl?: string
): string {
  const names = managers.map(m => m.name.toUpperCase()).join(' vs ');
  let baseUrl = LEAGUE.siteUrl;
  if (customBaseUrl) {
    baseUrl = customBaseUrl;
  } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }
  }

  const shareUrl = `${baseUrl}?h2h=multi&m=${encodeURIComponent(multiSelectedIds.join(':'))}`;
  return `🕸️ *${LEAGUE.brand.name} • Tavolo dei Rivali*
⚔️ *${names}*

📊 Confronto radar multidimensionale a 6 assi e mini-torneo incrociato tra rivali storici.

👉 Guarda il tavolo completo:
${shareUrl}`;
}
