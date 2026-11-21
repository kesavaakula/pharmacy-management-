import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, ArrowDownUp, Boxes, Download, MinusCircle, Package, PackagePlus, Pencil, PlusCircle, Trash2, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { daysUntil, formatDate, money } from '../lib/format';
import { notifyChange, useLive } from '../hooks/useLive';
import type { Medicine } from '../components/SummaryContext';
import { useToast } from '../components/Toast';
import { Badge, ConfirmModal, EmptyState, Field, Modal, PageHeader, SearchInput, Skeleton, StatCard } from '../components/ui';

type StockFilter = 'all' | 'low' | 'out' | 'expiring';
type SortKey = 'name' | 'quantityInStock' | 'unitPrice' | 'expiryDate';

const emptyForm = {
  name: '',
  genericName: '',
  brand: '',
  category: '',
  sku: '',
  quantityInStock: '0',
  reorderLevel: '10',
  unitCost: '0',
  unitPrice: '0',
  expiryDate: '',
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function InventoryPage() {
  const { data, loading, error } = useLive<Medicine[]>('/api/inventory', 8000);
  const toast = useToast();
  const items = data ?? [];

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Medicine | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<Medicine | null>(null);
  const [adjustValue, setAdjustValue] = useState('10');

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))).sort(), [items]);

  const lowCount = items.filter((item) => item.quantityInStock > 0 && item.quantityInStock <= item.reorderLevel).length;
  const outCount = items.filter((item) => item.quantityInStock === 0).length;
  const retailValue = items.reduce((sum, item) => sum + item.quantityInStock * Number(item.unitPrice), 0);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (category !== 'ALL' && item.category !== category) return false;
      if (term && !`${item.name} ${item.genericName ?? ''} ${item.brand ?? ''} ${item.sku}`.toLowerCase().includes(term)) return false;
      if (stockFilter === 'low') return item.quantityInStock <= item.reorderLevel;
      if (stockFilter === 'out') return item.quantityInStock === 0;
      if (stockFilter === 'expiring') {
        const left = daysUntil(item.expiryDate);
        return left !== null && left <= 90;
      }
      return true;
    });
    const direction = sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = a[sortKey] ?? '';
      const right = b[sortKey] ?? '';
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction;
      return String(left).localeCompare(String(right)) * direction;
    });
  }, [items, search, category, stockFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, category: categories[0] ?? 'General' });
    setFormOpen(true);
  };

  const openEdit = (item: Medicine) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      genericName: item.genericName ?? '',
      brand: item.brand ?? '',
      category: item.category,
      sku: item.sku ?? '',
      quantityInStock: String(item.quantityInStock),
      reorderLevel: String(item.reorderLevel),
      unitCost: String(item.unitCost),
      unitPrice: String(item.unitPrice),
      expiryDate: item.expiryDate ?? '',
    });
    setFormOpen(true);
  };

  const setField = (field: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (Number(form.unitPrice) < Number(form.unitCost)) {
      toast.warning('Selling price is below cost', 'Saved anyway - check the margin.');
    }
    setSaving(true);
    try {
      await api(editingId ? `/api/inventory/${editingId}` : '/api/inventory', {
        method: editingId ? 'PUT' : 'POST',
        body: {
          name: form.name.trim(),
          genericName: form.genericName.trim(),
          brand: form.brand.trim(),
          category: form.category.trim(),
          sku: form.sku.trim(),
          quantityInStock: Number(form.quantityInStock),
          reorderLevel: Number(form.reorderLevel),
          unitCost: Number(form.unitCost),
          unitPrice: Number(form.unitPrice),
          expiryDate: form.expiryDate || null,
        },
      });
      toast.success(editingId ? 'Medicine updated' : 'Medicine added', form.name);
      setFormOpen(false);
      notifyChange();
    } catch (err) {
      toast.error('Could not save medicine', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/api/inventory/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Medicine removed', `${deleteTarget.name} is no longer listed. Past invoices are kept.`);
      setDeleteTarget(null);
      notifyChange();
    } catch (err) {
      toast.error('Could not delete', err instanceof Error ? err.message : undefined);
    }
  };

  const submitAdjust = async (event: FormEvent) => {
    event.preventDefault();
    if (!adjustTarget) return;
    try {
      await api(`/api/inventory/${adjustTarget.id}/adjust`, { method: 'POST', body: { delta: Number(adjustValue) } });
      toast.success('Stock adjusted', `${adjustTarget.name}: ${Number(adjustValue) > 0 ? '+' : ''}${adjustValue}`);
      setAdjustTarget(null);
      notifyChange();
    } catch (err) {
      toast.error('Could not adjust stock', err instanceof Error ? err.message : undefined);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Name', 'Generic', 'Brand', 'SKU', 'Category', 'Quantity', 'Reorder level', 'Unit cost', 'Unit price', 'Expiry'],
      ...visible.map((item) => [item.name, item.genericName, item.brand, item.sku, item.category, item.quantityInStock, item.reorderLevel, item.unitCost, item.unitPrice, item.expiryDate]),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pharmacy-inventory.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const sortHeader = (label: string, key: SortKey) => (
    <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-white">
      {label}
      <ArrowDownUp className={`h-3 w-3 ${sortKey === key ? 'text-emerald-500' : 'opacity-40'}`} />
    </button>
  );

  const filterChips: Array<{ id: StockFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'low', label: 'Low stock' },
    { id: 'out', label: 'Out of stock' },
    { id: 'expiring', label: 'Expiring / expired' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Every medicine, its stock level and expiry. Updates live as sales and deliveries happen."
        actions={
          <>
            <button type="button" onClick={exportCsv} className="btn-secondary">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button type="button" onClick={openCreate} className="btn-primary">
              <PackagePlus className="h-4 w-4" />
              Add medicine
            </button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products" value={items.length} hint={`${categories.length} categories`} icon={Package} tone="sky" />
        <StatCard label="Low stock" value={lowCount} hint="At or below reorder level" icon={AlertTriangle} tone={lowCount ? 'amber' : 'emerald'} />
        <StatCard label="Out of stock" value={outCount} hint="Cannot be sold" icon={MinusCircle} tone={outCount ? 'rose' : 'emerald'} />
        <StatCard label="Stock value (retail)" value={money(retailValue)} icon={Wallet} tone="violet" />
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center">
          <div className="lg:w-80">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, brand, SKU..." />
          </div>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="input lg:w-52">
            <option value="ALL">All categories</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            {filterChips.map((chip) => (
              <button key={chip.id} type="button" onClick={() => setStockFilter(chip.id)} className={`chip ${stockFilter === chip.id ? 'chip-active' : ''}`}>
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {loading && !data ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        ) : error && !data ? (
          <EmptyState icon={AlertTriangle} title="Could not load inventory" text={error} />
        ) : visible.length === 0 ? (
          <EmptyState icon={Boxes} title="No medicines match" text="Try a different search or filter, or add a new medicine." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="th">{sortHeader('Medicine', 'name')}</th>
                  <th className="th">Category</th>
                  <th className="th">{sortHeader('Stock', 'quantityInStock')}</th>
                  <th className="th">{sortHeader('Price', 'unitPrice')}</th>
                  <th className="th">Margin</th>
                  <th className="th">{sortHeader('Expiry', 'expiryDate')}</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const out = item.quantityInStock === 0;
                  const low = !out && item.quantityInStock <= item.reorderLevel;
                  const left = daysUntil(item.expiryDate);
                  const margin = Number(item.unitPrice) > 0 ? Math.round(((Number(item.unitPrice) - Number(item.unitCost)) / Number(item.unitPrice)) * 100) : 0;
                  const fill = Math.min(100, (item.quantityInStock / Math.max(1, item.reorderLevel * 3)) * 100);
                  return (
                    <tr key={item.id} className="row">
                      <td className="td">
                        <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {[item.genericName, item.brand].filter(Boolean).join(' · ')} {item.sku ? `· ${item.sku}` : ''}
                        </p>
                      </td>
                      <td className="td">
                        <Badge tone="slate">{item.category}</Badge>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <span className={`w-10 font-semibold tabular-nums ${out ? 'text-rose-600' : low ? 'text-amber-600' : 'text-emerald-600'}`}>{item.quantityInStock}</span>
                          <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 sm:block dark:bg-slate-800">
                            <div className={`h-full rounded-full ${out ? 'bg-rose-500' : low ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${fill}%` }} />
                          </div>
                          {out ? <Badge tone="rose">Out</Badge> : low ? <Badge tone="amber">Low</Badge> : null}
                        </div>
                      </td>
                      <td className="td tabular-nums">{money(item.unitPrice)}</td>
                      <td className="td tabular-nums text-slate-500">{margin}%</td>
                      <td className="td">
                        {item.expiryDate ? (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 dark:text-slate-300">{formatDate(item.expiryDate)}</span>
                            {left !== null && left < 0 ? <Badge tone="rose">Expired</Badge> : left !== null && left <= 60 ? <Badge tone="amber">{left} d</Badge> : null}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="td">
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => { setAdjustTarget(item); setAdjustValue('10'); }} className="btn-secondary btn-sm" title="Adjust stock">
                            <PlusCircle className="h-3.5 w-3.5" />
                            Stock
                          </button>
                          <button type="button" onClick={() => openEdit(item)} className="btn-secondary btn-sm" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(item)} className="btn-secondary btn-sm text-rose-600 dark:text-rose-400" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">
          Showing {visible.length} of {items.length} medicines
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Edit medicine' : 'Add medicine'}
        wide
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="medicine-form" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add medicine'}
            </button>
          </>
        }
      >
        <form id="medicine-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Medicine name">
            <input className="input" value={form.name} onChange={(event) => setField('name', event.target.value)} required autoFocus />
          </Field>
          <Field label="Generic name">
            <input className="input" value={form.genericName} onChange={(event) => setField('genericName', event.target.value)} />
          </Field>
          <Field label="Brand">
            <input className="input" value={form.brand} onChange={(event) => setField('brand', event.target.value)} />
          </Field>
          <Field label="Category">
            <input className="input" list="category-options" value={form.category} onChange={(event) => setField('category', event.target.value)} required />
            <datalist id="category-options">
              {categories.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>
          <Field label="SKU (blank = auto)">
            <input className="input" value={form.sku} onChange={(event) => setField('sku', event.target.value)} />
          </Field>
          <Field label="Expiry date">
            <input type="date" className="input" value={form.expiryDate} onChange={(event) => setField('expiryDate', event.target.value)} />
          </Field>
          <Field label="Quantity in stock">
            <input type="number" min="0" className="input" value={form.quantityInStock} onChange={(event) => setField('quantityInStock', event.target.value)} required />
          </Field>
          <Field label="Reorder level">
            <input type="number" min="0" className="input" value={form.reorderLevel} onChange={(event) => setField('reorderLevel', event.target.value)} required />
          </Field>
          <Field label="Unit cost">
            <input type="number" min="0" step="0.01" className="input" value={form.unitCost} onChange={(event) => setField('unitCost', event.target.value)} required />
          </Field>
          <Field label="Selling price">
            <input type="number" min="0" step="0.01" className="input" value={form.unitPrice} onChange={(event) => setField('unitPrice', event.target.value)} required />
          </Field>
        </form>
      </Modal>

      <Modal
        open={adjustTarget !== null}
        onClose={() => setAdjustTarget(null)}
        title="Adjust stock"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setAdjustTarget(null)}>
              Cancel
            </button>
            <button type="submit" form="adjust-form" className="btn-primary">
              Apply
            </button>
          </>
        }
      >
        <form id="adjust-form" onSubmit={submitAdjust} className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {adjustTarget?.name} currently has <strong>{adjustTarget?.quantityInStock}</strong> units. Use a negative number for damaged or expired stock.
          </p>
          <Field label="Add / remove units">
            <input type="number" className="input" value={adjustValue} onChange={(event) => setAdjustValue(event.target.value)} required autoFocus />
          </Field>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        danger
        title="Remove medicine?"
        message={`${deleteTarget?.name ?? 'This medicine'} will be hidden from inventory and billing. Existing invoices and orders keep their history.`}
        confirmLabel="Remove"
      />
    </div>
  );
}
