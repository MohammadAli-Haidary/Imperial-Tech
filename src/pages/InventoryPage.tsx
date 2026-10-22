import { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { Product, InventoryBalance } from '../db/database';
import { formatCurrency, toPersianDigits } from '../utils/jalali';
import { Package, AlertTriangle } from 'lucide-react';

export default function InventoryPage() {
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [bals, prods] = await Promise.all([
      productService.getAllInventoryBalances(),
      productService.getAll(),
    ]);
    setBalances(bals);
    setProducts(prods);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div></div>;

  const inventoryData = balances.map(b => {
    const product = products.find(p => p.id === b.productId);
    return { ...b, product };
  }).filter(d => d.product);

  const totalValue = balances.reduce((sum, b) => sum + b.totalCost, 0);
  const lowStockItems = inventoryData.filter(d => d.product && d.quantity <= d.product.minStock);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">تعداد اقلام</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{toPersianDigits(inventoryData.length)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ارزش کل موجودی</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${lowStockItems.length > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <AlertTriangle className={`w-6 h-6 ${lowStockItems.length > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">کم‌موجود</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{toPersianDigits(lowStockItems.length)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white">موجودی انبار</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">کد</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">نام کالا</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">موجودی</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">حداقل</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">بهای میانگین</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">ارزش</th>
                <th className="text-right text-sm font-medium text-gray-500 px-4 py-3">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {inventoryData.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">موجودی خالی است</td></tr>
              ) : inventoryData.map((item, i) => (
                <tr key={i} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${item.product && item.quantity <= item.product.minStock ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{item.product?.sku}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.product?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{toPersianDigits(item.quantity)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{toPersianDigits(item.product?.minStock || 0)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatCurrency(item.avgCost)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(item.totalCost)}</td>
                  <td className="px-4 py-3">
                    {item.product && item.quantity <= item.product.minStock ? (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full">کم‌موجود</span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full">موجود</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
