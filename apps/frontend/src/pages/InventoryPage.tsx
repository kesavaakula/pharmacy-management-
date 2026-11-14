import { useEffect, useState } from 'react';
import { AlertTriangle, Boxes, DollarSign, Download, PackagePlus, Pencil, Pill, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Medicine {
  id: number;
  name: string;
  sku: string;
  category: string;
  quantityInStock: number;
  reorderLevel: number;
  unitPrice: number;
}

export default function InventoryPage() {
  const [items, setItems] = useState<Medicine[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    genericName: '',
    brand: '',
    category: 'General',
    sku: '',
    quantityInStock: '0',
    reorderLevel: '10',
    unitCost: '0',
    unitPrice: '0',
  });

  const token = localStorage.getItem('pharmacy_token');

  const loadInventory = () => {
    apiFetch('/api/inventory', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => response.json())
      .then((data) => setItems(data))
      .catch((error) => console.error('Failed to load inventory', error));
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const lowStockCount = items.filter((item) => item.quantityInStock <= item.reorderLevel).length;
  const inventoryValue = items.reduce((sum, item) => sum + item.quantityInStock * item.unitPrice, 0);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      genericName: '',
      brand: '',
      category: 'General',
      sku: '',
      quantityInStock: '0',
      reorderLevel: '10',
      unitCost: '0',
      unitPrice: '0',
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      ...form,
      quantityInStock: Number(form.quantityInStock),
      reorderLevel: Number(form.reorderLevel),
      unitCost: Number(form.unitCost),
      unitPrice: Number(form.unitPrice),
    };

    const url = editingId ? `/api/inventory/${editingId}` : '/api/inventory';
    const method = editingId ? 'PUT' : 'POST';

    await apiFetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    resetForm();
    loadInventory();
  };

  const handleEdit = (item: Medicine) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      genericName: item.name,
      brand: item.name,
      category: item.category,
      sku: item.sku,
      quantityInStock: String(item.quantityInStock),
      reorderLevel: String(item.reorderLevel),
      unitCost: String(item.unitPrice),
      unitPrice: String(item.unitPrice),
    });
  };

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/inventory/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    resetForm();
    loadInventory();
  };

  const exportInventoryCsv = () => {
    const rows = [
      ['Name', 'SKU', 'Category', 'Quantity', 'Reorder Level', 'Unit Price'],
      ...items.map((item) => [item.name, item.sku, item.category, String(item.quantityInStock), String(item.reorderLevel), String(item.unitPrice)]),
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pharmacy-inventory.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 p-6 text-white shadow-[0_20px_45px_rgba(14,116,144,0.28)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-sky-100">Inventory</p>
              <h2 className="mt-1 text-2xl font-bold">Stock control overview</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={exportInventoryCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Products</p>
              <h3 className="mt-2 text-3xl font-bold text-slate-800">{items.length}</h3>
            </div>
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <Pill className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Low stock</p>
              <h3 className="mt-2 text-3xl font-bold text-slate-800">{lowStockCount}</h3>
            </div>
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Inventory value</p>
              <h3 className="mt-2 text-3xl font-bold text-slate-800">£{inventoryValue.toFixed(2)}</h3>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Medicine stock</p>
            <h2 className="mt-2 text-xl font-bold text-slate-800">Current inventory</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500">
                <th className="py-3 pr-4">Medicine</th>
                <th className="py-3 pr-4">SKU</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Qty</th>
                <th className="py-3 pr-4">Reorder</th>
                <th className="py-3 pr-4">Unit price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 text-sm text-slate-700">
                  <td className="py-3 pr-4 font-medium">{item.name}</td>
                  <td className="py-3 pr-4">{item.sku}</td>
                  <td className="py-3 pr-4">{item.category}</td>
                  <td className={`py-3 pr-4 font-semibold ${item.quantityInStock <= item.reorderLevel ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {item.quantityInStock}
                  </td>
                  <td className="py-3 pr-4">{item.reorderLevel}</td>
                  <td className="py-3 pr-4">£{Number(item.unitPrice).toFixed(2)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleEdit(item)} className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
            <PackagePlus className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800">{editingId ? 'Update medicine' : 'Add new medicine'}</h3>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Medicine name</label>
            <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Generic name</label>
            <input value={form.genericName} onChange={(e) => handleChange('genericName', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Brand</label>
            <input value={form.brand} onChange={(e) => handleChange('brand', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Category</label>
            <input value={form.category} onChange={(e) => handleChange('category', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">SKU</label>
            <input value={form.sku} onChange={(e) => handleChange('sku', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quantity</label>
            <input type="number" value={form.quantityInStock} onChange={(e) => handleChange('quantityInStock', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Reorder level</label>
            <input type="number" value={form.reorderLevel} onChange={(e) => handleChange('reorderLevel', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Unit cost</label>
            <input type="number" step="0.01" value={form.unitCost} onChange={(e) => handleChange('unitCost', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" required />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selling price</label>
            <input type="number" step="0.01" value={form.unitPrice} onChange={(e) => handleChange('unitPrice', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" required />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                Cancel
              </button>
            )}
            <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700">
              {editingId ? 'Update medicine' : 'Save medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
