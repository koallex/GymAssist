'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_PROFILE,
  GOAL_INFO,
  LEVEL_INFO,
  generateProgram,
  normalizeProfile,
  savePlan,
  saveProfile,
  setOnboardingDone,
  type Goal,
  type Level,
  type UserProfile,
} from '@/lib';
import { Button } from '@/components/ui/Button';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<UserProfile>({ ...DEFAULT_PROFILE });
  const [busy, setBusy] = useState(false);

  const steps = ['Уровень', 'Цель', 'Дни', 'Длительность', 'Готово'];

  const finish = () => {
    setBusy(true);
    const profile = normalizeProfile(draft);
    const plan = generateProgram(profile);
    saveProfile(profile);
    savePlan(plan);
    setOnboardingDone(true);
    router.replace('/');
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-[#f5f5f7] px-4 py-8">
      <h1 className="text-2xl font-semibold">Анкета</h1>
      <p className="mt-1 text-sm text-gray-500">Шаг {step + 1} из {steps.length}: {steps[step]}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-accent transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      <div className="mt-8 flex-1 space-y-3">
        {step === 0 && (Object.keys(LEVEL_INFO) as Level[]).map((l) => (
          <button key={l} type="button" onClick={() => setDraft((d) => ({ ...d, level: l }))}
            className={`w-full rounded-2xl border px-4 py-3.5 text-left ${draft.level === l ? 'border-accent bg-blue-50' : 'border-gray-200 bg-white'}`}>
            <div className="font-medium">{LEVEL_INFO[l].labelRu}</div>
            <div className="text-sm text-gray-500">{LEVEL_INFO[l].descriptionRu}</div>
          </button>
        ))}
        {step === 1 && (Object.keys(GOAL_INFO) as Goal[]).map((g) => (
          <button key={g} type="button" onClick={() => setDraft((d) => ({ ...d, goal: g }))}
            className={`w-full rounded-2xl border px-4 py-3.5 text-left ${draft.goal === g ? 'border-accent bg-blue-50' : 'border-gray-200 bg-white'}`}>
            <div className="font-medium">{GOAL_INFO[g].labelRu}</div>
            <div className="text-sm text-gray-500">{GOAL_INFO[g].descriptionRu}</div>
          </button>
        ))}
        {step === 2 && (
          <div className="flex flex-wrap gap-2">
            {[2, 3, 4, 5, 6].map((d) => (
              <button key={d} type="button" onClick={() => setDraft((x) => ({ ...x, daysPerWeek: d as 2|3|4|5|6 }))}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${draft.daysPerWeek === d ? 'border-accent bg-accent text-white' : 'border-gray-200 bg-white'}`}>
                {d} дн.
              </button>
            ))}
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-wrap gap-2">
            {[30, 45, 60, 75, 90].map((m) => (
              <button key={m} type="button" onClick={() => setDraft((x) => ({ ...x, sessionMinutes: m as 30|45|60|75|90 }))}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${draft.sessionMinutes === m ? 'border-accent bg-accent text-white' : 'border-gray-200 bg-white'}`}>
                {m} мин
              </button>
            ))}
          </div>
        )}
        {step === 4 && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-medium">Проверьте параметры</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>Уровень: {LEVEL_INFO[draft.level].labelRu}</li>
              <li>Цель: {GOAL_INFO[draft.goal].labelRu}</li>
              <li>Тренировок: {draft.daysPerWeek} / нед.</li>
              <li>Длительность: {draft.sessionMinutes} мин</li>
            </ul>
            <p className="mt-3 text-xs text-gray-400">Остальные параметры (возраст, оборудование) можно изменить в профиле. Полная анкета — в следующей итерации.</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>Назад</Button>
        )}
        {step < 4 ? (
          <Button fullWidth onClick={() => setStep((s) => s + 1)}>Далее</Button>
        ) : (
          <Button fullWidth disabled={busy} onClick={finish}>
            {busy ? 'Создаём…' : 'Создать программу'}
          </Button>
        )}
      </div>
    </div>
  );
}
