'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  generateProgram,
  loadPlan,
  loadProfile,
  savePlan,
  saveProfile,
  isOnboardingDone,
  type UserProfile,
  type WorkoutPlan,
} from '@/lib';

export function useAppData() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);

  const refresh = useCallback(() => {
    const done = isOnboardingDone();
    const p = loadProfile();
    let pl = loadPlan();
    if (p && pl) {
      const actualDays = pl.days.map((d) => d.weekday);
      const selectedDays = p.preferredWeekdays ?? [];
      if (pl.days.length !== selectedDays.length || actualDays.some((day, i) => day !== selectedDays[i])) {
        pl = generateProgram(p);
        savePlan(pl);
      }
    }
    setOnboarded(done && !!p && !!pl);
    setProfile(p);
    setPlan(pl);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateProfile = useCallback((next: UserProfile, regenerate = false) => {
    saveProfile(next);
    setProfile(next);
    if (regenerate) {
      const newPlan = generateProgram(next);
      savePlan(newPlan);
      setPlan(newPlan);
    }
  }, []);

  const regenerate = useCallback(() => {
    if (!profile) return;
    const newPlan = generateProgram(profile);
    savePlan(newPlan);
    setPlan(newPlan);
  }, [profile]);

  return { ready, onboarded, profile, plan, refresh, updateProfile, regenerate };
}
