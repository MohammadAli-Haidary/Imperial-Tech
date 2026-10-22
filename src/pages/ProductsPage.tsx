import { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { Product, Category, Brand, Unit } from '../db/database';
import { formatCurrency, toPersianDigits } from '../utils/jalali';
import { Plus, Search, Edit, Trash2, X, Package } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [brandId, setBrandId] = useState<number | undefined>();
  const [unitId, setUnitId] = useState<number | undefined>();
  const [type, setType] = useState<'physical' | 'serial' | 'service'>('physical');
  const [trackingMethod, setTrackingMethod] = useState<'quantity' | 'serial' | 'none'>('quantity');
  const [minStock, setMinStock] = useState(0);
  const [warrantyDays, setWarrantyDays] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [retailPrice, setRetailPrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Category/Brand form
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [prods, cats, brs, unts] = await Promise.all([
      productService.getAll(),
      productService.getCategories(),
      productService.getBrands(),
      productService.getUnits(),
    ]);
    setProducts(prods);
    setCategories(cats);
    setBrands(brs);
    setUnits(unts);
    setLoading(false);
  }

  function resetForm() {
    setSku(''); setName(''); setCategoryId(undefined); setBrandId(undefined);
    setUnitId(units[0]?.id); setType('physical'); setTrackingMethod('quantity');
    setMinStock(0); setWarrantyDays(0); setCostPrice(0); setRetailPrice(0);
    setWholesalePrice(0); setBarcode(''); setDescription(''); setError('');
    setEditingProduct(null);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setSku(p.sku); setName(p.name); setCategoryId(p.categoryId);
    setBrandId(p.brandId); setUnitId(p.unitId); setType(p.type);
    setTrackingMethod(p.trackingMethod); setMinStock(p.minStock);
    setWarrantyDays(p.warrantyDays); setCostPrice(p.costPrice);
    setRetailPrice(p.retailPrice); setWholesalePrice(p.wholesalePrice);
    setBarcode(p.barcode || ''); setDescription(p.description || '');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Convert prices to paisa
    const data = {
      sku, name, categoryId, brandId, unitId,
      type, trackingMethod, minStock, warrantyDays,
      costPrice: Math.round(costPrice * 100),
      retailPrice: Math.round(retailPrice * 100),
      wholesalePrice: Math.round(wholesalePrice * 100),
      barcode: barcode || undefined,
      description: description || undefined,
      isActive: true,
    };

    let result;
    if (editingProduct) {
      result = await productService.update(editingProduct.id!, data);
    } else {
      result = await productService.create(data);
    }

    if (result.success) {
      setShowForm(false);
      resetForm();
      await loadData();
    } else {
      setError(result.error || 'خطا');
    }
  }

  async function handleDelete(id: number) {
    if (confirm('آیا از غیرفعال‌سازی این کالا مطمئن هستید؟')) {
      await productService.deactivate(id);
      await loadData();
    }
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    await productService.createCategory(newCatName);
    setNewCatName('');
    setShowCatForm(false);
    await loadData();
  }

  async function addBrand() {
    if (!newBrandName.trim()) return;
    await productService.createBrand(newBrandName);
    setNewBrandName('');
    setShowBrandForm(false);
    await loadData();
  }

  const filtered = search
    ? products.filter(p => p.name.includes(search) || p.sku.includes(search) || (p.barcode && p.barcode.includes(search)))
    : products;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جست‌وجوی کالا..."
            className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCatForm(true)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
            + دسته‌بندی
          </button>
          <button onClick={() => setShowBrandForm(true)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
            + برند
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            کالای جدید
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-right text-sm font-medium text-gray-500 dark:text-gray-400 px-4 py-3">کد</th>
                <th className="text-right text-sm font-medium text-gray-500 dark:text-gray-400 px-4 py-3">نام کالا</th>
                <th className="text-right text-sm font-medium text-gray-500 dark:text-gray-400 px-4 py-3">نوع</th>
                <th className="text-right text-sm font-medium text-gray-500 dark:text-gray-400 px-4 py-3">قیمت خرید</th>
                <th className="text-right text-sm font-medium text-gray-500 dark:text-gray-400 px-4 py-3">قیمت فروش</th>
                <th className="text-right text-sm font-medium text-gray-500 dark:text-gray-400 px-4 py-3">بارکد</th>
                <th className="text-right text-sm font-medium text-gray-500 dark:text-gray-400 px-4 py-3">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>هنوز کالایی ثبت نشده است</p>
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{p.sku}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      p.type === 'serial' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                      p.type === 'service' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {p.type === 'serial' ? 'سریال‌دار' : p.type === 'service' ? 'خدمت' : 'تعدادی'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatCurrency(p.costPrice)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatCurrency(p.retailPrice)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400">{p.barcode || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id!)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingProduct ? 'ویرایش کالا' : 'کالای جدید'}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">کد کالا (SKU) *</label>
                  <input type="text" value={sku} onChange={e => setSku(e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام کالا *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">دسته‌بندی</label>
                  <select value={categoryId || ''} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">انتخاب نشده</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">برند</label>
                  <select value={brandId || ''} onChange={e => setBrandId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">انتخاب نشده</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">واحد</label>
                  <select value={unitId || ''} onChange={e => setUnitId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع کالا</label>
                  <select value={type} onChange={e => {
                    const t = e.target.value as 'physical' | 'serial' | 'service';
                    setType(t);
                    setTrackingMethod(t === 'serial' ? 'serial' : t === 'service' ? 'none' : 'quantity');
                  }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="physical">کالای فیزیکی (تعدادی)</option>
                    <option value="serial">دستگاه سریال‌دار</option>
                    <option value="service">خدمت</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بارکد</label>
                  <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بهای خرید (؋)</label>
                  <input type="number" value={costPrice || ''} onChange={e => setCostPrice(Number(e.target.value))} min="0" step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">قیمت پرچون (؋)</label>
                  <input type="number" value={retailPrice || ''} onChange={e => setRetailPrice(Number(e.target.value))} min="0" step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">قیمت عمده (؋)</label>
                  <input type="number" value={wholesalePrice || ''} onChange={e => setWholesalePrice(Number(e.target.value))} min="0" step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">حداقل موجودی</label>
                  <input type="number" value={minStock} onChange={e => setMinStock(Number(e.target.value))} min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">روزهای ضمانت</label>
                  <input type="number" value={warrantyDays} onChange={e => setWarrantyDays(Number(e.target.value))} min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">توضیحات</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
                  {editingProduct ? 'بروزرسانی' : 'ذخیره'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">دسته‌بندی جدید</h3>
            <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="نام دسته‌بندی"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4" />
            <div className="flex gap-2">
              <button onClick={addCategory} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">ذخیره</button>
              <button onClick={() => setShowCatForm(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">بستن</button>
            </div>
          </div>
        </div>
      )}

      {/* Brand Modal */}
      {showBrandForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">برند جدید</h3>
            <input type="text" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="نام برند"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4" />
            <div className="flex gap-2">
              <button onClick={addBrand} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">ذخیره</button>
              <button onClick={() => setShowBrandForm(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">بستن</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
