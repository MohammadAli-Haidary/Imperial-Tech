import { db, Expense, ExpenseCategory } from '../db/database';
import { authService } from './authService';

export const expenseService = {
  async getAll(): Promise<Expense[]> {
    return db.expenses.orderBy('date').reverse().toArray();
  },

  async getCategories(): Promise<ExpenseCategory[]> {
    return db.expenseCategories.toArray();
  },

  async createCategory(name: string): Promise<{ success: boolean; id?: number; error?: string }> {
    if (!name.trim()) return { success: false, error: 'نام دسته الزامی است' };
    const id = await db.expenseCategories.add({
      name: name.trim(),
      createdAt: new Date().toISOString(),
    });
    return { success: true, id };
  },

  async create(data: {
    date: string;
    categoryId?: number;
    amount: number;
    paymentMethod: 'cash' | 'bank';
    description: string;
  }): Promise<{ success: boolean; id?: number; error?: string }> {
    if (data.amount <= 0) return { success: false, error: 'مبلغ باید بیشتر از صفر باشد' };
    if (!data.description.trim()) return { success: false, error: 'شرح مصرف الزامی است' };

    const id = await db.expenses.add({
      ...data,
      createdAt: new Date().toISOString(),
    });

    await authService.logAudit('create', 'expense', String(id), `مصرف: ${data.amount} افغانی`);
    return { success: true, id };
  },

  async delete(id: number): Promise<{ success: boolean; error?: string }> {
    await db.expenses.delete(id);
    return { success: true };
  },

  async getTotalByCategory(): Promise<Array<{ categoryId: number; categoryName: string; total: number }>> {
    const expenses = await db.expenses.toArray();
    const categories = await db.expenseCategories.toArray();
    
    const grouped: Record<number, number> = {};
    for (const exp of expenses) {
      const catId = exp.categoryId || 0;
      grouped[catId] = (grouped[catId] || 0) + exp.amount;
    }

    return Object.entries(grouped).map(([catId, total]) => {
      const cat = categories.find(c => c.id === Number(catId));
      return {
        categoryId: Number(catId),
        categoryName: cat?.name || 'بدون دسته',
        total,
      };
    });
  },
};
