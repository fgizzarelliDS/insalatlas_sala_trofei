import { Manager, CompetitionRecord } from '@/types';

/**
 * Factory helper to construct a fully populated Manager fixture with sensible zero defaults.
 */
export function createTestManager(data: Partial<Manager> & { id: string; name: string }): Manager {
  return {
    years: 1,
    gold: 0,
    silver: 0,
    bronze: 0,
    spoon: 0,
    cup_gold: 0,
    cup_silver: 0,
    supercup: 0,
    supercup_silver: 0,
    mundialito: 0,
    mundialito_silver: 0,
    cartonato: 0,
    coach_banners: [],
    cartonato_coaches: [],
    history: [],
    ...data
  };
}

/**
 * Factory helper to construct a CompetitionRecord fixture.
 */
export function createTestCompetition(data: Partial<CompetitionRecord> & { id: number; name: string; season: string; category: string }): CompetitionRecord {
  return {
    in_progress: false,
    status: 'completed',
    ranking: [],
    ...data
  };
}

/**
 * Standard synthetic manager fixtures covering all major trophy archetypes.
 * 100% league-agnostic and deterministic across test suites.
 */
export const mockLeagueManagers: Manager[] = [
  createTestManager({
    id: 'm_champ',
    name: 'Champion Manager',
    years: 3,
    gold: 2,
    silver: 1,
    bronze: 0,
    cup_gold: 1,
    cup_silver: 0,
    supercup: 1,
    history: [
      {
        season: '2026/27',
        team: 'Champion United',
        rank: 1,
        points: 0,
        competitionId: 301,
        in_progress: true,
        status: 'in_progress',
        achievements: []
      },
      {
        season: '2025/26',
        team: 'Champion United',
        rank: 1,
        points: 65.0,
        competitionId: 201,
        achievements: [
          { title: 'Scudetto', category: 'Campionato', badge: 'gold', icon: '🥇', competitionId: 201 }
        ]
      },
      {
        season: '2024/25',
        team: 'Champion United',
        rank: 1,
        points: 60.0,
        competitionId: 101,
        achievements: [
          { title: 'Scudetto', category: 'Campionato', badge: 'gold', icon: '🥇', competitionId: 101 },
          { title: 'Coppa', category: 'Coppa', badge: 'cup_gold', icon: '🏆', competitionId: 102 },
          { title: 'Supercoppa', category: 'Supercoppa', badge: 'supercup', icon: '⭐', competitionId: 103 }
        ]
      }
    ]
  }),
  createTestManager({
    id: 'm_cup',
    name: 'Cup Specialist',
    years: 3,
    gold: 0,
    silver: 1,
    bronze: 1,
    cup_gold: 1,
    cup_silver: 1,
    supercup: 0,
    supercup_silver: 1,
    history: [
      {
        season: '2026/27',
        team: 'Cup FC',
        rank: 2,
        points: 0,
        competitionId: 301,
        in_progress: true,
        status: 'in_progress',
        achievements: []
      },
      {
        season: '2025/26',
        team: 'Cup FC',
        rank: 2,
        points: 58.0,
        competitionId: 201,
        achievements: [
          { title: '2° Posto Campionato', category: 'Campionato', badge: 'silver', icon: '🥈', competitionId: 201 },
          { title: 'Coppa', category: 'Coppa', badge: 'cup_gold', icon: '🏆', competitionId: 202 }
        ]
      },
      {
        season: '2024/25',
        team: 'Cup FC',
        rank: 3,
        points: 50.0,
        competitionId: 101,
        achievements: [
          { title: '3° Posto Campionato', category: 'Campionato', badge: 'bronze', icon: '🥉', competitionId: 101 },
          { title: 'Finalista Coppa', category: 'Coppa', badge: 'cup_silver', icon: '🥈', competitionId: 102 }
        ]
      }
    ]
  }),
  createTestManager({
    id: 'm_banter',
    name: 'Banter Boss',
    years: 3,
    gold: 0,
    silver: 0,
    bronze: 0,
    spoon: 2,
    cartonato: 1,
    coach_banners: ['JURIC'],
    cartonato_coaches: ['JURIC'],
    history: [
      {
        season: '2026/27',
        team: 'Banter Stars',
        rank: 4,
        points: 0,
        competitionId: 301,
        in_progress: true,
        status: 'in_progress',
        achievements: []
      },
      {
        season: '2025/26',
        team: 'Banter Stars',
        rank: 4,
        points: 25.0,
        competitionId: 201,
        achievements: [
          { title: 'Cucchiaio di Legno', category: 'Campionato', badge: 'spoon', icon: '🥄', competitionId: 201 }
        ]
      },
      {
        season: '2024/25',
        team: 'Banter Stars',
        rank: 4,
        points: 28.0,
        competitionId: 101,
        achievements: [
          { title: 'Cucchiaio di Legno', category: 'Campionato', badge: 'spoon', icon: '🥄', competitionId: 101 },
          { title: 'Playout Cartonato', category: 'Playout', badge: 'cartonato', icon: '📦', competitionId: 104 }
        ]
      }
    ]
  }),
  createTestManager({
    id: 'm_rookie',
    name: 'Rookie Manager',
    years: 1,
    gold: 0,
    silver: 0,
    bronze: 0,
    history: [
      {
        season: '2026/27',
        team: 'Rookie Athletic',
        rank: 3,
        points: 0,
        competitionId: 301,
        in_progress: true,
        status: 'in_progress',
        achievements: []
      }
    ]
  })
];

