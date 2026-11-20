'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  DEFAULT_PROFILE,
  EQUIPMENT_IDS,
  GOAL_INFO,
  LEVEL_INFO,
  generateProgram,
  normalizeProfile,
  savePlan,
  saveProfile,
  setOnboardingDone,
  validateProfile,
  type Equipment,
  type Goal,
  type JointTag,
  type Level,
  type PreferredFormat,
  type Sex,
  type UserProfile,
} from '@/lib';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';

const STEPS = [
  { id: 'sex', title: 'Пол' },
  { id: 'body', title: 'Параметры тела' },
  { id: 'level', title: 'Уровень подготовки' },
  { id: 'goal', title: 'Основная цель' },
  { id: 'schedule', title: 'Расписание' },
  { id: 'duration', title: 'Длительность тренировки' },
  { id: 'equipment', title: 'Оборудование' },
  { id: 'limits', title: 'Ограничения и травмы' },
] as const;

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' },
  { value: 'unspecified', label: 'Предпочитаю не указывать' },
];

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Штанга',
  dumbbell: 'Гантели',
  machine: 'Тренажёры',
  cable: 'Блоки и кроссоверы',
  bodyweight: 'Собственный вес',
  bench: 'Скамья и вспомогательное',
};

const JOINT_LABELS: Record<JointTag, string> = {
  shoulder: 'Плечи',
  elbow: 'Локти',
  wrist: 'Запястья',
  lowBack: 'Поясница',
  knee: 'Колени',
  hip: 'Тазобедренные',
  neck: 'Шея',
};

function OptionCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.99]',
        selected
          ? 'border-accent bg-blue-50/80 ring-1 ring-accent/30'
          : 'border-gray-200 bg-white hover:border-gray-300',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <div
          className={[
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
            selected ? 'border-accent bg-accent' : 'border-gray-300',
          ].join(' ')}
        >
          {selected && <Check size={12} className="text-white" strokeWidth={3} />}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-medium text-gray-900">{title}</div>
          {description && <div className="mt-0.5 text-sm text-gray-500">{description}</div>}
        </div>
      </div>
    </button>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border px-3.5 py-2 text-sm font-medium transition',
        selected
          ? 'border-accent bg-accent text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  suffix,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  suffix?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 pr-12 text-base text-gray-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<UserProfile>(() => ({
    ...DEFAULT_PROFILE,
    availableEquipment: [...EQUIPMENT_IDS],
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };

  const toggleEquipment = (eq: Equipment) => {
    if (eq === 'bodyweight') return;
    setDraft((d) => {
      const has = d.availableEquipment.includes(eq);
      const next = has
        ? d.availableEquipment.filter((e) => e !== eq)
        : [...d.availableEquipment, eq];
      if (!next.includes('bodyweight')) next.push('bodyweight');
      return { ...d, availableEquipment: next };
    });
  };

  const toggleLimitation = (j: JointTag) => {
    setDraft((d) => {
      const has = d.limitations.includes(j);
      return {
        ...d,
        limitations: has ? d.limitations.filter((x) => x !== j) : [...d.limitations, j],
      };
    });
  };

  const canProceed = useMemo(() => {
    switch (current.id) {
      case 'sex':
        return !!draft.sex;
      case 'body':
        return (
          draft.age >= 18 &&
          draft.age <= 100 &&
          draft.heightCm >= 120 &&
          draft.heightCm <= 230 &&
          draft.weightKg >= 30 &&
          draft.weightKg <= 250
        );
      case 'level':
        return !!draft.level;
      case 'goal':
        return !!draft.goal;
      case 'schedule':
        return [2, 3, 4, 5, 6].includes(draft.daysPerWeek);
      case 'duration':
        return [30, 45, 60, 75, 90].includes(draft.sessionMinutes);
      case 'equipment':
        return draft.availableEquipment.length > 0;
      case 'limits':
        return true;
      default:
        return true;
    }
  }, [current.id, draft]);

  const goNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const finish = () => {
    setSubmitting(true);
    setError(null);
    try {
      const profile = normalizeProfile(draft);
      const validation = validateProfile(profile);
      if (validation.errors.length > 0) {
        setError(validation.errors[0]);
        setSubmitting(false);
        return;
      }
      const plan = generateProgram(profile);
      saveProfile(profile);
      savePlan(plan);
      setOnboardingDone(true);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать программу');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#f5f5f7]">
      <header className="sticky top-0 z-10 border-b border-gray-200/60 bg-white/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="mx-auto max-w-lg">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 disabled:opacity-0"
              aria-label="Назад"
            >
              <ChevronLeft size={22} />
            </button>
            <span className="text-sm font-medium text-gray-500">
              {step + 1} / {STEPS.length}
            </span>
            <div className="w-9" />
          </div>
          <ProgressBar value={progress} />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">{current.title}</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        {current.id === 'sex' && (
          <div className="space-y-3">
            <p className="mb-4 text-sm text-gray-500">
              Используется в профиле. На генерацию программы не влияет.
            </p>
            {SEX_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                selected={draft.sex === o.value}
                onClick={() => update('sex', o.value)}
                title={o.label}
              />
            ))}
          </div>
        )}

        {current.id === 'body' && (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">
              Нужны для профиля и статистики. Программа — только для совершеннолетних.
            </p>
            <Field label="Возраст" suffix="лет" value={draft.age} min={18} max={100} onChange={(v) => update('age', v)} />
            <Field label="Рост" suffix="см" value={draft.heightCm} min={120} max={230} onChange={(v) => update('heightCm', v)} />
            <Field label="Вес" suffix="кг" value={draft.weightKg} min={30} max={250} step={0.5} onChange={(v) => update('weightKg', v)} />
            {draft.age > 0 && draft.age < 18 && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                Приложение предназначено для совершеннолетних (18+).
              </p>
            )}
          </div>
        )}

        {current.id === 'level' && (
          <div className="space-y-3">
            {(['beginner', 'intermediate', 'advanced'] as Level[]).map((l) => (
              <OptionCard
                key={l}
                selected={draft.level === l}
                onClick={() => update('level', l)}
                title={LEVEL_INFO[l].labelRu}
                description={LEVEL_INFO[l].descriptionRu}
              />
            ))}
          </div>
        )}

        {current.id === 'goal' && (
          <div className="space-y-3">
            {(['hypertrophy', 'fat_loss', 'strength', 'recomposition', 'general'] as Goal[]).map((g) => (
              <OptionCard
                key={g}
                selected={draft.goal === g}
                onClick={() => update('goal', g)}
                title={GOAL_INFO[g].labelRu}
                description={GOAL_INFO[g].descriptionRu}
              />
            ))}
          </div>
        )}

        {current.id === 'schedule' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Сколько раз в неделю готовы тренироваться?</p>
            <div className="flex flex-wrap gap-2">
              {([2, 3, 4, 5, 6] as const).map((d) => (
                <Chip key={d} selected={draft.daysPerWeek === d} onClick={() => update('daysPerWeek', d)}>
                  {d} {d < 5 ? 'дня' : 'дней'}
                </Chip>
              ))}
            </div>
            <p className="text-sm text-gray-500">Предпочтительный формат (можно «Авто»):</p>
            <div className="space-y-2">
              {(
                [
                  { value: 'auto' as PreferredFormat, label: 'Авто', desc: 'Алгоритм выберет оптимальный сплит' },
                  { value: 'full_body' as PreferredFormat, label: 'Full Body', desc: 'Все тело за тренировку' },
                  { value: 'upper_lower' as PreferredFormat, label: 'Верх / Низ', desc: 'Чередование верха и низа' },
                  { value: 'ppl' as PreferredFormat, label: 'Push / Pull / Legs', desc: 'Жим / Тяга / Ноги' },
                ] as const
              ).map((o) => (
                <OptionCard
                  key={o.value}
                  selected={draft.preferredFormat === o.value}
                  onClick={() => update('preferredFormat', o.value)}
                  title={o.label}
                  description={o.desc}
                />
              ))}
            </div>
          </div>
        )}

        {current.id === 'duration' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Желаемая продолжительность одной тренировки. Объём подгонится под это время.
            </p>
            <div className="flex flex-wrap gap-2">
              {([30, 45, 60, 75, 90] as const).map((m) => (
                <Chip key={m} selected={draft.sessionMinutes === m} onClick={() => update('sessionMinutes', m)}>
                  {m} мин
                </Chip>
              ))}
            </div>
          </div>
        )}

        {current.id === 'equipment' && (
          <div className="space-y-3">
            <p className="mb-2 text-sm text-gray-500">
              Отметьте доступное оборудование. Собственный вес всегда доступен.
            </p>
            {EQUIPMENT_IDS.map((eq) => (
              <OptionCard
                key={eq}
                selected={draft.availableEquipment.includes(eq)}
                onClick={() => toggleEquipment(eq)}
                title={EQUIPMENT_LABELS[eq]}
                description={eq === 'bodyweight' ? 'Всегда доступно' : undefined}
              />
            ))}
          </div>
        )}

        {current.id === 'limits' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Есть травмы или ограничения по суставам? Можно пропустить. Упражнения с нагрузкой на отмеченные зоны будут исключены.
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(JOINT_LABELS) as JointTag[]).map((id) => (
                <Chip
                  key={id}
                  selected={draft.limitations.includes(id)}
                  onClick={() => toggleLimitation(id)}
                >
                  {JOINT_LABELS[id]}
                </Chip>
              ))}
            </div>
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Важно</p>
              <p className="mt-1 text-amber-800/90">
                Программа не заменяет консультацию врача. При хронических болях согласуйте тренировки со специалистом. Не тренируйтесь через боль.
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-gray-200/60 bg-white/95 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-lg">
          <Button fullWidth size="lg" disabled={!canProceed || submitting} onClick={goNext}>
            {step === STEPS.length - 1 ? (
              submitting ? 'Создаём программу…' : 'Создать программу'
            ) : (
              <>
                Далее
                <ChevronRight size={18} />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
