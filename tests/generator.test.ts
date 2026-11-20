import { describe, expect, it } from 'vitest';
import {
  ALGO, EQUIPMENT_IDS, EXERCISES, GOALS, LEVELS, MUSCLE_CONFIG, MUSCLE_IDS, MUSCLE_SLOTS,
  generateProgram, getAlternatives, getAvailableExercises, getExercise, replaceExercise, resolveConstraints,
  type Goal, type Level, type UserProfile,
} from '@/lib';

const goals = Object.keys(GOALS) as Goal[];
const levels = Object.keys(LEVELS) as Level[];
const days = [2, 3, 4, 5, 6] as const;
const durations = [30, 45, 60, 75, 90] as const;

function matrix() {
  const out: Array<Partial<UserProfile>> = [];
  for (const goal of goals) for (const level of levels) for (const daysPerWeek of days)
    out.push({ goal, level, daysPerWeek, sessionMinutes: 60 });
  return out;
}

describe('exerciseDatabase', () => {
  it('содержит ≥ 60 упражнений с уникальными id и полными данными', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(60);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    for (const e of EXERCISES) {
      expect(e.nameRu && e.nameEn && e.instruction.length > 20).toBeTruthy();
      expect(e.equipment.length).toBeGreaterThan(0);
      for (const [m, f] of Object.entries(e.secondary)) {
        expect(MUSCLE_IDS).toContain(m);
        expect(f).toBeGreaterThan(0);
        expect(f).toBeLessThanOrEqual(1);
      }
    }
  });
  it('покрывает все 14 мышечных групп и все категории оборудования', () => {
    for (const m of MUSCLE_IDS) expect(EXERCISES.some((e) => e.primary === m)).toBe(true);
    for (const eq of EQUIPMENT_IDS) expect(EXERCISES.some((e) => e.equipment.includes(eq))).toBe(true);
  });
  it('для каждого паттерна из шаблонов есть упражнение, доступное новичку', () => {
    const pool = getAvailableExercises(resolveConstraints(generateProgram({ level: 'beginner' }).profile));
    for (const m of MUSCLE_IDS) {
      for (const p of [...MUSCLE_SLOTS[m].compound, ...MUSCLE_SLOTS[m].isolation])
        expect(pool.some((e) => e.primary === m && e.pattern === p), `${m}/${p}`).toBe(true);
    }
  });
});

describe('generateProgram: все цели × уровни × 2–6 дней', () => {
  for (const p of matrix()) {
    it(`${p.goal} / ${p.level} / ${p.daysPerWeek} дн.`, () => {
      const plan = generateProgram(p);
      expect(plan.days).toHaveLength(p.daysPerWeek!);
      const lvl = LEVELS[p.level!];
      for (const d of plan.days) {
        expect(d.exercises.length).toBeGreaterThanOrEqual(2);
        expect(d.estimatedMinutes).toBeLessThanOrEqual(60);
        const ids = d.exercises.map((e) => e.exerciseId);
        expect(new Set(ids).size).toBe(ids.length);
        // не более одного тяжёлого упражнения с утомлением 3 в день
        expect(ids.filter((id) => getExercise(id).fatigue === 3).length).toBeLessThanOrEqual(ALGO.maxHighFatiguePerDay);
        // многосуставные раньше изолирующих
        const firstIso = d.exercises.findIndex((e) => e.role === 'isolation');
        if (firstIso >= 0) expect(d.exercises.slice(firstIso).every((e) => e.role === 'isolation')).toBe(true);
        for (const e of d.exercises) {
          expect(e.sets).toBeGreaterThanOrEqual(ALGO.minDirectSets);
          expect(e.sets).toBeLessThanOrEqual(ALGO.maxSetsPerExercise);
          expect(e.repMin).toBeLessThan(e.repMax);
          expect(getExercise(e.exerciseId).difficulty).toBeLessThanOrEqual(lvl.maxDifficulty);
        }
      }
      // нагрузка: ни одна группа не превышает потолок, у крупных групп есть работа
      for (const m of MUSCLE_IDS) {
        const v = plan.weeklyVolume[m];
        expect(v.direct, `${m} потолок прямых`).toBeLessThanOrEqual(v.target * ALGO.weeklyCeilingFactor + ALGO.weeklyCeilingBonus);
        expect(v.effective, `${m} жёсткий потолок`).toBeLessThanOrEqual(MUSCLE_CONFIG[m].weeklySets[p.level!] * ALGO.hardCapFactor + ALGO.hardCapBonus);
        if (MUSCLE_CONFIG[m].kind === 'large') expect(v.direct, `${m} прямая работа`).toBeGreaterThan(0);
      }
      // рабочая неделя: дни недели строго возрастают
      const wd = plan.days.map((d) => d.weekday);
      expect([...wd].sort((a, b) => a - b)).toEqual(wd);
    });
  }
});

