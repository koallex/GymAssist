'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  ChevronRight,
  Dumbbell,
  Plus,
  Scale,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import {
  addBodyWeight,
  buildExerciseProgress,
  getExercise,
  loadBodyWeight,
  loadHistory,
  loadProfile,
  sessionsPerWeek,
  type BodyWeightEntry,
  type WorkoutSession,
} from '@/lib';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LineChart, BarChart } from '@/components/progress/SimpleChart';
import { useAppData } from '@/hooks/useAppData';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ProgressPage() {
  const router = useRouter();
  const { ready, onboarded, profile } = useAppData();
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [body, setBody] = useState<BodyWeightEntry[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [selectedEx, setSelectedEx] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !onboarded) router.replace('/onboarding');
  }, [ready, onboarded, router]);

  useEffect(() => {
    setHistory(loadHistory());
    const bw = loadBodyWeight();
    setBody(bw);
    const p = loadProfile();
    if (p && bw.length === 0) {
      setWeightInput(String(p.weightKg));
    } else if (bw.length) {
      setWeightInput(String(bw[bw.length - 1].weightKg));
    }
  }, []);

  const completed = useMemo(() => history.filter((h) => h.completed), [history]);
  const exProgress = useMemo(() => buildExerciseProgress(history), [history]);
  const weekly = useMemo(() => sessionsPerWeek(history, 8), [history]);

  const totalSets = useMemo(
    () =>
      completed.reduce(
        (n, s) => n + s.exercises.reduce((m, ex) => m + ex.sets.filter((x) => x.completed).length, 0),
        0,
      ),
    [completed],
  );

  const chartEx = useMemo(() => {
    const id = selectedEx ?? exProgress[0]?.exerciseId ?? null;
    return exProgress.find((e) => e.exerciseId === id) ?? null;
  }, [selectedEx, exProgress]);

  const weightChartPoints = useMemo(
    () =>
      body.map((e) => ({
        label: e.date.slice(5).replace('-', '.'),
        value: e.weightKg,
      })),
    [body],
  );

  const logWeight = () => {
    const v = parseFloat(weightInput.replace(',', '.'));
    if (!Number.isFinite(v) || v < 30 || v > 250) return;
    const next = addBodyWeight(v);
    setBody(next);
  };

  return (
    <AppShell>
      <div className="space-y-5 px-4 pb-8 pt-6">
        <header>
          <h1 className="text-2xl font-semibold text-gray-900">Прогресс</h1>
          <p className="mt-0.5 text-sm text-gray-500">История, веса и динамика</p>
        </header>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">Тренировок</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{completed.length}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Dumbbell size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">Подходов</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{totalSets}</p>
          </Card>
        </div>

        {/* Frequency */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Тренировки по неделям</h2>
          <BarChart
            points={weekly.map((w, i) => ({
              label: `Н${i + 1}`,
              value: w.count,
            }))}
            height={90}
          />
        </Card>

        {/* Body weight */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Scale size={16} className="text-gray-400" />
              Масса тела
            </h2>
            {body.length >= 2 && (
              <span className="text-xs text-gray-500">
                {body[body.length - 1].weightKg - body[0].weightKg > 0 ? '+' : ''}
                {(body[body.length - 1].weightKg - body[0].weightKg).toFixed(1)} кг за период
              </span>
            )}
          </div>
          <LineChart points={weightChartPoints} unit=" кг" color="#0d9488" height={120} />
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              step={0.1}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={profile ? String(profile.weightKg) : 'кг'}
              className="h-10 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-accent"
            />
            <Button size="sm" onClick={logWeight}>
              <Plus size={14} />
              Записать
            </Button>
          </div>
        </Card>

        {/* Exercise strength progress */}
        {exProgress.length > 0 && (
          <section>
            <h2 className="mb-2 text-[15px] font-semibold text-gray-900">Рабочие веса</h2>
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {exProgress.slice(0, 12).map((ep) => {
                let name = ep.exerciseId;
                try {
                  name = getExercise(ep.exerciseId).nameRu;
                } catch {
                  /* */
                }
                const active = (selectedEx ?? exProgress[0]?.exerciseId) === ep.exerciseId;
                return (
                  <button
                    key={ep.exerciseId}
                    type="button"
                    onClick={() => setSelectedEx(ep.exerciseId)}
                    className={[
                      'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition',
                      active
                        ? 'border-accent bg-accent text-white'
                        : 'border-gray-200 bg-white text-gray-600',
                    ].join(' ')}
                  >
                    {name.length > 22 ? name.slice(0, 20) + '…' : name}
                  </button>
                );
              })}
            </div>
            {chartEx && (
              <Card className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">
                    {(() => {
                      try {
                        return getExercise(chartEx.exerciseId).nameRu;
                      } catch {
                        return chartEx.exerciseId;
                      }
                    })()}
                  </p>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    {chartEx.trend === 'up' && <TrendingUp size={14} className="text-green-600" />}
                    {chartEx.trend === 'down' && <TrendingDown size={14} className="text-red-500" />}
                    {chartEx.trend === 'flat' && <Minus size={14} />}
                    макс. {chartEx.maxWeight} кг
                  </span>
                </div>
                <LineChart
                  points={chartEx.points.map((p) => ({
                    label: formatDate(p.date),
                    value: p.weightKg,
                  }))}
                  unit=" кг"
                  height={130}
                />
              </Card>
            )}
          </section>
        )}

        {/* History list */}
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-gray-900">История</h2>
          {history.length === 0 ? (
            <Card className="px-4 py-10 text-center">
              <p className="text-sm text-gray-500">
                Пока нет тренировок. Начните первую из раздела «Программа».
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {history.map((s) => {
                const setsDone = s.exercises.reduce(
                  (n, ex) => n + ex.sets.filter((x) => x.completed).length,
                  0,
                );
                return (
                  <Link key={s.id} href={`/progress/${s.id}`}>
                    <Card className="flex items-center gap-3 px-4 py-3.5 transition active:scale-[0.99]">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{s.dayName}</p>
                        <p className="mt-0.5 text-sm text-gray-500">{formatDateTime(s.startedAt)}</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {setsDone} подходов
                          {!s.completed ? ' · не завершена' : ''}
                        </p>
                      </div>
                      <span
                        className={[
                          'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                          s.completed ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500',
                        ].join(' ')}
                      >
                        {s.completed ? 'Готово' : 'Черновик'}
                      </span>
                      <ChevronRight size={18} className="shrink-0 text-gray-300" />
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
