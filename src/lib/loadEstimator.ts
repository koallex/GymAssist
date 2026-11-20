/**
 * Оценка стартового рабочего веса по анкете. Чистые функции, без React.
 *
 * Идея: 1ПМ ≈ опорная масса × базовое отношение упражнения × уровень × пол × возраст;
 * рабочий вес = 1ПМ / (1 + (повторения + запас) / 30) × коэффициент безопасности (формула Эпли).
 * Это грубая оценка: она нужна для безопасной точки старта и не является измерением силы.
 * После первой записанной тренировки вес берётся из фактических результатов (progressionEngine).
 */
import { LOAD, LOAD_RATIO, LOWER_BODY_MUSCLES } from './loadConfig';
import type { Exercise, PlannedExercise, UserProfile } from './types';

export type LoadKind = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'none';

export interface LoadEstimate {
  weightKg: number;
  kind: Exclude<LoadKind, 'none'>;
  stepKg: number;
  /** Расчётное значение до округления до реального оборудования. */
  rawKg: number;
  /** Расчётный вес ниже минимума для этого снаряда (например, легче пустого грифа). */
  belowMinimum: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Какой тип нагрузки у упражнения (определяет шаг и округление). */
export function loadKind(ex: Exercise): LoadKind {
  if (ex.timed || LOAD_RATIO[ex.id] === undefined) return 'none';
  if (ex.equipment.includes('barbell')) return 'barbell';
  if (ex.equipment.includes('dumbbell')) return 'dumbbell';
  if (ex.equipment.includes('cable')) return 'cable';
  if (ex.equipment.includes('machine')) return 'machine';
  return 'none';
}

/** Минимально возможный вес для типа нагрузки. */
export function minWeightKg(kind: Exclude<LoadKind, 'none'>): number {
  return LOAD.steps[kind].min;
}

/** Шаг изменения веса для данного типа нагрузки при текущем весе. */
export function stepKg(kind: Exclude<LoadKind, 'none'>, weightKg: number): number {
  if (kind === 'dumbbell') {
    const tier = LOAD.steps.dumbbell.tiers.find((t) => weightKg < t.upTo);
    return tier ? tier.step : 2.5;
  }
  return LOAD.steps[kind].step;
}

/** Округление до реального шага оборудования (не ниже минимума). */
export function roundToEquipment(kind: Exclude<LoadKind, 'none'>, weightKg: number): number {
  const min = minWeightKg(kind);
  const step = stepKg(kind, Math.max(weightKg, min));
  const rounded = Math.round(weightKg / step) * step;
  return round1(Math.max(min, rounded));
}

/** Опорная масса, кг: фактический вес, но не выше массы при ИМТ = bmiCap. */
export function referenceMassKg(profile: Pick<UserProfile, 'weightKg' | 'heightCm'>): number {
  const h = profile.heightCm / 100;
  return Math.min(profile.weightKg, LOAD.bmiCap * h * h);
}

export function ageFactor(age: number): number {
  let f: number = LOAD.ageMultiplier[0].factor;
  for (const row of LOAD.ageMultiplier) if (age >= row.minAge) f = row.factor;
  return f;
}

/** Оценка 1ПМ, кг. null — если для упражнения нет числового веса (свой вес, статика). */
export function estimateOneRepMax(profile: UserProfile, ex: Exercise): number | null {
  const ratio = LOAD_RATIO[ex.id];
  if (ratio === undefined || ex.timed) return null;
  const lower = LOWER_BODY_MUSCLES.includes(ex.primary);
  const sex = LOAD.sexMultiplier[profile.sex];
  return (
    referenceMassKg(profile) *
    ratio *
    LOAD.levelStrengthMultiplier[profile.level] *
    (lower ? sex.lower : sex.upper) *
    ageFactor(profile.age)
  );
}

/** Доля от 1ПМ при данном числе повторений и запасе (Эпли). */
export function fractionOfOneRepMax(reps: number, rir: number): number {
  const r = Math.min(reps + rir, LOAD.maxRepsForFormula);
  return 1 / (1 + r / 30);
}

/**
 * Рекомендованный стартовый рабочий вес для запланированного упражнения.
 * Расчёт идёт на нижнюю границу диапазона повторений с запасом из плана — так вес выходит
 * осторожным, а прогресс идёт по схеме двойной прогрессии.
 */
export function estimateWorkingWeight(
  profile: UserProfile,
  ex: Exercise,
  planned: Pick<PlannedExercise, 'repMin' | 'targetRIR' | 'unit'>,
): LoadEstimate | null {
  const kind = loadKind(ex);
  if (kind === 'none' || planned.unit === 'sec') return null;
  const oneRm = estimateOneRepMax(profile, ex);
  if (oneRm === null) return null;

  let raw = oneRm * fractionOfOneRepMax(planned.repMin, planned.targetRIR) * LOAD.startSafetyFactor;
  if (profile.limitations.length > 0) raw *= LOAD.limitationFactor;

  const weightKg = roundToEquipment(kind, raw);
  return {
    weightKg,
    kind,
    stepKg: stepKg(kind, weightKg),
    rawKg: round1(raw),
    belowMinimum: raw < minWeightKg(kind) * 0.8,
  };
}

/** Подпись к полю веса — как именно считать килограммы. */
export function weightHintRu(ex: Exercise): string {
  switch (loadKind(ex)) {
    case 'barbell': return `Общий вес на штанге (гриф ${LOAD.barbellBarKg} кг + блины)`;
    case 'dumbbell': return ex.id === 'db-pullover' || ex.id === 'goblet-squat' || ex.id === 'overhead-db-extension' || ex.id === 'db-hip-thrust'
      ? 'Вес одной гантели (держите обеими руками)'
      : 'Вес каждой гантели';
    case 'cable': return 'Вес по стеку блока';
    case 'machine': return 'Вес по стеку / блинам тренажёра';
    default: return ex.timed ? 'Статическое удержание — вес не нужен' : 'Свой вес (можно добавить отягощение)';
  }
}
