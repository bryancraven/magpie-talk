'use client';

import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings as SettingsIcon } from 'lucide-react';
import { Dashboard } from '@/components/lobby/Dashboard';
import { Studio } from '@/components/studio/Studio';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Stats } from '@/components/Stats';
import { Settings } from '@/components/Settings';
import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/stores/player';
import { useAuthStore } from '@/stores/auth';
import { useStatsStore } from '@/stores/stats';
import { useSettingsStore } from '@/stores/settings';
import { getFeaturedArticle, getArticleByTitle, extractTitleFromUrl } from '@/lib/wikipedia';
import { splitText } from '@/lib/syllabizer';
import { onAuthStateChange, signInWithGoogle, signOutUser } from '@/lib/firebase';

type View = 'lobby' | 'studio';

export default function Home() {
  const [view, setView] = useState<View>('lobby');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastArticleTitle, setLastArticleTitle] = useState<string | undefined>();
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { setArticle, article, getProgress, state: playerState, elapsedMs, reset: resetPlayer } = usePlayerStore();
  const { setUser, user, isSignedIn, setLoading: setAuthLoading } = useAuthStore();
  const { recordSession } = useStatsStore();
  const { syllableDurationMs, targetDurationMinutes } = useSettingsStore();

  // Initialize Firebase auth listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      unsubscribe = await onAuthStateChange((firebaseUser) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
          });
        } else {
          setUser(null);
        }
        setAuthLoading(false);
      });
    };

    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [setUser, setAuthLoading]);

  // Load last article title from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('magpie_last_article');
      if (saved) {
        setLastArticleTitle(saved);
      }
    }
  }, []);

  // Record session when navigating away or completing
  useEffect(() => {
    if (playerState === 'complete' && article) {
      const durationSeconds = Math.floor(elapsedMs / 1000);
      if (durationSeconds >= 60) {
        recordSession(durationSeconds, article.title);
      }
    }
  }, [playerState, elapsedMs, article, recordSession]);

  // Sync syllable duration with player store
  useEffect(() => {
    const bpm = Math.round(60000 / syllableDurationMs);
    usePlayerStore.getState().setBpm(bpm);
  }, [syllableDurationMs]);

  // Sync target duration with player store
  useEffect(() => {
    usePlayerStore.getState().setTargetDuration(targetDurationMinutes);
  }, [targetDurationMinutes]);

  const loadArticle = useCallback(async (fetchFn: () => Promise<{ title: string; text: string; url: string }>) => {
    setIsLoading(true);
    setError(null);

    try {
      const article = await fetchFn();
      const parseResult = splitText(article.text);

      if (parseResult.syllables.length === 0) {
        throw new Error('Could not parse any syllables from the article.');
      }

      setArticle(article, parseResult);

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('magpie_last_article', article.title);
        setLastArticleTitle(article.title);
      }

      // Transition to studio view
      setView('studio');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load article';
      setError(message);
      console.error('Failed to load article:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setArticle]);

  const handleLoadFeatured = useCallback(() => {
    loadArticle(() => getFeaturedArticle());
  }, [loadArticle]);

  const handleLoadArticle = useCallback((input: string) => {
    const title = extractTitleFromUrl(input);
    loadArticle(() => getArticleByTitle(title));
  }, [loadArticle]);

  const handleBack = useCallback(() => {
    // Record session if practiced for at least 60 seconds
    if (article && elapsedMs >= 60000) {
      const durationSeconds = Math.floor(elapsedMs / 1000);
      recordSession(durationSeconds, article.title);
    }
    resetPlayer();
    setView('lobby');
  }, [article, elapsedMs, recordSession, resetPlayer]);

  const handleSignIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOutUser();
      setShowStats(false);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  }, []);

  const progress = article ? getProgress() : undefined;

  return (
    <main className="min-h-screen bg-zinc-950">
      <AnimatePresence mode="wait">
        {view === 'lobby' ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex min-h-screen flex-col"
          >
            <Header
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              onShowStats={() => setShowStats(true)}
            />

            {/* Settings button (floating) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              className="fixed bottom-4 right-4 z-30 h-12 w-12 rounded-full bg-zinc-800/80 text-zinc-400 shadow-lg backdrop-blur-sm hover:bg-zinc-700 hover:text-zinc-100"
              aria-label="Settings"
            >
              <SettingsIcon className="h-5 w-5" />
            </Button>

            <div className="flex-1">
              <Dashboard
                onLoadFeatured={handleLoadFeatured}
                onLoadArticle={handleLoadArticle}
                isLoading={isLoading}
                lastArticleTitle={lastArticleTitle}
                lastProgress={progress?.percentage}
              />
            </div>

            <Footer />
          </motion.div>
        ) : (
          <motion.div
            key="studio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Studio onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats modal */}
      <AnimatePresence>
        {showStats && isSignedIn() && (
          <Stats onClose={() => setShowStats(false)} onSignOut={handleSignOut} />
        )}
      </AnimatePresence>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && (
          <Settings onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-red-500/20 bg-red-500/10 px-6 py-3 text-red-400 backdrop-blur-lg"
          >
            <p className="text-sm">{error}</p>
            <button
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
              onClick={() => setError(null)}
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
