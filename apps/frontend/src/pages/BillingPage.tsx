import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { apiFetch } from '../lib/api';

interface Invoice {
  id: number;
  customerId: number;
  invoiceDate: string;
  totalAmount: number;
  status: string;
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: number; fullName: string; phone: string; email: string; address: string }>>([]);
  const [medicines, setMedicines] = useState<Array<{ id: number; name: string; unitPrice: number; quantityInStock: number }>>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [form, setForm] = useState({ customerId: '1', medicineId: '1', quantity: '2' });
  const [customerForm, setCustomerForm] = useState({ fullName: '', phone: '', email: '', address: '' });
  const token = localStorage.getItem('pharmacy_token');

  const loadData = async () => {
    try {
      const [invoicesRes, customersRes, medicinesRes] = await Promise.all([
        apiFetch('/api/sales', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        apiFetch('/api/customers', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        apiFetch('/api/inventory', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      ]);

      const invoicesData = await invoicesRes.json();
      const customersData = await customersRes.json();
      const medicinesData = await medicinesRes.json();

      setInvoices(invoicesData);
      setCustomers(customersData);
      setMedicines(medicinesData);
    } catch (error) {
      console.error('Failed to load billing records', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredInvoices = invoices.filter((invoice) => statusFilter === 'ALL' || invoice.status.toUpperCase() === statusFilter);
  const totalRevenue = invoices.reduce((acc, invoice) => acc + Number(invoice.totalAmount || 0), 0);
  const paidCount = invoices.filter((invoice) => invoice.status.toUpperCase() === 'PAID').length;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const response = await apiFetch('/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        customerId: Number(form.customerId),
        items: [{ medicineId: Number(form.medicineId), quantity: Number(form.quantity) }],
      }),
    });

    if (response.ok) {
      setForm({ customerId: '1', medicineId: '1', quantity: '2' });
      await loadData();
    }
  };

  const handleCustomerSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const response = await apiFetch('/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(customerForm),
    });

    if (response.ok) {
      setCustomerForm({ fullName: '', phone: '', email: '', address: '' });
      await loadData();
    }
  };

  const handleExportInvoice = async (invoice: Invoice) => {
    const response = await apiFetch(`/api/sales/${invoice.id}/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      return;
    }

    const text = await response.text();
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const lines = text.split('\n');
    let y = 60;

    doc.setFontSize(16);
    doc.text('PharmaFlow Invoice', 40, 40);
    doc.setFontSize(11);

    lines.forEach((line) => {
      if (y > 760) {
        doc.addPage();
        y = 60;
      }
      doc.text(line, 40, y);
      y += 18;
    });

    doc.save(`invoice-INV-${invoice.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Revenue</p>
          <h3 className="mt-2 text-3xl font-bold text-slate-800">£{totalRevenue.toFixed(2)}</h3>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Paid invoices</p>
          <h3 className="mt-2 text-3xl font-bold text-slate-800">{paidCount}</h3>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Open records</p>
          <h3 className="mt-2 text-3xl font-bold text-slate-800">{invoices.length}</h3>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Billing</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-800">Customer billing & invoices</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'PAID', 'PENDING', 'OVERDUE'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatusFilter(option)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusFilter === option ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold">INV-{invoice.id}</p>
                  <p className="text-sm text-slate-500">Customer #{invoice.customerId}</p>
                </div>
                <div className="text-right">
                  <p className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">{invoice.status}</p>
                  <p className="mt-2 text-xl font-bold">£{Number(invoice.totalAmount || 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">Invoice date: {invoice.invoiceDate}</p>
                <button
                  type="button"
                  onClick={() => handleExportInvoice(invoice)}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-xl font-semibold text-slate-800">Create invoice</h3>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <select value={form.customerId} onChange={(e) => setForm((current) => ({ ...current, customerId: e.target.value }))} className="rounded-xl border border-slate-200 p-3">
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.fullName}</option>
              ))}
            </select>

            <select value={form.medicineId} onChange={(e) => setForm((current) => ({ ...current, medicineId: e.target.value }))} className="rounded-xl border border-slate-200 p-3">
              {medicines.map((medicine) => (
                <option key={medicine.id} value={medicine.id}>{medicine.name}</option>
              ))}
            </select>

            <input type="number" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))} placeholder="Quantity" className="rounded-xl border border-slate-200 p-3" required />

            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="rounded-xl bg-sky-600 px-5 py-3 font-medium text-white">Generate invoice</button>
            </div>
          </form>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-xl font-semibold text-slate-800">Add customer</h3>
          <form onSubmit={handleCustomerSubmit} className="grid gap-4">
            <input value={customerForm.fullName} onChange={(e) => setCustomerForm((current) => ({ ...current, fullName: e.target.value }))} placeholder="Customer full name" className="rounded-xl border border-slate-200 p-3" required />
            <input value={customerForm.phone} onChange={(e) => setCustomerForm((current) => ({ ...current, phone: e.target.value }))} placeholder="Phone" className="rounded-xl border border-slate-200 p-3" required />
            <input type="email" value={customerForm.email} onChange={(e) => setCustomerForm((current) => ({ ...current, email: e.target.value }))} placeholder="Email address" className="rounded-xl border border-slate-200 p-3" />
            <textarea value={customerForm.address} onChange={(e) => setCustomerForm((current) => ({ ...current, address: e.target.value }))} placeholder="Address" className="min-h-[100px] rounded-xl border border-slate-200 p-3" />
            <div className="flex justify-end">
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white">Save customer</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
