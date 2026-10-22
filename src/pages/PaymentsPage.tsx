import { useState, useEffect } from 'react';
import { documentService } from '../services/documentService';
import { expenseService } from '../services/expenseService';
import { partyService } from '../services/partyService';
import { Payment, Expense, Party, ExpenseCategory } from '../db/database';
import { formatCurrency, toPersianDigits, todayJalali, formatJalali } from '../utils/jalali';
import { Plus, DollarSign, FileText, X } from 'lucide-react';

export default function PaymentsPage() {
  const [tab, setTab] = useState<'payments' | 'expenses'>('payments');
  
  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setTab('payments')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'payments' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          دریافت و پرداخت
        </button>
        <button onClick={() => setTab('expenses')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'expenses' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          مصارف
        </button>
      </div>

      {tab === 'payments' ? <PaymentsSection /> : <ExpensesSection />}
    </div>
  );
}

function PaymentsSection() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [partyId, setPartyId] = useState(0);
  const [paymentType, setPaymentType] = useState<'receipt' | 'payment'>('receipt');
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<'cash' | 'bank'>('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [pays, pts] = await Promise.all([
      documentService.getPayments(),
      partyService.getAll(),
    ]);
    setPayments(pays);
    setParties(pts);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!partyId || amount <= 0) { setError('طرف حساب و مبلغ الزامی است'); return; }

    const result = await documentService.createPayment({
      partyId, paymentType, amount: Math.round(amount * 100), method, notes,
    });

    if (result.success) {
      setShowForm(false); setPartyId(0); setAmount(0); setNotes('');
      await loadData();
    } else {
      setError(result.error || 'خطا');
    }
  }

  const receipts = payments.filter(p => p.paymentType === 'receipt');
  const payOuts = payments.filter(p => p.paymentType === 'payment');
  const totalReceipts = receipts.reduce((s, p) => s + p.amount, 0);
  const totalPayments = payOuts.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-600 dark:text-green-400">کل دریافتی</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(totalReceipts)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">کل پرداختی</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(totalPayments)}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-600 dark:text-blue-400">خالص</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totalReceipts - totalPayments)}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> ثبت جدید
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">تاریخ</th>
              <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">نوع</th>
              <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">طرف حساب</th>
              <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">مبلغ</th>
              <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">روش</th>
              <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">یادداشت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {payments.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-500">پرداختی ثبت نشده</td></tr>
            ) : payments.map(p => {
              const party = parties.find(pt => pt.id === p.partyId);
              return (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatJalali(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${p.paymentType === 'receipt' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                      {p.paymentType === 'receipt' ? 'دریافت' : 'پرداخت'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{party?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{p.method === 'cash' ? 'نقدی' : p.method === 'bank' ? 'بانکی' : 'چک'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.notes || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">ثبت دریافت/پرداخت</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع</label>
                <select value={paymentType} onChange={e => setPaymentType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="receipt">دریافت از مشتری</option>
                  <option value="payment">پرداخت به تأمین‌کننده</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">طرف حساب</label>
                <select value={partyId} onChange={e => setPartyId(Number(e.target.value))} required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value={0}>انتخاب کنید</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مبلغ (؋)</label>
                <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} min="0" step="0.01" required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">روش پرداخت</label>
                <select value={method} onChange={e => setMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="cash">نقدی</option>
                  <option value="bank">بانکی</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">یادداشت</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">ثبت</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpensesSection() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [exps, cats] = await Promise.all([
      expenseService.getAll(),
      expenseService.getCategories(),
    ]);
    setExpenses(exps);
    setCategories(cats);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (amount <= 0 || !description.trim()) { setError('مبلغ و شرح الزامی است'); return; }

    const result = await expenseService.create({
      date, categoryId, amount: Math.round(amount * 100), paymentMethod: 'cash', description,
    });

    if (result.success) {
      setShowForm(false); setAmount(0); setDescription(''); setCategoryId(undefined);
      await loadData();
    } else {
      setError(result.error || 'خطا');
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-600 dark:text-red-400">کل مصارف</p>
        <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(totalExpenses)}</p>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> ثبت مصرف
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">تاریخ</th>
              <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">دسته</th>
              <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">شرح</th>
              <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">مبلغ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {expenses.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-500">مصرفی ثبت نشده</td></tr>
            ) : expenses.map(exp => {
              const cat = categories.find(c => c.id === exp.categoryId);
              return (
                <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatJalali(exp.date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{cat?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{exp.description}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(exp.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">ثبت مصرف</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاریخ</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">دسته</label>
                <select value={categoryId || ''} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">انتخاب نشده</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مبلغ (؋)</label>
                <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} min="0" step="0.01" required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">شرح *</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">ثبت</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
