/** Мышечные группы: названия, структура, шаблоны подбора упражнений. */
import type { MovementPattern, MuscleId } from './types';
export { MUSCLE_IDS } from './types';

export const MUSCLE_LABELS_RU: Record<MuscleId, string> = {
  chest: 'Грудные',
  lats: 'Широчайшие',
  upperBack: 'Верх спины и трапеции',
  frontDelts: 'Передние дельты',
  sideDelts: 'Средние дельты',
  rearDelts: 'Задние дельты',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  forearms: 'Предплечья',
  quads: 'Квадрицепсы',
  hamstrings: 'Бицепс бедра',
  glutes: 'Ягодичные',
  calves: 'Икры',
  core: 'Кор и пресс',
};

export const MUSCLE_REGION: Record<MuscleId, 'push' | 'pull' | 'legs' | 'core'> = {
  chest: 'push', frontDelts: 'push', sideDelts: 'push', triceps: 'push',
  lats: 'pull', upperBack: 'pull', rearDelts: 'pull', biceps: 'pull', forearms: 'pull',
  quads: 'legs', hamstrings: 'legs', glutes: 'legs', calves: 'legs',
  core: 'core',
};

/** Синергисты — какие группы заметно включаются при работе мышцы (для справки и подсказок UI). */
export const MUSCLE_SYNERGISTS: Partial<Record<MuscleId, MuscleId[]>> = {
  chest: ['frontDelts', 'triceps'],
  lats: ['biceps', 'upperBack', 'forearms'],
  upperBack: ['rearDelts', 'biceps', 'lats'],
  frontDelts: ['triceps', 'sideDelts'],
  quads: ['glutes'],
  hamstrings: ['glutes', 'upperBack'],
  glutes: ['hamstrings', 'quads'],
};

/**
 * Шаблоны выбора упражнений на мышцу.
 * compound/isolation — упорядоченные списки паттернов; при повторной тренировке
 * мышцы в течение недели список вращается (жим лёжа → жим на наклонной и т.д.).
 */
export const MUSCLE_SLOTS: Record<MuscleId, { compound: MovementPattern[]; isolation: MovementPattern[] }> = {
  chest:      { compound: ['horizontal_push', 'incline_push'], isolation: ['chest_fly'] },
  lats:       { compound: ['vertical_pull'], isolation: ['lat_isolation'] },
  upperBack:  { compound: ['horizontal_pull'], isolation: ['shrug'] },
  frontDelts: { compound: ['vertical_push'], isolation: ['front_raise'] },
  sideDelts:  { compound: [], isolation: ['lateral_raise'] },
  rearDelts:  { compound: [], isolation: ['rear_delt_fly'] },
  biceps:     { compound: [], isolation: ['elbow_flexion'] },
  triceps:    { compound: [], isolation: ['elbow_extension'] },
  forearms:   { compound: [], isolation: ['wrist', 'carry'] },
  quads:      { compound: ['squat', 'lunge'], isolation: ['leg_extension'] },
  hamstrings: { compound: ['hinge'], isolation: ['leg_curl'] },
  glutes:     { compound: ['hip_thrust'], isolation: ['glute_iso'] },
  calves:     { compound: [], isolation: ['calf_raise'] },
  core:       { compound: [], isolation: ['core_flexion', 'core_stability'] },
};
