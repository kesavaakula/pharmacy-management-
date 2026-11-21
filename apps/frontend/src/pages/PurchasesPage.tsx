import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Download, Pencil, Plus, Trash2, Truck, X, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, money } from '../lib/format';
import { notifyChange, useLive } from '../hooks/useLive';
import type { Medicine } from '../components/SummaryContext';
import { useToast } from '../components/Toast';
import { ConfirmModal, EmptyState, Field, Modal, PageHeader, SearchInput, Skeleton, StatCard, StatusBadge, Tabs } from '../components/ui';

interface PurchaseOrder {
  id: number;
  supplierId: number;
  orderDate: string;
  receivedDate?: string | null;
  totalAmount: number;
  status: string;
}

interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
}

interface OrderDetail {
  order: PurchaseOrder;
  supplier: Supplier | null;
  lines: Array<{ medicineId: number; name: string; quantity: number; unitPrice: number; totalAmount: number }>;
}

interface DraftLine {
  key: number;
  medicineId: string;
  quantity: string;
  unitPrice: string;
}

const emptySupplier = { name: '', contactPerson: '', phone: '', email: '', address: '' };
let lineKey = 1;

export default function PurchasesPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const ordersLive = useLive<PurchaseOrder[]>('/api/purchases', 6000);
  const suppliersLive = useLive<Supplier[]>('/api/suppliers', 15000);
  const medicinesLive = useLive<Medicine[]>('/api/inventory', 10000);
  const orders = ordersLive.data ?? [];
  const suppliers = suppliersLive.data ?? [];
  const medicines = medicinesLive.data ?? [];

  const [tab, setTab] = useState('orders');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // new order
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderSupplier, setOrderSupplier] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [saving, setSaving] = useState(false);

  // detail / actions
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<PurchaseOrder | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrder | null>(null);
  const [busy, setBusy] = useState(false);

  // suppliers
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);

  const medicineById = useMemo(() => new Map(medicines.map((medicine) => [medicine.id, medicine])), [medicines]);
  const supplierName = (id: number) => suppliers.find((supplier) => supplier.id === id)?.name ?? `Supplier #${id}`;

  const draftTotal = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0);

  const startOrder = (medicineId?: number) => {
    const medicine = medicineId !== undefined ? medicineById.get(medicineId) : undefined;
    setOrderSupplier(suppliers.length ? String(suppliers[0].id) : '');
    setLines([
      {
        key: lineKey++,
        medicineId: medicine ? String(medicine.id) : '',
        quantity: medicine ? String(Math.max(20, medicine.reorderLevel * 3 - medicine.quantityInStock)) : '20',
        unitPrice: medicine ? String(medicine.unitCost) : '',
      },
    ]);
    setOrderOpen(true);
  };

  // The dashboard's "Reorder" button links here with ?new=1&medicine=ID.
  useEffect(() => {
    if (params.get('new') !== '1' || suppliers.length === 0 || medicines.length === 0) return;
    const medicineParam = params.get('medicine');
    startOrder(medicineParam ? Number(medicineParam) : undefined);
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, suppliers.length, medicines.length]);

  const updateLine = (key: number, patch: Partial<DraftLine>) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const pickMedicine = (key: number, medicineId: string) => {
    const medicine = medicineById.get(Number(medicineId));
    updateLine(key, { medicineId, unitPrice: medicine ? String(medicine.unitCost) : '' });
  };

  const submitOrder = async (event: FormEvent) => {
    event.preventDefault();
    const valid = lines.filter((line) => line.medicineId && Number(line.quantity) > 0);
    if (!orderSupplier || valid.length === 0) {
      toast.warning('Add at least one medicine', 'Choose a supplier, a medicine and a quantity.');
      return;
    }
    setSaving(true);
    try {
      const created = await api<PurchaseOrder>('/api/purchases', {
        method: 'POST',
        body: {
          supplierId: Number(orderSupplier),
          items: valid.map((line) => ({ medicineId: Number(line.medicineId), quantity: Number(line.quantity), unitPrice: Number(line.unitPrice) })),
        },
      });
      toast.success(`Purchase order PO-${created.id} placed`, `${money(created.totalAmount)} · stock is added when you mark it received.`);
      setOrderOpen(false);
      notifyChange();
    } catch (err) {
      toast.error('Could not place order', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await api<OrderDetail>(`/api/purchases/${id}/detail`));
    } catch (err) {
      toast.error('Could not open order', err instanceof Error ? err.message : undefined);
    } finally {
      setDetailLoading(false);
    }
  };

  const receiveOrder = async () => {
    if (!receiveTarget) return;
    setBusy(true);
    try {
      await api(`/api/purchases/${receiveTarget.id}/receive`, { method: 'PUT' });
      toast.success(`PO-${receiveTarget.id} received`, 'Stock levels and cost prices were updated.');
      setReceiveTarget(null);
      setDetail(null);
      notifyChange();
    } catch (err) {
      toast.error('Could not receive order', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async () => {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      await api(`/api/purchases/${cancelTarget.id}/cancel`, { method: 'PUT' });
      toast.success(`PO-${cancelTarget.id} cancelled`);
      setCancelTarget(null);
      setDetail(null);
      notifyChange();
    } catch (err) {
      toast.error('Could not cancel order', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const openSupplierForm = (supplier?: Supplier) => {
    setEditingSupplierId(supplier?.id ?? null);
    setSupplierForm(
      supplier
        ? { name: supplier.name, contactPerson: supplier.contactPerson ?? '', phone: supplier.phone, email: supplier.email ?? '', address: supplier.address ?? '' }
        : emptySupplier,
    );
    setSupplierFormOpen(true);
  };

  const saveSupplier = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api(editingSupplierId ? `/api/suppliers/${editingSupplierId}` : '/api/suppliers', { method: editingSupplierId ? 'PUT' : 'POST', body: supplierForm });
      toast.success(editingSupplierId ? 'Supplier updated' : 'Supplier added', supplierForm.name);
      setSupplierFormOpen(false);
      notifyChange();
    } catch (err) {
      toast.error('Could not save supplier', err instanceof Error ? err.message : undefined);
    }
  };

  const removeSupplier = async () => {
    if (!deleteSupplier) return;
    try {
      await api(`/api/suppliers/${deleteSupplier.id}`, { method: 'DELETE' });
      toast.success('Supplier deleted', deleteSupplier.name);
    } catch (err) {
      toast.error('Could not delete supplier', err instanceof Error ? err.message : undefined);
    }
    setDeleteSupplier(null);
    notifyChange();
  };

  const openCount = orders.filter((order) => order.status.toUpperCase() === 'ORDERED').length;
  const openValue = orders.filter((order) => order.status.toUpperCase() === 'ORDERED').reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const receivedValue = orders.filter((order) => order.status.toUpperCase() === 'RECEIVED').reduce((sum, order) => sum + Number(order.totalAmount), 0);

  const filteredOrders = orders.filter((order) => statusFilter === 'ALL' || order.status.toUpperCase() === statusFilter);
  const filteredSuppliers = suppliers.filter((supplier) => {
    const term = supplierSearch.trim().toLowerCase();
    return !term || `${supplier.name} ${supplier.contactPerson ?? ''} ${supplier.email ?? ''} ${supplier.phone}`.toLowerCase().includes(term);
  });

  const exportCsv = () => {
    const rows = [['Order', 'Date', 'Supplier', 'Status', 'Total'], ...filteredOrders.map((order) => [`PO-${order.id}`, order.orderDate, supplierName(order.supplierId), order.status, String(order.totalAmount)])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'purchase-orders.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        subtitle="Order from suppliers, then mark deliveries as received to add the stock."
        actions={
          <>
            <Tabs active={tab} onChange={setTab} tabs={[{ id: 'orders', label: 'Orders', count: orders.length }, { id: 'suppliers', label: 'Suppliers', count: suppliers.length }]} />
            <button type="button" onClick={() => startOrder()} className="btn-primary">
              <Plus className="h-4 w-4" />
              New order
            </button>
          </>
        }
      />

      {tab === 'orders' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Awaiting delivery" value={openCount} hint={`${money(openValue)} on order`} icon={Truck} tone={openCount ? 'sky' : 'emerald'} />
            <StatCard label="Received (all time)" value={money(receivedValue)} icon={CheckCircle2} tone="emerald" />
            <StatCard label="Total orders" value={orders.length} icon={ClipboardList} tone="violet" />
          </div>

          <div className="card">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
              {['ALL', 'ORDERED', 'RECEIVED', 'CANCELLED'].map((status) => (
                <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`chip ${statusFilter === status ? 'chip-active' : ''}`}>
                  {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
              <button type="button" onClick={exportCsv} className="btn-secondary ml-auto">
                <Download className="h-4 w-4" />
                CSV
              </button>
            </div>

            {ordersLive.loading && !ordersLive.data ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} className="h-12" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No purchase orders" text="Create an order to restock low-inventory medicines." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="th">Order</th>
                      <th className="th">Date</th>
                      <th className="th">Supplier</th>
                      <th className="th">Status</th>
                      <th className="th text-right">Total</th>
                      <th className="th text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const ordered = order.status.toUpperCase() === 'ORDERED';
                      return (
                        <tr key={order.id} className="row">
                          <td className="td font-semibold text-slate-900 dark:text-white">PO-{order.id}</td>
                          <td className="td text-slate-600 dark:text-slate-300">{formatDate(order.orderDate)}</td>
                          <td className="td">{supplierName(order.supplierId)}</td>
                          <td className="td">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="td text-right font-semibold tabular-nums">{money(order.totalAmount)}</td>
                          <td className="td">
                            <div className="flex justify-end gap-1.5">
                              <button type="button" onClick={() => openDetail(order.id)} className="btn-secondary btn-sm">
                                View
                              </button>
                              {ordered ? (
                                <>
                                  <button type="button" onClick={() => setReceiveTarget(order)} className="btn-primary btn-sm">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Receive
                                  </button>
                                  <button type="button" onClick={() => setCancelTarget(order)} className="btn-secondary btn-sm text-rose-600 dark:text-rose-400" title="Cancel order">
                                    <XCircle className="h-3.5 w-3.5" />
                                  </button>
                                </>
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
          </div>
        </>
      ) : (
        <div className="card">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="sm:w-80">
              <SearchInput value={supplierSearch} onChange={setSupplierSearch} placeholder="Search suppliers..." />
            </div>
            <button type="button" onClick={() => openSupplierForm()} className="btn-primary">
              <Plus className="h-4 w-4" />
              Add supplier
            </button>
          </div>
          {filteredSuppliers.length === 0 ? (
            <EmptyState icon={Truck} title="No suppliers found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="th">Supplier</th>
                    <th className="th">Contact</th>
                    <th className="th">Phone</th>
                    <th className="th">Email</th>
                    <th className="th">Address</th>
                    <th className="th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="row">
                      <td className="td font-semibold text-slate-900 dark:text-white">{supplier.name}</td>
                      <td className="td">{supplier.contactPerson ?? '-'}</td>
                      <td className="td">{supplier.phone}</td>
                      <td className="td text-slate-500">{supplier.email ?? '-'}</td>
                      <td className="td text-slate-500">{supplier.address ?? '-'}</td>
                      <td className="td">
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => openSupplierForm(supplier)} className="btn-secondary btn-sm" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setDeleteSupplier(supplier)} className="btn-secondary btn-sm text-rose-600 dark:text-rose-400" title="Delete">
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
      )}

      <Modal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        title="New purchase order"
        wide
        footer={
          <>
            <span className="mr-auto self-center text-sm font-semibold text-slate-700 dark:text-slate-200">Total {money(draftTotal)}</span>
            <button type="button" className="btn-secondary" onClick={() => setOrderOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="order-form" className="btn-primary" disabled={saving}>
              {saving ? 'Placing...' : 'Place order'}
            </button>
          </>
        }
      >
        <form id="order-form" onSubmit={submitOrder} className="space-y-4">
          <Field label="Supplier">
            <select className="input" value={orderSupplier} onChange={(event) => setOrderSupplier(event.target.value)} required>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="space-y-3">
            {lines.map((line) => {
              const medicine = medicineById.get(Number(line.medicineId));
              return (
                <div key={line.key} className="grid grid-cols-[1fr_88px_104px_32px] items-end gap-2">
                  <Field label="Medicine">
                    <select className="input" value={line.medicineId} onChange={(event) => pickMedicine(line.key, event.target.value)} required>
                      <option value="">Select...</option>
                      {medicines
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.quantityInStock} in stock)
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Qty">
                    <input type="number" min="1" className="input" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} required />
                  </Field>
                  <Field label="Unit cost">
                    <input type="number" min="0" step="0.01" className="input" value={line.unitPrice} onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })} required />
                  </Field>
                  <button type="button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="mb-2 text-slate-400 hover:text-rose-500 disabled:opacity-30" aria-label="Remove line">
                    <X className="h-5 w-5" />
                  </button>
                  {medicine ? <p className="col-span-4 -mt-1 text-xs text-slate-500">Reorder level {medicine.reorderLevel} · last cost {money(medicine.unitCost)}</p> : null}
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => setLines((current) => [...current, { key: lineKey++, medicineId: '', quantity: '20', unitPrice: '' }])} className="btn-secondary btn-sm">
            <Plus className="h-3.5 w-3.5" />
            Add another medicine
          </button>
        </form>
      </Modal>

      <Modal
        open={detailLoading || detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `Purchase order PO-${detail.order.id}` : 'Purchase order'}
        wide
        footer={
          detail && detail.order.status.toUpperCase() === 'ORDERED' ? (
            <>
              <button type="button" className="btn-secondary text-rose-600" onClick={() => setCancelTarget(detail.order)}>
                Cancel order
              </button>
              <button type="button" className="btn-primary" onClick={() => setReceiveTarget(detail.order)}>
                <CheckCircle2 className="h-4 w-4" />
                Mark received
              </button>
            </>
          ) : undefined
        }
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Supplier</p>
                <p className="font-semibold text-slate-900 dark:text-white">{detail.supplier?.name ?? 'Unknown supplier'}</p>
                <p className="text-sm text-slate-500">{detail.supplier?.phone}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={detail.order.status} />
                <p className="mt-1 text-sm text-slate-500">
                  Ordered {formatDate(detail.order.orderDate)}
                  {detail.order.receivedDate ? ` · received ${formatDate(detail.order.receivedDate)}` : ''}
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="min-w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="th">Medicine</th>
                    <th className="th text-right">Qty</th>
                    <th className="th text-right">Unit cost</th>
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
            <p className="text-right text-xl font-bold text-slate-900 dark:text-white">Total {money(detail.order.totalAmount)}</p>
          </div>
        ) : (
          <Skeleton className="h-40" />
        )}
      </Modal>

      <ConfirmModal
        open={receiveTarget !== null}
        onClose={() => setReceiveTarget(null)}
        onConfirm={receiveOrder}
        busy={busy}
        title="Mark order as received?"
        message={`PO-${receiveTarget?.id ?? ''} quantities will be added to your inventory and cost prices updated.`}
        confirmLabel="Receive stock"
      />

      <ConfirmModal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={cancelOrder}
        busy={busy}
        danger
        title="Cancel this order?"
        message={`PO-${cancelTarget?.id ?? ''} will be cancelled. No stock changes.`}
        confirmLabel="Cancel order"
      />

      <Modal
        open={supplierFormOpen}
        onClose={() => setSupplierFormOpen(false)}
        title={editingSupplierId ? 'Edit supplier' : 'Add supplier'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setSupplierFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="supplier-form" className="btn-primary">
              Save
            </button>
          </>
        }
      >
        <form id="supplier-form" onSubmit={saveSupplier} className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" className="sm:col-span-2">
            <input className="input" value={supplierForm.name} onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })} required autoFocus />
          </Field>
          <Field label="Contact person">
            <input className="input" value={supplierForm.contactPerson} onChange={(event) => setSupplierForm({ ...supplierForm, contactPerson: event.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="input" value={supplierForm.phone} onChange={(event) => setSupplierForm({ ...supplierForm, phone: event.target.value })} required />
          </Field>
          <Field label="Email">
            <input type="email" className="input" value={supplierForm.email} onChange={(event) => setSupplierForm({ ...supplierForm, email: event.target.value })} />
          </Field>
          <Field label="Address">
            <input className="input" value={supplierForm.address} onChange={(event) => setSupplierForm({ ...supplierForm, address: event.target.value })} />
          </Field>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteSupplier !== null}
        onClose={() => setDeleteSupplier(null)}
        onConfirm={removeSupplier}
        danger
        title="Delete supplier?"
        message={`${deleteSupplier?.name ?? 'This supplier'} will be removed. Suppliers with purchase orders cannot be deleted.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
