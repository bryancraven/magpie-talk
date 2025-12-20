'use client';

import { motion } from 'framer-motion';
import { X, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStatsStore } from '@/stores/stats';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

interface StatsProps {
  onClose: () => void;
  onSignOut: () => void;
}

export function Stats({ onClose, onSignOut }: StatsProps) {
  const stats = useStatsStore((s) => s.getFormattedStats());
  const weekData = useStatsStore((s) => s.getWeekVisualization());
  const { user } = useAuthStore();

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
          <h2 className="text-xl font-semibold text-zinc-100">Your Practice</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Streak highlight */}
        {stats.currentStreak > 0 && (
          <div className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500/20 to-red-500/20 py-4">
            <Flame className="h-6 w-6 text-orange-400" />
            <span className="text-2xl font-bold text-orange-400">
              {stats.currentStreak} day streak
            </span>
          </div>
        )}

        {/* Stats grid */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <StatCard label="Total Practice" value={stats.totalTime} />
          <StatCard label="Sessions" value={stats.sessionsCompleted.toString()} />
          <StatCard
            label="Current Streak"
            value={stats.currentStreak > 0 ? `${stats.currentStreak}` : '0'}
            highlight={stats.currentStreak > 0}
          />
          <StatCard label="Best Streak" value={stats.longestStreak.toString()} />
        </div>

        {/* 7-day visualization */}
        <div className="mb-6">
          <p className="mb-3 text-center text-xs text-zinc-500">Last 7 days</p>
          <div className="flex justify-center gap-2">
            {weekData.map((day) => (
              <div
                key={day.date}
                className="flex flex-col items-center gap-1"
                title={`${day.date}${day.practiced ? ' - Practiced!' : ''}`}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm',
                    day.practiced
                      ? 'bg-teal-500/20 text-teal-400'
                      : 'bg-zinc-800 text-zinc-600'
                  )}
                >
                  {day.practiced ? '●' : '○'}
                </div>
                <span className="text-[10px] text-zinc-600">{day.dayName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
          <span className="text-sm text-zinc-500">
            {user?.displayName ? `Signed in as ${user.displayName}` : 'Guest'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-zinc-500 hover:text-red-400"
          >
            Sign Out
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-zinc-800/50 p-4 text-center">
      <div
        className={cn(
          'text-2xl font-bold',
          highlight ? 'text-orange-400' : 'text-zinc-100'
        )}
      >
        {value}
      </div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

export default Stats;
