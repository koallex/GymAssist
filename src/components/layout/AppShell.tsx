'use client';

import { type ReactNode } from 'react';
import { BottomNav } from './BottomNav';

export function AppShell({ children, showNav = true }: { children: ReactNode; showNav?: boolean }) {
  return (
    <div className="min-h-dvh bg-[#f5f5f7]">
      <div className={`mx-auto max-w-lg ${showNav ? 'pb-20' : ''}`}>{children}</div>
      {showNav && <BottomNav />}
    </div>
  );
}
