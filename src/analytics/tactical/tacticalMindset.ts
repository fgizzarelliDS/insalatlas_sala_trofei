/**
 * src/analytics/tactical/tacticalMindset.ts
 * Live Seasonal Mindset & Momentum Evaluation Engine 
 */

import type { Manager } from '@/types';
import { getLiveSeasonDetails } from '@/state';
import type { SeasonalMindset } from './types';

export function computeSeasonalMindset(
  manager: Manager,
  liveData = getLiveSeasonDetails()
): SeasonalMindset {
  if (!liveData || !liveData.standings || liveData.standings.length === 0) {
    return {
      isActive: false,
      pill: '🏛️ ARCHIVIO STORICO',
      desc: `Manager con ${manager.years} ${manager.years === 1 ? 'stagione disputata' : 'stagioni disputate'} nella storia di lega.`,
      momentum: '-',
      luckDelta: '-',
      icon: 'fa-landmark'
    };
  }

  const standing = liveData.standings.find(
    s => s.managerId === manager.id || s.coach?.toLowerCase() === manager.name?.toLowerCase()
  );

  if (!standing) {
    return {
      isActive: false,
      pill: '🏛️ ARCHIVIO STORICO',
      desc: `Manager non attivo nella stagione in corso (${manager.years} campionati disputati).`,
      momentum: '-',
      luckDelta: '-',
      icon: 'fa-landmark'
    };
  }

  // Calculate Momentum L5 from recentForm
  const recentForm = standing.recentForm || [];
  let momentumVal = 0.50;
  if (recentForm.length > 0) {
    const l5 = recentForm.slice(-5);
    const pts = l5.reduce((acc, r) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
    momentumVal = parseFloat((pts / (l5.length * 3)).toFixed(2));
  }
  const momentumStr = `${momentumVal.toFixed(2)} / 1.00`;

  // Calculate Delta Luck
  const points = standing.points ?? 0;
  const xPts = standing.scheduleLuck?.xPoints ?? points;
  const deltaLuck = parseFloat((points - xPts).toFixed(1));
  const deltaLuckStr = `${deltaLuck >= 0 ? '+' : ''}${deltaLuck} pt`;

  // Evaluate Mindset State
  const lastThreeWins = recentForm.slice(-3).filter(r => r === 'W').length >= 3;
  const lastMatchWon = recentForm.length > 0 && recentForm[recentForm.length - 1] === 'W';
  const previousTwoLost = recentForm.length >= 3 && recentForm[recentForm.length - 2] === 'L' && recentForm[recentForm.length - 3] === 'L';

  if (standing.rank <= 3 && deltaLuck >= 3.5) {
    return {
      isActive: true,
      pill: "⚖️ SINDROME DELL'IMPOSTORE",
      desc: `In vetta alla classifica con marcato overperforming da calendario (${deltaLuckStr} vs xPTS).`,
      momentum: momentumStr,
      luckDelta: deltaLuckStr,
      icon: 'fa-scale-balanced'
    };
  }

  if (momentumVal >= 0.70 || lastThreeWins) {
    return {
      isActive: true,
      pill: '🔥 IN TRANCE AGONISTICA',
      desc: `Passo da schiacciasassi nelle ultime giornate (${deltaLuckStr} ΔLuck), ritmo vertiginoso.`,
      momentum: momentumStr,
      luckDelta: deltaLuckStr,
      icon: 'fa-fire'
    };
  }

  if (lastMatchWon && previousTwoLost) {
    return {
      isActive: true,
      pill: '⚡ RESURREZIONE IMPROVVISA',
      desc: `Squillante ritorno alla vittoria nell'ultimo turno dopo un passaggio a vuoto.`,
      momentum: momentumStr,
      luckDelta: deltaLuckStr,
      icon: 'fa-bolt'
    };
  }

  if (standing.rank >= liveData.standings.length - 2 || momentumVal < 0.25) {
    return {
      isActive: true,
      pill: '🧊 CRISI DI NERVI',
      desc: `Fase critica di risultati (${deltaLuckStr} ΔLuck), necessario un cambio di marcia immediato.`,
      momentum: momentumStr,
      luckDelta: deltaLuckStr,
      icon: 'fa-snowflake'
    };
  }

  return {
    isActive: true,
    pill: '🎯 PAZIENZA MONASTICA',
    desc: `Rendimento solido e baricentro costante, in attesa del momento giusto per colpire.`,
    momentum: momentumStr,
    luckDelta: deltaLuckStr,
    icon: 'fa-bullseye'
  };
}
