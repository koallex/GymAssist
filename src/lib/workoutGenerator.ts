/**
 * Детерминированный генератор программы. Не зависит от React, не использует случайность.
 *
 * Шаги:
 *  1. Нормализация профиля, выбор сплита (workoutSplit).
 *  2. Недельная цель по каждой мышце (эффективные подходы) = таблица уровня × цель × возраст × специализация.
 *  3. Распределение цели по дням, где мышца встречается в сплите.
 *  4. По каждому дню: для каждой мышцы вычитается косвенная нагрузка от уже выбранных упражнений
 *     (не более ALGO.indirectCreditCap от дневной цели), остаток раскладывается на упражнения
 *     (сначала многосуставные, затем изолирующие), паттерны вращаются по дням недели.
 *  5. Подгонка под длительность тренировки (сначала сокращаются изоляция и малые группы).
 *  6. Расчёт недельного объёма и предупреждений.
 */
import {
  ALGO, CONFIG_VERSION, GOALS, LEVELS, MUSCLE_CONFIG, ageAdjustment,
} from './config';
import { computeWeeklyVolume } from './analytics';
import {
  getAvailableExercises, getExercise, type ExerciseConstraints,
} from './exerciseDatabase';
import { MUSCLE_LABELS_RU, MUSCLE_SLOTS } from './muscleGroups';
import { GOAL_INFO, SAFETY_NOTES } from './trainingGoals';
import { normalizeProfile, validateProfile } from './userProfile';
import { chooseSplit, type SplitTemplate } from './workoutSplit';
import {
  MUSCLE_IDS,
  type Exercise, type MuscleId, type PlanDay, type PlannedExercise, type ProgressionRule,
  type UserProfile, type WorkoutPlan,
} from './types';


// ───────────────────────── вспомогательное ─────────────────────────

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function rotate<T>(arr: readonly T[], k: number): T[] {
  if (arr.length === 0) return [];
  const s = k % arr.length;
  return [...arr.slice(s), ...arr.slice(0, s)];
}

const byOrder = (a: MuscleId, b: MuscleId) => MUSCLE_CONFIG[a].order - MUSCLE_CONFIG[b].order;

export function resolveConstraints(profile: UserProfile): ExerciseConstraints {
  const age = ageAdjustment(profile.age);
  const maxDifficulty = Math.min(LEVELS[profile.level].maxDifficulty, age.maxDifficulty ?? 3) as 1 | 2 | 3;
  return {
    equipment: profile.availableEquipment,
    excludedIds: profile.excludedExerciseIds,
    limitations: profile.limitations,
    maxDifficulty,
  };
}

/** Подходы/повторения/отдых для упражнения с учётом цели, уровня, возраста и типа упражнения. */
export function prescribe(ex: Exercise, sets: number, profile: UserProfile): PlannedExercise {
  const goal = GOALS[profile.goal];
  const lvl = LEVELS[profile.level];
  const age = ageAdjustment(profile.age);
  const base = ex.category === 'compound' ? goal.compound : goal.isolation;

  let repMin: number;
  let repMax: number;
  let unit: 'reps' | 'sec' = 'reps';
  let restSec = base.restSec + lvl.restBonusSec + age.restBonusSec;

  if (ex.timed) {
    unit = 'sec';
    repMin = ALGO.timedHold.min;
    repMax = ALGO.timedHold.max;
    restSec = Math.min(restSec, ALGO.timedHold.restSec + age.restBonusSec);
  } else {
    repMin = base.reps[0] + lvl.repShift;
    repMax = Math.min(base.reps[1] + lvl.repShift, ALGO.repCap);
    if (ex.repStyle === 'high') {
      repMin = Math.max(repMin, ALGO.highRep.min);
      repMax = Math.min(Math.max(repMax, repMin + ALGO.highRep.span), ALGO.highRep.cap);
    }
  }

  return {
    exerciseId: ex.id,
    targetMuscle: ex.primary,
    role: ex.category,
    sets,
    repMin,
    repMax,
    unit,
    restSec,
    targetRIR: (ex.category === 'compound' ? lvl.rirCompound : lvl.rirIsolation) + age.rirBonus,
  };
}

