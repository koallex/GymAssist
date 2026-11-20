'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Replace, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getAlternatives,
  getExercise,
  MUSCLE_LABELS_RU,
  replaceExercise,
  savePlan,
  type WorkoutPlan,
} from '@/lib';
import { AppShell } from '@/components/layout/AppShell';
import { ExerciseIllustration } from '@/components/exercises/ExerciseIllustration';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppData } from '@/hooks/useAppData';

const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WD_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

function ProgramContent() {
  const router = useRouter();
  const search = useSearchParams();
  const { ready, onboarded, plan: initial, refresh } = useAppData();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<{ day: number; ex: number } | null>(null);

  useEffect(() => {
    if (ready && !onboarded) router.replace('/onboarding');
  }, [ready, onboarded, router]);

  useEffect(() => {
    if (initial) {
      setPlan(initial);
      const dp = search.get('day');
      if (dp != null) {
        const idx = parseInt(dp, 10);
        if (initial.days.some((d) => d.index === idx)) setSelected(idx);
      } else {
        setSelected(initial.days[0]?.index ?? 0);
      }
    }
  }, [initial, search]);

  if (!ready || !onboarded || !plan) {
    return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  }

  const day = plan.days.find((d) => d.index === selected) ?? plan.days[0];
  const alternatives = replacing ? getAlternatives(plan, replacing.day, replacing.ex) : [];

  const applyReplace = (newId: string) => {
    if (!replacing) return;
    const next = replaceExercise(plan, replacing.day, replacing.ex, newId);
    setPlan(next);
    savePlan(next);
    refresh();
    setReplacing(null);
  };

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-10 border-b border-gray-200/60 bg-white/90 px-4 pb-3 pt-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"><ArrowLeft size={20} /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-gray-900">Моя программа</h1>
            <p className="text-sm text-gray-500">{plan.splitName}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {plan.days.map((d) => (
            <button key={d.index} type="button" onClick={() => { setSelected(d.index); setReplacing(null); }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${d.index === selected ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600'}`}>
              {WD[d.weekday]}
            </button>
          ))}
        </div>
      </header>

      {day && (
        <>
          <div className="px-4 pt-5">
            <h2 className="text-xl font-semibold text-gray-900">{WD_FULL[day.weekday]} · {day.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1"><Clock size={14} />≈ {day.estimatedMinutes} мин</span>
              <span>{day.muscles.map((m) => MUSCLE_LABELS_RU[m]).join(' · ')}</span>
            </div>
          </div>

          <div className="mt-4 space-y-2 px-4">
            {day.exercises.map((ex, i) => {
              const meta = getExercise(ex.exerciseId);
              const reps = ex.unit === 'sec' ? `${ex.repMin}–${ex.repMax} с` : `${ex.repMin}–${ex.repMax}`;
              const key = `${day.index}-${i}`;
              const isExp = expanded === key;
              return (
                <Card key={key} className={`overflow-hidden ${replacing?.day === day.index && replacing.ex === i ? 'ring-2 ring-accent' : ''}`}>
                  <button type="button" onClick={() => setExpanded(isExp ? null : key)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left">
                    <ExerciseIllustration primary={meta.primary} pattern={meta.pattern} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{meta.nameRu}</p>
                      <p className="mt-0.5 text-sm text-gray-500">{MUSCLE_LABELS_RU[ex.targetMuscle]} · {ex.sets}×{reps} · отдых {ex.restSec} с</p>
                    </div>
                    {isExp ? <ChevronUp size={18} className="mt-1 shrink-0 text-gray-400" /> : <ChevronDown size={18} className="mt-1 shrink-0 text-gray-400" />}
                  </button>
                  {isExp && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                      <p className="text-sm leading-relaxed text-gray-600">{meta.instruction}</p>
                      <div className="mt-3">
                        <Button variant="secondary" size="sm" onClick={() => setReplacing({ day: day.index, ex: i })}>
                          <Replace size={14} /> Заменить
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {day && (
        <div className="mt-6 px-4">
          <Link href={`/workout?day=${day.index}`}>
            <Button fullWidth size="lg">Начать эту тренировку</Button>
          </Link>
        </div>
      )}

      {replacing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[80dvh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl">
            <div className="sticky top-0 border-b border-gray-100 bg-white px-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Заменить упражнение</h3>
                <button type="button" onClick={() => setReplacing(null)} className="text-sm font-medium text-accent">Отмена</button>
              </div>
            </div>
            <ul className="max-h-[60dvh] overflow-y-auto px-4 py-2">
              {alternatives.length === 0 && <li className="py-6 text-center text-sm text-gray-500">Нет подходящих альтернатив</li>}
              {alternatives.map((alt) => (
                <li key={alt.exercise.id}>
                  <button type="button" onClick={() => applyReplace(alt.exercise.id)}
                    className="flex w-full items-start gap-3 rounded-2xl px-2 py-3 text-left hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{alt.exercise.nameRu}</p>
                      <p className="mt-0.5 text-sm text-gray-500">{MUSCLE_LABELS_RU[alt.exercise.primary]} · {alt.note}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProgramPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>}>
        <ProgramContent />
      </Suspense>
    </AppShell>
  );
}
