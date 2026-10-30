import { showToast } from '@/ui';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { findUpcomingRound, resolveMatchupMetrics, buildLeagueDistributionContext } from '@/components/board/seasons/nextRoundMetrics';
import { getCachedNextRoundLiveData } from '@/components/board/seasons/NextRoundStrip';
import { getEloMode } from '@/analytics/analyticsCore';
import { LEAGUE } from '@/config';

/**
 * Builds rich formatted text for sharing upcoming round matchups via WhatsApp or Telegram
 */
export function buildNextRoundShareText(liveData: any, shareUrl: string): string {
  const nextRound = findUpcomingRound(liveData);
  if (!nextRound || !nextRound.matches || nextRound.matches.length === 0) {
    return `⚽ *Prossimo Turno — ${LEAGUE.brand.name}*\n\nNessun turno imminente da disputare.\n${shareUrl}`;
  }

  const mode = getEloMode();
  const modeLabel = mode === 'flat' ? '⚡ Elo Puro (1500)' : mode === 'historical' ? '🏛️ Elo Storico' : '🔮 Atlas Power';
  const matches = nextRound.matches.filter((m: any) => !m.isPlayed);
  const totalTeams = liveData.standings?.length || 14;
  const leagueCtx = buildLeagueDistributionContext(liveData.standings || [], mode, liveData.season);

  const matchLines = matches.map((m: any, idx: number) => {
    const meta = resolveMatchupMetrics(m, idx, liveData, mode, totalTeams, leagueCtx);

    return [
      `*${meta.clima.label}*`,
      `#${meta.homeRank} *${meta.homeTeam}* (${meta.homeEloInt}) *${meta.winProbHome.toFixed(0)}%*  ⚔️  *${meta.winProbAway.toFixed(0)}%* (${meta.awayEloInt}) *${meta.awayTeam}* #${meta.awayRank}`,
      `🎲 *Quote 1X2:* 1 *${meta.odds.q1.toFixed(2)}* • X *${meta.odds.qX.toFixed(2)}* • 2 *${meta.odds.q2.toFixed(2)}*`
    ].join('\n');
  });

  const lines = [
    `⚽ *PROSSIMO TURNO — GIORNATA ${nextRound.roundNumber}*`,
    `🏆 *${LEAGUE.brand.name}* • Previsioni Pre-Match H2H (${modeLabel}):\n`,
    matchLines.join('\n\n'),
    `\n👉 Consulta tutti i duelli, quote interattive e confronti H2H:\n${shareUrl}`
  ];

  return lines.join('\n');
}

/**
 * Shares Next Round duels via WhatsApp
 */
export function shareNextRoundWhatsApp(): void {
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?tab=seasons`
    : '';
  const live = getLiveSeasonDetails() || getCachedNextRoundLiveData();
  const text = live
    ? buildNextRoundShareText(live, shareUrl)
    : `⚽ Guarda i duelli del Prossimo Turno:\n${shareUrl}`;

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
  showToast('Apertura WhatsApp in corso...', 'info');
}

import { renderNextRoundCanvas } from '@/export/renderers/nextRound';
import { downloadBlob, copyBlobToClipboard } from '@/export/renderers/core';

let isExportingNextRound = false;

/**
 * Captures Next Round duels as HD PNG and downloads it
 */
export async function exportNextRoundPNG(): Promise<void> {
  if (isExportingNextRound) {
    showToast('Generazione duelli in corso...', 'info');
    return;
  }
  isExportingNextRound = true;
  showToast('Generazione Scheda Duelli HD in corso...', 'info');

  try {
    const canvas = await renderNextRoundCanvas();
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione dell'immagine", 'error');
        return;
      }
      const filename = `${LEAGUE.brand.name}_Prossimo_Turno_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Next Round export failed:', err);
    showToast('Impossibile esportare la scheda duelli', 'error');
  } finally {
    isExportingNextRound = false;
  }
}

/**
 * Captures Next Round duels as HD PNG and copies directly to clipboard
 */
export async function copyNextRoundToClipboard(): Promise<boolean> {
  if (isExportingNextRound) {
    showToast('Generazione duelli in corso...', 'info');
    return false;
  }
  isExportingNextRound = true;
  showToast('Generazione Duelli HD per WhatsApp / Telegram...', 'info');

  try {
    const canvas = await renderNextRoundCanvas();
    return new Promise<boolean>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Errore durante la creazione dell'immagine", 'error');
          resolve(false);
          return;
        }
        const copied = await copyBlobToClipboard(blob, `${LEAGUE.brand.name}_Prossimo_Turno.png`);
        resolve(copied);
      }, 'image/png');
    });
  } catch (err) {
    console.error('Next Round clipboard copy failed:', err);
    showToast('Copia negli appunti non riuscita', 'error');
    return false;
  } finally {
    isExportingNextRound = false;
  }
}
