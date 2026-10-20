'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  PAYMENT_STATUS_BADGES,
  PAYMENT_STATUS_LABELS,
  computePaymentStatus,
  formatCurrency,
  getAmountPaid,
} from '@/lib/distribution';

interface RecapTransaction {
  _id: string;
  invoiceNumber: string;
  customerName?: string;
  customerAddress?: string;
  items: { productName: string; quantity: number; unit?: string }[];
  total: number;
  amountPaid?: number;
  paymentStatus?: string;
}

interface RecapDelivery {
  _id: string;
  deliveryNumber: string;
  name: string;
  date: string;
  vehicle?: { _id: string; name: string; plateNumber?: string } | null;
  vehicleName: string;
  plateNumber?: string;
  driverName: string;
  transactions: RecapTransaction[];
  summary: {
    transactionCount: number;
    totalValue: number;
    totalPaid: number;
    totalRemaining: number;
    totalExpenses: number;
    collected: number;
  };
}

interface VehicleGroup {
  key: string;
  vehicleName: string;
  plateNumber?: string;
  drivers: string[];
  deliveries: RecapDelivery[];
  totalValue: number;
  totalPaid: number;
  transactionCount: number;
}

interface DayGroup {
  dateKey: string;
  vehicles: VehicleGroup[];
}

