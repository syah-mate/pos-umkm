'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const menuItems = [
  { 
    name: 'Dashboard', 
    icon: '📊', 
    path: '/dashboard'
  },
  { 
    name: 'Kasir', 
    icon: '🛒', 
    path: '/dashboard/pos',
    highlight: true
  },
  { 
    name: 'Produk', 
    icon: '📦', 
    path: '/dashboard/products'
  },
  { 
    name: 'Purchase Orders', 
    icon: '📋', 
    path: '/dashboard/inventory'
  },
  { 
    name: 'Pelanggan', 
    icon: '👥', 
    path: '/dashboard/customers'
  },
  { 
    name: 'Resep & BOM', 
    icon: '🍳', 
    path: '/dashboard/recipes'
  },
  { 
    name: 'Laporan', 
    icon: '📈', 
    path: '/dashboard/reports'
  },
  { 
    name: 'Shift', 
    icon: '🕐', 
    path: '/dashboard/shifts'
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
      <aside className="w-56 bg-linear-to-b from-amber-50 to-stone-100 text-gray-800 shadow-lg border-r border-stone-200" role="navigation" aria-label="Main navigation">
        {/* Logo */}
        <div className="py-4 px-2 border-b border-stone-200 flex items-center justify-center">
          <Image 
            src="/logo.png" 
            alt="Lentera POS" 
            width={800} 
            height={200}
            priority
            className="w-auto h-16"
          />
        </div>

        {/* Navigation */}
        <nav className="p-3 overflow-y-auto h-[calc(100vh-152px)]">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  flex items-start gap-2 px-3 py-2 rounded-lg mb-1.5 transition-all focus:ring-2 focus:ring-amber-400 focus:outline-none
                  ${isActive 
                    ? 'bg-amber-100 text-amber-900 shadow-sm font-semibold border border-amber-200' 
                    : 'hover:bg-stone-100 text-gray-700 hover:text-gray-900'
                  }
                  ${item.highlight ? 'ring-1 ring-amber-300' : ''}
                `}
              >
                <span className="text-lg" aria-hidden="true">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{item.name}</div>
                  {/* <div className={`text-xs ${isActive ? 'text-amber-700' : 'text-stone-500'}`}>
                    {item.description}
                  </div> */}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 w-56 bg-stone-100 p-3 border-t border-stone-200">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-expanded={showUserMenu}
              aria-haspopup="true"
              className="w-full flex items-center gap-2 hover:bg-stone-200 p-2 rounded-lg transition-colors focus:ring-2 focus:ring-amber-400 focus:outline-none"
            >
              <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center font-bold text-sm text-amber-900" aria-hidden="true">
                {userName[0].toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm text-gray-900">{userName}</div>
                <div className="text-xs text-stone-600">Administrator</div>
              </div>
              <span className="text-base" aria-hidden="true">⚙️</span>
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl py-1 text-gray-900 border border-stone-200" role="menu">
                <button
                  className="w-full px-3 py-2 hover:bg-amber-50 text-left flex items-center gap-2 text-sm focus:bg-amber-50 focus:outline-none"
                  onClick={() => alert('Profil - Coming Soon')}
                  role="menuitem"
                >
                  <span aria-hidden="true">👤</span> Profil
                </button>
                <button
                  className="w-full px-3 py-2 hover:bg-amber-50 text-left flex items-center gap-2 text-sm focus:bg-amber-50 focus:outline-none"
                  onClick={() => alert('Pengaturan - Coming Soon')}
                  role="menuitem"
                >
                  <span aria-hidden="true">⚙️</span> Pengaturan
                </button>
                <hr className="my-1" />
                <button
                  className="w-full px-3 py-2 hover:bg-red-50 text-red-700 text-left flex items-center gap-2 font-semibold text-sm focus:bg-red-50 focus:outline-none"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <span aria-hidden="true">🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-2.5 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {menuItems.find(item => item.path === pathname)?.name || 'Dashboard'}
              </h2>
              {/* <p className="text-xs text-gray-700">
                {menuItems.find(item => item.path === pathname)?.description || 'Welcome back'}
              </p> */}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {currentDate}
                </div>
                <div className="text-xs text-gray-700">
                  {currentTime}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
