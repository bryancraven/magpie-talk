'use client';

import { motion } from 'framer-motion';
import { X, Sun, Moon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useSettingsStore, type FontSize } from '@/stores/settings';
import { usePlayerStore } from '@/stores/player';
import { cn } from '@/lib/utils';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const {
    theme,
    toggleTheme,
    meshMode,
    toggleMeshMode,
    fontSize,
    setFontSize,
    targetDurationMinutes,
    setTargetDurationMinutes,
    syllableDurationMs,
    setSyllableDurationMs,
  } = useSettingsStore();

  const { setBpm } = usePlayerStore();

  // Sync syllable duration with player store BPM
  const handleSpeedChange = (value: number) => {
    setSyllableDurationMs(value);
    // Convert ms to BPM: BPM = 60000 / ms
    const bpm = Math.round(60000 / value);
    setBpm(bpm);
  };

  const fontSizes: { value: FontSize; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'xlarge', label: 'Extra Large' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-100">Settings</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Theme toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-100">Theme</p>
              <p className="text-xs text-zinc-500">Light or dark mode</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="gap-2"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  Light
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  Dark
                </>
              )}
            </Button>
          </div>

          {/* Mesh mode toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-100">Visual Effects</p>
              <p className="text-xs text-zinc-500">Mesh gradient background</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMeshMode}
              className={cn('gap-2', meshMode && 'border-indigo-500 text-indigo-400')}
            >
              <Sparkles className="h-4 w-4" />
              {meshMode ? 'On' : 'Off'}
            </Button>
          </div>

          {/* Font size */}
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-100">Font Size</p>
            <div className="flex gap-2">
              {fontSizes.map((size) => (
                <Button
                  key={size.value}
                  variant={fontSize === size.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFontSize(size.value)}
                  className="flex-1"
                >
                  {size.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Syllable duration */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-100">Syllable Duration</p>
              <span className="font-mono text-sm text-zinc-400">
                {syllableDurationMs}ms
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">Fast</span>
              <Slider
                value={[syllableDurationMs]}
                onValueChange={([value]) => handleSpeedChange(value)}
                min={500}
                max={2000}
                step={100}
                className="flex-1"
              />
              <span className="text-xs text-zinc-500">Slow</span>
            </div>
          </div>

          {/* Target duration */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-100">Target Duration</p>
              <span className="font-mono text-sm text-zinc-400">
                {targetDurationMinutes} min
              </span>
            </div>
            <Slider
              value={[targetDurationMinutes]}
              onValueChange={([value]) => setTargetDurationMinutes(value)}
              min={1}
              max={60}
              step={1}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Settings;
