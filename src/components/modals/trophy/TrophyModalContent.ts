import type { CompetitionRecord, Manager, CompetitionDefinition } from '@/types';
import { resolveTeamLogo, getTeamFallbackCrest } from '@/crests';
import type { CupSubTab, TrophyEditionParticipant } from './TrophyModalTypes';

/**
 * Helper to resolve participant details from ranking item and managers list
 */
function buildParticipant(
  managerId: string | undefined,
  coachName: string | undefined,
  teamName: string | undefined,
  points: number | null | undefined,
  rawLogo: string | undefined,
  managers: Manager[]
): TrophyEditionParticipant {
  const resolvedManager = managerId ? managers.find(m => m.id === managerId) : undefined;
  const managerName = resolvedManager?.name || coachName || 'Sconosciuto';
  const cleanTeam = teamName || '';
  const logo = resolveTeamLogo(cleanTeam, rawLogo);
  const fallbackCrest = getTeamFallbackCrest(cleanTeam);

  return {
    managerId: resolvedManager?.id || managerId,
    managerName,
    teamName: cleanTeam,
    points,
    logo,
    fallbackCrest
  };
}

/**
 * Renders a single participant row within a podium or finals block
 */
function renderParticipantRow(
  p: TrophyEditionParticipant,
  badgeText: string,
  badgeClasses: string,
  extraDetail?: string,
  showPoints: boolean = true
): string {
  const cardClick = p.managerId
    ? `onclick="window.openProfileModal && window.openProfileModal('${p.managerId}');"`
    : '';
  const cardCursor = p.managerId ? 'cursor-pointer hover:border-amber-500/40 hover:scale-[1.005]' : '';
  const cardTitle = p.managerId ? `title="Apri scheda profilo di ${p.managerName}"` : '';

  const pointsHTML = (showPoints && p.points !== null && p.points !== undefined)
    ? `<span class="font-mono font-bold text-xs sm:text-sm" style="color: var(--accent-color);">${p.points} <span class="text-[9px] font-normal opacity-70">pt</span></span>`
    : '';

  return `
    <div ${cardClick} ${cardTitle} class="p-2 sm:p-2.5 rounded-xl border transition min-w-0 ${cardCursor}"
      style="background-color: var(--input-bg, rgba(255,255,255,0.02)); border-color: var(--table-border);">
      
      <!-- MOBILE VIEW (< sm): Sleek compact row with manager and team name stacked next to crest -->
      <div class="flex sm:hidden items-center justify-between gap-2 w-full min-w-0">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0 ${badgeClasses}">
            ${badgeText}
          </span>
          <img src="${p.logo || p.fallbackCrest}" alt="${p.teamName}"
            class="w-7 h-7 rounded-full object-contain shrink-0 border border-white/10 bg-white/5"
            onerror="this.onerror=null; this.src='${p.fallbackCrest}';" />
          <div class="min-w-0 flex-1">
            <div class="font-bold text-xs leading-tight" style="color: var(--text-main);">
              ${p.managerName}
            </div>
            <div class="text-[10px] leading-tight opacity-75 truncate" style="color: var(--text-muted);">
              ${p.teamName || 'Squadra non specificata'}
            </div>
          </div>
        </div>

        <div class="text-right shrink-0">
          ${pointsHTML}
          ${extraDetail ? `<div class="text-[10px] font-semibold opacity-70" style="color: var(--text-muted);">${extraDetail}</div>` : ''}
        </div>
      </div>

      <!-- DESKTOP VIEW (sm: >= 640px): Standard side-by-side grid card -->
      <div class="hidden sm:flex items-center justify-between gap-3 min-w-0 w-full">
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${badgeClasses}">
            ${badgeText}
          </span>
          <img src="${p.logo || p.fallbackCrest}" alt="${p.teamName}"
            class="w-8 h-8 rounded-full object-contain shrink-0 border border-white/10 bg-white/5"
            onerror="this.onerror=null; this.src='${p.fallbackCrest}';" />
          <div class="min-w-0 flex-1">
            <div class="font-bold text-xs sm:text-sm" style="color: var(--text-main);">
              ${p.managerName}
            </div>
            <div class="text-[10px] sm:text-[11px] opacity-75 truncate" style="color: var(--text-muted);">
              ${p.teamName || 'Squadra non specificata'}
            </div>
          </div>
        </div>
        <div class="text-right shrink-0">
          ${pointsHTML}
          ${extraDetail ? `<div class="text-[10px] font-semibold opacity-70" style="color: var(--text-muted);">${extraDetail}</div>` : ''}
        </div>
      </div>

    </div>
  `;
}

