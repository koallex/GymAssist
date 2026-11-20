/**
 * progressionEngine — адаптация плана по фактическим результатам и опросу после тренировки.
 * Чистые детерминированные функции, без React. Базовый план не изменяется: адаптация
 * вычисляется заново из (план + история), поэтому результат воспроизводим и проверяем тестами.
 *
 * Модель — двойная прогрессия: сначала растут повторения внутри диапазона, и когда во всех
 * подходах достигнут верх диапазона — вес увеличивается малым шагом. Опрос корректирует решение:
 *  - «слишком тяжело» или нехватка повторов → вес снижается;
 *  - «тяжело» → вес сохраняется, прогресс не засчитывается;
 *  - «легко» → прогресс засчитывается быстрее;
 *  - тренировка не доделана → вес сохраняется;
 *  - дискомфорт в суставе → вес в упражнениях на этот сустав снижается, показывается предупреждение;
 *  - после тяжёлой/недоделанной тренировки объём временно снижается на 1 подход, отдых увеличивается.
 */
import { ALGO } from './config';
import { computeWeeklyVolume } from './analytics';
import { getExercise } from './exerciseDatabase';
import { ADAPT, LOWER_BODY_MUSCLES } from './loadConfig';
import {
  estimateWorkingWeight, loadKind, minWeightKg, roundToEquipment, stepKg, type LoadKind,
} from './loadEstimator';
import { estimateMinutes } from './workoutGenerator';
import {
  MUSCLE_IDS,
  type CompletionLevel, type Exercise, type LoggedExercise, type MuscleId, type PerceivedDifficulty,
  type PlanDay, type PlannedExercise, type ProgressionRule, type UserProfile, type WorkoutPlan,
  type WorkoutSession,
} from './types';

export interface ExerciseTarget {
  exerciseId: string;
  /** Рекомендуемый рабочий вес; null — вес не назначается (свой вес, статика). */
  weightKg: number | null;
  /** history — по прошлым тренировкам; estimate — стартовая оценка по анкете; none — без веса. */
  source: 'history' | 'estimate' | 'none';
  /** Шаг изменения веса для кнопок «−/+» (0 — вес не регулируется шагом). */
  stepKg: number;
  /** Короткое пояснение, откуда взят вес и что изменилось. */
  reason: string;
  /** Что было в прошлый раз, например «22,5 кг × 10, 10, 9». */
  lastPerformance: string | null;
  /** В последней тренировке с этим упражнением был дискомфорт в связанном суставе. */
  discomfort: boolean;
}

export interface AdaptedProgram {
  /** План с учётом временной коррекции объёма (исходный план не изменяется). */
  plan: WorkoutPlan;
  targets: Record<string, ExerciseTarget>;
  /** 0 — объём как в плане; −1 — временно снижен. */
  volumeShift: 0 | -1;
  notes: string[];
}

export const DIFFICULTY_LABELS_RU: Record<PerceivedDifficulty, string> = {
  easy: 'Было легко',
  right: 'В самый раз',
  hard: 'Тяжело',
  too_hard: 'Слишком тяжело',
};

export const COMPLETION_LABELS_RU: Record<CompletionLevel, string> = {
  full: 'Да, в полном объёме',
  mostly: 'Почти весь объём',
  partial: 'Нет, сделал(а) меньше',
};

/** Предзаполнение вопроса «выполнена ли тренировка» по доле отмеченных подходов. */
export function inferCompletion(done: number, total: number): CompletionLevel {
  if (total <= 0) return 'partial';
  if (done >= total) return 'full';
  return done / total >= ADAPT.mostlyThreshold ? 'mostly' : 'partial';
}

const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Хронологический порядок (старые → новые), только завершённые; не зависит от порядка во входе. */
function chronological(history: readonly WorkoutSession[]): WorkoutSession[] {
  return history
    .filter((s) => s.completed)
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const ka = a.s.finishedAt ?? a.s.startedAt;
      const kb = b.s.finishedAt ?? b.s.startedAt;
      return ka < kb ? -1 : ka > kb ? 1 : a.i - b.i;
    })
    .map((x) => x.s);
}

