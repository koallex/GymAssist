/** Создание и обновление сессии тренировки. Без React. */
import type { PlanDay, LoggedExercise, LoggedSet, WorkoutFeedback, WorkoutSession } from './types';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Создаёт сессию из дня плана. Если переданы рекомендации по весу (progressionEngine),
 * они подставляются в подходы — пользователь может изменить вес до или во время упражнения.
 */
export function createSessionFromDay(
  day: PlanDay,
  targets: Record<string, { weightKg: number | null }> = {},
): WorkoutSession {
  const exercises: LoggedExercise[] = day.exercises.map((pe) => ({
    exerciseId: pe.exerciseId,
    targetMuscle: pe.targetMuscle,
    plannedSets: pe.sets,
    plannedRepMin: pe.repMin,
    plannedRepMax: pe.repMax,
    unit: pe.unit,
    restSec: pe.restSec,
    suggestedWeightKg: targets[pe.exerciseId]?.weightKg ?? null,
    sets: Array.from({ length: pe.sets }, (_, i) => ({
      setIndex: i,
      weightKg: targets[pe.exerciseId]?.weightKg ?? null,
      reps: null,
      completed: false,
    })),
  }));

  return {
    id: uid(),
    planDayIndex: day.index,
    dayName: day.name,
    focus: day.focus,
    startedAt: new Date().toISOString(),
    completed: false,
    exercises,
  };
}

export function completeSet(
  session: WorkoutSession,
  exerciseIndex: number,
  setIndex: number,
  weightKg: number | null,
  reps: number | null,
): WorkoutSession {
  const exercises = session.exercises.map((ex, ei) => {
    if (ei !== exerciseIndex) return ex;
    const sets = ex.sets.map((s, si) => {
      if (si !== setIndex) return s;
      const updated: LoggedSet = {
        ...s,
        weightKg,
        reps,
        completed: true,
        completedAt: new Date().toISOString(),
      };
      return updated;
    });
    return { ...ex, sets };
  });
  return { ...session, exercises };
}

export function uncompleteSet(
  session: WorkoutSession,
  exerciseIndex: number,
  setIndex: number,
): WorkoutSession {
  const exercises = session.exercises.map((ex, ei) => {
    if (ei !== exerciseIndex) return ex;
    const sets = ex.sets.map((s, si) =>
      si === setIndex ? { ...s, completed: false, completedAt: undefined } : s,
    );
    return { ...ex, sets };
  });
  return { ...session, exercises };
}

export function updateSetValues(
  session: WorkoutSession,
  exerciseIndex: number,
  setIndex: number,
  weightKg: number | null,
  reps: number | null,
): WorkoutSession {
  const exercises = session.exercises.map((ex, ei) => {
    if (ei !== exerciseIndex) return ex;
    const sets = ex.sets.map((s, si) =>
      si === setIndex ? { ...s, weightKg, reps } : s,
    );
    return { ...ex, sets };
  });
  return { ...session, exercises };
}

/** Меняет рабочий вес во всех ещё не выполненных подходах упражнения. */
export function setWorkingWeight(
  session: WorkoutSession,
  exerciseIndex: number,
  weightKg: number | null,
): WorkoutSession {
  const exercises = session.exercises.map((ex, ei) => {
    if (ei !== exerciseIndex) return ex;
    return { ...ex, sets: ex.sets.map((s) => (s.completed ? s : { ...s, weightKg })) };
  });
  return { ...session, exercises };
}

export function finishSession(session: WorkoutSession, feedback?: WorkoutFeedback): WorkoutSession {
  return {
    ...session,
    feedback,
    completed: true,
    finishedAt: new Date().toISOString(),
  };
}

export function sessionProgress(session: WorkoutSession): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      total += 1;
      if (s.completed) done += 1;
    }
  }
  return { done, total };
}

/** Последний введённый вес по упражнению из истории (для подсказки). */
export function lastWeightForExercise(
  history: WorkoutSession[],
  exerciseId: string,
): number | null {
  for (const sess of history) {
    for (const ex of sess.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      for (let i = ex.sets.length - 1; i >= 0; i--) {
        const s = ex.sets[i];
        if (s.completed && s.weightKg != null && s.weightKg > 0) return s.weightKg;
      }
    }
  }
  return null;
}
