/** Статистика плана: недельный объём по мышечным группам. (Статистика истории — этап 7.) */
import { getExercise } from './exerciseDatabase';
import { MUSCLE_IDS, type MuscleVolume, type PlanDay, type WeeklyVolume, type MuscleId } from './types';

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeWeeklyVolume(days: PlanDay[], targets: Partial<Record<MuscleId, number>> = {}): WeeklyVolume {
  const result = {} as WeeklyVolume;
  for (const m of MUSCLE_IDS) result[m] = { direct: 0, indirect: 0, effective: 0, target: targets[m] ?? 0, frequency: 0 };
  for (const day of days) {
    const touched = new Set<MuscleId>();
    for (const pe of day.exercises) {
      const e = getExercise(pe.exerciseId);
      result[e.primary].direct += pe.sets;
      touched.add(e.primary);
      for (const [m, f] of Object.entries(e.secondary) as Array<[MuscleId, number]>) result[m].indirect += pe.sets * f;
    }
    for (const m of touched) result[m].frequency += 1;
  }
  for (const m of MUSCLE_IDS) {
    const v: MuscleVolume = result[m];
    v.indirect = round1(v.indirect);
    v.effective = round1(v.direct + v.indirect);
  }
  return result;
}

export const totalSets = (days: PlanDay[]): number => days.reduce((s, d) => s + d.exercises.reduce((a, e) => a + e.sets, 0), 0);