/**
 * Standard synthetic competitions fixtures across multiple seasons.
 */
export const mockCompetitions: CompetitionRecord[] = [
  createTestCompetition({
    id: 101,
    name: 'Serie Test 2024-2025',
    season: '2024/25',
    category: 'Campionato',
    ranking: [
      { rank: 1, teamName: 'Champion United', coach: 'Coach Champ', managerId: 'm_champ', points: 60.0 },
      { rank: 2, teamName: 'Cup FC', coach: 'Coach Cup', managerId: 'm_cup', points: 50.0 },
      { rank: 3, teamName: 'Neutral Team', coach: 'Coach Neutral', managerId: undefined, points: 40.0 },
      { rank: 4, teamName: 'Banter Stars', coach: 'Coach Banter', managerId: 'm_banter', points: 28.0 }
    ]
  }),
  createTestCompetition({
    id: 102,
    name: 'Coppa Test 2024-2025',
    season: '2024/25',
    category: 'Coppa',
    ranking: [
      { rank: 1, teamName: 'Champion United', coach: 'Coach Champ', managerId: 'm_champ', points: null },
      { rank: 2, teamName: 'Cup FC', coach: 'Coach Cup', managerId: 'm_cup', points: null }
    ]
  }),
  createTestCompetition({
    id: 103,
    name: 'Supercoppa Test 2024-2025',
    season: '2024/25',
    category: 'Supercoppa',
    ranking: [
      { rank: 1, teamName: 'Champion United', coach: 'Coach Champ', managerId: 'm_champ', points: null },
      { rank: 2, teamName: 'Cup FC', coach: 'Coach Cup', managerId: 'm_cup', points: null }
    ]
  }),
  createTestCompetition({
    id: 201,
    name: 'Serie Test 2025-2026',
    season: '2025/26',
    category: 'Campionato',
    ranking: [
      { rank: 1, teamName: 'Champion United', coach: 'Coach Champ', managerId: 'm_champ', points: 65.0 },
      { rank: 2, teamName: 'Cup FC', coach: 'Coach Cup', managerId: 'm_cup', points: 58.0 },
      { rank: 3, teamName: 'Neutral Team', coach: 'Coach Neutral', managerId: undefined, points: 42.0 },
      { rank: 4, teamName: 'Banter Stars', coach: 'Coach Banter', managerId: 'm_banter', points: 25.0 }
    ]
  }),
  createTestCompetition({
    id: 202,
    name: 'Coppa Test 2025-2026',
    season: '2025/26',
    category: 'Coppa',
    ranking: [
      { rank: 1, teamName: 'Cup FC', coach: 'Coach Cup', managerId: 'm_cup', points: null },
      { rank: 2, teamName: 'Champion United', coach: 'Coach Champ', managerId: 'm_champ', points: null }
    ]
  }),
  createTestCompetition({
    id: 301,
    name: 'Serie Test 2026-2027',
    season: '2026/27',
    category: 'Campionato',
    in_progress: true,
    status: 'in_progress',
    ranking: [
      { rank: 1, teamName: 'Champion United', coach: 'Coach Champ', managerId: 'm_champ', points: 0 },
      { rank: 2, teamName: 'Cup FC', coach: 'Coach Cup', managerId: 'm_cup', points: 0 },
      { rank: 3, teamName: 'Rookie Athletic', coach: 'Coach Rookie', managerId: 'm_rookie', points: 0 },
      { rank: 4, teamName: 'Banter Stars', coach: 'Coach Banter', managerId: 'm_banter', points: 0 }
    ]
  })
];

/**
 * Synthetic alias mappings for entity matching parser tests.
 */
export const mockAliases: Record<string, string> = {
  'champ_alias': 'm_champ',
  'cup_alias': 'm_cup',
  'banter_alias': 'm_banter',
  'duo & co': 'm_champ'
};
