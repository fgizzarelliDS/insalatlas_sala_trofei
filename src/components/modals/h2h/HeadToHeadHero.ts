import type { Manager, HeadToHeadStats } from '@/types';
import type { TacticalProfile } from '@/analytics/tacticalProfiler';

/**
 * Extracts initials for manager avatar
 */
export function getInitials(name: string): string {
  const parts = name.split(/[ &+/,-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Renders the top manager selectors and face-off contender hero cards
 */
export function renderHeadToHeadHero(
  stats: HeadToHeadStats,
  allManagers: Manager[],
  profileA?: TacticalProfile,
  profileB?: TacticalProfile
): string {
  const { managerA, managerB, metricsA, metricsB } = stats;
  const initialsA = getInitials(managerA.name);
  const initialsB = getInitials(managerB.name);

  // Options for dropdowns
  const optionsA = allManagers
    .map(
      m =>
        `<option value="${m.id}" ${m.id === managerA.id ? 'selected' : ''} ${m.id === managerB.id ? 'disabled' : ''}>${m.name}</option>`
    )
    .join('');

  const optionsB = allManagers
    .map(
      m =>
        `<option value="${m.id}" ${m.id === managerB.id ? 'selected' : ''} ${m.id === managerA.id ? 'disabled' : ''}>${m.name}</option>`
    )
    .join('');

  const archColorA = profileA ? profileA.archetype.color : metricsA.archetypeColor;
  const archIconA = profileA ? profileA.archetype.icon : metricsA.archetypeIcon;
  const archTitleA = profileA ? profileA.archetype.title : metricsA.archetypeTag;
  const archTraitA = profileA ? profileA.archetype.trait : '';
  const archMottoA = profileA ? profileA.archetype.motto : '';

  const archColorB = profileB ? profileB.archetype.color : metricsB.archetypeColor;
  const archIconB = profileB ? profileB.archetype.icon : metricsB.archetypeIcon;
  const archTitleB = profileB ? profileB.archetype.title : metricsB.archetypeTag;
  const archTraitB = profileB ? profileB.archetype.trait : '';
  const archMottoB = profileB ? profileB.archetype.motto : '';

  return `
    <div class="p-3 rounded-2xl border" style="background-color: var(--table-surface); border-color: var(--table-border);">
      <!-- Dropdown Selectors -->
      <div id="h2h-hero-dropdown-selectors" class="grid grid-cols-2 gap-3 items-center">
        <!-- Select A -->
        <div class="min-w-0">
          <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style="color: var(--h2h-contender-a);">
            <span class="w-2 h-2 rounded-full inline-block" style="background-color: var(--h2h-contender-a);"></span>
            Mister A
          </label>
          <select id="h2h-select-a" onchange="changeH2HManagerA(this.value)"
            class="w-full text-xs font-bold rounded-xl px-2.5 py-2 border focus:outline-none cursor-pointer truncate shadow-sm transition"
            style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            ${optionsA}
          </select>
        </div>

        <!-- Select B -->
        <div class="min-w-0">
          <label class="block text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-end gap-1.5" style="color: var(--h2h-contender-b);">
            Mister B
            <span class="w-2 h-2 rounded-full inline-block" style="background-color: var(--h2h-contender-b);"></span>
          </label>
          <select id="h2h-select-b" onchange="changeH2HManagerB(this.value)"
            class="w-full text-xs font-bold rounded-xl px-2.5 py-2 border focus:outline-none cursor-pointer truncate text-right shadow-sm transition"
            style="background-color: var(--input-bg); border-color: var(--input-border); color: var(--input-text);">
            ${optionsB}
          </select>
        </div>
      </div>

      <!-- Face-off Hero Cards -->
      <div id="h2h-hero-cards-row" class="grid grid-cols-11 gap-1 items-stretch mt-3 pt-3 border-t" style="border-color: var(--table-border);">
        <!-- Contender A Card -->
        <div class="col-span-5 text-center p-3 rounded-xl border flex flex-col items-center justify-between min-w-0" style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div class="cursor-pointer group flex flex-col items-center w-full transition"
               onclick="window.openProfileFromH2H('${managerA.id}')"
               title="Vedi scheda profilo di ${managerA.name}">
            <div class="w-11 h-11 mx-auto rounded-full flex items-center justify-center font-black text-sm border-2 mb-1 shadow transition group-hover:scale-110"
                 style="background: radial-gradient(circle, var(--h2h-contender-a) 0%, transparent 80%), rgba(255,255,255,0.05); border-color: var(--h2h-contender-a); color: var(--text-main);">
              ${initialsA}
            </div>
            <h3 class="h2h-contender-name font-sport font-black text-sm uppercase px-1 my-1 leading-normal transition group-hover:underline flex items-center justify-center gap-1 truncate max-w-full" style="color: var(--text-main); line-height: 1.35;">
              <span class="truncate">${managerA.name}</span>
              <i class="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-0 group-hover:opacity-75 transition shrink-0" style="color: var(--h2h-contender-a);"></i>
            </h3>
          </div>
          <div class="flex flex-col items-center justify-center gap-1 mt-1 w-full min-w-0">
            <span class="inline-flex items-center justify-center text-[10px] font-black px-2 py-0.5 rounded-full border text-center leading-tight break-words max-w-full"
                  style="background: ${archColorA}18; color: ${archColorA}; border-color: ${archColorA}40;">
              <i class="fa-solid ${archIconA} text-[9px] mr-1 shrink-0"></i><span>${archTitleA}</span>
            </span>
            ${archTraitA ? `<span class="text-[9px] font-bold opacity-75 text-center leading-tight break-words max-w-full block" style="color: var(--text-muted);">${archTraitA}</span>` : ''}
            ${archMottoA ? `<p class="text-[9.5px] italic opacity-85 mt-1 leading-tight line-clamp-2 px-1 hidden sm:block" style="color: var(--text-main);">${archMottoA}</p>` : ''}
          </div>
        </div>

        <!-- VS Emblem -->
        <div class="col-span-1 text-center font-sport font-black text-sm italic tracking-widest opacity-60 drop-shadow flex items-center justify-center" style="color: var(--accent-color);">
          VS
        </div>

        <!-- Contender B Card -->
        <div class="col-span-5 text-center p-3 rounded-xl border flex flex-col items-center justify-between min-w-0" style="background-color: var(--modal-bg); border-color: var(--table-border);">
          <div class="cursor-pointer group flex flex-col items-center w-full transition"
               onclick="window.openProfileFromH2H('${managerB.id}')"
               title="Vedi scheda profilo di ${managerB.name}">
            <div class="w-11 h-11 mx-auto rounded-full flex items-center justify-center font-black text-sm border-2 mb-1 shadow transition group-hover:scale-110"
                 style="background: radial-gradient(circle, var(--h2h-contender-b) 0%, transparent 80%), rgba(255,255,255,0.05); border-color: var(--h2h-contender-b); color: var(--text-main);">
              ${initialsB}
            </div>
            <h3 class="h2h-contender-name font-sport font-black text-sm uppercase px-1 my-1 leading-normal transition group-hover:underline flex items-center justify-center gap-1 truncate max-w-full" style="color: var(--text-main); line-height: 1.35;">
              <span class="truncate">${managerB.name}</span>
              <i class="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-0 group-hover:opacity-75 transition shrink-0" style="color: var(--h2h-contender-b);"></i>
            </h3>
          </div>
          <div class="flex flex-col items-center justify-center gap-1 mt-1 w-full min-w-0">
            <span class="inline-flex items-center justify-center text-[10px] font-black px-2 py-0.5 rounded-full border text-center leading-tight break-words max-w-full"
                  style="background: ${archColorB}18; color: ${archColorB}; border-color: ${archColorB}40;">
              <i class="fa-solid ${archIconB} text-[9px] mr-1 shrink-0"></i><span>${archTitleB}</span>
            </span>
            ${archTraitB ? `<span class="text-[9px] font-bold opacity-75 text-center leading-tight break-words max-w-full block" style="color: var(--text-muted);">${archTraitB}</span>` : ''}
            ${archMottoB ? `<p class="text-[9.5px] italic opacity-85 mt-1 leading-tight line-clamp-2 px-1 hidden sm:block" style="color: var(--text-main);">${archMottoB}</p>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}
