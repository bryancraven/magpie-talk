'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/stores/player';

/**
 * Custom hook for precise rhythm timing using requestAnimationFrame
 *
 * Uses rAF instead of setInterval to prevent mobile drift and ensure
 * smooth, accurate timing for syllable transitions.
 */
export function useRhythmEngine() {
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const {
    state,
    msPerSyllable,
    advanceSyllable,
    updateElapsedTime,
  } = usePlayerStore();

  const tick = useCallback((timestamp: number) => {
    if (lastTickRef.current === 0) {
      lastTickRef.current = timestamp;
    }

    const elapsed = timestamp - lastTickRef.current;

    if (elapsed >= msPerSyllable) {
      advanceSyllable();
      lastTickRef.current = timestamp;

      // Trigger haptic feedback if supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(5); // 5ms crisp tick
        } catch {
          // Silently fail if vibration not supported
        }
      }
    }

    updateElapsedTime();

    // Continue the loop
    rafRef.current = requestAnimationFrame(tick);
  }, [msPerSyllable, advanceSyllable, updateElapsedTime]);

  useEffect(() => {
    if (state === 'playing') {
      lastTickRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [state, tick]);

  return {
    isRunning: state === 'playing',
  };
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardControls() {
  const { state, play, pause, resume, reset } = usePlayerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (state === 'idle') {
          play();
        } else if (state === 'playing') {
          pause();
        } else if (state === 'paused') {
          resume();
        }
      }

      if (e.code === 'KeyR' && e.metaKey) {
        e.preventDefault();
        reset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, play, pause, resume, reset]);
}
