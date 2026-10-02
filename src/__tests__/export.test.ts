import { describe, it, expect } from 'vitest';
import { computeTradingCardBadges, getManagerInitials, buildTradingCardHTML, buildWhatsAppShareText } from '@/export';
import { Manager } from '@/types';
import { createTestManager } from './test-utils';

describe('export.ts - Trading Card Logic and Formatting', () => {
  describe('getManagerInitials', () => {
    it('extracts two characters for single word names', () => {
      expect(getManagerInitials('Vannico')).toBe('VA');
      expect(getManagerInitials('Alfo')).toBe('AL');
    });

    it('extracts first letters for multi-word or partnered names', () => {
      expect(getManagerInitials('Gigi & Dr.Cholo')).toBe('GD');
      expect(getManagerInitials('Peter & Dani')).toBe('PD');
      expect(getManagerInitials('Marco Rossi')).toBe('MR');
    });
  });

  describe('computeTradingCardBadges', () => {
    it('always includes Archetype and Risk Profile badges', () => {
      const m = createTestManager({ id: '1', name: 'Standard', years: 2 });
      const badges = computeTradingCardBadges(m);

      expect(badges.length).toBeGreaterThanOrEqual(2);
      expect(badges.some(b => b.label.startsWith('Profilo:'))).toBe(true);
      expect(badges.some(b => b.label.startsWith('Rischio:'))).toBe(true);
    });

    it('assigns Veterano della Lega for managers with 6+ years', () => {
      const m = createTestManager({ id: 'vet', name: 'Veteran', years: 7 });
      const badges = computeTradingCardBadges(m);

      expect(badges.some(b => b.label === 'Veterano della Lega')).toBe(true);
    });

    it('assigns Re dei Titoli for managers with 4+ major trophies', () => {
      const m = createTestManager({
        id: 'king',
        name: 'King',
        years: 5,
        gold: 2,
        cup_gold: 1,
        supercup: 1
      });
      const badges = computeTradingCardBadges(m);

      expect(badges.some(b => b.label === 'Re dei Titoli')).toBe(true);
    });

    it('assigns Double Winner when manager has won both Gold and Cup Gold', () => {
      const m = createTestManager({
        id: 'double',
        name: 'Winner',
        years: 4,
        gold: 1,
        cup_gold: 1
      });
      const badges = computeTradingCardBadges(m);

      expect(badges.some(b => b.label === 'Double Winner')).toBe(true);
    });

    it('assigns Incubo Playout for 2+ cartonati and Collezionista Cucchiai for 2+ spoons', () => {
      const m = createTestManager({
        id: 'pl',
        name: 'Unfortunate',
        years: 5,
        spoon: 2,
        cartonato: 2
      });
      const badges = computeTradingCardBadges(m);

      expect(badges.some(b => b.label === 'Incubo Playout')).toBe(true);
      expect(badges.some(b => b.label === 'Collezionista Cucchiai')).toBe(true);
    });
  });

  describe('buildTradingCardHTML', () => {
    it('produces complete HTML structure with trophies and coach banners', () => {
      const m: Manager = createTestManager({
        id: 'champ',
        name: 'Vannico',
        years: 8,
        gold: 3,
        cup_gold: 2,
        supercup: 1,
        mundialito: 1,
        spoon: 0,
        cartonato: 1,
        coach_banners: ['MAZZARRI']
      });

      const html = buildTradingCardHTML(m);

      // Verify essential components
      expect(html).toContain('trading-card');
      expect(html).toContain('VANNICO');
      expect(html).toContain('VA');
      expect(html).toContain('Scudetti');
      expect(html).toContain('Coppe Lega');
      expect(html).toContain('Supercoppe');
      expect(html).toContain('Mundialito');
      expect(html).toContain('Cucchiai Legno');
      expect(html).toContain('Cartonati');
      expect(html).toContain('MAZZARRI');
      expect(html).toContain('InsalAtlas Lega');
    });
  });

  describe('buildWhatsAppShareText', () => {
    it('formats message text with stats, archetype, trophies, and preview link', () => {
      const m: Manager = createTestManager({
        id: 'm_alfo',
        name: 'Alfo',
        years: 4,
        gold: 1,
        silver: 2,
        cup_gold: 0,
        spoon: 0,
        cartonato: 0
      });

      const text = buildWhatsAppShareText(m, 'https://fgizzarellids.github.io/insalatlas_sala_trofei/');

      expect(text).toContain('*ALFO*');
      expect(text).toContain('4 Stagioni');
      expect(text).toContain('Rating Storico:');
      expect(text).toContain('Profilo:');
      expect(text).toContain('🥇 1 Scudetto');
      expect(text).toContain('https://fgizzarellids.github.io/insalatlas_sala_trofei/?manager=m_alfo');
    });
  });

  describe('Deep Linking - findManagerByParam', () => {
    const managers: Manager[] = [
      createTestManager({ id: 'm_peterdani', name: 'Peter & Dani', years: 7 }),
      createTestManager({ id: 'm_alfo', name: 'Alfo', years: 10 }),
      createTestManager({ id: 'm_makako', name: 'Makako', years: 7 })
    ];

    it('matches exact manager ID', async () => {
      const { findManagerByParam } = await import('@/main');
      expect(findManagerByParam('m_peterdani', managers)?.id).toBe('m_peterdani');
      expect(findManagerByParam('m_alfo', managers)?.id).toBe('m_alfo');
    });

    it('matches ID without m_ prefix', async () => {
      const { findManagerByParam } = await import('@/main');
      expect(findManagerByParam('peterdani', managers)?.id).toBe('m_peterdani');
      expect(findManagerByParam('alfo', managers)?.id).toBe('m_alfo');
    });

    it('matches URL-encoded parameters and case-insensitivity', async () => {
      const { findManagerByParam } = await import('@/main');
      expect(findManagerByParam('Peter%20%26%20Dani', managers)?.id).toBe('m_peterdani');
      expect(findManagerByParam('PETERDANI', managers)?.id).toBe('m_peterdani');
      expect(findManagerByParam('peter&dani', managers)?.id).toBe('m_peterdani');
      expect(findManagerByParam('ALFO', managers)?.id).toBe('m_alfo');
    });

    it('returns undefined when no manager matches', async () => {
      const { findManagerByParam } = await import('@/main');
      expect(findManagerByParam('non_existent', managers)).toBeUndefined();
      expect(findManagerByParam('', managers)).toBeUndefined();
    });
  });
});

