'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Sparkles, Menu, X, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onSignIn?: () => void;
  onSignOut?: () => void;
  onShowStats?: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
}

export function Header({
  onSignIn,
  onSignOut,
  onShowStats,
  showBackButton,
  onBack,
  title,
  subtitle,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { theme, toggleTheme, meshMode, toggleMeshMode } = useSettingsStore();
  const { user, isSignedIn } = useAuthStore();

  const handleAuthClick = () => {
    if (isSignedIn()) {
      onShowStats?.();
    } else {
      onSignIn?.();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        {/* Left side - Logo/Back */}
        <div className="flex items-center gap-3">
          {showBackButton && onBack ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-zinc-400 hover:text-zinc-100"
            >
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              {/* ASCII Magpie mascot */}
              <pre className="hidden text-[8px] leading-tight text-zinc-500 sm:block">
{`  <o~}
  /|\\~~~
   / \\`}
              </pre>
              <div>
                <h1 className="text-lg font-semibold text-zinc-100">
                  {title || 'Magpie Talk'}
                </h1>
                {subtitle && (
                  <p className="text-xs text-zinc-500">{subtitle}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Center - Article title (when in studio) */}
        {showBackButton && title && (
          <div className="hidden flex-1 px-8 text-center md:block">
            <p className="truncate text-sm text-zinc-400">{title}</p>
          </div>
        )}

        {/* Right side - Toggles */}
        <div className="flex items-center gap-2">
          {/* Desktop toggles */}
          <div className="hidden items-center gap-2 md:flex">
            {/* Mesh mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMeshMode}
              className={cn(
                'h-9 w-9 rounded-full',
                meshMode ? 'text-indigo-400' : 'text-zinc-500'
              )}
              aria-label="Toggle mesh effects"
            >
              <Sparkles className="h-4 w-4" />
            </Button>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-full text-zinc-500"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Auth hint */}
            {!isSignedIn() && (
              <span className="mr-2 text-xs text-zinc-600">
                Sign in to track progress
              </span>
            )}
          </div>

          {/* Auth button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAuthClick}
            className="h-9 w-9 overflow-hidden rounded-full"
            aria-label={isSignedIn() ? 'View stats' : 'Sign in'}
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="h-4 w-4 text-zinc-500" />
            )}
          </Button>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 w-9 rounded-full md:hidden"
            aria-label="Menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-zinc-800/50 bg-zinc-900/95 backdrop-blur-lg md:hidden"
          >
            <div className="space-y-1 p-4">
              <button
                onClick={() => {
                  toggleTheme();
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                Toggle Theme
              </button>

              <button
                onClick={() => {
                  toggleMeshMode();
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
              >
                <Sparkles className={cn('h-4 w-4', meshMode && 'text-indigo-400')} />
                Toggle Effects
              </button>

              {isSignedIn() && (
                <button
                  onClick={() => {
                    onSignOut?.();
                    setMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default Header;
