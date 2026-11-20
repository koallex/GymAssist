import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#f5f5f7] px-4 text-center">
      <p className="text-5xl font-semibold text-gray-300">404</p>
      <h1 className="mt-2 text-lg font-semibold text-gray-900">Страница не найдена</h1>
      <p className="mt-1 text-sm text-gray-500">Вернитесь на главную и продолжите тренировки.</p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-2xl bg-accent px-5 text-sm font-medium text-white"
      >
        На главную
      </Link>
    </div>
  );
}
