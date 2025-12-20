'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Reader } from './Reader';
import { HUD } from './HUD';
import { TimeProgress } from '@/components/TimeProgress';
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
 * - Time progress bar at the top
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
      className="relative flex min-h-screen flex-col bg-zinc-950"
    >
      {/* Header with back button and title */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-lg"
      >
        <div className="flex items-center justify-between px-4 py-3 md:px-8">
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
            <div className="flex flex-1 items-center justify-center gap-2 px-4">
              <h1 className="max-w-md truncate text-center text-sm font-medium text-zinc-300 md:max-w-lg">
                {article.title}
              </h1>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden text-zinc-600 hover:text-zinc-400 md:block"
                title="View on Wikipedia"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        {/* Time progress bar */}
        <TimeProgress />
      </motion.header>

      {/* Reader area */}
      <div className="flex-1 pb-32">
        <Reader />
      </div>

      {/* HUD */}
      <HUD />
    </motion.div>
  );
}

export default Studio;
