import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarClock,
  CheckSquare,
  StickyNote,
  BookHeart,
  Target,
  Flag,
  Trophy,
  Quote,
  BookOpen,
  Wallet,
  ShoppingBag,
  PiggyBank,
  Settings,
  History,
  ListChecks,
  Repeat,
  Lightbulb,
  Gem,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

interface NavGroup {
  key: string;
  title: string;
  items: NavItem[];
}

// "Divers" a été retiré du menu (module 11) — la page reste accessible en
// lien direct depuis les autres modules, mais n'encombre plus la navigation.
const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    title: 'Vue d\u2019ensemble',
    items: [
      { to: '/', label: 'Accueil', icon: LayoutDashboard, end: true },
      { to: '/bilan', label: 'Bilan', icon: BarChart3 },
      { to: '/historique', label: 'Historique', icon: History },
      { to: '/suggestions', label: 'Suggestions', icon: Lightbulb },
    ],
  },
  {
    key: 'organisation',
    title: 'Organisation',
    items: [
      { to: '/planning', label: 'Planning', icon: CalendarClock },
      { to: '/habitudes', label: 'Habitudes', icon: Repeat },
      { to: '/checklist', label: 'Checklist', icon: ListChecks },
      { to: '/plan-action', label: "Plan d'action", icon: Layers },
      { to: '/todo', label: 'ToDo Priorit\u00e9', icon: CheckSquare },
    ],
  },
  {
    key: 'second-cerveau',
    title: 'Second Cerveau',
    items: [
      { to: '/notes', label: 'Notes', icon: StickyNote },
      { to: '/journal', label: 'Journal', icon: BookHeart },
      { to: '/versets', label: 'Versets', icon: BookOpen },
      { to: '/citations', label: 'Citations', icon: Quote },
      { to: '/qualites', label: 'Qualit\u00e9s', icon: Gem },
    ],
  },
  {
    key: 'finances',
    title: 'Finances',
    items: [
      { to: '/budget', label: 'Budget', icon: Wallet },
      { to: '/achats', label: 'Achats', icon: ShoppingBag },
      { to: '/epargne', label: '\u00c9pargne', icon: PiggyBank },
    ],
  },
  {
    key: 'objectifs',
    title: 'Objectifs',
    items: [
      { to: '/objectifs', label: 'Objectifs du mois', icon: Target },
      { to: '/big-goals', label: 'Big Goals', icon: Flag },
      { to: '/challenges', label: 'Challenges', icon: Trophy },
    ],
  },
];

const COLLAPSE_KEY = 'glowup:sidebar-collapsed';
const GROUPS_KEY = 'glowup:sidebar-open-groups';

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function loadOpenGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return Object.fromEntries(NAV_GROUPS.map((g) => [g.key, true]));
}

export function Sidebar({ onNavigate, onCollapseChange }: { onNavigate?: () => void; onCollapseChange?: (collapsed: boolean) => void }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(loadOpenGroups);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
    onCollapseChange?.(next);
  }

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  }

  const groupHasActiveItem = (group: NavGroup) => group.items.some((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)));

  return (
    <nav className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <div className={cn('mb-1 flex items-center gap-2 px-1', collapsed && 'justify-center')}>
        <img src="/logo-glowup.png" alt="GlowUp" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
        {!collapsed && (
          <>
            <span className="font-display text-lg font-semibold">GlowUp</span>
            <span className="rounded-full bg-[var(--color-violet)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-violet-soft)]">
              5.1
            </span>
          </>
        )}
      </div>

      {NAV_GROUPS.map((group) => {
        const isOpen = collapsed || (openGroups[group.key] ?? true);
        const isActiveGroup = groupHasActiveItem(group);
        return (
          <div key={group.key}>
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.key)}
                className={cn(
                  'mb-1 flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-wider',
                  isActiveGroup ? 'text-[var(--color-violet-soft)]' : 'text-[var(--color-text-faint)]'
                )}
              >
                {group.title}
                <ChevronDown size={12} className={cn('transition-transform', openGroups[group.key] === false && '-rotate-90')} />
              </button>
            )}
            {isOpen && (
              <div className="flex flex-col gap-0.5">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-[var(--color-violet)]/15 text-[var(--color-violet-soft)]'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]'
                      )
                    }
                  >
                    <Icon size={17} />
                    {!collapsed && label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <NavLink
        to="/reglages"
        onClick={onNavigate}
        title={collapsed ? 'Réglages' : undefined}
        className={({ isActive }) =>
          cn(
            'mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
            collapsed && 'justify-center px-0',
            isActive
              ? 'bg-[var(--color-violet)]/15 text-[var(--color-violet-soft)]'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]'
          )
        }
      >
        <Settings size={17} />
        {!collapsed && 'Réglages'}
      </NavLink>

      <button
        onClick={toggleCollapsed}
        className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
        title={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
      >
        {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        {!collapsed && 'Réduire'}
      </button>
    </nav>
  );
}
