import { useState, useEffect } from 'react';
import { partyService } from '../services/partyService';
import { Party } from '../db/database';
import { formatCurrency, toPersianDigits } from '../utils/jalali';
import { Plus, Search, Edit, X, Users, UserPlus } from 'lucide-react';

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'customer' | 'supplier'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [type, setType] = useState<'customer' | 'supplier' | 'both'>('customer');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => { loadData(); }, [filter]);

  async function loadData() {
    const data = filter === 'all' ? await partyService.getAll() : await partyService.getAll(filter);
    setParties(data);
  }

  function resetForm() {
    setName(''); setType('customer'); setPhone(''); setEmail('');
    setAddress(''); setCreditLimit(0); setNotes(''); setError('');
    setEditingParty(null);
  }

  function openEdit(p: Party) {
    setEditingParty(p);
    setName(p.name); setType(p.type as any); setPhone(p.phone || '');
    setEmail(p.email || ''); setAddress(p.address || '');
    setCreditLimit((p.creditLimit || 0) / 100); setNotes(p.notes || '');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const data = {
      name, type, phone: phone || undefined, email: email || undefined,
      address: address || undefined, creditLimit: Math.round(creditLimit * 100) || undefined,
      notes: notes || undefined, isActive: true,
    };

    let result;
    if (editingParty) {
      result = await partyService.update(editingParty.id!, data);
    } else {
      result = await partyService.create(data);
    }

    if (result.success) {
      setShowForm(false); resetForm(); await loadData();
    } else {
      setError(result.error || 'خطا');
    }
  }

  const filtered = search
    ? parties.filter(p => p.name.includes(search) || (p.phone && p.phone.includes(search)))
    : parties;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="جست‌وجو..." className="pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-64" />
          </div>
          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            {(['all', 'customer', 'supplier'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm ${filter === f ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                {f === 'all' ? 'همه' : f === 'customer' ? 'مشتریان' : 'تأمین‌کنندگان'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> طرف حساب جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>طرف حسابی ثبت نشده</p>
          </div>
        ) : filtered.map(p => (
          <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{p.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  p.type === 'customer' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                  p.type === 'supplier' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                }`}>
                  {p.type === 'customer' ? 'مشتری' : p.type === 'supplier' ? 'تأمین‌کننده' : 'هر دو'}
                </span>
              </div>
              <button onClick={() => openEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                <Edit className="w-4 h-4" />
              </button>
            </div>
            {p.phone && <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">📞 {p.phone}</p>}
            {p.address && <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">📍 {p.address}</p>}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">مانده حساب:</span>
                <span className={`font-bold ${p.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(p.currentBalance)}
                </span>
              </div>
              {p.creditLimit ? (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">سقف اعتبار:</span>
                  <span className="text-gray-700 dark:text-gray-300">{formatCurrency(p.creditLimit)}</span>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editingParty ? 'ویرایش' : 'طرف حساب جدید'}</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع</label>
                <select value={type} onChange={e => setType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="customer">مشتری</option>
                  <option value="supplier">تأمین‌کننده</option>
                  <option value="both">هر دو</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تلفن</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ایمیل</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نشانی</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">سقف اعتبار (؋)</label>
                <input type="number" value={creditLimit || ''} onChange={e => setCreditLimit(Number(e.target.value))} min="0" step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">یادداشت</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
                  {editingParty ? 'بروزرسانی' : 'ذخیره'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
