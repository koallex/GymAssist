'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppData } from '@/hooks/useAppData';
import { WorkoutMode } from '@/components/workout/WorkoutMode';

function WorkoutContent() {
  const router = useRouter();
  const search = useSearchParams();
  const { ready, onboarded, plan } = useAppData();

  const dayIndex = useMemo(() => {
    const raw = search.get('day');
    if (raw == null) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }, [search]);

  useEffect(() => {
    if (ready && !onboarded) router.replace('/onboarding');
  }, [ready, onboarded, router]);

  if (!ready || !onboarded || !plan) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const day = plan.days.find((d) => d.index === dayIndex) ?? plan.days[0];
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

  return <WorkoutMode day={day} />;
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
