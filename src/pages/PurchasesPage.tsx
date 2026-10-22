import { useState, useEffect } from 'react';
import { documentService, PurchaseLineInput } from '../services/documentService';
import { productService } from '../services/productService';
import { partyService } from '../services/partyService';
import { Product, Party } from '../db/database';
import { formatCurrency, todayJalali } from '../utils/jalali';
import { Plus, Trash2, Search, X } from 'lucide-react';

interface PurchaseLine {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  serials: Array<{ serialNumber: string; purchasePrice: number }>;
}

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number>(0);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [serialInput, setSerialInput] = useState<{ lineIndex: number; serials: string } | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [prods, sups] = await Promise.all([
      productService.getAll(),
      partyService.getAll('supplier'),
    ]);
    setProducts(prods);
    setSuppliers(sups);
  }

  function addProduct(product: Product) {
    const existing = lines.find(l => l.productId === product.id);
    if (existing) {
      setLines(lines.map(l => l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
    } else {
      setLines([...lines, {
        productId: product.id!,
        productName: product.name,
        quantity: 1,
        unitPrice: product.costPrice / 100,
        discount: 0,
        serials: [],
      }]);
    }
    setShowProductSearch(false);
    setProductSearch('');
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: string, value: any) {
    setLines(lines.map((l, i) => i === index ? { ...l, [field]: value } : l));
  }

  const subtotal = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice * 100 - l.discount * 100), 0);
  const total = subtotal - discount * 100;
  const remaining = total - paidAmount * 100;

  async function handleSubmit() {
    setError('');
    setSuccess('');
    if (lines.length === 0) { setError('حداقل یک قلم اضافه کنید'); return; }
    if (!selectedSupplier) { setError('تأمین‌کننده را انتخاب کنید'); return; }

    setLoading(true);
    const warehouse = (await productService.getDefaultWarehouse());

    const purchaseLines: PurchaseLineInput[] = lines.map(l => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: Math.round(l.unitPrice * 100),
      discount: Math.round(l.discount * 100),
      serials: l.serials.length > 0 ? l.serials : undefined,
    }));

    const result = await documentService.createPurchase({
      partyId: selectedSupplier,
      date,
      lines: purchaseLines,
      discount: Math.round(discount * 100),
      paidAmount: Math.round(paidAmount * 100),
      warehouseId: warehouse?.id || 1,
      notes,
    });

    if (result.success) {
      setSuccess('فاکتور خرید با موفقیت ثبت شد');
      setLines([]); setDiscount(0); setPaidAmount(0); setNotes('');
    } else {
      setError(result.error || 'خطا در ثبت فاکتور');
    }
    setLoading(false);
  }

  function handleSerialSubmit() {
    if (!serialInput) return;
    const serialNumbers = serialInput.serials.split('\n').map(s => s.trim()).filter(s => s);
    const newSerials = serialNumbers.map(sn => ({ serialNumber: sn, purchasePrice: lines[serialInput.lineIndex].unitPrice * 100 }));
    updateLine(serialInput.lineIndex, 'serials', newSerials);
    updateLine(serialInput.lineIndex, 'quantity', newSerials.length);
    setSerialInput(null);
  }

  const filteredProducts = productSearch
    ? products.filter(p => p.name.includes(productSearch) || p.sku.includes(productSearch))
    : products.slice(0, 20);

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-700 dark:text-red-300">{error}</div>}
      {success && <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-300">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاریخ</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تأمین‌کننده</label>
                <select value={selectedSupplier} onChange={e => setSelectedSupplier(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value={0}>انتخاب کنید</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاریخ شمسی</label>
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">{todayJalali()}</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">اقلام فاکتور خرید</h3>
              <button onClick={() => setShowProductSearch(true)}
                className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 flex items-center gap-1">
                <Plus className="w-4 h-4" /> افزودن کالا
              </button>
            </div>
            
            {lines.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>برای شروع، کالا اضافه کنید</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="text-right text-xs font-medium text-gray-500 px-3 py-2">کالا</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-3 py-2 w-20">مقدار</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-3 py-2 w-28">قیمت خرید</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-3 py-2 w-24">تخفیف</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-3 py-2 w-28">مجموع</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {lines.map((line, i) => {
                      const product = products.find(p => p.id === line.productId);
                      return (
                        <tr key={i}>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                            {line.productName}
                            {product?.type === 'serial' && (
                              <span className="text-xs text-purple-600 mr-2">({line.serials.length} سریال)</span>
                            )}
                          </td>
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
                            <div className="flex gap-1">
                              {product?.type === 'serial' && (
                                <button onClick={() => setSerialInput({ lineIndex: i, serials: '' })}
                                  className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded text-xs">
                                  سریال
                                </button>
                              )}
                              <button onClick={() => removeLine(i)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 sticky top-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">خلاصه فاکتور</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">جمع کل</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">تخفیف (؋)</span>
                <input type="number" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))}
                  min="0" step="0.01" className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-left bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between">
                  <span className="font-bold">مبلغ نهایی</span>
                  <span className="font-bold text-lg text-primary-600">{formatCurrency(total)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">پرداختی (؋)</span>
                <input type="number" value={paidAmount || ''} onChange={e => setPaidAmount(Number(e.target.value))}
                  min="0" step="0.01" className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-left bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">باقی‌مانده</span>
                <span className={`font-medium ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.max(0, remaining))}</span>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={loading}
              className="w-full mt-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
              {loading ? 'در حال ثبت...' : 'ثبت فاکتور خرید'}
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
                  placeholder="جست‌وجو..." autoFocus
                  className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-0">
              <div className="space-y-1">
                {filteredProducts.filter(p => p.type !== 'service').map(p => (
                  <button key={p.id} onClick={() => addProduct(p)}
                    className="w-full text-right p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{p.name}</p>
                        <p className="text-xs text-gray-500">کد: {p.sku}</p>
                      </div>
                      <span className="text-sm text-primary-600">{formatCurrency(p.costPrice)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Serial Input Modal */}
      {serialInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">ورود سریال‌ها</h3>
            <p className="text-sm text-gray-500 mb-2">هر سریال در یک خط جداگانه:</p>
            <textarea value={serialInput.serials} onChange={e => setSerialInput({ ...serialInput, serials: e.target.value })}
              rows={6} placeholder="SN001&#10;SN002&#10;SN003"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4" />
            <div className="flex gap-2">
              <button onClick={handleSerialSubmit} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">ثبت</button>
              <button onClick={() => setSerialInput(null)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
