'use client';

import type { MuscleId, MovementPattern } from '@/lib';

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
  horizontal_push: 'Жим от груди',
  incline_push: 'Жим под углом',
  dip: 'Отжимания на брусьях',
  chest_fly: 'Сведение рук',
  vertical_pull: 'Тяга сверху вниз',
  horizontal_pull: 'Тяга к поясу',
  lat_isolation: 'Пуловер',
  shrug: 'Шраги',
  vertical_push: 'Жим над головой',
  front_raise: 'Подъём вперёд',
  lateral_raise: 'Махи в стороны',
  rear_delt_fly: 'Разведение назад',
  elbow_flexion: 'Сгибание рук',
  elbow_extension: 'Разгибание рук',
  close_grip_press: 'Жим узким хватом',
  wrist: 'Работа кистей',
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
  core_stability: 'Планка / стабилизация',
};

/** Тип анимации по паттерну движения. */
type AnimKind =
  | 'press'      // руки вперёд/вверх
  | 'pull'       // руки вниз/к себе
  | 'raise'      // подъём рук в стороны/вперёд
  | 'squat'      // сгибание ног
  | 'hinge'      // наклон корпуса
  | 'core'       // скручивание
  | 'calf'       // подъём на носки
  | 'none';

function animKind(pattern?: MovementPattern): AnimKind {
  if (!pattern) return 'none';
  if (['horizontal_push', 'incline_push', 'dip', 'close_grip_press', 'vertical_push'].includes(pattern))
    return 'press';
  if (['vertical_pull', 'horizontal_pull', 'lat_isolation', 'elbow_flexion'].includes(pattern))
    return 'pull';
  if (['lateral_raise', 'front_raise', 'rear_delt_fly', 'chest_fly', 'elbow_extension'].includes(pattern))
    return 'raise';
  if (['squat', 'lunge', 'leg_extension', 'leg_curl', 'hip_thrust', 'glute_iso'].includes(pattern))
    return 'squat';
  if (['hinge', 'shrug'].includes(pattern)) return 'hinge';
  if (['core_flexion', 'core_stability'].includes(pattern)) return 'core';
  if (pattern === 'calf_raise') return 'calf';
  return 'none';
}

export function ExerciseIllustration({
  primary,
  pattern,
  className = '',
  size = 120,
  animated = true,
}: {
  primary: MuscleId;
  pattern?: MovementPattern;
  className?: string;
  size?: number;
  /** Включить лёгкую CSS-анимацию паттерна. */
  animated?: boolean;
}) {
  const region = MUSCLE_REGION[primary] ?? 'push';
  const color = REGION_COLORS[region];
  const hint = pattern ? PATTERN_HINT[pattern] : undefined;
  const kind = animKind(pattern);
  const animClass = animated && kind !== 'none' ? `ex-anim-${kind}` : '';

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className={animClass}
      >
        <circle cx="60" cy="60" r="56" fill="#f3f4f6" />

        {/* Static body base */}
        <g stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx="60" cy="20" r="7" />
          <path d="M60 27 V52" />
        </g>

        {/* Animated limbs group */}
        <g
          className="ex-limbs"
          stroke="#6b7280"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {/* Arms — default pose, CSS transforms move them */}
          <path className="ex-arm-l" d="M60 34 L38 42 L28 58" />
          <path className="ex-arm-r" d="M60 34 L82 42 L92 58" />
          {/* Legs */}
          <path className="ex-leg-l" d="M60 52 L48 92" />
          <path className="ex-leg-r" d="M60 52 L72 92" />
          {/* Torso lean for hinge */}
          <path className="ex-torso" d="M60 27 V52" stroke="transparent" />
        </g>

        {/* Direction arrows by pattern family */}
        <g className="ex-arrows" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7">
          {kind === 'press' && (
            <>
              <path d="M40 70 L40 50" />
              <path d="M40 50 L36 56 M40 50 L44 56" />
              <path d="M80 70 L80 50" />
              <path d="M80 50 L76 56 M80 50 L84 56" />
            </>
          )}
          {kind === 'pull' && (
            <>
              <path d="M35 45 L50 55" />
              <path d="M50 55 L44 52 M50 55 L48 61" />
              <path d="M85 45 L70 55" />
              <path d="M70 55 L76 52 M70 55 L72 61" />
            </>
          )}
          {kind === 'raise' && (
            <>
              <path d="M30 55 L30 40" />
              <path d="M30 40 L26 46 M30 40 L34 46" />
              <path d="M90 55 L90 40" />
              <path d="M90 40 L86 46 M90 40 L94 46" />
            </>
          )}
          {kind === 'squat' && (
            <>
              <path d="M60 95 L60 78" />
              <path d="M60 95 L56 88 M60 95 L64 88" />
            </>
          )}
          {kind === 'hinge' && (
            <>
              <path d="M75 40 L90 55" />
              <path d="M90 55 L84 54 M90 55 L88 49" />
            </>
          )}
          {kind === 'core' && (
            <>
              <path d="M60 48 Q72 42 70 55" />
              <path d="M70 55 L66 50 M70 55 L74 51" />
            </>
          )}
          {kind === 'calf' && (
            <>
              <path d="M48 100 L48 88" />
              <path d="M48 88 L44 93 M48 88 L52 93" />
              <path d="M72 100 L72 88" />
              <path d="M72 88 L68 93 M72 88 L76 93" />
            </>
          )}
        </g>

        {/* Highlight muscle zone */}
        {region === 'push' && (
          <g fill={color} fillOpacity="0.32">
            <ellipse cx="60" cy="40" rx="13" ry="9" />
            <circle cx="42" cy="36" r="5.5" />
            <circle cx="78" cy="36" r="5.5" />
          </g>
        )}
        {region === 'pull' && (
          <g fill={color} fillOpacity="0.32">
            <ellipse cx="60" cy="42" rx="15" ry="11" />
          </g>
        )}
        {region === 'legs' && (
          <g fill={color} fillOpacity="0.32">
            <ellipse cx="52" cy="76" rx="7" ry="15" />
            <ellipse cx="68" cy="76" rx="7" ry="15" />
            <ellipse cx="60" cy="58" rx="11" ry="7" />
          </g>
        )}
        {region === 'core' && (
          <g fill={color} fillOpacity="0.32">
            <ellipse cx="60" cy="48" rx="9" ry="11" />
          </g>
        )}

        <circle cx="60" cy="60" r="56" stroke={color} strokeWidth="2.5" strokeOpacity="0.35" fill="none" />
      </svg>
      {hint && (
        <span className="mt-1 max-w-[150px] text-center text-[11px] leading-tight text-gray-400">
          {hint}
        </span>
      )}
    </div>
  );
}

/** Ссылка на поиск техники на YouTube (не встраиваем чужие ролики). */
export function exerciseVideoSearchUrl(nameEn: string, nameRu?: string): string {
  const q = `${nameEn} proper form exercise technique`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

export function exerciseVideoSearchUrlRu(nameRu: string): string {
  const q = `${nameRu} техника выполнения`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
