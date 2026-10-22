import { useState, useEffect } from 'react';
import { documentService, SaleLineInput } from '../services/documentService';
import { productService } from '../services/productService';
import { partyService } from '../services/partyService';
import { Product, Party } from '../db/database';
import { formatCurrency, toPersianDigits, todayJalali } from '../utils/jalali';
import { Plus, Trash2, ShoppingCart, Search, X } from 'lucide-react';

interface SaleLine {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  serialId?: number;
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Party[]>([]);
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number>(0);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isWholesale, setIsWholesale] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [prods, custs] = await Promise.all([
      productService.getAll(),
      partyService.getAll('customer'),
    ]);
    setProducts(prods);
    setCustomers(custs);
    if (custs.length > 0) {
      const cashCustomer = custs.find(c => c.name === 'مشتری نقدی');
      if (cashCustomer) setSelectedCustomer(cashCustomer.id!);
    }
  }

  function addProduct(product: Product) {
    const existing = lines.find(l => l.productId === product.id);
    if (existing) {
      setLines(lines.map(l => l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
    } else {
      const price = isWholesale ? product.wholesalePrice / 100 : product.retailPrice / 100;
      setLines([...lines, {
        productId: product.id!,
        productName: product.name,
        quantity: 1,
        unitPrice: price,
        discount: 0,
      }]);
    }
    setShowProductSearch(false);
    setProductSearch('');
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof SaleLine, value: number) {
    setLines(lines.map((l, i) => i === index ? { ...l, [field]: value } : l));
  }

  const subtotal = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice * 100 - l.discount * 100), 0);
  const total = subtotal - discount * 100;
  const remaining = total - paidAmount * 100;

  async function handleSubmit() {
    setError('');
    setSuccess('');

    if (lines.length === 0) { setError('حداقل یک قلم اضافه کنید'); return; }
    if (!selectedCustomer) { setError('مشتری را انتخاب کنید'); return; }

    setLoading(true);
    const warehouse = (await productService.getDefaultWarehouse());
    
    const saleLines: SaleLineInput[] = lines.map(l => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: Math.round(l.unitPrice * 100),
      discount: Math.round(l.discount * 100),
      serialId: l.serialId,
    }));

    const result = await documentService.createSale({
      partyId: selectedCustomer,
      date,
      lines: saleLines,
      discount: Math.round(discount * 100),
      paidAmount: Math.round(paidAmount * 100),
      warehouseId: warehouse?.id || 1,
      isWholesale,
      notes,
    });

    if (result.success) {
      setSuccess('فاکتور فروش با موفقیت ثبت شد');
      setLines([]);
      setDiscount(0);
      setPaidAmount(0);
      setNotes('');
    } else {
      setError(result.error || 'خطا در ثبت فاکتور');
    }
    setLoading(false);
  }

  const filteredProducts = productSearch
    ? products.filter(p => p.name.includes(productSearch) || p.sku.includes(productSearch) || (p.barcode && p.barcode.includes(productSearch)))
    : products.slice(0, 20);

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">{error}</div>}
      {success && <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاریخ</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مشتری</label>
                <select value={selectedCustomer} onChange={e => setSelectedCustomer(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isWholesale} onChange={e => setIsWholesale(e.target.checked)}
                    className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">فروش عمده</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاریخ شمسی</label>
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                  {todayJalali()}
                </div>
              </div>
            </div>
          </div>

          {/* Lines */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">اقلام فاکتور</h3>
              <button onClick={() => setShowProductSearch(true)}
                className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 flex items-center gap-1">
                <Plus className="w-4 h-4" /> افزودن کالا
              </button>
            </div>
            
            {lines.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>برای شروع، کالا اضافه کنید</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="text-right text-xs font-medium text-gray-500 px-3 py-2">کالا</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-3 py-2 w-20">مقدار</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-3 py-2 w-28">قیمت واحد</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-3 py-2 w-24">تخفیف</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-3 py-2 w-28">مجموع</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {lines.map((line, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{line.productName}</td>
                        <td className="px-3 py-2">
                          <input type="number" value={line.quantity} onChange={e => updateLine(i, 'quantity', Number(e.target.value))}
                            min="1" className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', Number(e.target.value))}
                            min="0" step="0.01" className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" value={line.discount} onChange={e => updateLine(i, 'discount', Number(e.target.value))}
                            min="0" step="0.01" className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(Math.round(line.quantity * line.unitPrice * 100 - line.discount * 100))}
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeLine(i)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">یادداشت</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 sticky top-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">خلاصه فاکتور</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">جمع کل</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">تخفیف (؋)</span>
                <input type="number" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))}
                  min="0" step="0.01" className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-left bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900 dark:text-white">مبلغ نهایی</span>
                  <span className="font-bold text-lg text-primary-600">{formatCurrency(total)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">مبلغ پرداختی (؋)</span>
                <input type="number" value={paidAmount || ''} onChange={e => setPaidAmount(Number(e.target.value))}
                  min="0" step="0.01" className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-left bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">باقی‌مانده</span>
                <span className={`font-medium ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.max(0, remaining))}
                </span>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading}
              className="w-full mt-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
              {loading ? 'در حال ثبت...' : 'ثبت فاکتور فروش'}
            </button>
          </div>
        </div>
      </div>

      {/* Product Search Modal */}
      {showProductSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">انتخاب کالا</h3>
              <button onClick={() => setShowProductSearch(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  placeholder="جست‌وجوی نام، کد یا بارکد..." autoFocus
                  className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-0">
              <div className="space-y-1">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => addProduct(p)}
                    className="w-full text-right p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{p.name}</p>
                        <p className="text-xs text-gray-500">کد: {p.sku}</p>
                      </div>
                      <span className="text-sm font-medium text-primary-600">
                        {formatCurrency(isWholesale ? p.wholesalePrice : p.retailPrice)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