/**
 * Renders a podium placement card for Scudetti roll of honor (compact, vertical-stacked badge & logo)
 */
function renderPodiumCard(
  p: TrophyEditionParticipant,
  badgeText: string,
  badgeClasses: string
): string {
  const cardClick = p.managerId
    ? `onclick="window.openProfileModal && window.openProfileModal('${p.managerId}');"`
    : '';
  const cardCursor = p.managerId ? 'cursor-pointer hover:border-amber-500/40 hover:scale-[1.01]' : '';
  const cardTitle = p.managerId ? `title="Apri scheda profilo di ${p.managerName}"` : '';

  const pointsHTML = (p.points !== null && p.points !== undefined)
    ? `<span class="font-mono font-bold text-xs sm:text-sm" style="color: var(--accent-color);">${p.points} <span class="text-[9px] font-normal opacity-70">pt</span></span>`
    : '';

  return `
    <div ${cardClick} ${cardTitle} class="p-2.5 sm:p-3 rounded-xl border transition min-w-0 ${cardCursor}"
      style="background-color: var(--input-bg, rgba(255,255,255,0.02)); border-color: var(--table-border);">
      
      <!-- MOBILE VIEW (< sm): Sleek compact row with manager and team name stacked next to crest -->
      <div class="flex sm:hidden items-center justify-between gap-2 w-full min-w-0">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0 ${badgeClasses}">
            ${badgeText}
          </span>
          <img src="${p.logo || p.fallbackCrest}" alt="${p.teamName}"
            class="w-7 h-7 rounded-full object-contain shrink-0 border border-white/10 bg-white/5"
            onerror="this.onerror=null; this.src='${p.fallbackCrest}';" />
          <div class="min-w-0 flex-1">
            <div class="font-bold text-xs leading-tight" style="color: var(--text-main);">
              ${p.managerName}
            </div>
            <div class="text-[10px] leading-tight opacity-75 truncate" style="color: var(--text-muted);">
              ${p.teamName || 'Squadra non specificata'}
            </div>
          </div>
        </div>
        
        <div class="text-right shrink-0">
          ${pointsHTML}
        </div>
      </div>

      <!-- DESKTOP VIEW (sm: >= 640px): Exact approved layout preserved -->
      <div class="hidden sm:flex flex-col justify-between gap-2 w-full h-full">
        <div class="flex items-center justify-between gap-1 w-full">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${badgeClasses}">
            ${badgeText}
          </span>
          ${pointsHTML}
        </div>
        <div class="flex items-center gap-2.5 min-w-0 w-full pt-0.5">
          <img src="${p.logo || p.fallbackCrest}" alt="${p.teamName}"
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-contain shrink-0 border border-white/10 bg-white/5"
            onerror="this.onerror=null; this.src='${p.fallbackCrest}';" />
          <div class="min-w-0 flex-1">
            <div class="font-bold text-xs sm:text-sm" style="color: var(--text-main);">
              ${p.managerName}
            </div>
            <div class="text-[10px] sm:text-[11px] opacity-75 truncate" style="color: var(--text-muted);">
              ${p.teamName || 'Squadra non specificata'}
            </div>
          </div>
        </div>
      </div>

    </div>
  `;
}

/**
 * 1. Scudetti: Podio Completo (1°, 2°, 3°) anno per anno (solo campionati conclusi)
 */
