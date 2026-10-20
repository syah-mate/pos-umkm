'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DeliveryProfitReport } from '@/lib/deliveryReport';

interface DailyReport {
  totalSales: number;
  totalTransactions: number;
  totalItems: number;
  averageTransaction: number;
  paymentMethods: Array<{
    method: string;
    count: number;
    total: number;
  }>;
  topProducts: Array<{
    product: { name: string; sku: string };
    totalQuantity: number;
    totalRevenue: number;
  }>;
  hourlySales: number[];
}

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [inventoryReport, setInventoryReport] = useState<any>(null);
  const [deliveryReport, setDeliveryReport] = useState<DeliveryProfitReport | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'inventory'>('daily');

  useEffect(() => {
    loadReports();
  }, [selectedDate]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Load daily report
      const dailyRes = await fetch(`/api/reports/daily?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (dailyRes.ok) {
        const data = await dailyRes.json();
        setDailyReport(data.data);
      }

      // Load laba pengiriman harian
      const deliveryRes = await fetch(`/api/reports/deliveries?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (deliveryRes.ok) {
        const data = await deliveryRes.json();
        setDeliveryReport(data.data);
      }

      // Load inventory report
      const inventoryRes = await fetch('/api/reports/inventory', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (inventoryRes.ok) {
        const data = await inventoryRes.json();
        setInventoryReport(data.data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadDeliveryExcel = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/deliveries?date=${selectedDate}&format=xlsx`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan-pengiriman-${selectedDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Gagal mengunduh laporan');
      }
    } catch (error) {
      console.error('Error downloading delivery report:', error);
      alert('Terjadi kesalahan');
    } finally {
      setDownloading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'daily'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📊 Laporan Harian
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'inventory'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📦 Laporan Inventori
        </button>
      </div>

      {/* Daily Report Tab */}
      {activeTab === 'daily' && dailyReport && (
        <div>
          {/* Date Selector */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pilih Tanggal
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Laba Pengiriman */}
          {deliveryReport && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Laba Pengiriman</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    · {deliveryReport.totals.deliveryCount} pengiriman · {deliveryReport.totals.transactionCount} transaksi
                  </p>
                </div>
                <button
                  onClick={downloadDeliveryExcel}
                  disabled={downloading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-60 focus:ring-4 focus:ring-green-400/50 focus:outline-none"
                >
                  {downloading ? 'Mengunduh...' : '⬇️ Download Excel'}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">Pendapatan</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(deliveryReport.totals.revenue)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">HPP</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(deliveryReport.totals.hpp)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">Pengeluaran</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(deliveryReport.totals.expenses)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">Keuntungan</p>
                  <p className={`text-lg font-bold ${deliveryReport.totals.profit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(deliveryReport.totals.profit)}
                  </p>
                </div>
              </div>

              {deliveryReport.deliveries.length === 0 ? (
                <p className="text-center py-6 text-gray-500">Tidak ada pengiriman pada tanggal ini</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pengiriman</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kendaraan</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Transaksi</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Pendapatan</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">HPP</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Pengeluaran</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Keuntungan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {deliveryReport.deliveries.map((d) => (
                        <tr key={d._id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <Link
                              href={`/dashboard/deliveries/${d._id}`}
                              className="font-mono font-semibold text-amber-700 hover:underline"
                            >
                              {d.deliveryNumber}
                            </Link>
                            <div className="text-xs text-gray-600">{d.name}</div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{d.vehicleName}</div>
                            <div className="text-xs text-gray-600">
                              {d.plateNumber ? `${d.plateNumber} · ` : ''}
                              {d.driverName}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">{d.transactionCount}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(d.revenue)}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(d.hpp)}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap text-orange-600">{formatCurrency(d.expenses)}</td>
                          <td
                            className={`px-3 py-2 text-right whitespace-nowrap font-bold ${d.profit < 0 ? 'text-red-600' : 'text-green-600'}`}
                          >
                            {formatCurrency(d.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 font-bold">
                      <tr>
                        <td className="px-3 py-2" colSpan={2}>
                          Total
                        </td>
                        <td className="px-3 py-2 text-center">{deliveryReport.totals.transactionCount}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(deliveryReport.totals.revenue)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(deliveryReport.totals.hpp)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap text-orange-600">
                          {formatCurrency(deliveryReport.totals.expenses)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right whitespace-nowrap ${deliveryReport.totals.profit < 0 ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {formatCurrency(deliveryReport.totals.profit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
              <p className="text-gray-500 text-sm font-medium">Total Penjualan</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {formatCurrency(dailyReport.totalSales)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <p className="text-gray-500 text-sm font-medium">Transaksi</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {dailyReport.totalTransactions}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <p className="text-gray-500 text-sm font-medium">Item Terjual</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {dailyReport.totalItems}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <p className="text-gray-500 text-sm font-medium">Rata-rata</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatCurrency(dailyReport.averageTransaction)}
              </p>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Metode Pembayaran</h3>
            <div className="space-y-3">
              {dailyReport.paymentMethods.map((pm, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {pm.method === 'cash' ? '💵' : pm.method === 'qris' ? '📱' : '💳'}
                    </span>
                    <div>
                      <div className="font-semibold uppercase">{pm.method}</div>
                      <div className="text-sm text-gray-600">{pm.count} transaksi</div>
                    </div>
                  </div>
                  <div className="font-bold text-blue-600">
                    {formatCurrency(pm.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Produk Terlaris</h3>
            <div className="space-y-3">
              {dailyReport.topProducts.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{item.product.name}</div>
                      <div className="text-sm text-gray-600">
                        SKU: {item.product.sku} | Terjual: {item.totalQuantity} unit
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-green-600">
                    {formatCurrency(item.totalRevenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly Sales Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Penjualan Per Jam</h3>
            <div className="flex items-end gap-2 h-64">
              {dailyReport.hourlySales.map((sales, hour) => {
                const maxSales = Math.max(...dailyReport.hourlySales);
                const height = maxSales > 0 ? (sales / maxSales) * 100 : 0;
                
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-amber-500 rounded-t hover:bg-amber-600 transition-colors relative group"
                      style={{ height: `${height}%`, minHeight: sales > 0 ? '8px' : '0' }}
                    >
                      {sales > 0 && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {formatCurrency(sales)}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{hour}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Inventory Report Tab */}
      {activeTab === 'inventory' && inventoryReport && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
              <p className="text-gray-500 text-sm font-medium">Total Produk</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">
                {inventoryReport.totalProducts}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
              <p className="text-gray-500 text-sm font-medium">Stok Rendah</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {inventoryReport.lowStock?.length || 0}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <p className="text-gray-500 text-sm font-medium">Stok Habis</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {inventoryReport.outOfStock?.length || 0}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <p className="text-gray-500 text-sm font-medium">Nilai Stok</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(inventoryReport.totalStockValue || 0)}
              </p>
            </div>
          </div>

          {/* Low Stock Products */}
          {inventoryReport.lowStock && inventoryReport.lowStock.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                ⚠️ Produk Stok Rendah
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Produk
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Stok
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Min Stok
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {inventoryReport.lowStock.map((product: any) => (
                      <tr key={product._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{product.sku}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{product.name}</div>
                          <div className="text-xs text-gray-600">{product.category.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-red-600">
                            {product.stock} {product.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {product.minStock} {product.unit}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            ⚠️ Rendah
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Out of Stock Products */}
          {inventoryReport.outOfStock && inventoryReport.outOfStock.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                🚫 Produk Stok Habis
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Produk
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Kategori
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {inventoryReport.outOfStock.map((product: any) => (
                      <tr key={product._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{product.sku}</td>
                        <td className="px-4 py-3 font-semibold">{product.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            {product.category.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            🚫 Habis
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Sales Tab */}
      {activeTab === 'daily' && dailyReport && (
        <div className="space-y-6">
          {/* Already have stats cards above */}
        </div>
      )}
    </div>
  );
}
