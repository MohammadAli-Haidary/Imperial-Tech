import React from 'react';
import { useAppStore } from '../store/appStore';
import { formatJalali, toPersianDigits } from '../utils/jalali';
import { 
  LayoutDashboard, Package, ShoppingCart, DollarSign, Users, 
  Warehouse, FileText, Settings, Moon, Sun, Menu, LogOut, 
  TrendingUp, Wrench, Shield
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'products', label: 'کالاها', icon: Package },
  { id: 'sales', label: 'فروش', icon: ShoppingCart },
  { id: 'purchases', label: 'خرید', icon: TrendingUp },
  { id: 'parties', label: 'مشتریان و تأمین‌کنندگان', icon: Users },
  { id: 'inventory', label: 'انبار', icon: Warehouse },
  { id: 'payments', label: 'دریافت و پرداخت', icon: DollarSign },
  { id: 'expenses', label: 'مصارف', icon: FileText },
  { id: 'reports', label: 'گزارش‌ها', icon: FileText },
  { id: 'warranty', label: 'ضمانت و تعمیر', icon: Wrench },
  { id: 'settings', label: 'تنظیمات', icon: Settings },
];

export default function Layout({ children }: LayoutProps) {
  const { darkMode, toggleDarkMode, sidebarOpen, toggleSidebar, currentPage, setCurrentPage, user, logout } = useAppStore();

  const today = formatJalali(new Date());

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col shadow-sm`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700 px-4">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary-600" />
              <span className="font-bold text-lg text-primary-700 dark:text-primary-400">امپریال تکنالوژی</span>
            </div>
          ) : (
            <Shield className="w-7 h-7 text-primary-600" />
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors text-right
                ${currentPage === item.id 
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User info */}
        {sidebarOpen && user && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <span className="text-primary-700 dark:text-primary-300 text-sm font-bold">
                  {user.fullName.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.fullName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.username}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {menuItems.find(m => m.id === currentPage)?.label || 'داشبورد'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {toPersianDigits(today)}
            </span>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
