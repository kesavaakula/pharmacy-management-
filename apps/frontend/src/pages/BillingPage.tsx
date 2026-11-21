import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { jsPDF } from 'jspdf';
import { Download, FileText, Minus, Pencil, Plus, Receipt, ShoppingCart, Trash2, UserPlus, Users, X } from 'lucide-react';
import { api } from '../lib/api';
import { CURRENCY_CODE, daysUntil, formatDate, money } from '../lib/format';
import { notifyChange, useLive } from '../hooks/useLive';
import type { Medicine } from '../components/SummaryContext';
import { useToast } from '../components/Toast';
import { Badge, ConfirmModal, EmptyState, Field, Modal, PageHeader, SearchInput, Skeleton, StatCard, StatusBadge, Tabs } from '../components/ui';

interface Invoice {
  id: number;
  customerId: number;
  invoiceDate: string;
  totalAmount: number;
  status: string;
  paymentMethod?: string | null;
}

interface Customer {
  id: number;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  creditLimit?: number;
}

interface InvoiceDetail {
  invoice: Invoice;
  customer: Customer | null;
  lines: Array<{ medicineId: number; name: string; sku: string; quantity: number; unitPrice: number; totalAmount: number }>;
}

interface CartLine {
  medicineId: number;
  quantity: number;
}

const emptyCustomer = { fullName: '', phone: '', email: '', address: '', creditLimit: '0' };
const STATUS_FILTERS = ['ALL', 'PAID', 'PENDING', 'OVERDUE', 'CANCELLED'];

function downloadInvoicePdf(detail: InvoiceDetail) {
  const { invoice, customer, lines } = detail;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 56;

  doc.setFontSize(22);
  doc.setTextColor(5, 150, 105);
  doc.text('PharmaFlow Pharmacy', 40, y);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Tax invoice', 40, y + 16);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice: INV-${invoice.id}`, 400, y);
  doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, 400, y + 16);
  doc.text(`Status: ${invoice.status}`, 400, y + 32);

  y += 70;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('BILL TO', 40, y);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(customer?.fullName ?? 'Walk-in customer', 40, y + 16);
  if (customer?.phone) doc.text(customer.phone, 40, y + 32);

  y += 70;
  doc.setFillColor(241, 245, 249);
  doc.rect(40, y - 14, 515, 24, 'F');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('ITEM', 48, y + 2);
  doc.text('QTY', 330, y + 2);
  doc.text(`PRICE (${CURRENCY_CODE})`, 380, y + 2);
  doc.text(`TOTAL (${CURRENCY_CODE})`, 475, y + 2);

  y += 26;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  lines.forEach((line) => {
    if (y > 760) {
      doc.addPage();
      y = 56;
    }
    doc.text(line.name.slice(0, 48), 48, y);
    doc.text(String(line.quantity), 330, y);
    doc.text(Number(line.unitPrice).toFixed(2), 380, y);
    doc.text(Number(line.totalAmount).toFixed(2), 475, y);
    y += 22;
  });

  y += 10;
  doc.setDrawColor(203, 213, 225);
  doc.line(330, y, 555, y);
  y += 24;
  doc.setFontSize(13);
  doc.text(`Total (${CURRENCY_CODE})`, 330, y);
  doc.text(Number(invoice.totalAmount).toFixed(2), 475, y);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for choosing PharmaFlow Pharmacy.', 40, 800);
  doc.save(`invoice-INV-${invoice.id}.pdf`);
}

