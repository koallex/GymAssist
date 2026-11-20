'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, Filter } from 'lucide-react';
import {
  EXERCISES,
  MUSCLE_IDS,
  MUSCLE_LABELS_RU,
  EQUIPMENT_IDS,
  type Equipment,
  type MuscleId,
  type Difficulty,
} from '@/lib';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { ExerciseIllustration } from '@/components/exercises/ExerciseIllustration';
import { useAppData } from '@/hooks/useAppData';

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Штанга',
  dumbbell: 'Гантели',
  machine: 'Тренажёры',
  cable: 'Блоки',
  bodyweight: 'Свой вес',
  bench: 'Скамья',
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Лёгкое',
  2: 'Среднее',
  3: 'Сложное',
};

export default function LibraryPage() {
  const router = useRouter();
  const { ready, onboarded } = useAppData();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleId | 'all'>('all');
  const [equipment, setEquipment] = useState<Equipment | 'all'>('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (ready && !onboarded) router.replace('/onboarding');
  }, [ready, onboarded, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      if (muscle !== 'all' && e.primary !== muscle) return false;
      if (equipment !== 'all' && !e.equipment.includes(equipment)) return false;
      if (difficulty !== 'all' && e.difficulty !== difficulty) return false;
      if (q) {
        const hay = `${e.nameRu} ${e.nameEn} ${MUSCLE_LABELS_RU[e.primary]}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => a.nameRu.localeCompare(b.nameRu, 'ru'));
  }, [query, muscle, equipment, difficulty]);

  const activeFilters =
    (muscle !== 'all' ? 1 : 0) + (equipment !== 'all' ? 1 : 0) + (difficulty !== 'all' ? 1 : 0);

  return (
    <AppShell>
      <div className="px-4 pb-6 pt-6">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Библиотека</h1>
          <p className="mt-0.5 text-sm text-gray-500">{EXERCISES.length} упражнений</p>
        </header>

        <div className="relative mb-3">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию…"
            className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-10 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={[
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition',
              showFilters || activeFilters > 0 ? 'border-accent bg-blue-50 text-accent' : 'border-gray-200 bg-white text-gray-600',
            ].join(' ')}
          >
            <Filter size={14} />
            Фильтры
            {activeFilters > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] text-white">{activeFilters}</span>
            )}
          </button>
          {activeFilters > 0 && (
            <button type="button" onClick={() => { setMuscle('all'); setEquipment('all'); setDifficulty('all'); }} className="text-sm text-gray-500 underline">
              Сбросить
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mb-4 space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Мышца</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={muscle === 'all'} onClick={() => setMuscle('all')}>Все</Chip>
                {MUSCLE_IDS.map((m) => (
                  <Chip key={m} active={muscle === m} onClick={() => setMuscle(m)}>{MUSCLE_LABELS_RU[m]}</Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Оборудование</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={equipment === 'all'} onClick={() => setEquipment('all')}>Все</Chip>
                {EQUIPMENT_IDS.map((eq) => (
                  <Chip key={eq} active={equipment === eq} onClick={() => setEquipment(eq)}>{EQUIPMENT_LABELS[eq]}</Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Сложность</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={difficulty === 'all'} onClick={() => setDifficulty('all')}>Любая</Chip>
                {([1, 2, 3] as Difficulty[]).map((d) => (
                  <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>{DIFFICULTY_LABELS[d]}</Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="mb-3 text-sm text-gray-500">Найдено: {filtered.length}</p>

        <div className="space-y-2">
          {filtered.map((ex) => (
            <Link key={ex.id} href={`/library/${ex.id}`}>
              <Card className="flex items-center gap-3 px-3 py-3 transition active:scale-[0.99]">
                <ExerciseIllustration primary={ex.primary} pattern={ex.pattern} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{ex.nameRu}</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {MUSCLE_LABELS_RU[ex.primary]} · {ex.category === 'compound' ? 'базовое' : 'изолирующее'} · {DIFFICULTY_LABELS[ex.difficulty]}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {ex.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ')}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-gray-400">Ничего не найдено</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border px-2.5 py-1 text-xs font-medium transition',
        active ? 'border-accent bg-accent text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
