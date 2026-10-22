import { db, Document, DocumentLine, Payment, PaymentAllocation, Party } from '../db/database';
import { productService } from './productService';
import { authService } from './authService';

export interface SaleLineInput {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  serialId?: number;
  description?: string;
}

export interface PurchaseLineInput {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  serials?: Array<{ serialNumber: string; purchasePrice: number }>;
  description?: string;
}

// Generate document number
async function generateDocNumber(docType: string): Promise<string> {
  const prefixes: Record<string, string> = {
    purchase: 'PUR',
    sale: 'SAL',
    purchase_return: 'PRR',
    sale_return: 'SRR',
    receipt: 'RCT',
    payment: 'PAY',
    expense: 'EXP',
    adjustment: 'ADJ',
  };
  
  const prefix = prefixes[docType] || 'DOC';
  const year = new Date().getFullYear();
  
  const count = await db.documents.where('docType').equals(docType).count();
  const number = String(count + 1).padStart(5, '0');
  
  return `${prefix}-${year}-${number}`;
}

export const documentService = {
  // ============ Documents ============

  async getAll(docType?: string): Promise<Document[]> {
    if (docType) {
      return db.documents.where('docType').equals(docType).reverse().sortBy('createdAt');
    }
    return db.documents.orderBy('createdAt').reverse().toArray();
  },

  async getById(id: number): Promise<Document | undefined> {
    return db.documents.get(id);
  },

  async getLines(documentId: number): Promise<DocumentLine[]> {
    return db.documentLines.where('documentId').equals(documentId).sortBy('lineNumber');
  },

  // ============ Purchase ============

  async createPurchase(data: {
    partyId: number;
    date: string;
    lines: PurchaseLineInput[];
    discount: number;
    paidAmount: number;
    warehouseId: number;
    notes?: string;
    directCosts?: number;
  }): Promise<{ success: boolean; id?: number; error?: string }> {
    if (!data.partyId) return { success: false, error: 'تأمین‌کننده الزامی است' };
    if (data.lines.length === 0) return { success: false, error: 'حداقل یک قلم الزامی است' };

    const party = await db.parties.get(data.partyId);
    if (!party) return { success: false, error: 'تأمین‌کننده یافت نشد' };

    const defaultWarehouse = data.warehouseId || (await productService.getDefaultWarehouse())?.id;
    if (!defaultWarehouse) return { success: false, error: 'انبار مشخص نشده' };

    return db.transaction('rw', 
      [db.documents, db.documentLines, db.inventoryBalances, db.stockMovements, db.parties, db.productSerials, db.payments, db.paymentAllocations],
      async () => {
        // Calculate totals
        let subtotal = 0;
        const lineData: Array<Omit<DocumentLine, 'id'>> = [];

        for (let i = 0; i < data.lines.length; i++) {
          const line = data.lines[i];
          const product = await db.products.get(line.productId);
          if (!product) throw new Error(`کالای ${line.productId} یافت نشد`);

          const lineTotal = (line.quantity * line.unitPrice) - line.discount;
          subtotal += lineTotal;

          lineData.push({
            documentId: 0, // Will be set after document creation
            lineNumber: i + 1,
            productId: line.productId,
            description: line.description || product.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount,
            total: lineTotal,
            costPrice: line.unitPrice, // purchase cost
          });
        }

        const total = subtotal - data.discount;
        const remainingAmount = total - data.paidAmount;

        // Create document
        const docNumber = await generateDocNumber('purchase');
        const now = new Date().toISOString();
        
        const docId = await db.documents.add({
          docNumber,
          docType: 'purchase',
          partyId: data.partyId,
          date: data.date,
          subtotal,
          discount: data.discount,
          total,
          paidAmount: data.paidAmount,
          remainingAmount: Math.max(0, remainingAmount),
          status: 'posted',
          notes: data.notes,
          warehouseId: defaultWarehouse,
          createdAt: now,
          updatedAt: now,
        });

        // Create lines and update inventory
        for (const line of lineData) {
          line.documentId = docId;
          await db.documentLines.add(line as DocumentLine);

          // Add to inventory
          await productService.addStock(
            line.productId!,
            defaultWarehouse,
            line.quantity,
            line.unitPrice,
            docId
          );

          // Handle serials - handled separately in purchase creation
        }

        // Update party balance
        if (remainingAmount > 0) {
          await db.parties.update(data.partyId, {
            currentBalance: (party.currentBalance || 0) + remainingAmount,
            updatedAt: now,
          });
        }

        // Record payment if any
        if (data.paidAmount > 0) {
          const paymentId = await db.payments.add({
            documentId: docId,
            partyId: data.partyId,
            paymentType: 'payment',
            amount: data.paidAmount,
            method: 'cash',
            notes: `پرداخت فاکتور خرید ${docNumber}`,
            createdAt: now,
          });
          await db.paymentAllocations.add({
            paymentId,
            documentId: docId,
            allocatedAmount: data.paidAmount,
          });
        }

        await authService.logAudit('create', 'purchase', String(docId), `فاکتور خرید ${docNumber}`);
        return { success: true, id: docId };
      }
    ).catch(err => ({ success: false, error: err.message || 'خطا در ثبت فاکتور خرید' }));
  },

  // ============ Sale ============

  async createSale(data: {
    partyId: number;
    date: string;
    lines: SaleLineInput[];
    discount: number;
    paidAmount: number;
    warehouseId: number;
    isWholesale: boolean;
    notes?: string;
  }): Promise<{ success: boolean; id?: number; error?: string }> {
    if (!data.partyId) return { success: false, error: 'مشتری الزامی است' };
    if (data.lines.length === 0) return { success: false, error: 'حداقل یک قلم الزامی است' };

    const party = await db.parties.get(data.partyId);
    if (!party) return { success: false, error: 'مشتری یافت نشد' };

    const defaultWarehouse = data.warehouseId || (await productService.getDefaultWarehouse())?.id;
    if (!defaultWarehouse) return { success: false, error: 'انبار مشخص نشده' };

    // Credit limit check will be done inside transaction

    return db.transaction('rw',
      [db.documents, db.documentLines, db.inventoryBalances, db.stockMovements, db.parties, db.productSerials, db.payments, db.paymentAllocations],
      async () => {
        let subtotal = 0;
        const lineData: Array<Omit<DocumentLine, 'id'>> = [];

        for (let i = 0; i < data.lines.length; i++) {
          const line = data.lines[i];
          const product = await db.products.get(line.productId);
          if (!product) throw new Error(`کالای ${line.productId} یافت نشد`);

          // Check inventory
          const balance = await productService.getInventoryBalance(line.productId, defaultWarehouse);
          if (!balance || balance.quantity < line.quantity) {
            throw new Error(`موجودی ${product.name} کافی نیست`);
          }

          // Get cost price (COGS)
          let costPrice = balance.avgCost;

          // For serial items, use specific serial cost
          if (line.serialId) {
            const serial = await db.productSerials.get(line.serialId);
            if (serial) {
              costPrice = serial.purchasePrice;
              // Mark serial as sold
              await db.productSerials.update(line.serialId, {
                status: 'sold',
                saleDocId: 0, // Will update after
              });
            }
          }

          const lineTotal = (line.quantity * line.unitPrice) - line.discount;
          subtotal += lineTotal;

          lineData.push({
            documentId: 0,
            lineNumber: i + 1,
            productId: line.productId,
            description: line.description || product.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount,
            total: lineTotal,
            serialId: line.serialId,
            costPrice,
          });
        }

        const total = subtotal - data.discount;
        const remainingAmount = total - data.paidAmount;

        // Check credit limit
        if (remainingAmount > 0 && party.creditLimit) {
          const newBalance = (party.currentBalance || 0) + remainingAmount;
          if (newBalance > party.creditLimit) {
            throw new Error(`مانده مشتری از سقف اعتبار (${party.creditLimit.toLocaleString()} افغانی) بیشتر می‌شود`);
          }
        }

        // Create document
        const docNumber = await generateDocNumber('sale');
        const now = new Date().toISOString();

        const docId = await db.documents.add({
          docNumber,
          docType: 'sale',
          partyId: data.partyId,
          date: data.date,
          subtotal,
          discount: data.discount,
          total,
          paidAmount: data.paidAmount,
          remainingAmount: Math.max(0, remainingAmount),
          status: 'posted',
          notes: data.notes,
          warehouseId: defaultWarehouse,
          createdAt: now,
          updatedAt: now,
        });

        // Create lines and update inventory
        for (const line of lineData) {
          line.documentId = docId;
          await db.documentLines.add(line as DocumentLine);

          // Remove from inventory
          const result = await productService.removeStock(
            line.productId!,
            defaultWarehouse,
            line.quantity,
            docId,
            line.serialId
          );

          if (!result.success) {
            throw new Error(result.error);
          }

          // Update serial status
          if (line.serialId) {
            await db.productSerials.update(line.serialId, {
              status: 'sold',
              saleDocId: docId,
            });
          }
        }

        // Update party balance
        if (remainingAmount > 0) {
          await db.parties.update(data.partyId, {
            currentBalance: (party.currentBalance || 0) + remainingAmount,
            updatedAt: now,
          });
        }

        // Record payment if any
        if (data.paidAmount > 0) {
          const paymentId = await db.payments.add({
            documentId: docId,
            partyId: data.partyId,
            paymentType: 'receipt',
            amount: data.paidAmount,
            method: 'cash',
            notes: `دریافت فاکتور فروش ${docNumber}`,
            createdAt: now,
          });
          await db.paymentAllocations.add({
            paymentId,
            documentId: docId,
            allocatedAmount: data.paidAmount,
          });
        }

        await authService.logAudit('create', 'sale', String(docId), `فاکتور فروش ${docNumber}`);
        return { success: true, id: docId };
      }
    ).catch(err => ({ success: false, error: err.message || 'خطا در ثبت فاکتور فروش' }));
  },

  // ============ Sale Return ============

  async createSaleReturn(data: {
    originalDocId: number;
    partyId: number;
    date: string;
    lines: Array<{ lineId: number; quantity: number; serialId?: number }>;
    notes?: string;
  }): Promise<{ success: boolean; id?: number; error?: string }> {
    const originalDoc = await db.documents.get(data.originalDocId);
    if (!originalDoc) return { success: false, error: 'فاکتور اصلی یافت نشد' };
    if (originalDoc.docType !== 'sale') return { success: false, error: 'سند اصلی فاکتور فروش نیست' };

    const originalLines = await db.documentLines.where('documentId').equals(data.originalDocId).toArray();

    return db.transaction('rw',
      [db.documents, db.documentLines, db.inventoryBalances, db.stockMovements, db.parties, db.productSerials],
      async () => {
        let totalRefund = 0;
        const returnLines: Array<Omit<DocumentLine, 'id'>> = [];

        for (let i = 0; i < data.lines.length; i++) {
          const retLine = data.lines[i];
          const origLine = originalLines.find(l => l.id === retLine.lineId);
          if (!origLine) throw new Error('سطر اصلی یافت نشد');

          // Check return quantity doesn't exceed original
          // Check return quantity validity
          const existingReturns = await db.documentLines.toArray();
          
          // Simplified check - in production would check all related returns
          if (retLine.quantity > origLine.quantity) {
            throw new Error('مقدار برگشت بیشتر از مقدار فروش است');
          }

          const lineTotal = retLine.quantity * origLine.unitPrice;
          totalRefund += lineTotal;

          returnLines.push({
            documentId: 0,
            lineNumber: i + 1,
            productId: origLine.productId,
            description: `برگشت: ${origLine.description}`,
            quantity: retLine.quantity,
            unitPrice: origLine.unitPrice,
            discount: 0,
            total: lineTotal,
            serialId: retLine.serialId,
            costPrice: origLine.costPrice,
          });

          // Return stock to inventory
          const warehouseId = originalDoc.warehouseId || (await productService.getDefaultWarehouse())?.id;
          if (warehouseId) {
            await productService.addStock(
              origLine.productId!,
              warehouseId,
              retLine.quantity,
              origLine.costPrice || 0,
              undefined,
              retLine.serialId
            );
          }

          // Update serial status
          if (retLine.serialId) {
            await db.productSerials.update(retLine.serialId, {
              status: 'returned',
            });
          }
        }

        const docNumber = await generateDocNumber('sale_return');
        const now = new Date().toISOString();

        const docId = await db.documents.add({
          docNumber,
          docType: 'sale_return',
          partyId: data.partyId,
          date: data.date,
          subtotal: totalRefund,
          discount: 0,
          total: totalRefund,
          paidAmount: 0,
          remainingAmount: totalRefund,
          status: 'posted',
          notes: data.notes || `برگشت از فاکتور ${originalDoc.docNumber}`,
          warehouseId: originalDoc.warehouseId,
          createdAt: now,
          updatedAt: now,
        });

        for (const line of returnLines) {
          line.documentId = docId;
          await db.documentLines.add(line as DocumentLine);
        }

        // Reduce customer balance
        const party = await db.parties.get(data.partyId);
        if (party) {
          await db.parties.update(data.partyId, {
            currentBalance: Math.max(0, (party.currentBalance || 0) - totalRefund),
            updatedAt: now,
          });
        }

        await authService.logAudit('create', 'sale_return', String(docId), `برگشت فروش ${docNumber}`);
        return { success: true, id: docId };
      }
    ).catch(err => ({ success: false, error: err.message || 'خطا در ثبت برگشت فروش' }));
  },

  // ============ Payments ============

  async createPayment(data: {
    partyId: number;
    paymentType: 'receipt' | 'payment';
    amount: number;
    method: 'cash' | 'bank' | 'check';
    documentIds?: number[];
    reference?: string;
    notes?: string;
  }): Promise<{ success: boolean; id?: number; error?: string }> {
    const party = await db.parties.get(data.partyId);
    if (!party) return { success: false, error: 'طرف حساب یافت نشد' };
    if (data.amount <= 0) return { success: false, error: 'مبلغ باید بیشتر از صفر باشد' };

    const now = new Date().toISOString();

    return db.transaction('rw',
      [db.payments, db.paymentAllocations, db.parties, db.documents],
      async () => {
        const paymentId = await db.payments.add({
          partyId: data.partyId,
          paymentType: data.paymentType,
          amount: data.amount,
          method: data.method,
          reference: data.reference,
          notes: data.notes,
          createdAt: now,
        });

        // Allocate to documents
        let allocated = 0;
        if (data.documentIds) {
          for (const docId of data.documentIds) {
            const doc = await db.documents.get(docId);
            if (!doc) continue;

            const remaining = doc.remainingAmount;
            const allocAmount = Math.min(remaining, data.amount - allocated);
            if (allocAmount <= 0) break;

            await db.paymentAllocations.add({
              paymentId,
              documentId: docId,
              allocatedAmount: allocAmount,
            });

            // Update document remaining
            await db.documents.update(docId, {
              remainingAmount: Math.max(0, remaining - allocAmount),
              paidAmount: doc.paidAmount + allocAmount,
              updatedAt: now,
            });

            allocated += allocAmount;
          }
        }

        // Update party balance
        const balanceChange = data.paymentType === 'receipt' ? -data.amount : data.amount;
        await db.parties.update(data.partyId, {
          currentBalance: Math.max(0, (party.currentBalance || 0) + balanceChange),
          updatedAt: now,
        });

        await authService.logAudit('create', 'payment', String(paymentId), 
          `${data.paymentType === 'receipt' ? 'دریافت' : 'پرداخت'} ${data.amount} افغانی`);
        
        return { success: true, id: paymentId };
      }
    ).catch(err => ({ success: false, error: err.message || 'خطا در ثبت پرداخت' }));
  },

  async getPayments(partyId?: number): Promise<Payment[]> {
    if (partyId) {
      return db.payments.where('partyId').equals(partyId).reverse().sortBy('createdAt');
    }
    return db.payments.orderBy('createdAt').reverse().toArray();
  },

  async getDocumentPayments(documentId: number): Promise<Payment[]> {
    const allocations = await db.paymentAllocations.where('documentId').equals(documentId).toArray();
    const payments: Payment[] = [];
    for (const alloc of allocations) {
      const payment = await db.payments.get(alloc.paymentId);
      if (payment) payments.push(payment);
    }
    return payments;
  },

  // ============ Statistics ============

  async getDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    
    const allDocs = await db.documents.toArray();
    const salesDocs = allDocs.filter(d => d.docType === 'sale' && d.status === 'posted');
    const purchaseDocs = allDocs.filter(d => d.docType === 'purchase' && d.status === 'posted');
    
    const todaySales = salesDocs.filter(d => d.date === today);
    const todayPurchases = purchaseDocs.filter(d => d.date === today);

    const totalSales = salesDocs.reduce((sum, d) => sum + d.total, 0);
    const totalPurchases = purchaseDocs.reduce((sum, d) => sum + d.total, 0);
    const todaySalesTotal = todaySales.reduce((sum, d) => sum + d.total, 0);

    // Customer debts
    const customers = await db.parties.where('type').equals('customer').toArray();
    const totalCustomerDebt = customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);

    // Supplier debts
    const suppliers = await db.parties.where('type').equals('supplier').toArray();
    const totalSupplierDebt = suppliers.reduce((sum, s) => sum + (s.currentBalance || 0), 0);

    // Inventory value
    const balances = await db.inventoryBalances.toArray();
    const inventoryValue = balances.reduce((sum, b) => sum + b.totalCost, 0);

    // Low stock
    const products = await db.products.where('isActive').equals(1).toArray();
    const lowStockCount = balances.filter(b => {
      const product = products.find(p => p.id === b.productId);
      return product && b.quantity <= product.minStock;
    }).length;

    // Calculate COGS for gross profit
    let totalCOGS = 0;
    for (const saleDoc of salesDocs) {
      const lines = await db.documentLines.where('documentId').equals(saleDoc.id!).toArray();
      totalCOGS += lines.reduce((sum, l) => sum + ((l.costPrice || 0) * l.quantity), 0);
    }
    const grossProfit = totalSales - totalCOGS;

    return {
      totalSales,
      totalPurchases,
      todaySalesTotal,
      totalCustomerDebt,
      totalSupplierDebt,
      inventoryValue,
      lowStockCount,
      grossProfit,
      totalDocuments: allDocs.length,
      salesCount: salesDocs.length,
      purchaseCount: purchaseDocs.length,
    };
  },
};
