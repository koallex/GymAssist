import { type ReactNode } from 'react';

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const base = 'rounded-2xl bg-white shadow-sm border border-gray-100/80';
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} w-full text-left transition active:scale-[0.99] ${className}`}>
        {children}
      </button>
    );
  }
  return <div className={`${base} ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4">
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
