'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, SkipForward, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function RestTimer({
  seconds,
  onDone,
  onSkip,
}: {
  seconds: number;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    setLeft(seconds);
    setPaused(false);
    doneRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (paused || left <= 0) return;
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          if (!doneRef.current) {
            doneRef.current = true;
            // лёгкая вибрация, если доступна
            try {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(200);
            } catch {
              /* ignore */
            }
            onDone();
          }
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [paused, left, onDone]);

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const pct = seconds > 0 ? ((seconds - left) / seconds) * 100 : 100;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-blue-200 bg-blue-50/95 px-4 py-4 backdrop-blur-md safe-bottom">
      <div className="mx-auto max-w-lg">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">Отдых</span>
          <button type="button" onClick={onSkip} className="text-blue-600" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-blue-200">
          <div
            className="h-full rounded-full bg-accent transition-all duration-1000 linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-3xl font-semibold tabular-nums text-blue-900">
            {mm}:{ss}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
              {paused ? 'Продолжить' : 'Пауза'}
            </Button>
            <Button variant="primary" size="sm" onClick={onSkip}>
              <SkipForward size={16} />
              Пропустить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
