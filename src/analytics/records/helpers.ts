import { state } from '@/state';
import { resolveTeamLogo, getTeamFallbackCrest, isCustomLogo } from '@/crests';
import type { Manager, CompetitionRecord } from '@/types';

/**
 * Returns the exact official number of matchdays played in a championship season
 * based on the number of teams and round-robin cycle (2, 3, 4, 5 rounds):
 * - 8 teams: 35 matchdays (5 rounds x 7)
 * - 10 teams: 36 matchdays (4 rounds x 9)
 * - 12 teams: 33 matchdays (3 rounds x 11)
 * - 14 teams: 26 matchdays (2 rounds x 13)
 */
export function getSeasonMatchdays(season: string, teamCount: number): number {
  if (teamCount === 8 || season.includes('16/17') || season.includes('17/18')) {
    return 35;
  }
  if (teamCount === 10 || season.includes('18/19') || season.includes('19/20')) {
    return 36;
  }
  if (
    teamCount === 12 ||
    season.includes('20/21') ||
    season.includes('21/22') ||
    season.includes('22/23') ||
    season.includes('23/24') ||
    season.includes('24/25') ||
    season.includes('25/26')
  ) {
    return 33;
  }
  if (teamCount === 14) {
    return 26;
  }
  const rounds = 3;
  return teamCount > 1 ? (teamCount - 1) * rounds : 33;
}

/**
 * Resolves the canonical manager name from their ID, or falls back to coach string
 */
export function resolveManagerName(
  managerId?: string,
  coachFallback?: string,
  managersList?: Manager[]
): string {
  const list = managersList || state.managers || [];
  if (managerId) {
    const found = list.find(m => m.id === managerId);
    if (found) return found.name;
  }
  return coachFallback || 'Sconosciuto';
}

/**
 * Filters out in-progress competitions and returns only completed Serie Atlas championships
 */
export function getCompletedChampionships(competitions: CompetitionRecord[]): CompetitionRecord[] {
  return (competitions || []).filter(c => {
    if (c.in_progress || c.status === 'in_progress') return false;
    const cat = (c.category || '').toLowerCase();
    const name = (c.name || '').toLowerCase();
    return cat === 'championship' || name.includes('serie') || (!c.category && !name.includes('coppa'));
  });
}

/**
 * Universally resolves the pertinent team franchise name, custom logo URL, and fallback vector crest
 * for a manager:
 * - If season is provided, finds the team and custom logo from that exact historical season.
 * - If season is omitted (career records), finds the manager's most recent / primary franchise.
 */
export function resolveManagerRecordCrest(
  managerId: string,
  season?: string,
  explicitTeamName?: string,
  managersList?: Manager[],
  competitionsList?: CompetitionRecord[]
): { teamName: string; logo: string; fallbackCrest: string } {
  const comps = competitionsList || state.competitions || [];
  const mgrs = managersList || state.managers || [];

  // 1. Season-specific resolution
  if (season && comps.length > 0) {
    // Look in championship or any tournament of that season
    for (const c of comps) {
      if (c.season === season) {
        const item = (c.ranking || []).find(r => r.managerId === managerId);
        if (item) {
          const teamName = item.teamName || explicitTeamName || '';
          let logo = item.logo;

          // If the season ranking only had a vector crest or non-custom logo, check if the same franchise has an authentic custom logo
          if (!isCustomLogo(logo) && teamName) {
            for (const otherC of comps) {
              const match = (otherC.ranking || []).find(
                r => r.managerId === managerId &&
                  isCustomLogo(r.logo) &&
                  r.teamName?.trim().toLowerCase().replace(/\s+/g, '') === teamName.trim().toLowerCase().replace(/\s+/g, '')
              );
              if (match?.logo) {
                logo = match.logo;
                break;
              }
            }
          }

          return {
            teamName,
            logo: resolveTeamLogo(teamName, logo),
            fallbackCrest: getTeamFallbackCrest(teamName)
          };
        }
      }
    }
  }

  // 2. Career resolution: look at manager's latest season or recent competition
  const mgr = mgrs.find(m => m.id === managerId);
  if (mgr && mgr.history && mgr.history.length > 0) {
    // Find the latest valid team name in manager history (e.g. 2025/26 or latest non-empty)
    const validHistory = mgr.history.filter(h => h.team && h.team.trim() !== '');
    if (validHistory.length > 0) {
      // Find matching competition to see if there is an authentic custom uploaded logo
      const latestHistory = validHistory[0];
      const teamName = explicitTeamName || latestHistory.team || '';

      let customLogo: string | undefined;
      for (const c of comps) {
        const found = (c.ranking || []).find(
          r => r.managerId === managerId && r.logo && (r.teamName === teamName || !teamName)
        );
        if (found?.logo) {
          customLogo = found.logo;
          break;
        }
      }

      return {
        teamName,
        logo: resolveTeamLogo(teamName, customLogo),
        fallbackCrest: getTeamFallbackCrest(teamName)
      };
    }
  }

  // 3. Fallback to explicitTeamName or manager name
  const fallbackName = explicitTeamName || mgr?.name || 'InsalAtlas FC';
  return {
    teamName: fallbackName,
    logo: resolveTeamLogo(fallbackName),
    fallbackCrest: getTeamFallbackCrest(fallbackName)
  };
}
