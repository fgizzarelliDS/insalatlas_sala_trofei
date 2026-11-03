import { describe, it, expect } from 'vitest';
import { computeTieredManagerBadges, computeManagerBadgeScoreboard } from '@/analytics/badges';
import type { Manager } from '@/types';

describe('Tiered Badges & Hall of Fame Engine', () => {
  const mockManagerA: Manager = {
    id: 'm_alpha',
    name: 'Alpha Manager',
    years: 10,
    gold: 3,
    silver: 2,
    bronze: 1,
    cup_gold: 2,
    cup_silver: 1,
    supercup: 2,
    supercup_silver: 0,
    mundialito: 1,
    mundialito_silver: 0,
    spoon: 1,
    cartonato: 0,
    history: [
      { season: '2016/17', team: 'Team A', rank: 1, points: 65, competitionId: 1, achievements: [] },
      { season: '2017/18', team: 'Team A', rank: 2, points: 58, competitionId: 2, achievements: [] },
      { season: '2018/19', team: 'Team A', rank: 3, points: 55, competitionId: 3, achievements: [] },
      { season: '2019/20', team: 'Team A', rank: 1, points: 62, competitionId: 4, achievements: [] },
      { season: '2020/21', team: 'Team A', rank: 4, points: 48, competitionId: 5, achievements: [] },
      { season: '2021/22', team: 'Team A', rank: 2, points: 59, competitionId: 6, achievements: [] },
      { season: '2022/23', team: 'Team A', rank: 1, points: 68, competitionId: 7, achievements: [] },
      { season: '2023/24', team: 'Team A', rank: 5, points: 42, competitionId: 8, achievements: [] },
      { season: '2024/25', team: 'Team A', rank: 8, points: 35, competitionId: 9, achievements: [] },
      { season: '2025/26', team: 'Team A', rank: 10, points: 28, competitionId: 10, achievements: [] }
    ]
  };

  const mockManagerB: Manager = {
    id: 'm_beta',
    name: 'Beta Manager',
    years: 4,
    gold: 0,
    silver: 1,
    bronze: 0,
    cup_gold: 0,
    cup_silver: 0,
    supercup: 0,
    supercup_silver: 0,
    mundialito: 0,
    mundialito_silver: 0,
    spoon: 2,
    cartonato: 3,
    history: [
      { season: '2022/23', team: 'Team B', rank: 8, points: 30, competitionId: 7, achievements: [] },
      { season: '2023/24', team: 'Team B', rank: 10, points: 25, competitionId: 8, achievements: [] },
      { season: '2024/25', team: 'Team B', rank: 12, points: 18, competitionId: 9, achievements: [] },
      { season: '2025/26', team: 'Team B', rank: 2, points: 56, competitionId: 10, achievements: [] }
    ]
  };

  const allManagers = [mockManagerA, mockManagerB];

  describe('computeTieredManagerBadges', () => {
    it('computes 8 distinct badges', () => {
      const badges = computeTieredManagerBadges(mockManagerA, allManagers);
      expect(badges.length).toBe(8);
      const ids = badges.map(b => b.id);
      expect(ids).toEqual([
        'bacheca_reale',
        'continuita_dinastica',
        'maratoneta',
        'mille_punti',
        'duellante_eccelso',
        'collezionista_cucchiai',
        'incubo_playout',
        'muro_acciaio'
      ]);
    });

    it('evaluates Bacheca Reale (Platinum for 8 major titles: 3 gold + 2 cup + 2 supercup + 1 mundialito)', () => {
      const badges = computeTieredManagerBadges(mockManagerA, allManagers);
      const bacheca = badges.find(b => b.id === 'bacheca_reale')!;
      expect(bacheca.currentValue).toBe(8);
      expect(bacheca.tier).toBe('platinum');
      expect(bacheca.isUnlocked).toBe(true);
      expect(bacheca.pointsScore).toBe(10);
      expect(bacheca.progressPercent).toBe(100);
    });

    it('evaluates Continuità Dinastica podium streak (Gold for 4 consecutive podiums)', () => {
      // 2016/17 (1), 2017/18 (2), 2018/19 (3), 2019/20 (1) -> streak of 4
      const badges = computeTieredManagerBadges(mockManagerA, allManagers);
      const streak = badges.find(b => b.id === 'continuita_dinastica')!;
      expect(streak.currentValue).toBe(4);
      expect(streak.tier).toBe('gold');
      expect(streak.currentTier).toBe('gold');
      expect(streak.nextTier).toBe('platinum');
      expect(streak.pointsScore).toBe(5);
    });

    it('evaluates Maratoneta de Lega (Gold for 10 seasons, target 12 for platinum)', () => {
      const badges = computeTieredManagerBadges(mockManagerA, allManagers);
      const maratona = badges.find(b => b.id === 'maratoneta')!;
      expect(maratona.currentValue).toBe(10);
      expect(maratona.tier).toBe('gold');
      expect(maratona.nextTier).toBe('platinum');
      expect(maratona.pointsScore).toBe(5);
    });

    it('evaluates Club dei Punti (Gold for 520 total points)', () => {
      const badges = computeTieredManagerBadges(mockManagerA, allManagers);
      const punti = badges.find(b => b.id === 'mille_punti')!;
      expect(punti.currentValue).toBe(520);
      expect(punti.tier).toBe('gold');
      expect(punti.nextTier).toBe('platinum');
      expect(punti.nextTargetValue).toBe(550);
      expect(punti.pointsScore).toBe(5);
    });

    it('evaluates Maestro dei Duelli (Head to head relative season duels)', () => {
      // Shared seasons: 2022/23 (A:1, B:8 -> A wins), 2023/24 (A:5, B:10 -> A wins), 2024/25 (A:8, B:12 -> A wins), 2025/26 (A:10, B:2 -> B wins)
      // Manager A has 3 duel wins against B
      const badgesA = computeTieredManagerBadges(mockManagerA, allManagers);
      const duelsA = badgesA.find(b => b.id === 'duellante_eccelso')!;
      expect(duelsA.currentValue).toBe(3);
      expect(duelsA.tier).toBe('locked');
      expect(duelsA.nextTier).toBe('bronze');
      expect(duelsA.targetValue).toBe(15);
      expect(duelsA.pointsScore).toBe(0);

      const badgesB = computeTieredManagerBadges(mockManagerB, allManagers);
      const duelsB = badgesB.find(b => b.id === 'duellante_eccelso')!;
      expect(duelsB.currentValue).toBe(1);
    });

    it('evaluates Collezionista Cucchiai & Incubo Playout (Bronze & Gold on Manager B)', () => {
      const badgesB = computeTieredManagerBadges(mockManagerB, allManagers);
      const spoon = badgesB.find(b => b.id === 'collezionista_cucchiai')!;
      expect(spoon.currentValue).toBe(2);
      expect(spoon.tier).toBe('silver');
      expect(spoon.pointsScore).toBe(3);

      const playout = badgesB.find(b => b.id === 'incubo_playout')!;
      expect(playout.currentValue).toBe(3);
      expect(playout.tier).toBe('gold');
      expect(playout.pointsScore).toBe(5);
    });

    it('keeps Muro d Acciaio as locked placeholder awaiting historical digitisation', () => {
      const badges = computeTieredManagerBadges(mockManagerA, allManagers);
      const muro = badges.find(b => b.id === 'muro_acciaio')!;
      expect(muro.isPlaceholder).toBe(true);
      expect(muro.isUnlocked).toBe(false);
      expect(muro.tier).toBe('locked');
      expect(muro.tierLabel).toBe('In Arrivo');
      expect(muro.pointsScore).toBe(0);
    });
  });

  describe('computeManagerBadgeScoreboard', () => {
    it('computes total badge score and ranks managers properly', () => {
      const scoreboard = computeManagerBadgeScoreboard(allManagers);
      expect(scoreboard.length).toBe(2);
      expect(scoreboard[0].managerId).toBe('m_alpha');
      // Alpha: Bacheca (10) + Continuità (5) + Maratoneta (5) + Punti (5) + Duelli (0) + Spoon (1) + Playout (0) + Muro (0) = 26 pt
      expect(scoreboard[0].totalScore).toBe(26);
      expect(scoreboard[0].platinumCount).toBe(1);
      expect(scoreboard[0].goldCount).toBe(3);
      expect(scoreboard[0].bronzeCount).toBe(1);

      expect(scoreboard[1].managerId).toBe('m_beta');
      expect(scoreboard[1].totalScore).toBeLessThan(scoreboard[0].totalScore);
    });
  });
});