export function estimateMinutes(list: readonly PlannedExercise[]): number {
  const sec = list.reduce(
    (s, p) => s + p.sets * (ALGO.workSecPerSet[p.role] + p.restSec) + ALGO.transitionSec, 0);
  return ALGO.warmupMinutes + sec / 60;
}

// ───────────────────────── цели по мышцам ─────────────────────────

function computeWeeklyTargets(p: UserProfile, present: Set<MuscleId>): Record<MuscleId, number> {
  const goal = GOALS[p.goal];
  const lvl = LEVELS[p.level];
  const age = ageAdjustment(p.age);
  const out = {} as Record<MuscleId, number>;
  for (const m of MUSCLE_IDS) {
    if (!present.has(m)) { out[m] = 0; continue; }
    const cfg = MUSCLE_CONFIG[m];
    let mult = goal.volumeMultiplier * age.volumeMultiplier;
    if (cfg.kind === 'small') mult *= goal.accessoryMultiplier;
    if (p.level === 'advanced' && p.priorityMuscles.includes(m)) mult *= lvl.specializationMultiplier;
    out[m] = Math.round(cfg.weeklySets[p.level] * mult);
  }
  return out;
}

/**
 * Раскладывает недельную цель на дни. Если на день выходит < minDaySets — объём собирается
 * в меньшее число дней; дни выбираются с наименьшей текущей загрузкой (баланс длительности тренировок).
 */
function distribute(target: number, dayIdxs: number[], load: number[]): Map<number, number> {
  const res = new Map<number, number>();
  if (target < ALGO.minDaySets || dayIdxs.length === 0) return res;
  const k = Math.max(1, Math.min(dayIdxs.length, Math.floor(target / ALGO.minDaySets)));
  const chosen = [...dayIdxs].sort((a, b) => load[a] - load[b] || a - b).slice(0, k).sort((a, b) => a - b);
  const base = Math.floor(target / k);
  const extra = target - base * k;
  chosen.forEach((di, i) => {
    const v = base + (i < extra ? 1 : 0);
    res.set(di, v);
    load[di] += v;
  });
  return res;
}

// ───────────────────────── построение дня ─────────────────────────

interface Ctx {
  profile: UserProfile;
  pool: Exercise[];
  used: Map<string, number>;
}

function score(c: Ctx, e: Exercise): number {
  const lvl = LEVELS[c.profile.level];
  const goal = GOALS[c.profile.goal];
  let s = e.rank;
  for (const eq of e.equipment) s += lvl.equipmentBias[eq] ?? 0;
  if (e.mainLift) s += goal.mainLiftBonus;
  const penalty = e.category === 'compound'
    ? (goal.repeatCompounds ? 0 : lvl.repeatPenalty.compound)
    : lvl.repeatPenalty.isolation;
  s += (c.used.get(e.id) ?? 0) * penalty;
  return s;
}

function best(c: Ctx, list: Exercise[]): Exercise | undefined {
  let top: Exercise | undefined;
  let topScore = Infinity;
  for (const e of list) {
    const sc = score(c, e);
    if (sc < topScore || (sc === topScore && top && e.id < top.id)) { top = e; topScore = sc; }
  }
  return top;
}

