import type { ReactNode } from 'react';
import { Activity, BarChart3, Boxes, ClipboardList, DollarSign, LogOut, Package2, ShieldCheck } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/', icon: BarChart3 },
  { label: 'Inventory', to: '/inventory', icon: Boxes },
  { label: 'Purchases', to: '/purchases', icon: ClipboardList },
  { label: 'Billing', to: '/billing', icon: DollarSign },
  { label: 'Security', to: '/security', icon: ShieldCheck },
];

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('pharmacy_user') ?? '{"name":"Admin","role":"ADMIN"}') as {
    name: string;
    role: string;
  };

  const handleLogout = () => {
    localStorage.removeItem('pharmacy_token');
    localStorage.removeItem('pharmacy_user');
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-72 rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-soft lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/20 p-2 text-emerald-400">
              <Package2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">PharmaFlow</p>
              <h1 className="text-xl font-semibold">Pharmacy</h1>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-3 text-sm">
            <p className="text-slate-400">Signed in as</p>
            <p className="mt-1 font-medium text-white">{user.name}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">{user.role}</p>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={label}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Activity className="h-4 w-4" />
              Secure operations
            </div>
            <p>Role-based access and live stock monitoring for UK pharmacy workflows.</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm font-medium text-slate-200 transition hover:border-red-500 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
