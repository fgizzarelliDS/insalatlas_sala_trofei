import { state } from '@/state';
import type { Manager, CompetitionRecord, LeagueRecord } from '@/types';
import { computeAllLeagueRecords } from '@/analytics/records';
import { getLeagueYearSpan } from '@/analytics/records/helpers';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import { renderNodeToCanvas } from './core';
import { LEAGUE, LEAGUE_SITE_HOST } from '@/config';

/**
 * Renders an all-in-one celebratory high-resolution Poster Infographic covering all official Hall of Fame records.
 * Uses html-to-image with an off-screen desktop layout (~1400px width) rendered at high pixel density.
 */
export async function renderHallOfFamePosterCanvas(
  managers?: Manager[],
  competitions?: CompetitionRecord[]
): Promise<HTMLCanvasElement> {
  const allManagers = managers || state.managers;
  const allCompetitions = competitions || state.competitions;
  const allRecords = computeAllLeagueRecords(allManagers, allCompetitions);

  const targetWidth = 1400;

  // Determine dynamic theme background
  const bodyBg = typeof document !== 'undefined' ? window.getComputedStyle(document.body).backgroundColor : '';
  const exportBg = (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent')
    ? bodyBg
    : (state.currentTheme === 'gazzetta' ? '#fce7ec' : state.currentTheme === 'studio' ? '#f1f5f9' : state.currentTheme === 'seriea' ? '#020b1c' : '#090d16');

  const poster = document.createElement('div');
  poster.id = `${LEAGUE.filePrefix}-hall-of-fame-poster`;
  poster.style.width = `${targetWidth}px`;
  poster.style.padding = '36px 40px';
  poster.style.boxSizing = 'border-box';
  poster.style.backgroundColor = exportBg;
  poster.style.color = 'var(--text-main, #f8fafc)';
  poster.style.fontFamily = "'Montserrat', 'Inter', system-ui, -apple-system, sans-serif";

  // Category Configuration
  const CATEGORIES = [
    {
      id: 'points',
      title: 'Punti & Podi',
      subtitle: 'Record assoluti di punteggio e media gara',
      icon: 'fa-solid fa-bolt',
      color: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeBorder: 'rgba(245, 158, 11, 0.35)'
    },
    {
      id: 'titles',
      title: 'Dominio & Coppe',
      subtitle: 'Scudetti, coppe e bacheche all-time',
      icon: 'fa-solid fa-trophy',
      color: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeBorder: 'rgba(16, 185, 129, 0.35)'
    },
    {
      id: 'h2h',
      title: 'Rivalità Head-to-Head',
      subtitle: 'Scontri diretti, nemesi e supremazie',
      icon: 'fa-solid fa-skull-crossbones',
      color: '#f43f5e',
      badgeBg: 'rgba(244, 63, 94, 0.15)',
      badgeBorder: 'rgba(244, 63, 94, 0.35)'
    },
    {
      id: 'streaks',
      title: 'Strisce & Fedeltà',
      subtitle: 'Continuità, presenze e serie storiche',
      icon: 'fa-solid fa-medal',
      color: '#6366f1',
      badgeBg: 'rgba(99, 102, 241, 0.15)',
      badgeBorder: 'rgba(99, 102, 241, 0.35)'
    },
    {
      id: 'banter',
      title: 'Disonori & Curiosità',
      subtitle: 'Cucchiai di legno, playout e bizzarrie statistiche',
      icon: 'fa-solid fa-masks-theater',
      color: '#38bdf8',
      badgeBg: 'rgba(56, 189, 248, 0.15)',
      badgeBorder: 'rgba(56, 189, 248, 0.35)'
    }
  ];

  function renderCardHTML(r: LeagueRecord, catColor: string, isFullSpan = false): string {
    const holders = r.primaryHolders && r.primaryHolders.length > 0
      ? r.primaryHolders
      : (r.primaryHolder ? [r.primaryHolder] : []);

    const isTie = holders.length > 1;
    const primary = holders[0] || {
      managerName: 'Sconosciuto',
      value: 0,
      formattedValue: '-'
    };

    const logoUrl = primary.logo || (primary.teamName ? resolveTeamLogo(primary.teamName) : getTeamFallbackCrest(primary.teamName || 'Team'));
    const fallbackCrest = primary.fallbackCrest || getTeamFallbackCrest(primary.teamName || 'Team');

    let holderHTML = '';
    if (isTie) {
      const names = holders.map(h => `${h.managerName}${h.season ? ` (${h.season})` : ''}`).join(' • ');
      holderHTML = `
        <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
          <div style="display: flex; align-items: center; margin-right: -4px; shrink: 0;">
            ${holders.slice(0, 2).map((h, i) => {
              const hLogo = h.logo || (h.teamName ? resolveTeamLogo(h.teamName) : getTeamFallbackCrest(h.teamName || 'Team'));
              return `<img src="${hLogo}" alt="" style="width: 26px; height: 26px; border-radius: 9999px; object-fit: contain; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); margin-left: ${i > 0 ? '-10px' : '0'}; z-index: ${2 - i};" onerror="this.onerror=null; this.src='${getTeamFallbackCrest(h.teamName || 'Team')}';" />`;
            }).join('')}
          </div>
          <div style="min-width: 0;">
            <div style="font-weight: 800; font-size: 11px; color: var(--text-main, #f8fafc); line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${names}
            </div>
            <div style="font-size: 9px; font-weight: 700; color: var(--accent-color, #f59e0b); text-transform: uppercase; letter-spacing: 0.04em;">
              🤝 Co-Primatisti (${holders.length})
            </div>
          </div>
        </div>
      `;
    } else {
      const detail = primary.normalizedDetail || primary.detail || '';
      holderHTML = `
        <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
          <img src="${logoUrl}" alt="${primary.managerName}"
            style="width: 28px; height: 28px; border-radius: 9999px; object-fit: contain; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); flex-shrink: 0;"
            onerror="this.onerror=null; this.src='${fallbackCrest}';" />
          <div style="min-width: 0;">
            <div style="font-weight: 800; font-size: 12px; color: var(--text-main, #f8fafc); line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${primary.managerName}
            </div>
            <div style="font-size: 10px; color: var(--text-muted, #94a3b8); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${detail || (primary.teamName || '')}
            </div>
          </div>
        </div>
      `;
    }

    const seasonBadge = primary.season ? `
      <span style="font-family: monospace; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 6px; border: 1px solid var(--table-border, rgba(255,255,255,0.1)); background: rgba(0,0,0,0.2); color: var(--text-muted, #94a3b8); white-space: nowrap;">
        ${primary.season}
      </span>
    ` : '';

    const spanStyle = isFullSpan ? 'grid-column: span 2;' : '';

    return `
      <div style="background-color: var(--table-surface, rgba(15, 23, 42, 0.75)); border: 1px solid var(--table-border, rgba(51, 65, 85, 0.5)); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; min-height: 108px; box-sizing: border-box; ${spanStyle}">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 7px; min-width: 0;">
            <i class="${r.icon}" style="color: ${catColor}; font-size: 13px; flex-shrink: 0;"></i>
            <span style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-main, #f8fafc); line-height: 1.25; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
              ${r.title}
            </span>
          </div>
          ${seasonBadge}
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto;">
          ${holderHTML}
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 16px; color: ${catColor}; line-height: 1.1; letter-spacing: -0.02em;">
              ${primary.formattedValue}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderCategoryBox(catId: string, columns = 2): string {
    const cat = CATEGORIES.find(c => c.id === catId)!;
    const catRecords = allRecords.filter(r => r.category === cat.id);

    const cardsHTML = catRecords.map((r, idx) => {
      // If 5 records in a 2-column grid, make the 5th card full width span
      const isFull = (catRecords.length === 5 && idx === 4);
      return renderCardHTML(r, cat.color, isFull);
    }).join('');

    const gridStyle = columns === 3
      ? 'display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px;'
      : 'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;';

    return `
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--table-border, rgba(51, 65, 85, 0.45)); border-radius: 20px; padding: 18px; box-sizing: border-box;">
        <!-- Category Section Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--table-border, rgba(51, 65, 85, 0.35));">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 10px; background-color: ${cat.badgeBg}; border: 1.5px solid ${cat.badgeBorder}; display: flex; align-items: center; justify-content: center; color: ${cat.color}; font-size: 14px;">
              <i class="${cat.icon}"></i>
            </div>
            <div>
              <h3 style="font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; margin: 0; color: var(--text-main, #f8fafc); line-height: 1.2;">
                ${cat.title}
              </h3>
              <p style="font-size: 11px; margin: 2px 0 0 0; color: var(--text-muted, #94a3b8); font-weight: 500;">
                ${cat.subtitle}
              </p>
            </div>
          </div>
          <span style="font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 8px; background-color: ${cat.badgeBg}; border: 1px solid ${cat.badgeBorder}; color: ${cat.color};">
            ${catRecords.length} Record
          </span>
        </div>

        <!-- Cards Subgrid -->
        <div style="${gridStyle}">
          ${cardsHTML}
        </div>
      </div>
    `;
  }

  const leagueSpan = getLeagueYearSpan(allCompetitions);

  poster.innerHTML = `
    <!-- Poster Top Championship Banner -->
    <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1.5px solid var(--table-border, rgba(51, 65, 85, 0.5));">
      <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 8px;">
        <img src="favicon-64x64.png" alt="${LEAGUE.brand.name}" style="width: 58px; height: 58px; object-fit: contain; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.3); border: 2px solid rgba(245, 158, 11, 0.4);" />
        <div style="text-align: left;">
          <div style="font-size: 12px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; color: var(--accent-color, #f59e0b);">
            ${LEAGUE.brand.championshipLabel || LEAGUE.brand.name} • ${LEAGUE.brand.mainTitle} Ufficiale
          </div>
          <h1 style="font-size: 30px; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase; margin: 2px 0 0 0; color: var(--text-main, #f8fafc); line-height: 1.15;">
            Hall of Fame • I Primati &amp; I Record All-Time
          </h1>
        </div>
      </div>
      <p style="font-size: 12px; font-weight: 500; color: var(--text-muted, #94a3b8); margin: 6px auto 14px auto; max-width: 820px; line-height: 1.4;">
        I numeri epici, le dominazioni assolute, i duelli infuocati e le sventure memorabili che hanno scritto la leggenda del Fantacalcio (${leagueSpan.spanText}).
      </p>

      <!-- 4 Badges Counters Bar -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap;">
        <div style="padding: 5px 14px; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.35); background: rgba(245, 158, 11, 0.12); color: #fbbf24; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-medal"></i>
          <span>${allRecords.length} Record Certificati</span>
        </div>
        <div style="padding: 5px 14px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.35); background: rgba(16, 185, 129, 0.12); color: #34d399; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-layer-group"></i>
          <span>5 Categorie Storiche</span>
        </div>
        <div style="padding: 5px 14px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.35); background: rgba(56, 189, 248, 0.12); color: #38bdf8; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-calendar-days"></i>
          <span>${leagueSpan.completedCount} Campionati (${leagueSpan.spanText})</span>
        </div>
        <div style="padding: 5px 14px; border-radius: 12px; border: 1px solid rgba(168, 85, 247, 0.35); background: rgba(168, 85, 247, 0.12); color: #c084fc; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-users"></i>
          <span>${allManagers.length} Fantallenatori</span>
        </div>
      </div>
    </div>

    <!-- Row 1: Punti & Podi + Dominio & Coppe -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
      ${renderCategoryBox('points')}
      ${renderCategoryBox('titles')}
    </div>

    <!-- Row 2: Rivalità H2H + Strisce & Fedeltà -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
      ${renderCategoryBox('h2h')}
      ${renderCategoryBox('streaks')}
    </div>

    <!-- Row 3: Disonori & Curiosità (Full Width, 3 Columns) -->
    <div style="margin-bottom: 24px;">
      ${renderCategoryBox('banter', 3)}
    </div>

    <!-- Poster Official Closing Footer -->
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 18px; border-top: 1.5px solid var(--table-border, rgba(51, 65, 85, 0.5)); font-size: 11px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="favicon-64x64.png" alt="${LEAGUE.brand.name}" style="width: 20px; height: 20px; object-fit: contain; border-radius: 9999px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" />
        <span style="font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-main, #f8fafc);">
          ${LEAGUE.brand.name} • ${LEAGUE.brand.mainTitle} &amp; Archivio Storico
        </span>
        <span style="opacity: 0.4;">•</span>
        <span style="color: var(--accent-color, #f59e0b); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
          ${LEAGUE.brand.championshipLabel || LEAGUE.brand.name} Ufficiale
        </span>
      </div>
      <div style="font-family: monospace; font-size: 10px; opacity: 0.75; color: var(--text-muted, #94a3b8);">
        ${LEAGUE_SITE_HOST} • ${leagueSpan.spanText}
      </div>
    </div>
  `;

  return renderNodeToCanvas(poster, targetWidth, exportBg, 2.2);
}
