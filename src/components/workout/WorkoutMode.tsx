'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  X,
} from 'lucide-react';
import {
  appendSession,
  completeSet,
  createSessionFromDay,
  finishSession,
  getExercise,
  lastWeightForExercise,
  loadActiveSession,
  loadHistory,
  MUSCLE_LABELS_RU,
  saveActiveSession,
  sessionProgress,
  uncompleteSet,
  updateSetValues,
  type PlanDay,
  type WorkoutSession,
} from '@/lib';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ExerciseIllustration, exerciseVideoSearchUrlRu } from '@/components/exercises/ExerciseIllustration';
import { RestTimer } from './RestTimer';

export function WorkoutMode({ day }: { day: PlanDay }) {
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exIndex, setExIndex] = useState(0);
  const [restFor, setRestFor] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);

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
      const s = createSessionFromDay(day);
      setSession(s);
      saveActiveSession(s);
    }
  }, [day]);

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
  const suggestedWeight = exercise
    ? lastWeightForExercise(history, exercise.exerciseId)
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

  const onFinish = () => {
    setFinishing(true);
    const done = finishSession(session);
    appendSession(done);
    saveActiveSession(null);
    router.replace('/progress');
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

          {/* Sets */}
          <div className="mt-5 space-y-2">
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

      {restFor != null && (
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
