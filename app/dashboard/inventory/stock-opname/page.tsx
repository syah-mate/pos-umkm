'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface IStockOpname {
  _id: string;
  sessionName: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  categoryFilter: any[];
  openedBy: string;
  openedByName: string;
  finalizedBy?: string;
  finalizedByName?: string;
  openedAt: string;
  finalizedAt?: string;
  totalItems: number;
  countedItems: number;
  totalDifference: number;
  totalLossValue: number;
  notes?: string;
}

interface ICategory {
  _id: string;
  name: string;
  type: string;
}

export default function StockOpnamePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<IStockOpname[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [userRole, setUserRole] = useState('');
  
  const [formData, setFormData] = useState({
    sessionName: '',
    categoryFilter: [] as string[],
    notes: '',
  });

  useEffect(() => {
    // Get user role from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || '');
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [sessionsRes, categoriesRes] = await Promise.all([
        fetch('/api/stock-opname', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/categories', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sessionName.trim()) {
      alert('Nama sesi wajib diisi');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/stock-opname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Sesi berhasil dibuat! ${data.totalProducts} produk ditambahkan.`);
        setShowModal(false);
        setFormData({ sessionName: '', categoryFilter: [], notes: '' });
        router.push(`/dashboard/inventory/stock-opname/${data.session._id}`);
      } else {
        alert(data.error || 'Gagal membuat sesi');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleCancelSession = async (id: string) => {
    if (!confirm('Yakin ingin membatalkan sesi ini?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/stock-opname/${id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('Sesi berhasil dibatalkan');
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || 'Gagal membatalkan sesi');
      }
    } catch (error) {
      console.error('Error canceling session:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleDownloadReport = async (sessionId: string, sessionName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/stock-opname/${sessionId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stok-opname-${sessionName.replace(/\s+/g, '-')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Gagal mengunduh laporan');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categoryFilter: prev.categoryFilter.includes(categoryId)
        ? prev.categoryFilter.filter(id => id !== categoryId)
        : [...prev.categoryFilter, categoryId],
    }));
  };

  const handleSelectAllCategories = () => {
    setFormData(prev => ({
      ...prev,
      categoryFilter: [],
    }));
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      open: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-500',
    };
    return styles[status as keyof typeof styles] || styles.open;
  };

  const getStatusText = (status: string) => {
    const texts = {
      open: 'Baru Dibuka',
      in_progress: 'Sedang Berjalan',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
    };
    return texts[status as keyof typeof texts] || status;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const activeSessions = sessions.filter(s => s.status === 'open' || s.status === 'in_progress');

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Stok Opname</h1>
        {userRole === 'admin' && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium focus:ring-4 focus:ring-blue-500/50 focus:outline-none"
          >
            📋 Buka Sesi Baru
          </button>
        )}
      </div>

      {/* Active Session Warning */}
      {activeSessions.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-lg">
          <div className="flex items-center">
            <div className="shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-amber-800">
                Sesi aktif: {activeSessions[0].sessionName}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {activeSessions[0].countedItems} dari {activeSessions[0].totalItems} produk sudah dihitung
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Riwayat Sesi Opname</h2>
        
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Belum ada sesi opname. {userRole === 'admin' && 'Klik tombol "Buka Sesi Baru" untuk memulai.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nama Sesi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tanggal Buka
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Selisih Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nilai Kerugian
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sessions.map(session => (
                  <tr key={session._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-semibold">{session.sessionName}</div>
                        <div className="text-xs text-gray-500">oleh {session.openedByName}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(session.openedAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(session.status)}`}>
                        {getStatusText(session.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {session.countedItems} / {session.totalItems}
                      </div>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(session.countedItems / session.totalItems) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={session.totalDifference < 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                        {session.totalDifference > 0 ? '+' : ''}{session.totalDifference}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-red-600 font-medium">
                        {formatCurrency(session.totalLossValue)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/inventory/stock-opname/${session._id}`)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          Lihat Detail
                        </button>
                        {session.status === 'completed' && (
                          <button
                            onClick={() => handleDownloadReport(session._id, session.sessionName)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                            title="Unduh Laporan Excel"
                          >
                            📥 Excel
                          </button>
                        )}
                        {userRole === 'admin' && (session.status === 'open' || session.status === 'in_progress') && (
                          <button
                            onClick={() => handleCancelSession(session._id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                          >
                            Batalkan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Buka Sesi Stok Opname Baru</h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ sessionName: '', categoryFilter: [], notes: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSession}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Sesi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.sessionName}
                    onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Contoh: Opname Akhir Bulan Januari 2026"
                    required
                  />
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Pilih Kategori (Opsional)
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllCategories}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Semua Kategori
                    </button>
                  </div>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {categories.length === 0 ? (
                      <p className="text-sm text-gray-500">Tidak ada kategori</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {categories.map(category => (
                          <label key={category._id} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.categoryFilter.includes(category._id)}
                              onChange={() => handleCategoryToggle(category._id)}
                              className="mr-2"
                            />
                            <span className="text-sm">{category.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Kosongkan untuk meng-opname semua produk
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan (Opsional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Tambahkan catatan jika diperlukan"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormData({ sessionName: '', categoryFilter: [], notes: '' });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium"
                  >
                    Buka Sesi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
