'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  totalProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  activeShift: {
    cashierName: string;
    startTime: string;
  } | null;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayTransactions: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalCustomers: 0,
    activeShift: null,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/');
      return;
    }

    try {
      setUser(JSON.parse(userData));
      loadDashboardStats(token);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/');
      return;
    }

    setLoading(false);
  }, [router]);

  const loadDashboardStats = async (token: string) => {
    try {
      // Fetch daily report
      const today = new Date().toISOString().split('T')[0];
      const reportRes = await fetch(`/api/reports/daily?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setStats(prev => ({
          ...prev,
          todaySales: reportData.data?.totalSales || 0,
          todayTransactions: reportData.data?.totalTransactions || 0,
        }));
      }

      // Fetch inventory report
      const inventoryRes = await fetch('/api/reports/inventory', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        setStats(prev => ({
          ...prev,
          totalProducts: inventoryData.data?.totalProducts || 0,
          lowStockProducts: inventoryData.data?.lowStock?.length || 0,
        }));
      }

      // Fetch total customers
      const customersRes = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setStats(prev => ({
          ...prev,
          totalCustomers: customersData.data?.length || 0,
        }));
      }

      // Fetch active shifts
      const shiftsRes = await fetch('/api/shifts?status=open', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json();
        const activeShift = shiftsData.data?.[0];
        if (activeShift) {
          setStats(prev => ({
            ...prev,
            activeShift: {
              cashierName: activeShift.cashierName,
              startTime: activeShift.startTime,
            },
          }));
        }
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl">Loading...</div>
      </div>
    );
  };

  return (
    <div>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-100 to-stone-200 rounded-2xl shadow-lg p-6 mb-6 border border-amber-200">
        <h1 className="text-2xl font-bold mb-1 text-amber-900">Selamat Datang, {user?.name}! 👋</h1>
        <p className="text-stone-700 text-sm">Berikut ringkasan bisnis Anda hari ini</p>
      </div>

      {/* Active Shift Alert */}
      {stats.activeShift && (
        <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-6 rounded-lg" role="status" aria-live="polite">
          <div className="flex items-center">
            <div className="shrink-0">
              <span className="text-2xl" aria-hidden="true">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-base font-semibold text-green-800">
                Shift Aktif - {stats.activeShift.cashierName}
              </p>
              <p className="text-sm text-green-800 mt-1">
                Mulai: {new Date(stats.activeShift.startTime).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 text-sm font-semibold">Penjualan Hari Ini</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.todaySales)}
              </p>
            </div>
            <div className="bg-amber-100 rounded-full p-2.5">
              <span className="text-2xl" aria-hidden="true">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 text-sm font-semibold">Transaksi</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.todayTransactions}
              </p>
              <p className="text-xs text-gray-700 mt-1">Hari ini</p>
            </div>
            <div className="bg-green-100 rounded-full p-2.5">
              <span className="text-2xl" aria-hidden="true">🛒</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 text-sm font-semibold">Total Produk</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.totalProducts}
              </p>
              {stats.lowStockProducts > 0 && (
                <p className="text-xs text-red-700 mt-1 font-semibold" role="alert">
                  <span aria-hidden="true">⚠️</span> {stats.lowStockProducts} stok rendah
                </p>
              )}
            </div>
            <div className="bg-purple-100 rounded-full p-2.5">
              <span className="text-2xl" aria-hidden="true">📦</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 text-sm font-semibold">Total Pelanggan</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.totalCustomers}
              </p>
            </div>
            <div className="bg-orange-100 rounded-full p-2.5">
              <span className="text-2xl" aria-hidden="true">👥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/pos"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all group focus:ring-4 focus:ring-amber-400/50 focus:outline-none"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform" aria-hidden="true">🛒</span>
            <span className="text-base font-semibold text-gray-900 group-hover:text-amber-800">Buka Kasir</span>
          </Link>

          <Link
            href="/dashboard/products"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-600 hover:bg-purple-50 transition-all group focus:ring-4 focus:ring-purple-500/50 focus:outline-none"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform" aria-hidden="true">📦</span>
            <span className="text-base font-semibold text-gray-900 group-hover:text-purple-700">Kelola Produk</span>
          </Link>

          <Link
            href="/dashboard/reports"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-600 hover:bg-green-50 transition-all group focus:ring-4 focus:ring-green-500/50 focus:outline-none"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform" aria-hidden="true">📈</span>
            <span className="text-base font-semibold text-gray-900 group-hover:text-green-700">Lihat Laporan</span>
          </Link>

          <Link
            href="/dashboard/inventory"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-600 hover:bg-orange-50 transition-all group focus:ring-4 focus:ring-orange-500/50 focus:outline-none"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform" aria-hidden="true">📋</span>
            <span className="text-base font-semibold text-gray-900 group-hover:text-orange-700">Purchase Order</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
