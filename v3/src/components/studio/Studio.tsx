'use client';

import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Reader } from './Reader';
import { HUD } from './HUD';
import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/stores/player';

interface StudioProps {
  onBack: () => void;
}

/**
 * The Studio View - Contains Reader and HUD
 *
 * This is the immersive reading experience with:
 * - Full-screen reader with lyrics-style typography
 * - Dynamic Island HUD for controls
 * - Back button to return to dashboard
 */
export function Studio({ onBack }: StudioProps) {
  const { article } = usePlayerStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen bg-zinc-950"
    >
      {/* Header with back button and title */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-950/80 px-4 py-3 backdrop-blur-lg md:px-8"
      >
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-zinc-100"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {article && (
          <div className="flex-1 px-4 text-center">
            <h1 className="truncate text-sm font-medium text-zinc-300">
              {article.title}
            </h1>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-600 hover:text-zinc-500"
            >
              View on Wikipedia
            </a>
          </div>
        )}

        <div className="w-20" /> {/* Spacer for centering */}
      </motion.header>

      {/* Reader area */}
      <div className="h-screen pt-16 pb-32">
        <Reader />
      </div>

      {/* HUD */}
      <HUD />
    </motion.div>
  );
}

export default Studio;
