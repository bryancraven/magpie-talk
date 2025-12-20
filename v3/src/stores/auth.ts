'use client';

import { create } from 'zustand';

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  isSignedIn: () => boolean;
  getUserInitial: () => string;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,

  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  isSignedIn: () => get().user !== null,
  getUserInitial: () => {
    const user = get().user;
    if (!user) return '';
    const name = user.displayName || user.email || '';
    return name.charAt(0).toUpperCase();
  },
}));
