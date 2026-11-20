/**
 * Все числовые параметры алгоритма. Меняйте значения здесь —
 * логику генератора переписывать не нужно.
 *
 * Объём измеряется в «эффективных подходах»: прямой подход = 1,
 * косвенная нагрузка в многосуставных упражнениях = доля из карточки упражнения (0.3–0.5).
 * Значения — ориентиры, основанные на общепринятых рекомендациях по силовым тренировкам
 * (≈ 8–20 жёстких подходов на мышечную группу в неделю, частота 2×/нед для большинства групп),
 * а не точные физиологические измерения.
 */
import type { Equipment, Goal, Level, MuscleId } from './types';

export const CONFIG_VERSION = '1.0.0';

export const ALGO = {
  /** Минимум подходов на упражнение. */
  minDirectSets: 2,
  /** Максимум подходов на одно упражнение. */
  maxSetsPerExercise: 5,
  /** Минимальный остаток объёма за день, при котором добавляется прямая работа. */
  minRemainingToAdd: 1,
  /** Косвенная нагрузка засчитывается не более чем на эту долю дневной цели мышцы. */
  indirectCreditCap: 0.5,
  /** Минимум подходов мышцы в один день (иначе объём собирается в меньшее число дней). */
  minDaySets: 2,
  /** Не более N упражнений с утомлением 3 (приседания, становая) в день. */
  maxHighFatiguePerDay: 1,
  warmupMinutes: 6,
  transitionSec: 75,
  workSecPerSet: { compound: 50, isolation: 35 },
  timedHold: { min: 30, max: 60, restSec: 45 },
  repCap: 15,
  highRep: { min: 12, span: 6, cap: 25 },
  /** Верхняя граница недельных ПРЯМЫХ подходов: target * factor + bonus. */
  weeklyCeilingFactor: 1.6,
  weeklyCeilingBonus: 2,
  /** Жёсткий потолок эффективного объёма (прямой + косвенный): базовая цель уровня * factor + bonus. */
  hardCapFactor: 2,
  hardCapBonus: 2,
  /** Если фактический объём < threshold * цель — предупреждение. */
  lowCoverageThreshold: 0.6,
} as const;

export interface LevelConfig {
  maxDifficulty: 1 | 2 | 3;
  maxCompoundPerMuscle: number;
  maxExercisesPerMuscleDay: number;
  /** Потолок эффективных подходов на мышцу за одну тренировку. */
  maxSessionEffectiveSets: number;
  rirCompound: number;
  rirIsolation: number;
  /** Сдвиг диапазона повторений. */
  repShift: number;
  restBonusSec: number;
  /** Штраф к рангу за повтор упражнения на неделе (разнообразие). */
  repeatPenalty: { compound: number; isolation: number };
  /** Бонус/штраф к рангу по типу оборудования (меньше = предпочтительнее). */
  equipmentBias: Partial<Record<Equipment, number>>;
  specializationMultiplier: number;
  /** Сколько тренировок подряд нужно закрыть верх диапазона, чтобы поднять вес. */
  sessionsAtTopToProgress: number;
}

export const LEVELS: Record<Level, LevelConfig> = {
  beginner: {
    maxDifficulty: 1, maxCompoundPerMuscle: 1, maxExercisesPerMuscleDay: 2,
    maxSessionEffectiveSets: 6, rirCompound: 3, rirIsolation: 3,
    repShift: 2, restBonusSec: 0,
    repeatPenalty: { compound: 0, isolation: 0.4 },
    equipmentBias: { machine: -0.5, barbell: 0.5, bodyweight: 0.3 },
    specializationMultiplier: 1, sessionsAtTopToProgress: 1,
  },
  intermediate: {
    maxDifficulty: 2, maxCompoundPerMuscle: 2, maxExercisesPerMuscleDay: 3,
    maxSessionEffectiveSets: 8, rirCompound: 2, rirIsolation: 1,
    repShift: 0, restBonusSec: 0,
    repeatPenalty: { compound: 0.8, isolation: 1.2 },
    equipmentBias: { barbell: -0.3 },
    specializationMultiplier: 1, sessionsAtTopToProgress: 2,
  },
  advanced: {
    maxDifficulty: 3, maxCompoundPerMuscle: 2, maxExercisesPerMuscleDay: 3,
    maxSessionEffectiveSets: 10, rirCompound: 2, rirIsolation: 0,
    repShift: 0, restBonusSec: 0,
    repeatPenalty: { compound: 0.8, isolation: 1.2 },
    equipmentBias: { barbell: -0.3 },
    specializationMultiplier: 1.3, sessionsAtTopToProgress: 2,
  },
};