function incrementKg(ex: Exercise, kind: Exclude<LoadKind, 'none'>, weight: number, rule: ProgressionRule): number {
  const base =
    ex.category === 'isolation'
      ? rule.incrementKg.isolation
      : LOWER_BODY_MUSCLES.includes(ex.primary) ? rule.incrementKg.lower : rule.incrementKg.upper;
  // Нельзя прибавить меньше, чем позволяет оборудование.
  return Math.max(base, stepKg(kind, weight));
}

function formatPerformance(le: LoggedExercise): string | null {
  const done = le.sets.filter((s) => s.completed);
  if (done.length === 0) return null;
  const reps = done.map((s) => s.reps ?? le.plannedRepMin);
  const weights = done.map((s) => s.weightKg).filter((w): w is number => w != null && w > 0);
  const unit = le.unit === 'sec' ? ' с' : '';
  const repsText = reps.join(', ') + unit;
  if (weights.length === 0) return repsText;
  const same = weights.every((w) => w === weights[0]);
  return same ? `${fmt(weights[0])} кг × ${repsText}` : `${weights.map(fmt).join('/')} кг × ${repsText}`;
}

interface ReplayState {
  weight: number | null;
  source: ExerciseTarget['source'];
  streak: number;
  reason: string;
  last: string | null;
  discomfort: boolean;
}

function startReason(kind: LoadKind, planned: PlannedExercise, belowMin: boolean): string {
  if (belowMin) {
    return kind === 'barbell'
      ? 'Расчётный вес меньше пустого грифа. Возьмите облегчённый гриф или замените упражнение на вариант с гантелями.'
      : 'Расчётный вес меньше минимального на этом снаряде. Начните с минимума и добавляйте повторения, а потом вес.';
  }
  return `Стартовая оценка по анкете, не измерение. Подберите вес так, чтобы после подхода оставалось ≈ ${planned.targetRIR} повт. в запасе, и скорректируйте.`;
}

