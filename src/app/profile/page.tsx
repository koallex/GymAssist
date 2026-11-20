'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Trash2 } from 'lucide-react';
import {
  GOAL_INFO, LEVEL_INFO, clearAllData, generateProgram, normalizeProfile, savePlan, saveProfile, validateProfile,
  type Goal, type Level, type UserProfile,
} from '@/lib';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppData } from '@/hooks/useAppData';

export default function ProfilePage() {
  const router = useRouter();
  const { ready, onboarded, profile, updateProfile, regenerate } = useAppData();
  const [draft, setDraft] = useState<UserProfile | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { if (ready && !onboarded) router.replace('/onboarding'); }, [ready, onboarded, router]);
  useEffect(() => { if (profile) setDraft({ ...profile }); }, [profile]);

  if (!ready || !onboarded || !draft) {
    return <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f7]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  }

  const set = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setDirty(true);
    setMsg(null);
  };

  const save = (regen: boolean) => {
    if (!draft) return;
    const next = normalizeProfile(draft);
    const v = validateProfile(next);
    if (v.errors.length) { setMsg(v.errors[0]); return; }
    if (regen) {
      const plan = generateProgram(next);
      saveProfile(next);
      savePlan(plan);
      updateProfile(next, false);
      setMsg('Профиль сохранён, программа пересчитана.');
    } else {
      updateProfile(next, false);
      setMsg('Профиль сохранён.');
    }
    setDirty(false);
    setDraft(next);
  };

  return (
    <AppShell>
      <div className="space-y-5 px-4 pb-8 pt-6">
        <header>
          <h1 className="text-2xl font-semibold text-gray-900">Профиль</h1>
          <p className="mt-0.5 text-sm text-gray-500">Параметры и настройки программы</p>
        </header>

        <Card className="space-y-4 p-4">
          <label className="block text-sm font-medium text-gray-700">Возраст
            <input type="number" value={draft.age} onChange={(e) => set('age', parseInt(e.target.value, 10) || 0)}
              className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm" />
          </label>
          <label className="block text-sm font-medium text-gray-700">Рост (см)
            <input type="number" value={draft.heightCm} onChange={(e) => set('heightCm', parseInt(e.target.value, 10) || 0)}
              className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm" />
          </label>
          <label className="block text-sm font-medium text-gray-700">Вес (кг)
            <input type="number" step={0.5} value={draft.weightKg} onChange={(e) => set('weightKg', parseFloat(e.target.value) || 0)}
              className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm" />
          </label>
        </Card>

        <Card className="space-y-3 p-4">
          <label className="block text-sm font-medium text-gray-700">Уровень
            <select value={draft.level} onChange={(e) => set('level', e.target.value as Level)}
              className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm">
              {(Object.keys(LEVEL_INFO) as Level[]).map((l) => <option key={l} value={l}>{LEVEL_INFO[l].labelRu}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">Цель
            <select value={draft.goal} onChange={(e) => set('goal', e.target.value as Goal)}
              className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm">
              {(Object.keys(GOAL_INFO) as Goal[]).map((g) => <option key={g} value={g}>{GOAL_INFO[g].labelRu}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">Тренировок в неделю
            <select value={draft.daysPerWeek} onChange={(e) => set('daysPerWeek', parseInt(e.target.value, 10) as 2|3|4|5|6)}
              className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm">
              {[2,3,4,5,6].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">Длительность
            <select value={draft.sessionMinutes} onChange={(e) => set('sessionMinutes', parseInt(e.target.value, 10) as 30|45|60|75|90)}
              className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm">
              {[30,45,60,75,90].map((m) => <option key={m} value={m}>{m} мин</option>)}
            </select>
          </label>
        </Card>

        {msg && <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">{msg}</p>}

        <div className="space-y-2">
          <Button fullWidth disabled={!dirty} onClick={() => save(false)}>Сохранить изменения</Button>
          <Button fullWidth variant="secondary" onClick={() => save(true)}><RefreshCw size={16} /> Сохранить и пересчитать программу</Button>
          <Button fullWidth variant="ghost" onClick={() => regenerate()}>Пересчитать программу</Button>
        </div>

        <Card className="p-4">
          <Button fullWidth variant="danger" onClick={() => { if (confirm('Сбросить все данные?')) { clearAllData(); router.replace('/onboarding'); } }}>
            <Trash2 size={16} /> Сбросить и пройти анкету заново
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
