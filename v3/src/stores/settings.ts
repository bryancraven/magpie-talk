'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

interface SettingsStore {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Mesh mode (glassmorphism effects)
  meshMode: boolean;
  setMeshMode: (enabled: boolean) => void;
  toggleMeshMode: () => void;

  // Font size
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;

  // Target duration (in minutes)
  targetDurationMinutes: number;
  setTargetDurationMinutes: (minutes: number) => void;

  // Syllable speed (ms per syllable)
  syllableDurationMs: number;
  setSyllableDurationMs: (ms: number) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Theme - default to dark for the "Deep Glass" aesthetic
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: newTheme });
        applyTheme(newTheme);
      },

      // Mesh mode
      meshMode: false,
      setMeshMode: (enabled) => {
        set({ meshMode: enabled });
        applyMeshMode(enabled);
      },
      toggleMeshMode: () => {
        const newMode = !get().meshMode;
        set({ meshMode: newMode });
        applyMeshMode(newMode);
      },

      // Font size
      fontSize: 'medium',
      setFontSize: (size) => {
        set({ fontSize: size });
        applyFontSize(size);
      },

      // Target duration
      targetDurationMinutes: 10,
      setTargetDurationMinutes: (minutes) => set({ targetDurationMinutes: minutes }),

      // Syllable speed
      syllableDurationMs: 1500,
      setSyllableDurationMs: (ms) => set({ syllableDurationMs: ms }),
    }),
    {
      name: 'magpie-settings',
      onRehydrateStorage: () => (state) => {
        // Apply persisted settings on load
        if (state) {
          applyTheme(state.theme);
          applyMeshMode(state.meshMode);
          applyFontSize(state.fontSize);
        }
      },
    }
  )
);

// Apply theme to document
function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }
}

// Apply mesh mode to document
function applyMeshMode(enabled: boolean) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-mesh-mode', enabled ? 'on' : 'off');
  }
}

// Apply font size to document
function applyFontSize(size: FontSize) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-font-size', size);
  }
}

// Font size scale values
export const fontSizeScale: Record<FontSize, number> = {
  small: 0.85,
  medium: 1,
  large: 1.2,
  xlarge: 1.4,
};
