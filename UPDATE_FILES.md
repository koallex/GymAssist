# Обновление Gym Assistant: Local Coach + выбор дней

## Рекомендуемый способ

Распакуйте архив и замените им содержимое текущего проекта целиком. Сохраните `.git` в корне существующего репозитория, если разворачиваете через GitHub. `package.json` не требует новых зависимостей. Переменные окружения и ключи API не нужны.

## Если переносить только изменённые файлы

Заменить:
- `src/lib/types.ts`
- `src/lib/userProfile.ts`
- `src/lib/workoutGenerator.ts`
- `src/lib/storage.ts`
- `src/hooks/useAppData.ts`
- `src/components/onboarding/OnboardingWizard.tsx`
- `src/app/profile/page.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/app/globals.css`
- `tests/generator.test.ts`
- `README.md`

Добавить новые:
- `src/lib/coachEngine.ts`
- `src/app/coach/page.tsx`

## После замены

```bash
npm install
npm test
npm run typecheck
npm run build
```

Затем отправьте изменения в GitHub — Vercel автоматически запустит новый деплой.

Существующие пользовательские данные остаются в `localStorage`. При первом открытии новая версия автоматически обновит сохранённый план, если дни недели в нём не совпадают с настройками профиля.
