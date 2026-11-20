/** Замена упражнений: альтернативы по той же мышце и схожему паттерну движения. */
import { LEVELS } from './config';
import { computeWeeklyVolume } from './analytics';
import { getAvailableExercises, getExercise } from './exerciseDatabase';
import { estimateMinutes, prescribe, resolveConstraints } from './workoutGenerator';
import type { Equipment, Exercise, MovementPattern, WorkoutPlan } from './types';

export type AlternativeRelation = 'same_movement' | 'similar_movement' | 'other_exercise';

export interface AlternativeOption {
  exercise: Exercise;
  relation: AlternativeRelation;
  note: string;
  score: number;
}

/** Близкие паттерны: тот же двигательный смысл, но акцент может смещаться. */
export const RELATED_PATTERNS: Partial<Record<MovementPattern, MovementPattern[]>> = {
  horizontal_push: ['incline_push', 'dip'],
  incline_push: ['horizontal_push', 'dip'],
  dip: ['horizontal_push', 'incline_push'],
  squat: ['lunge'],
  lunge: ['squat'],
  elbow_extension: ['close_grip_press'],
  close_grip_press: ['elbow_extension'],
  wrist: ['carry'],
  carry: ['wrist'],
  core_flexion: ['core_stability'],
  core_stability: ['core_flexion'],
};

export interface AlternativeOptions {
  /** Предпочтительное оборудование — такие упражнения поднимаются выше в списке. */
  preferEquipment?: Equipment[];
  /** Не более N вариантов (по умолчанию все). */
  limit?: number;
}

export function getAlternatives(plan: WorkoutPlan, dayIndex: number, exerciseIndex: number, opts: AlternativeOptions = {}): AlternativeOption[] {
  const day = plan.days[dayIndex];
  const current = getExercise(day.exercises[exerciseIndex].exerciseId);
  const inDay = new Set(day.exercises.map((e) => e.exerciseId));
  const allowed = getAvailableExercises(resolveConstraints(plan.profile));
  const lvl = LEVELS[plan.profile.level];
  const related = RELATED_PATTERNS[current.pattern] ?? [];

  const options: AlternativeOption[] = [];
  for (const e of allowed) {
    if (e.id === current.id || inDay.has(e.id) || e.primary !== current.primary) continue;
    let relation: AlternativeRelation;
    let note: string;
    if (e.pattern === current.pattern) {
      relation = 'same_movement';
      note = e.category === current.category ? 'То же движение' : 'То же движение, другой тип нагрузки — повторения и отдых пересчитаны';
    } else if (related.includes(e.pattern)) {
      relation = 'similar_movement';
      note = 'Похожее движение, акцент немного смещается';
    } else if (e.category === current.category) {
      relation = 'other_exercise';
      note = 'Та же мышечная группа, другое движение';
    } else continue;

    let s = { same_movement: 0, similar_movement: 10, other_exercise: 20 }[relation] + e.rank;
    for (const eq of e.equipment) s += lvl.equipmentBias[eq] ?? 0;
    if (e.category !== current.category) s += 0.5;
    if (opts.preferEquipment?.some((eq) => e.equipment.includes(eq))) s -= 2;
    options.push({ exercise: e, relation, note, score: s });
  }
  options.sort((a, b) => a.score - b.score || a.exercise.id.localeCompare(b.exercise.id));
  return opts.limit ? options.slice(0, opts.limit) : options;
}

/** Чистая функция: возвращает новый план. Структура дня не меняется, подходы сохраняются, повторения/отдых пересчитываются. */
export function replaceExercise(plan: WorkoutPlan, dayIndex: number, exerciseIndex: number, newExerciseId: string): WorkoutPlan {
  const allowedIds = new Set(getAvailableExercises(resolveConstraints(plan.profile)).map((e) => e.id));
  if (!allowedIds.has(newExerciseId)) throw new Error('Это упражнение недоступно с текущими ограничениями и оборудованием.');
  const day = plan.days[dayIndex];
  const old = day.exercises[exerciseIndex];
  const next = getExercise(newExerciseId);
  if (next.primary !== getExercise(old.exerciseId).primary) throw new Error('Замена должна прорабатывать ту же основную мышечную группу.');
  if (day.exercises.some((e, i) => i !== exerciseIndex && e.exerciseId === newExerciseId)) throw new Error('Это упражнение уже есть в тренировке.');

  const replaced = { ...prescribe(next, old.sets, plan.profile), replacedFrom: old.replacedFrom ?? old.exerciseId };
  const exercises = day.exercises.map((e, i) => (i === exerciseIndex ? replaced : e));
  const days = plan.days.map((d, i) => (i === dayIndex ? { ...d, exercises, estimatedMinutes: Math.round(estimateMinutes(exercises)) } : d));
  const targets = Object.fromEntries(Object.entries(plan.weeklyVolume).map(([m, v]) => [m, v.target]));
  return { ...plan, days, weeklyVolume: computeWeeklyVolume(days, targets) };
}

