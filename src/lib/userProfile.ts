/** Параметры пользователя: значения по умолчанию, нормализация, проверка. */
import { PROFILE_LIMITS } from './config';
import { EQUIPMENT_IDS, JOINT_TAGS, MUSCLE_IDS, type UserProfile } from './types';

export const DEFAULT_PROFILE: UserProfile = {
  sex: 'unspecified',
  age: 30,
  heightCm: 175,
  weightKg: 75,
  level: 'beginner',
  goal: 'general',
  daysPerWeek: 3,
  sessionMinutes: 60,
  preferredFormat: 'auto',
  availableEquipment: [...EQUIPMENT_IDS],
  excludedExerciseIds: [],
  limitations: [],
  priorityMuscles: [],
};

const uniqSorted = <T extends string>(arr: readonly T[]): T[] => [...new Set(arr)].sort();

/** Приводит профиль к каноническому виду (детерминизм: порядок массивов не влияет на результат). */
export function normalizeProfile(input: Partial<UserProfile>): UserProfile {
  const p = { ...DEFAULT_PROFILE, ...input };
  const equipment = uniqSorted(p.availableEquipment.filter((e) => EQUIPMENT_IDS.includes(e)));
  if (!equipment.includes('bodyweight')) equipment.push('bodyweight');
  return {
    ...p,
    // Значения вне допустимых диапазонов НЕ подгоняются: их отклоняет validateProfile (например, возраст < 18).
    age: Math.round(p.age),
    heightCm: Math.round(p.heightCm),
    weightKg: Math.round(p.weightKg * 10) / 10,
    availableEquipment: uniqSorted(equipment),
    excludedExerciseIds: uniqSorted(p.excludedExerciseIds),
    limitations: uniqSorted(p.limitations.filter((j) => JOINT_TAGS.includes(j))),
    priorityMuscles: uniqSorted(p.priorityMuscles.filter((m) => MUSCLE_IDS.includes(m))),
  };
}

export interface ProfileValidation { errors: string[]; warnings: string[] }

export function validateProfile(p: UserProfile): ProfileValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const L = PROFILE_LIMITS;
  if (p.age < L.age.min) errors.push('Приложение предназначено для совершеннолетних пользователей.');
  if (p.age > L.age.max) warnings.push('При возрасте старше 80 лет обязательно согласуйте тренировки с врачом.');
  if (p.heightCm < L.heightCm.min || p.heightCm > L.heightCm.max) errors.push('Рост вне допустимого диапазона.');
  if (p.weightKg < L.weightKg.min || p.weightKg > L.weightKg.max) errors.push('Вес вне допустимого диапазона.');
  if (![2, 3, 4, 5, 6].includes(p.daysPerWeek)) errors.push('Количество тренировок в неделю — от 2 до 6.');
  if (p.age >= 50) warnings.push('После 50 лет рекомендуем проконсультироваться с врачом перед началом программы.');
  if (p.level === 'beginner' && p.daysPerWeek >= 5)
    warnings.push('Начинающим обычно достаточно 3–4 тренировок в неделю: больше — выше риск недовосстановления.');
  if (p.level !== 'advanced' && p.priorityMuscles.length > 0)
    warnings.push('Специализация на группах доступна только для продвинутого уровня и пока не применена.');
  return { errors, warnings };
}
