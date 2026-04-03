'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const menuItems = [
  { 
    name: 'Dashboard', 
    icon: '📊', 
    path: '/dashboard',
    description: 'Overview & Analytics'
  },
  { 
    name: 'Kasir / POS', 
    icon: '🛒', 
    path: '/dashboard/pos',
    description: 'Point of Sale',
    highlight: true
  },
  { 
    name: 'Produk', 
    icon: '📦', 
    path: '/dashboard/products',
    description: 'Product Management'
  },
  { 
    name: 'Inventori', 
    icon: '📋', 
    path: '/dashboard/inventory',
    description: 'Purchase Orders'
  },
  { 
    name: 'Pelanggan', 
    icon: '👥', 
    path: '/dashboard/customers',
    description: 'Customer Database'
  },
  { 
    name: 'Resep & BOM', 
    icon: '🍳', 
    path: '/dashboard/recipes',
    description: 'Recipe Management'
  },
  { 
    name: 'Laporan', 
    icon: '📈', 
    path: '/dashboard/reports',
    description: 'Sales & Inventory Reports'
  },
  { 
    name: 'Shift', 
    icon: '🕐', 
    path: '/dashboard/shifts',
    description: 'Shift Management'
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userName, setUserName] = useState('User');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Load username from localStorage on client-side only
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        setUserName(parsedUser.name || 'User');
      } catch {
        setUserName('User');
      }
    }

    // Update date and time on client-side only
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));
      setCurrentTime(now.toLocaleTimeString('id-ID'));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-72 bg-linear-to-b from-blue-600 to-blue-700 text-white shadow-2xl">
        {/* Logo */}
        <div className="p-6 border-b border-blue-500">
          <h1 className="text-2xl font-bold">POS UMKM</h1>
          <p className="text-xs text-blue-200 mt-1">Point of Sale System</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 overflow-y-auto h-[calc(100vh-180px)]">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`
                  flex items-start gap-3 px-4 py-3 rounded-lg mb-2 transition-all
                  ${isActive 
                    ? 'bg-white text-blue-700 shadow-lg font-semibold' 
                    : 'hover:bg-blue-500/50 text-white'
                  }
                  ${item.highlight ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-blue-600' : ''}
                `}
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className={`text-xs ${isActive ? 'text-blue-600' : 'text-blue-200'}`}>
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 w-72 bg-blue-800 p-4 border-t border-blue-600">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 hover:bg-blue-700 p-3 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold">
                {userName[0].toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">{userName}</div>
                <div className="text-xs text-blue-300">Administrator</div>
              </div>
              <span className="text-xl">⚙️</span>
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl py-2 text-gray-700">
                <button
                  className="w-full px-4 py-2 hover:bg-gray-100 text-left flex items-center gap-2"
                  onClick={() => alert('Profil - Coming Soon')}
                >
                  <span>👤</span> Profil
                </button>
                <button
                  className="w-full px-4 py-2 hover:bg-gray-100 text-left flex items-center gap-2"
                  onClick={() => alert('Pengaturan - Coming Soon')}
                >
                  <span>⚙️</span> Pengaturan
                </button>
                <hr className="my-2" />
                <button
                  className="w-full px-4 py-2 hover:bg-red-50 text-red-600 text-left flex items-center gap-2 font-medium"
                  onClick={handleLogout}
                >
                  <span>🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {menuItems.find(item => item.path === pathname)?.name || 'Dashboard'}
              </h2>
              <p className="text-sm text-gray-500">
                {menuItems.find(item => item.path === pathname)?.description || 'Welcome back'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700">
                  {currentDate}
                </div>
                <div className="text-xs text-gray-500">
                  {currentTime}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
