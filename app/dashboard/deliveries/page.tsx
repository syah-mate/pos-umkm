'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DeliveryFormModal from '@/components/DeliveryFormModal';
import ExpenseModal, { DeliveryExpense } from '@/components/ExpenseModal';
import {
  DELIVERY_PLAN_STATUS_BADGES,
  DELIVERY_PLAN_STATUS_LABELS,
  Load,
  formatCurrency,
} from '@/lib/distribution';

interface DeliverySummary {
  transactionCount: number;
  totalValue: number;
  totalPaid: number;
  totalRemaining: number;
  totalExpenses: number;
  collected: number;
  counts: { paid: number; partial: number; unpaid: number };
  load: Load;
}

interface Delivery {
  _id: string;
  deliveryNumber: string;
  name: string;
  date: string;
  vehicleName: string;
  plateNumber?: string;
  driverName: string;
  status: string;
  expenses: DeliveryExpense[];
  summary: DeliverySummary;
}

const STATUS_FILTERS = [
  { value: 'planned,on_delivery', label: 'Aktif' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
  { value: '', label: 'Semua' },
];

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('planned,on_delivery');
  const [showForm, setShowForm] = useState(false);
  const [expenseFor, setExpenseFor] = useState<Delivery | null>(null);

  useEffect(() => {
    loadDeliveries();
  }, [statusFilter]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = statusFilter ? `/api/deliveries?status=${statusFilter}` : '/api/deliveries';
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        const list: Delivery[] = data.data || [];
        setDeliveries(list);
        // Keep the open expense modal in sync after changes
        setExpenseFor((current) => (current ? list.find((d) => d._id === current._id) || null : null));
      }
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const printSuratJalan = (id: string) => {
    window.open(`/print/surat-jalan/${id}`, '_blank');
  };

  const totals = deliveries.reduce(
    (acc, d) => ({
      value: acc.value + d.summary.totalValue,
      remaining: acc.remaining + d.summary.totalRemaining,
      expenses: acc.expenses + d.summary.totalExpenses,
      transactions: acc.transactions + d.summary.transactionCount,
    }),
    { value: 0, remaining: 0, expenses: 0, transactions: 0 }
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-4">
        <p className="text-gray-600 text-sm">
          Atur pengiriman per kendaraan, tagih pelunasan, klaim pengeluaran, dan cetak surat jalan
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium whitespace-nowrap focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
        >
          + Buat Plan Pengiriman
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md p-5">
          <p className="text-sm text-gray-600 mb-1">Pengiriman</p>
          <p className="text-2xl font-bold text-gray-800">
            {deliveries.length} <span className="text-sm font-normal text-gray-500">/ {totals.transactions} transaksi</span>
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5">
          <p className="text-sm text-gray-600 mb-1">Nilai Barang</p>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(totals.value)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5">
          <p className="text-sm text-gray-600 mb-1">Sisa Tagihan</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totals.remaining)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5">
          <p className="text-sm text-gray-600 mb-1">Pengeluaran</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(totals.expenses)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium focus:ring-4 focus:ring-amber-400/50 focus:outline-none ${
              statusFilter === f.value ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pengiriman</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kendaraan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaksi</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nilai / Sisa</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pengeluaran</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!loading &&
                deliveries.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/deliveries/${d._id}`} className="font-semibold text-gray-900 hover:text-amber-700">
                        {d.name}
                      </Link>
                      <div className="text-xs text-gray-500">
                        <span className="font-mono">{d.deliveryNumber}</span> ·{' '}
                        {new Date(d.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{d.vehicleName}</div>
                      <div className="text-xs text-gray-500">
                        {d.plateNumber ? `${d.plateNumber} · ` : ''}
                        {d.driverName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{d.summary.transactionCount} transaksi</div>
                      <div className="flex gap-1 mt-1 text-xs">
                        <span className="px-1.5 py-0.5 rounded whitespace-nowrap bg-green-100 text-green-700">{d.summary.counts.paid} lunas</span>
                        <span className="px-1.5 py-0.5 rounded whitespace-nowrap bg-yellow-100 text-yellow-800">{d.summary.counts.partial} sebagian</span>
                        <span className="px-1.5 py-0.5 rounded whitespace-nowrap bg-red-100 text-red-700">{d.summary.counts.unpaid} hutang</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="font-semibold text-gray-900">{formatCurrency(d.summary.totalValue)}</div>
                      <div className="text-xs text-red-600">sisa {formatCurrency(d.summary.totalRemaining)}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-orange-700 font-medium">
                      {formatCurrency(d.summary.totalExpenses)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${DELIVERY_PLAN_STATUS_BADGES[d.status]}`}>
                        {DELIVERY_PLAN_STATUS_LABELS[d.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={`/dashboard/deliveries/${d._id}`}
                          className="px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
                        >
                          Detail & Pelunasan
                        </Link>
                        <button
                          onClick={() => setExpenseFor(d)}
                          disabled={d.status === 'cancelled'}
                          className="px-2.5 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-xs font-medium disabled:opacity-40"
                        >
                          Klaim Pengeluaran
                        </button>
                        <button
                          onClick={() => printSuratJalan(d._id)}
                          disabled={d.status === 'cancelled'}
                          className="px-2.5 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-xs font-medium disabled:opacity-40"
                        >
                          🖨️ Surat Jalan
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {loading && <div className="text-center py-12 text-gray-500">Loading...</div>}
          {!loading && deliveries.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <span className="text-6xl mb-4 block">🚚</span>
              <p>Belum ada plan pengiriman</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <DeliveryFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadDeliveries();
          }}
        />
      )}

      {expenseFor && (
        <ExpenseModal
          deliveryId={expenseFor._id}
          deliveryLabel={`${expenseFor.name} · ${expenseFor.deliveryNumber}`}
          expenses={expenseFor.expenses}
          onClose={() => setExpenseFor(null)}
          onChanged={loadDeliveries}
        />
      )}
    </div>
  );
}
