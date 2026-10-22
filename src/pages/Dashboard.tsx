import { useState, useEffect } from 'react';
import { documentService } from '../services/documentService';
import { formatCurrency, toPersianDigits } from '../utils/jalali';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, 
  Users, AlertTriangle, ShoppingCart, BarChart3
} from 'lucide-react';

interface DashboardStats {
  totalSales: number;
  totalPurchases: number;
  todaySalesTotal: number;
  totalCustomerDebt: number;
  totalSupplierDebt: number;
  inventoryValue: number;
  lowStockCount: number;
  grossProfit: number;
  totalDocuments: number;
  salesCount: number;
  purchaseCount: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await documentService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'فروش امروز',
      value: formatCurrency(stats.todaySalesTotal),
      icon: ShoppingCart,
      color: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/50',
    },
    {
      title: 'کل فروش',
      value: formatCurrency(stats.totalSales),
      icon: TrendingUp,
      color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    },
    {
      title: 'کل خرید',
      value: formatCurrency(stats.totalPurchases),
      icon: TrendingDown,
      color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/50',
    },
    {
      title: 'سود ناخالص',
      value: formatCurrency(stats.grossProfit),
      icon: DollarSign,
      color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    },
    {
      title: 'بدهی مشتریان',
      value: formatCurrency(stats.totalCustomerDebt),
      icon: Users,
      color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-100 dark:bg-orange-900/50',
    },
    {
      title: 'بدهی به تأمین‌کنندگان',
      value: formatCurrency(stats.totalSupplierDebt),
      icon: DollarSign,
      color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
    },
    {
      title: 'ارزش موجودی',
      value: formatCurrency(stats.inventoryValue),
      icon: Package,
      color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/50',
    },
    {
      title: 'کالاهای کم‌موجود',
      value: toPersianDigits(stats.lowStockCount),
      icon: AlertTriangle,
      color: stats.lowStockCount > 0 ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
      iconBg: stats.lowStockCount > 0 ? 'bg-yellow-100 dark:bg-yellow-900/50' : 'bg-gray-100 dark:bg-gray-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div key={index} className={`${card.color} rounded-xl p-5 border border-opacity-20`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`${card.iconBg} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            خلاصه عملیات
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">تعداد فاکتورهای فروش</span>
              <span className="font-bold text-gray-900 dark:text-white">{toPersianDigits(stats.salesCount)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">تعداد فاکتورهای خرید</span>
              <span className="font-bold text-gray-900 dark:text-white">{toPersianDigits(stats.purchaseCount)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">مجموع اسناد</span>
              <span className="font-bold text-gray-900 dark:text-white">{toPersianDigits(stats.totalDocuments)}</span>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" />
            وضعیت سیستم
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">وضعیت دیتابیس</span>
              <span className="text-green-600 dark:text-green-400 font-medium">فعال ✓</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">حالت کار</span>
              <span className="text-green-600 dark:text-green-400 font-medium">آفلاین ✓</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">نسخه برنامه</span>
              <span className="text-gray-900 dark:text-white font-medium">۱.۰.۰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">هشدار موجودی کم</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-300">
                {toPersianDigits(stats.lowStockCount)} کالا موجودی کم دارند. لطفاً بررسی کنید.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
