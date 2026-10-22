import { db, Party } from '../db/database';
import { authService } from './authService';

export const partyService = {
  async getAll(type?: string): Promise<Party[]> {
    if (type) {
      const all = await db.parties.filter(p => p.isActive).toArray();
      return all.filter(p => p.type === type || p.type === 'both');
    }
    return db.parties.filter(p => p.isActive).toArray();
  },

  async getById(id: number): Promise<Party | undefined> {
    return db.parties.get(id);
  },

  async create(data: Omit<Party, 'id' | 'createdAt' | 'updatedAt' | 'currentBalance'>): Promise<{ success: boolean; id?: number; error?: string }> {
    if (!data.name?.trim()) return { success: false, error: 'نام طرف حساب الزامی است' };

    // Check for duplicate name
    const existing = await db.parties.where('name').equals(data.name.trim()).first();
    if (existing) {
      return { success: false, error: 'این طرف حساب قبلاً ثبت شده است' };
    }

    const now = new Date().toISOString();
    const id = await db.parties.add({
      ...data,
      name: data.name.trim(),
      currentBalance: 0,
      createdAt: now,
      updatedAt: now,
    });

    await authService.logAudit('create', 'party', String(id), `طرف حساب: ${data.name}`);
    return { success: true, id };
  },

  async update(id: number, data: Partial<Party>): Promise<{ success: boolean; error?: string }> {
    const party = await db.parties.get(id);
    if (!party) return { success: false, error: 'طرف حساب یافت نشد' };

    await db.parties.update(id, { ...data, updatedAt: new Date().toISOString() });
    await authService.logAudit('update', 'party', String(id));
    return { success: true };
  },

  async deactivate(id: number): Promise<{ success: boolean }> {
    await db.parties.update(id, { isActive: false, updatedAt: new Date().toISOString() });
    return { success: true };
  },

  async search(query: string): Promise<Party[]> {
    const all = await db.parties.filter(p => p.isActive).toArray();
    const q = query.toLowerCase();
    return all.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.phone && p.phone.includes(q))
    );
  },

  async getStatement(partyId: number) {
    const party = await db.parties.get(partyId);
    if (!party) return null;

    const documents = await db.documents.where('partyId').equals(partyId).toArray();
    const payments = await db.payments.where('partyId').equals(partyId).toArray();

    return {
      party,
      documents: documents.sort((a, b) => a.date.localeCompare(b.date)),
      payments: payments.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      currentBalance: party.currentBalance,
    };
  },
};
