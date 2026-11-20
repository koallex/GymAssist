'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Dumbbell, TrendingUp } from 'lucide-react';
import {
  getExercise,
  loadHistory,
  MUSCLE_LABELS_RU,
  type WorkoutSession,
} from '@/lib';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { useAppData } from '@/hooks/useAppData';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function durationMin(s: WorkoutSession): number | null {
  if (!s.finishedAt) return null;
  const ms = new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 60000);
}

export default function ProgressPage() {
  const router = useRouter();
  const { ready, onboarded } = useAppData();
  const [history, setHistory] = useState<WorkoutSession[]>([]);

  useEffect(() => {
    if (ready && !onboarded) router.replace('/onboarding');
  }, [ready, onboarded, router]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const stats = useMemo(() => {
    const completed = history.filter((h) => h.completed);
    let totalSets = 0;
    const exerciseMax: Record<string, number> = {};
    for (const s of completed) {
      for (const ex of s.exercises) {
        for (const set of ex.sets) {
          if (set.completed) totalSets += 1;
          if (set.completed && set.weightKg != null && set.weightKg > 0) {
            exerciseMax[ex.exerciseId] = Math.max(exerciseMax[ex.exerciseId] ?? 0, set.weightKg);
          }
        }
      }
    }
    const top = Object.entries(exerciseMax)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { count: completed.length, totalSets, top };
  }, [history]);

  return (
    <AppShell>
      <div className="space-y-5 px-4 pb-8 pt-6">
        <header>
          <h1 className="text-2xl font-semibold text-gray-900">Прогресс</h1>
          <p className="mt-0.5 text-sm text-gray-500">История тренировок и рабочие веса</p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">Тренировок</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.count}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Dumbbell size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">Подходов</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.totalSets}</p>
          </Card>
        </div>

        {stats.top.length > 0 && (
          <section>
            <h2 className="mb-2 text-[15px] font-semibold text-gray-900">Лучшие веса</h2>
            <Card className="divide-y divide-gray-100">
              {stats.top.map(([id, w]) => {
                let name = id;
                try {
                  name = getExercise(id).nameRu;
                } catch {
                  /* keep id */
                }
                return (
                  <div key={id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-800">{name}</span>
                    <span className="text-sm font-semibold text-gray-900">{w} кг</span>
                  </div>
                );
              })}
            </Card>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-gray-900">История</h2>
          {history.length === 0 ? (
            <Card className="px-4 py-10 text-center">
              <TrendingUp size={28} className="mx-auto text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                Пока нет завершённых тренировок. Начните первую из раздела «Программа».
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {history.map((s) => {
                const mins = durationMin(s);
                const setsDone = s.exercises.reduce(
                  (n, ex) => n + ex.sets.filter((x) => x.completed).length,
                  0,
                );
                return (
                  <Card key={s.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{s.dayName}</p>
                        <p className="mt-0.5 text-sm text-gray-500">{formatDate(s.startedAt)}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {setsDone} подходов
                          {mins != null ? ` · ${mins} мин` : ''}
                          {!s.completed ? ' · не завершена' : ''}
                        </p>
                      </div>
                      <span
                        className={[
                          'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                          s.completed ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500',
                        ].join(' ')}
                      >
                        {s.completed ? 'Готово' : 'Черновик'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.exercises.slice(0, 4).map((ex) => (
                        <span
                          key={ex.exerciseId}
                          className="rounded-md bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-500"
                        >
                          {MUSCLE_LABELS_RU[ex.targetMuscle]}
                        </span>
                      ))}
                      {s.exercises.length > 4 && (
                        <span className="text-[11px] text-gray-400">+{s.exercises.length - 4}</span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
