/** Локальное хранение профиля и программы. Без внешних сервисов. */
import type { UserProfile, WorkoutPlan } from './types';
import { normalizeProfile } from './userProfile';

const KEYS = {
  profile: 'gym-assistant:profile:v1',
  plan: 'gym-assistant:plan:v1',
  onboardingDone: 'gym-assistant:onboarding-done:v1',
} as const;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const data = safeParse<Partial<UserProfile>>(localStorage.getItem(KEYS.profile));
  if (!data) return null;
  return normalizeProfile(data);
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export function loadPlan(): WorkoutPlan | null {
  if (typeof window === 'undefined') return null;
  return safeParse<WorkoutPlan>(localStorage.getItem(KEYS.plan));
}

export function savePlan(plan: WorkoutPlan): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.plan, JSON.stringify(plan));
}

export function isOnboardingDone(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEYS.onboardingDone) === '1';
}

export function setOnboardingDone(done = true): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.onboardingDone, done ? '1' : '0');
}

export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
