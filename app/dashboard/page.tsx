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
      <div className="bg-linear-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-8 mb-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Selamat Datang, {user?.name}! 👋</h1>
        <p className="text-blue-100">Berikut ringkasan bisnis Anda hari ini</p>
      </div>

      {/* Active Shift Alert */}
      {stats.activeShift && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-lg">
          <div className="flex items-center">
            <div className="shrink-0">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Shift Aktif - {stats.activeShift.cashierName}
              </p>
              <p className="text-xs text-green-700 mt-1">
                Mulai: {new Date(stats.activeShift.startTime).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Penjualan Hari Ini</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(stats.todaySales)}
              </p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <span className="text-3xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Transaksi</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {stats.todayTransactions}
              </p>
              <p className="text-xs text-gray-500 mt-1">Hari ini</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <span className="text-3xl">🛒</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Produk</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {stats.totalProducts}
              </p>
              {stats.lowStockProducts > 0 && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  ⚠️ {stats.lowStockProducts} stok rendah
                </p>
              )}
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <span className="text-3xl">📦</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Pelanggan</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {stats.totalCustomers}
              </p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <span className="text-3xl">👥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/pos"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🛒</span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Buka Kasir</span>
          </Link>

          <Link
            href="/dashboard/products"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📦</span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-purple-600">Kelola Produk</span>
          </Link>

          <Link
            href="/dashboard/reports"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📈</span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-green-600">Lihat Laporan</span>
          </Link>

          <Link
            href="/dashboard/inventory"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all group"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📋</span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600">Purchase Order</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