export default function BillingPage() {
  const toast = useToast();
  const medicinesLive = useLive<Medicine[]>('/api/inventory', 6000);
  const invoicesLive = useLive<Invoice[]>('/api/sales', 6000);
  const customersLive = useLive<Customer[]>('/api/customers', 15000);
  const medicines = medicinesLive.data ?? [];
  const invoices = invoicesLive.data ?? [];
  const customers = customersLive.data ?? [];

  const [tab, setTab] = useState('sale');

  // --- point of sale ---
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [payStatus, setPayStatus] = useState<'PAID' | 'PENDING'>('PAID');
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [submitting, setSubmitting] = useState(false);

  // --- invoices ---
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Invoice | null>(null);

  // --- customers ---
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);

  // Pick a sensible default customer (the walk-in counter customer when it exists).
  useEffect(() => {
    if (customerId || customers.length === 0) return;
    const walkIn = customers.find((customer) => customer.fullName.toLowerCase().startsWith('walk-in'));
    setCustomerId(String((walkIn ?? customers[0]).id));
  }, [customers, customerId]);

  const customerName = (id: number) => customers.find((customer) => customer.id === id)?.fullName ?? `Customer #${id}`;
  const medicineById = useMemo(() => new Map(medicines.map((medicine) => [medicine.id, medicine])), [medicines]);

  const cartLines = cart
    .map((line) => ({ line, medicine: medicineById.get(line.medicineId) }))
    .filter((entry): entry is { line: CartLine; medicine: Medicine } => entry.medicine !== undefined);
  const cartTotal = cartLines.reduce((sum, { line, medicine }) => sum + line.quantity * Number(medicine.unitPrice), 0);
  const cartCount = cartLines.reduce((sum, { line }) => sum + line.quantity, 0);

  const sellable = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return medicines
      .filter((medicine) => !term || `${medicine.name} ${medicine.genericName ?? ''} ${medicine.brand ?? ''} ${medicine.sku}`.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [medicines, productSearch]);

  const addToCart = (medicine: Medicine) => {
    const existing = cart.find((line) => line.medicineId === medicine.id);
    const current = existing?.quantity ?? 0;
    if (current >= medicine.quantityInStock) {
      toast.warning('No more stock', `Only ${medicine.quantityInStock} of ${medicine.name} available.`);
      return;
    }
    setCart(existing ? cart.map((line) => (line.medicineId === medicine.id ? { ...line, quantity: line.quantity + 1 } : line)) : [...cart, { medicineId: medicine.id, quantity: 1 }]);
  };

  const changeQuantity = (medicine: Medicine, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((line) => line.medicineId !== medicine.id));
      return;
    }
    const clamped = Math.min(quantity, medicine.quantityInStock);
    setCart(cart.map((line) => (line.medicineId === medicine.id ? { ...line, quantity: clamped } : line)));
  };

  const completeSale = async () => {
    if (!customerId) {
      toast.warning('Select a customer first');
      return;
    }
    setSubmitting(true);
    try {
      const created = await api<Invoice>('/api/sales', {
        method: 'POST',
        body: {
          customerId: Number(customerId),
          items: cart.map((line) => ({ medicineId: line.medicineId, quantity: line.quantity })),
          status: payStatus,
          paymentMethod,
        },
      });
      toast.success(`Invoice INV-${created.id} created`, `${money(created.totalAmount)} · ${payStatus === 'PAID' ? 'paid' : 'payment pending'}`);
      setCart([]);
      notifyChange();
      openInvoice(created.id);
    } catch (err) {
      toast.error('Sale failed', err instanceof Error ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const openInvoice = async (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await api<InvoiceDetail>(`/api/sales/${id}/detail`));
    } catch (err) {
      toast.error('Could not open invoice', err instanceof Error ? err.message : undefined);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (invoice: Invoice, status: string) => {
    try {
      await api(`/api/sales/${invoice.id}/status`, { method: 'PUT', body: { status } });
      toast.success(status === 'CANCELLED' ? 'Invoice cancelled' : 'Invoice updated', status === 'CANCELLED' ? 'Stock has been returned to inventory.' : `INV-${invoice.id} is now ${status.toLowerCase()}.`);
      setCancelTarget(null);
      notifyChange();
      if (detail && detail.invoice.id === invoice.id) {
        openInvoice(invoice.id);
      }
    } catch (err) {
      toast.error('Could not update invoice', err instanceof Error ? err.message : undefined);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (statusFilter !== 'ALL' && invoice.status.toUpperCase() !== statusFilter) return false;
    const term = invoiceSearch.trim().toLowerCase();
    if (!term) return true;
    return `inv-${invoice.id} ${customerName(invoice.customerId)}`.toLowerCase().includes(term);
  });

  const countFor = (status: string) => (status === 'ALL' ? invoices.length : invoices.filter((invoice) => invoice.status.toUpperCase() === status).length);
  const outstanding = invoices.filter((invoice) => ['PENDING', 'OVERDUE'].includes(invoice.status.toUpperCase())).reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
  const paidTotal = invoices.filter((invoice) => invoice.status.toUpperCase() === 'PAID').reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);

  const exportInvoicesCsv = () => {
    const rows = [
      ['Invoice', 'Date', 'Customer', 'Status', 'Payment', 'Total'],
      ...filteredInvoices.map((invoice) => [`INV-${invoice.id}`, invoice.invoiceDate, customerName(invoice.customerId), invoice.status, invoice.paymentMethod ?? '', String(invoice.totalAmount)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'invoices.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const openCustomerForm = (customer?: Customer) => {
    setEditingCustomerId(customer?.id ?? null);
    setCustomerForm(
      customer
        ? { fullName: customer.fullName, phone: customer.phone, email: customer.email ?? '', address: customer.address ?? '', creditLimit: String(customer.creditLimit ?? 0) }
        : emptyCustomer,
    );
    setCustomerFormOpen(true);
  };

  const saveCustomer = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api(editingCustomerId ? `/api/customers/${editingCustomerId}` : '/api/customers', {
        method: editingCustomerId ? 'PUT' : 'POST',
        body: {
          fullName: customerForm.fullName.trim(),
          phone: customerForm.phone.trim(),
          email: customerForm.email.trim() || null,
          address: customerForm.address.trim(),
          creditLimit: Number(customerForm.creditLimit),
        },
      });
      toast.success(editingCustomerId ? 'Customer updated' : 'Customer added', customerForm.fullName);
      setCustomerFormOpen(false);
      notifyChange();
    } catch (err) {
      toast.error('Could not save customer', err instanceof Error ? err.message : undefined);
    }
  };

  const removeCustomer = async () => {
    if (!deleteCustomer) return;
    try {
      await api(`/api/customers/${deleteCustomer.id}`, { method: 'DELETE' });
      toast.success('Customer deleted', deleteCustomer.fullName);
      setDeleteCustomer(null);
      notifyChange();
    } catch (err) {
      toast.error('Could not delete customer', err instanceof Error ? err.message : undefined);
      setDeleteCustomer(null);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const term = customerSearch.trim().toLowerCase();
    return !term || `${customer.fullName} ${customer.phone} ${customer.email ?? ''} ${customer.address ?? ''}`.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        subtitle="Ring up sales, track payments and manage customers. Stock updates the moment a sale is completed."
        actions={<Tabs active={tab} onChange={setTab} tabs={[{ id: 'sale', label: 'New sale' }, { id: 'invoices', label: 'Invoices', count: invoices.length }, { id: 'customers', label: 'Customers', count: customers.length }]} />}
      />

      {tab === 'sale' ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="card p-4">
            <SearchInput value={productSearch} onChange={setProductSearch} placeholder="Search medicine, brand or SKU..." />
            {medicinesLive.loading && !medicinesLive.data ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <Skeleton key={index} className="h-24" />
                ))}
              </div>
            ) : sellable.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="No medicines found" text="Try another search." />
            ) : (
              <div className="mt-4 grid max-h-[620px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {sellable.map((medicine) => {
                  const expired = (daysUntil(medicine.expiryDate) ?? 1) < 0;
                  const out = medicine.quantityInStock === 0;
                  const inCart = cart.find((line) => line.medicineId === medicine.id)?.quantity ?? 0;
                  return (
                    <button
                      key={medicine.id}
                      type="button"
                      disabled={out || expired}
                      onClick={() => addToCart(medicine)}
                      className={`relative rounded-xl border p-3 text-left transition ${
                        out || expired
                          ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900'
                          : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-emerald-500'
                      }`}
                    >
                      {inCart > 0 ? <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">{inCart}</span> : null}
                      <p className="truncate pr-8 text-sm font-semibold text-slate-900 dark:text-white">{medicine.name}</p>
                      <p className="truncate text-xs text-slate-500">{medicine.brand || medicine.category}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{money(medicine.unitPrice)}</span>
                        {expired ? <Badge tone="rose">Expired</Badge> : out ? <Badge tone="rose">Out of stock</Badge> : <Badge tone={medicine.quantityInStock <= medicine.reorderLevel ? 'amber' : 'slate'}>{medicine.quantityInStock} left</Badge>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card h-fit p-4 lg:sticky lg:top-20">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <ShoppingCart className="h-4 w-4 text-emerald-500" />
                Current sale
              </h2>
              {cart.length > 0 ? (
                <button type="button" onClick={() => setCart([])} className="text-xs font-semibold text-rose-600 hover:underline">
                  Clear
                </button>
              ) : null}
            </div>

            <Field label="Customer">
              <select className="input" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName}
                  </option>
                ))}
              </select>
            </Field>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {cartLines.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Tap a medicine to add it to the sale.</p>
              ) : (
                cartLines.map(({ line, medicine }) => (
                  <div key={medicine.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{medicine.name}</p>
                      <p className="text-xs text-slate-500">{money(medicine.unitPrice)} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => changeQuantity(medicine, line.quantity - 1)} className="rounded-lg border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Decrease">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(event) => changeQuantity(medicine, Number(event.target.value))}
                        className="w-12 rounded-lg border border-slate-200 bg-transparent py-1 text-center text-sm dark:border-slate-700"
                      />
                      <button type="button" onClick={() => changeQuantity(medicine, line.quantity + 1)} className="rounded-lg border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Increase">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="w-16 text-right text-sm font-semibold tabular-nums">{money(line.quantity * Number(medicine.unitPrice))}</p>
                    <button type="button" onClick={() => changeQuantity(medicine, 0)} className="text-slate-400 hover:text-rose-500" aria-label="Remove">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <Field label="Payment">
                <select className="input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  <option value="CARD">Card</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                </select>
              </Field>
              <Field label="Status">
                <select className="input" value={payStatus} onChange={(event) => setPayStatus(event.target.value as 'PAID' | 'PENDING')}>
                  <option value="PAID">Paid now</option>
                  <option value="PENDING">Pay later</option>
                </select>
              </Field>
            </div>

            <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-500">{cartCount} item{cartCount === 1 ? '' : 's'}</p>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Total</p>
              </div>
              <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{money(cartTotal)}</p>
            </div>
            <button type="button" onClick={completeSale} disabled={cartLines.length === 0 || submitting} className="btn-primary mt-4 w-full py-3">
              <Receipt className="h-4 w-4" />
              {submitting ? 'Processing...' : 'Complete sale'}
            </button>
          </div>
        </div>
      ) : null}

      {tab === 'invoices' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Invoices" value={invoices.length} icon={FileText} tone="sky" />
            <StatCard label="Collected" value={money(paidTotal)} icon={Receipt} tone="emerald" />
            <StatCard label="Outstanding" value={money(outstanding)} hint="Pending and overdue" icon={Receipt} tone={outstanding > 0 ? 'amber' : 'emerald'} />
          </div>

          <div className="card">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center">
              <div className="lg:w-72">
                <SearchInput value={invoiceSearch} onChange={setInvoiceSearch} placeholder="Search invoice or customer..." />
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((status) => (
                  <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`chip ${statusFilter === status ? 'chip-active' : ''}`}>
                    {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()} · {countFor(status)}
                  </button>
                ))}
              </div>
              <button type="button" onClick={exportInvoicesCsv} className="btn-secondary lg:ml-auto">
                <Download className="h-4 w-4" />
                CSV
              </button>
            </div>

            {invoicesLive.loading && !invoicesLive.data ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2, 3].map((index) => (
                  <Skeleton key={index} className="h-12" />
                ))}
              </div>
            ) : filteredInvoices.length === 0 ? (
              <EmptyState icon={Receipt} title="No invoices found" text="Complete a sale to create your first invoice." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="th">Invoice</th>
                      <th className="th">Date</th>
                      <th className="th">Customer</th>
                      <th className="th">Payment</th>
                      <th className="th">Status</th>
                      <th className="th text-right">Total</th>
                      <th className="th text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.slice(0, 100).map((invoice) => {
                      const status = invoice.status.toUpperCase();
                      return (
                        <tr key={invoice.id} className="row">
                          <td className="td font-semibold text-slate-900 dark:text-white">INV-{invoice.id}</td>
                          <td className="td text-slate-600 dark:text-slate-300">{formatDate(invoice.invoiceDate)}</td>
                          <td className="td">{customerName(invoice.customerId)}</td>
                          <td className="td text-slate-500">{invoice.paymentMethod ?? '-'}</td>
                          <td className="td">
                            <StatusBadge status={invoice.status} />
                          </td>
                          <td className="td text-right font-semibold tabular-nums">{money(invoice.totalAmount)}</td>
                          <td className="td">
                            <div className="flex justify-end gap-1.5">
                              <button type="button" onClick={() => openInvoice(invoice.id)} className="btn-secondary btn-sm">
                                View
                              </button>
                              {status === 'PENDING' || status === 'OVERDUE' ? (
                                <button type="button" onClick={() => updateStatus(invoice, 'PAID')} className="btn-primary btn-sm">
                                  Mark paid
                                </button>
                              ) : null}
                              {status !== 'CANCELLED' ? (
                                <button type="button" onClick={() => setCancelTarget(invoice)} className="btn-secondary btn-sm text-rose-600 dark:text-rose-400">
                                  Cancel
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {filteredInvoices.length > 100 ? <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">Showing the latest 100 of {filteredInvoices.length} invoices. Use search or export for the rest.</p> : null}
          </div>
        </>
      ) : null}

      {tab === 'customers' ? (
        <div className="card">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="sm:w-80">
              <SearchInput value={customerSearch} onChange={setCustomerSearch} placeholder="Search customers..." />
            </div>
            <button type="button" onClick={() => openCustomerForm()} className="btn-primary">
              <UserPlus className="h-4 w-4" />
              Add customer
            </button>
          </div>
          {filteredCustomers.length === 0 ? (
            <EmptyState icon={Users} title="No customers found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="th">Customer</th>
                    <th className="th">Phone</th>
                    <th className="th">Email</th>
                    <th className="th">Address</th>
                    <th className="th text-right">Credit limit</th>
                    <th className="th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="row">
                      <td className="td font-semibold text-slate-900 dark:text-white">{customer.fullName}</td>
                      <td className="td">{customer.phone}</td>
                      <td className="td text-slate-500">{customer.email ?? '-'}</td>
                      <td className="td text-slate-500">{customer.address ?? '-'}</td>
                      <td className="td text-right tabular-nums">{money(customer.creditLimit ?? 0)}</td>
                      <td className="td">
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => openCustomerForm(customer)} className="btn-secondary btn-sm" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setDeleteCustomer(customer)} className="btn-secondary btn-sm text-rose-600 dark:text-rose-400" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      <Modal
        open={detailLoading || detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `Invoice INV-${detail.invoice.id}` : 'Invoice'}
        wide
        footer={
          detail ? (
            <>
              {['PENDING', 'OVERDUE'].includes(detail.invoice.status.toUpperCase()) ? (
                <button type="button" className="btn-secondary" onClick={() => updateStatus(detail.invoice, 'PAID')}>
                  Mark paid
                </button>
              ) : null}
              <button type="button" className="btn-primary" onClick={() => downloadInvoicePdf(detail)}>
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </>
          ) : undefined
        }
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Bill to</p>
                <p className="font-semibold text-slate-900 dark:text-white">{detail.customer?.fullName ?? 'Walk-in customer'}</p>
                <p className="text-sm text-slate-500">{detail.customer?.phone}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={detail.invoice.status} />
                <p className="mt-1 text-sm text-slate-500">{formatDate(detail.invoice.invoiceDate)}{detail.invoice.paymentMethod ? ` · ${detail.invoice.paymentMethod}` : ''}</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="min-w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="th">Item</th>
                    <th className="th text-right">Qty</th>
                    <th className="th text-right">Price</th>
                    <th className="th text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.map((line) => (
                    <tr key={line.medicineId} className="row">
                      <td className="td">{line.name}</td>
                      <td className="td text-right tabular-nums">{line.quantity}</td>
                      <td className="td text-right tabular-nums">{money(line.unitPrice)}</td>
                      <td className="td text-right font-medium tabular-nums">{money(line.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <p className="text-xl font-bold text-slate-900 dark:text-white">Total {money(detail.invoice.totalAmount)}</p>
            </div>
          </div>
        ) : (
          <Skeleton className="h-40" />
        )}
      </Modal>

      <ConfirmModal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && updateStatus(cancelTarget, 'CANCELLED')}
        danger
        title="Cancel this invoice?"
        message={`INV-${cancelTarget?.id ?? ''} will be cancelled and its medicines returned to stock. This cannot be undone.`}
        confirmLabel="Cancel invoice"
      />

      <Modal
        open={customerFormOpen}
        onClose={() => setCustomerFormOpen(false)}
        title={editingCustomerId ? 'Edit customer' : 'Add customer'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setCustomerFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="customer-form" className="btn-primary">
              Save
            </button>
          </>
        }
      >
        <form id="customer-form" onSubmit={saveCustomer} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" className="sm:col-span-2">
            <input className="input" value={customerForm.fullName} onChange={(event) => setCustomerForm({ ...customerForm, fullName: event.target.value })} required autoFocus />
          </Field>
          <Field label="Phone">
            <input className="input" value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} required />
          </Field>
          <Field label="Email">
            <input type="email" className="input" value={customerForm.email} onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })} />
          </Field>
          <Field label="Address">
            <input className="input" value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} />
          </Field>
          <Field label="Credit limit">
            <input type="number" min="0" className="input" value={customerForm.creditLimit} onChange={(event) => setCustomerForm({ ...customerForm, creditLimit: event.target.value })} />
          </Field>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteCustomer !== null}
        onClose={() => setDeleteCustomer(null)}
        onConfirm={removeCustomer}
        danger
        title="Delete customer?"
        message={`${deleteCustomer?.fullName ?? 'This customer'} will be removed. Customers with invoices cannot be deleted.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
