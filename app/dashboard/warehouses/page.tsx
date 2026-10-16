'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/distribution';

interface Warehouse {
  _id: string;
  code: string;
  name: string;
  address?: string;
  picName?: string;
  phone?: string;
  notes?: string;
  productCount: number;
  totalStock: number;
  stockValue: number;
}

const emptyForm = {
  code: '',
  name: '',
  address: '',
  picName: '',
  phone: '',
  notes: '',
};

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/warehouses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.data || []);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (warehouse: Warehouse) => {
    setEditing(warehouse);
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address || '',
      picName: warehouse.picName || '',
      phone: warehouse.phone || '',
      notes: warehouse.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(editing ? `/api/warehouses/${editing._id}` : '/api/warehouses', {
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
        loadWarehouses();
      } else {
        alert(result.error || 'Gagal menyimpan gudang!');
      }
    } catch (error) {
      console.error('Error saving warehouse:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const handleDelete = async (warehouse: Warehouse) => {
    if (!confirm(`Hapus gudang ${warehouse.name}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/warehouses/${warehouse._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok) {
        loadWarehouses();
      } else {
        alert(result.error || 'Gagal menghapus gudang!');
      }
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      alert('Terjadi kesalahan!');
    }
  };

  const filtered = warehouses.filter((w) => {
    const q = searchQuery.toLowerCase();
    return w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-4">
        <input
          type="text"
          placeholder="🔍 Cari gudang (nama atau kode)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
        />
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium whitespace-nowrap focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
        >
          + Tambah Gudang
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Gudang</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PIC</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Jumlah Produk</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Stok</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nilai Stok (HPP)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((w) => (
                <tr key={w._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm font-semibold text-gray-900">{w.code}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{w.name}</div>
                    {w.address && <div className="text-sm text-gray-600">{w.address}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div>{w.picName || '-'}</div>
                    {w.phone && <div className="text-gray-500">{w.phone}</div>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      {w.productCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    {w.totalStock.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">{formatCurrency(w.stockValue)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openEdit(w)}
                      className="text-blue-700 hover:text-blue-900 mr-3 rounded px-2 py-1 focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(w)}
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
              <span className="text-6xl mb-4 block">🏭</span>
              <p>Belum ada gudang</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{editing ? 'Edit Gudang' : 'Tambah Gudang'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="GDG-01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Gudang *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIC / Kepala Gudang</label>
                  <input
                    type="text"
                    value={formData.picName}
                    onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
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
