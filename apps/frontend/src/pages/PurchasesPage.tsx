import { useEffect, useState } from 'react';
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
  const [suppliers, setSuppliers] = useState<Array<{ id: number; name: string; phone: string; email: string; address: string }>>([]);
  const [medicines, setMedicines] = useState<Array<{ id: number; name: string; unitPrice: number }>>([]);
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

  const handleSupplierSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const response = await apiFetch('/api/suppliers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(supplierForm),
    });

    if (response.ok) {
      setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', address: '' });
      await loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="mb-5">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Procurement</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-800">Vendor purchase orders</h2>
        </div>

        <div className="space-y-3">
          {purchases.map((order) => (
            <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold">PO-#{order.id}</p>
                  <p className="text-sm text-slate-500">Supplier #{order.supplierId}</p>
                </div>
                <div className="text-right">
                  <p className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{order.status}</p>
                  <p className="mt-2 text-xl font-bold">£{Number(order.totalAmount || 0).toFixed(2)}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500">Ordered date: {order.orderDate}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-xl font-semibold text-slate-800">Create purchase order</h3>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <select value={form.supplierId} onChange={(e) => setForm((current) => ({ ...current, supplierId: e.target.value }))} className="rounded-xl border border-slate-200 p-3">
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>

            <select value={form.medicineId} onChange={(e) => setForm((current) => ({ ...current, medicineId: e.target.value }))} className="rounded-xl border border-slate-200 p-3">
              {medicines.map((medicine) => (
                <option key={medicine.id} value={medicine.id}>{medicine.name}</option>
              ))}
            </select>

            <input type="number" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))} placeholder="Quantity" className="rounded-xl border border-slate-200 p-3" required />
            <input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm((current) => ({ ...current, unitPrice: e.target.value }))} placeholder="Unit price" className="rounded-xl border border-slate-200 p-3" required />

            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white">Submit order</button>
            </div>
          </form>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-xl font-semibold text-slate-800">Add supplier</h3>
          <form onSubmit={handleSupplierSubmit} className="grid gap-4">
            <input value={supplierForm.name} onChange={(e) => setSupplierForm((current) => ({ ...current, name: e.target.value }))} placeholder="Supplier name" className="rounded-xl border border-slate-200 p-3" required />
            <input value={supplierForm.contactPerson} onChange={(e) => setSupplierForm((current) => ({ ...current, contactPerson: e.target.value }))} placeholder="Contact person" className="rounded-xl border border-slate-200 p-3" />
            <input value={supplierForm.phone} onChange={(e) => setSupplierForm((current) => ({ ...current, phone: e.target.value }))} placeholder="Phone" className="rounded-xl border border-slate-200 p-3" required />
            <input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm((current) => ({ ...current, email: e.target.value }))} placeholder="Email address" className="rounded-xl border border-slate-200 p-3" />
            <textarea value={supplierForm.address} onChange={(e) => setSupplierForm((current) => ({ ...current, address: e.target.value }))} placeholder="Address" className="min-h-[100px] rounded-xl border border-slate-200 p-3" />
            <div className="flex justify-end">
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white">Save supplier</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