function replayExercise(
  ex: Exercise,
  planned: PlannedExercise,
  profile: UserProfile,
  rule: ProgressionRule,
  sessions: readonly WorkoutSession[],
): ExerciseTarget {
  const kind = loadKind(ex);
  const est = estimateWorkingWeight(profile, ex, planned);

  const st: ReplayState = {
    weight: est ? est.weightKg : null,
    source: est ? 'estimate' : 'none',
    streak: 0,
    reason: est ? startReason(kind, planned, est.belowMinimum) : ex.timed ? 'Статическое удержание — вес не нужен.' : 'Работа с собственным весом: добавляйте повторы, а достигнув верха диапазона — усложняйте вариант или добавляйте отягощение.',
    last: null,
    discomfort: false,
  };

  for (const s of sessions) {
    const le = s.exercises.find((e) => e.exerciseId === ex.id);
    if (!le) continue;
    const done = le.sets.filter((x) => x.completed);
    if (done.length === 0) continue;

    const weights = done.map((x) => x.weightKg).filter((w): w is number => w != null && w > 0);
    const used = weights.length ? median(weights) : null;
    const reps = done.map((x) => x.reps ?? le.plannedRepMin);
    const allDone = done.length >= le.plannedSets;
    const atTop = reps.every((r) => r >= le.plannedRepMax);
    const belowMin = reps.filter((r) => r < le.plannedRepMin).length;
    const fb = s.feedback;
    const difficulty: PerceivedDifficulty = fb?.difficulty ?? 'right';
    const completion: CompletionLevel = fb?.completion ?? (allDone ? 'full' : 'partial');
    const discomfort = !!fb && fb.discomfortJoints.some((j) => ex.joints.includes(j));

    st.last = formatPerformance(le);
    st.discomfort = discomfort;

    // Вес, с которым реально работали (учитывает ручную коррекцию пользователя).
    let current = used ?? st.weight;

    // Без числового веса (свой вес, статика, тренажёр с помощью): веса не меняем, подсказываем усложнение.
    if (kind === 'none') {
      st.weight = used ?? st.weight;
      if (used != null) st.source = 'history';
      if (allDone && atTop && completion === 'full' && difficulty !== 'hard' && difficulty !== 'too_hard') {
        st.reason = 'Верх диапазона достигнут во всех подходах — усложните вариант (меньше помощи или больше отягощения).';
      }
      continue;
    }
    if (current == null) continue;

    const struggle =
      difficulty === 'too_hard' ? ADAPT.deloadTooHard
      : belowMin >= Math.ceil(done.length / 2) || (difficulty === 'hard' && belowMin > 0) ? ADAPT.deloadStruggle
      : 0;

    const lower = (factor: number): number => {
      let w = roundToEquipment(kind, current! * (1 - factor));
      if (w >= current!) w = Math.max(minWeightKg(kind), current! - stepKg(kind, current!));
      return w;
    };

    if (discomfort) {
      st.weight = lower(ADAPT.deloadDiscomfort);
      st.streak = 0;
      st.reason = `Был дискомфорт в суставе — вес снижен до ${fmt(st.weight)} кг. Не тренируйтесь через боль; при повторении замените упражнение или обратитесь к врачу.`;
    } else if (struggle > 0) {
      st.weight = lower(struggle);
      st.streak = 0;
      st.reason = difficulty === 'too_hard'
        ? `Вы отметили «слишком тяжело» — вес снижен до ${fmt(st.weight)} кг.`
        : `Не хватило повторений в нижней границе диапазона — вес снижен до ${fmt(st.weight)} кг.`;
      if (st.weight >= current) st.reason = `Вес уже минимальный для этого снаряда (${fmt(current)} кг): добавьте отдых или замените упражнение.`;
    } else if (completion === 'full' && allDone && atTop && difficulty !== 'hard') {
      st.streak += difficulty === 'easy' ? rule.sessionsAtTopToProgress : 1;
      if (st.streak >= rule.sessionsAtTopToProgress) {
        st.weight = roundToEquipment(kind, current + incrementKg(ex, kind, current, rule));
        st.streak = 0;
        st.reason = `Верх диапазона достигнут во всех подходах — вес увеличен до ${fmt(st.weight)} кг, повторения снова с нижней границы.`;
      } else {
        st.weight = current;
        st.reason = `Верх диапазона достигнут. Ещё ${rule.sessionsAtTopToProgress - st.streak} трен. с таким результатом — и вес вырастет.`;
      }
    } else if (
      difficulty === 'easy' && completion === 'full' && allDone &&
      reps.every((r) => r >= Math.ceil((le.plannedRepMin + le.plannedRepMax) / 2))
    ) {
      st.weight = roundToEquipment(kind, current + incrementKg(ex, kind, current, rule));
      st.streak = 0;
      st.reason = `Вы отметили, что было легко, — вес увеличен до ${fmt(st.weight)} кг.`;
    } else {
      st.weight = current;
      if (completion !== 'full' || !allDone) {
        st.reason = 'Тренировка не выполнена полностью — вес сохранён, увеличивать нагрузку рано.';
      } else if (difficulty === 'hard') {
        st.reason = 'Было тяжело — вес сохранён, добавляйте повторения внутри диапазона.';
      } else {
        st.reason = 'Вес сохранён: добавляйте повторения внутри диапазона, до верхней границы.';
      }
    }
    st.source = 'history';
  }

  return {
    exerciseId: ex.id,
    weightKg: st.weight,
    source: st.weight == null ? 'none' : st.source,
    stepKg: st.weight != null && kind !== 'none' ? stepKg(kind, st.weight) : 0,
    reason: st.reason,
    lastPerformance: st.last,
    discomfort: st.discomfort,
  };
}

/** Сдвиг объёма по цепочке тренировок: −1 после тяжёлой/недоделанной, возврат к 0 после нормальной. */
export function computeVolumeShift(history: readonly WorkoutSession[]): 0 | -1 {
  let shift: 0 | -1 = 0;
  for (const s of chronological(history)) {
    const fb = s.feedback;
    if (!fb) continue;
    if (fb.difficulty === 'too_hard' || fb.completion === 'partial') shift = -1;
    else if (fb.completion === 'full' && (fb.difficulty === 'easy' || fb.difficulty === 'right')) shift = 0;
  }
  return shift;
}

