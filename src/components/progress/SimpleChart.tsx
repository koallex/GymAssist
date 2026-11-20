'use client';

/** Простой SVG line/bar chart без внешних библиотек. */

export interface ChartPoint {
  label: string;
  value: number;
}

export function LineChart({
  points,
  height = 140,
  unit = '',
  color = '#2563eb',
}: {
  points: ChartPoint[];
  height?: number;
  unit?: string;
  color?: string;
}) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Недостаточно данных
      </div>
    );
  }

  const w = 320;
  const h = height;
  const padX = 8;
  const padY = 16;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padX + (i / Math.max(points.length - 1, 1)) * (w - padX * 2);
    const y = padY + (1 - (p.value - min) / span) * (h - padY * 2);
    return { x, y, ...p };
  });

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const area =
    path +
    ` L ${coords[coords.length - 1].x.toFixed(1)} ${h - 4} L ${coords[0].x.toFixed(1)} ${h - 4} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#chartFill)" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="3.5" fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-0.5 text-[10px] text-gray-400">
        <span>{points[0]?.label}</span>
        <span className="font-medium text-gray-600">
          {points[points.length - 1]?.value}
          {unit}
        </span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function BarChart({
  points,
  height = 100,
  color = '#2563eb',
}: {
  points: ChartPoint[];
  height?: number;
  color?: string;
}) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Нет данных
      </div>
    );
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {points.map((p, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] font-medium text-gray-500">{p.value || ''}</span>
          <div
            className="w-full max-w-[28px] rounded-t-md transition-all"
            style={{
              height: `${Math.max(4, (p.value / max) * 100)}%`,
              backgroundColor: color,
              opacity: p.value ? 1 : 0.2,
            }}
          />
          <span className="max-w-full truncate text-[9px] text-gray-400">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
