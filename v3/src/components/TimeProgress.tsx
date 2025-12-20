'use client';

import { motion } from 'framer-motion';
import { usePlayerStore } from '@/stores/player';
import { useSettingsStore } from '@/stores/settings';
import { formatTime } from '@/lib/syllabizer';

export function TimeProgress() {
  const { elapsedMs } = usePlayerStore();
  const { targetDurationMinutes } = useSettingsStore();

  const targetMs = targetDurationMinutes * 60 * 1000;
  const percentage = Math.min(100, (elapsedMs / targetMs) * 100);

  // Calculate minute marks
  const marks: number[] = [];
  if (targetDurationMinutes >= 2) {
    const halfwayMinute = Math.floor(targetDurationMinutes / 2);
    for (let minute = 1; minute < targetDurationMinutes; minute++) {
      marks.push(minute);
    }
  }

  return (
    <div className="w-full px-4 py-3 md:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Progress bar container */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          {/* Minute marks */}
          {marks.map((minute) => {
            const position = (minute / targetDurationMinutes) * 100;
            const isHalfway = minute === Math.floor(targetDurationMinutes / 2);
            return (
              <div
                key={minute}
                className={`absolute top-0 h-full w-px ${
                  isHalfway ? 'bg-zinc-500' : 'bg-zinc-700'
                }`}
                style={{ left: `${position}%` }}
              />
            );
          })}

          {/* Progress fill */}
          <motion.div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-teal-400"
            animate={{ width: `${percentage}%` }}
            transition={{ ease: 'linear', duration: 0.1 }}
          />
        </div>

        {/* Time text */}
        <div className="mt-2 flex items-center justify-center gap-2 text-sm">
          <span className="font-mono text-zinc-400">
            {formatTime(elapsedMs)}
          </span>
          <span className="text-zinc-600">/</span>
          <span className="font-mono text-zinc-500">
            {formatTime(targetMs)}
          </span>
          <span className="text-zinc-600">
            ({Math.floor(percentage)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

export default TimeProgress;
