'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/stores/player';
import { useRhythmEngine, useKeyboardControls } from '@/hooks/useRhythmEngine';
import { cn } from '@/lib/utils';

/**
 * The Reader Component - "Lyrics View" Typography
 *
 * This is the core experience. Huge, centered text with the active syllable
 * highlighted in high contrast. Inactive text is deeply dimmed to guide
 * the eye strictly to the current moment.
 *
 * Features:
 * - Active syllable: High contrast (white), slightly larger (1.1x), motion blur trail
 * - Inactive text: Opacity 20%
 * - Auto-scroll: Active line stays vertically centered
 */
export function Reader() {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSyllableRef = useRef<HTMLSpanElement | null>(null);

  const { parseResult, currentSyllableIndex, state } = usePlayerStore();

  // Initialize the rhythm engine
  useRhythmEngine();
  useKeyboardControls();

  // Auto-scroll to keep active syllable centered
  useEffect(() => {
    if (activeSyllableRef.current && containerRef.current) {
      const container = containerRef.current;
      const syllable = activeSyllableRef.current;

      const containerRect = container.getBoundingClientRect();
      const syllableRect = syllable.getBoundingClientRect();

      // Center the syllable in the viewport
      const targetScroll =
        syllable.offsetTop - container.clientHeight / 2 + syllable.clientHeight / 2;

      container.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    }
  }, [currentSyllableIndex]);

  if (!parseResult) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-500">No article loaded</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-y-auto px-8 py-32 md:px-16 lg:px-32"
    >
      {/* Ambient pulse background */}
      <AnimatePresence>
        {state === 'playing' && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-0"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.02, 0.05, 0.02],
              background: [
                'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
                'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
                'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
              ],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </AnimatePresence>

      {/* Syllable text */}
      <div className="relative z-10 mx-auto max-w-4xl text-center font-sans text-4xl leading-relaxed tracking-wide md:text-5xl lg:text-6xl">
        {parseResult.wordMap.map((wordInfo, wordIndex) => (
          <span key={wordIndex} className="inline">
            {wordInfo.syllables.map((syllable, syllableIndex) => {
              const globalIndex = wordInfo.startIndex + syllableIndex;
              const isActive = globalIndex === currentSyllableIndex;
              const isPast = globalIndex < currentSyllableIndex;
              const isFuture = globalIndex > currentSyllableIndex;

              return (
                <motion.span
                  key={globalIndex}
                  ref={isActive ? activeSyllableRef : null}
                  className={cn(
                    'relative inline-block transition-all duration-150',
                    isActive && 'text-white',
                    isPast && 'text-zinc-600',
                    isFuture && 'text-zinc-700/30'
                  )}
                  animate={
                    isActive
                      ? {
                          scale: 1.1,
                          textShadow: '0 0 40px rgba(255, 255, 255, 0.5)',
                        }
                      : {
                          scale: 1,
                          textShadow: '0 0 0px rgba(255, 255, 255, 0)',
                        }
                  }
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                  }}
                >
                  {syllable}
                  {/* Motion blur trail for active syllable */}
                  {isActive && (
                    <motion.span
                      className="pointer-events-none absolute inset-0 text-white/30 blur-sm"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: [0.5, 0], x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {syllable}
                    </motion.span>
                  )}
                </motion.span>
              );
            })}
            {/* Preserve original punctuation and spacing */}
            <span className="text-zinc-600">{wordInfo.following}</span>
          </span>
        ))}
      </div>

      {/* Target position marker */}
      <TargetMarker />
    </div>
  );
}

/**
 * Target position marker - shows where user needs to read to hit target time
 */
function TargetMarker() {
  const { parseResult, currentSyllableIndex, getTargetSyllableIndex } = usePlayerStore();

  if (!parseResult) return null;

  const targetIndex = getTargetSyllableIndex();
  const isAtTarget = currentSyllableIndex >= targetIndex;

  // Only show if not yet at target
  if (isAtTarget) return null;

  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
      style={{ top: `${(targetIndex / parseResult.syllables.length) * 100}%` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
    >
      <div className="flex items-center gap-2">
        <div className="h-px w-16 bg-gradient-to-r from-transparent to-teal-400/50" />
        <div className="flex items-center gap-1 rounded-full bg-teal-400/20 px-2 py-0.5 text-xs text-teal-400">
          <span className="font-mono">Target</span>
        </div>
        <div className="h-px w-16 bg-gradient-to-l from-transparent to-teal-400/50" />
      </div>
    </motion.div>
  );
}

export default Reader;
