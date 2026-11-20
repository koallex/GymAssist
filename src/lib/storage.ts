/** Локальное хранение профиля, программы, истории и веса. Без внешних сервисов. */
import type { BodyWeightEntry, UserProfile, WorkoutPlan, WorkoutSession } from './types';
import { normalizeProfile } from './userProfile';

const KEYS = {
  profile: 'gym-assistant:profile:v1',
  plan: 'gym-assistant:plan:v1',
  onboardingDone: 'gym-assistant:onboarding-done:v1',
  history: 'gym-assistant:history:v1',
  activeSession: 'gym-assistant:active-session:v1',
  bodyWeight: 'gym-assistant:body-weight:v1',
  coachChat: 'gym-assistant:coach-chat:v1',
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

export function loadHistory(): WorkoutSession[] {
  if (typeof window === 'undefined') return [];
  return safeParse<WorkoutSession[]>(localStorage.getItem(KEYS.history)) ?? [];
}

export function saveHistory(sessions: WorkoutSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.history, JSON.stringify(sessions));
}

export function appendSession(session: WorkoutSession): void {
  const list = loadHistory();
  list.unshift(session);
  saveHistory(list.slice(0, 200));
}

export function loadActiveSession(): WorkoutSession | null {
  if (typeof window === 'undefined') return null;
  return safeParse<WorkoutSession>(localStorage.getItem(KEYS.activeSession));
}

export function saveActiveSession(session: WorkoutSession | null): void {
  if (typeof window === 'undefined') return;
  if (session) localStorage.setItem(KEYS.activeSession, JSON.stringify(session));
  else localStorage.removeItem(KEYS.activeSession);
}

export function loadBodyWeight(): BodyWeightEntry[] {
  if (typeof window === 'undefined') return [];
  return safeParse<BodyWeightEntry[]>(localStorage.getItem(KEYS.bodyWeight)) ?? [];
}

export function saveBodyWeight(entries: BodyWeightEntry[]): void {
  if (typeof window === 'undefined') return;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(KEYS.bodyWeight, JSON.stringify(sorted));
}

export function addBodyWeight(weightKg: number, date?: string, note?: string): BodyWeightEntry[] {
  const entries = loadBodyWeight();
  const d = date ?? new Date().toISOString().slice(0, 10);
  const existing = entries.findIndex((e) => e.date === d);
  const entry: BodyWeightEntry = {
    id: `${Date.now().toString(36)}`,
    date: d,
    weightKg: Math.round(weightKg * 10) / 10,
    note,
  };
  if (existing >= 0) entries[existing] = entry;
  else entries.push(entry);
  saveBodyWeight(entries);
  return loadBodyWeight();
}

export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