export function renderScudettiRollHTML(competitions: CompetitionRecord[], managers: Manager[]): string {
  const champs = (competitions || [])
    .filter(c => !c.in_progress && c.status !== 'in_progress' && (c.category === 'Campionato' || (c.name && c.name.toLowerCase().includes('serie'))))
    .sort((a, b) => (b.season || '').localeCompare(a.season || ''));

  if (champs.length === 0) {
    return `<div class="text-center py-8 text-xs opacity-60">Nessun campionato concluso in archivio.</div>`;
  }

  return champs.map(c => {
    const rank1 = (c.ranking || []).find(r => r.rank === 1);
    const rank2 = (c.ranking || []).find(r => r.rank === 2);
    const rank3 = (c.ranking || []).find(r => r.rank === 3);

    const p1 = rank1 ? buildParticipant(rank1.managerId, rank1.coach, rank1.teamName, rank1.points, rank1.logo, managers) : undefined;
    const p2 = rank2 ? buildParticipant(rank2.managerId, rank2.coach, rank2.teamName, rank2.points, rank2.logo, managers) : undefined;
    const p3 = rank3 ? buildParticipant(rank3.managerId, rank3.coach, rank3.teamName, rank3.points, rank3.logo, managers) : undefined;

    return `
      <div class="p-3.5 sm:p-4 rounded-2xl border space-y-2.5 transition"
        style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between gap-2 border-b pb-2" style="border-color: var(--table-border);">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md border text-amber-400 bg-amber-500/10 border-amber-500/30">
              ${c.season}
            </span>
            <span class="text-xs font-bold" style="color: var(--text-main);">${c.name}</span>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="window.navigateToSeasonStandings && window.navigateToSeasonStandings('${c.season}')"
              class="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer">
              <span>Classifica</span>
              <i class="fa-solid fa-arrow-right text-[8px]"></i>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          ${p1 ? renderPodiumCard(p1, '🥇 Campione', 'bg-amber-500/20 text-amber-300 border border-amber-500/40') : ''}
          ${p2 ? renderPodiumCard(p2, '🥈 2° Posto', 'bg-slate-400/20 text-slate-300 border border-slate-400/30') : ''}
          ${p3 ? renderPodiumCard(p3, '🥉 3° Posto', 'bg-amber-800/20 text-amber-600 border border-amber-800/30') : ''}
          ${(!p1 && !p2 && !p3) ? `<div class="text-[11px] text-center py-2 opacity-60 col-span-full">Dati podio non registrati.</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 2. Coppe & Supercoppe: Finali Vincitore vs Runner-up (solo edizioni concluse)
 */
export function renderCupsContent(
  subTab: CupSubTab,
  competitions: CompetitionRecord[],
  managers: Manager[]
): string {
  const targetCategory = subTab === 'coppa' ? 'Coppa' : 'Supercoppa';
  const targetComps = (competitions || [])
    .filter(c => {
      if (c.in_progress || c.status === 'in_progress') return false;
      if (subTab === 'coppa') {
        if (c.category === 'Coppa') return true;
        const name = (c.name || '').toLowerCase();
        return name.includes('coppa') && !name.includes('supercoppa') && !name.includes('perdenti') && c.category !== 'Perdenti' && c.category !== 'Supercoppa';
      } else {
        if (c.category === 'Supercoppa') return true;
        const name = (c.name || '').toLowerCase();
        return name.includes('supercoppa');
      }
    })
    .sort((a, b) => (b.season || '').localeCompare(a.season || ''));

  if (targetComps.length === 0) {
    return `<div class="text-center py-8 text-xs opacity-60">Nessuna edizione conclusa di ${targetCategory} registrata.</div>`;
  }

  return targetComps.map(c => {
    const rank1 = (c.ranking || []).find(r => r.rank === 1);
    const rank2 = (c.ranking || []).find(r => r.rank === 2);

    const winner = rank1 ? buildParticipant(rank1.managerId, rank1.coach, rank1.teamName, rank1.points, rank1.logo, managers) : undefined;
    const runnerUp = rank2 ? buildParticipant(rank2.managerId, rank2.coach, rank2.teamName, rank2.points, rank2.logo, managers) : undefined;

    return `
      <div class="p-3.5 sm:p-4 rounded-2xl border space-y-2.5 transition"
        style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between gap-2 border-b pb-2" style="border-color: var(--table-border);">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md border text-amber-400 bg-amber-500/10 border-amber-500/30">
              ${c.season}
            </span>
            <span class="text-xs font-bold" style="color: var(--text-main);">${c.name}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${winner ? renderParticipantRow(winner, '🏆 Vincitore', 'bg-amber-500/20 text-amber-300 border border-amber-500/40', undefined, false) : ''}
          ${runnerUp ? renderParticipantRow(runnerUp, '🥈 Finalista', 'bg-slate-400/20 text-slate-300 border border-slate-400/30', undefined, false) : ''}
          ${(!winner && !runnerUp) ? `<div class="text-[11px] text-center py-2 opacity-60 col-span-full">Finale non disputata.</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 3. Mundialito: Albo d'Oro delle edizioni (solo edizioni concluse)
 */
export function renderMundialitoContent(competitions: CompetitionRecord[], managers: Manager[]): string {
  const mundialitoComps = (competitions || [])
    .filter(c => !c.in_progress && c.status !== 'in_progress' && (c.category === 'Mundialito' || (c.name && c.name.toLowerCase().includes('mundialito'))))
    .sort((a, b) => (b.season || '').localeCompare(a.season || ''));

  if (mundialitoComps.length === 0) {
    return `<div class="text-center py-8 text-xs opacity-60">Nessuna edizione conclusa del Mundialito registrata.</div>`;
  }

  return mundialitoComps.map(c => {
    const rank1 = (c.ranking || []).find(r => r.rank === 1);
    const rank2 = (c.ranking || []).find(r => r.rank === 2);

    const winner = rank1 ? buildParticipant(rank1.managerId, rank1.coach, rank1.teamName, rank1.points, rank1.logo, managers) : undefined;
    const runnerUp = rank2 ? buildParticipant(rank2.managerId, rank2.coach, rank2.teamName, rank2.points, rank2.logo, managers) : undefined;

    return `
      <div class="p-3.5 sm:p-4 rounded-2xl border space-y-2.5 transition"
        style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between gap-2 border-b pb-2" style="border-color: var(--table-border);">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md border text-amber-400 bg-amber-500/10 border-amber-500/30">
              ${c.season}
            </span>
            <span class="text-xs font-bold" style="color: var(--text-main);">${c.name}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${winner ? renderParticipantRow(winner, '🌍 Vincitore', 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40', undefined, false) : ''}
          ${runnerUp ? renderParticipantRow(runnerUp, '🥈 Finalista', 'bg-slate-400/20 text-slate-300 border border-slate-400/30', undefined, false) : ''}
          ${(!winner && !runnerUp) ? `<div class="text-[11px] text-center py-2 opacity-60 col-span-full">Dati finalisti non registrati.</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}


/**
 * 4. Cucchiai di Legno: Muro del Disonore (Ultimi Posti)
 */
export function renderSpoonsContent(competitions: CompetitionRecord[], managers: Manager[]): string {
  const champs = (competitions || [])
    .filter(c => !c.in_progress && c.status !== 'in_progress' && (c.category === 'Campionato' || (c.name && c.name.toLowerCase().includes('serie'))))
    .sort((a, b) => (b.season || '').localeCompare(a.season || ''));

  return champs.map(c => {
    // Find the last place ranking item
    const validRanks = (c.ranking || []).filter(r => r.rank !== null && r.rank !== undefined && r.rank > 0);
    const maxRank = validRanks.length > 0 ? Math.max(...validRanks.map(r => r.rank!)) : 0;
    const lastItem = validRanks.find(r => r.rank === maxRank);

    const participant = lastItem
      ? buildParticipant(lastItem.managerId, lastItem.coach, lastItem.teamName, lastItem.points, lastItem.logo, managers)
      : undefined;

    return `
      <div class="p-3.5 sm:p-4 rounded-2xl border space-y-2.5 transition"
        style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between gap-2 border-b pb-2" style="border-color: var(--table-border);">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md border text-rose-400 bg-rose-500/10 border-rose-500/30">
              ${c.season}
            </span>
            <span class="text-xs font-bold" style="color: var(--text-main);">${c.name} (${validRanks.length} squadre)</span>
          </div>
          <button type="button" onclick="window.navigateToSeasonStandings && window.navigateToSeasonStandings('${c.season}')"
            class="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer">
            <span>Classifica</span>
            <i class="fa-solid fa-arrow-right text-[8px]"></i>
          </button>
        </div>

        <div class="space-y-1.5">
          ${participant
        ? renderParticipantRow(participant, `🥄 #${maxRank}° Cucchiaio`, 'bg-rose-500/20 text-rose-400 border border-rose-500/40', undefined, false)
        : `<div class="text-[11px] text-center py-2 opacity-60">Dato non disponibile.</div>`}
        </div>
      </div>
    `;
  }).filter(Boolean).join('');
}

/**
 * 5. Banner Cartonato: Playout / Coppa dei Perdenti
 */
export function renderCartonatoContent(competitions: CompetitionRecord[], managers: Manager[]): string {
  // Extract all cartonati from manager records
  const cartonatiEntries: { managerName: string; managerId: string; coachName: string; count: number }[] = [];

  managers.forEach(m => {
    const banners = m.coach_banners || m.cartonato_coaches || [];
    if (banners.length > 0) {
      banners.forEach(b => {
        cartonatiEntries.push({
          managerName: m.name,
          managerId: m.id,
          coachName: b,
          count: m.cartonato || banners.length
        });
      });
    } else if (m.cartonato && m.cartonato > 0) {
      cartonatiEntries.push({
        managerName: m.name,
        managerId: m.id,
        coachName: m.name,
        count: m.cartonato
      });
    }
  });

  // Also check "Perdenti" competitions (only completed)
  const perdentiComps = (competitions || [])
    .filter(c => !c.in_progress && c.status !== 'in_progress' && (c.category === 'Perdenti' || (c.name && c.name.toLowerCase().includes('perdenti'))))
    .sort((a, b) => (b.season || '').localeCompare(a.season || ''));

  const compCardsHTML = perdentiComps.map(c => {
    const winnerRank = (c.ranking || []).find(r => r.rank === 1);
    const p = winnerRank ? buildParticipant(winnerRank.managerId, winnerRank.coach, winnerRank.teamName, winnerRank.points, winnerRank.logo, managers) : undefined;

    return `
      <div class="p-3.5 sm:p-4 rounded-2xl border space-y-2.5 transition"
        style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between gap-2 border-b pb-2" style="border-color: var(--table-border);">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md border text-blue-400 bg-blue-500/10 border-blue-500/30">
              ${c.season}
            </span>
            <span class="text-xs font-bold" style="color: var(--text-main);">${c.name}</span>
          </div>
        </div>

        <div class="space-y-1.5">
          ${p ? renderParticipantRow(p, '📦 Cartonato Playout', 'bg-blue-600/20 text-blue-300 border border-blue-500/40', undefined, false) : `<div class="text-[11px] text-center py-2 opacity-60">Dato non registrato.</div>`}
        </div>
      </div>
    `;
  }).join('');


  const bannersSummaryHTML = `
    <div class="p-3.5 rounded-2xl border space-y-2 mb-3" style="background-color: var(--input-bg); border-color: var(--table-border);">
      <div class="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
        <i class="fa-solid fa-tag"></i>
        <span>Coach con Banner Cartonato Ufficiale</span>
      </div>
      <div class="flex flex-wrap gap-2 pt-1">
        ${cartonatiEntries.map(e => `
          <button type="button" onclick="window.openProfileModal && window.openProfileModal('${e.managerId}')"
            class="px-2.5 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer"
            style="background-color: var(--table-surface); border-color: var(--table-border); color: var(--text-main);">
            <span>📦</span>
            <span class="font-extrabold">${e.coachName}</span>
            <span class="text-[10px] opacity-60 font-normal">(${e.managerName})</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  return `${bannersSummaryHTML}${compCardsHTML}`;
}

/**
 * 6. Stagioni: Quadro generale di tutte le edizioni
 */
export function renderSeasonsOverviewRollHTML(competitions: CompetitionRecord[], managers: Manager[]): string {
  // Collect all distinct seasons
  const allSeasons = Array.from(new Set((competitions || []).map(c => c.season).filter(Boolean)))
    .sort((a, b) => b.localeCompare(a));

  return allSeasons.map(s => {
    const seasonComps = (competitions || []).filter(c => c.season === s);
    const champ = seasonComps.find(c => c.category === 'Campionato' || (c.name && c.name.toLowerCase().includes('serie')));
    const cup = seasonComps.find(c => c.category === 'Coppa' || (c.name && c.name.toLowerCase().includes('coppa') && !c.name.toLowerCase().includes('supercoppa') && !c.name.toLowerCase().includes('perdenti') && c.category !== 'Perdenti' && c.category !== 'Supercoppa'));
    const supercup = seasonComps.find(c => c.category === 'Supercoppa' || (c.name && c.name.toLowerCase().includes('supercoppa')));
    const mundialito = seasonComps.find(c => c.category === 'Mundialito' || (c.name && c.name.toLowerCase().includes('mundialito')));

    const isCurrent = seasonComps.some(c => c.in_progress || c.status === 'in_progress');

    const isChampDone = Boolean(champ && !champ.in_progress && champ.status !== 'in_progress');
    const isCupDone = Boolean(cup && !cup.in_progress && cup.status !== 'in_progress');
    const isSupercupDone = Boolean(supercup && !supercup.in_progress && supercup.status !== 'in_progress');
    const isMundialitoDone = Boolean(mundialito && !mundialito.in_progress && mundialito.status !== 'in_progress');

    const champWinner = isChampDone ? champ?.ranking?.find(r => r.rank === 1) : undefined;
    const cupWinner = isCupDone ? cup?.ranking?.find(r => r.rank === 1) : undefined;
    const supercupWinner = isSupercupDone ? supercup?.ranking?.find(r => r.rank === 1) : undefined;
    const mundialitoWinner = isMundialitoDone ? mundialito?.ranking?.find(r => r.rank === 1) : undefined;

    const renderMiniWinnerCard = (icon: string, label: string, r?: { managerId?: string; coach?: string }) => {
      if (!r) {
        return `
          <div class="p-2 rounded-xl border flex flex-col justify-between" style="background-color: var(--input-bg); border-color: var(--table-border);">
            <span class="text-[9px] uppercase tracking-wider font-extrabold opacity-60 flex items-center gap-1" style="color: var(--text-muted);">
              <span>${icon}</span> ${label}
            </span>
            <span class="font-bold truncate mt-1 opacity-50" style="color: var(--text-main);">-</span>
          </div>
        `;
      }
      const m = r.managerId ? managers.find(mgr => mgr.id === r.managerId) : undefined;
      const name = m?.name || r.coach || 'Sconosciuto';
      const mId = m?.id || r.managerId;
      const click = mId ? `onclick="window.openProfileModal && window.openProfileModal('${mId}');" class="p-2 rounded-xl border flex flex-col justify-between cursor-pointer hover:border-amber-500/40 hover:scale-[1.01] transition"` : `class="p-2 rounded-xl border flex flex-col justify-between"`;
      const title = mId ? `title="Apri scheda di ${name}"` : '';

      return `
        <div ${click} ${title} style="background-color: var(--input-bg); border-color: var(--table-border);">
          <span class="text-[9px] uppercase tracking-wider font-extrabold opacity-60 flex items-center gap-1" style="color: var(--text-muted);">
            <span>${icon}</span> ${label}
          </span>
          <span class="font-bold truncate mt-1 ${mId ? 'hover:underline hover:text-amber-400' : ''}" style="color: var(--text-main);">${name}</span>
        </div>
      `;
    };

    return `
      <div class="p-3.5 sm:p-4 rounded-2xl border space-y-2.5 transition"
        style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between gap-2 border-b pb-2" style="border-color: var(--table-border);">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-black px-2 py-0.5 rounded-md border text-amber-400 bg-amber-500/10 border-amber-500/30">
              ${s}
            </span>
            <span class="text-xs font-bold" style="color: var(--text-main);">Stagione ${s}</span>
          </div>
          <div class="flex items-center gap-2">
            ${isCurrent ? `<span class="text-[9px] uppercase font-black px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 animate-pulse">In Corso</span>` : ''}
            <button type="button" onclick="window.navigateToSeasonStandings && window.navigateToSeasonStandings('${s}')"
              class="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer">
              <span>Esplora Archivio</span>
              <i class="fa-solid fa-arrow-right text-[8px]"></i>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          ${renderMiniWinnerCard('🥇', 'Scudetto', champWinner)}
          ${renderMiniWinnerCard('🏆', 'Coppa', cupWinner)}
          ${renderMiniWinnerCard('⭐', 'Supercoppa', supercupWinner)}
          ${renderMiniWinnerCard('🌍', 'Mundialito', mundialitoWinner)}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Generic Competition Roll of Honor renderer based on archetype
 */
export function renderGenericCompetitionRollHTML(
  comp: CompetitionDefinition,
  competitions: CompetitionRecord[],
  managers: Manager[]
): string {
  const targetComps = (competitions || [])
    .filter(c => {
      if (c.in_progress || c.status === 'in_progress') return false;
      if (c.category === comp.category) return true;
      const name = (c.name || '').toLowerCase();
      return comp.nameKeywords && comp.nameKeywords.some(kw => name.includes(kw));
    })
    .sort((a, b) => (b.season || '').localeCompare(a.season || ''));

  if (targetComps.length === 0) {
    return `<div class="text-center py-8 text-xs opacity-60">Nessuna edizione conclusa di ${comp.name} in archivio.</div>`;
  }

  return targetComps.map(c => {
    const validRanks = (c.ranking || []).filter(r => r.rank !== null && r.rank !== undefined && r.rank > 0);
    const rank1 = validRanks.find(r => r.rank === 1);
    const rank2 = validRanks.find(r => r.rank === 2);
    const rank3 = validRanks.find(r => r.rank === 3);

    const p1 = rank1 ? buildParticipant(rank1.managerId, rank1.coach, rank1.teamName, rank1.points, rank1.logo, managers) : undefined;
    const p2 = rank2 ? buildParticipant(rank2.managerId, rank2.coach, rank2.teamName, rank2.points, rank2.logo, managers) : undefined;
    const p3 = rank3 ? buildParticipant(rank3.managerId, rank3.coach, rank3.teamName, rank3.points, rank3.logo, managers) : undefined;

    let bodyHTML = '';

    if (comp.type === 'tier3') {
      bodyHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          ${p1 ? renderPodiumCard(p1, '🥇 1° Posto', 'bg-amber-500/20 text-amber-300 border border-amber-500/40') : ''}
          ${p2 ? renderPodiumCard(p2, '🥈 2° Posto', 'bg-slate-400/20 text-slate-300 border border-slate-400/30') : ''}
          ${p3 ? renderPodiumCard(p3, '🥉 3° Posto', 'bg-amber-800/20 text-amber-600 border border-amber-800/30') : ''}
          ${(!p1 && !p2 && !p3) ? `<div class="text-[11px] text-center py-2 opacity-60 col-span-full">Dati podio non registrati.</div>` : ''}
        </div>
      `;
    } else if (comp.type === 'tier2') {
      bodyHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${p1 ? renderParticipantRow(p1, '🏆 Vincitore', 'bg-amber-500/20 text-amber-300 border border-amber-500/40', undefined, false) : ''}
          ${p2 ? renderParticipantRow(p2, '🥈 Finalista', 'bg-slate-400/20 text-slate-300 border border-slate-400/30', undefined, false) : ''}
          ${(!p1 && !p2) ? `<div class="text-[11px] text-center py-2 opacity-60 col-span-full">Dati finalisti non registrati.</div>` : ''}
        </div>
      `;
    } else if (comp.type === 'single') {
      bodyHTML = `
        <div class="space-y-1.5">
          ${p1 ? renderParticipantRow(p1, '🏆 Vincitore', 'bg-amber-500/20 text-amber-300 border border-amber-500/40', undefined, false) : '<div class="text-[11px] text-center py-2 opacity-60">Dato non registrato.</div>'}
        </div>
      `;
    } else if (comp.type === 'dishonor') {
      const maxRank = validRanks.length > 0 ? Math.max(...validRanks.map(r => r.rank!)) : 0;
      const lastItem = validRanks.find(r => r.rank === maxRank);
      const lastP = lastItem ? buildParticipant(lastItem.managerId, lastItem.coach, lastItem.teamName, lastItem.points, lastItem.logo, managers) : undefined;
      bodyHTML = `
        <div class="space-y-1.5">
          ${lastP ? renderParticipantRow(lastP, `🥄 #${maxRank}° Ultimo Posto`, 'bg-rose-500/20 text-rose-400 border border-rose-500/40', undefined, false) : '<div class="text-[11px] text-center py-2 opacity-60">Dato non disponibile.</div>'}
        </div>
      `;
    } else {
      bodyHTML = `
        <div class="space-y-1.5">
          ${p1 ? renderParticipantRow(p1, '📦 Assegnato', 'bg-blue-900/30 text-blue-400 border border-blue-800/40', undefined, false) : '<div class="text-[11px] text-center py-2 opacity-60">Dato non disponibile.</div>'}
        </div>
      `;
    }

    return `
      <div class="p-3.5 sm:p-4 rounded-2xl border space-y-2.5 transition"
        style="background-color: var(--table-surface); border-color: var(--table-border);">
        <div class="flex items-center justify-between gap-2 border-b pb-2" style="border-color: var(--table-border);">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md border text-amber-400 bg-amber-500/10 border-amber-500/30">
              ${c.season}
            </span>
            <span class="text-xs font-bold" style="color: var(--text-main);">${c.name}</span>
          </div>
          <button type="button" onclick="window.navigateToSeasonStandings && window.navigateToSeasonStandings('${c.season}')"
            class="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer">
            <span>Classifica</span>
            <i class="fa-solid fa-arrow-right text-[8px]"></i>
          </button>
        </div>
        ${bodyHTML}
      </div>
    `;
  }).join('');
}

