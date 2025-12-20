'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Article } from '@/lib/wikipedia';
import type { ParseResult } from '@/lib/syllabizer';

export type PlayerState = 'idle' | 'playing' | 'paused' | 'complete';

interface PlayerStore {
  // Article state
  article: Article | null;
  parseResult: ParseResult | null;

  // Playback state
  state: PlayerState;
  currentSyllableIndex: number;

  // Settings
  bpm: number; // Beats per minute (syllables per minute)
  msPerSyllable: number; // Derived from bpm
  targetDurationMs: number; // Target practice duration in milliseconds

  // Timing
  startTime: number | null;
  pausedTime: number;
  elapsedMs: number;

  // Actions
  setArticle: (article: Article, parseResult: ParseResult) => void;
  clearArticle: () => void;

  play: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  complete: () => void;

  advanceSyllable: () => void;
  seekToSyllable: (index: number) => void;

  setBpm: (bpm: number) => void;
  setTargetDuration: (minutes: number) => void;

  updateElapsedTime: () => void;

  // Computed getters
  getProgress: () => { current: number; total: number; percentage: number };
  getTargetSyllableIndex: () => number;
}

// Convert BPM to milliseconds per syllable
const bpmToMs = (bpm: number): number => Math.round(60000 / bpm);

// Default BPM: 40 syllables per minute = 1500ms per syllable
const DEFAULT_BPM = 40;
const DEFAULT_TARGET_MINUTES = 10;

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      article: null,
      parseResult: null,
      state: 'idle',
      currentSyllableIndex: 0,
      bpm: DEFAULT_BPM,
      msPerSyllable: bpmToMs(DEFAULT_BPM),
      targetDurationMs: DEFAULT_TARGET_MINUTES * 60 * 1000,
      startTime: null,
      pausedTime: 0,
      elapsedMs: 0,

      // Article actions
      setArticle: (article, parseResult) => set({
        article,
        parseResult,
        state: 'idle',
        currentSyllableIndex: 0,
        startTime: null,
        pausedTime: 0,
        elapsedMs: 0,
      }),

      clearArticle: () => set({
        article: null,
        parseResult: null,
        state: 'idle',
        currentSyllableIndex: 0,
        startTime: null,
        pausedTime: 0,
        elapsedMs: 0,
      }),

      // Playback actions
      play: () => set({
        state: 'playing',
        startTime: Date.now() - get().pausedTime,
      }),

      pause: () => {
        const { startTime } = get();
        const pausedTime = startTime ? Date.now() - startTime : 0;
        set({
          state: 'paused',
          pausedTime,
        });
      },

      resume: () => set({
        state: 'playing',
        startTime: Date.now() - get().pausedTime,
      }),

      reset: () => set({
        state: 'idle',
        currentSyllableIndex: 0,
        startTime: null,
        pausedTime: 0,
        elapsedMs: 0,
      }),

      complete: () => set({
        state: 'complete',
      }),

      advanceSyllable: () => {
        const { currentSyllableIndex, parseResult } = get();
        if (!parseResult) return;

        const nextIndex = currentSyllableIndex + 1;
        if (nextIndex >= parseResult.syllables.length) {
          set({ state: 'complete' });
        } else {
          set({ currentSyllableIndex: nextIndex });
        }
      },

      seekToSyllable: (index) => {
        const { parseResult } = get();
        if (!parseResult) return;

        const clampedIndex = Math.max(0, Math.min(index, parseResult.syllables.length - 1));
        set({ currentSyllableIndex: clampedIndex });
      },

      setBpm: (bpm) => set({
        bpm,
        msPerSyllable: bpmToMs(bpm),
      }),

      setTargetDuration: (minutes) => set({
        targetDurationMs: minutes * 60 * 1000,
      }),

      updateElapsedTime: () => {
        const { state, startTime, pausedTime } = get();
        if (state === 'playing' && startTime) {
          set({ elapsedMs: Date.now() - startTime });
        } else if (state === 'paused') {
          set({ elapsedMs: pausedTime });
        }
      },

      // Computed getters
      getProgress: () => {
        const { currentSyllableIndex, parseResult } = get();
        const total = parseResult?.syllables.length || 0;
        return {
          current: currentSyllableIndex + 1,
          total,
          percentage: total > 0 ? Math.round(((currentSyllableIndex + 1) / total) * 100) : 0,
        };
      },

      getTargetSyllableIndex: () => {
        const { targetDurationMs, msPerSyllable, parseResult } = get();
        const targetSyllables = Math.floor(targetDurationMs / msPerSyllable);
        const total = parseResult?.syllables.length || 0;
        return Math.min(targetSyllables, total - 1);
      },
    }),
    {
      name: 'magpie-player-settings',
      // Only persist settings, not playback state
      partialize: (state) => ({
        bpm: state.bpm,
        msPerSyllable: state.msPerSyllable,
        targetDurationMs: state.targetDurationMs,
      }),
    }
  )
);
