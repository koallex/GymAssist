/** Общие типы ядра. Без зависимостей от React. */

export const MUSCLE_IDS = [
  'chest', 'lats', 'upperBack', 'frontDelts', 'sideDelts', 'rearDelts',
  'biceps', 'triceps', 'forearms', 'quads', 'hamstrings', 'glutes', 'calves', 'core',
] as const;
export type MuscleId = (typeof MUSCLE_IDS)[number];

export const EQUIPMENT_IDS = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'bench'] as const;
export type Equipment = (typeof EQUIPMENT_IDS)[number];

export const JOINT_TAGS = ['shoulder', 'elbow', 'wrist', 'lowBack', 'knee', 'hip', 'neck'] as const;
export type JointTag = (typeof JOINT_TAGS)[number];

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'hypertrophy' | 'fat_loss' | 'strength' | 'recomposition' | 'general';
export type Sex = 'male' | 'female' | 'unspecified';
export type PreferredFormat = 'auto' | 'full_body' | 'upper_lower' | 'ppl';
export type Difficulty = 1 | 2 | 3;
export type ExerciseCategory = 'compound' | 'isolation';

export type MovementPattern =
  | 'horizontal_push' | 'incline_push' | 'dip' | 'chest_fly'
  | 'vertical_pull' | 'horizontal_pull' | 'lat_isolation' | 'shrug'
  | 'vertical_push' | 'front_raise' | 'lateral_raise' | 'rear_delt_fly'
  | 'elbow_flexion' | 'elbow_extension' | 'close_grip_press'
  | 'wrist' | 'carry'
  | 'squat' | 'lunge' | 'leg_extension'
  | 'hinge' | 'leg_curl' | 'hip_thrust' | 'glute_iso'
  | 'calf_raise' | 'core_flexion' | 'core_stability';

export interface Exercise {
  id: string;
  nameRu: string;
  nameEn: string;
  primary: MuscleId;
  /** Косвенная нагрузка: мышца → доля от прямого подхода (0..1). */
  secondary: Partial<Record<MuscleId, number>>;
  pattern: MovementPattern;
  category: ExerciseCategory;
  /** Всё оборудование, которое нужно для упражнения (bodyweight доступно всегда). */
  equipment: Equipment[];
  difficulty: Difficulty;
  /** Приоритет выбора при прочих равных: меньше = лучше. */
  rank: number;
  /** Системное утомление 1–3. */
  fatigue: 1 | 2 | 3;
  /** Суставы с заметной нагрузкой — для фильтра по травмам. */
  joints: JointTag[];
  instruction: string;
  /** Ключ SVG-схемы (этап 5). */
  illustration: string;
  timed?: boolean;
  repStyle?: 'high';
  mainLift?: boolean;
  unilateral?: boolean;
}

export interface UserProfile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  level: Level;
  goal: Goal;
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  sessionMinutes: 30 | 45 | 60 | 75 | 90;
  preferredFormat: PreferredFormat;
  availableEquipment: Equipment[];
  excludedExerciseIds: string[];
  limitations: JointTag[];
  /** Специализация — учитывается только для продвинутого уровня. */
  priorityMuscles: MuscleId[];
}

export interface PlannedExercise {
  exerciseId: string;
  targetMuscle: MuscleId;
  role: ExerciseCategory;
  sets: number;
  repMin: number;
  repMax: number;
  unit: 'reps' | 'sec';
  restSec: number;
  /** Сколько повторов оставлять «в запасе». */
  targetRIR: number;
  replacedFrom?: string;
}

export interface PlanDay {
  index: number;
  /** 0 = понедельник. */
  weekday: number;
  name: string;
  focus: string;
  muscles: MuscleId[];
  exercises: PlannedExercise[];
  estimatedMinutes: number;
}

export interface MuscleVolume {
  direct: number;
  indirect: number;
  effective: number;
  target: number;
  frequency: number;
}
export type WeeklyVolume = Record<MuscleId, MuscleVolume>;

export interface ProgressionRule {
  model: 'double_progression';
  sessionsAtTopToProgress: number;
  incrementKg: { upper: number; lower: number; isolation: number };
  description: string;
}

export interface WorkoutPlan {
  id: string;
  configVersion: string;
  profile: UserProfile;
  splitId: string;
  splitName: string;
  days: PlanDay[];
  weeklyVolume: WeeklyVolume;
  warnings: string[];
  notes: string[];
  progression: ProgressionRule;
}

// ─── История тренировок (этап 6) ───

export interface LoggedSet {
  setIndex: number;
  /** Фактический вес, кг. null = не введено / bodyweight. */
  weightKg: number | null;
  /** Фактические повторения или секунды. */
  reps: number | null;
  completed: boolean;
  completedAt?: string;
}

export interface LoggedExercise {
  exerciseId: string;
  targetMuscle: MuscleId;
  plannedSets: number;
  plannedRepMin: number;
  plannedRepMax: number;
  unit: 'reps' | 'sec';
  restSec: number;
  sets: LoggedSet[];
}

export interface WorkoutSession {
  id: string;
  /** Индекс дня в плане (PlanDay.index). */
  planDayIndex: number;
  dayName: string;
  focus: string;
  startedAt: string;
  finishedAt?: string;
  /** true если пользователь явно завершил. */
  completed: boolean;
  exercises: LoggedExercise[];
  notes?: string;
}

/** Запись массы тела для графика. */
export interface BodyWeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  note?: string;
}