function toDateKey(value: string | Date) {
  const d = new Date(value);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatDay(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function vehicleKey(d: RecapDelivery) {
  return d.vehicle?._id || d.vehicleName;
}

export default function DeliveryRecapPage() {
  const [deliveries, setDeliveries] = useState<RecapDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');

  useEffect(() => {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    setStartDate(toDateKey(weekAgo));
    setEndDate(toDateKey(today));
  }, []);

  useEffect(() => {
    if (startDate && endDate) loadDeliveries();
  }, [startDate, endDate]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = `/api/deliveries?startDate=${startDate}&endDate=${endDate}&limit=1000`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.data || []);
      }
    } catch (error) {
      console.error('Error loading delivery recap:', error);
    } finally {
      setLoading(false);
    }
  };

  const vehicleOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of deliveries) {
      map.set(vehicleKey(d), `${d.vehicleName}${d.plateNumber ? ` (${d.plateNumber})` : ''}`);
    }
    return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [deliveries]);

  const filtered = useMemo(
    () => deliveries.filter((d) => !vehicleFilter || vehicleKey(d) === vehicleFilter),
    [deliveries, vehicleFilter]
  );

  // Kelompokkan: tanggal → kendaraan → pengiriman (urut waktu, jadi "ke-1", "ke-2", ...)
  const days = useMemo<DayGroup[]>(() => {
    const byDay = new Map<string, Map<string, VehicleGroup>>();
    const sorted = [...filtered].sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        a.deliveryNumber.localeCompare(b.deliveryNumber)
    );

    for (const d of sorted) {
      const dateKey = toDateKey(d.date);
      if (!byDay.has(dateKey)) byDay.set(dateKey, new Map());
      const vehicles = byDay.get(dateKey)!;
      const key = vehicleKey(d);
      if (!vehicles.has(key)) {
        vehicles.set(key, {
          key,
          vehicleName: d.vehicleName,
          plateNumber: d.plateNumber,
          drivers: [],
          deliveries: [],
          totalValue: 0,
          totalPaid: 0,
          transactionCount: 0,
        });
      }
      const group = vehicles.get(key)!;
      group.deliveries.push(d);
      if (!group.drivers.includes(d.driverName)) group.drivers.push(d.driverName);
      group.totalValue += d.summary.totalValue;
      group.totalPaid += d.summary.totalPaid;
      group.transactionCount += d.summary.transactionCount;
    }

    return Array.from(byDay, ([dateKey, vehicles]) => ({
      dateKey,
      vehicles: Array.from(vehicles.values()).sort((a, b) => a.vehicleName.localeCompare(b.vehicleName)),
    })).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filtered]);

  const totals = filtered.reduce(
    (acc, d) => ({
      transactions: acc.transactions + d.summary.transactionCount,
      value: acc.value + d.summary.totalValue,
      collected: acc.collected + d.summary.collected,
      expenses: acc.expenses + d.summary.totalExpenses,
    }),
    { transactions: 0, value: 0, collected: 0, expenses: 0 }
  );

  return (
    <div>
      <p className="text-gray-600 text-sm mb-6">
        Rekap pengiriman per kendaraan setiap hari, lengkap dengan transaksi di tiap pengiriman
      </p>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kendaraan</label>
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="">Semua Kendaraan</option>
            {vehicleOptions.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md p-5">
          <p className="text-sm text-gray-600 mb-1">Pengiriman</p>
          <p className="text-2xl font-bold text-gray-800">
            {filtered.length} <span className="text-sm font-normal text-gray-500">/ {totals.transactions} transaksi</span>
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5">
          <p className="text-sm text-gray-600 mb-1">Nilai Barang</p>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(totals.value)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5">
          <p className="text-sm text-gray-600 mb-1">Tertagih Driver</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totals.collected)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5">
          <p className="text-sm text-gray-600 mb-1">Pengeluaran</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(totals.expenses)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : days.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md text-center py-12 text-gray-500">
          <span className="text-6xl mb-4 block">🚚</span>
          <p>Tidak ada pengiriman pada rentang tanggal ini</p>
        </div>
      ) : (
        <div className="space-y-8">
          {days.map((day) => (
            <section key={day.dateKey}>
              <h2 className="text-lg font-bold text-gray-800 mb-3">{formatDay(day.dateKey)}</h2>
              <div className="space-y-4">
                {day.vehicles.map((vehicle) => (
                  <div key={vehicle.key} className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="px-5 py-4 bg-amber-50 border-b border-amber-100 flex flex-wrap justify-between items-center gap-3">
                      <div>
                        <p className="font-bold text-gray-900">
                          🚚 {vehicle.vehicleName}
                          {vehicle.plateNumber && (
                            <span className="ml-2 font-mono text-sm font-normal text-gray-600">{vehicle.plateNumber}</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">Driver: {vehicle.drivers.join(', ')}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Jumlah Kirim</p>
                          <p className="font-bold text-gray-900">{vehicle.deliveries.length} kali</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Transaksi</p>
                          <p className="font-bold text-gray-900">{vehicle.transactionCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Nilai</p>
                          <p className="font-bold text-gray-900">{formatCurrency(vehicle.totalValue)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Sisa Tagihan</p>
                          <p className="font-bold text-red-600">{formatCurrency(vehicle.totalValue - vehicle.totalPaid)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {vehicle.deliveries.map((delivery, idx) => (
                        <div key={delivery._id} className="px-5 py-4">
                          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-gray-800 text-white text-xs font-semibold">
                                Pengiriman ke-{idx + 1}
                              </span>
                              <Link
                                href={`/dashboard/deliveries/${delivery._id}`}
                                className="font-mono text-sm font-semibold text-amber-700 hover:underline"
                              >
                                {delivery.deliveryNumber}
                              </Link>
                              <span className="text-sm text-gray-700">{delivery.name}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {delivery.summary.transactionCount} transaksi · {formatCurrency(delivery.summary.totalValue)}
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Barang</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Terbayar</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {delivery.transactions.map((t) => {
                                  const paid = getAmountPaid(t);
                                  const status = computePaymentStatus(t.total, paid);
                                  return (
                                    <tr key={t._id}>
                                      <td className="px-3 py-2 font-mono whitespace-nowrap">{t.invoiceNumber}</td>
                                      <td className="px-3 py-2">
                                        <div className="font-medium text-gray-900">{t.customerName || '-'}</div>
                                        {t.customerAddress && (
                                          <div className="text-xs text-gray-500">{t.customerAddress}</div>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-gray-700">
                                        {t.items.map((item) => `${item.productName} × ${item.quantity}`).join(', ')}
                                      </td>
                                      <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(t.total)}</td>
                                      <td className="px-3 py-2 text-right whitespace-nowrap text-green-700">
                                        {formatCurrency(paid)}
                                      </td>
                                      <td className="px-3 py-2">
                                        <span
                                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${PAYMENT_STATUS_BADGES[status]}`}
                                        >
                                          {PAYMENT_STATUS_LABELS[status]}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