export interface GoalConfig {
  /** Множитель недельного объёма. */
  volumeMultiplier: number;
  /** Дополнительный множитель для малых групп (руки, дельты, икры, кор). */
  accessoryMultiplier: number;
  /** Доля многосуставных упражнений среди упражнений на мышцу. */
  compoundShare: number;
  /** Желаемое число подходов на упражнение. */
  setsPerExercise: number;
  compound: { reps: [number, number]; restSec: number };
  isolation: { reps: [number, number]; restSec: number };
  /** Повторять базовые упражнения в течение недели (отработка техники). */
  repeatCompounds: boolean;
  /** Бонус к рангу для «больших» движений (присед, жим, становая, подтягивания). */
  mainLiftBonus: number;
  progression: { upperKg: number; lowerKg: number; isolationKg: number };
}

export const GOALS: Record<Goal, GoalConfig> = {
  hypertrophy: {
    volumeMultiplier: 1, accessoryMultiplier: 1, compoundShare: 0.6, setsPerExercise: 3,
    compound: { reps: [6, 10], restSec: 120 }, isolation: { reps: [10, 15], restSec: 75 },
    repeatCompounds: false, mainLiftBonus: 0,
    progression: { upperKg: 2.5, lowerKg: 5, isolationKg: 1.25 },
  },
  strength: {
    volumeMultiplier: 0.85, accessoryMultiplier: 0.75, compoundShare: 0.8, setsPerExercise: 4,
    compound: { reps: [3, 6], restSec: 180 }, isolation: { reps: [6, 10], restSec: 90 },
    repeatCompounds: true, mainLiftBonus: -1.5,
    progression: { upperKg: 2.5, lowerKg: 5, isolationKg: 1.25 },
  },
  fat_loss: {
    volumeMultiplier: 0.85, accessoryMultiplier: 0.9, compoundShare: 0.7, setsPerExercise: 3,
    compound: { reps: [8, 12], restSec: 75 }, isolation: { reps: [12, 15], restSec: 45 },
    repeatCompounds: false, mainLiftBonus: 0,
    progression: { upperKg: 2.5, lowerKg: 5, isolationKg: 1.25 },
  },
  recomposition: {
    volumeMultiplier: 0.95, accessoryMultiplier: 1, compoundShare: 0.65, setsPerExercise: 3,
    compound: { reps: [6, 10], restSec: 90 }, isolation: { reps: [10, 15], restSec: 60 },
    repeatCompounds: false, mainLiftBonus: 0,
    progression: { upperKg: 2.5, lowerKg: 5, isolationKg: 1.25 },
  },
  general: {
    volumeMultiplier: 0.75, accessoryMultiplier: 0.8, compoundShare: 0.75, setsPerExercise: 3,
    compound: { reps: [8, 12], restSec: 90 }, isolation: { reps: [10, 15], restSec: 60 },
    repeatCompounds: true, mainLiftBonus: 0,
    progression: { upperKg: 2.5, lowerKg: 5, isolationKg: 1.25 },
  },
};

