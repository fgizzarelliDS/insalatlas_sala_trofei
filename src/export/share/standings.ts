import { showToast } from '@/ui';
import { getLiveSeasonDetails } from '@/components/board/seasons/liveAnalytics';
import { LEAGUE } from '@/config';

/**
 * Builds rich text for sharing a team's live matches & season analytics
 */
export function buildTeamMatchesShareText(teamMetric: any, shareUrl: string): string {
  const luck = teamMetric.scheduleLuck;
  const luckZ = luck ? `${luck.luckBadge} ${luck.luckLabel} (${luck.luckZScore > 0 ? '+' : ''}${luck.luckZScore.toFixed(2)}σ)` : '';
  const xPts = luck ? `${luck.xPoints.toFixed(2)} xPTS` : '';
  const ap = luck?.allPlayRecord;
  const tvt = ap ? `${ap.wins}V ${ap.draws}N ${ap.losses}P (${ap.winPct}%)` : '';

  const lines = [
    `📊 *${teamMetric.teamName}* (${teamMetric.coach || 'Allenatore'})`,
    `🏆 *Stagione Live 2026/27* • Posizione Reale: #${teamMetric.rank}`,
    luck ? `🎯 *Merito:* #${luck.xRank} (${xPts})` : '',
    luckZ ? `🎲 *Calendario:* ${luckZ}` : '',
    tvt ? `⚔️ *Record Tutti vs Tutti:* ${tvt}` : '',
    `\n👉 Guarda il tabellino e le statistiche complete:\n${shareUrl}`
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Builds rich text for sharing the live Merit Standings snapshot
 */
export function buildMeritStandingsShareText(standings: any[], shareUrl: string): string {
  const top3 = standings
    .slice()
    .sort((a, b) => (a.scheduleLuck?.xRank ?? a.rank) - (b.scheduleLuck?.xRank ?? b.rank))
    .slice(0, 3);

  const topLines = top3.map((t, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
    const xPts = t.scheduleLuck ? `${t.scheduleLuck.xPoints.toFixed(2)} xPTS` : '';
    return `${medal} #${idx + 1} *${t.teamName}* (${xPts})`;
  });

  const lines = [
    `⚖️ *Classifica di Merito (xPTS) — Stagione Live 2026/27*`,
    `Graduatoria oggettiva depurata dalla fortuna del calendario (Tutti vs Tutti):\n`,
    ...topLines,
    `\n👉 Scopri la classifica di merito completa e l'indice di fortuna:\n${shareUrl}`
  ];

  return lines.join('\n');
}

/**
 * Shares team matches via WhatsApp
 */
export function shareTeamMatchesWhatsApp(teamName: string): void {
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?tab=seasons&team=${encodeURIComponent(teamName)}`
    : '';
  const live = getLiveSeasonDetails();
  const teamMetric = live?.standings?.find((t: any) => t.teamName.toLowerCase() === teamName.toLowerCase());
  const text = teamMetric
    ? buildTeamMatchesShareText(teamMetric, shareUrl)
    : `📊 Guarda il calendario e le statistiche di *${teamName}*:\n${shareUrl}`;

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
  showToast('Apertura WhatsApp in corso...', 'info');
}

/**
 * Shares team matches via Native Web Share API (mobile) or fallback to copy
 */
export async function shareTeamMatchesNative(teamName: string): Promise<void> {
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?tab=seasons&team=${encodeURIComponent(teamName)}`
    : '';
  const live = getLiveSeasonDetails();
  const teamMetric = live?.standings?.find((t: any) => t.teamName.toLowerCase() === teamName.toLowerCase());
  const text = teamMetric
    ? buildTeamMatchesShareText(teamMetric, shareUrl)
    : `📊 Guarda il calendario e le statistiche di ${teamName}:\n${shareUrl}`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `${teamName} — Calendario & Statistiche`,
        text: text,
        url: shareUrl
      });
      showToast('Condiviso con successo!', 'success');
      return;
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
    }
  }
  copyTeamMatchesLink(teamName);
}

/**
 * Copies direct link to a team's matches to clipboard
 */