function buildDay(
  c: Ctx,
  muscles: MuscleId[],
  targets: Partial<Record<MuscleId, number>>,
  occurrence: Partial<Record<MuscleId, number>>,
): PlannedExercise[] {
  const lvl = LEVELS[c.profile.level];
  const goal = GOALS[c.profile.goal];
  const credit: Partial<Record<MuscleId, number>> = {};
  const chosen = new Set<string>();
  let highFatigue = 0;
  const out: PlannedExercise[] = [];

  const pick = (m: MuscleId, patterns: string[], role: 'compound' | 'isolation', startAt: number): Exercise | undefined => {
    const cands = c.pool.filter((e) =>
      e.primary === m && !chosen.has(e.id) &&
      !(e.fatigue === 3 && highFatigue >= ALGO.maxHighFatiguePerDay));
    const sameRole = cands.filter((e) => e.category === role);
    for (let i = 0; i < patterns.length; i++) {
      const p = patterns[(startAt + i) % patterns.length];
      const found = best(c, sameRole.filter((e) => e.pattern === p));
      if (found) return found;
    }
    return best(c, sameRole);
  };

  for (const m of [...muscles].sort(byOrder)) {
    const raw = Math.min(targets[m] ?? 0, lvl.maxSessionEffectiveSets);
    if (raw <= 0) continue;
    const remaining = raw - Math.min(credit[m] ?? 0, raw * ALGO.indirectCreditCap);
    if (remaining < ALGO.minRemainingToAdd) continue;

    const total = Math.max(ALGO.minDirectSets, Math.round(remaining));
    const n = Math.min(lvl.maxExercisesPerMuscleDay, Math.max(1, Math.ceil(total / goal.setsPerExercise)));
    const slots = MUSCLE_SLOTS[m];
    const occ = occurrence[m] ?? 0;
    const compPatterns = rotate(slots.compound, occ);
    const isoPatterns = rotate(slots.isolation, occ);
    const nComp = slots.compound.length === 0 ? 0
      : Math.min(n, slots.compound.length, lvl.maxCompoundPerMuscle, Math.max(1, Math.round(n * goal.compoundShare)));

    const picks: Exercise[] = [];
    for (let i = 0; i < n; i++) {
      const wantCompound = i < nComp;
      let e = wantCompound ? pick(m, compPatterns, 'compound', i) : pick(m, isoPatterns, 'isolation', i - nComp);
      if (!e) e = wantCompound ? pick(m, isoPatterns, 'isolation', 0) : pick(m, compPatterns, 'compound', 0);
      if (!e) continue;
      chosen.add(e.id);
      if (e.fatigue === 3) highFatigue++;
      picks.push(e);
    }
    if (picks.length === 0) continue;

    const base = Math.floor(total / picks.length);
    const extra = total - base * picks.length;
    picks.forEach((e, i) => {
      const sets = Math.min(ALGO.maxSetsPerExercise, base + (i < extra ? 1 : 0));
      c.used.set(e.id, (c.used.get(e.id) ?? 0) + 1);
      out.push(prescribe(e, sets, c.profile));
      for (const [sm, f] of Object.entries(e.secondary) as Array<[MuscleId, number]>) {
        credit[sm] = (credit[sm] ?? 0) + sets * f;
      }
    });
  }

  // порядок: многосуставные раньше изолирующих, внутри — по порядку мышц
  return out
    .map((p, i) => ({ p, i }))
    .sort((a, b) =>
      (a.p.role === b.p.role ? 0 : a.p.role === 'compound' ? -1 : 1) ||
      byOrder(a.p.targetMuscle, b.p.targetMuscle) || a.i - b.i)
    .map((x) => x.p);
}

/**
 * Подгонка под длительность. Порядок: подходы свыше 3 → изоляция до 2 подходов →
 * убрать самую малозначимую изоляцию → подходы базовых до 2 → убрать упражнения.
 * Базовые движения и единственное упражнение крупной группы защищены до последнего.
 */
function trimToDuration(
  list: PlannedExercise[], minutes: number, coverage: Partial<Record<MuscleId, number>>,
): PlannedExercise[] {
  const items = list.map((p) => ({ ...p }));
  const key = (p: PlannedExercise) => (p.role === 'isolation' ? 100 : 0) + MUSCLE_CONFIG[p.targetMuscle].trimPriority;
  const worst = (arr: PlannedExercise[]) => arr.reduce((a, b) => (key(b) > key(a) ? b : a));
  /** Единственное упражнение крупной группы убирается в последнюю очередь. */
  const removable = (): PlannedExercise[] => {
    const safe = items.filter((p) =>
      MUSCLE_CONFIG[p.targetMuscle].kind === 'small' || items.some((q) => q !== p && q.targetMuscle === p.targetMuscle));
    return safe.length ? safe : items;
  };
  const remove = (p: PlannedExercise) => items.splice(items.indexOf(p), 1);
  while (estimateMinutes(items) > minutes && items.length > 1) {
    const over3 = items.filter((p) => p.sets > 3);
    if (over3.length) { worst(over3).sets--; continue; }
    const iso = items.filter((p) => p.role === 'isolation');
    const isoOver2 = iso.filter((p) => p.sets > ALGO.minDirectSets);
    if (isoOver2.length) { worst(isoOver2).sets--; continue; }
    const removableIso = removable().filter((p) => p.role === 'isolation');
    if (removableIso.length) { remove(worst(removableIso)); continue; }
    const over2 = items.filter((p) => p.sets > ALGO.minDirectSets);
    if (over2.length) { worst(over2).sets--; continue; }
    // Крайний случай: первой убирается группа, которая уже встречалась в неделе чаще (иначе группа выпадет во все дни).
    remove(removable().reduce((a, b) => {
      const ca = coverage[a.targetMuscle] ?? 0, cb = coverage[b.targetMuscle] ?? 0;
      return cb > ca || (cb === ca && key(b) > key(a)) ? b : a;
    }));
  }
  return items;
}

