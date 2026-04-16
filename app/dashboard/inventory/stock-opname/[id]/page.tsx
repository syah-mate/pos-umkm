'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface IStockOpname {
  _id: string;
  sessionName: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  openedByName: string;
  openedAt: string;
  totalItems: number;
  countedItems: number;
  totalDifference: number;
  totalLossValue: number;
  notes?: string;
}

interface IStockOpnameItem {
  _id: string;
  productName: string;
  sku: string;
  category: string;
  unit: string;
  snapshotStock: number;
  physicalCount: number | null;
  difference: number | null;
  costAtTime: number;
  lossValue: number;
  reason?: string;
  notes?: string;
  isCounted: boolean;
}

type FilterType = 'all' | 'uncounted' | 'diff';

export default function StockOpnameDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<IStockOpname | null>(null);
  const [items, setItems] = useState<IStockOpnameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [localCounts, setLocalCounts] = useState<Record<string, number | ''>>({});
  const [localReasons, setLocalReasons] = useState<Record<string, string>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [userRole, setUserRole] = useState('');
  const [finalizeConfirm, setFinalizeConfirm] = useState(false);

  useEffect(() => {
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
  }, [sessionId, filter, search]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (filter !== 'all') queryParams.append('filter', filter);
      if (search) queryParams.append('search', search);

      const response = await fetch(`/api/stock-opname/${sessionId}?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        setItems(data.items);
      } else {
        alert('Gagal memuat data');
        router.push('/dashboard/inventory/stock-opname');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (item: IStockOpnameItem) => {
    const physicalCount = localCounts[item._id];
    
    if (physicalCount === '' || physicalCount === undefined) {
      alert('Masukkan jumlah fisik terlebih dahulu');
      return;
    }

    if (physicalCount < 0) {
      alert('Jumlah fisik tidak boleh negatif');
      return;
    }

    const difference = physicalCount - item.snapshotStock;
    if (difference !== 0 && !localReasons[item._id]) {
      alert('Harap pilih alasan untuk produk dengan selisih');
      return;
    }

    setSavingItemId(item._id);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/stock-opname/${sessionId}/item`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId: item._id,
          physicalCount: Number(physicalCount),
          reason: localReasons[item._id] || undefined,
          notes: localNotes[item._id] || undefined,
        }),
      });

      if (response.ok) {
        // Clear local state for this item
        setLocalCounts(prev => {
          const newCounts = { ...prev };
          delete newCounts[item._id];
          return newCounts;
        });
        setLocalReasons(prev => {
          const newReasons = { ...prev };
          delete newReasons[item._id];
          return newReasons;
        });
        setLocalNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[item._id];
          return newNotes;
        });
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || 'Gagal menyimpan');
      }
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Terjadi kesalahan');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleFillAllSnapshot = () => {
    const uncountedItems = items.filter(item => !item.isCounted);
    if (uncountedItems.length === 0) {
      alert('Semua item sudah dihitung');
      return;
    }

    if (!confirm(`Isi ${uncountedItems.length} produk dengan nilai snapshot-nya?`)) return;

    const newCounts: Record<string, number> = {};
    uncountedItems.forEach(item => {
      newCounts[item._id] = item.snapshotStock;
    });
    setLocalCounts(prev => ({ ...prev, ...newCounts }));
  };

  const handleSaveAll = async () => {
    const itemsToSave = items.filter(item => 
      !item.isCounted && localCounts[item._id] !== undefined && localCounts[item._id] !== ''
    );

    if (itemsToSave.length === 0) {
      alert('Tidak ada item yang perlu disimpan');
      return;
    }

    if (!confirm(`Simpan ${itemsToSave.length} produk?`)) return;

    for (const item of itemsToSave) {
      await handleSaveItem(item);
    }
  };

  const handleFinalize = async () => {
    if (!finalizeConfirm) {
      alert('Harap centang konfirmasi terlebih dahulu');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/stock-opname/${sessionId}/finalize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Finalisasi berhasil! ${data.adjustedProducts} produk disesuaikan.`);
        setShowFinalizeModal(false);
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || 'Gagal finalisasi');
      }
    } catch (error) {
      console.error('Error finalizing:', error);
      alert('Terjadi kesalahan');
    }
  };

  const getLocalOrActualCount = (item: IStockOpnameItem): number | '' => {
    if (item._id in localCounts) return localCounts[item._id];
    if (item.physicalCount !== null) return item.physicalCount;
    return '';
  };

  const calculateDifference = (item: IStockOpnameItem): number | null => {
    const count = getLocalOrActualCount(item);
    if (count === '') return null;
    return count - item.snapshotStock;
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

  const isEditable = session?.status === 'open' || session?.status === 'in_progress';
  const diffCount = items.filter(item => item.difference !== null && item.difference !== 0).length;

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  if (!session) {
    return <div className="text-center py-8">Sesi tidak ditemukan</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <button
              onClick={() => router.push('/dashboard/inventory/stock-opname')}
              className="text-blue-600 hover:text-blue-800 text-sm mb-2"
            >
              ← Kembali ke Daftar Sesi
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{session.sessionName}</h1>
            <p className="text-sm text-gray-500">
              Dibuka oleh {session.openedByName} pada {formatDate(session.openedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(session.status)}`}>
              {getStatusText(session.status)}
            </span>
            {userRole === 'admin' && isEditable && (
              <>
                <button
                  onClick={() => router.push('/dashboard/inventory/stock-opname')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Batalkan
                </button>
                <button
                  onClick={() => setShowFinalizeModal(true)}
                  className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 font-medium"
                >
                  Finalisasi
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total Produk</p>
            <p className="text-2xl font-bold text-blue-700">{session.totalItems}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Sudah Dihitung</p>
            <p className="text-2xl font-bold text-green-700">{session.countedItems}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Produk Selisih</p>
            <p className="text-2xl font-bold text-red-700">{diffCount}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-500">
            <p className="text-sm text-gray-600">Estimasi Kerugian</p>
            <p className="text-lg font-bold text-amber-700">{formatCurrency(session.totalLossValue)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress Penghitungan</span>
            <span>{Math.round((session.countedItems / session.totalItems) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${(session.countedItems / session.totalItems) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-700 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Semua ({items.length})
            </button>
            <button
              onClick={() => setFilter('uncounted')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'uncounted' 
                  ? 'bg-blue-700 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Belum Dihitung
            </button>
            <button
              onClick={() => setFilter('diff')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'diff' 
                  ? 'bg-blue-700 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Ada Selisih
            </button>
          </div>
          <div className="w-full md:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk atau SKU..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {isEditable && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleFillAllSnapshot}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              Isi Semua = Snapshot
            </button>
            <button
              onClick={handleSaveAll}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Simpan Semua
            </button>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Daftar Produk</h2>
        
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Tidak ada produk yang cocok dengan filter
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">✓</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Snapshot</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fisik</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selisih</th>
                  {isEditable && (
                    <>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alasan</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map(item => {
                  const count = getLocalOrActualCount(item);
                  const diff = calculateDifference(item);
                  const showReason = diff !== null && diff !== 0;

                  return (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        {item.isCounted && <span className="text-green-600 text-xl">✓</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-sm">{item.sku}</span>
                      </td>
                      <td className="px-3 py-3 font-medium">{item.productName}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-medium">{item.snapshotStock} {item.unit}</span>
                      </td>
                      <td className="px-3 py-3">
                        {isEditable && !item.isCounted ? (
                          <input
                            type="number"
                            min="0"
                            value={count}
                            onChange={(e) => setLocalCounts({
                              ...localCounts,
                              [item._id]: e.target.value === '' ? '' : Number(e.target.value)
                            })}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        ) : (
                          <span className="font-medium">{item.physicalCount ?? '-'} {item.physicalCount !== null ? item.unit : ''}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {diff !== null && (
                          <span className={`font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        )}
                      </td>
                      {isEditable && (
                        <>
                          <td className="px-3 py-3">
                            {showReason && !item.isCounted ? (
                              <select
                                value={localReasons[item._id] || item.reason || ''}
                                onChange={(e) => setLocalReasons({
                                  ...localReasons,
                                  [item._id]: e.target.value
                                })}
                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Pilih alasan</option>
                                <option value="susut_kadaluarsa">Susut/Kadaluarsa</option>
                                <option value="rusak">Rusak</option>
                                <option value="pencurian">Pencurian</option>
                                <option value="kesalahan_input">Kesalahan Input</option>
                                <option value="lainnya">Lainnya</option>
                              </select>
                            ) : item.reason ? (
                              <span className="text-xs text-gray-600">{item.reason}</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-3">
                            {!item.isCounted && (
                              <button
                                onClick={() => handleSaveItem(item)}
                                disabled={savingItemId === item._id}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:bg-gray-400"
                              >
                                {savingItemId === item._id ? 'Menyimpan...' : 'Simpan'}
                              </button>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Finalize Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Finalisasi Stok Opname</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-medium mb-2">Summary:</p>
                <ul className="text-sm space-y-1">
                  <li>Total Produk: <span className="font-bold">{session.totalItems}</span></li>
                  <li>Sudah Dihitung: <span className="font-bold">{session.countedItems}</span></li>
                  <li>Produk Selisih: <span className="font-bold text-red-600">{diffCount}</span></li>
                  <li>Estimasi Kerugian: <span className="font-bold text-red-600">{formatCurrency(session.totalLossValue)}</span></li>
                </ul>
              </div>

              {session.countedItems < session.totalItems && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mb-4">
                  <p className="text-sm text-amber-800">
                    <strong>Perhatian:</strong> {session.totalItems - session.countedItems} produk belum dihitung. 
                    Stok produk tersebut tidak akan disesuaikan.
                  </p>
                </div>
              )}

              <label className="flex items-start cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={finalizeConfirm}
                  onChange={(e) => setFinalizeConfirm(e.target.checked)}
                  className="mt-1 mr-2"
                />
                <span className="text-sm">
                  Saya mengerti finalisasi ini tidak bisa dibatalkan dan akan mengupdate stok produk sesuai hitungan fisik.
                </span>
              </label>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowFinalizeModal(false);
                    setFinalizeConfirm(false);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Batal
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={!finalizeConfirm}
                  className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 font-medium disabled:bg-gray-400"
                >
                  Finalisasi & Sesuaikan Stok
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
