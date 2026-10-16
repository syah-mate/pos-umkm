'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import PaymentModal from '@/components/PaymentModal';
import ExpenseModal, { DeliveryExpense } from '@/components/ExpenseModal';
import DeliveryFormModal, { QueueTransaction } from '@/components/DeliveryFormModal';
import {
  DELIVERY_PLAN_STATUS_BADGES,
  DELIVERY_PLAN_STATUS_LABELS,
  Load,
  PAYMENT_STATUS_BADGES,
  PAYMENT_STATUS_LABELS,
  SIZE_LABELS,
  SIZE_TYPES,
  formatCurrency,
  getAmountPaid,
  getRemaining,
} from '@/lib/distribution';

interface DeliveryTransaction extends QueueTransaction {
  customerPhone?: string;
  payments?: { amount: number; method: string; date: string; notes?: string; delivery?: string }[];
  items: { productName: string; quantity: number; sizeType?: string; unit?: string; sku?: string }[];
}

interface Delivery {
  _id: string;
  deliveryNumber: string;
  name: string;
  date: string;
  vehicle: { _id: string; name: string; plateNumber?: string; capacity: Load };
  vehicleName: string;
  plateNumber?: string;
  driverName: string;
  status: string;
  notes?: string;
  transactions: DeliveryTransaction[];
  expenses: DeliveryExpense[];
  departedAt?: string;
  completedAt?: string;
  summary: {
    transactionCount: number;
    totalValue: number;
    totalPaid: number;
    totalRemaining: number;
    totalExpenses: number;
    collected: number;
    netDeposit: number;
    counts: { paid: number; partial: number; unpaid: number };
    load: Load;
  };
}

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<DeliveryTransaction | null>(null);
  const [showExpenses, setShowExpenses] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadDelivery();
  }, [id]);

  const loadDelivery = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/deliveries/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setDelivery(data.delivery);
      }
    } catch (error) {
      console.error('Error loading delivery:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (status: string, confirmText: string) => {
    if (!confirm(confirmText)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/deliveries/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (response.ok) loadDelivery();
      else alert(result.error || 'Gagal mengubah status!');
    } catch (error) {
      console.error('Error changing status:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const cancelDelivery = async () => {
    if (!confirm('Batalkan plan pengiriman ini? Transaksi akan dikembalikan ke antrian kirim.')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/deliveries/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok) router.push('/dashboard/deliveries');
      else alert(result.error || 'Gagal membatalkan!');
    } catch (error) {
      console.error('Error cancelling delivery:', error);
      alert('Terjadi kesalahan!');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  if (!delivery) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Pengiriman tidak ditemukan</p>
        <Link href="/dashboard/deliveries" className="text-amber-700 hover:underline">
          ← Kembali
        </Link>
      </div>
    );
  }

  const { summary } = delivery;
  const isActive = delivery.status !== 'cancelled';
  const capacity = delivery.vehicle?.capacity;

  return (
    <div>
      <Link href="/dashboard/deliveries" className="text-sm text-amber-700 hover:underline">
        ← Plan Pengiriman
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6 mt-2 mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">{delivery.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${DELIVERY_PLAN_STATUS_BADGES[delivery.status]}`}>
                {DELIVERY_PLAN_STATUS_LABELS[delivery.status]}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-mono">{delivery.deliveryNumber}</span> ·{' '}
              {new Date(delivery.date).toLocaleDateString('id-ID', { dateStyle: 'full' })}
            </p>
            <p className="text-sm text-gray-800 mt-1">
              🚚 {delivery.vehicleName} {delivery.plateNumber ? `(${delivery.plateNumber})` : ''} · 👤 {delivery.driverName}
            </p>
            {delivery.notes && <p className="text-sm text-gray-600 mt-1">📝 {delivery.notes}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {delivery.status === 'planned' && (
              <>
                <button
                  onClick={() => setShowEdit(true)}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 text-sm font-medium"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => changeStatus('on_delivery', 'Tandai pengiriman berangkat?')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  🚚 Berangkat
                </button>
              </>
            )}
            {(delivery.status === 'planned' || delivery.status === 'on_delivery') && (
              <button
                onClick={() => changeStatus('completed', 'Tandai pengiriman selesai? Semua transaksi akan berstatus terkirim.')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                ✅ Selesai
              </button>
            )}
            {isActive && (
              <>
                <button
                  onClick={() => setShowExpenses(true)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium"
                >
                  ⛽ Klaim Pengeluaran
                </button>
                <button
                  onClick={() => window.open(`/print/surat-jalan/${delivery._id}`, '_blank')}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
                >
                  🖨️ Cetak Surat Jalan
                </button>
              </>
            )}
            {delivery.status === 'planned' && (
              <button
                onClick={cancelDelivery}
                className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm font-medium"
              >
                Batalkan
              </button>
            )}
          </div>
        </div>

        {/* Load vs capacity */}
        <div className="grid grid-cols-3 gap-4 mt-5">
          {SIZE_TYPES.map((size) => {
            const cap = capacity?.[size] || 0;
            const used = summary.load[size];
            const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : used > 0 ? 100 : 0;
            return (
              <div key={size} className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700">Muatan {SIZE_LABELS[size]}</span>
                  <span className={used > cap ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                    {used} / {cap}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${used > cap ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-xs text-gray-600">Nilai Barang</p>
          <p className="text-lg font-bold text-gray-800">{formatCurrency(summary.totalValue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-xs text-gray-600">Sisa Tagihan</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalRemaining)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-xs text-gray-600">Ditagih di Pengiriman Ini</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(summary.collected)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-xs text-gray-600">Pengeluaran</p>
          <p className="text-lg font-bold text-orange-600">{formatCurrency(summary.totalExpenses)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-xs text-gray-600">Setoran Driver (tagihan − pengeluaran)</p>
          <p className={`text-lg font-bold ${summary.netDeposit < 0 ? 'text-red-600' : 'text-gray-800'}`}>
            {formatCurrency(summary.netDeposit)}
          </p>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Transaksi ({summary.transactionCount})</h2>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-green-100 text-green-700">{summary.counts.paid} lunas</span>
            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">{summary.counts.partial} bayar sebagian</span>
            <span className="px-2 py-1 rounded bg-red-100 text-red-700">{summary.counts.unpaid} hutang</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice / Pelanggan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barang</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Terbayar</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sisa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {delivery.transactions.map((t, idx) => {
                const remaining = getRemaining(t);
                const status = remaining <= 0 ? 'paid' : getAmountPaid(t) > 0 ? 'partial' : 'unpaid';
                const totalQty = t.items.reduce((s, i) => s + i.quantity, 0);
                const address = t.customerAddress || (typeof t.customer === 'object' ? t.customer?.address : undefined);
                return (
                  <tr key={t._id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-mono font-semibold text-gray-900">{t.invoiceNumber}</div>
                      <div className="font-medium text-gray-900">{t.customerName || 'Pelanggan Umum'}</div>
                      {address && <div className="text-xs text-gray-500">📍 {address}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => setExpanded(expanded === t._id ? null : t._id)}
                        className="text-blue-700 hover:underline"
                      >
                        {t.items.length} produk · {totalQty} qty {expanded === t._id ? '▲' : '▼'}
                      </button>
                      {expanded === t._id && (
                        <ul className="mt-1 text-xs text-gray-700 space-y-0.5">
                          {t.items.map((item, i) => (
                            <li key={i}>
                              {item.productName} × {item.quantity} {item.unit || ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(t.total)}</td>
                    <td className="px-4 py-3 text-right text-sm text-green-700">{formatCurrency(getAmountPaid(t))}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">{formatCurrency(remaining)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${PAYMENT_STATUS_BADGES[status]}`}>
                        {PAYMENT_STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {remaining > 0 && isActive && (
                        <button
                          onClick={() => setPaying(t)}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium whitespace-nowrap"
                        >
                          Pelunasan
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Pengeluaran Pengiriman</h2>
          {isActive && (
            <button
              onClick={() => setShowExpenses(true)}
              className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium"
            >
              + Klaim
            </button>
          )}
        </div>
        {delivery.expenses.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-500 text-center">Belum ada pengeluaran</p>
        ) : (
          <div className="divide-y">
            {delivery.expenses.map((e) => (
              <div key={e._id} className="px-6 py-3 flex justify-between text-sm">
                <div>
                  <span className="font-medium capitalize">{e.category}</span>
                  <span className="text-gray-500">
                    {' '}
                    · {new Date(e.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                    {e.description ? ` · ${e.description}` : ''}
                  </span>
                </div>
                <span className="font-semibold">{formatCurrency(e.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {paying && (
        <PaymentModal
          transaction={paying}
          deliveryId={delivery._id}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            loadDelivery();
          }}
        />
      )}

      {showExpenses && (
        <ExpenseModal
          deliveryId={delivery._id}
          deliveryLabel={`${delivery.name} · ${delivery.deliveryNumber}`}
          expenses={delivery.expenses}
          onClose={() => setShowExpenses(false)}
          onChanged={loadDelivery}
        />
      )}

      {showEdit && (
        <DeliveryFormModal
          delivery={delivery}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            loadDelivery();
          }}
        />
      )}
    </div>
  );
}