describe('восстановление', () => {
  it('между тренировками одной крупной группы ≥ 2 дней (с учётом перехода недели)', () => {
    for (const p of matrix()) {
      const plan = generateProgram(p);
      for (const m of MUSCLE_IDS.filter((x) => MUSCLE_CONFIG[x].kind === 'large')) {
        const wds = plan.days.filter((d) => d.exercises.some((e) => getExercise(e.exerciseId).primary === m)).map((d) => d.weekday);
        for (let i = 0; i < wds.length; i++) {
          const gap = (wds[(i + 1) % wds.length] - wds[i] + 7) % 7 || 7;
          if (wds.length > 1) expect(gap, `${p.goal}/${p.level}/${p.daysPerWeek} ${m}`).toBeGreaterThanOrEqual(MUSCLE_CONFIG[m].minGapDays);
        }
      }
    }
  });
});

describe('детерминизм', () => {
  it('одинаковый профиль → одинаковая программа, порядок массивов не влияет', () => {
    const a = generateProgram({ goal: 'hypertrophy', level: 'intermediate', daysPerWeek: 4, limitations: ['knee', 'wrist'], availableEquipment: ['barbell', 'cable', 'machine'] });
    const b = generateProgram({ goal: 'hypertrophy', level: 'intermediate', daysPerWeek: 4, limitations: ['wrist', 'knee'], availableEquipment: ['machine', 'cable', 'barbell'] });
    expect(a).toEqual(b);
    expect(generateProgram({ goal: 'strength', daysPerWeek: 3 })).toEqual(generateProgram({ goal: 'strength', daysPerWeek: 3 }));
  });
});

describe('различия уровней и целей', () => {
  const sets = (p: Partial<UserProfile>) => {
    const plan = generateProgram({ sessionMinutes: 90, ...p });
    return MUSCLE_IDS.reduce((s, m) => s + plan.weeklyVolume[m].direct, 0);
  };
  it('объём растёт от новичка к продвинутому', () => {
    const b = sets({ level: 'beginner', goal: 'hypertrophy', daysPerWeek: 4 });
    const i = sets({ level: 'intermediate', goal: 'hypertrophy', daysPerWeek: 4 });
    const a = sets({ level: 'advanced', goal: 'hypertrophy', daysPerWeek: 4 });
    expect(b).toBeLessThan(i);
    expect(i).toBeLessThan(a);
  });
  it('новичку не назначаются сложные упражнения; продвинутому — доступны', () => {
    const beg = generateProgram({ level: 'beginner', daysPerWeek: 4 });
    expect(beg.days.flatMap((d) => d.exercises).every((e) => getExercise(e.exerciseId).difficulty === 1)).toBe(true);
    const adv = generateProgram({ level: 'advanced', goal: 'strength', daysPerWeek: 4, sessionMinutes: 90 });
    expect(adv.days.flatMap((d) => d.exercises).some((e) => getExercise(e.exerciseId).difficulty >= 2)).toBe(true);
  });
  it('цель меняет повторения и отдых', () => {
    const main = (goal: Goal) => generateProgram({ goal, level: 'intermediate', daysPerWeek: 3 }).days[0].exercises.find((e) => e.role === 'compound')!;
    const str = main('strength'), hyp = main('hypertrophy'), fat = main('fat_loss');
    expect(str.repMax).toBeLessThan(hyp.repMax);
    expect(str.restSec).toBeGreaterThan(hyp.restSec);
    expect(hyp.restSec).toBeGreaterThan(fat.restSec);
  });
  it('сила: базовые движения (жим/присед) в программе; продвинутый получает специализацию', () => {
    const plan = generateProgram({ goal: 'strength', level: 'advanced', daysPerWeek: 4, sessionMinutes: 90 });
    const ids = plan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId));
    expect(ids).toContain('bench-press');
    expect(ids).toContain('back-squat');
    const base = generateProgram({ goal: 'hypertrophy', level: 'advanced', daysPerWeek: 4, sessionMinutes: 90 });
    const spec = generateProgram({ goal: 'hypertrophy', level: 'advanced', daysPerWeek: 4, sessionMinutes: 90, priorityMuscles: ['sideDelts'] });
    expect(spec.weeklyVolume.sideDelts.target).toBeGreaterThan(base.weeklyVolume.sideDelts.target);
  });
  it('силовые тренировки: фиксированное число дней = число уникальных сплитов по запросу', () => {
    expect(generateProgram({ daysPerWeek: 2 }).splitId).toBe('full_body_2');
    expect(generateProgram({ daysPerWeek: 4 }).splitId).toBe('upper_lower_4');
    expect(generateProgram({ daysPerWeek: 6 }).splitId).toBe('ppl_6');
  });
});