// ───────────────────────── публичный API ─────────────────────────

export function buildProgression(profile: UserProfile): ProgressionRule {
  const g = GOALS[profile.goal].progression;
  const n = LEVELS[profile.level].sessionsAtTopToProgress;
  return {
    model: 'double_progression',
    sessionsAtTopToProgress: n,
    incrementKg: { upper: g.upperKg, lower: g.lowerKg, isolation: g.isolationKg },
    description: `Когда во всех подходах упражнения вы достигаете верхней границы повторений с запасом ${LEVELS[profile.level].rirCompound} повт. (${n} раз подряд), добавьте вес малым шагом.`,
  };
}

export function generateProgram(input: Partial<UserProfile>): WorkoutPlan {
  const profile = normalizeProfile(input);
  const validation = validateProfile(profile);
  if (validation.errors.length) throw new Error(validation.errors.join(' '));

  const { split, warnings: splitWarnings } = chooseSplit(profile);
  const warnings = [...validation.warnings, ...splitWarnings];
  const pool = getAvailableExercises(resolveConstraints(profile));
  return assemblePlan(profile, split, pool, warnings);
}

function assemblePlan(profile: UserProfile, split: SplitTemplate, pool: Exercise[], warnings: string[]): WorkoutPlan {
  const present = new Set<MuscleId>(split.days.flatMap((d) => d.muscles));
  const targets = computeWeeklyTargets(profile, present);

  // дни по мышцам и распределение целей
  const dayTargets: Array<Partial<Record<MuscleId, number>>> = split.days.map(() => ({}));
  const occurrence: Array<Partial<Record<MuscleId, number>>> = split.days.map(() => ({}));
  const load = split.days.map(() => 0);
  for (const m of [...MUSCLE_IDS].sort(byOrder)) {
    const idxs = split.days.map((d, i) => (d.muscles.includes(m) ? i : -1)).filter((i) => i >= 0);
    const dist = distribute(targets[m], idxs, load);
    [...dist.keys()].sort((a, b) => a - b).forEach((di, pos) => {
      dayTargets[di][m] = dist.get(di);
      occurrence[di][m] = pos;
    });
  }

  const ctx: Ctx = { profile, pool, used: new Map() };
  const coverage: Partial<Record<MuscleId, number>> = {};
  const days: PlanDay[] = split.days.map((d, i) => {
    const built = buildDay(ctx, d.muscles, dayTargets[i], occurrence[i]);
    const trimmed = trimToDuration(built, profile.sessionMinutes, coverage);
    for (const m of new Set(trimmed.map((p) => p.targetMuscle))) coverage[m] = (coverage[m] ?? 0) + 1;
    return {
      index: i,
      weekday: split.weekdays[i],
      name: d.name,
      focus: d.focus,
      muscles: [...d.muscles],
      exercises: trimmed,
      estimatedMinutes: Math.round(estimateMinutes(trimmed)),
    };
  });

  const weeklyVolume = computeWeeklyVolume(days, targets);
  for (const m of MUSCLE_IDS) {
    const v = weeklyVolume[m];
    if (v.target > 0 && v.effective < v.target * ALGO.lowCoverageThreshold) {
      warnings.push(`${MUSCLE_LABELS_RU[m]}: недельный объём (${v.effective}) ниже целевого (${v.target}) — ограничено временем, оборудованием или ограничениями.`);
    }
  }

  return {
    id: `plan-${hashString(JSON.stringify(profile) + CONFIG_VERSION)}`,
    configVersion: CONFIG_VERSION,
    profile,
    splitId: split.id,
    splitName: split.name,
    days,
    weeklyVolume,
    warnings,
    notes: [...GOAL_INFO[profile.goal].notes, ...SAFETY_NOTES],
    progression: buildProgression(profile),
  };
}

export { getExercise };
