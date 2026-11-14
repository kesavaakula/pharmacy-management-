import { useEffect, useState } from 'react';
import { ArrowDownToLine, CircleDollarSign, Download, FileText, PlusCircle, ReceiptText, Trash2, UserPlus, Users, WalletCards } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { apiFetch } from '../lib/api';

interface Invoice {
  id: number;
  customerId: number;
  invoiceDate: string;
  totalAmount: number;
  status: string;
}

interface DraftLine {
  medicineId: string;
  quantity: string;
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: number; fullName: string; phone: string; email: string; address: string }>>([]);
  const [medicines, setMedicines] = useState<Array<{ id: number; name: string; unitPrice: number; quantityInStock: number }>>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [form, setForm] = useState({ customerId: '1' });
  const [draftLine, setDraftLine] = useState({ medicineId: '1', quantity: '1' });
  const [selectedItems, setSelectedItems] = useState<DraftLine[]>([{ medicineId: '1', quantity: '2' }]);
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

  const summaryCards = [
    { label: 'Revenue', value: `£${totalRevenue.toFixed(2)}`, icon: CircleDollarSign, tone: 'emerald' },
    { label: 'Paid invoices', value: String(paidCount), icon: WalletCards, tone: 'sky' },
    { label: 'Open records', value: String(invoices.length), icon: FileText, tone: 'indigo' },
  ];

  const statusStyles: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
    PENDING: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
    OVERDUE: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
    DEFAULT: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  };

  const lineTotal = (item: DraftLine) => {
    const medicine = medicines.find((entry) => String(entry.id) === item.medicineId);
    const qty = Number(item.quantity || 0);
    if (!medicine) {
      return 0;
    }
    return Number(medicine.unitPrice) * qty;
  };

  const basketTotal = selectedItems.reduce((acc, item) => acc + lineTotal(item), 0);

  const addLineItem = () => {
    if (!draftLine.medicineId || Number(draftLine.quantity) <= 0) {
      return;
    }

    setSelectedItems((current) => [...current, { ...draftLine }]);
    setDraftLine({ medicineId: draftLine.medicineId, quantity: '1' });
  };

  const removeLineItem = (index: number) => {
    setSelectedItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (selectedItems.length === 0) {
      return;
    }

    const response = await apiFetch('/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        customerId: Number(form.customerId),
        items: selectedItems.map((item) => ({
          medicineId: Number(item.medicineId),
          quantity: Number(item.quantity),
        })),
      }),
    });

    if (response.ok) {
      setForm({ customerId: '1' });
      setSelectedItems([{ medicineId: '1', quantity: '2' }]);
      await loadData();
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    await apiFetch(`/api/customers/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    await loadData();
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

  const exportBillingCsv = () => {
    const rows = [
      ['Invoice ID', 'Customer ID', 'Date', 'Status', 'Amount'],
      ...invoices.map((invoice) => [String(invoice.id), String(invoice.customerId), invoice.invoiceDate, invoice.status, String(invoice.totalAmount)]),
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pharmacy-billing.csv';
    link.click();
    URL.revokeObjectURL(url);
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
      <header className="rounded-3xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 p-6 text-white shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
              <ReceiptText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-100">Billing center</p>
              <h2 className="mt-1 text-2xl font-bold">Pharmacy billing & invoice workflow</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm text-emerald-50 backdrop-blur-sm">
              <FileText className="h-4 w-4" />
              {invoices.length} active invoices
            </div>
            <button
              type="button"
              onClick={exportBillingCsv}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-800">{value}</h3>
              </div>
              <div className={`rounded-2xl p-3 ${tone === 'emerald' ? 'bg-emerald-100 text-emerald-700' : tone === 'sky' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
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
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${statusFilter === option ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-800">INV-{invoice.id}</p>
                    <p className="text-sm text-slate-500">Customer #{invoice.customerId}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[invoice.status.toUpperCase()] || statusStyles.DEFAULT}`}>
                    {invoice.status}
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-800">£{Number(invoice.totalAmount || 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">Invoice date: {invoice.invoiceDate}</p>
                <button
                  type="button"
                  onClick={() => handleExportInvoice(invoice)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                <PlusCircle className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Create invoice</h3>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              Total: £{basketTotal.toFixed(2)}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Customer</label>
              <select value={form.customerId} onChange={(e) => setForm((current) => ({ ...current, customerId: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white">
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.fullName}</option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-semibold text-slate-700">Invoice items</h4>
                <span className="text-sm text-slate-500">{selectedItems.length} line items</span>
              </div>

              <div className="space-y-3">
                {selectedItems.map((item, index) => (
                  <div key={`${item.medicineId}-${index}`} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1.2fr_0.7fr_auto] md:items-end">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Medicine</label>
                      <select
                        value={item.medicineId}
                        onChange={(e) => {
                          const updated = [...selectedItems];
                          updated[index] = { ...updated[index], medicineId: e.target.value };
                          setSelectedItems(updated);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                      >
                        {medicines.map((entry) => (
                          <option key={entry.id} value={entry.id}>{entry.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...selectedItems];
                          updated[index] = { ...updated[index], quantity: e.target.value };
                          setSelectedItems(updated);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <span className="text-sm font-semibold text-slate-700">£{lineTotal(item).toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                        aria-label="Remove line item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.7fr_auto]">
                <select
                  value={draftLine.medicineId}
                  onChange={(e) => setDraftLine((current) => ({ ...current, medicineId: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 outline-none transition focus:border-sky-400"
                >
                  {medicines.map((medicine) => (
                    <option key={medicine.id} value={medicine.id}>{medicine.name}</option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={draftLine.quantity}
                  onChange={(e) => setDraftLine((current) => ({ ...current, quantity: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 outline-none transition focus:border-sky-400"
                />

                <button
                  type="button"
                  onClick={addLineItem}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add item
                </button>
              </div>
            </div>

            <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <span>Basket subtotal</span>
              <span className="font-semibold text-slate-800">£{basketTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-sky-700">
                <PlusCircle className="h-4 w-4" />
                Generate invoice
              </button>
            </div>
          </form>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">Add customer</h3>
          </div>

          <div className="mb-5 space-y-2">
            {customers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="font-medium text-slate-800">{customer.fullName}</p>
                  <p className="text-xs text-slate-500">{customer.phone}</p>
                </div>
                <button type="button" onClick={() => handleDeleteCustomer(customer.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleCustomerSubmit} className="grid gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Customer name</label>
              <input value={customerForm.fullName} onChange={(e) => setCustomerForm((current) => ({ ...current, fullName: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Phone</label>
                <input value={customerForm.phone} onChange={(e) => setCustomerForm((current) => ({ ...current, phone: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Email</label>
                <input type="email" value={customerForm.email} onChange={(e) => setCustomerForm((current) => ({ ...current, email: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Address</label>
              <textarea value={customerForm.address} onChange={(e) => setCustomerForm((current) => ({ ...current, address: e.target.value }))} className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white" />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700">
                <Users className="h-4 w-4" />
                Save customer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
