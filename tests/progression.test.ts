import { describe, expect, it } from 'vitest';
import {
  EXERCISES, GOALS, LEVELS, LOAD, LOAD_RATIO, adaptProgram, completeSet, computeWeeklyVolume,
  createSessionFromDay, estimateOneRepMax, estimateWorkingWeight, finishSession, generateProgram,
  getAlternatives, getExercise, inferCompletion, loadKind, replaceExercise, roundToEquipment, stepKg,
  summarizeAdaptation,
  type Goal, type Level, type UserProfile, type WorkoutFeedback, type WorkoutPlan, type WorkoutSession,
} from '@/lib';

const goals = Object.keys(GOALS) as Goal[];
const levels = Object.keys(LEVELS) as Level[];

const BASE: Partial<UserProfile> = {
  sex: 'male', age: 30, heightCm: 180, weightKg: 80, level: 'intermediate', goal: 'hypertrophy',
  daysPerWeek: 3, sessionMinutes: 60,
};
const profileOf = (over: Partial<UserProfile> = {}) => generateProgram({ ...BASE, ...over }).profile;
const bench = getExercise('bench-press');
const planned = { repMin: 8, targetRIR: 2, unit: 'reps' as const };

// ───────────────────────── помощники ─────────────────────────

type RepsMode = 'top' | 'mid' | 'min' | number;

/** Записывает тренировку дня так, как её увидел бы пользователь: берёт рекомендованный вес и «выполняет» план. */
function logSession(
  plan: WorkoutPlan,
  history: WorkoutSession[],
  dayIdx: number,
  n: number,
  opts: {
    reps?: RepsMode;
    feedback?: WorkoutFeedback;
    weightFor?: (exerciseId: string, suggested: number | null) => number | null;
    skipLastSets?: number;
  } = {},
): WorkoutSession {
  const adapted = adaptProgram(plan, history);
  const day = adapted.plan.days.find((d) => d.index === dayIdx)!;
  let s = createSessionFromDay(day);
  const mode = opts.reps ?? 'top';
  s.exercises.forEach((le, ei) => {
    const sug = adapted.targets[le.exerciseId].weightKg;
    const weight = opts.weightFor ? opts.weightFor(le.exerciseId, sug) : sug;
    const reps =
      typeof mode === 'number' ? mode
      : mode === 'top' ? le.plannedRepMax
      : mode === 'min' ? le.plannedRepMin
      : Math.ceil((le.plannedRepMin + le.plannedRepMax) / 2);
    le.sets.forEach((_, si) => {
      const isSkipped = opts.skipLastSets != null && ei === s.exercises.length - 1 && si >= le.sets.length - opts.skipLastSets;
      if (!isSkipped) s = completeSet(s, ei, si, weight, reps);
    });
  });
  const done = finishSession(s);
  const stamp = new Date(Date.UTC(2026, 0, 1 + n, 12)).toISOString();
  return { ...done, startedAt: stamp, finishedAt: stamp, feedback: opts.feedback };
}

const fb = (difficulty: WorkoutFeedback['difficulty'], completion: WorkoutFeedback['completion'] = 'full', joints: WorkoutFeedback['discomfortJoints'] = []): WorkoutFeedback =>
  ({ difficulty, completion, discomfortJoints: joints });

/** Первое упражнение дня 0 с числовым весом (для точечных проверок). */
function firstLoaded(plan: WorkoutPlan, category: 'compound' | 'isolation' = 'compound') {
  const pe = plan.days[0].exercises.find((e) => e.role === category && loadKind(getExercise(e.exerciseId)) !== 'none')!;
  return { pe, id: pe.exerciseId, ex: getExercise(pe.exerciseId) };
}

// ───────────────────────── оценка стартового веса ─────────────────────────

