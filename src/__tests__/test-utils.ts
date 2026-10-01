import { Manager } from '@/types';

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
    mundialito: 0,
    cartonato: 0,
    ...data
  };
}
