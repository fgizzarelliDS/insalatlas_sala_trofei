import type {
  ChronologySubView,
  ChronologySortField,
  SeasonSortField,
  ManagerFilterMode
} from '@/types';
import { state } from '@/state';
import {
  computeManagerTrajectoryMetrics,
  computeSeasonalParityMetrics
} from '@/analytics';

export function renderChronologyTab(
  currentChronologySubView: ChronologySubView = 'managers',
  chronologySortField: ChronologySortField = 'avg_rank',
  chronologySortDirection: 'asc' | 'desc' = 'asc',
  seasonSortField: SeasonSortField = 'season',
  seasonSortDirection: 'asc' | 'desc' = 'desc',
  managerFilterMode: ManagerFilterMode = 'all'
): string {
  const trajectoryProfiles = computeManagerTrajectoryMetrics(state.managers, state.competitions);
  const seasonalParity = computeSeasonalParityMetrics(state.competitions, state.managers);

  const totalCount = trajectoryProfiles.length;
  const veteransCount = trajectoryProfiles.filter(p => p.seasonsPlayed >= 3).length;
  const activeCount = trajectoryProfiles.filter(p => p.isActive).length;

  // Filter managers according to managerFilterMode
  const filteredTrajectory = trajectoryProfiles.filter(p => {
    if (managerFilterMode === 'veterans') return p.seasonsPlayed >= 3;
    if (managerFilterMode === 'active') return p.isActive;
    return true;
  });

  // Helper for table header sort icon (Manager)
  const chronoSortIcon = (field: ChronologySortField) => {
    if (chronologySortField !== field) {
      return '<i class="fa-solid fa-sort opacity-30 text-[9px] ml-1"></i>';
    }
    return chronologySortDirection === 'asc'
      ? '<i class="fa-solid fa-arrow-up-short-wide text-amber-400 text-[10px] ml-1"></i>'
      : '<i class="fa-solid fa-arrow-down-wide-short text-amber-400 text-[10px] ml-1"></i>';
  };

  // Helper for table header sort icon (Season)
  const seasonSortIcon = (field: SeasonSortField) => {
    if (seasonSortField !== field) {
      return '<i class="fa-solid fa-sort opacity-30 text-[9px] ml-1"></i>';
    }
    return seasonSortDirection === 'asc'
      ? '<i class="fa-solid fa-arrow-up-short-wide text-amber-400 text-[10px] ml-1"></i>'
      : '<i class="fa-solid fa-arrow-down-wide-short text-amber-400 text-[10px] ml-1"></i>';
  };

  // Sorted trajectory profiles
  const sortedTrajectory = [...filteredTrajectory].sort((a, b) => {
    let cmp = 0;
    if (chronologySortField === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else if (chronologySortField === 'avg_rank') {
      const rankA = a.seasonsPlayed > 0 ? a.avgRank : 999;
      const rankB = b.seasonsPlayed > 0 ? b.avgRank : 999;
      cmp = rankA - rankB || b.tierDistribution.baricenterScore - a.tierDistribution.baricenterScore;
    } else if (chronologySortField === 'baricenter') {
      cmp = a.tierDistribution.baricenterScore - b.tierDistribution.baricenterScore || (a.seasonsPlayed > 0 ? a.avgRank : 999) - (b.seasonsPlayed > 0 ? b.avgRank : 999);
    } else if (chronologySortField === 'seasons') {
      cmp = a.seasonsPlayed - b.seasonsPlayed || (a.seasonsPlayed > 0 ? a.avgRank : 999) - (b.seasonsPlayed > 0 ? b.avgRank : 999);
    } else if (chronologySortField === 'oscillation') {
      if (a.seasonsPlayed > 1 && b.seasonsPlayed > 1) {
        cmp = a.stdDevRank - b.stdDevRank;
      } else {
        cmp = b.seasonsPlayed - a.seasonsPlayed;
      }
    } else if (chronologySortField === 'podiums') {
      cmp = a.totalPodiums - b.totalPodiums || (a.seasonsPlayed > 0 ? a.avgRank : 999) - (b.seasonsPlayed > 0 ? b.avgRank : 999);
    } else if (chronologySortField === 'spoons') {
      cmp = a.totalSpoons - b.totalSpoons || (a.seasonsPlayed > 0 ? a.avgRank : 999) - (b.seasonsPlayed > 0 ? b.avgRank : 999);
    } else if (chronologySortField === 'merit') {
      const meritA = a.seasonsPlayed > 0 ? a.avgMeritPct : -1;
      const meritB = b.seasonsPlayed > 0 ? b.avgMeritPct : -1;
      cmp = meritA - meritB || a.seasonsPlayed - b.seasonsPlayed;
    }
    return chronologySortDirection === 'asc' ? cmp : -cmp;
  });

  // Sorted seasonal parity
  const sortedSeasons = [...seasonalParity].sort((a, b) => {
    let cmp = 0;
    const yA = parseInt(a.season.slice(0, 4), 10);
    const yB = parseInt(b.season.slice(0, 4), 10);
    if (seasonSortField === 'season') {
      cmp = yA - yB;
    } else if (seasonSortField === 'step_gap') {
      cmp = (a.stepGap ?? 999) - (b.stepGap ?? 999);
    } else if (seasonSortField === 'compactness') {
      cmp = (a.compactnessScore ?? -1) - (b.compactnessScore ?? -1);
    } else if (seasonSortField === 'total_gap') {
      cmp = (a.totalGap ?? 999) - (b.totalGap ?? 999);
    } else if (seasonSortField === 'podium_gap') {
      cmp = (a.podiumGap ?? 999) - (b.podiumGap ?? 999);
    } else if (seasonSortField === 'spoon_gap') {
      cmp = (a.spoonGap ?? 999) - (b.spoonGap ?? 999);
    }
    return seasonSortDirection === 'asc' ? cmp : -cmp;
  });

  // Sub-view Switcher HTML
  const subViewPills = `
    <div class="flex items-center justify-center p-1 rounded-xl border max-w-sm mx-auto mb-2.5" style="background: rgba(0,0,0,0.06); border-color: var(--table-border);">
      <button 
        type="button" 
        onclick="switchChronologyView('managers')" 
        class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
        style="${currentChronologySubView === 'managers'
      ? 'background-color: var(--btn-bg); color: var(--btn-text); border: 1px solid var(--btn-border);'
      : 'color: var(--text-muted); background: transparent; border: 1px solid transparent;'}"
      >
        <i class="fa-solid fa-user-astronaut text-[11px]"></i>
        <span>Prospettiva Manager</span>
      </button>
      <button 
        type="button" 
        onclick="switchChronologyView('seasons')" 
        class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
        style="${currentChronologySubView === 'seasons'
      ? 'background-color: var(--btn-bg); color: var(--btn-text); border: 1px solid var(--btn-border);'
      : 'color: var(--text-muted); background: transparent; border: 1px solid transparent;'}"
      >
        <i class="fa-solid fa-calendar-days text-[11px]"></i>
        <span>Evoluzione Stagioni</span>
      </button>
    </div>
  `;

  if (currentChronologySubView === 'managers') {
    const poolForHighlights = filteredTrajectory.length > 0 ? filteredTrajectory : trajectoryProfiles;
    const qualified = poolForHighlights.filter(p => p.seasonsPlayed >= 2);
    const withCompletedSeasons = poolForHighlights.filter(p => p.seasonsPlayed > 0);
    const fallbackPool = withCompletedSeasons.length > 0 ? withCompletedSeasons : poolForHighlights;
    const topBaricenter = [...(qualified.length > 0 ? qualified : fallbackPool)].sort((a, b) => b.tierDistribution.baricenterScore - a.tierDistribution.baricenterScore || a.avgRank - b.avgRank)[0];
    const topMetronome = [...(qualified.length > 0 ? qualified : fallbackPool)].sort((a, b) => a.stdDevRank - b.stdDevRank)[0];
    const topPodiums = [...fallbackPool].sort((a, b) => b.totalPodiums - a.totalPodiums)[0];

    let managerRowsHTML = '';
    sortedTrajectory.forEach((m, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}°`;

      managerRowsHTML += `
        <tr class="border-b transition hover:bg-white/[0.02]" style="border-color: var(--table-border);">
          <td class="py-2 px-2 text-center text-xs font-bold" style="color: var(--text-muted);">${medal}</td>
          <td class="py-2 px-2 min-w-[110px] sm:min-w-[125px]">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-xs block leading-tight" style="color: var(--text-main);">${m.name}</span>
              ${m.isActive ? '<span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-sm" title="Attivo nella stagione in corso"></span>' : ''}
            </div>
            <span class="text-[10px] font-normal" style="color: var(--text-muted);">${m.isRookieInProgress ? '0 (debuttante)' : `${m.seasonsPlayed} ${m.seasonsPlayed === 1 ? 'stagione' : 'stagioni'}`}</span>
          </td>
          <td class="py-2 px-2 min-w-[170px] sm:min-w-[185px]">
            <div class="flex items-baseline justify-between mb-1">
              <span class="text-xs sm:text-sm font-black font-mono whitespace-nowrap" style="color: var(--text-main);">
                ${m.seasonsPlayed > 0 ? `${m.avgRank.toFixed(1)}° <span class="text-[10px] font-normal opacity-90">medio</span>` : '<span class="text-xs font-normal opacity-50">—</span>'}
              </span>
              <span class="text-[9px] font-mono whitespace-nowrap" style="color: var(--text-muted);">
                ${m.seasonsPlayed > 0 ? `Best #${m.bestRank || '—'} / Worst #${m.worstRank || '—'}` : 'In corso'}
              </span>
            </div>
            
            <!-- 4-Color Segmented Mini Bar (8px height) -->
            <div class="w-full h-2 rounded-full overflow-hidden flex bg-white/10 shadow-inner" 
                 title="🥇 Vertice (Podio): ${m.tierDistribution.podiumCount} st. (${m.tierDistribution.podiumPct}%) | ⭐ Alta Classifica: ${m.tierDistribution.highCount} st. (${m.tierDistribution.highPct}%) | ⚖️ Metà Classifica: ${m.tierDistribution.midCount} st. (${m.tierDistribution.midPct}%) | 🥄 Rischio Cucchiaio: ${m.tierDistribution.riskCount} st. (${m.tierDistribution.riskPct}%)">
              ${m.tierDistribution.podiumPct > 0 ? `<div style="width: ${m.tierDistribution.podiumPct}%; background-color: #eab308;" class="h-full"></div>` : ''}
              ${m.tierDistribution.highPct > 0 ? `<div style="width: ${m.tierDistribution.highPct}%; background-color: #10b981;" class="h-full"></div>` : ''}
              ${m.tierDistribution.midPct > 0 ? `<div style="width: ${m.tierDistribution.midPct}%; background-color: #3b82f6;" class="h-full"></div>` : ''}
              ${m.tierDistribution.riskPct > 0 ? `<div style="width: ${m.tierDistribution.riskPct}%; background-color: #ef4444;" class="h-full"></div>` : ''}
            </div>
            
            <!-- Centered Prominent Fascia Pill Badge (single row) -->
            <div class="flex justify-center mt-1">
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-sm tracking-tight whitespace-nowrap" 
                    style="border-color: ${m.tierDistribution.baricenterColor}40; background-color: ${m.tierDistribution.baricenterColor}15; color: ${m.tierDistribution.baricenterColor};">
                <span>${m.tierDistribution.baricenterIcon || '🎯'}</span>
                <span>${m.tierDistribution.baricenterLabel}${m.seasonsPlayed > 0 ? ` · ${m.tierDistribution.baricenterScore.toFixed(1)}/4` : ''}</span>
              </span>
            </div>
          </td>
          <td class="py-2 px-2 text-center min-w-[115px]">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm whitespace-nowrap" style="border-color: ${m.volatilityColor}40; background-color: ${m.volatilityColor}15; color: ${m.volatilityColor};">
              <span>${m.volatilityIcon}</span>
              <span>${m.volatilityLabel}</span>
            </span>
            <span class="block text-[10px] font-mono mt-0.5" style="color: var(--text-muted);">
              ${m.seasonsPlayed > 1 ? `±${m.stdDevRank.toFixed(1)} pos.` : '—'}
            </span>
          </td>
          <td class="py-2 px-2 text-center min-w-[110px]">
            <div class="flex items-center justify-center gap-2 text-xs font-mono font-bold">
              <span class="inline-flex items-center gap-1 ${m.totalPodiums > 0 ? 'text-amber-400 font-black' : 'opacity-30'}" title="${m.totalPodiums} podi conquistati">
                🏆 ${m.totalPodiums}
              </span>
              <span class="opacity-30">|</span>
              <span class="inline-flex items-center gap-1 ${m.totalSpoons > 0 ? 'text-rose-400 font-black' : 'opacity-30'}" title="${m.totalSpoons} cucchiai di legno">
                🥄 ${m.totalSpoons}
              </span>
            </div>
            <span class="block text-[9px] opacity-60 mt-0.5 font-mono text-center">Rec. podi: ${m.maxPodiumStreak} st.</span>
          </td>
        </tr>
      `;
    });

    return `
      ${subViewPills}

      <!-- Top Manager Highlights -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 mb-2.5">
        <div class="p-2.5 sm:p-3 rounded-xl border flex items-center gap-3" style="border-color: var(--table-border); background: var(--table-surface);">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
            🥇
          </div>
          <div class="min-w-0">
            <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Miglior Baricentro Storico</span>
            <span class="block text-sm font-black truncate" style="color: var(--text-main);">${topBaricenter?.name || 'N/D'}</span>
            <span class="text-[11px] font-mono font-bold text-amber-400">${topBaricenter?.tierDistribution.baricenterScore.toFixed(1)}/4.0 · ${topBaricenter?.tierDistribution.baricenterLabel} <span class="text-[10px] font-normal opacity-70">(${topBaricenter?.seasonsPlayed} st.)</span></span>
          </div>
        </div>

        <div class="p-2.5 sm:p-3 rounded-xl border flex items-center gap-3" style="border-color: var(--table-border); background: var(--table-surface);">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ⏱️
          </div>
          <div class="min-w-0">
            <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Il Più Costante (Metronomo)</span>
            <span class="block text-sm font-black truncate" style="color: var(--text-main);">${topMetronome?.name || 'N/D'}</span>
            <span class="text-[11px] font-mono font-bold text-emerald-400">±${topMetronome?.stdDevRank.toFixed(1)} posizioni <span class="text-[10px] font-normal opacity-70">(${topMetronome?.seasonsPlayed} st.)</span></span>
          </div>
        </div>

        <div class="p-2.5 sm:p-3 rounded-xl border flex items-center gap-3" style="border-color: var(--table-border); background: var(--table-surface);">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-blue-500/10 text-blue-400 border border-blue-500/20">
            🏆
          </div>
          <div class="min-w-0">
            <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Più Presenze sul Podio</span>
            <span class="block text-sm font-black truncate" style="color: var(--text-main);">${topPodiums?.name || 'N/D'}</span>
            <span class="text-[11px] font-mono font-bold text-blue-400">${topPodiums?.totalPodiums} podi <span class="text-[10px] font-normal opacity-70">in ${topPodiums?.seasonsPlayed} stagioni</span></span>
          </div>
        </div>
      </div>

      <!-- Filter Pills Toolbar -->
      <div class="p-2 sm:p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 mb-2" style="background: rgba(255,255,255,0.02); border-color: var(--table-border);">
        <div class="flex items-center gap-1.5 text-xs">
          <span class="text-[10px] uppercase font-bold tracking-wider mr-1" style="color: var(--text-muted);">Mostra:</span>
          <button 
            type="button" 
            onclick="setManagerFilter('all')" 
            class="px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${managerFilterMode === 'all' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' : 'opacity-70 hover:opacity-100'}" 
            style="border-color: var(--table-border);"
          >
            Tutti (${totalCount})
          </button>
          <button 
            type="button" 
            onclick="setManagerFilter('veterans')" 
            class="px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${managerFilterMode === 'veterans' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' : 'opacity-70 hover:opacity-100'}" 
            style="border-color: var(--table-border);"
          >
            Veterani (≥ 3 st.) (${veteransCount})
          </button>
          <button 
            type="button" 
            onclick="setManagerFilter('active')" 
            class="px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${managerFilterMode === 'active' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' : 'opacity-70 hover:opacity-100'}" 
            style="border-color: var(--table-border);"
          >
            Attivi in corso (${activeCount})
          </button>
        </div>
        <span class="text-[11px] font-mono text-muted" style="color: var(--text-muted);">${sortedTrajectory.length} ${sortedTrajectory.length === 1 ? 'manager' : 'manager'}</span>
      </div>

      <!-- Manager Regularity Table with Interactive Headers & Scrollbar -->
      <div class="rounded-xl border overflow-hidden mb-3" style="border-color: var(--table-border); background: var(--table-surface);">
        <div class="overflow-x-auto max-h-[250px] sm:max-h-[280px] overflow-y-auto pr-0.5 sm:pr-1" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 z-10 border-b text-[10px] uppercase tracking-wider font-bold select-none backdrop-blur-md" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-muted);">
              <tr>
                <th class="py-2.5 px-2 text-center w-8">#</th>
                <th class="py-2.5 px-2 min-w-[110px] sm:min-w-[125px]">
                  <button type="button" onclick="toggleChronologySort('name')" class="flex items-center text-left hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider">
                    <span>Manager</span>
                    ${chronoSortIcon('name')}
                  </button>
                </th>
                <th class="py-2.5 px-2 min-w-[170px] sm:min-w-[185px]">
                  <button type="button" onclick="toggleChronologySort('avg_rank')" class="flex items-center text-left hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider">
                    <span>Piazzamento &amp; Fasce</span>
                    ${chronoSortIcon('avg_rank')}
                  </button>
                </th>
                <th class="py-2.5 px-2 text-center min-w-[115px]">
                  <button type="button" onclick="toggleChronologySort('oscillation')" class="flex items-center justify-center hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider mx-auto">
                    <span>Stabilità</span>
                    ${chronoSortIcon('oscillation')}
                  </button>
                </th>
                <th class="py-2.5 px-2 text-center min-w-[110px]">
                  <button type="button" onclick="toggleChronologySort('podiums')" class="flex items-center justify-center hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider mx-auto">
                    <span>Podi &amp; Cucchiai</span>
                    ${chronoSortIcon('podiums')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              ${managerRowsHTML}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Collapsible Methodology Guide -->
      <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
        <button type="button" onclick="toggleGuide('chronology-manager-guide')" class="w-full px-3 py-2 flex items-center justify-between text-left text-[11px] font-bold transition hover:bg-white/5" style="color: var(--text-main);">
          <div class="flex items-center gap-1.5">
            <i class="fa-solid fa-graduation-cap text-amber-400 text-[10px]"></i>
            <span>Guida: Fasce Dinamiche, Baricentro, Stabilità &amp; Normalizzazione Multi-Formato</span>
          </div>
          <i id="chronology-manager-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-[10px]" style="color: var(--text-muted);"></i>
        </button>
        <div id="chronology-manager-guide-content" class="px-3 pb-3 pt-1 border-t hidden space-y-2 text-xs" style="border-color: var(--table-border); color: var(--text-muted);">
          <p class="text-[11px] leading-relaxed">
            <strong>Normalizzazione a 4 Fasce Dinamiche:</strong> Nel corso delle 10 stagioni il campionato è passato da 8 a 10 e 12 squadre. Per eliminare la distorsione (un 4° posto a 8 squadre è a metà classifica, a 12 squadre è in zona nobile), ogni piazzamento è mappato proporzionalmente:
            <br>• <strong style="color: #eab308;">🥇 Vertice / Podio (4 pt):</strong> primi 3 posti (tutti i formati).
            <br>• <strong style="color: #10b981;">⭐ Alta Classifica (3 pt):</strong> 4° a 8 sq; 4°–5° a 10 sq; 4°–6° a 12 sq.
            <br>• <strong style="color: #3b82f6;">⚖️ Metà Classifica (2 pt):</strong> 5°–6° a 8 sq; 6°–8° a 10 sq; 7°–10° a 12 sq.
            <br>• <strong style="color: #ef4444;">🥄 Rischio Cucchiaio (1 pt):</strong> ultime due posizioni di ogni formato.
          </p>
          <p class="text-[11px] leading-relaxed">
            <strong>Baricentro Storico (da 1.0 a 4.0):</strong> Media ponderata del tempo trascorso nelle fasce: &ge; 3.5 <em>Élite Vertice</em>, 2.8–3.4 <em>Alta Classifica</em>, 2.0–2.7 <em>Metà Classifica</em>, &lt; 2.0 <em>Zona Rischio</em>. La mini-barra segmentata a 4 colori illustra visivamente la distribuzione storica.
          </p>
          <p class="text-[11px] leading-relaxed">
            <strong>Stabilità &amp; Oscillazione Tipica (&sigma;<sub>R</sub>):</strong> Misura la dispersione delle posizioni finali occupate in carriera (&sigma;<sub>R</sub>, deviazione standard del rank con min. 3 stagioni):
            <br>• <strong style="color: #10b981;">⏱️ Metronomo (&sigma;<sub>R</sub> &lt; 2.0 pos):</strong> Iper-stabilità statistica. Il mister naviga costantemente nello stesso fazzoletto di posizioni (es. Valery con &sigma;<sub>R</sub> = 1.34).
            <br>• <strong style="color: #3b82f6;">⚖️ Equilibrato (2.0 &le; &sigma;<sub>R</sub> &le; 3.5 pos):</strong> La fisiologica alternanza competitiva della lega. Normale variabilità tra annate di vertice e campionati di transizione, senza tracolli estremi.
            <br>• <strong style="color: #f59e0b;">🎢 Montagna Russa (&sigma;<sub>R</sub> &gt; 3.5 pos):</strong> Elevata polarizzazione. Alternanza estrema tra lotta scudetto e rischio cucchiaio (es. Makako con &sigma;<sub>R</sub> = 3.92, Tazio con &sigma;<sub>R</sub> = 3.61).
            <br>• <strong style="color: #94a3b8;">🌱 Esordiente (&lt; 3 stagioni):</strong> Meno di 3 campionati disputati; campione statistico non consolidato per stimare l'oscillazione tipica.
          </p>
        </div>
      </div>
    `;
  } else {
    // Seasons View
    const validSeasons = seasonalParity.filter(s => s.hasPointsData && s.stepGap !== null);
    const topCompact = [...validSeasons].sort((a, b) => (a.stepGap ?? 999) - (b.stepGap ?? 999))[0];
    const secondCompact = [...validSeasons].sort((a, b) => (a.stepGap ?? 999) - (b.stepGap ?? 999))[1];
    const missingPointsSeasons = seasonalParity.filter(s => !s.hasPointsData);
    const tightestPodium = [...validSeasons].filter(s => s.podiumGap !== null).sort((a, b) => (a.podiumGap ?? 999) - (b.podiumGap ?? 999))[0];
    const tightestSpoon = [...validSeasons].filter(s => s.spoonGap !== null).sort((a, b) => (a.spoonGap ?? 999) - (b.spoonGap ?? 999))[0];

    const recordNoteHTML = topCompact
      ? `<p class="text-[11px] leading-relaxed">
            <strong>Record Storico di Compattezza:</strong> La stagione <strong>${topCompact.season}</strong> a ${topCompact.teamCount} squadre detiene il record assoluto di compattezza con soli <strong>${topCompact.stepGap?.toFixed(2)} pt per gradino</strong> (forbice totale di ${topCompact.totalGap} pt spalmata su ${topCompact.teamCount} squadre)${secondCompact ? `, battendo il campionato ${secondCompact.season} a ${secondCompact.teamCount} squadre (${secondCompact.stepGap?.toFixed(2)} pt/gradino)` : ''}.
          </p>`
      : '';

    const missingPointsNoteHTML = missingPointsSeasons.length > 0
      ? `<p class="text-[11px] leading-relaxed">
            <strong>Archivio Storico (${missingPointsSeasons.map(s => s.season).join(', ')}):</strong> Per ${missingPointsSeasons.length === 1 ? `la stagione ${missingPointsSeasons[0].season}` : `le stagioni ${missingPointsSeasons.map(s => s.season).join(', ')}`} i punti di classifica non sono stati registrati nella banca dati; l'applicazione preserva la coerenza mostrando i verdetti ufficiali (Campione e Cucchiaio) con un'indicazione esplicita senza inficiare i calcoli degli altri anni.
          </p>`
      : '';

    let seasonRowsHTML = '';
    sortedSeasons.forEach(s => {
      const compactBar = s.compactnessScore !== null ? Math.max(5, s.compactnessScore) : 0;
      const compactLabel = s.compactnessScore !== null ? `${s.compactnessScore} / 100` : 'N/D';
      const stdDevLabel = s.stdDevPts !== null ? `σ ${s.stdDevPts} pt` : 'Dato parziale';
      const podiumGapLabel = s.podiumGap !== null ? `${s.podiumGap} pt` : 'N/D';
      const spoonGapLabel = s.spoonGap !== null ? `${s.spoonGap} pt` : 'N/D';

      seasonRowsHTML += `
        <tr class="border-b transition hover:bg-white/[0.02]" style="border-color: var(--table-border);">
          <td class="py-2 px-2">
            <span class="font-bold text-xs block leading-tight text-amber-400">${s.season}</span>
            <span class="text-[10px]" style="color: var(--text-muted);">${s.teamCount} squadre</span>
          </td>
          <td class="py-2 px-2 min-w-[130px]">
            ${s.hasPointsData && s.stepGap !== null
          ? `
                <span class="font-mono text-xs font-black block" style="color: var(--text-main);">Δ ${s.stepGap.toFixed(2)} pt/pos</span>
                <span class="text-[9px] block mt-0.5" style="color: var(--text-muted);">Forbice tot. Δ ${s.totalGap?.toFixed(1)} pt (${s.teamCount} sq)</span>
              `
          : `
                <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400/90 italic">
                  <i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Punti non archiviati
                </span>
              `}
          </td>
          <td class="py-2 px-2 min-w-[120px]">
            ${s.hasPointsData && s.compactnessScore !== null
          ? `
                <div class="flex items-center justify-between text-xs font-mono font-bold mb-1">
                  <span style="color: var(--text-main);">${compactLabel}</span>
                  <span class="text-[10px] opacity-70 font-normal">${stdDevLabel}</span>
                </div>
                <div class="w-full h-1.5 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.08);">
                  <div class="h-full rounded-full transition-all duration-300" style="width: ${compactBar}%; background-color: ${s.compactnessScore >= 65 ? '#10b981' : s.compactnessScore >= 40 ? '#3b82f6' : '#f59e0b'};"></div>
                </div>
              `
          : `
                <span class="text-[10px] opacity-40 font-mono">Dato parziale</span>
              `}
          </td>
          <td class="py-2 px-2 text-center">
            <span class="font-mono text-xs font-bold block" style="color: var(--text-main);">${podiumGapLabel}</span>
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border mt-0.5 shadow-sm" style="border-color: ${s.podiumBadgeColor}40; background-color: ${s.podiumBadgeColor}15; color: ${s.podiumBadgeColor};">
              ${s.podiumBadge}
            </span>
          </td>
          <td class="py-2 px-2 text-center">
            <span class="font-mono text-xs font-bold block" style="color: var(--text-main);">${spoonGapLabel}</span>
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border mt-0.5 shadow-sm" style="border-color: ${s.spoonBadgeColor}40; background-color: ${s.spoonBadgeColor}15; color: ${s.spoonBadgeColor};">
              ${s.spoonBadge}
            </span>
          </td>
          <td class="py-2 px-2">
            <div class="text-[11px] leading-tight flex flex-col gap-0.5">
              <span class="font-bold text-amber-400 truncate">🥇 ${s.championName} <span class="opacity-60 text-[10px] font-normal">(${s.championPts ? s.championPts + ' pt' : 'Campione'})</span></span>
              <span class="font-bold text-rose-400 truncate">🥄 ${s.spoonName} <span class="opacity-60 text-[10px] font-normal">(${s.spoonPts ? s.spoonPts + ' pt' : 'Cucchiaio'})</span></span>
            </div>
          </td>
        </tr>
      `;
    });

    return `
      ${subViewPills}

      <!-- Top Seasons Highlights -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 mb-2.5">
        <div class="p-2.5 sm:p-3 rounded-xl border flex items-center gap-3" style="border-color: var(--table-border); background: var(--table-surface);">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ⚖️
          </div>
          <div class="min-w-0">
            <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Campionato Più Compatto</span>
            <span class="block text-sm font-black truncate" style="color: var(--text-main);">${topCompact?.season || 'N/D'}</span>
            <span class="text-[11px] font-mono font-bold text-emerald-400">Δ ${topCompact?.stepGap?.toFixed(2) ?? '—'} pt/pos <span class="text-[10px] font-normal opacity-70">(Tot. ${topCompact?.totalGap} pt su ${topCompact?.teamCount} sq)</span></span>
          </div>
        </div>

        <div class="p-2.5 sm:p-3 rounded-xl border flex items-center gap-3" style="border-color: var(--table-border); background: var(--table-surface);">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
            🏁
          </div>
          <div class="min-w-0">
            <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Podio Più Serrato</span>
            <span class="block text-sm font-black truncate" style="color: var(--text-main);">${tightestPodium?.season || 'N/D'}</span>
            <span class="text-[11px] font-mono font-bold text-amber-400">Δ 1°–3°: ${tightestPodium?.podiumGap} pt <span class="text-[10px] font-normal opacity-70">(Fotofinish)</span></span>
          </div>
        </div>

        <div class="p-2.5 sm:p-3 rounded-xl border flex items-center gap-3" style="border-color: var(--table-border); background: var(--table-surface);">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-rose-500/10 text-rose-400 border border-rose-500/20">
            ⚡
          </div>
          <div class="min-w-0">
            <span class="block text-[10px] uppercase font-bold tracking-wider" style="color: var(--text-muted);">Fuga Cucchiaio Più Tirata</span>
            <span class="block text-sm font-black truncate" style="color: var(--text-main);">${tightestSpoon?.season || 'N/D'}</span>
            <span class="text-[11px] font-mono font-bold text-rose-400">Δ Penultimo–Ultimo: ${tightestSpoon?.spoonGap} pt</span>
          </div>
        </div>
      </div>

      <!-- Seasons Parity Table with Interactive Headers & Scrollbar -->
      <div class="rounded-xl border overflow-hidden mb-3" style="border-color: var(--table-border); background: var(--table-surface);">
        <div class="overflow-x-auto max-h-[250px] sm:max-h-[280px] overflow-y-auto pr-0.5 sm:pr-1" style="scrollbar-width: thin; scrollbar-color: var(--table-border) transparent;">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 z-10 border-b text-[10px] uppercase tracking-wider font-bold select-none backdrop-blur-md" style="border-color: var(--table-border); background: var(--table-surface); color: var(--text-muted);">
              <tr>
                <th class="py-2.5 px-2">
                  <button type="button" onclick="toggleSeasonSort('season')" class="flex items-center text-left hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider">
                    <span>Stagione</span>
                    ${seasonSortIcon('season')}
                  </button>
                </th>
                <th class="py-2.5 px-2">
                  <button type="button" onclick="toggleSeasonSort('step_gap')" class="flex items-center text-left hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider">
                    <span>Gradino Medio</span>
                    ${seasonSortIcon('step_gap')}
                  </button>
                </th>
                <th class="py-2.5 px-2">
                  <button type="button" onclick="toggleSeasonSort('compactness')" class="flex items-center text-left hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider">
                    <span>Compattezza</span>
                    ${seasonSortIcon('compactness')}
                  </button>
                </th>
                <th class="py-2.5 px-2 text-center">
                  <button type="button" onclick="toggleSeasonSort('podium_gap')" class="flex items-center justify-center hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider mx-auto">
                    <span>Volata Podio</span>
                    ${seasonSortIcon('podium_gap')}
                  </button>
                </th>
                <th class="py-2.5 px-2 text-center">
                  <button type="button" onclick="toggleSeasonSort('spoon_gap')" class="flex items-center justify-center hover:text-amber-400 transition cursor-pointer font-bold uppercase tracking-wider mx-auto">
                    <span>Fuga Cucchiaio</span>
                    ${seasonSortIcon('spoon_gap')}
                  </button>
                </th>
                <th class="py-2.5 px-2">Verdetti Chiave</th>
              </tr>
            </thead>
            <tbody>
              ${seasonRowsHTML}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Collapsible Methodology Guide -->
      <div class="border rounded-xl overflow-hidden" style="border-color: var(--table-border); background: rgba(0,0,0,0.02);">
        <button type="button" onclick="toggleGuide('chronology-season-guide')" class="w-full px-3 py-2 flex items-center justify-between text-left text-[11px] font-bold transition hover:bg-white/5" style="color: var(--text-main);">
          <div class="flex items-center gap-1.5">
            <i class="fa-solid fa-graduation-cap text-amber-400 text-[10px]"></i>
            <span>Guida: Gradino Medio (pt/posizione) &amp; Compattezza Normalizzata</span>
          </div>
          <i id="chronology-season-guide-chevron" class="fa-solid fa-chevron-down transition-transform duration-200 text-[10px]" style="color: var(--text-muted);"></i>
        </button>
        <div id="chronology-season-guide-content" class="px-3 pb-3 pt-1 border-t hidden space-y-2 text-xs" style="border-color: var(--table-border); color: var(--text-muted);">
          <p class="text-[11px] leading-relaxed">
            <strong>Gradino Medio di Classifica (pt/posizione):</strong> Divide la forbice totale (1° - Ultimo) per il numero di salti di classifica (N - 1). Questo parametro rende perfettamente confrontabili campionati a 8 squadre (7 salti), 10 squadre (9 salti) e 12 squadre (11 salti): un gradino più basso indica che ogni posizione era contesa punto su punto.
          </p>
          ${recordNoteHTML}
          ${missingPointsNoteHTML}
        </div>
      </div>
    `;
  }
}
