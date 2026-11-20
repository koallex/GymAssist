# Gym Assistant — ядро (этапы 1–2)

Детерминированный генератор тренировочных программ + библиотека упражнений (74) + замена упражнений.
Интерфейс (анкета, дашборд, режим тренировки, прогресс) — следующие этапы.

## Запуск
```bash
npm install
npm test          # 95 автотестов генератора
npm run typecheck
npm run dev       # http://localhost:3000 — временная страница с примером программы
npm run build && npm start
```

## Структура `src/lib` (без зависимости от React)
| Модуль | Назначение |
|---|---|
| `types.ts` | Типы, идентификаторы мышц/оборудования/суставов |
| `config.ts` | **Все числовые параметры** алгоритма (объёмы, повторения, отдых, лимиты) |
| `muscleGroups.ts` | 14 групп, названия, шаблоны подбора упражнений |
| `trainingGoals.ts` | Тексты целей/уровней, предупреждения безопасности |
| `userProfile.ts` | Профиль, нормализация, проверка (18+) |
| `exerciseDatabase.ts` | Библиотека упражнений и фильтр по оборудованию/травмам/сложности |
| `workoutSplit.ts` | Выбор структуры недели (2–6 дней) |
| `workoutGenerator.ts` | `generateProgram(profile)` |
| `exerciseAlternatives.ts` | `getAlternatives`, `replaceExercise` |
| `analytics.ts` | Недельный объём по группам |

## Использование
```ts
import { generateProgram, getAlternatives, replaceExercise } from '@/lib';
const plan = generateProgram({ level: 'intermediate', goal: 'hypertrophy', daysPerWeek: 4, sessionMinutes: 60 });
const options = getAlternatives(plan, 0, 0);
const next = replaceExercise(plan, 0, 0, options[0].exercise.id);
```
