import { useState, useEffect } from 'react';
import { documentService } from '../services/documentService';
import { productService } from '../services/productService';
import { partyService } from '../services/partyService';
import { Document, Product, Party } from '../db/database';
import { formatCurrency, formatJalali, toPersianDigits } from '../utils/jalali';
import { FileText, TrendingUp, TrendingDown, Package } from 'lucide-react';

export default function ReportsPage() {
  const [tab, setTab] = useState<'sales' | 'purchases' | 'inventory' | 'parties'>('sales');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [parties, setParties] = useState<Party[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [docs, prods, pts] = await Promise.all([
      documentService.getAll(),
      productService.getAll(),
      partyService.getAll(),
    ]);
    setDocuments(docs);
    setProducts(prods);
    setParties(pts);
  }

  const salesDocs = documents.filter(d => d.docType === 'sale' && d.status === 'posted');
  const purchaseDocs = documents.filter(d => d.docType === 'purchase' && d.status === 'posted');
  const totalSales = salesDocs.reduce((s, d) => s + d.total, 0);
  const totalPurchases = purchaseDocs.reduce((s, d) => s + d.total, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-600 dark:text-green-400">کل فروش</p>
          </div>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(totalSales)}</p>
          <p className="text-xs text-green-500 mt-1">{toPersianDigits(salesDocs.length)} فاکتور</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-blue-600 dark:text-blue-400">کل خرید</p>
          </div>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totalPurchases)}</p>
          <p className="text-xs text-blue-500 mt-1">{toPersianDigits(purchaseDocs.length)} فاکتور</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-purple-600" />
            <p className="text-sm text-purple-600 dark:text-purple-400">تعداد کالاها</p>
          </div>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{toPersianDigits(products.length)}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-orange-600" />
            <p className="text-sm text-orange-600 dark:text-orange-400">کل اسناد</p>
          </div>
          <p className="text-xl font-bold text-orange-700 dark:text-orange-300">{toPersianDigits(documents.length)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['sales', 'purchases', 'inventory', 'parties'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'sales' ? 'گزارش فروش' : t === 'purchases' ? 'گزارش خرید' : t === 'inventory' ? 'موجودی' : 'طرف حساب'}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'sales' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">شماره</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">تاریخ</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">مشتری</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">مبلغ</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">پرداختی</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">باقی‌مانده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {salesDocs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">فاکتور فروشی ثبت نشده</td></tr>
              ) : salesDocs.map(d => {
                const party = parties.find(p => p.id === d.partyId);
                return (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{d.docNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatJalali(d.date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{party?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(d.total)}</td>
                    <td className="px-4 py-3 text-sm text-green-600">{formatCurrency(d.paidAmount)}</td>
                    <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(d.remainingAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'purchases' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">شماره</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">تاریخ</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">تأمین‌کننده</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">مبلغ</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">پرداختی</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">باقی‌مانده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {purchaseDocs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">فاکتور خریدی ثبت نشده</td></tr>
              ) : purchaseDocs.map(d => {
                const party = parties.find(p => p.id === d.partyId);
                return (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{d.docNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatJalali(d.date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{party?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(d.total)}</td>
                    <td className="px-4 py-3 text-sm text-green-600">{formatCurrency(d.paidAmount)}</td>
                    <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(d.remainingAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-500 dark:text-gray-400">برای گزارش موجودی به صفحه انبار مراجعه کنید.</p>
        </div>
      )}

      {tab === 'parties' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">نام</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">نوع</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">تلفن</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">مانده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {parties.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{p.type === 'customer' ? 'مشتری' : p.type === 'supplier' ? 'تأمین‌کننده' : 'هر دو'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{p.phone || '-'}</td>
                  <td className={`px-4 py-3 text-sm font-medium ${p.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(p.currentBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