export async function copyTeamMatchesLink(teamName: string): Promise<void> {
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?tab=seasons&team=${encodeURIComponent(teamName)}`
    : '';
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link squadra copiato negli appunti!', 'success');
      return;
    } catch {
      // fallback
    }
  }
  showToast('Impossibile copiare il link', 'error');
}

/**
 * Builds rich text for sharing the live Real Standings snapshot
 */
export function buildRealStandingsShareText(standings: any[], shareUrl: string): string {
  const top3 = standings
    .slice()
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .slice(0, 3);

  const topLines = top3.map((t, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
    const pts = t.points !== undefined && t.points !== null ? `${t.points} pt` : '';
    return `${medal} #${t.rank || idx + 1} *${t.teamName}* ${pts ? `(${pts})` : ''}`.trim();
  });

  const lines = [
    `🏆 *Classifica Ufficiale — ${LEAGUE.brand.name}*`,
    `La corsa al titolo entra nel vivo:\n`,
    ...topLines,
    `\n👉 Consulta la classifica completa, forma recente e statistiche:\n${shareUrl}`
  ];

  return lines.join('\n');
}

/**
 * Shares real standings via WhatsApp
 */
export function shareRealStandingsWhatsApp(): void {
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?tab=seasons&view=real`
    : '';
  const standings = getLiveSeasonDetails()?.standings || [];
  const text = standings.length > 0
    ? buildRealStandingsShareText(standings, shareUrl)
    : `🏆 Guarda la Classifica Ufficiale:\n${shareUrl}`;

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
  showToast('Apertura WhatsApp in corso...', 'info');
}

/**
 * Shares merit standings via WhatsApp
 */
export function shareMeritStandingsWhatsApp(): void {
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?tab=seasons&view=merit`
    : '';
  const standings = getLiveSeasonDetails()?.standings || [];
  const text = standings.length > 0
    ? buildMeritStandingsShareText(standings, shareUrl)
    : `⚖️ Guarda la Classifica di Merito (xPTS) aggiornata:\n${shareUrl}`;

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
  showToast('Apertura WhatsApp in corso...', 'info');
}

/**
 * Dynamically shares the active standings view via WhatsApp
 */
export function shareStandingsWhatsApp(mode?: 'real' | 'merit'): void {
  let resolvedMode = mode;
  if (!resolvedMode && typeof document !== 'undefined') {
    const meritEl = document.getElementById('live-view-merit-container');
    resolvedMode = meritEl && !meritEl.classList.contains('hidden') ? 'merit' : 'real';
  }
  if (resolvedMode === 'merit') {
    shareMeritStandingsWhatsApp();
  } else {
    shareRealStandingsWhatsApp();
  }
}

let isExportingStandings = false;

/**
 * Captures the active standings view as HD PNG and downloads it
 */
