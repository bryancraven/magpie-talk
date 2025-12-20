'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Clock, Link2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardProps {
  onLoadFeatured: () => void;
  onLoadArticle: (input: string) => void;
  isLoading: boolean;
  lastArticleTitle?: string;
  lastProgress?: number;
}

/**
 * The "Lobby" Dashboard - Bento Grid Layout
 *
 * Asymmetrical, rounded grid with:
 * - Hero Card (2x2): "Continue where you left off"
 * - Daily Practice (1x2): Curated article of the day
 * - Quick Paste (full width): Input area for URL/text
 */
export function Dashboard({
  onLoadFeatured,
  onLoadArticle,
  isLoading,
  lastArticleTitle,
  lastProgress,
}: DashboardProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onLoadArticle(inputValue.trim());
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12 md:px-8 lg:px-16">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="mb-2 font-sans text-4xl font-semibold tracking-tight text-zinc-100 md:text-5xl">
            Magpie Talk
          </h1>
          <p className="text-lg text-zinc-500">
            Prolonged speech practice for fluency
          </p>
        </motion.header>

        {/* Bento Grid */}
        <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
          {/* Hero Card - Continue where you left off (2x2) */}
          {lastArticleTitle && (
            <BentoCard
              className="md:col-span-2 md:row-span-2"
              delay={0.1}
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <div className="mb-4 flex items-center gap-2 text-zinc-500">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Continue where you left off</span>
                  </div>
                  <h2 className="mb-2 text-2xl font-semibold text-zinc-100 md:text-3xl">
                    {lastArticleTitle}
                  </h2>
                  {lastProgress !== undefined && (
                    <div className="mb-4">
                      <div className="mb-1 flex justify-between text-xs text-zinc-500">
                        <span>Progress</span>
                        <span>{lastProgress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-teal-400"
                          style={{ width: `${lastProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full justify-between bg-white text-zinc-900 hover:bg-zinc-200 md:w-auto"
                  onClick={() => onLoadArticle(lastArticleTitle)}
                  disabled={isLoading}
                >
                  Continue Reading
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </BentoCard>
          )}

          {/* Daily Practice Card (1x2) */}
          <BentoCard
            className={cn(
              'md:row-span-2',
              !lastArticleTitle && 'md:col-span-2'
            )}
            delay={0.2}
          >
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center gap-2 text-indigo-400">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">Daily Practice</span>
                </div>
                <h2 className="mb-2 text-xl font-semibold text-zinc-100 md:text-2xl">
                  Today&apos;s Featured Article
                </h2>
                <p className="text-sm text-zinc-500">
                  Practice with Wikipedia&apos;s featured article of the day.
                  Curated content perfect for speech practice.
                </p>
              </div>
              <Button
                className="mt-6 w-full justify-between bg-indigo-500 text-white hover:bg-indigo-400"
                onClick={onLoadFeatured}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Start Practice'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </BentoCard>

          {/* Quick Paste Card (full width) */}
          <BentoCard className="md:col-span-3" delay={0.3}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:flex-row">
              <div className="flex items-center gap-2 text-zinc-500">
                <Link2 className="h-4 w-4" />
                <span className="text-sm">Quick Paste</span>
              </div>
              <div className="flex flex-1 gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Paste a Wikipedia URL or article title..."
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="shrink-0 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                >
                  Load
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </BentoCard>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center text-sm text-zinc-600"
        >
          <p>
            Prolonged speech is an evidence-based fluency technique.{' '}
            <a
              href="https://en.wikipedia.org/wiki/Stuttering#Fluency_shaping"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 underline hover:text-zinc-400"
            >
              Learn more
            </a>
          </p>
          <p className="mt-2 text-zinc-700">
            This app is for practice only, not clinical treatment.
          </p>
        </motion.footer>
      </div>
    </div>
  );
}

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

function BentoCard({ children, className, delay = 0 }: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 30 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'rounded-3xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-sm',
        'transition-shadow hover:shadow-lg hover:shadow-indigo-500/5',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export default Dashboard;
