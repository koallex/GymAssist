'use client';

import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import {
  COMPLETION_LABELS_RU,
  DIFFICULTY_LABELS_RU,
  JOINT_LABELS_RU,
  JOINT_TAGS,
  getExercise,
  inferCompletion,
  type AdaptationChange,
  type CompletionLevel,
  type JointTag,
  type PerceivedDifficulty,
  type WorkoutFeedback,
} from '@/lib';
import { Button } from '@/components/ui/Button';

const DIFFICULTIES: PerceivedDifficulty[] = ['easy', 'right', 'hard', 'too_hard'];
const COMPLETIONS: CompletionLevel[] = ['full', 'mostly', 'partial'];

const fmt = (n: number) => String(n).replace('.', ',');

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'min-h-11 rounded-xl border px-3.5 py-2 text-sm font-medium transition',
        active ? 'border-accent bg-accent text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export interface FinishResult {
  changes: AdaptationChange[];
  volumeShift: 0 | -1;
  notes: string[];
  discomfortJoints: JointTag[];
}

interface SurveyProps {
  doneSets: number;
  totalSets: number;
  onSubmit: (feedback: WorkoutFeedback) => void;
  onCancel: () => void;
}

/** Шаг 1: опрос «как прошла тренировка». */
export function SurveyStep({ doneSets, totalSets, onSubmit, onCancel }: SurveyProps) {
  const [difficulty, setDifficulty] = useState<PerceivedDifficulty | null>(null);
  const [completion, setCompletion] = useState<CompletionLevel>(inferCompletion(doneSets, totalSets));
  const [discomfort, setDiscomfort] = useState(false);
  const [joints, setJoints] = useState<JointTag[]>([]);

  const toggleJoint = (j: JointTag) =>
    setJoints((cur) => (cur.includes(j) ? cur.filter((x) => x !== j) : [...cur, j]));

  const canSubmit = difficulty !== null && (!discomfort || joints.length > 0);

  return (
    <div className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:rounded-3xl">
      <h2 className="text-lg font-semibold text-gray-900">Как прошла тренировка?</h2>
      <p className="mt-1 text-sm text-gray-500">
        Отмечено {doneSets} из {totalSets} подходов. Ответы помогут подобрать веса и объём на следующие тренировки.
      </p>

      <section className="mt-5">
        <h3 className="text-sm font-medium text-gray-900">Насколько было тяжело?</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {DIFFICULTY_LABELS_RU[d]}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-medium text-gray-900">Тренировка выполнена в полном объёме?</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {COMPLETIONS.map((c) => (
            <Chip key={c} active={completion === c} onClick={() => setCompletion(c)}>
              {COMPLETION_LABELS_RU[c]}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-medium text-gray-900">Был дискомфорт или боль в суставах?</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip active={!discomfort} onClick={() => { setDiscomfort(false); setJoints([]); }}>Нет</Chip>
          <Chip active={discomfort} onClick={() => setDiscomfort(true)}>Да</Chip>
        </div>
        {discomfort && (
          <>
            <p className="mt-3 text-sm text-gray-500">Где именно? Выберите один или несколько суставов.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {JOINT_TAGS.map((j) => (
                <Chip key={j} active={joints.includes(j)} onClick={() => toggleJoint(j)}>
                  {JOINT_LABELS_RU[j]}
                </Chip>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="mt-6 flex gap-2">
        <Button variant="secondary" fullWidth onClick={onCancel}>Назад</Button>
        <Button
          fullWidth
          disabled={!canSubmit}
          onClick={() => difficulty && onSubmit({ difficulty, completion, discomfortJoints: discomfort ? joints : [] })}
        >
          Сохранить
        </Button>
      </div>
    </div>
  );
}

interface ResultProps {
  result: FinishResult;
  limitationApplied: boolean;
  onAddLimitation: () => void;
  onClose: () => void;
}

/** Шаг 2: что изменится в следующих тренировках. */
export function ResultStep({ result, limitationApplied, onAddLimitation, onClose }: ResultProps) {
  const changed = result.changes.filter((c) => c.direction !== 'same');
  return (
    <div className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:rounded-3xl">
      <h2 className="text-lg font-semibold text-gray-900">Тренировка сохранена</h2>
      <p className="mt-1 text-sm text-gray-500">Вот что изменится в следующий раз:</p>

      <div className="mt-4 space-y-2">
        {changed.length === 0 && (
          <p className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Рабочие веса пока сохраняются: добавляйте повторения внутри диапазона, и вес вырастет, когда во всех подходах будет достигнут верх диапазона.
          </p>
        )}
        {changed.map((c) => (
          <div key={c.exerciseId} className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
            {c.direction === 'up' ? (
              <ArrowUp size={18} className="shrink-0 text-green-600" />
            ) : c.direction === 'down' ? (
              <ArrowDown size={18} className="shrink-0 text-amber-600" />
            ) : (
              <Minus size={18} className="shrink-0 text-gray-400" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{getExercise(c.exerciseId).nameRu}</p>
              <p className="text-sm text-gray-500">
                {c.from != null ? fmt(c.from) : '—'} → {c.to != null ? fmt(c.to) : '—'} кг
              </p>
            </div>
          </div>
        ))}
      </div>

      {result.volumeShift === -1 && (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          В следующих тренировках объём временно снижен на 1 подход в части упражнений, отдых немного длиннее. Он вернётся к плану после тренировки, которая пройдёт в полном объёме без перегруза.
        </p>
      )}

      {result.discomfortJoints.length > 0 && (
        <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>
            Вы отметили дискомфорт: {result.discomfortJoints.map((j) => JOINT_LABELS_RU[j].toLowerCase()).join(', ')}. Не тренируйтесь через боль. Если это повторяется, обратитесь к врачу или тренеру.
          </p>
          {!limitationApplied ? (
            <Button variant="secondary" size="sm" className="mt-3" onClick={onAddLimitation}>
              Исключить нагрузку на эти суставы и пересчитать программу
            </Button>
          ) : (
            <p className="mt-2 font-medium">Ограничения добавлены в профиль, программа пересчитана.</p>
          )}
        </div>
      )}

      <Button fullWidth size="lg" className="mt-5" onClick={onClose}>Готово</Button>
    </div>
  );
}
