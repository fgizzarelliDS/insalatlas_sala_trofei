import type { Manager, CompetitionRecord, LeagueRecord, RecordHolder } from '@/types';
import { resolveManagerRecordCrest } from './helpers';

/**
 * Computes all records in the 'banter' (curiosities & wooden spoons) category:
 * - Mister Camaleonte (most distinct team franchise names)
 * - Wooden spoon collector (most last-place finishes)
 * - Eternal second (most silver medals without / with scudetto)
 */
export function computeBanterRecords(
  managers: Manager[],
  competitions: CompetitionRecord[]
): LeagueRecord[] {
  const records: LeagueRecord[] = [];

  // -------------------------------------------------------------
  // Record 5.1: Mister Camaleonte (Più Nomi Squadra Diversi)
  // -------------------------------------------------------------
  const allChameleons: {
    managerId: string;
    managerName: string;
    distinctNamesCount: number;
    namesList: string[];
    holder: RecordHolder;
  }[] = [];

  managers.forEach(m => {
    const rawNames = (m.history || [])
      .map(h => (h.team || '').trim())
      .filter(t => t.length > 0);

    const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.]/g, '');
    const uniqueMap = new Map<string, string>();
    rawNames.forEach(name => {
      const k = norm(name);
      if (!uniqueMap.has(k) || name.length > uniqueMap.get(k)!.length) {
        uniqueMap.set(k, name);
      }
    });

    const distinct = Array.from(uniqueMap.values());
    if (distinct.length >= 2) {
      const crest = resolveManagerRecordCrest(m.id, undefined, undefined, managers, competitions);
      allChameleons.push({
        managerId: m.id,
        managerName: m.name,
        distinctNamesCount: distinct.length,
        namesList: distinct,
        holder: {
          managerId: m.id,
          managerName: m.name,
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          value: distinct.length,
          formattedValue: `${distinct.length} Franchigie`,
          detail: distinct.join(', ')
        }
      });
    }
  });

  allChameleons.sort((a, b) => b.distinctNamesCount - a.distinctNamesCount);

  if (allChameleons.length > 0) {
    const maxNames = allChameleons[0].distinctNamesCount;
    const topTied = allChameleons.filter(c => c.distinctNamesCount === maxNames);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allChameleons
      .filter(c => c.distinctNamesCount < maxNames)
      .slice(0, 2)
      .map(c => c.holder);

    records.push({
      id: 'chameleon_manager_names',
      title: 'Mister Camaleonte',
      category: 'banter',
      icon: 'fa-solid fa-masks-theater',
      watermark: '🦎',
      badgeLabel: 'Crisi d’Identità',
      badgeColor: 'rose',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'L’allenatore che ha cambiato più denominazioni e stemmi societari nel corso della propria carriera.'
    });
  }

  // -------------------------------------------------------------
  // Record 5.2: Re dei Cucchiai di Legno (Più Ultimi Posti)
  // -------------------------------------------------------------
  const allSpoonCollectors: {
    managerId: string;
    managerName: string;
    spoons: number;
    holder: RecordHolder;
  }[] = [];

  managers.forEach(m => {
    if ((m.spoon || 0) > 0) {
      const crest = resolveManagerRecordCrest(m.id, undefined, undefined, managers, competitions);
      allSpoonCollectors.push({
        managerId: m.id,
        managerName: m.name,
        spoons: m.spoon || 0,
        holder: {
          managerId: m.id,
          managerName: m.name,
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          value: m.spoon || 0,
          formattedValue: `${m.spoon} Cucchiai`,
          detail: `su ${m.years || 1} edizioni disputate`
        }
      });
    }
  });

  allSpoonCollectors.sort((a, b) => b.spoons - a.spoons);

  if (allSpoonCollectors.length > 0) {
    const maxSpoons = allSpoonCollectors[0].spoons;
    const topTied = allSpoonCollectors.filter(s => s.spoons === maxSpoons);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allSpoonCollectors
      .filter(s => s.spoons < maxSpoons)
      .slice(0, 2)
      .map(s => s.holder);

    records.push({
      id: 'wooden_spoon_collector',
      title: 'Re dei Cucchiai di Legno',
      category: 'banter',
      icon: 'fa-solid fa-utensils',
      watermark: '🥄',
      badgeLabel: 'Collezionista di Ceneri',
      badgeColor: 'rose',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'Il recordman di maglie nere e ultimi posti solitari nella classifica finale della Serie Atlas.'
    });
  }

  // -------------------------------------------------------------
  // Record 5.3: L'Eterno Secondo (Più Argenti in Campionato)
  // -------------------------------------------------------------
  const allSilverHolders: {
    managerId: string;
    managerName: string;
    silvers: number;
    holder: RecordHolder;
  }[] = [];

  managers.forEach(m => {
    if ((m.silver || 0) > 0) {
      const crest = resolveManagerRecordCrest(m.id, undefined, undefined, managers, competitions);
      allSilverHolders.push({
        managerId: m.id,
        managerName: m.name,
        silvers: m.silver || 0,
        holder: {
          managerId: m.id,
          managerName: m.name,
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          value: m.silver || 0,
          formattedValue: `${m.silver} Argenti`,
          detail: `${m.gold || 0} Scudetti vinti`
        }
      });
    }
  });

  allSilverHolders.sort((a, b) => b.silvers - a.silvers);

  if (allSilverHolders.length > 0) {
    const maxSilver = allSilverHolders[0].silvers;
    const topTied = allSilverHolders.filter(s => s.silvers === maxSilver);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allSilverHolders
      .filter(s => s.silvers < maxSilver)
      .slice(0, 2)
      .map(s => s.holder);

    records.push({
      id: 'eternal_second',
      title: 'L’Eterno Secondo (Più Argenti in Campionato)',
      category: 'banter',
      icon: 'fa-solid fa-medal',
      watermark: '🥈',
      badgeLabel: 'Maledizione del Podio',
      badgeColor: 'blue',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'L’allenatore che ha sfiorato più volte il tricolore finendo per un soffio sulla piazza d’onore.'
    });
  }

  // -------------------------------------------------------------
  // Record 5.4: L'Eterno Secondo nelle Coppe (Più Finali Perse)
  // -------------------------------------------------------------
  const allCupSilverHolders: {
    managerId: string;
    managerName: string;
    silvers: number;
    holder: RecordHolder;
  }[] = [];

  managers.forEach(m => {
    const cs = m.cup_silver || 0;
    const scs = m.supercup_silver || 0;
    const ms = m.mundialito_silver || 0;
    const totalCupSilvers = cs + scs + ms;

    if (totalCupSilvers > 0) {
      const crest = resolveManagerRecordCrest(m.id, undefined, undefined, managers, competitions);
      const detailParts: string[] = [];
      if (cs > 0) detailParts.push(`${cs} Coppe`);
      if (scs > 0) detailParts.push(`${scs} Supercoppe`);
      if (ms > 0) detailParts.push(`${ms} Mundialiti`);

      allCupSilverHolders.push({
        managerId: m.id,
        managerName: m.name,
        silvers: totalCupSilvers,
        holder: {
          managerId: m.id,
          managerName: m.name,
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          value: totalCupSilvers,
          formattedValue: `${totalCupSilvers} Finali Perse`,
          detail: detailParts.join(', ') || `su ${m.years || 1} edizioni`
        }
      });
    }
  });

  allCupSilverHolders.sort((a, b) => b.silvers - a.silvers);

  if (allCupSilverHolders.length > 0) {
    const maxCupSilver = allCupSilverHolders[0].silvers;
    const topTied = allCupSilverHolders.filter(s => s.silvers === maxCupSilver);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allCupSilverHolders
      .filter(s => s.silvers < maxCupSilver)
      .slice(0, 2)
      .map(s => s.holder);

    records.push({
      id: 'eternal_second_cups',
      title: 'L’Eterno Secondo nelle Coppe',
      category: 'banter',
      icon: 'fa-solid fa-medal',
      watermark: '💔',
      badgeLabel: 'Maledizione di Coppa',
      badgeColor: 'blue',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: 'L’allenatore che ha disputato e perso più finali nelle coppe e tornei ad eliminazione diretta (Coppa di Lega, Supercoppa e Mundialito).'
    });
  }

  // -------------------------------------------------------------
  // Record 5.5: Re del Cartonato 📦 (Titoli Assegnati a Tavolino)
  // -------------------------------------------------------------
  const allCartonatoHolders: {
    managerId: string;
    managerName: string;
    cartonati: number;
    holder: RecordHolder;
  }[] = [];

  managers.forEach(m => {
    if ((m.cartonato || 0) > 0) {
      const crest = resolveManagerRecordCrest(m.id, undefined, undefined, managers, competitions);
      allCartonatoHolders.push({
        managerId: m.id,
        managerName: m.name,
        cartonati: m.cartonato || 0,
        holder: {
          managerId: m.id,
          managerName: m.name,
          teamName: crest.teamName,
          logo: crest.logo,
          fallbackCrest: crest.fallbackCrest,
          value: m.cartonato || 0,
          formattedValue: `${m.cartonato} Cartonati`,
          detail: "L'onta di aver perso la finale dei perdenti"
        }
      });
    }
  });

  allCartonatoHolders.sort((a, b) => b.cartonati - a.cartonati);

  if (allCartonatoHolders.length > 0) {
    const maxCartonati = allCartonatoHolders[0].cartonati;
    const topTied = allCartonatoHolders.filter(c => c.cartonati === maxCartonati);
    const primaryHolders = topTied.map(t => t.holder);
    const runnerUps = allCartonatoHolders
      .filter(c => c.cartonati < maxCartonati)
      .slice(0, 3)
      .map(c => c.holder);

    records.push({
      id: 'cartonato_collector',
      title: 'Re del Cartonato',
      category: 'banter',
      icon: 'fa-solid fa-box-archive',
      watermark: '📦',
      badgeLabel: 'Scudetto di Cartone',
      badgeColor: 'rose',
      primaryHolders,
      primaryHolder: primaryHolders[0],
      runnerUps,
      description: "Il maggior numero di scudetti di cartone conquistati nel tabellone playout / finalina."
    });
  }

  return records;
}
