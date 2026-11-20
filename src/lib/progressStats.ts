/** Расчёт статистики прогресса из истории. */
import type { WorkoutSession } from './types';

export interface ExerciseWeightPoint {
  date: string; // ISO session start
  weightKg: number;
  reps: number;
  sessionId: string;
}

export interface ExerciseProgress {
  exerciseId: string;
  points: ExerciseWeightPoint[];
  maxWeight: number;
  lastWeight: number | null;
  trend: 'up' | 'down' | 'flat' | 'na';
}

/** Максимальный вес за сессию по упражнению (лучший подход). */
export function buildExerciseProgress(history: WorkoutSession[]): ExerciseProgress[] {
  const map = new Map<string, ExerciseWeightPoint[]>();

  // history: newest first → reverse for chronological
  const chronological = [...history].filter((s) => s.completed).reverse();

  for (const sess of chronological) {
    for (const ex of sess.exercises) {
      let bestW = 0;
      let bestReps = 0;
      for (const s of ex.sets) {
        if (!s.completed || s.weightKg == null || s.weightKg <= 0) continue;
        if (s.weightKg > bestW || (s.weightKg === bestW && (s.reps ?? 0) > bestReps)) {
          bestW = s.weightKg;
          bestReps = s.reps ?? 0;
        }
      }
      if (bestW <= 0) continue;
      const arr = map.get(ex.exerciseId) ?? [];
      arr.push({
        date: sess.startedAt,
        weightKg: bestW,
        reps: bestReps,
        sessionId: sess.id,
      });
      map.set(ex.exerciseId, arr);
    }
  }

  const result: ExerciseProgress[] = [];
  for (const [exerciseId, points] of map) {
    const maxWeight = Math.max(...points.map((p) => p.weightKg));
    const lastWeight = points.length ? points[points.length - 1].weightKg : null;
    let trend: ExerciseProgress['trend'] = 'na';
    if (points.length >= 2) {
      const a = points[points.length - 2].weightKg;
      const b = points[points.length - 1].weightKg;
      if (b > a) trend = 'up';
      else if (b < a) trend = 'down';
      else trend = 'flat';
    }
    result.push({ exerciseId, points, maxWeight, lastWeight, trend });
  }

  result.sort((a, b) => b.points.length - a.points.length || b.maxWeight - a.maxWeight);
  return result;
}

export function sessionsPerWeek(history: WorkoutSession[], weeks = 8): { weekStart: string; count: number }[] {
  const completed = history.filter((s) => s.completed);
  const now = new Date();
  const buckets: { weekStart: string; count: number }[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const end = new Date(now);
    end.setDate(end.getDate() - w * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const count = completed.filter((s) => {
      const d = s.startedAt.slice(0, 10);
      return d >= startStr && d <= endStr;
    }).length;
    buckets.push({ weekStart: startStr, count });
  }
  return buckets;
}
