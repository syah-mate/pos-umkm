'use client';

import { useEffect, useState } from 'react';
import { SIZE_LABELS, SIZE_TYPES, SIZE_BADGES } from '@/lib/distribution';

interface Vehicle {
  _id: string;
  name: string;
  plateNumber?: string;
  driverName: string;
  driverPhone?: string;
  capacity: { besar: number; medium: number; kecil: number };
  notes?: string;
}

const emptyForm = {
  name: '',
  plateNumber: '',
  driverName: '',
  driverPhone: '',
  capacity: { besar: 0, medium: 0, kecil: 0 },
  notes: '',
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/vehicles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.data || []);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (vehicle: Vehicle) => {
    setEditing(vehicle);
    setFormData({
      name: vehicle.name,
      plateNumber: vehicle.plateNumber || '',
      driverName: vehicle.driverName,
      driverPhone: vehicle.driverPhone || '',
      capacity: {
        besar: vehicle.capacity?.besar || 0,
        medium: vehicle.capacity?.medium || 0,
        kecil: vehicle.capacity?.kecil || 0,
      },
      notes: vehicle.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(editing ? `/api/vehicles/${editing._id}` : '/api/vehicles', {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.ok) {
        setShowModal(false);
        loadVehicles();
      } else {
        alert(result.error || 'Gagal menyimpan kendaraan!');
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (!confirm(`Hapus kendaraan ${vehicle.name}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/vehicles/${vehicle._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok) {
        loadVehicles();
      } else {
        alert(result.error || 'Gagal menghapus kendaraan!');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const filtered = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.driverName.toLowerCase().includes(q) ||
      (v.plateNumber || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-4">
        <input
          type="text"
          placeholder="🔍 Cari kendaraan, plat nomor, atau driver..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
        />
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium whitespace-nowrap focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
        >
          + Tambah Kendaraan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kendaraan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Muatan Maksimal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((v) => (
                <tr key={v._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{v.name}</div>
                    {v.plateNumber && <div className="text-sm font-mono text-gray-600">{v.plateNumber}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div className="font-medium text-gray-900">{v.driverName}</div>
                    {v.driverPhone && <div className="text-gray-500">{v.driverPhone}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      {SIZE_TYPES.map((size) => (
                        <span key={size} className={`px-2.5 py-1 rounded-full text-xs font-medium ${SIZE_BADGES[size]}`}>
                          {SIZE_LABELS[size]}: {v.capacity?.[size] || 0}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openEdit(v)}
                      className="text-blue-700 hover:text-blue-900 mr-3 rounded px-2 py-1 focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      className="text-red-700 hover:text-red-900 rounded px-2 py-1 focus:ring-2 focus:ring-red-500/50 focus:outline-none"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <span className="text-6xl mb-4 block">🚚</span>
              <p>Belum ada kendaraan</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{editing ? 'Edit Kendaraan' : 'Tambah Kendaraan'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kendaraan *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Truk Engkel 01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plat Nomor</label>
                  <input
                    type="text"
                    value={formData.plateNumber}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                    placeholder="B 1234 XYZ"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Driver *</label>
                  <input
                    type="text"
                    required
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. HP Driver</label>
                  <input
                    type="text"
                    value={formData.driverPhone}
                    onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Muatan Maksimal (jumlah barang)</label>
                <div className="grid grid-cols-3 gap-3">
                  {SIZE_TYPES.map((size) => (
                    <div key={size}>
                      <span className={`inline-block mb-1 px-2 py-0.5 rounded-full text-xs font-medium ${SIZE_BADGES[size]}`}>
                        Barang {SIZE_LABELS[size]}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={formData.capacity[size] || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            capacity: { ...formData.capacity, [size]: Number(e.target.value) || 0 },
                          })
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Dipakai untuk mengecek apakah transaksi di pengiriman muat di kendaraan ini.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-900 hover:bg-gray-300 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-medium"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