describe('loadEstimator', () => {
  it('таблица нагрузок согласована с библиотекой: каждый ключ существует, пропуски объяснимы', () => {
    const ids = new Set(EXERCISES.map((e) => e.id));
    for (const id of Object.keys(LOAD_RATIO)) expect(ids.has(id)).toBe(true);
    for (const e of EXERCISES) {
      if (LOAD_RATIO[e.id] !== undefined) continue;
      const bodyOnly = e.equipment.every((q) => q === 'bodyweight' || q === 'bench');
      expect(bodyOnly || !!e.timed || e.id === 'assisted-pull-up').toBe(true);
    }
  });

  it('детерминирован и не зависит от порядка массивов в профиле', () => {
    const a = estimateWorkingWeight(profileOf({ limitations: ['knee', 'wrist'] }), bench, planned);
    const b = estimateWorkingWeight(profileOf({ limitations: ['wrist', 'knee'] }), bench, planned);
    expect(a).toEqual(b);
  });

  it('вес округлён до реального оборудования и не ниже минимума', () => {
    for (const goal of goals) for (const level of levels) for (const sex of ['male', 'female', 'unspecified'] as const) {
      const plan = generateProgram({ ...BASE, goal, level, sex, weightKg: 55, heightCm: 160 });
      for (const day of plan.days) for (const pe of day.exercises) {
        const ex = getExercise(pe.exerciseId);
        const est = estimateWorkingWeight(plan.profile, ex, pe);
        if (!est) continue;
        expect(est.weightKg).toBe(roundToEquipment(est.kind, est.weightKg));
        if (est.kind === 'barbell') expect(est.weightKg).toBeGreaterThanOrEqual(LOAD.barbellBarKg);
        expect(est.weightKg).toBeGreaterThan(0);
        expect(Number.isFinite(est.weightKg)).toBe(true);
      }
    }
  });

  it('свой вес, статика и «тренажёр с помощью» числового веса не получают', () => {
    for (const id of ['push-up', 'pull-up', 'plank', 'side-plank', 'assisted-pull-up', 'glute-bridge', 'crunch']) {
      const ex = getExercise(id);
      expect(estimateWorkingWeight(profileOf(), ex, { repMin: 8, targetRIR: 2, unit: ex.timed ? 'sec' : 'reps' })).toBeNull();
    }
  });

  it('осторожные допущения: женщина и «не указан» ≤ мужчины, старше → легче, выше уровень → тяжелее', () => {
    const man = estimateOneRepMax(profileOf({ sex: 'male' }), bench)!;
    const woman = estimateOneRepMax(profileOf({ sex: 'female' }), bench)!;
    const unspec = estimateOneRepMax(profileOf({ sex: 'unspecified' }), bench)!;
    expect(woman).toBeLessThan(man);
    expect(unspec).toBeLessThanOrEqual(man);
    expect(unspec).toBe(woman);
    expect(estimateOneRepMax(profileOf({ age: 65 }), bench)!).toBeLessThan(estimateOneRepMax(profileOf({ age: 30 }), bench)!);
    const [b, i, a] = levels.map((level) => estimateOneRepMax(profileOf({ level }), bench)!);
    expect(b).toBeLessThan(i);
    expect(i).toBeLessThan(a);
  });

  it('рост ограничивает опорную массу: лишняя жировая масса не завышает рекомендацию', () => {
    const lean = estimateOneRepMax(profileOf({ heightCm: 175, weightKg: 85 }), bench)!;
    const heavy = estimateOneRepMax(profileOf({ heightCm: 175, weightKg: 120 }), bench)!;
    expect(heavy).toBe(lean); // оба выше порога ИМТ 27 (≈ 82,7 кг при 175 см) → одинаковая опорная масса
    const lighter = estimateOneRepMax(profileOf({ heightCm: 175, weightKg: 65 }), bench)!;
    expect(lighter).toBeLessThan(lean);
  });

  it('травмы/ограничения в анкете снижают стартовый вес', () => {
    const press = getExercise('leg-press');
    const p = { repMin: 8, targetRIR: 3, unit: 'reps' as const };
    const free = estimateWorkingWeight(profileOf({ weightKg: 90 }), press, p)!;
    const hurt = estimateWorkingWeight(profileOf({ weightKg: 90, limitations: ['shoulder'] }), press, p)!;
    expect(hurt.weightKg).toBeLessThan(free.weightKg);
  });

  it('рекомендованный вес всегда ниже расчётного 1ПМ (кроме упора в минимум снаряда)', () => {
    for (const goal of goals) for (const level of levels) for (const daysPerWeek of [2, 3, 4, 5, 6] as const) {
      const plan = generateProgram({ ...BASE, goal, level, daysPerWeek });
      for (const day of plan.days) for (const pe of day.exercises) {
        const ex = getExercise(pe.exerciseId);
        const est = estimateWorkingWeight(plan.profile, ex, pe);
        if (!est) continue;
        const oneRm = estimateOneRepMax(plan.profile, ex)!;
        if (!est.belowMinimum && est.weightKg > LOAD.steps[est.kind].min) expect(est.weightKg).toBeLessThan(oneRm);
      }
    }
  });

  it('шаг гантелей растёт с весом', () => {
    expect(stepKg('dumbbell', 6)).toBe(1);
    expect(stepKg('dumbbell', 16)).toBe(2);
    expect(stepKg('dumbbell', 40)).toBe(2.5);
  });
});

