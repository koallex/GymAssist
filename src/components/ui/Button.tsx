'use client';

import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm',
  secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 active:bg-gray-100',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl',
  md: 'h-11 px-4 text-sm rounded-xl',
  lg: 'h-12 px-5 text-base rounded-2xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
