'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, BookOpen, TrendingUp, User } from 'lucide-react';

const items = [
  { href: '/', label: 'Главная', icon: Home },
  { href: '/program', label: 'Программа', icon: Dumbbell },
  { href: '/library', label: 'Библиотека', icon: BookOpen },
  { href: '/progress', label: 'Прогресс', icon: TrendingUp },
  { href: '/profile', label: 'Профиль', icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200/80 bg-white/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className={['flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors', active ? 'text-accent' : 'text-gray-400 hover:text-gray-600'].join(' ')}>
              <Icon size={22} strokeWidth={active ? 2.25 : 1.75} className={active ? 'text-accent' : ''} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