export interface MuscleConfig {
  kind: 'large' | 'small';
  /** Порядок обработки в тренировке (крупные многосуставные — раньше). */
  order: number;
  /** Чем больше, тем раньше сокращается при нехватке времени. */
  trimPriority: number;
  /** Минимальный интервал между тренировками этой группы, дней. */
  minGapDays: number;
  /** Недельная цель, эффективных подходов, по уровням. */
  weeklySets: Record<Level, number>;
}

export const MUSCLE_CONFIG: Record<MuscleId, MuscleConfig> = {
  quads:      { kind: 'large', order: 1,  trimPriority: 1,  minGapDays: 2, weeklySets: { beginner: 8, intermediate: 12, advanced: 16 } },
  hamstrings: { kind: 'large', order: 2,  trimPriority: 3,  minGapDays: 2, weeklySets: { beginner: 6, intermediate: 10, advanced: 14 } },
  glutes:     { kind: 'large', order: 3,  trimPriority: 3,  minGapDays: 2, weeklySets: { beginner: 4, intermediate: 8,  advanced: 12 } },
  chest:      { kind: 'large', order: 4,  trimPriority: 2,  minGapDays: 2, weeklySets: { beginner: 8, intermediate: 12, advanced: 16 } },
  lats:       { kind: 'large', order: 5,  trimPriority: 2,  minGapDays: 2, weeklySets: { beginner: 8, intermediate: 12, advanced: 16 } },
  upperBack:  { kind: 'large', order: 6,  trimPriority: 3,  minGapDays: 2, weeklySets: { beginner: 6, intermediate: 10, advanced: 14 } },
  frontDelts: { kind: 'small', order: 7,  trimPriority: 9,  minGapDays: 1, weeklySets: { beginner: 4, intermediate: 6,  advanced: 8 } },
  sideDelts:  { kind: 'small', order: 8,  trimPriority: 5,  minGapDays: 1, weeklySets: { beginner: 4, intermediate: 8,  advanced: 14 } },
  rearDelts:  { kind: 'small', order: 9,  trimPriority: 6,  minGapDays: 1, weeklySets: { beginner: 4, intermediate: 6,  advanced: 10 } },
  triceps:    { kind: 'small', order: 10, trimPriority: 5,  minGapDays: 1, weeklySets: { beginner: 4, intermediate: 8,  advanced: 12 } },
  biceps:     { kind: 'small', order: 11, trimPriority: 5,  minGapDays: 1, weeklySets: { beginner: 4, intermediate: 8,  advanced: 12 } },
  forearms:   { kind: 'small', order: 12, trimPriority: 10, minGapDays: 1, weeklySets: { beginner: 0, intermediate: 4,  advanced: 6 } },
  calves:     { kind: 'small', order: 13, trimPriority: 7,  minGapDays: 1, weeklySets: { beginner: 4, intermediate: 8,  advanced: 12 } },
  core:       { kind: 'small', order: 14, trimPriority: 7,  minGapDays: 1, weeklySets: { beginner: 4, intermediate: 6,  advanced: 8 } },
};

export interface AgeAdjustment {
  volumeMultiplier: number;
  rirBonus: number;
  restBonusSec: number;
  maxDifficulty?: 1 | 2 | 3;
}

/** Поправки по возрасту (применяется последняя подходящая строка). */
export const AGE_ADJUSTMENTS: Array<{ minAge: number } & AgeAdjustment> = [
  { minAge: 18, volumeMultiplier: 1, rirBonus: 0, restBonusSec: 0 },
  { minAge: 50, volumeMultiplier: 0.9, rirBonus: 1, restBonusSec: 15 },
  { minAge: 65, volumeMultiplier: 0.8, rirBonus: 1, restBonusSec: 30, maxDifficulty: 2 },
];

export function ageAdjustment(age: number): AgeAdjustment {
  let result: AgeAdjustment = AGE_ADJUSTMENTS[0];
  for (const row of AGE_ADJUSTMENTS) if (age >= row.minAge) result = row;
  return result;
}

export const PROFILE_LIMITS = {
  age: { min: 18, max: 80 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 35, max: 250 },
} as const;
