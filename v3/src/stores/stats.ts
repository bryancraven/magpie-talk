'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Session {
  date: string;
  durationSeconds: number;
  articleTitle: string;
}

interface StatsStore {
  // Stats data
  totalPracticeSeconds: number;
  sessionsCompleted: number;
  sessionHistory: Session[];
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;

  // Actions
  recordSession: (durationSeconds: number, articleTitle: string) => void;
  resetStats: () => void;

  // Computed
  getFormattedStats: () => {
    totalTime: string;
    sessionsCompleted: number;
    currentStreak: number;
    longestStreak: number;
  };
  getWeekVisualization: () => Array<{
    date: string;
    dayName: string;
    practiced: boolean;
  }>;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

export const useStatsStore = create<StatsStore>()(
  persist(
    (set, get) => ({
      totalPracticeSeconds: 0,
      sessionsCompleted: 0,
      sessionHistory: [],
      currentStreak: 0,
      longestStreak: 0,
      lastPracticeDate: null,

      recordSession: (durationSeconds, articleTitle) => {
        const today = getTodayString();
        const state = get();

        // Update totals
        const newTotalSeconds = state.totalPracticeSeconds + durationSeconds;
        const newSessionsCompleted = state.sessionsCompleted + 1;

        // Calculate streak
        let newCurrentStreak = state.currentStreak;
        const lastDate = state.lastPracticeDate;

        if (!lastDate) {
          // First session ever
          newCurrentStreak = 1;
        } else {
          const lastPractice = new Date(lastDate);
          const todayDate = new Date(today);
          const diffDays = Math.floor(
            (todayDate.getTime() - lastPractice.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diffDays === 0) {
            // Already practiced today, streak unchanged
          } else if (diffDays === 1) {
            // Practiced yesterday, increment streak
            newCurrentStreak += 1;
          } else {
            // Gap, reset streak to 1
            newCurrentStreak = 1;
          }
        }

        const newLongestStreak = Math.max(newCurrentStreak, state.longestStreak);

        // Add to session history (keep last 100)
        const newHistory = [
          { date: today, durationSeconds, articleTitle },
          ...state.sessionHistory,
        ].slice(0, 100);

        set({
          totalPracticeSeconds: newTotalSeconds,
          sessionsCompleted: newSessionsCompleted,
          sessionHistory: newHistory,
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastPracticeDate: today,
        });
      },

      resetStats: () =>
        set({
          totalPracticeSeconds: 0,
          sessionsCompleted: 0,
          sessionHistory: [],
          currentStreak: 0,
          longestStreak: 0,
          lastPracticeDate: null,
        }),

      getFormattedStats: () => {
        const state = get();
        const totalMinutes = Math.floor(state.totalPracticeSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        // Recalculate current streak based on last practice date
        let currentStreak = state.currentStreak;
        if (state.lastPracticeDate) {
          const today = new Date(getTodayString());
          const lastPractice = new Date(state.lastPracticeDate);
          const diffDays = Math.floor(
            (today.getTime() - lastPractice.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diffDays > 1) {
            // Streak broken
            currentStreak = 0;
          }
        }

        return {
          totalTime: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
          sessionsCompleted: state.sessionsCompleted,
          currentStreak,
          longestStreak: state.longestStreak,
        };
      },

      getWeekVisualization: () => {
        const state = get();
        const today = new Date();
        const week: Array<{ date: string; dayName: string; practiced: boolean }> = [];

        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          const practiced = state.sessionHistory.some((s) => s.date === dateStr);

          week.push({
            date: dateStr,
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
            practiced,
          });
        }

        return week;
      },
    }),
    {
      name: 'magpie-stats',
    }
  )
);
