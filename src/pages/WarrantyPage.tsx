import { useState } from 'react';
import { Wrench, Shield, AlertCircle } from 'lucide-react';

export default function WarrantyPage() {
  const [tab, setTab] = useState<'warranty' | 'repair'>('warranty');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setTab('warranty')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'warranty' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          ضمانت‌نامه‌ها
        </button>
        <button onClick={() => setTab('repair')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'repair' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          پرونده‌های تعمیر
        </button>
      </div>

      {tab === 'warranty' ? <WarrantySection /> : <RepairSection />}
    </div>
  );
}

function WarrantySection() {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-primary-300 dark:text-primary-600" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">مدیریت ضمانت‌نامه‌ها</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          ضمانت‌نامه‌ها به‌طور خودکار هنگام فروش دستگاه‌های سریال‌دار ایجاد می‌شوند.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">ضمانت فعال</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">۰</p>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">نزدیک به پایان</p>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">۰</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">ادعای ضمانتی</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">۰</p>
          </div>
        </div>
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-right">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">راهنما</p>
              <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                هنگام فروش دستگاه سریال‌دار، ضمانت‌نامه بر اساس روزهای ضمانت تعریف‌شده برای کالا ایجاد می‌شود.
                تاریخ شروع ضمانت، تاریخ فروش است.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RepairSection() {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
        <Wrench className="w-16 h-16 mx-auto mb-4 text-primary-300 dark:text-primary-600" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">پرونده‌های تعمیرات</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          مدیریت پرونده‌های تعمیر، پیگیری وضعیت و ثبت قطعات مصرفی
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">دریافت شده</p>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">۰</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">در حال تعمیر</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">۰</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm text-purple-600 dark:text-purple-400">منتظر قطعه</p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">۰</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">تحویل شده</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">۰</p>
          </div>
        </div>
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-right">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">راهنما</p>
              <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                برای ایجاد پرونده تعمیر، مشتری و دستگاه مورد نظر را مشخص کنید.
                قطعات مصرفی از انبار خارج و هزینه خدمات قابل صورتحساب خواهد بود.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
