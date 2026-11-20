import { generateProgram, getExercise, MUSCLE_LABELS_RU } from '@/lib';

/** Временная страница этапов 1–2: показывает результат работы генератора. Интерфейс — этапы 3–6. */
export default function Page() {
  const plan = generateProgram({ level: 'intermediate', goal: 'hypertrophy', daysPerWeek: 4, sessionMinutes: 60 });
  const wd = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold">Gym Assistant</h1>
        <p className="text-sm text-gray-500">Ядро алгоритма (этапы 1–2). Пример: средний уровень, набор массы, 4 дня, 60 мин — {plan.splitName}.</p>
      </header>
      {plan.days.map((d) => (
        <section key={d.index} className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-medium">{wd[d.weekday]} · {d.name} <span className="text-sm text-gray-500">≈ {d.estimatedMinutes} мин</span></h2>
          <ul className="mt-2 divide-y divide-gray-100 text-sm">
            {d.exercises.map((e) => (
              <li key={e.exerciseId} className="flex justify-between gap-3 py-1.5">
                <span>{getExercise(e.exerciseId).nameRu}<span className="text-gray-400"> · {MUSCLE_LABELS_RU[e.targetMuscle]}</span></span>
                <span className="whitespace-nowrap text-gray-600">{e.sets}×{e.repMin}–{e.repMax}{e.unit === 'sec' ? ' с' : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
