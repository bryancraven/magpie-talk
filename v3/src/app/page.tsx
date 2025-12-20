'use client';

import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dashboard } from '@/components/lobby/Dashboard';
import { Studio } from '@/components/studio/Studio';
import { usePlayerStore } from '@/stores/player';
import { getFeaturedArticle, getArticleByTitle, extractTitleFromUrl } from '@/lib/wikipedia';
import { splitText } from '@/lib/syllabizer';

type View = 'lobby' | 'studio';

export default function Home() {
  const [view, setView] = useState<View>('lobby');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastArticleTitle, setLastArticleTitle] = useState<string | undefined>();

  const { setArticle, article, getProgress } = usePlayerStore();

  // Load last article title from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('magpie_last_article');
      if (saved) {
        setLastArticleTitle(saved);
      }
    }
  }, []);

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
    setView('lobby');
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
          >
            <Dashboard
              onLoadFeatured={handleLoadFeatured}
              onLoadArticle={handleLoadArticle}
              isLoading={isLoading}
              lastArticleTitle={lastArticleTitle}
              lastProgress={progress?.percentage}
            />
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