describe('ограничения и оборудование', () => {
  it('травмы и исключения соблюдаются', () => {
    for (const level of levels) {
      const plan = generateProgram({ level, goal: 'hypertrophy', daysPerWeek: 4, limitations: ['knee', 'shoulder', 'lowBack'], excludedExerciseIds: ['plank', 'db-curl'] });
      for (const e of plan.days.flatMap((d) => d.exercises)) {
        const ex = getExercise(e.exerciseId);
        expect(ex.joints.some((j) => ['knee', 'shoulder', 'lowBack'].includes(j))).toBe(false);
        expect(['plank', 'db-curl']).not.toContain(ex.id);
      }
    }
  });
  it('только гантели и свой вес: нет штанги, тренажёров, блоков', () => {
    const plan = generateProgram({ level: 'intermediate', daysPerWeek: 3, availableEquipment: ['dumbbell', 'bench'] });
    for (const e of plan.days.flatMap((d) => d.exercises)) {
      expect(getExercise(e.exerciseId).equipment.every((q) => ['dumbbell', 'bench', 'bodyweight'].includes(q))).toBe(true);
    }
  });
  it('несовершеннолетним программа не строится', () => {
    expect(() => generateProgram({ age: 16 })).toThrow();
  });
});

describe('замена упражнений', () => {
  const plan = generateProgram({ level: 'intermediate', goal: 'hypertrophy', daysPerWeek: 4, sessionMinutes: 90, excludedExerciseIds: ['push-up'] });
  const di = plan.days.findIndex((d) => d.exercises.some((e) => e.exerciseId === 'bench-press'));
  const ei = plan.days[di].exercises.findIndex((e) => e.exerciseId === 'bench-press');

  it('для жима лёжа предлагаются жим гантелей, тренажёр, Смит, наклонный жим; исключённое — нет', () => {
    const alts = getAlternatives(plan, di, ei).map((a) => a.exercise.id);
    for (const id of ['db-bench-press', 'machine-chest-press', 'smith-bench-press', 'incline-bb-press']) expect(alts).toContain(id);
    expect(alts).not.toContain('push-up');
    expect(alts).not.toContain('bench-press');
    for (const a of getAlternatives(plan, di, ei)) expect(a.exercise.primary).toBe('chest');
  });
  it('первыми идут то же движение, затем похожие', () => {
    const rel = getAlternatives(plan, di, ei).map((a) => a.relation);
    const first = rel.indexOf('similar_movement');
    expect(rel.slice(0, first).every((r) => r === 'same_movement')).toBe(true);
  });
  it('замена не меняет структуру дня, сохраняет подходы, пересчитывает объём', () => {
    const next = replaceExercise(plan, di, ei, 'db-bench-press');
    expect(next.days[di].exercises).toHaveLength(plan.days[di].exercises.length);
    expect(next.days[di].exercises[ei].exerciseId).toBe('db-bench-press');
    expect(next.days[di].exercises[ei].sets).toBe(plan.days[di].exercises[ei].sets);
    expect(next.days[di].exercises[ei].replacedFrom).toBe('bench-press');
    expect(next.weeklyVolume.chest.direct).toBe(plan.weeklyVolume.chest.direct);
    expect(plan.days[di].exercises[ei].exerciseId).toBe('bench-press'); // исходный план не мутирован
  });
  it('замена на изоляцию пересчитывает повторения и отдых', () => {
    const next = replaceExercise(plan, di, ei, 'cable-fly');
    const e = next.days[di].exercises[ei];
    expect(e.role).toBe('isolation');
    expect(e.repMax).toBeGreaterThan(plan.days[di].exercises[ei].repMax);
    expect(e.restSec).toBeLessThan(plan.days[di].exercises[ei].restSec);
  });
  it('нельзя заменить на упражнение другой мышцы, исключённое или уже стоящее в тренировке', () => {
    expect(() => replaceExercise(plan, di, ei, 'db-curl')).toThrow();
    expect(() => replaceExercise(plan, di, ei, 'push-up')).toThrow();
    const other = plan.days[di].exercises.find((e, i) => i !== ei && getExercise(e.exerciseId).primary === 'chest');
    if (other) expect(() => replaceExercise(plan, di, ei, other.exerciseId)).toThrow();
  });
  it('предпочтение по оборудованию поднимает такие варианты выше', () => {
    const alts = getAlternatives(plan, di, ei, { preferEquipment: ['machine'] });
    expect(alts[0].exercise.equipment).toContain('machine');
  });
});

describe('длительность тренировки', () => {
  it('план укладывается в выбранную длительность (30–90 мин), крупные группы получают прямую работу при ≥ 45 мин', () => {
    for (const sessionMinutes of durations) for (const daysPerWeek of days) for (const level of levels) {
      const plan = generateProgram({ sessionMinutes, daysPerWeek, level, goal: 'hypertrophy' });
      for (const d of plan.days) expect(d.estimatedMinutes, `${sessionMinutes}/${daysPerWeek}/${level}`).toBeLessThanOrEqual(sessionMinutes);
      if (sessionMinutes >= 45) for (const m of MUSCLE_IDS.filter((x) => MUSCLE_CONFIG[x].kind === 'large'))
        expect(plan.weeklyVolume[m].direct, `${sessionMinutes}/${daysPerWeek}/${level} ${m}`).toBeGreaterThan(0);
    }
  });
});
