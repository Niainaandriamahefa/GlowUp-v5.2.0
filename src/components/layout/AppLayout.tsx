import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { cn } from '@/lib/utils';

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem('glowup:sidebar-collapsed') === '1';
  } catch {
    return false;
  }
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(loadCollapsed);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <aside className={cn('hidden shrink-0 border-r border-[var(--color-border)] transition-all duration-200 md:block', collapsed ? 'w-16' : 'w-64')}>
        <Sidebar onCollapseChange={setCollapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full w-64 bg-[var(--color-bg)] border-r border-[var(--color-border)] fade-in">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-5xl fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
