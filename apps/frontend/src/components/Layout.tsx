import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Bell, Boxes, ClipboardList, LayoutDashboard, LogOut, Menu, Moon, Package2, Receipt, ShieldCheck, Sun, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { liveBus } from '../hooks/useLive';
import { clearSession } from '../lib/api';
import { useSummary } from './SummaryContext';

const navItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Inventory', to: '/inventory', icon: Boxes },
  { label: 'Purchases', to: '/purchases', icon: ClipboardList },
  { label: 'Billing', to: '/billing', icon: Receipt },
  { label: 'Security', to: '/security', icon: ShieldCheck },
];

function LivePill() {
  const [status, setStatus] = useState<{ ok: boolean; at: number } | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const onLive = (event: Event) => setStatus((event as CustomEvent).detail);
    liveBus.addEventListener('live', onLive);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      liveBus.removeEventListener('live', onLive);
      window.clearInterval(timer);
    };
  }, []);

  const seconds = status ? Math.max(0, Math.round((now - status.at) / 1000)) : null;
  const ok = status?.ok ?? true;

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
      }`}
      title="Data refreshes automatically every few seconds"
    >
      <span className="relative flex h-2 w-2">
        {ok ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /> : null}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      </span>
      {ok ? 'Live' : 'Reconnecting...'}
      {seconds !== null ? <span className="hidden font-normal opacity-70 sm:inline">· updated {seconds < 2 ? 'just now' : `${seconds}s ago`}</span> : null}
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { summary } = useSummary();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));

  const user = JSON.parse(localStorage.getItem('pharmacy_user') ?? '{"name":"Admin","role":"ADMIN"}') as {
    name: string;
    role: string;
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('pharmaflow_theme', next ? 'dark' : 'light');
    } catch {
      // storage can be blocked; the theme still switches for this visit
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate('/');
    window.location.reload();
  };

  const alertCount = (summary?.lowStockAlerts ?? 0) + (summary?.expiredCount ?? 0);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-2 pb-6">
        <div className="rounded-xl bg-emerald-500 p-2 text-white shadow-lg shadow-emerald-500/30">
          <Package2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-bold leading-tight text-white">PharmaFlow</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Pharmacy suite</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            end={to === '/'}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
            {label === 'Inventory' && summary && summary.lowStockAlerts > 0 ? (
              <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-900">{summary.lowStockAlerts}</span>
            ) : null}
            {label === 'Purchases' && summary && summary.openPurchaseOrders > 0 ? (
              <span className="ml-auto rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white">{summary.openPurchaseOrders}</span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs text-slate-400">Signed in as</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">{user.role}</p>
        <button type="button" onClick={handleLogout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-rose-400/50 hover:text-rose-300">
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-900 p-4 lg:block dark:border-r dark:border-slate-800 dark:bg-slate-900">{sidebar}</aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-950/60" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-slide-in bg-slate-900 p-4">
            <button type="button" onClick={() => setMenuOpen(false)} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-white/10" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-950/80">
          <button type="button" onClick={() => setMenuOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <LivePill />
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Stock alerts"
              title={alertCount ? `${alertCount} stock or expiry alerts` : 'No alerts'}
            >
              <Bell className="h-5 w-5" />
              {alertCount > 0 ? <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{alertCount}</span> : null}
            </button>
            <button type="button" onClick={toggleTheme} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Toggle dark mode">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