/** Временно убирает 1 подход у части упражнений дня (сначала изолирующие с конца) и добавляет отдых. */
function trimDay(day: PlanDay): PlanDay {
  const exercises = day.exercises.map((e) => ({ ...e }));
  const count = Math.max(1, Math.round(exercises.length * ADAPT.trimShare));
  const order = exercises
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.sets > ALGO.minDirectSets)
    .sort((a, b) => {
      const ra = a.e.role === 'isolation' ? 0 : 1;
      const rb = b.e.role === 'isolation' ? 0 : 1;
      return ra - rb || b.i - a.i;
    })
    .slice(0, count);
  for (const { i } of order) exercises[i].sets -= 1;
  for (const e of exercises) {
    e.restSec += ADAPT.restBonusSec;
    e.targetRIR += ADAPT.rirBonus;
  }
  return { ...day, exercises, estimatedMinutes: Math.round(estimateMinutes(exercises)) };
}

/**
 * Главная функция: план + история → адаптированный план и рекомендации по весам.
 * @param profile актуальный профиль (по умолчанию — снимок из плана)
 */
export function adaptProgram(
  plan: WorkoutPlan,
  history: readonly WorkoutSession[],
  profile: UserProfile = plan.profile,
): AdaptedProgram {
  const sessions = chronological(history);
  const volumeShift = computeVolumeShift(history);
  const days = volumeShift === -1 ? plan.days.map(trimDay) : plan.days;

  const targets: Record<string, ExerciseTarget> = {};
  for (const day of days) {
    for (const pe of day.exercises) {
      if (targets[pe.exerciseId]) continue;
      targets[pe.exerciseId] = replayExercise(getExercise(pe.exerciseId), pe, profile, plan.progression, sessions);
    }
  }

  let adapted: WorkoutPlan = plan;
  const notes: string[] = [];
  if (volumeShift === -1) {
    const weeklyTargets = {} as Partial<Record<MuscleId, number>>;
    for (const m of MUSCLE_IDS) weeklyTargets[m] = plan.weeklyVolume[m].target;
    adapted = { ...plan, days, weeklyVolume: computeWeeklyVolume(days, weeklyTargets) };
    notes.push('После последней тренировки (тяжёлой или выполненной не полностью) объём временно снижен на 1 подход в части упражнений, отдых немного увеличен. Когда тренировка пройдёт в полном объёме и без перегруза, план вернётся к исходному.');
  }
  if (Object.values(targets).some((t) => t.discomfort)) {
    notes.push('Вы отмечали дискомфорт в суставе. Не тренируйтесь через боль; если это повторяется, добавьте ограничение в профиле — программа исключит нагружающие этот сустав упражнения — и проконсультируйтесь со специалистом.');
  }
  return { plan: adapted, targets, volumeShift, notes };
}

export interface AdaptationChange {
  exerciseId: string;
  from: number | null;
  to: number | null;
  direction: 'up' | 'down' | 'same';
}

/** Что изменилось в рекомендациях после тренировки (для экрана «что дальше»). */
export function summarizeAdaptation(
  before: AdaptedProgram,
  after: AdaptedProgram,
  exerciseIds: readonly string[],
): { changes: AdaptationChange[]; volumeShiftChanged: boolean; volumeShift: 0 | -1 } {
  const changes: AdaptationChange[] = [];
  for (const id of exerciseIds) {
    const a = before.targets[id]?.weightKg ?? null;
    const b = after.targets[id]?.weightKg ?? null;
    const direction = a == null || b == null || a === b ? 'same' : b > a ? 'up' : 'down';
    changes.push({ exerciseId: id, from: a, to: b, direction });
  }
  return { changes, volumeShiftChanged: before.volumeShift !== after.volumeShift, volumeShift: after.volumeShift };
}
