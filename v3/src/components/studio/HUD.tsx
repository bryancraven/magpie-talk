'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePlayerStore } from '@/stores/player';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { formatTime } from '@/lib/syllabizer';
import { cn } from '@/lib/utils';

/**
 * The "Dynamic Island" HUD
 *
 * State: PAUSED - A floating glass pill at the bottom center with full controls
 * State: PLAYING - Morphs into a tiny, transparent capsule with just pause and progress
 *
 * This reduces visual clutter during speech practice.
 */
export function HUD() {
  const {
    state,
    bpm,
    elapsedMs,
    targetDurationMs,
    play,
    pause,
    resume,
    reset,
    setBpm,
    seekToSyllable,
    currentSyllableIndex,
    parseResult,
    getProgress,
  } = usePlayerStore();

  const isPlaying = state === 'playing';
  const isPaused = state === 'paused' || state === 'idle';
  const isComplete = state === 'complete';

  const progress = getProgress();
  const progressPercentage = Math.min(100, (elapsedMs / targetDurationMs) * 100);

  const handlePlayPause = () => {
    if (state === 'idle') {
      play();
    } else if (state === 'playing') {
      pause();
    } else if (state === 'paused') {
      resume();
    } else if (state === 'complete') {
      reset();
      play();
    }
  };

  const handleSeekBackward = () => {
    seekToSyllable(Math.max(0, currentSyllableIndex - 10));
  };

  const handleSeekForward = () => {
    if (parseResult) {
      seekToSyllable(Math.min(parseResult.syllables.length - 1, currentSyllableIndex + 10));
    }
  };

  return (
    <motion.div
      className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2"
      layout
      layoutId="hud"
    >
      <AnimatePresence mode="wait">
        {isPlaying ? (
          <CompactHUD
            key="compact"
            progressPercentage={progressPercentage}
            onPause={pause}
            elapsedMs={elapsedMs}
            targetDurationMs={targetDurationMs}
          />
        ) : (
          <ExpandedHUD
            key="expanded"
            state={state}
            bpm={bpm}
            onPlayPause={handlePlayPause}
            onReset={reset}
            onSeekBackward={handleSeekBackward}
            onSeekForward={handleSeekForward}
            onBpmChange={setBpm}
            progress={progress}
            elapsedMs={elapsedMs}
            targetDurationMs={targetDurationMs}
            isComplete={isComplete}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface CompactHUDProps {
  progressPercentage: number;
  onPause: () => void;
  elapsedMs: number;
  targetDurationMs: number;
}

function CompactHUD({ progressPercentage, onPause, elapsedMs, targetDurationMs }: CompactHUDProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="flex items-center gap-3 rounded-full border border-white/10 bg-zinc-900/60 px-4 py-2 backdrop-blur-xl"
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full hover:bg-white/10"
        onClick={onPause}
      >
        <Pause className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-700">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-teal-400"
            animate={{ width: `${progressPercentage}%` }}
            transition={{ ease: 'linear', duration: 0.1 }}
          />
        </div>
        <span className="font-mono text-xs text-zinc-400">
          {formatTime(elapsedMs)}
        </span>
      </div>
    </motion.div>
  );
}

interface ExpandedHUDProps {
  state: string;
  bpm: number;
  onPlayPause: () => void;
  onReset: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onBpmChange: (bpm: number) => void;
  progress: { current: number; total: number; percentage: number };
  elapsedMs: number;
  targetDurationMs: number;
  isComplete: boolean;
}

function ExpandedHUD({
  state,
  bpm,
  onPlayPause,
  onReset,
  onSeekBackward,
  onSeekForward,
  onBpmChange,
  progress,
  elapsedMs,
  targetDurationMs,
  isComplete,
}: ExpandedHUDProps) {
  const progressPercentage = Math.min(100, (elapsedMs / targetDurationMs) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-zinc-900/80 p-6 backdrop-blur-xl"
    >
      {/* Progress bar */}
      <div className="flex flex-col gap-2">
        <div className="h-2 w-64 overflow-hidden rounded-full bg-zinc-800 md:w-80">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-teal-400"
            animate={{ width: `${progressPercentage}%` }}
            transition={{ ease: 'linear', duration: 0.1 }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-500">
          <span className="font-mono">{formatTime(elapsedMs)}</span>
          <span className="font-mono">{formatTime(targetDurationMs)}</span>
        </div>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-white/10"
          onClick={onSeekBackward}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-14 w-14 rounded-full transition-colors',
            isComplete
              ? 'bg-teal-500 hover:bg-teal-400'
              : 'bg-white hover:bg-zinc-200'
          )}
          onClick={onPlayPause}
        >
          {isComplete ? (
            <RotateCcw className="h-6 w-6 text-white" />
          ) : (
            <Play className="h-6 w-6 fill-current text-zinc-900" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-white/10"
          onClick={onSeekForward}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-zinc-500">Speed</span>
        <Slider
          value={[bpm]}
          onValueChange={([value]) => onBpmChange(value)}
          min={20}
          max={80}
          step={1}
          className="w-40"
        />
        <span className="font-mono text-xs text-zinc-400">{bpm} BPM</span>
      </div>

      {/* Syllable progress */}
      <div className="text-center text-xs text-zinc-500">
        {progress.current} / {progress.total} syllables ({progress.percentage}%)
      </div>

      {/* Reset button */}
      {state !== 'idle' && (
        <Button
          variant="ghost"
          size="sm"
          className="mx-auto text-zinc-500 hover:text-white"
          onClick={onReset}
        >
          <RotateCcw className="mr-2 h-3 w-3" />
          Reset
        </Button>
      )}
    </motion.div>
  );
}

export default HUD;
