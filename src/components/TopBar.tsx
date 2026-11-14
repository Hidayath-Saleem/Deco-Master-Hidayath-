import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Menu, Moon, Search, Sun, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { GlobalSearchResult, NavSection } from '../types/deco';
import { GoogleSignInButton } from './GoogleSignInButton';

interface TopBarProps {
  activeSection: NavSection;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchResults: GlobalSearchResult[];
  onSelectSearchResult: (result: GlobalSearchResult) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  user: User | null;
  driveConnected: boolean;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  signingIn: boolean;
}

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  syllabus: 'My Syllabus',
  materials: 'Study Materials',
  tutor: 'AI Tutor',
  questions: 'Important Questions',
  practice: 'Practice Tests',
  flashcards: 'Flashcards',
  mock: 'Mock Exams',
  progress: 'My Progress',
  settings: 'Settings',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  searchResults,
  onSelectSearchResult,
  theme,
  onToggleTheme,
  user,
  driveConnected,
  onGoogleSignIn,
  onGoogleSignOut,
  signingIn,
}) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-[#0B1020]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Trigger + Section Heading */}
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate whitespace-nowrap">
          {SECTION_TITLES[activeSection]}
        </h1>
      </div>

      {/* Center: Global Search */}
      <div ref={searchWrapRef} className="relative flex-1 max-w-md hidden sm:block">
        <label htmlFor="global-deco-search" className="sr-only">
          Search DECO syllabus, notes, questions, definitions, formulas, and flashcards
        </label>
        <div className="relative flex items-center">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            id="global-deco-search"
            type="search"
            value={searchQuery}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setSearchFocused(true);
            }}
            placeholder="Search units, topics, notes, formulas, questions..."
            className="w-full h-9 pl-9 pr-8 rounded-lg text-sm bg-slate-100 dark:bg-[#131B31] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {searchFocused && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 mt-1.5 rounded-xl bg-white dark:bg-[#131B31] border border-slate-200 dark:border-slate-700/80 shadow-xl max-h-96 overflow-y-auto z-50">
            {searchResults.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No matching topics, notes, definitions, or questions for "{searchQuery}".
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {searchResults.map((res) => (
                  <li key={res.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSearchResult(res);
                        setSearchFocused(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-indigo-600 dark:text-cyan-400 font-medium">
                        <span className="capitalize">{res.type}</span>
                        {res.unitNumber && <span className="tabular-nums">Unit {res.unitNumber}</span>}
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate mt-0.5">
                        {res.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {res.snippet}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Right: Mobile Search + Theme Toggle + Account */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setMobileSearchOpen((v) => !v)}
          aria-label="Toggle mobile search"
          className="sm:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {user ? (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="hidden md:block text-right leading-tight">
              <p className="text-xs font-medium text-slate-900 dark:text-white truncate max-w-[140px]">
                {user.displayName || user.email}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {driveConnected ? 'Drive Connected' : 'Reconnect Drive'}
              </p>
            </div>
            {!driveConnected && (
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white whitespace-nowrap shrink-0"
              >
                Enable Drive
              </button>
            )}
            <button
              type="button"
              onClick={onGoogleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <GoogleSignInButton onClick={onGoogleSignIn} loading={signingIn} label="Sign in" />
        )}
      </div>

      {/* Expandable Mobile Search Dropdown */}
      {mobileSearchOpen && (
        <div className="sm:hidden absolute left-0 right-0 top-16 bg-white dark:bg-[#0B1020] border-b border-slate-200 dark:border-slate-800 px-4 py-3 z-40 shadow-lg space-y-2">
          <div className="relative flex items-center">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="search"
              aria-label="Mobile search DECO workspace"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search units, topics, notes, formulas..."
              className="w-full h-9 pl-9 pr-8 rounded-lg text-sm bg-slate-100 dark:bg-[#131B31] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
          {searchQuery.trim() && (
            <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {searchResults.length === 0 ? (
                <li className="py-3 text-xs text-slate-500 text-center">No results found.</li>
              ) : (
                searchResults.map((res) => (
                  <li key={res.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSearchResult(res);
                        setMobileSearchOpen(false);
                      }}
                      className="w-full text-left py-2"
                    >
                      <p className="text-xs font-medium text-indigo-600 dark:text-cyan-400 capitalize">
                        {res.type} {res.unitNumber ? `· Unit ${res.unitNumber}` : ''}
                      </p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {res.title}
                      </p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </header>
  );
};
