'use client';

import { useEffect, useState } from 'react';
import {
  Load,
  SIZE_LABELS,
  SIZE_TYPES,
  PAYMENT_STATUS_BADGES,
  PAYMENT_STATUS_LABELS,
  addLoad,
  emptyLoad,
  formatCurrency,
  getAmountPaid,
  getRemaining,
  loadOfItems,
} from '@/lib/distribution';

interface Vehicle {
  _id: string;
  name: string;
  plateNumber?: string;
  driverName: string;
  capacity: Load;
}

export interface QueueTransaction {
  _id: string;
  invoiceNumber: string;
  customerName?: string;
  customerAddress?: string;
  customer?: { address?: string } | string;
  total: number;
  amountPaid?: number;
  paymentStatus?: string;
  createdAt: string;
  items: { productName: string; quantity: number; sizeType?: string }[];
}

export interface EditableDelivery {
  _id: string;
  name: string;
  date: string;
  vehicle: { _id: string } | string;
  driverName: string;
  notes?: string;
  transactions: QueueTransaction[];
}

interface Props {
  delivery?: EditableDelivery;
  onClose: () => void;
  onSaved: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

function customerAddress(t: QueueTransaction) {
  if (t.customerAddress) return t.customerAddress;
  if (t.customer && typeof t.customer === 'object') return t.customer.address;
  return undefined;
}

export default function DeliveryFormModal({ delivery, onClose, onSaved }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [queue, setQueue] = useState<QueueTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [name, setName] = useState(delivery?.name || '');
  const [date, setDate] = useState(delivery ? delivery.date.split('T')[0] : today());
  const [vehicleId, setVehicleId] = useState(
    delivery ? (typeof delivery.vehicle === 'string' ? delivery.vehicle : delivery.vehicle._id) : ''
  );
  const [driverName, setDriverName] = useState(delivery?.driverName || '');
  const [notes, setNotes] = useState(delivery?.notes || '');
  const [selected, setSelected] = useState<string[]>(delivery ? delivery.transactions.map((t) => t._id) : []);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [vRes, tRes] = await Promise.all([
          fetch('/api/vehicles', { headers }),
          fetch('/api/transactions?deliveryStatus=pending&limit=500', { headers }),
        ]);
        if (vRes.ok) setVehicles((await vRes.json()).data || []);
        if (tRes.ok) {
          const pending: QueueTransaction[] = (await tRes.json()).data || [];
          // Saat edit, transaksi yang sudah ada di pengiriman ini ikut ditampilkan
          setQueue([...(delivery?.transactions || []), ...pending]);
        }
      } catch (error) {
        console.error('Error loading delivery form data:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const vehicle = vehicles.find((v) => v._id === vehicleId);

  const selectedLoad = queue
    .filter((t) => selected.includes(t._id))
    .reduce((acc, t) => addLoad(acc, loadOfItems(t.items)), emptyLoad());
  const selectedValue = queue.filter((t) => selected.includes(t._id)).reduce((s, t) => s + t.total, 0);
  const overSizes = vehicle ? SIZE_TYPES.filter((s) => selectedLoad[s] > (vehicle.capacity?.[s] || 0)) : [];

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filteredQueue = queue.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.invoiceNumber.toLowerCase().includes(q) ||
      (t.customerName || '').toLowerCase().includes(q) ||
      (customerAddress(t) || '').toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      alert('Pilih kendaraan');
      return;
    }
    if (selected.length === 0) {
      alert('Pilih minimal 1 transaksi');
      return;
    }
    if (overSizes.length > 0) {
      alert('Muatan melebihi kapasitas kendaraan. Kurangi transaksi atau ganti kendaraan.');
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await fetch(delivery ? `/api/deliveries/${delivery._id}` : '/api/deliveries', {
        method: delivery ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          date,
          vehicle: vehicleId,
          driverName: driverName || undefined,
          notes,
          transactions: selected,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        onSaved();
      } else {
        alert(result.error || 'Gagal menyimpan plan pengiriman!');
      }
    } catch (error) {
      console.error('Error saving delivery:', error);
      alert('Terjadi kesalahan!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold mb-4">{delivery ? 'Edit Plan Pengiriman' : 'Buat Plan Pengiriman'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pengiriman *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pengiriman A - Rute Utara"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kirim *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kendaraan *</label>
              <select
                required
                value={vehicleId}
                onChange={(e) => {
                  setVehicleId(e.target.value);
                  const v = vehicles.find((x) => x._id === e.target.value);
                  if (v) setDriverName(v.driverName);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Pilih Kendaraan</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} {v.plateNumber ? `(${v.plateNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Load vs capacity */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {SIZE_TYPES.map((size) => {
              const cap = vehicle?.capacity?.[size] || 0;
              const used = selectedLoad[size];
              const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : used > 0 ? 100 : 0;
              const over = vehicle && used > cap;
              return (
                <div key={size} className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-700">Barang {SIZE_LABELS[size]}</span>
                    <span className={over ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                      {used} / {vehicle ? cap : '-'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${over ? 'bg-red-500' : 'bg-amber-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {overSizes.length > 0 && (
            <p className="text-sm text-red-600 mt-2">
              ⚠️ Muatan {overSizes.map((s) => SIZE_LABELS[s]).join(', ')} melebihi kapasitas kendaraan.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-3 gap-4">
            <h3 className="font-semibold text-gray-800">
              Pilih Transaksi ({selected.length} dipilih · {formatCurrency(selectedValue)})
            </h3>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Cari invoice, pelanggan, alamat..."
              className="w-full max-w-xs px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredQueue.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Tidak ada transaksi di antrian kirim. Transaksi baru dari Kasir akan muncul di sini.
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {filteredQueue.map((t) => {
                const load = loadOfItems(t.items);
                const remaining = getRemaining(t);
                const status = remaining <= 0 ? 'paid' : getAmountPaid(t) > 0 ? 'partial' : 'unpaid';
                const checked = selected.includes(t._id);
                return (
                  <label
                    key={t._id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer ${checked ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(t._id)}
                      className="mt-1 w-4 h-4 accent-amber-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-3">
                        <div>
                          <span className="font-mono text-sm font-semibold">{t.invoiceNumber}</span>
                          <span className="text-sm text-gray-800"> · {t.customerName || 'Pelanggan Umum'}</span>
                        </div>
                        <span className="font-semibold text-sm whitespace-nowrap">{formatCurrency(t.total)}</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        📍 {customerAddress(t) || 'Alamat belum diisi'}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs">
                        <span className={`px-2 py-0.5 rounded-full ${PAYMENT_STATUS_BADGES[status]}`}>
                          {PAYMENT_STATUS_LABELS[status]}
                          {remaining > 0 && ` · sisa ${formatCurrency(remaining)}`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          B {load.besar} · M {load.medium} · K {load.kecil}
                        </span>
                        <span className="text-gray-500">
                          {new Date(t.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="p-4 border-t flex gap-3 justify-end bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-900 hover:bg-gray-300 rounded-lg font-medium"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-medium disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : delivery ? 'Simpan Perubahan' : 'Buat Plan'}
          </button>
        </div>
      </form>
    </div>
  );
}
