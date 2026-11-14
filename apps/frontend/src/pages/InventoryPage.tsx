import { useEffect, useState } from 'react';
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      ...form,
      quantityInStock: Number(form.quantityInStock),
      reorderLevel: Number(form.reorderLevel),
      unitCost: Number(form.unitCost),
      unitPrice: Number(form.unitPrice),
    };

    await apiFetch('/api/inventory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

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
    loadInventory();
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Medicine inventory</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-800">Stock control overview</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500">
                <th className="py-3">Medicine</th>
                <th className="py-3">SKU</th>
                <th className="py-3">Category</th>
                <th className="py-3">Qty</th>
                <th className="py-3">Reorder</th>
                <th className="py-3">Unit price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 text-sm text-slate-700">
                  <td className="py-3 font-medium">{item.name}</td>
                  <td className="py-3">{item.sku}</td>
                  <td className="py-3">{item.category}</td>
                  <td className={`py-3 font-semibold ${item.quantityInStock <= item.reorderLevel ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {item.quantityInStock}
                  </td>
                  <td className="py-3">{item.reorderLevel}</td>
                  <td className="py-3">£{Number(item.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 text-xl font-semibold text-slate-800">Add new medicine</h3>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Medicine name" className="rounded-xl border border-slate-200 p-3" required />
          <input value={form.genericName} onChange={(e) => handleChange('genericName', e.target.value)} placeholder="Generic name" className="rounded-xl border border-slate-200 p-3" />
          <input value={form.brand} onChange={(e) => handleChange('brand', e.target.value)} placeholder="Brand" className="rounded-xl border border-slate-200 p-3" />
          <input value={form.category} onChange={(e) => handleChange('category', e.target.value)} placeholder="Category" className="rounded-xl border border-slate-200 p-3" required />
          <input value={form.sku} onChange={(e) => handleChange('sku', e.target.value)} placeholder="SKU" className="rounded-xl border border-slate-200 p-3" required />
          <input type="number" value={form.quantityInStock} onChange={(e) => handleChange('quantityInStock', e.target.value)} placeholder="Quantity" className="rounded-xl border border-slate-200 p-3" required />
          <input type="number" value={form.reorderLevel} onChange={(e) => handleChange('reorderLevel', e.target.value)} placeholder="Reorder level" className="rounded-xl border border-slate-200 p-3" required />
          <input type="number" step="0.01" value={form.unitCost} onChange={(e) => handleChange('unitCost', e.target.value)} placeholder="Unit cost" className="rounded-xl border border-slate-200 p-3" required />
          <input type="number" step="0.01" value={form.unitPrice} onChange={(e) => handleChange('unitPrice', e.target.value)} placeholder="Selling price" className="rounded-xl border border-slate-200 p-3" required />
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white">Save medicine</button>
          </div>
        </form>
      </div>
    </div>
  );
}
