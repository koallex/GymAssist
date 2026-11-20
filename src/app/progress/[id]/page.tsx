'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getExercise, loadHistory, MUSCLE_LABELS_RU, type WorkoutSession } from '@/lib';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { useAppData } from '@/hooks/useAppData';

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { ready, onboarded } = useAppData();
  const id = typeof params.id === 'string' ? params.id : '';

  useEffect(() => {
    if (ready && !onboarded) router.replace('/onboarding');
  }, [ready, onboarded, router]);

  const session: WorkoutSession | undefined = useMemo(
    () => loadHistory().find((s) => s.id === id),
    [id],
  );

  if (!session) {
    return (
      <AppShell>
        <div className="px-4 py-12 text-center">
          <p className="text-gray-500">Тренировка не найдена</p>
          <Link href="/progress" className="mt-4 inline-block text-accent">
            ← К прогрессу
          </Link>
        </div>
      </AppShell>
    );
  }

  const durationMin =
    session.finishedAt != null
      ? Math.round(
          (new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 60000,
        )
      : null;

  return (
    <AppShell>
      <div className="pb-8">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200/60 bg-white/90 px-4 py-3 backdrop-blur-md">
          <Link
            href="/progress"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-gray-900">{session.dayName}</h1>
            <p className="text-xs text-gray-500">{formatDateTime(session.startedAt)}</p>
          </div>
        </header>

        <div className="space-y-3 px-4 pt-4">
          <Card className="grid grid-cols-3 gap-2 p-4 text-center">
            <div>
              <p className="text-xs text-gray-400">Статус</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">
                {session.completed ? 'Завершена' : 'Черновик'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Длительность</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">
                {durationMin != null ? `${durationMin} мин` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Упражнений</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">{session.exercises.length}</p>
            </div>
          </Card>

          {session.exercises.map((ex) => {
            let name = ex.exerciseId;
            try {
              name = getExercise(ex.exerciseId).nameRu;
            } catch {
              /* */
            }
            return (
              <Card key={ex.exerciseId} className="overflow-hidden">
                <div className="border-b border-gray-50 px-4 py-3">
                  <p className="font-medium text-gray-900">{name}</p>
                  <p className="text-xs text-gray-500">
                    {MUSCLE_LABELS_RU[ex.targetMuscle]} · план {ex.plannedSets}×
                    {ex.plannedRepMin}–{ex.plannedRepMax}
                    {ex.unit === 'sec' ? ' с' : ''}
                  </p>
                </div>
                <div className="divide-y divide-gray-50">
                  {ex.sets.map((s) => (
                    <div
                      key={s.setIndex}
                      className="flex items-center justify-between px-4 py-2 text-sm"
                    >
                      <span className="text-gray-400">Подход {s.setIndex + 1}</span>
                      {s.completed ? (
                        <span className="font-medium text-gray-900">
                          {s.weightKg != null ? `${s.weightKg} кг` : '—'} ×{' '}
                          {s.reps != null ? s.reps : '—'}
                          {ex.unit === 'sec' ? ' с' : ''}
                        </span>
                      ) : (
                        <span className="text-gray-300">не выполнен</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
