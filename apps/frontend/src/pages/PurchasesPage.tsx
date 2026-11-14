import { useEffect, useState } from 'react';
import { ArrowUpRight, ClipboardList, Download, PackageCheck, Pencil, Truck, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface PurchaseOrder {
  id: number;
  supplierId: number;
  status: string;
  totalAmount: number;
  orderDate: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: number; name: string; contactPerson?: string; phone: string; email: string; address: string }>>([]);
  const [medicines, setMedicines] = useState<Array<{ id: number; name: string; unitPrice: number }>>([]);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [form, setForm] = useState({ supplierId: '1', medicineId: '1', quantity: '10', unitPrice: '1.50' });
  const [supplierForm, setSupplierForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '' });
  const token = localStorage.getItem('pharmacy_token');

  const loadData = async () => {
    try {
      const [ordersRes, suppliersRes, medicinesRes] = await Promise.all([
        apiFetch('/api/purchases', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        apiFetch('/api/suppliers', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        apiFetch('/api/inventory', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      ]);

      const purchasesData = await ordersRes.json();
      const suppliersData = await suppliersRes.json();
      const medicinesData = await medicinesRes.json();

      setPurchases(purchasesData);
      setSuppliers(suppliersData);
      setMedicines(medicinesData);
    } catch (error) {
      console.error('Failed to load purchase data', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    await apiFetch('/api/purchases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        supplierId: Number(form.supplierId),
        items: [
          {
            medicineId: Number(form.medicineId),
            quantity: Number(form.quantity),
            unitPrice: Number(form.unitPrice),
          },
        ],
      }),
    });

    setForm({ supplierId: '1', medicineId: '1', quantity: '10', unitPrice: '1.50' });
    loadData();
  };

  const resetSupplierForm = () => {
    setEditingSupplierId(null);
    setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', address: '' });
  };

  const handleSupplierSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const url = editingSupplierId ? `/api/suppliers/${editingSupplierId}` : '/api/suppliers';
    const method = editingSupplierId ? 'PUT' : 'POST';

    const response = await apiFetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(supplierForm),
    });

    if (response.ok) {
      resetSupplierForm();
      await loadData();
    }
  };

  const handleEditSupplier = (supplier: { id: number; name: string; contactPerson?: string; phone: string; email: string; address: string }) => {
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? '',
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
    });
  };

  const handleDeleteSupplier = async (id: number) => {
    await apiFetch(`/api/suppliers/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    resetSupplierForm();
    loadData();
  };

  const exportPurchasesCsv = () => {
    const rows = [
      ['PO ID', 'Supplier ID', 'Status', 'Total Amount', 'Order Date'],
      ...purchases.map((order) => [String(order.id), String(order.supplierId), order.status, String(order.totalAmount), order.orderDate]),
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pharmacy-purchases.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 text-white shadow-[0_20px_45px_rgba(109,40,217,0.28)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-violet-100">Procurement</p>
              <h2 className="mt-1 text-2xl font-bold">Vendor purchase orders</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={exportPurchasesCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Total orders</p>
              <h3 className="mt-2 text-3xl font-bold text-slate-800">{purchases.length}</h3>
            </div>
            <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
              <Truck className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Suppliers</p>
              <h3 className="mt-2 text-3xl font-bold text-slate-800">{suppliers.length}</h3>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <PackageCheck className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-5">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Orders</p>
          <h2 className="mt-2 text-xl font-bold text-slate-800">Recent purchase activity</h2>
        </div>

        <div className="space-y-3">
          {purchases.map((order) => (
            <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-800">PO-#{order.id}</p>
                    <p className="text-sm text-slate-500">Supplier #{order.supplierId}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{order.status}</p>
                  <p className="mt-2 text-xl font-bold text-slate-800">£{Number(order.totalAmount || 0).toFixed(2)}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500">Ordered date: {order.orderDate}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
              <Truck className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">Create purchase order</h3>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Supplier</label>
              <select value={form.supplierId} onChange={(e) => setForm((current) => ({ ...current, supplierId: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white">
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Medicine</label>
              <select value={form.medicineId} onChange={(e) => setForm((current) => ({ ...current, medicineId: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white">
                {medicines.map((medicine) => (
                  <option key={medicine.id} value={medicine.id}>{medicine.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quantity</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Unit price</label>
              <input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm((current) => ({ ...current, unitPrice: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white" required />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-violet-700">Submit order</button>
            </div>
          </form>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <PackageCheck className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">{editingSupplierId ? 'Update supplier' : 'Add supplier'}</h3>
          </div>

          <div className="mb-5 space-y-2">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="font-medium text-slate-800">{supplier.name}</p>
                  <p className="text-xs text-slate-500">{supplier.phone}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleEditSupplier(supplier)} className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDeleteSupplier(supplier.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSupplierSubmit} className="grid gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Supplier name</label>
              <input value={supplierForm.name} onChange={(e) => setSupplierForm((current) => ({ ...current, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Contact person</label>
              <input value={supplierForm.contactPerson} onChange={(e) => setSupplierForm((current) => ({ ...current, contactPerson: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Phone</label>
                <input value={supplierForm.phone} onChange={(e) => setSupplierForm((current) => ({ ...current, phone: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Email</label>
                <input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm((current) => ({ ...current, email: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Address</label>
              <textarea value={supplierForm.address} onChange={(e) => setSupplierForm((current) => ({ ...current, address: e.target.value }))} className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" />
            </div>
            <div className="flex justify-end gap-3">
              {editingSupplierId && (
                <button type="button" onClick={resetSupplierForm} className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                  Cancel
                </button>
              )}
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700">
                {editingSupplierId ? 'Update supplier' : 'Save supplier'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
