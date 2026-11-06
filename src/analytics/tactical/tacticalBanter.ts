/**
 * src/analytics/tactical/tacticalBanter.ts
 * WhatsApp Banter & Social Sharing Generator (SPEC-25)
 */

import { LEAGUE } from '@/config';
import type { TacticalProfile } from './types';

export function formatTacticalWhatsAppBanter(
  profile: TacticalProfile,
  baseUrl = LEAGUE.siteUrl
): string {
  const url = `${baseUrl.replace(/\/+$/, '')}/?manager=${profile.managerId}`;
  const brandHeader = `${LEAGUE.brand.name.toUpperCase()} ${LEAGUE.brand.mainTitle.toUpperCase()}`;

  return `🗞️ *PAGELLA TATTICA • ${brandHeader}*

👤 *Mister:* ${profile.managerName} (${profile.teamName})
🎭 *Identikit:* *${profile.archetype.title}*
🏷️ *Tratto:* ${profile.archetype.trait}

💬 *Motto Ufficiale:*
_${profile.archetype.motto}_

📊 *I Numeri della Filosofia:*
• 🎯 *${profile.stats[0].title}:* ${profile.stats[0].val} (${profile.stats[0].lbl})
• 🍀 *${profile.stats[1].title}:* ${profile.stats[1].val} (${profile.stats[1].lbl})
• 🏆 *${profile.stats[2].title}:* ${profile.stats[2].val} (${profile.stats[2].lbl})

${profile.mindset.pill}
_${profile.mindset.desc}_

👉 *Consulta la scheda completa e il radar a 5 assi:*
${url}`;
}
