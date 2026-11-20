'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useAppData } from '@/hooks/useAppData';

export default function ProgressPage() {
  const router = useRouter();
  const { ready, onboarded } = useAppData();
  useEffect(() => { if (ready && !onboarded) router.replace('/onboarding'); }, [ready, onboarded, router]);
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400"><TrendingUp size={28} /></div>
        <h1 className="mt-4 text-lg font-semibold text-gray-900">Прогресс</h1>
        <p className="mt-2 max-w-xs text-sm text-gray-500">История и графики — этапы 6–7.</p>
      </div>
    </AppShell>
  );
}
