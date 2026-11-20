'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  EXERCISES,
  MUSCLE_LABELS_RU,
  EQUIPMENT_LABELS_RU,
  PATTERN_LABELS_RU,
  type Exercise,
} from '@/lib';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { ExerciseIllustration, exerciseVideoSearchUrl, exerciseVideoSearchUrlRu } from '@/components/exercises/ExerciseIllustration';
import { useAppData } from '@/hooks/useAppData';

export default function ExerciseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { ready, onboarded } = useAppData();
  const id = typeof params.id === 'string' ? params.id : '';

  useEffect(() => {
    if (ready && !onboarded) router.replace('/onboarding');
  }, [ready, onboarded, router]);

  const exercise: Exercise | undefined = useMemo(
    () => EXERCISES.find((e) => e.id === id),
    [id],
  );

  if (!exercise) {
    return (
      <AppShell>
        <div className="px-4 py-12 text-center">
          <p className="text-gray-500">Упражнение не найдено</p>
          <Link href="/library" className="mt-4 inline-block text-accent">← В библиотеку</Link>
        </div>
      </AppShell>
    );
  }

  const secondary = Object.entries(exercise.secondary) as [string, number][];

  return (
    <AppShell>
      <div className="pb-8">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200/60 bg-white/90 px-4 py-3 backdrop-blur-md">
          <Link href="/library" className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="truncate text-lg font-semibold text-gray-900">{exercise.nameRu}</h1>
        </header>

        <div className="flex flex-col items-center px-4 pt-6">
          <ExerciseIllustration primary={exercise.primary} pattern={exercise.pattern} size={160} />
          <p className="mt-2 text-sm text-gray-400">{exercise.nameEn}</p>
        </div>

        <div className="mt-6 space-y-3 px-4">
          <Card className="p-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-400">Основная мышца</dt>
                <dd className="mt-0.5 font-medium text-gray-900">{MUSCLE_LABELS_RU[exercise.primary]}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Тип</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {exercise.category === 'compound' ? 'Базовое' : 'Изолирующее'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Сложность</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {exercise.difficulty === 1 ? 'Лёгкое' : exercise.difficulty === 2 ? 'Среднее' : 'Сложное'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Паттерн</dt>
                <dd className="mt-0.5 font-medium text-gray-900">{PATTERN_LABELS_RU[exercise.pattern]}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-gray-900">Оборудование</h2>
            <p className="mt-1 text-sm text-gray-600">
              {exercise.equipment.map((e) => EQUIPMENT_LABELS_RU[e]).join(', ')}
            </p>
          </Card>

          {secondary.length > 0 && (
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-gray-900">Дополнительно задействованы</h2>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {secondary.map(([m, v]) => (
                  <li key={m}>
                    {MUSCLE_LABELS_RU[m as keyof typeof MUSCLE_LABELS_RU] ?? m}
                    <span className="text-gray-400"> · {Math.round(v * 100)}%</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-gray-900">Техника</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{exercise.instruction}</p>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-gray-900">Видео техники</h2>
            <p className="mt-1 text-xs text-gray-500">
              Откроется поиск на YouTube по названию упражнения. Выберите ролик с корректной техникой.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href={exerciseVideoSearchUrl(exercise.nameEn)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center justify-center rounded-xl bg-accent text-sm font-medium text-white"
              >
                Смотреть технику (EN)
              </a>
              <a
                href={exerciseVideoSearchUrlRu(exercise.nameRu)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800"
              >
                Смотреть технику (RU)
              </a>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
