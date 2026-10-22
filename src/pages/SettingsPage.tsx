import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { authService } from '../services/authService';
import { User } from '../db/database';
import { formatJalali } from '../utils/jalali';
import { Settings, User as UserIcon, Lock, Moon, Sun, Database, Shield, Download } from 'lucide-react';
import { db } from '../db/database';

export default function SettingsPage() {
  const { user, darkMode, toggleDarkMode } = useAppStore();
  const [tab, setTab] = useState<'profile' | 'security' | 'appearance' | 'backup' | 'about'>('profile');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 flex-wrap">
        {[
          { id: 'profile', label: 'پروفایل', icon: UserIcon },
          { id: 'security', label: 'امنیت', icon: Lock },
          { id: 'appearance', label: 'ظاهر', icon: darkMode ? Moon : Sun },
          { id: 'backup', label: 'پشتیبان‌گیری', icon: Database },
          { id: 'about', label: 'درباره سیستم', icon: Shield },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileSection user={user} />}
      {tab === 'security' && <SecuritySection />}
      {tab === 'appearance' && <AppearanceSection darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}
      {tab === 'backup' && <BackupSection />}
      {tab === 'about' && <AboutSection />}
    </div>
  );
}

function ProfileSection({ user }: { user: User | null }) {
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleSave() {
    if (!user) return;
    const result = await authService.updateProfile(user.id!, { fullName, email });
    if (result.success) {
      setSuccess('پروفایل بروزرسانی شد');
      setError('');
    } else {
      setError(result.error || 'خطا');
      setSuccess('');
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 max-w-lg">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">مشخصات مدیر</h3>
      
      {success && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">{success}</div>}
      {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام کاربری</label>
          <input type="text" value={user?.username || ''} disabled
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 cursor-not-allowed" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام کامل</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ایمیل</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <button onClick={handleSave} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
          ذخیره تغییرات
        </button>
      </div>
    </div>
  );
}

function SecuritySection() {
  const { user } = useAppStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleChangePassword() {
    if (!user) return;
    if (newPassword !== confirmPassword) { setError('رمز جدید و تکرار آن مطابقت ندارند'); return; }
    
    const result = await authService.changePassword(user.id!, currentPassword, newPassword);
    if (result.success) {
      setSuccess('رمز عبور تغییر کرد');
      setError('');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } else {
      setError(result.error || 'خطا');
      setSuccess('');
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 max-w-lg">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">تغییر رمز عبور</h3>
      
      {success && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">{success}</div>}
      {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رمز فعلی</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رمز جدید</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تکرار رمز جدید</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <button onClick={handleChangePassword} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
          تغییر رمز عبور
        </button>
      </div>
    </div>
  );
}

function AppearanceSection({ darkMode, toggleDarkMode }: { darkMode: boolean; toggleDarkMode: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 max-w-lg">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">تنظیمات ظاهری</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">حالت تاریک</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">تغییر ظاهر برنامه به حالت تاریک</p>
          </div>
          <button onClick={toggleDarkMode}
            className={`relative w-14 h-7 rounded-full transition-colors ${darkMode ? 'bg-primary-600' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${darkMode ? 'left-0.5' : 'left-7'}`}></div>
          </button>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            انتخاب شما بین اجراها ذخیره می‌شود و در دفعات بعدی اعمال خواهد شد.
          </p>
        </div>
      </div>
    </div>
  );
}

function BackupSection() {
  const [status, setStatus] = useState('');

  async function handleBackup() {
    try {
      // Export all data as JSON
      const tables = [
        'users', 'products', 'categories', 'brands', 'units', 'warehouses',
        'parties', 'documents', 'documentLines', 'stockMovements', 'inventoryBalances',
        'payments', 'paymentAllocations', 'expenses', 'expenseCategories',
        'productSerials', 'warranties', 'serviceOrders', 'cashSessions',
        'journalEntries', 'journalEntryLines', 'financialAccounts', 'chartOfAccounts',
        'appSettings', 'fiscalPeriods', 'auditLogs', 'backupHistory'
      ];

      const backup: Record<string, any[]> = {};
      for (const table of tables) {
        backup[table] = await (db as any)[table].toArray();
      }

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imperial-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus('پشتیبان با موفقیت ایجاد و دانلود شد');
    } catch (err) {
      setStatus('خطا در ایجاد پشتیبان');
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 max-w-lg">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">پشتیبان‌گیری و بازیابی</h3>
      
      {status && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">{status}</div>}

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-primary-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">پشتیبان‌گیری دستی</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">دانلود نسخه پشتیبان از تمام اطلاعات</p>
            </div>
          </div>
          <button onClick={handleBackup}
            className="mt-3 w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            دانلود پشتیبان
          </button>
        </div>

        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>توصیه:</strong> به‌طور منظم از اطلاعات پشتیبان تهیه کنید و نسخه‌ها را در مکان امن نگهداری نمایید.
            در صورت خرابی کمپیوتر، با فایل پشتیبان می‌توانید اطلاعات را بازیابی کنید.
          </p>
        </div>
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 max-w-lg">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">درباره سیستم</h3>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white">امپریال تکنالوژی</h4>
            <p className="text-sm text-gray-500">سیستم مدیریت فروشگاه</p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: 'نسخه', value: '۱.۰.۰' },
            { label: 'تاریخ', value: formatJalali(new Date()) },
            { label: 'واحد پول', value: 'افغانی (؋)' },
            { label: 'زبان', value: 'دری/فارسی' },
            { label: 'جهت', value: 'راست‌چین (RTL)' },
            { label: 'ذخیره‌سازی', value: 'محلی (IndexedDB)' },
            { label: 'وضعیت اینترنت', value: 'آفلاین' },
          ].map((item, i) => (
            <div key={i} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
              <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
