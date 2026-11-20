'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Play, ChevronRight, Dumbbell } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppData } from '@/hooks/useAppData';
import { GOAL_INFO, LEVEL_INFO, MUSCLE_LABELS_RU } from '@/lib';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function HomePage() {
  const router = useRouter();
  const { ready, onboarded, profile, plan } = useAppData();

  useEffect(() => {
    if (ready && !onboarded) router.replace('/onboarding');
  }, [ready, onboarded, router]);

  if (!ready || !onboarded || !profile || !plan) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const today = (new Date().getDay() + 6) % 7;
  const nextDay = plan.days.find((d) => d.weekday >= today) ?? plan.days[0];

  return (
    <AppShell>
      <div className="space-y-5 px-4 pb-6 pt-6">
        <header>
          <p className="text-sm text-gray-500">Gym Assistant</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-gray-900">Главная</h1>
        </header>

        <Card className="p-4">
          <p className="text-sm text-gray-500">Цель</p>
          <p className="font-semibold text-gray-900">{GOAL_INFO[profile.goal].labelRu}</p>
          <p className="mt-1 text-sm text-gray-500">
            {LEVEL_INFO[profile.level].labelRu} · {profile.daysPerWeek} тр./нед · {profile.sessionMinutes} мин
          </p>
        </Card>

        {nextDay && (
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-accent to-blue-700 px-4 py-5 text-white">
              <p className="text-sm font-medium text-blue-100">Следующая тренировка</p>
              <h2 className="mt-1 text-xl font-semibold">{WEEKDAYS[nextDay.weekday]} · {nextDay.name}</h2>
              <p className="mt-1 text-sm text-blue-100">≈ {nextDay.estimatedMinutes} мин · {nextDay.exercises.length} упр.</p>
            </div>
            <div className="p-4">
              <Link href={`/program?day=${nextDay.index}`}>
                <Button fullWidth size="lg"><Play size={18} fill="currentColor" /> Начать тренировку</Button>
              </Link>
            </div>
          </Card>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-gray-900">Моя программа</h2>
            <Link href="/program" className="flex items-center gap-0.5 text-sm font-medium text-accent">
              Все дни <ChevronRight size={16} />
            </Link>
          </div>
          <div className="space-y-2">
            {plan.days.map((d) => (
              <Link key={d.index} href={`/program?day=${d.index}`}>
                <Card className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                    <Dumbbell size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">{WEEKDAYS[d.weekday]}</span>
                      <span className="truncate font-medium text-gray-900">{d.name}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-gray-500">{d.exercises.length} упр. · ≈ {d.estimatedMinutes} мин</p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-gray-300" />
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {plan.warnings.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Замечания</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800/90">
              {plan.warnings.slice(0, 3).map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
