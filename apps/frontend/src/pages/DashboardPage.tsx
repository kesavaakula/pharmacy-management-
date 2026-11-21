import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Boxes, CalendarClock, ClipboardList, PackageX, PlayCircle, Plus, Receipt, ShoppingBag, StopCircle, TrendingUp, Truck, Wallet } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { daysUntil, formatDate, money, moneyCompact, shortDay, timeAgo } from '../lib/format';
import { notifyChange } from '../hooks/useLive';
import { useSummary } from '../components/SummaryContext';
import type { Medicine } from '../components/SummaryContext';
import { useToast } from '../components/Toast';
import { Badge, EmptyState, PageHeader, Skeleton, StatCard, StatusBadge } from '../components/ui';

const PIE_COLORS = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#f43f5e', '#14b8a6', '#6366f1', '#84cc16'];

const tooltipStyle = {
  borderRadius: 12,
  border: 'none',
  background: 'rgba(15, 23, 42, 0.94)',
  color: '#f8fafc',
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  fontSize: 12,
};

export default function DashboardPage() {
  const { summary, loading, error } = useSummary();
  const toast = useToast();
  const [simulate, setSimulate] = useState(false);

  // Demo mode: creates a realistic random sale every few seconds so the whole app visibly updates.
  useEffect(() => {
    if (!simulate) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const [medicines, customers] = await Promise.all([api<Medicine[]>('/api/inventory'), api<Array<{ id: number }>>('/api/customers')]);
        const available = medicines.filter((medicine) => medicine.quantityInStock > 3 && (daysUntil(medicine.expiryDate) ?? 1) >= 0);
        if (!available.length || !customers.length) return;
        const pick = () => available[Math.floor(Math.random() * available.length)];
        const items = [pick(), pick()]
          .filter((medicine, index, list) => list.indexOf(medicine) === index)
          .map((medicine) => ({ medicineId: medicine.id, quantity: 1 + Math.floor(Math.random() * 3) }));
        await api('/api/sales', {
          method: 'POST',
          body: { customerId: customers[Math.floor(Math.random() * customers.length)].id, items, status: 'PAID', paymentMethod: 'CARD' },
        });
        notifyChange(false);
      } catch {
        // ignore a failed simulated sale (e.g. server waking up); the next tick tries again
      }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [simulate]);

  const toggleSimulation = () => {
    const next = !simulate;
    setSimulate(next);
    if (next) {
      toast.info('Live demo started', 'A new sale is created every few seconds. Watch the numbers update.');
    } else {
      toast.info('Live demo stopped');
    }
  };

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Loading live data..." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <p className="text-center text-sm text-slate-500">The server may take up to a minute to wake up on the free plan.</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="card">
        <EmptyState icon={AlertTriangle} title="Unable to load the dashboard" text={error ?? 'Please check your connection and try again.'} />
      </div>
    );
  }

  const trend = summary.salesTrend.map((point) => ({ ...point, label: shortDay(point.date) }));
  const categoryTotal = summary.categoryBreakdown.reduce((sum, item) => sum + Number(item.value), 0);
  const topMax = Math.max(1, ...summary.topSelling.map((item) => item.quantity));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Live overview of sales, stock and purchasing. Refreshes automatically."
        actions={
          <>
            <button type="button" onClick={toggleSimulation} className={simulate ? 'btn-danger' : 'btn-secondary'}>
              {simulate ? <StopCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
              {simulate ? 'Stop live demo' : 'Run live demo'}
            </button>
            <Link to="/purchases?new=1" className="btn-secondary">
              <Truck className="h-4 w-4" />
              New order
            </Link>
            <Link to="/billing" className="btn-primary">
              <Plus className="h-4 w-4" />
              New sale
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Today's sales" value={money(summary.todayRevenue)} hint={`${summary.todaySales} invoice${summary.todaySales === 1 ? '' : 's'} today`} icon={TrendingUp} tone="emerald" />
        <StatCard label="Revenue this month" value={money(summary.monthlyRevenue)} hint={`Purchases this month: ${money(summary.monthlyPurchases)}`} icon={Receipt} tone="sky" />
        <StatCard label="Pending payments" value={money(summary.pendingPayments)} hint="Unpaid and overdue invoices" icon={Wallet} tone="amber" />
        <StatCard label="Stock value (retail)" value={money(summary.inventoryValue)} hint={`${summary.totalMedicines} active medicines`} icon={Boxes} tone="violet" />
        <StatCard
          label="Low stock"
          value={summary.lowStockAlerts}
          hint={summary.outOfStock > 0 ? `${summary.outOfStock} out of stock` : 'At or below reorder level'}
          icon={PackageX}
          tone={summary.lowStockAlerts > 0 ? 'rose' : 'emerald'}
        />
        <StatCard label="Open purchase orders" value={summary.openPurchaseOrders} hint="Waiting to be received" icon={ClipboardList} tone="sky" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Sales, last 14 days</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Paid and pending invoices, excluding cancelled</p>
            </div>
            <Badge tone="emerald">{money(trend.reduce((sum, point) => sum + Number(point.revenue), 0))}</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => moneyCompact(value)} width={56} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => (name === 'revenue' ? [money(value), 'Revenue'] : [value, 'Invoices'])} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#salesFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Stock value by category</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Where your inventory money sits</p>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.categoryBreakdown} dataKey="value" nameKey="category" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                  {summary.categoryBreakdown.map((item, index) => (
                    <Cell key={item.category} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [money(value), name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5">
            {summary.categoryBreakdown.slice(0, 5).map((item, index) => (
              <li key={item.category} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                  {item.category}
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{categoryTotal ? Math.round((Number(item.value) / categoryTotal) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low stock
            </h2>
            <Link to="/inventory" className="text-xs font-semibold text-emerald-600 hover:underline">
              View all
            </Link>
          </div>
          {summary.lowStockItems.length === 0 ? (
            <EmptyState icon={Boxes} title="All stocked up" text="No medicines are below their reorder level." />
          ) : (
            <ul className="space-y-2">
              {summary.lowStockItems.slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.quantityInStock === 0 ? 'Out of stock' : `${item.quantityInStock} left`} · reorder at {item.reorderLevel}
                    </p>
                  </div>
                  <Link to={`/purchases?new=1&medicine=${item.id}`} className="btn-secondary btn-sm shrink-0">
                    Reorder
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <CalendarClock className="h-4 w-4 text-rose-500" />
            Expiry watch
          </h2>
          {summary.expiringSoon.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing expiring soon" text="No stock expires within 90 days." />
          ) : (
            <ul className="space-y-2">
              {summary.expiringSoon.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(item.expiryDate)} · {item.quantityInStock} in stock
                    </p>
                  </div>
                  <Badge tone={item.daysLeft < 0 ? 'rose' : item.daysLeft <= 30 ? 'amber' : 'sky'}>{item.daysLeft < 0 ? 'Expired' : `${item.daysLeft} d`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <ShoppingBag className="h-4 w-4 text-emerald-500" />
            Best sellers (30 days)
          </h2>
          {summary.topSelling.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No sales yet" text="Best sellers appear after your first invoices." />
          ) : (
            <ul className="space-y-3">
              {summary.topSelling.map((item, index) => (
                <li key={item.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                      {index + 1}. {item.name}
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-slate-500">{item.quantity} sold · {money(item.revenue)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(6, (item.quantity / topMax) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent activity</h2>
          <Link to="/billing" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline">
            All invoices <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {summary.recentActivity.length === 0 ? (
          <EmptyState icon={Receipt} title="No activity yet" text="Sales and purchase orders will show up here as they happen." />
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {summary.recentActivity.map((event) => (
              <li key={`${event.type}-${event.id}`} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <div className={`rounded-lg p-2 ${event.type === 'SALE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'}`}>
                  {event.type === 'SALE' ? <Receipt className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{event.title}</p>
                  <p className="text-xs text-slate-500">{timeAgo(event.at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{money(event.amount)}</p>
                  <StatusBadge status={event.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
