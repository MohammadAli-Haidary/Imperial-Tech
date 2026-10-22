import Dexie, { Table } from 'dexie';

// ============ Types ============

export interface User {
  id?: number;
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id?: number;
  key: string;
  value: string;
  updatedAt: string;
}

export interface AuditLog {
  id?: number;
  userId?: number;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

export interface Category {
  id?: number;
  name: string;
  parentId?: number;
  description?: string;
  createdAt: string;
}

export interface Brand {
  id?: number;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Unit {
  id?: number;
  name: string;
  symbol: string;
  precision: number; // decimal places for quantity
  createdAt: string;
}

export interface Warehouse {
  id?: number;
  name: string;
  location?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Product {
  id?: number;
  sku: string;
  name: string;
  categoryId?: number;
  brandId?: number;
  unitId?: number;
  type: 'physical' | 'serial' | 'service';
  trackingMethod: 'quantity' | 'serial' | 'none';
  minStock: number;
  warrantyDays: number;
  costPrice: number; // in paisa (1/100 AFN)
  retailPrice: number;
  wholesalePrice: number;
  barcode?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductBarcode {
  id?: number;
  productId: number;
  barcode: string;
  isPrimary: boolean;
}

export interface ProductSerial {
  id?: number;
  productId: number;
  serialNumber: string;
  status: 'in_stock' | 'sold' | 'returned' | 'in_repair' | 'quarantine';
  purchasePrice: number; // cost of this specific serial
  purchaseDocId?: number;
  saleDocId?: number;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  createdAt: string;
}

export interface Party {
  id?: number;
  name: string;
  type: 'customer' | 'supplier' | 'both';
  phone?: string;
  email?: string;
  address?: string;
  creditLimit?: number; // in paisa
  currentBalance: number; // in paisa
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceList {
  id?: number;
  name: string;
  type: 'retail' | 'wholesale';
  createdAt: string;
}

export interface PriceListItem {
  id?: number;
  priceListId: number;
  productId: number;
  price: number; // in paisa
}

export interface Document {
  id?: number;
  docNumber: string;
  docType: 'purchase' | 'sale' | 'purchase_return' | 'sale_return' | 'receipt' | 'payment' | 'expense' | 'adjustment';
  partyId?: number;
  date: string; // ISO date
  subtotal: number; // paisa
  discount: number; // paisa
  total: number; // paisa
  paidAmount: number; // paisa
  remainingAmount: number; // paisa
  status: 'draft' | 'posted' | 'cancelled';
  notes?: string;
  warehouseId?: number;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentLine {
  id?: number;
  documentId: number;
  lineNumber: number;
  productId?: number;
  description: string;
  quantity: number; // scaled integer (x1000 for 3 decimal places)
  unitPrice: number; // paisa
  discount: number; // paisa
  total: number; // paisa
  serialId?: number;
  costPrice?: number; // paisa - for COGS calculation
}

export interface StockMovement {
  id?: number;
  productId: number;
  warehouseId: number;
  movementType: 'in' | 'out' | 'return_in' | 'return_out' | 'adjustment';
  quantity: number;
  unitCost: number; // paisa
  documentId?: number;
  serialId?: number;
  notes?: string;
  createdAt: string;
}

export interface InventoryBalance {
  id?: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  totalCost: number; // paisa
  avgCost: number; // paisa per unit
  updatedAt: string;
}

export interface Payment {
  id?: number;
  documentId?: number;
  partyId?: number;
  paymentType: 'receipt' | 'payment';
  amount: number; // paisa
  method: 'cash' | 'bank' | 'check';
  financialAccountId?: number;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface PaymentAllocation {
  id?: number;
  paymentId: number;
  documentId: number;
  allocatedAmount: number; // paisa
}

export interface FinancialAccount {
  id?: number;
  name: string;
  type: 'cash' | 'bank' | 'credit_card';
  balance: number; // paisa
  isActive: boolean;
  createdAt: string;
}

export interface ChartOfAccount {
  id?: number;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentId?: number;
  balance: number; // paisa
  isActive: boolean;
}

export interface JournalEntry {
  id?: number;
  entryNumber: string;
  date: string;
  description: string;
  documentId?: number;
  isPosted: boolean;
  createdAt: string;
}

export interface JournalEntryLine {
  id?: number;
  journalEntryId: number;
  accountId: number;
  debit: number; // paisa
  credit: number; // paisa
  description?: string;
}

export interface CashSession {
  id?: number;
  openedAt: string;
  closedAt?: string;
  openingBalance: number; // paisa
  closingBalance?: number;
  totalReceipts: number;
  totalPayments: number;
  status: 'open' | 'closed';
  notes?: string;
}

export interface Expense {
  id?: number;
  date: string;
  categoryId?: number;
  amount: number; // paisa
  paymentMethod: 'cash' | 'bank';
  financialAccountId?: number;
  description: string;
  documentId?: number;
  createdAt: string;
}

export interface ExpenseCategory {
  id?: number;
  name: string;
  accountId?: number;
  createdAt: string;
}

export interface Warranty {
  id?: number;
  serialId?: number;
  productId?: number;
  partyId?: number; // customer
  saleDocId?: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'claimed';
  terms?: string;
  createdAt: string;
}

export interface WarrantyClaim {
  id?: number;
  warrantyId: number;
  claimDate: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'resolved';
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ServiceOrder {
  id?: number;
  orderNumber: string;
  partyId: number; // customer
  productId?: number;
  serialId?: number;
  reportedIssue: string;
  status: 'received' | 'diagnosing' | 'in_progress' | 'waiting_parts' | 'completed' | 'delivered';
  receivedDate: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  totalCost: number; // paisa
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceOrderPart {
  id?: number;
  serviceOrderId: number;
  productId: number;
  quantity: number;
  unitCost: number; // paisa
  totalCost: number; // paisa
}

export interface ServiceOrderCharge {
  id?: number;
  serviceOrderId: number;
  description: string;
  amount: number; // paisa
}

export interface BackupHistory {
  id?: number;
  date: string;
  filePath: string;
  size: number;
  checksum: string;
  status: 'success' | 'failed';
  notes?: string;
}

export interface FiscalPeriod {
  id?: number;
  name: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  createdAt: string;
}

// ============ Database ============

class ImperialDB extends Dexie {
  users!: Table<User>;
  appSettings!: Table<AppSettings>;
  auditLogs!: Table<AuditLog>;
  categories!: Table<Category>;
  brands!: Table<Brand>;
  units!: Table<Unit>;
  warehouses!: Table<Warehouse>;
  products!: Table<Product>;
  productBarcodes!: Table<ProductBarcode>;
  productSerials!: Table<ProductSerial>;
  parties!: Table<Party>;
  priceLists!: Table<PriceList>;
  priceListItems!: Table<PriceListItem>;
  documents!: Table<Document>;
  documentLines!: Table<DocumentLine>;
  stockMovements!: Table<StockMovement>;
  inventoryBalances!: Table<InventoryBalance>;
  payments!: Table<Payment>;
  paymentAllocations!: Table<PaymentAllocation>;
  financialAccounts!: Table<FinancialAccount>;
  chartOfAccounts!: Table<ChartOfAccount>;
  journalEntries!: Table<JournalEntry>;
  journalEntryLines!: Table<JournalEntryLine>;
  cashSessions!: Table<CashSession>;
  expenses!: Table<Expense>;
  expenseCategories!: Table<ExpenseCategory>;
  warranties!: Table<Warranty>;
  warrantyClaims!: Table<WarrantyClaim>;
  serviceOrders!: Table<ServiceOrder>;
  serviceOrderParts!: Table<ServiceOrderPart>;
  serviceOrderCharges!: Table<ServiceOrderCharge>;
  backupHistory!: Table<BackupHistory>;
  fiscalPeriods!: Table<FiscalPeriod>;

  constructor() {
    super('ImperialTechnologyDB');

    this.version(1).stores({
      users: '++id, username, email',
      appSettings: '++id, key',
      auditLogs: '++id, userId, action, entityType, createdAt',
      categories: '++id, name, parentId',
      brands: '++id, name',
      units: '++id, name',
      warehouses: '++id, name, isDefault',
      products: '++id, sku, name, barcode, categoryId, brandId, type',
      productBarcodes: '++id, productId, barcode',
      productSerials: '++id, productId, serialNumber, status',
      parties: '++id, name, type, phone',
      priceLists: '++id, name, type',
      priceListItems: '++id, [priceListId+productId]',
      documents: '++id, docNumber, docType, partyId, date, status',
      documentLines: '++id, documentId, productId',
      stockMovements: '++id, productId, warehouseId, documentId, createdAt',
      inventoryBalances: '++id, [productId+warehouseId]',
      payments: '++id, documentId, partyId, paymentType, createdAt',
      paymentAllocations: '++id, paymentId, documentId',
      financialAccounts: '++id, name, type',
      chartOfAccounts: '++id, code, name, type',
      journalEntries: '++id, entryNumber, date, documentId',
      journalEntryLines: '++id, journalEntryId, accountId',
      cashSessions: '++id, status, openedAt',
      expenses: '++id, date, categoryId',
      expenseCategories: '++id, name',
      warranties: '++id, serialId, productId, partyId, status',
      warrantyClaims: '++id, warrantyId, status',
      serviceOrders: '++id, orderNumber, partyId, status',
      serviceOrderParts: '++id, serviceOrderId, productId',
      serviceOrderCharges: '++id, serviceOrderId',
      backupHistory: '++id, date, status',
      fiscalPeriods: '++id, startDate, endDate',
    });
  }
}

export const db = new ImperialDB();

// ============ Database Management ============

export async function resetDatabase() {
  try {
    // Close the database first
    await db.close();
    // Delete the database
    await db.delete();
    // Reopen with new schema
    await db.open();
    console.log('Database reset successfully');
  } catch (err) {
    console.error('Error resetting database:', err);
    // If delete fails, try to force close and reopen
    try {
      db.close();
      await indexedDB.deleteDatabase('ImperialTechnologyDB');
      await db.open();
    } catch (err2) {
      console.error('Force reset also failed:', err2);
    }
  }
}

// ============ Seed Data ============

export async function seedDatabase() {
  // Check if database schema is valid by testing multiple tables
  try {
    const unitsCount = await db.units.count();
    const productsCount = await db.products.count();
    const partiesCount = await db.parties.count();
    const documentsCount = await db.documents.count();
    
    if (unitsCount > 0) return; // Already seeded
  } catch (err: any) {
    // If error (like NotFoundError), reset database
    console.warn('Database schema error, resetting...', err);
    await resetDatabase();
    // After reset, try seeding again
    try {
      await seedData();
    } catch (seedErr) {
      console.error('Seeding after reset failed:', seedErr);
    }
    return;
  }
  
  // If we get here, database is valid but empty
  await seedData();
}

async function seedData() {

  // Seed data without transaction (simpler and less error-prone)
  try {
    // Default units
    await db.units.bulkAdd([
      { name: 'عدد', symbol: 'عدد', precision: 0, createdAt: new Date().toISOString() },
      { name: 'جفت', symbol: 'جفت', precision: 0, createdAt: new Date().toISOString() },
      { name: 'بسته', symbol: 'بسته', precision: 0, createdAt: new Date().toISOString() },
      { name: 'متر', symbol: 'متر', precision: 2, createdAt: new Date().toISOString() },
      { name: 'کیلوگرم', symbol: 'کیلو', precision: 3, createdAt: new Date().toISOString() },
    ]);

    // Default warehouse
    await db.warehouses.add({
      name: 'انبار اصلی',
      location: 'مغازه',
      isDefault: true,
      createdAt: new Date().toISOString(),
    });

    // Default financial accounts
    await db.financialAccounts.bulkAdd([
      { name: 'صندوق نقدی', type: 'cash', balance: 0, isActive: true, createdAt: new Date().toISOString() },
      { name: 'حساب بانکی', type: 'bank', balance: 0, isActive: true, createdAt: new Date().toISOString() },
    ]);

    // Chart of accounts
    await db.chartOfAccounts.bulkAdd([
      { code: '1000', name: 'موجودی کالا', type: 'asset', balance: 0, isActive: true },
      { code: '1100', name: 'حساب‌های دریافتنی', type: 'asset', balance: 0, isActive: true },
      { code: '1200', name: 'صندوق', type: 'asset', balance: 0, isActive: true },
      { code: '1300', name: 'حساب بانکی', type: 'asset', balance: 0, isActive: true },
      { code: '2000', name: 'حساب‌های پرداختنی', type: 'liability', balance: 0, isActive: true },
      { code: '3000', name: 'سرمایه', type: 'equity', balance: 0, isActive: true },
      { code: '4000', name: 'درآمد فروش', type: 'revenue', balance: 0, isActive: true },
      { code: '4100', name: 'برگشت فروش', type: 'revenue', balance: 0, isActive: true },
      { code: '5000', name: 'بهای کالای فروخته‌شده', type: 'expense', balance: 0, isActive: true },
      { code: '5100', name: 'خرید کالا', type: 'expense', balance: 0, isActive: true },
      { code: '5200', name: 'برگشت خرید', type: 'expense', balance: 0, isActive: true },
      { code: '6000', name: 'مصارف عمومی', type: 'expense', balance: 0, isActive: true },
      { code: '6100', name: 'مصارف تعمیرات', type: 'expense', balance: 0, isActive: true },
    ]);

    // Default expense categories
    await db.expenseCategories.bulkAdd([
      { name: 'کرایه', createdAt: new Date().toISOString() },
      { name: 'برق', createdAt: new Date().toISOString() },
      { name: 'اینترنت', createdAt: new Date().toISOString() },
      { name: 'حقوق کارمندان', createdAt: new Date().toISOString() },
      { name: 'سایر مصارف', createdAt: new Date().toISOString() },
    ]);

    // Default price lists
    await db.priceLists.bulkAdd([
      { name: 'قیمت پرچون', type: 'retail', createdAt: new Date().toISOString() },
      { name: 'قیمت عمده', type: 'wholesale', createdAt: new Date().toISOString() },
    ]);

    // Default customer (cash customer)
    await db.parties.add({
      name: 'مشتری نقدی',
      type: 'customer',
      currentBalance: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}