export async function exportStandingsPNG(mode?: 'real' | 'merit'): Promise<void> {
  if (isExportingStandings) {
    showToast('Generazione classifica in corso...', 'info');
    return;
  }
  let resolvedMode = mode;
  if (!resolvedMode && typeof document !== 'undefined') {
    const meritEl = document.getElementById('live-view-merit-container');
    resolvedMode = meritEl && !meritEl.classList.contains('hidden') ? 'merit' : 'real';
  }
  isExportingStandings = true;
  showToast('Generazione Classifica HD in corso...', 'info');

  try {
    const { renderStandingsCanvas, downloadBlob } = await import('@/export/canvas');
    const canvas = await renderStandingsCanvas(resolvedMode || 'real');
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione dell'immagine", 'error');
        return;
      }
      const filename = `${LEAGUE.brand.name}_Classifica_${resolvedMode || 'reale'}_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Standings export failed:', err);
    showToast('Impossibile esportare la classifica', 'error');
  } finally {
    isExportingStandings = false;
  }
}

/**
 * Captures the active standings view as HD PNG and copies directly to clipboard
 */
export async function copyStandingsToClipboard(mode?: 'real' | 'merit'): Promise<boolean> {
  if (isExportingStandings) {
    showToast('Generazione classifica in corso...', 'info');
    return false;
  }
  let resolvedMode = mode;
  if (!resolvedMode && typeof document !== 'undefined') {
    const meritEl = document.getElementById('live-view-merit-container');
    resolvedMode = meritEl && !meritEl.classList.contains('hidden') ? 'merit' : 'real';
  }
  isExportingStandings = true;
  showToast('Generazione Classifica HD per WhatsApp...', 'info');

  try {
    const { renderStandingsCanvas, copyBlobToClipboard } = await import('@/export/canvas');
    const canvas = await renderStandingsCanvas(resolvedMode || 'real');
    return new Promise<boolean>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Errore durante la creazione dell'immagine", 'error');
          resolve(false);
          return;
        }
        const filename = `${LEAGUE.brand.name}_Classifica_${resolvedMode || 'reale'}_${Date.now()}.png`;
        const success = await copyBlobToClipboard(blob, filename);
        resolve(success);
      }, 'image/png');
    });
  } catch (err) {
    console.error('Standings copy failed:', err);
    showToast('Impossibile copiare la classifica negli appunti', 'error');
    return false;
  } finally {
    isExportingStandings = false;
  }
}

let isExportingTeamMatches = false;

/**
 * Captures the open team matches modal dialog as HD PNG and downloads it
 */
export async function exportTeamMatchesPNG(teamName?: string): Promise<void> {
  if (isExportingTeamMatches) {
    showToast('Generazione scheda in corso...', 'info');
    return;
  }
  const dialog = document.getElementById('team-matches-dialog');
  if (!dialog) {
    showToast('Scheda partite non trovata', 'error');
    return;
  }
  isExportingTeamMatches = true;
  showToast('Generazione Scheda Squadra HD in corso...', 'info');

  try {
    const { renderTeamMatchesModalCanvas, downloadBlob } = await import('@/export/canvas');
    const canvas = await renderTeamMatchesModalCanvas(dialog);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Errore durante la creazione dell'immagine", 'error');
        return;
      }
      const safeName = (teamName || 'Squadra').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${LEAGUE.brand.name}_${safeName}_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }, 'image/png');
  } catch (err) {
    console.error('Team matches export failed:', err);
    showToast('Impossibile esportare la scheda squadra', 'error');
  } finally {
    isExportingTeamMatches = false;
  }
}

/**
 * Captures the open team matches modal dialog as HD PNG and copies directly to clipboard
 */
export async function copyTeamMatchesToClipboard(teamName?: string): Promise<boolean> {
  if (isExportingTeamMatches) {
    showToast('Generazione scheda in corso...', 'info');
    return false;
  }
  const dialog = document.getElementById('team-matches-dialog');
  if (!dialog) {
    showToast('Scheda partite non trovata', 'error');
    return false;
  }
  isExportingTeamMatches = true;
  showToast('Generazione Scheda Squadra per WhatsApp...', 'info');

  try {
    const { renderTeamMatchesModalCanvas, copyBlobToClipboard } = await import('@/export/canvas');
    const canvas = await renderTeamMatchesModalCanvas(dialog);
    return new Promise<boolean>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Errore durante la creazione dell'immagine", 'error');
          resolve(false);
          return;
        }
        const safeName = (teamName || 'Squadra').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${LEAGUE.brand.name}_${safeName}_${Date.now()}.png`;
        const success = await copyBlobToClipboard(blob, filename);
        resolve(success);
      }, 'image/png');
    });
  } catch (err) {
    console.error('Team matches copy failed:', err);
    showToast('Impossibile copiare la scheda negli appunti', 'error');
    return false;
  } finally {
    isExportingTeamMatches = false;
  }
}

/**
 * Shares merit standings via Native Web Share API (mobile) or fallback
 */
export async function shareMeritStandingsNative(): Promise<void> {
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?tab=seasons&view=merit`
    : '';
  const standings = getLiveSeasonDetails()?.standings || [];
  const text = standings.length > 0
    ? buildMeritStandingsShareText(standings, shareUrl)
    : `⚖️ Guarda la Classifica di Merito (xPTS) aggiornata:\n${shareUrl}`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Classifica di Merito (xPTS) — ${LEAGUE.brand.name}`,
        text: text,
        url: shareUrl
      });
      showToast('Condiviso con successo!', 'success');
      return;
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
    }
  }
  copyMeritStandingsLink();
}

/**
 * Copies direct link to the merit standings view to clipboard
 */
export async function copyMeritStandingsLink(): Promise<void> {
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?tab=seasons&view=merit`
    : '';
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link classifica di merito copiato negli appunti!', 'success');
      return;
    } catch {
      // fallback
    }
  }
  showToast('Impossibile copiare il link', 'error');
}
