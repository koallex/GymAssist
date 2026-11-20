'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adaptProgram, loadHistory } from '@/lib';
import { useAppData } from '@/hooks/useAppData';
import { WorkoutMode } from '@/components/workout/WorkoutMode';

function WorkoutContent() {
  const router = useRouter();
  const search = useSearchParams();
  const { ready, onboarded, plan, profile } = useAppData();

  const dayIndex = useMemo(() => {
    const raw = search.get('day');
    if (raw == null) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }, [search]);

  useEffect(() => {
    if (ready && !onboarded) router.replace('/onboarding');
  }, [ready, onboarded, router]);

  // Рекомендации по весам и скорректированный объём считаются из плана и истории (детерминированно).
  const adapted = useMemo(
    () => (plan && profile ? adaptProgram(plan, loadHistory(), profile) : null),
    [plan, profile],
  );

  if (!ready || !onboarded || !plan || !profile || !adapted) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const day = adapted.plan.days.find((d) => d.index === dayIndex) ?? adapted.plan.days[0];
  if (!day) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#f5f5f7] px-4">
        <p className="text-gray-500">День программы не найден</p>
        <button type="button" onClick={() => router.replace('/program')} className="text-accent">
          К программе
        </button>
      </div>
    );
  }

  return <WorkoutMode day={day} adapted={adapted} plan={plan} profile={profile} />;
}

export default function WorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f7]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      }
    >
      <WorkoutContent />
    </Suspense>
  );
}
