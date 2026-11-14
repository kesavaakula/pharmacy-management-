import { useEffect, useState } from 'react';
import { AlertTriangle, DollarSign, PackageCheck, ShoppingCart, Users } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiFetch } from '../lib/api';

interface DashboardSummary {
  totalMedicines: number;
  customers: number;
  suppliers: number;
  lowStockAlerts: number;
  inventoryValue: number;
  monthlyRevenue: number;
  monthlyPurchases: number;
  lowStockItems: Array<{ id: number; name: string; quantityInStock: number; reorderLevel: number }>;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('pharmacy_token');
    apiFetch('/api/dashboard/summary', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => response.json())
      .then((data) => setSummary(data))
      .catch((error) => console.error('Unable to load dashboard data', error));
  }, []);

  const chartData = summary
    ? [
        { name: 'Inventory', value: summary.inventoryValue },
        { name: 'Revenue', value: summary.monthlyRevenue },
        { name: 'Purchases', value: summary.monthlyPurchases },
      ]
    : [];

  const statCards = summary
    ? [
        { label: 'Active medicines', value: summary.totalMedicines, icon: PackageCheck, tone: 'emerald' },
        { label: 'Customers', value: summary.customers, icon: Users, tone: 'sky' },
        { label: 'Suppliers', value: summary.suppliers ?? 0, icon: ShoppingCart, tone: 'violet' },
        { label: 'Low stock', value: summary.lowStockAlerts, icon: AlertTriangle, tone: 'amber' },
        { label: 'Inventory value', value: `£${summary.inventoryValue.toFixed(2)}`, icon: DollarSign, tone: 'indigo' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 p-6 text-white shadow-soft">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-100">Operations overview</p>
        <div className="mt-4 flex items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold">Pharmacy management dashboard</h2>
            <p className="mt-2 text-emerald-50">Billing, procurement, inventory, and stock visibility in one place.</p>
          </div>
          <button className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20">
            Generate report
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <h3 className="mt-2 text-3xl font-bold">{value}</h3>
              </div>
              <div className={`rounded-2xl p-3 ${tone === 'emerald' ? 'bg-emerald-100 text-emerald-700' : tone === 'sky' ? 'bg-sky-100 text-sky-700' : tone === 'amber' ? 'bg-amber-100 text-amber-700' : tone === 'violet' ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Operational value</h3>
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip formatter={(value) => [`£${Number(value).toFixed(2)}`, 'Value']} />
                <Bar dataKey="value" fill="#22c55e" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-lg font-semibold">Low stock alerts</h3>
          <div className="mt-4 space-y-3">
            {summary?.lowStockItems.length ? (
              summary.lowStockItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-700">{item.name}</span>
                    <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-900">
                      {item.quantityInStock} left
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Reorder level: {item.reorderLevel}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No critical low-stock alerts.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
