'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import {
  adaptProgram,
  appendSession,
  completeSet,
  createSessionFromDay,
  finishSession,
  generateProgram,
  getExercise,
  loadActiveSession,
  loadHistory,
  MUSCLE_LABELS_RU,
  normalizeProfile,
  roundToEquipment,
  loadKind,
  minWeightKg,
  saveActiveSession,
  savePlan,
  saveProfile,
  sessionProgress,
  setWorkingWeight,
  summarizeAdaptation,
  uncompleteSet,
  updateSetValues,
  weightHintRu,
  type AdaptedProgram,
  type PlanDay,
  type UserProfile,
  type WorkoutFeedback,
  type WorkoutPlan,
  type WorkoutSession,
} from '@/lib';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ExerciseIllustration, exerciseVideoSearchUrlRu } from '@/components/exercises/ExerciseIllustration';
import { RestTimer } from './RestTimer';
import { ResultStep, SurveyStep, type FinishResult } from './FinishSheet';

const fmt = (n: number) => String(n).replace('.', ',');

interface WorkoutModeProps {
  day: PlanDay;
  /** Адаптированная программа: рекомендации по весам и скорректированный объём. */
  adapted: AdaptedProgram;
  plan: WorkoutPlan;
  profile: UserProfile;
}

export function WorkoutMode({ day, adapted, plan, profile }: WorkoutModeProps) {
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exIndex, setExIndex] = useState(0);
  const [restFor, setRestFor] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [sheet, setSheet] = useState<'none' | 'survey' | 'result'>('none');
  const [result, setResult] = useState<FinishResult | null>(null);
  const [limitationApplied, setLimitationApplied] = useState(false);

  // Инициализация / восстановление сессии
  useEffect(() => {
    const active = loadActiveSession();
    if (active && active.planDayIndex === day.index && !active.completed) {
      setSession(active);
      // продолжить с первого незавершённого упражнения
      const firstOpen = active.exercises.findIndex((ex) =>
        ex.sets.some((s) => !s.completed),
      );
      setExIndex(firstOpen >= 0 ? firstOpen : 0);
    } else {
      const s = createSessionFromDay(day, adapted.targets);
      setSession(s);
      saveActiveSession(s);
    }
    // Сессия создаётся один раз при открытии экрана.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.index]);

  const persist = useCallback((s: WorkoutSession) => {
    setSession(s);
    saveActiveSession(s.completed ? null : s);
  }, []);

  const progress = useMemo(
    () => (session ? sessionProgress(session) : { done: 0, total: 1 }),
    [session],
  );

  const history = useMemo(() => loadHistory(), []);

  if (!session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const exercise = session.exercises[exIndex];
  const meta = exercise ? getExercise(exercise.exerciseId) : null;
  const target = exercise ? adapted.targets[exercise.exerciseId] : undefined;
  const suggestedWeight = target?.weightKg ?? null;
  const kind = meta ? loadKind(meta) : 'none';
  /** Текущий рабочий вес упражнения: первый невыполненный подход, иначе последний. */
  const workingWeight = exercise
    ? (exercise.sets.find((x) => !x.completed) ?? exercise.sets[exercise.sets.length - 1])?.weightKg ?? null
    : null;

  const goEx = (dir: -1 | 1) => {
    setExIndex((i) => Math.max(0, Math.min(session.exercises.length - 1, i + dir)));
    setRestFor(null);
  };

  const onCompleteSet = (setIndex: number) => {
    if (!exercise) return;
    const set = exercise.sets[setIndex];
    const weight = set.weightKg ?? suggestedWeight;
    const reps = set.reps ?? exercise.plannedRepMin;
    const next = completeSet(session, exIndex, setIndex, weight, reps);
    persist(next);

    // Таймер отдыха, если есть ещё подходы в этом упражнении или следующее упражнение
    const isLastSetOfEx = setIndex >= exercise.plannedSets - 1;
    const isLastEx = exIndex >= session.exercises.length - 1;
    if (!isLastSetOfEx || !isLastEx) {
      setRestFor(exercise.restSec);
    }
  };

  const onUncomplete = (setIndex: number) => {
    persist(uncompleteSet(session, exIndex, setIndex));
  };

  const onChangeSet = (setIndex: number, weightKg: number | null, reps: number | null) => {
    persist(updateSetValues(session, exIndex, setIndex, weightKg, reps));
  };

  const onChangeWorkingWeight = (next: number | null) => {
    persist(setWorkingWeight(session, exIndex, next));
  };

  const stepWeight = (dir: -1 | 1) => {
    if (kind === 'none') return;
    const base = workingWeight ?? suggestedWeight ?? minWeightKg(kind);
    const step = target?.stepKg || 2.5;
    const next = dir === 1 ? base + step : Math.max(minWeightKg(kind), base - step);
    onChangeWorkingWeight(roundToEquipment(kind, next));
  };

  const onFinish = () => {
    if (progress.done === 0) {
      if (!confirm('Ни одного подхода не отмечено. Выйти без сохранения?')) return;
      saveActiveSession(null);
      router.replace('/program');
      return;
    }
    setSheet('survey');
  };

  const onSubmitSurvey = (feedback: WorkoutFeedback) => {
    setFinishing(true);
    const done = finishSession(session, feedback);
    const before = adaptProgram(plan, history, profile);
    const after = adaptProgram(plan, [done, ...history], profile);
    const summary = summarizeAdaptation(before, after, done.exercises.map((e) => e.exerciseId));
    appendSession(done);
    saveActiveSession(null);
    setResult({
      changes: summary.changes,
      volumeShift: summary.volumeShift,
      notes: after.notes,
      discomfortJoints: feedback.discomfortJoints,
    });
    setSheet('result');
  };

  const onAddLimitation = () => {
    if (!result) return;
    try {
      const next = normalizeProfile({
        ...profile,
        limitations: [...profile.limitations, ...result.discomfortJoints],
      });
      saveProfile(next);
      savePlan(generateProgram(next));
      setLimitationApplied(true);
    } catch {
      // Профиль невалиден — оставляем как есть, пользователь может изменить его в настройках.
    }
  };

  const onAbort = () => {
    if (!confirm('Прервать тренировку? Прогресс текущей сессии будет потерян.')) return;
    saveActiveSession(null);
    router.replace('/program');
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200/60 bg-white/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            onClick={onAbort}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="Выйти"
          >
            <X size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-gray-900">{session.dayName}</h1>
            <p className="text-xs text-gray-500">
              {progress.done} / {progress.total} подходов
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={onFinish} disabled={finishing}>
            <Flag size={14} />
            Завершить
          </Button>
        </div>
        <div className="mx-auto mt-2 max-w-lg">
          <ProgressBar value={progress.done} max={progress.total || 1} />
        </div>
      </header>

      {meta && exercise && (
        <main className={`mx-auto w-full max-w-lg flex-1 px-4 py-5 ${restFor != null ? 'pb-36' : 'pb-24'}`}>
          {/* Exercise header */}
          <div className="flex items-start gap-4">
            <ExerciseIllustration primary={meta.primary} pattern={meta.pattern} size={88} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-400">
                Упражнение {exIndex + 1} из {session.exercises.length}
              </p>
              <h2 className="mt-0.5 text-lg font-semibold text-gray-900">{meta.nameRu}</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {MUSCLE_LABELS_RU[exercise.targetMuscle]} · план{' '}
                {exercise.plannedSets}×{exercise.plannedRepMin}–{exercise.plannedRepMax}
                {exercise.unit === 'sec' ? ' с' : ''}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-gray-600">{meta.instruction}</p>
          <a
            href={exerciseVideoSearchUrlRu(meta.nameRu)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex text-sm font-medium text-accent"
          >
            Видео техники →
          </a>

          {/* Рабочий вес */}
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Рабочий вес</p>
                <p className="mt-0.5 text-xs text-gray-500">{weightHintRu(meta)}</p>
              </div>
              {kind !== 'none' && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => stepWeight(-1)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-700 active:bg-gray-100"
                    aria-label="Уменьшить вес"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-16 text-center text-base font-semibold text-gray-900">
                    {workingWeight != null ? `${fmt(workingWeight)} кг` : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => stepWeight(1)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-700 active:bg-gray-100"
                    aria-label="Увеличить вес"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              )}
            </div>
            {target && (
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                {target.lastPerformance && <span className="font-medium text-gray-700">В прошлый раз: {target.lastPerformance}. </span>}
                {target.reason}
              </p>
            )}
          </div>

          {/* Sets */}
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-gray-400">
              <span>#</span>
              <span>Вес, кг</span>
              <span>{exercise.unit === 'sec' ? 'Сек' : 'Повт.'}</span>
              <span />
            </div>
            {exercise.sets.map((s) => (
              <SetRow
                key={s.setIndex}
                setIndex={s.setIndex}
                weightKg={s.weightKg}
                reps={s.reps}
                completed={s.completed}
                suggestedWeight={suggestedWeight}
                suggestedReps={exercise.plannedRepMin}
                unit={exercise.unit}
                onChange={(w, r) => onChangeSet(s.setIndex, w, r)}
                onComplete={() => onCompleteSet(s.setIndex)}
                onUncomplete={() => onUncomplete(s.setIndex)}
              />
            ))}
          </div>

          {/* Nav between exercises */}
          <div className="mt-6 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              disabled={exIndex === 0}
              onClick={() => goEx(-1)}
            >
              <ChevronLeft size={18} />
              Предыдущее
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={exIndex >= session.exercises.length - 1}
              onClick={() => goEx(1)}
            >
              Следующее
              <ChevronRight size={18} />
            </Button>
          </div>
        </main>
      )}

      {sheet !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          {sheet === 'survey' && (
            <SurveyStep
              doneSets={progress.done}
              totalSets={progress.total}
              onSubmit={onSubmitSurvey}
              onCancel={() => setSheet('none')}
            />
          )}
          {sheet === 'result' && result && (
            <ResultStep
              result={result}
              limitationApplied={limitationApplied}
              onAddLimitation={onAddLimitation}
              onClose={() => router.replace('/progress')}
            />
          )}
        </div>
      )}

      {restFor != null && sheet === 'none' && (
        <RestTimer
          seconds={restFor}
          onDone={() => setRestFor(null)}
          onSkip={() => setRestFor(null)}
        />
      )}
    </div>
  );
}

function SetRow({
  setIndex,
  weightKg,
  reps,
  completed,
  suggestedWeight,
  suggestedReps,
  unit,
  onChange,
  onComplete,
  onUncomplete,
}: {
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
  suggestedWeight: number | null;
  suggestedReps: number;
  unit: 'reps' | 'sec';
  onChange: (weightKg: number | null, reps: number | null) => void;
  onComplete: () => void;
  onUncomplete: () => void;
}) {
  return (
    <div
      className={[
        'grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 rounded-2xl border px-2 py-2',
        completed ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white',
      ].join(' ')}
    >
      <span className="text-center text-sm font-medium text-gray-500">{setIndex + 1}</span>
      <input
        type="number"
        inputMode="decimal"
        step={0.5}
        min={0}
        placeholder={suggestedWeight != null ? String(suggestedWeight) : '—'}
        value={weightKg ?? ''}
        disabled={completed}
        onChange={(e) => {
          const v = e.target.value === '' ? null : parseFloat(e.target.value);
          onChange(Number.isFinite(v as number) ? (v as number) : null, reps);
        }}
        className="h-10 rounded-xl border border-gray-200 bg-white px-2 text-center text-sm outline-none focus:border-accent disabled:bg-transparent disabled:opacity-70"
      />
      <input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder={String(suggestedReps)}
        value={reps ?? ''}
        disabled={completed}
        onChange={(e) => {
          const v = e.target.value === '' ? null : parseInt(e.target.value, 10);
          onChange(weightKg, Number.isFinite(v as number) ? (v as number) : null);
        }}
        className="h-10 rounded-xl border border-gray-200 bg-white px-2 text-center text-sm outline-none focus:border-accent disabled:bg-transparent disabled:opacity-70"
      />
      <button
        type="button"
        onClick={completed ? onUncomplete : onComplete}
        className={[
          'flex h-10 w-10 items-center justify-center rounded-xl transition',
          completed
            ? 'bg-green-500 text-white'
            : 'border border-gray-200 bg-white text-gray-400 hover:border-accent hover:text-accent',
        ].join(' ')}
        aria-label={completed ? 'Снять отметку' : 'Выполнено'}
      >
        <Check size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}
