/** Распределение тренировочных дней: выбор структуры недели под уровень, цель и число дней. */
import type { MuscleId, UserProfile } from './types';

export type SplitId = 'full_body_2' | 'full_body_3' | 'upper_lower_full_3' | 'ppl_3' | 'upper_lower_4' | 'ul_ppl_5' | 'ppl_6';

export interface SplitDay { name: string; focus: string; muscles: MuscleId[] }
export interface SplitTemplate {
  id: SplitId;
  name: string;
  days: SplitDay[];
  /** 0 = понедельник. Дни недели подобраны так, чтобы между нагрузкой одних групп было ≥ 48 ч. */
  weekdays: number[];
}

const FULL: MuscleId[] = ['quads', 'hamstrings', 'glutes', 'chest', 'lats', 'upperBack', 'frontDelts', 'sideDelts', 'rearDelts', 'triceps', 'biceps', 'forearms', 'calves', 'core'];
const UPPER: MuscleId[] = ['chest', 'lats', 'upperBack', 'frontDelts', 'sideDelts', 'rearDelts', 'triceps', 'biceps', 'forearms'];
const LOWER: MuscleId[] = ['quads', 'hamstrings', 'glutes', 'calves', 'core'];
const PUSH: MuscleId[] = ['chest', 'frontDelts', 'sideDelts', 'triceps'];
const PULL: MuscleId[] = ['lats', 'upperBack', 'rearDelts', 'biceps', 'forearms'];
const LEGS: MuscleId[] = ['quads', 'hamstrings', 'glutes', 'calves', 'core'];

const fb = (name: string): SplitDay => ({ name, focus: 'Всё тело', muscles: FULL });
const upper = (name = 'Верх тела'): SplitDay => ({ name, focus: 'Грудь, спина, плечи, руки', muscles: UPPER });
const lower = (name = 'Низ тела'): SplitDay => ({ name, focus: 'Ноги, ягодицы, пресс', muscles: LOWER });
const push = (name = 'Push'): SplitDay => ({ name, focus: 'Грудь, плечи, трицепс', muscles: PUSH });
const pull = (name = 'Pull'): SplitDay => ({ name, focus: 'Спина, задние дельты, бицепс', muscles: PULL });
const legs = (name = 'Legs'): SplitDay => ({ name, focus: 'Ноги, ягодицы, пресс', muscles: LEGS });

const SPLITS: Record<SplitId, SplitTemplate> = {
  full_body_2: { id: 'full_body_2', name: 'Всё тело ×2', days: [fb('Всё тело A'), fb('Всё тело B')], weekdays: [0, 3] },
  full_body_3: { id: 'full_body_3', name: 'Всё тело ×3 (A/B/A)', days: [fb('Всё тело A'), fb('Всё тело B'), fb('Всё тело A')], weekdays: [0, 2, 4] },
  upper_lower_full_3: { id: 'upper_lower_full_3', name: 'Верх / Низ / Всё тело', days: [upper(), lower(), fb('Всё тело')], weekdays: [0, 2, 4] },
  ppl_3: { id: 'ppl_3', name: 'Push / Pull / Legs', days: [push(), pull(), legs()], weekdays: [0, 2, 4] },
  upper_lower_4: { id: 'upper_lower_4', name: 'Верх / Низ ×2', days: [upper('Верх A'), lower('Низ A'), upper('Верх B'), lower('Низ B')], weekdays: [0, 1, 3, 4] },
  ul_ppl_5: { id: 'ul_ppl_5', name: 'Верх / Низ + Push / Pull / Legs', days: [upper(), lower(), push(), pull(), legs()], weekdays: [0, 1, 3, 4, 5] },
  ppl_6: { id: 'ppl_6', name: 'Push / Pull / Legs ×2', days: [push('Push A'), pull('Pull A'), legs('Legs A'), push('Push B'), pull('Pull B'), legs('Legs B')], weekdays: [0, 1, 2, 3, 4, 5] },
};

export function getSplit(id: SplitId): SplitTemplate {
  return SPLITS[id];
}

export function chooseSplit(p: UserProfile): { split: SplitTemplate; warnings: string[] } {
  const warnings: string[] = [];
  const pref = p.preferredFormat;
  let id: SplitId;

  switch (p.daysPerWeek) {
    case 2:
      id = 'full_body_2';
      if (pref === 'upper_lower' || pref === 'ppl') warnings.push('При 2 тренировках в неделю оптимален формат «всё тело» — выбран он.');
      break;
    case 3:
      if (pref === 'ppl') id = 'ppl_3';
      else if (pref === 'upper_lower') id = 'upper_lower_full_3';
      else if (pref === 'full_body') id = 'full_body_3';
      else if (p.level === 'beginner' || p.goal === 'general' || p.goal === 'fat_loss') id = 'full_body_3';
      else id = 'upper_lower_full_3';
      break;
    case 4:
      id = 'upper_lower_4';
      if (pref === 'full_body' || pref === 'ppl')
        warnings.push('Для 4 тренировок в неделю подходит формат «верх/низ» — он обеспечивает лучшее восстановление.');
      break;
    case 5:
      id = 'ul_ppl_5';
      if (pref === 'full_body') warnings.push('Для 5 тренировок формат «всё тело» не подходит из-за восстановления — выбран комбинированный сплит.');
      break;
    default:
      id = 'ppl_6';
      if (p.level === 'beginner') warnings.push('Шесть тренировок в неделю для начинающего — высокая нагрузка. Рассмотрите 3–4 дня.');
  }
  return { split: SPLITS[id], warnings };
}
