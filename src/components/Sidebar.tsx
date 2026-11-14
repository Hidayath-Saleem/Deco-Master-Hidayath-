import React from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Cpu,
  FileText,
  HelpCircle,
  Layers,
  LayoutDashboard,
  ListChecks,
  Settings,
  X,
} from 'lucide-react';
import type { NavSection } from '../types/deco';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'syllabus', label: 'My Syllabus', icon: BookOpen },
  { id: 'materials', label: 'Study Materials', icon: FileText },
  { id: 'tutor', label: 'AI Tutor', icon: Bot },
  { id: 'questions', label: 'Important Questions', icon: HelpCircle },
  { id: 'practice', label: 'Practice Tests', icon: ListChecks },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'mock', label: 'Mock Exams', icon: ClipboardCheck },
  { id: 'progress', label: 'My Progress', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const handleSelect = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const navContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col bg-white dark:bg-[#0E1528] border-r border-slate-200 dark:border-slate-800/80 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-sm">
            <Cpu className="h-5 w-5" />
          </div>
          {(!collapsed || isMobile) && (
            <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              DECO Master
            </span>
          )}
        </div>

        {isMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav aria-label="Primary Navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              title={collapsed && !isMobile ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600/12 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-500/25'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white border border-transparent'
              } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-cyan-400' : ''}`} />
              {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[252px]'
        }`}
      >
        <div className="sticky top-0 h-screen">{navContent(false)}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full">{navContent(true)}</aside>
        </div>
      )}
    </>
  );
};
