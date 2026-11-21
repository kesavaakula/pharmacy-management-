import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLive, wasChangedLocallyRecently } from '../hooks/useLive';
import { useToast } from './Toast';
import { money } from '../lib/format';

export interface Medicine {
  id: number;
  name: string;
  genericName?: string;
  brand?: string;
  category: string;
  sku: string;
  quantityInStock: number;
  reorderLevel: number;
  unitCost: number;
  unitPrice: number;
  expiryDate?: string | null;
}

export interface ActivityItem {
  type: 'SALE' | 'PURCHASE';
  id: number;
  title: string;
  status: string;
  amount: number;
  at: string;
}

export interface DashboardSummary {
  serverTime: string;
  totalMedicines: number;
  customers: number;
  suppliers: number;
  lowStockAlerts: number;
  outOfStock: number;
  expiredCount: number;
  inventoryValue: number;
  monthlyRevenue: number;
  monthlyPurchases: number;
  todayRevenue: number;
  todaySales: number;
  pendingPayments: number;
  openPurchaseOrders: number;
  lowStockItems: Medicine[];
  expiringSoon: Array<{ id: number; name: string; expiryDate: string; daysLeft: number; quantityInStock: number }>;
  salesTrend: Array<{ date: string; revenue: number; orders: number }>;
  topSelling: Array<{ name: string; quantity: number; revenue: number }>;
  categoryBreakdown: Array<{ category: string; value: number }>;
  recentActivity: ActivityItem[];
}

interface SummaryState {
  summary: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

/** Fills in anything missing, so an older or half-deployed backend can never crash the screens. */
const normalize = (raw: Partial<DashboardSummary>): DashboardSummary => ({
  serverTime: raw.serverTime ?? '',
  totalMedicines: raw.totalMedicines ?? 0,
  customers: raw.customers ?? 0,
  suppliers: raw.suppliers ?? 0,
  lowStockAlerts: raw.lowStockAlerts ?? 0,
  outOfStock: raw.outOfStock ?? 0,
  expiredCount: raw.expiredCount ?? 0,
  inventoryValue: raw.inventoryValue ?? 0,
  monthlyRevenue: raw.monthlyRevenue ?? 0,
  monthlyPurchases: raw.monthlyPurchases ?? 0,
  todayRevenue: raw.todayRevenue ?? 0,
  todaySales: raw.todaySales ?? 0,
  pendingPayments: raw.pendingPayments ?? 0,
  openPurchaseOrders: raw.openPurchaseOrders ?? 0,
  lowStockItems: raw.lowStockItems ?? [],
  expiringSoon: raw.expiringSoon ?? [],
  salesTrend: raw.salesTrend ?? [],
  topSelling: raw.topSelling ?? [],
  categoryBreakdown: raw.categoryBreakdown ?? [],
  recentActivity: raw.recentActivity ?? [],
});

const SummaryContext = createContext<SummaryState>({ summary: null, loading: true, error: null, lastUpdated: null });

/** Polls the dashboard summary every 5 s for the whole app and raises toasts for changes made elsewhere. */
export function SummaryProvider({ children }: { children: ReactNode }) {
  const live = useLive<DashboardSummary>('/api/dashboard/summary', 5000);
  const { loading, error, lastUpdated } = live;
  const data = useMemo(() => (live.data ? normalize(live.data) : null), [live.data]);
  const toast = useToast();
  const previous = useRef<DashboardSummary | null>(null);

  useEffect(() => {
    if (!data) return;
    const before = previous.current;
    previous.current = data;
    if (!before || wasChangedLocallyRecently()) return;

    const latest = data.recentActivity[0];
    const earlier = before.recentActivity[0];
    if (latest && (!earlier || latest.id !== earlier.id || latest.type !== earlier.type)) {
      toast.info(latest.type === 'SALE' ? 'New sale' : 'New purchase order', `${latest.title} · ${money(latest.amount)}`);
    }
    if (data.lowStockAlerts > before.lowStockAlerts) {
      toast.warning('Low stock alert', `${data.lowStockAlerts} medicines are at or below their reorder level.`);
    }
  }, [data, toast]);

  return <SummaryContext.Provider value={{ summary: data, loading, error, lastUpdated }}>{children}</SummaryContext.Provider>;
}

export const useSummary = () => useContext(SummaryContext);
