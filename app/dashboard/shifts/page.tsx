'use client';

import { useEffect, useState } from 'react';

interface Shift {
  _id: string;
  shiftName: string;
  cashier: { _id: string; name: string };
  cashierName: string;
  startTime: string;
  endTime?: string;
  startingCash: number;
  endingCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  totalTransactions: number;
  totalSales: number;
  status: 'open' | 'closed';
  notes?: string;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [openShiftData, setOpenShiftData] = useState({
    startingCash: 0,
    notes: '',
  });

  const [closeShiftData, setCloseShiftData] = useState({
    endingCash: 0,
    notes: '',
  });

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/shifts', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setShifts(data.data || []);
        
        // Find active shift
        const active = data.data?.find((s: Shift) => s.status === 'open');
        setActiveShift(active || null);
      }
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      const response = await fetch('/api/shifts/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...openShiftData,
          cashier: user.id || user._id,
          cashierName: user.name,
        }),
      });

      if (response.ok) {
        alert('Shift berhasil dibuka!');
        setShowOpenModal(false);
        setOpenShiftData({ startingCash: 0, notes: '' });
        loadShifts();
      } else {
        const error = await response.json();
        alert(error.message || 'Gagal membuka shift!');
      }
    } catch (error) {
      console.error('Error opening shift:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeShift) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/shifts/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shiftId: activeShift._id,
          ...closeShiftData,
        }),
      });

      if (response.ok) {
        alert('Shift berhasil ditutup!');
        setShowCloseModal(false);
        setCloseShiftData({ endingCash: 0, notes: '' });
        loadShifts();
      } else {
        const error = await response.json();
        alert(error.message || 'Gagal menutup shift!');
      }
    } catch (error) {
      console.error('Error closing shift:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Shift</h1>
          <p className="text-gray-600 text-sm mt-1">Kelola shift kasir dan rekonsiliasi kas</p>
        </div>
        {!activeShift && (
          <button
            onClick={() => setShowOpenModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            🔓 Buka Shift
          </button>
        )}
      </div>

      {/* Active Shift Card */}
      {activeShift && (
        <div className="bg-linear-to-r from-green-500 to-green-600 rounded-xl shadow-xl p-6 mb-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">✅ Shift Aktif</h2>
              <p className="text-green-100 mb-4">
                Kasir: <span className="font-semibold">{activeShift.cashierName}</span>
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-xs text-green-100 mb-1">Mulai</p>
                  <p className="font-semibold">{formatDateTime(activeShift.startTime)}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-xs text-green-100 mb-1">Modal Awal</p>
                  <p className="font-bold">{formatCurrency(activeShift.startingCash)}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-xs text-green-100 mb-1">Transaksi</p>
                  <p className="font-bold text-2xl">{activeShift.totalTransactions}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-xs text-green-100 mb-1">Total Penjualan</p>
                  <p className="font-bold">{formatCurrency(activeShift.totalSales)}</p>
                </div>
              </div>

              {activeShift.notes && (
                <p className="text-sm text-green-100">
                  Catatan: {activeShift.notes}
                </p>
              )}
            </div>
            
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-6 py-3 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition-colors font-bold shadow-lg"
            >
              🔒 Tutup Shift
            </button>
          </div>
        </div>
      )}

      {/* No Active Shift Alert */}
      {!activeShift && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-lg">
          <div className="flex items-center">
            <div className="shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">
                Tidak ada shift aktif
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Buka shift terlebih dahulu untuk mulai melayani transaksi
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Shifts History */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">Riwayat Shift</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nama Shift
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Kasir
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Waktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Modal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Kas Akhir
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Selisih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Transaksi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shifts.map(shift => (
                <tr key={shift._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{shift.shiftName || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{shift.cashierName}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="text-gray-900">{formatDateTime(shift.startTime)}</div>
                    {shift.endTime && (
                      <div className="text-gray-500">{formatDateTime(shift.endTime)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">
                    {formatCurrency(shift.startingCash)}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">
                    {shift.endingCash ? formatCurrency(shift.endingCash) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {shift.cashDifference !== undefined ? (
                      <span className={`font-bold ${
                        shift.cashDifference === 0 
                          ? 'text-green-600' 
                          : shift.cashDifference > 0
                          ? 'text-blue-600'
                          : 'text-red-600'
                      }`}>
                        {shift.cashDifference >= 0 ? '+' : ''}
                        {formatCurrency(shift.cashDifference)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {shift.totalTransactions}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-green-600">
                    {formatCurrency(shift.totalSales)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      shift.status === 'open' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {shift.status === 'open' ? '✅ Aktif' : '🔒 Tutup'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {shifts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <span className="text-6xl mb-4 block">🕐</span>
              <p>Belum ada riwayat shift</p>
            </div>
          )}
        </div>
      </div>

      {/* Open Shift Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">🔓 Buka Shift</h2>
            
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modal Awal (Cash) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={openShiftData.startingCash}
                  onChange={(e) => setOpenShiftData({...openShiftData, startingCash: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="100000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={openShiftData.notes}
                  onChange={(e) => setOpenShiftData({...openShiftData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Catatan shift..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowOpenModal(false);
                    setOpenShiftData({ startingCash: 0, notes: '' });
                  }}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium"
                >
                  Buka Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && activeShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">🔒 Tutup Shift</h2>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Modal Awal:</span>
                  <span className="font-semibold">{formatCurrency(activeShift.startingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Transaksi:</span>
                  <span className="font-semibold">{activeShift.totalTransactions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Penjualan:</span>
                  <span className="font-bold text-green-600">{formatCurrency(activeShift.totalSales)}</span>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kas Akhir (Total Cash) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={closeShiftData.endingCash}
                  onChange={(e) => setCloseShiftData({...closeShiftData, endingCash: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="500000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={closeShiftData.notes}
                  onChange={(e) => setCloseShiftData({...closeShiftData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Catatan penutupan shift..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCloseModal(false);
                    setCloseShiftData({ endingCash: 0, notes: '' });
                  }}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium"
                >
                  Tutup Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
