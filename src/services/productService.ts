import { db, Product, Category, Brand, Unit, Warehouse, ProductSerial, StockMovement, InventoryBalance } from '../db/database';
import { authService } from './authService';

export const productService = {
  // ============ Products ============
  
  async getAll(): Promise<Product[]> {
    return db.products.filter(p => p.isActive).toArray();
  },

  async getById(id: number): Promise<Product | undefined> {
    return db.products.get(id);
  },

  async getBySku(sku: string): Promise<Product | undefined> {
    return db.products.where('sku').equals(sku).first();
  },

  async getByBarcode(barcode: string): Promise<Product | undefined> {
    return db.products.where('barcode').equals(barcode).first();
  },

  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; id?: number; error?: string }> {
    // Validate SKU uniqueness
    const existing = await db.products.where('sku').equals(data.sku).first();
    if (existing) {
      return { success: false, error: 'کد کالا (SKU) تکراری است' };
    }

    // Validate barcode uniqueness
    if (data.barcode) {
      const existingBarcode = await db.products.where('barcode').equals(data.barcode).first();
      if (existingBarcode) {
        return { success: false, error: 'این بارکد قبلاً ثبت شده است' };
      }
    }

    const now = new Date().toISOString();
    const id = await db.products.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    await authService.logAudit('create', 'product', String(id), `کالای جدید: ${data.name}`);
    return { success: true, id };
  },

  async update(id: number, data: Partial<Product>): Promise<{ success: boolean; error?: string }> {
    const product = await db.products.get(id);
    if (!product) return { success: false, error: 'کالا یافت نشد' };

    // Check SKU uniqueness if changed
    if (data.sku && data.sku !== product.sku) {
      const existing = await db.products.where('sku').equals(data.sku).first();
      if (existing) return { success: false, error: 'کد کالا (SKU) تکراری است' };
    }

    await db.products.update(id, { ...data, updatedAt: new Date().toISOString() });
    await authService.logAudit('update', 'product', String(id));
    return { success: true };
  },

  async deactivate(id: number): Promise<{ success: boolean; error?: string }> {
    await db.products.update(id, { isActive: false, updatedAt: new Date().toISOString() });
    await authService.logAudit('deactivate', 'product', String(id));
    return { success: true };
  },

  async search(query: string): Promise<Product[]> {
    const all = await db.products.filter(p => p.isActive).toArray();
    const q = query.toLowerCase();
    return all.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  },

  // ============ Categories ============

  async getCategories(): Promise<Category[]> {
    return db.categories.toArray();
  },

  async createCategory(name: string, parentId?: number): Promise<{ success: boolean; id?: number; error?: string }> {
    if (!name.trim()) return { success: false, error: 'نام دسته‌بندی الزامی است' };
    const id = await db.categories.add({
      name: name.trim(),
      parentId,
      createdAt: new Date().toISOString(),
    });
    return { success: true, id };
  },

  async deleteCategory(id: number): Promise<{ success: boolean; error?: string }> {
    const products = await db.products.where('categoryId').equals(id).count();
    if (products > 0) return { success: false, error: 'این دسته‌بندی دارای کالا است' };
    await db.categories.delete(id);
    return { success: true };
  },

  // ============ Brands ============

  async getBrands(): Promise<Brand[]> {
    return db.brands.toArray();
  },

  async createBrand(name: string): Promise<{ success: boolean; id?: number; error?: string }> {
    if (!name.trim()) return { success: false, error: 'نام برند الزامی است' };
    const id = await db.brands.add({
      name: name.trim(),
      createdAt: new Date().toISOString(),
    });
    return { success: true, id };
  },

  async deleteBrand(id: number): Promise<{ success: boolean; error?: string }> {
    const products = await db.products.where('brandId').equals(id).count();
    if (products > 0) return { success: false, error: 'این برند دارای کالا است' };
    await db.brands.delete(id);
    return { success: true };
  },

  // ============ Units ============

  async getUnits(): Promise<Unit[]> {
    return db.units.toArray();
  },

  async createUnit(name: string, symbol: string, precision: number): Promise<{ success: boolean; id?: number; error?: string }> {
    if (!name.trim() || !symbol.trim()) return { success: false, error: 'نام و نماد واحد الزامی است' };
    const id = await db.units.add({
      name: name.trim(),
      symbol: symbol.trim(),
      precision,
      createdAt: new Date().toISOString(),
    });
    return { success: true, id };
  },

  // ============ Warehouses ============

  async getWarehouses(): Promise<Warehouse[]> {
    return db.warehouses.toArray();
  },

  async getDefaultWarehouse(): Promise<Warehouse | undefined> {
    return db.warehouses.filter(w => w.isDefault).first();
  },

  // ============ Serials ============

  async getSerialsByProduct(productId: number): Promise<ProductSerial[]> {
    return db.productSerials.where('productId').equals(productId).toArray();
  },

  async getAvailableSerials(productId: number): Promise<ProductSerial[]> {
    return db.productSerials.where('productId').equals(productId)
      .and(s => s.status === 'in_stock')
      .toArray();
  },

  async getSerialByNumber(serialNumber: string): Promise<ProductSerial | undefined> {
    return db.productSerials.where('serialNumber').equals(serialNumber).first();
  },

  async addSerials(productId: number, serials: Array<{ serialNumber: string; purchasePrice: number; purchaseDocId?: number }>): Promise<{ success: boolean; error?: string }> {
    const product = await db.products.get(productId);
    if (!product) return { success: false, error: 'کالا یافت نشد' };
    if (product.type !== 'serial') return { success: false, error: 'این کالا سریال‌دار نیست' };

    // Check for duplicates
    for (const s of serials) {
      const existing = await db.productSerials.where('serialNumber').equals(s.serialNumber).first();
      if (existing) {
        return { success: false, error: `سریال ${s.serialNumber} تکراری است` };
      }
    }

    const now = new Date().toISOString();
    await db.productSerials.bulkAdd(
      serials.map(s => ({
        productId,
        serialNumber: s.serialNumber,
        status: 'in_stock' as const,
        purchasePrice: s.purchasePrice,
        purchaseDocId: s.purchaseDocId,
        createdAt: now,
      }))
    );

    return { success: true };
  },

  // ============ Inventory ============

  async getInventoryBalance(productId: number, warehouseId: number): Promise<InventoryBalance | undefined> {
    return db.inventoryBalances.where('[productId+warehouseId]').equals([productId, warehouseId]).first();
  },

  async getAllInventoryBalances(): Promise<InventoryBalance[]> {
    return db.inventoryBalances.toArray();
  },

  async getLowStockProducts(warehouseId?: number): Promise<Array<Product & { currentQty: number }>> {
    const balances = warehouseId 
      ? await db.inventoryBalances.where('warehouseId').equals(warehouseId).toArray()
      : await db.inventoryBalances.toArray();
    
    const products = await db.products.filter(p => p.isActive).toArray();
    const lowStock: Array<Product & { currentQty: number }> = [];

    for (const balance of balances) {
      const product = products.find(p => p.id === balance.productId);
      if (product && balance.quantity <= product.minStock) {
        lowStock.push({ ...product, currentQty: balance.quantity });
      }
    }

    return lowStock;
  },

  // Stock movement for purchase (add to inventory)
  async addStock(productId: number, warehouseId: number, quantity: number, unitCost: number, documentId?: number, serialId?: number): Promise<void> {
    const now = new Date().toISOString();
    
    // Record movement
    await db.stockMovements.add({
      productId,
      warehouseId,
      movementType: 'in',
      quantity,
      unitCost,
      documentId,
      serialId,
      createdAt: now,
    });

    // Update balance
    const existing = await this.getInventoryBalance(productId, warehouseId);
    if (existing) {
      const newTotalCost = existing.totalCost + (quantity * unitCost);
      const newQuantity = existing.quantity + quantity;
      const newAvgCost = newQuantity > 0 ? Math.round(newTotalCost / newQuantity) : 0;
      
      await db.inventoryBalances.update(existing.id!, {
        quantity: newQuantity,
        totalCost: newTotalCost,
        avgCost: newAvgCost,
        updatedAt: now,
      });
    } else {
      await db.inventoryBalances.add({
        productId,
        warehouseId,
        quantity,
        totalCost: quantity * unitCost,
        avgCost: unitCost,
        updatedAt: now,
      });
    }
  },

  // Stock movement for sale (remove from inventory)
  async removeStock(productId: number, warehouseId: number, quantity: number, documentId?: number, serialId?: number): Promise<{ success: boolean; avgCost?: number; error?: string }> {
    const balance = await this.getInventoryBalance(productId, warehouseId);
    
    if (!balance || balance.quantity < quantity) {
      return { success: false, error: 'موجودی کافی نیست' };
    }

    const avgCost = balance.avgCost;
    const now = new Date().toISOString();

    await db.stockMovements.add({
      productId,
      warehouseId,
      movementType: 'out',
      quantity,
      unitCost: avgCost,
      documentId,
      serialId,
      createdAt: now,
    });

    const newQuantity = balance.quantity - quantity;
    const newTotalCost = balance.totalCost - (quantity * avgCost);

    await db.inventoryBalances.update(balance.id!, {
      quantity: newQuantity,
      totalCost: Math.max(0, newTotalCost),
      updatedAt: now,
    });

    return { success: true, avgCost };
  },

  // Get stock movements for a product
  async getStockMovements(productId: number): Promise<StockMovement[]> {
    return db.stockMovements.where('productId').equals(productId).reverse().sortBy('createdAt');
  },
};
