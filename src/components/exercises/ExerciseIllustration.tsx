'use client';

import type { MuscleId, MovementPattern } from '@/lib';

/** Минималистичная SVG-схема: силуэт + подсветка целевой зоны. */
const REGION_COLORS: Record<string, string> = {
  push: '#3b82f6',
  pull: '#8b5cf6',
  legs: '#10b981',
  core: '#f59e0b',
};

const MUSCLE_REGION: Record<MuscleId, keyof typeof REGION_COLORS> = {
  chest: 'push',
  frontDelts: 'push',
  sideDelts: 'push',
  triceps: 'push',
  lats: 'pull',
  upperBack: 'pull',
  rearDelts: 'pull',
  biceps: 'pull',
  forearms: 'pull',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  core: 'core',
};

const PATTERN_HINT: Partial<Record<MovementPattern, string>> = {
  horizontal_push: 'Жим горизонтально',
  incline_push: 'Жим под углом',
  dip: 'Отжимания на брусьях',
  chest_fly: 'Сведение',
  vertical_pull: 'Тяга сверху',
  horizontal_pull: 'Тяга к поясу',
  lat_isolation: 'Изоляция широчайших',
  shrug: 'Шраги',
  vertical_push: 'Жим над головой',
  front_raise: 'Подъём вперёд',
  lateral_raise: 'Подъём в стороны',
  rear_delt_fly: 'Разведение назад',
  elbow_flexion: 'Сгибание локтя',
  elbow_extension: 'Разгибание локтя',
  close_grip_press: 'Жим узким хватом',
  wrist: 'Запястья',
  carry: 'Переноска',
  squat: 'Присед',
  lunge: 'Выпад',
  leg_extension: 'Разгибание ног',
  hinge: 'Наклон / тяга',
  leg_curl: 'Сгибание ног',
  hip_thrust: 'Ягодичный мост',
  glute_iso: 'Изоляция ягодиц',
  calf_raise: 'Подъём на носки',
  core_flexion: 'Скручивания',
  core_stability: 'Стабилизация кора',
};

export function ExerciseIllustration({
  primary,
  pattern,
  className = '',
  size = 120,
}: {
  primary: MuscleId;
  pattern?: MovementPattern;
  className?: string;
  size?: number;
}) {
  const region = MUSCLE_REGION[primary] ?? 'push';
  const color = REGION_COLORS[region];
  const hint = pattern ? PATTERN_HINT[pattern] : undefined;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {/* Background circle */}
        <circle cx="60" cy="60" r="56" fill="#f3f4f6" />

        {/* Simplified body silhouette */}
        <g stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Head */}
          <circle cx="60" cy="22" r="8" />
          {/* Torso */}
          <path d="M60 30 V55" />
          {/* Shoulders / arms baseline */}
          <path d="M40 38 H80" />
          <path d="M40 38 L30 55" />
          <path d="M80 38 L90 55" />
          {/* Legs */}
          <path d="M60 55 L48 95" />
          <path d="M60 55 L72 95" />
        </g>

        {/* Highlight zones by region */}
        {region === 'push' && (
          <g fill={color} fillOpacity="0.35">
            {/* Chest */}
            <ellipse cx="60" cy="42" rx="14" ry="10" />
            {/* Front delts / arms upper */}
            <circle cx="42" cy="38" r="6" />
            <circle cx="78" cy="38" r="6" />
          </g>
        )}
        {region === 'pull' && (
          <g fill={color} fillOpacity="0.35">
            {/* Back / lats */}
            <ellipse cx="60" cy="44" rx="16" ry="12" />
            <path d="M44 36 Q60 52 76 36" fill={color} fillOpacity="0.25" />
          </g>
        )}
        {region === 'legs' && (
          <g fill={color} fillOpacity="0.35">
            <ellipse cx="52" cy="78" rx="8" ry="16" />
            <ellipse cx="68" cy="78" rx="8" ry="16" />
            <ellipse cx="60" cy="62" rx="12" ry="8" />
          </g>
        )}
        {region === 'core' && (
          <g fill={color} fillOpacity="0.35">
            <ellipse cx="60" cy="50" rx="10" ry="12" />
          </g>
        )}

        {/* Accent ring */}
        <circle cx="60" cy="60" r="56" stroke={color} strokeWidth="2.5" strokeOpacity="0.4" fill="none" />
      </svg>
      {hint && (
        <span className="mt-1 max-w-[140px] text-center text-[11px] leading-tight text-gray-400">
          {hint}
        </span>
      )}
    </div>
  );
}
