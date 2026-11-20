/**
 * Параметры оценки стартового рабочего веса и адаптации по итогам тренировок.
 * Все числа — ориентиры, а не результаты измерений: оценка нужна, чтобы дать безопасную
 * точку старта; дальше вес определяется тем, что человек реально выполнил (см. progressionEngine).
 *
 * Основание для логики (формулировки ориентиров, не точные цитаты):
 *  - ACSM Position Stand 2026 (Currier et al., MSSE): нагрузку и объём подбирают индивидуально,
 *    тренировка «до отказа» не обязательна, для силы — тяжёлые нагрузки (~80% 1ПМ) в 2–3 подходах,
 *    для гипертрофии — порядка 10 подходов на группу в неделю.
 *  - Связь «повторения в запасе (RIR) → доля от 1ПМ» — формула Эпли, это приближение, а не закон.
 */
import type { MuscleId, Level, Sex } from './types';

export const LOAD = {
  /**
   * Силовые возможности зависят в первую очередь от безжировой массы. Рост используется,
   * чтобы ограничить «опорную массу» уровнем ИМТ: избыточная жировая масса силу не добавляет.
   */
  bmiCap: 27,
  /** Множитель безопасности на первую оценку (вес «с запасом»). */
  startSafetyFactor: 0.85,
  /** Дополнительный множитель, если в анкете указаны травмы/ограничения. */
  limitationFactor: 0.9,
  /** Формула Эпли ненадёжна на длинных подходах: повторы+запас ограничиваются этим значением. */
  maxRepsForFormula: 20,
  /** Вес пустого грифа, кг (минимальная нагрузка для штанговых упражнений). */
  barbellBarKg: 20,
  /**
   * Оценка 1ПМ в таблице — для «нетренированного» взрослого мужчины. Для уровней —
   * множитель к этой базе (соответствует переходу от новичка к «среднему» и «продвинутому»
   * по общеизвестным ориентирам силовых нормативов).
   */
  levelStrengthMultiplier: { beginner: 1, intermediate: 1.6, advanced: 2.4 } as Record<Level, number>,
  /**
   * Поправка по полу в пересчёте на массу тела (верх / низ). Для «не указан» намеренно взяты
   * осторожные значения — лучше начать легче и быстро прибавить, чем взять лишнее.
   */
  sexMultiplier: {
    male: { upper: 1, lower: 1 },
    female: { upper: 0.6, lower: 0.75 },
    unspecified: { upper: 0.6, lower: 0.75 },
  } as Record<Sex, { upper: number; lower: number }>,
  /** Поправка по возрасту (применяется последняя подходящая строка). */
  ageMultiplier: [
    { minAge: 18, factor: 1 },
    { minAge: 40, factor: 0.95 },
    { minAge: 50, factor: 0.88 },
    { minAge: 60, factor: 0.8 },
    { minAge: 70, factor: 0.7 },
  ] as Array<{ minAge: number; factor: number }>,
  /** Шаги и минимумы по типам нагрузки. */
  steps: {
    barbell: { step: 2.5, min: 20 },
    cable: { step: 2.5, min: 5 },
    machine: { step: 2.5, min: 5 },
    /** Гантели: шаг зависит от веса (до 10 кг — 1 кг, до 30 кг — 2 кг, выше — 2,5 кг). */
    dumbbell: { tiers: [{ upTo: 10, step: 1 }, { upTo: 30, step: 2 }, { upTo: Infinity, step: 2.5 }], min: 1 },
  },
} as const;

/** Мышцы «низа» — для поправки по полу. */
export const LOWER_BODY_MUSCLES: readonly MuscleId[] = ['quads', 'hamstrings', 'glutes', 'calves'];

/**
 * Базовое отношение 1ПМ к опорной массе для нетренированного мужчины.
 * Гантели и односторонние упражнения — на одну руку/ногу; блоки и тренажёры — по весу стека
 * (в разных тренажёрах стеки не сопоставимы, поэтому это грубый ориентир).
 * Упражнения без записи (свой вес, статика, тренажёр с помощью) числовой вес не получают.
 */
export const LOAD_RATIO: Readonly<Record<string, number>> = {
  // грудь
  'bench-press': 0.5, 'db-bench-press': 0.2, 'machine-chest-press': 0.45, 'smith-bench-press': 0.45,
  'incline-bb-press': 0.4, 'incline-db-press': 0.17, 'cable-fly': 0.1, 'pec-deck': 0.25,
  // спина
  'lat-pulldown': 0.5, 'straight-arm-pulldown': 0.2, 'db-pullover': 0.2,
  'barbell-row': 0.45, 'seated-cable-row': 0.45, 'chest-supported-row': 0.35, 'db-row': 0.2, 'db-shrug': 0.3,
  // плечи
  'overhead-press': 0.35, 'db-shoulder-press': 0.14, 'machine-shoulder-press': 0.3,
  'front-raise': 0.07, 'db-lateral-raise': 0.09, 'cable-lateral-raise': 0.06, 'machine-lateral-raise': 0.2,
  'face-pull': 0.2, 'reverse-pec-deck': 0.25, 'db-reverse-fly': 0.06,
  // руки
  'db-curl': 0.14, 'bb-curl': 0.25, 'hammer-curl': 0.16, 'cable-curl': 0.28, 'incline-db-curl': 0.1,
  'cable-pushdown': 0.3, 'overhead-db-extension': 0.2, 'skull-crusher': 0.2, 'close-grip-bench': 0.4,
  'wrist-curl': 0.1, 'reverse-curl': 0.15,
  // ноги и ягодицы
  'back-squat': 0.75, 'front-squat': 0.55, 'goblet-squat': 0.3, 'leg-press': 1.2, 'hack-squat': 0.9,
  'smith-squat': 0.65, 'bulgarian-split-squat': 0.14, 'db-lunge': 0.15, 'leg-extension': 0.45,
  'romanian-deadlift': 0.7, 'db-rdl': 0.22, deadlift: 1, 'seated-leg-curl': 0.3, 'lying-leg-curl': 0.28,
  'hip-thrust': 0.8, 'db-hip-thrust': 0.5, 'cable-kickback': 0.12, 'hip-abduction': 0.4,
  'standing-calf-raise': 0.7, 'seated-calf-raise': 0.4, 'db-calf-raise': 0.2,
  // кор
  'cable-crunch': 0.3, 'pallof-press': 0.1,
};

/** Параметры адаптации плана по результатам тренировок. */
export const ADAPT = {
  /** Снижение рабочего веса, если упражнение было слишком тяжёлым (не хватило повторов). */
  deloadStruggle: 0.05,
  /** Снижение рабочего веса, если пользователь отметил «слишком тяжело». */
  deloadTooHard: 0.1,
  /** Снижение веса в упражнениях, нагружающих сустав, где был дискомфорт. */
  deloadDiscomfort: 0.1,
  /** Доля упражнений дня, где временно убирается 1 подход после тяжёлой/невыполненной тренировки. */
  trimShare: 0.34,
  /** Добавка к отдыху между подходами при временном снижении объёма, сек. */
  restBonusSec: 15,
  /** Добавка к «запасу повторений» при временном снижении объёма. */
  rirBonus: 1,
  /** Доля выполненных подходов, с которой тренировка считается «почти полностью» (для подсказки в опросе). */
  mostlyThreshold: 0.7,
} as const;
