export function ProgressBar({ value, max = 100, className = '' }: { value: number; max?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}>
      <div className="h-full rounded-full bg-accent transition-all duration-300 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}