// ───────────────────────── адаптация по истории и опросу ─────────────────────────

describe('progressionEngine', () => {
  const plan = generateProgram({ ...BASE, level: 'intermediate' }); // порог 2 тренировки
  const beginnerPlan = generateProgram({ ...BASE, level: 'beginner' }); // порог 1 тренировка

  it('без истории: стартовые оценки, план не изменён', () => {
    const a = adaptProgram(plan, []);
    expect(a.volumeShift).toBe(0);
    expect(a.plan).toEqual(plan);
    for (const day of plan.days) for (const pe of day.exercises) {
      const t = a.targets[pe.exerciseId];
      const est = estimateWorkingWeight(plan.profile, getExercise(pe.exerciseId), pe);
      expect(t.weightKg).toBe(est ? est.weightKg : null);
      expect(t.source).toBe(est ? 'estimate' : 'none');
    }
  });

  it('детерминирован, не мутирует план и не зависит от порядка записей истории', () => {
    const snapshot = JSON.parse(JSON.stringify(plan));
    const h: WorkoutSession[] = [];
    for (let n = 0; n < 4; n++) h.unshift(logSession(plan, [...h], n % plan.days.length, n, { reps: 'mid', feedback: fb('right') }));
    const a = adaptProgram(plan, h);
    const b = adaptProgram(plan, [...h].reverse());
    const c = adaptProgram(plan, h);
    expect(a).toEqual(b);
    expect(a).toEqual(c);
    expect(plan).toEqual(snapshot);
  });

  it('двойная прогрессия: вес растёт после N тренировок с верхом диапазона (N по уровню)', () => {
    const { id, ex } = firstLoaded(plan);
    const day = plan.days.findIndex((d) => d.exercises.some((e) => e.exerciseId === id));
    const h: WorkoutSession[] = [];
    h.unshift(logSession(plan, h, day, 0, { reps: 'top', feedback: fb('right') }));
    const afterOne = adaptProgram(plan, h).targets[id];
    const start = adaptProgram(plan, []).targets[id].weightKg!;
    expect(afterOne.weightKg).toBe(start); // порог = 2
    h.unshift(logSession(plan, h, day, 1, { reps: 'top', feedback: fb('right') }));
    const afterTwo = adaptProgram(plan, h).targets[id];
    expect(afterTwo.weightKg!).toBeGreaterThan(start);
    expect(afterTwo.weightKg! - start).toBeGreaterThanOrEqual(stepKg(loadKind(ex) as 'barbell', start));
    expect(afterTwo.source).toBe('history');
    expect(afterTwo.lastPerformance).toBeTruthy();

    const b = firstLoaded(beginnerPlan);
    const bDay = beginnerPlan.days.findIndex((d) => d.exercises.some((e) => e.exerciseId === b.id));
    const bh = [logSession(beginnerPlan, [], bDay, 0, { reps: 'top', feedback: fb('right') })];
    expect(adaptProgram(beginnerPlan, bh).targets[b.id].weightKg!).toBeGreaterThan(adaptProgram(beginnerPlan, []).targets[b.id].weightKg!);
  });

  it('вес, скорректированный пользователем, становится новой точкой отсчёта', () => {
    const { id } = firstLoaded(plan);
    const day = plan.days.findIndex((d) => d.exercises.some((e) => e.exerciseId === id));
    const start = adaptProgram(plan, []).targets[id].weightKg!;
    const h = [logSession(plan, [], day, 0, { reps: 'mid', feedback: fb('right'), weightFor: (eid, sug) => (eid === id ? start + 10 : sug) })];
    expect(adaptProgram(plan, h).targets[id].weightKg).toBe(start + 10);
  });

  it('«слишком тяжело»: вес снижается, объём и запас временно корректируются, исходный план цел', () => {
    const { id } = firstLoaded(plan);
    const day = plan.days.findIndex((d) => d.exercises.some((e) => e.exerciseId === id));
    const start = adaptProgram(plan, []).targets[id].weightKg!;
    const h = [logSession(plan, [], day, 0, { reps: 'min', feedback: fb('too_hard') })];
    const a = adaptProgram(plan, h);
    expect(a.targets[id].weightKg!).toBeLessThan(start);
    expect(a.volumeShift).toBe(-1);
    expect(a.notes.length).toBeGreaterThan(0);

    const before = plan.days.reduce((s, d) => s + d.exercises.reduce((x, e) => x + e.sets, 0), 0);
    const after = a.plan.days.reduce((s, d) => s + d.exercises.reduce((x, e) => x + e.sets, 0), 0);
    expect(after).toBeLessThan(before);
    for (const d of a.plan.days) {
      const orig = plan.days.find((x) => x.index === d.index)!;
      expect(d.exercises.length).toBe(orig.exercises.length);
      d.exercises.forEach((e, i) => {
        expect(e.sets).toBeGreaterThanOrEqual(2);
        expect(e.sets).toBeGreaterThanOrEqual(orig.exercises[i].sets - 1);
        expect(e.restSec).toBeGreaterThan(orig.exercises[i].restSec);
      });
    }
    // недельный объём пересчитан по скорректированным дням
    expect(a.plan.weeklyVolume).toEqual(computeWeeklyVolume(a.plan.days, Object.fromEntries(
      Object.entries(plan.weeklyVolume).map(([m, v]) => [m, v.target]))));
  });

  it('тренировка не доделана: вес сохраняется, объём временно снижен; после полной «нормальной» возвращается план', () => {
    const { id } = firstLoaded(plan);
    const day = plan.days.findIndex((d) => d.exercises.some((e) => e.exerciseId === id));
    const start = adaptProgram(plan, []).targets[id].weightKg!;
    const h: WorkoutSession[] = [];
    h.unshift(logSession(plan, h, day, 0, { reps: 'top', feedback: fb('right', 'partial'), skipLastSets: 1 }));
    const a = adaptProgram(plan, h);
    expect(a.targets[id].weightKg).toBe(start);
    expect(a.volumeShift).toBe(-1);
    h.unshift(logSession(plan, h, day, 1, { reps: 'mid', feedback: fb('right', 'full') }));
    const b = adaptProgram(plan, h);
    expect(b.volumeShift).toBe(0);
    expect(b.plan).toEqual(plan);
  });

  it('«тяжело» при верхе диапазона не засчитывает прогресс; «легко» ускоряет его', () => {
    const { id } = firstLoaded(beginnerPlan);
    const day = beginnerPlan.days.findIndex((d) => d.exercises.some((e) => e.exerciseId === id));
    const start = adaptProgram(beginnerPlan, []).targets[id].weightKg!;
    const hard = [logSession(beginnerPlan, [], day, 0, { reps: 'top', feedback: fb('hard') })];
    expect(adaptProgram(beginnerPlan, hard).targets[id].weightKg).toBe(start);

    const { id: id2 } = firstLoaded(plan);
    const day2 = plan.days.findIndex((d) => d.exercises.some((e) => e.exerciseId === id2));
    const s2 = adaptProgram(plan, []).targets[id2].weightKg!;
    // середина диапазона, но «легко» → прибавка уже после одной тренировки (порог у среднего уровня — 2)
    const easy = [logSession(plan, [], day2, 0, { reps: 'mid', feedback: fb('easy') })];
    expect(adaptProgram(plan, easy).targets[id2].weightKg!).toBeGreaterThan(s2);
    // а без «легко» в середине диапазона вес не растёт
    const right = [logSession(plan, [], day2, 0, { reps: 'mid', feedback: fb('right') })];
    expect(adaptProgram(plan, right).targets[id2].weightKg).toBe(s2);
  });

  it('нехватка повторов в нижней границе снижает вес даже при ответе «в самый раз»', () => {
    const { id } = firstLoaded(plan);
    const day = plan.days.findIndex((d) => d.exercises.some((e) => e.exerciseId === id));
    const start = adaptProgram(plan, []).targets[id].weightKg!;
    const h = [logSession(plan, [], day, 0, { reps: 3, feedback: fb('right') })];
    expect(adaptProgram(plan, h).targets[id].weightKg!).toBeLessThan(start);
  });

  it('дискомфорт в суставе: вес в связанных упражнениях снижается, есть предупреждение', () => {
    const shoulderEx = plan.days.flatMap((d, di) => d.exercises.map((e) => ({ di, e })))
      .find(({ e }) => getExercise(e.exerciseId).joints.includes('shoulder') && loadKind(getExercise(e.exerciseId)) !== 'none')!;
    const id = shoulderEx.e.exerciseId;
    const start = adaptProgram(plan, []).targets[id].weightKg!;
    const h = [logSession(plan, [], shoulderEx.di, 0, { reps: 'top', feedback: fb('right', 'full', ['shoulder']) })];
    const a = adaptProgram(plan, h);
    expect(a.targets[id].weightKg!).toBeLessThan(start);
    expect(a.targets[id].discomfort).toBe(true);
    expect(a.notes.join(' ')).toContain('дискомфорт');
  });

  it('вес не падает ниже минимума снаряда', () => {
    const p = generateProgram({ ...BASE, level: 'beginner', sex: 'female', weightKg: 50, heightCm: 160 });
    const barbellEx = p.days.flatMap((d, di) => d.exercises.map((e) => ({ di, e }))).find(({ e }) => loadKind(getExercise(e.exerciseId)) === 'barbell');
    if (!barbellEx) return;
    const id = barbellEx.e.exerciseId;
    const h: WorkoutSession[] = [];
    for (let n = 0; n < 3; n++) h.unshift(logSession(p, h, barbellEx.di, n, { reps: 'min', feedback: fb('too_hard') }));
    expect(adaptProgram(p, h).targets[id].weightKg!).toBeGreaterThanOrEqual(LOAD.barbellBarKg);
  });

  it('старые записи без опроса не ломают расчёт', () => {
    const { id } = firstLoaded(plan);
    const day = plan.days.findIndex((d) => d.exercises.some((e) => e.exerciseId === id));
    const old = logSession(plan, [], day, 0, { reps: 'mid' });
    delete (old as Partial<WorkoutSession>).feedback;
    const a = adaptProgram(plan, [old]);
    expect(a.volumeShift).toBe(0);
    expect(a.targets[id].weightKg).toBeTruthy();
  });

  it('после замены упражнения новое упражнение получает стартовую оценку, а не вес старого', () => {
    const di = 0;
    const idx = plan.days[di].exercises.findIndex((e) => loadKind(getExercise(e.exerciseId)) !== 'none');
    const oldId = plan.days[di].exercises[idx].exerciseId;
    const alt = getAlternatives(plan, plan.days[di].index, idx)[0];
    const replaced = replaceExercise(plan, plan.days[di].index, idx, alt.exercise.id);
    const h = [logSession(plan, [], di, 0, { reps: 'top', feedback: fb('right'), weightFor: (eid, sug) => (eid === oldId && sug ? sug + 20 : sug) })];
    const t = adaptProgram(replaced, h).targets[alt.exercise.id];
    const est = estimateWorkingWeight(replaced.profile, alt.exercise, replaced.days[di].exercises[idx]);
    expect(t.weightKg).toBe(est ? est.weightKg : null);
  });

  it('summarizeAdaptation показывает рост веса и смену объёма', () => {
    const { id } = firstLoaded(beginnerPlan);
    const day = beginnerPlan.days.findIndex((d) => d.exercises.some((e) => e.exerciseId === id));
    const s = logSession(beginnerPlan, [], day, 0, { reps: 'top', feedback: fb('right') });
    const sum = summarizeAdaptation(adaptProgram(beginnerPlan, []), adaptProgram(beginnerPlan, [s]), [id]);
    expect(sum.changes[0].direction).toBe('up');
    expect(sum.volumeShiftChanged).toBe(false);
  });

  it('inferCompletion: полный / почти / не до конца', () => {
    expect(inferCompletion(10, 10)).toBe('full');
    expect(inferCompletion(8, 10)).toBe('mostly');
    expect(inferCompletion(3, 10)).toBe('partial');
    expect(inferCompletion(0, 0)).toBe('partial');
  });

  it('весь набор целей/уровней/дней: адаптация после тяжёлой тренировки безопасна для всех программ', () => {
    for (const goal of goals) for (const level of levels) for (const daysPerWeek of [2, 3, 4, 5, 6] as const) {
      const p = generateProgram({ ...BASE, goal, level, daysPerWeek });
      const h = [logSession(p, [], 0, 0, { reps: 'min', feedback: fb('too_hard', 'partial') })];
      const a = adaptProgram(p, h);
      expect(a.volumeShift).toBe(-1);
      a.plan.days.forEach((d, di) => d.exercises.forEach((e, i) => {
        expect(e.sets).toBeGreaterThanOrEqual(Math.min(2, p.days[di].exercises[i].sets));
        expect(e.sets).toBeLessThanOrEqual(p.days[di].exercises[i].sets);
      }));
      for (const t of Object.values(a.targets)) if (t.weightKg != null) expect(t.weightKg).toBeGreaterThan(0);
    }
  });
});
