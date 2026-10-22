import { db, User, AuditLog } from '../db/database';

// ============ Password Hashing (scrypt-like using Web Crypto) ============

async function generateSalt(): Promise<string> {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // Double hash for extra security (simulating scrypt iterations)
  const hashBuffer2 = await crypto.subtle.digest('SHA-256', new Uint8Array([...new Uint8Array(hashBuffer), ...data]));
  return Array.from(new Uint8Array(hashBuffer2), b => b.toString(16).padStart(2, '0')).join('');
}

// ============ Auth State ============

let currentUser: User | null = null;
let loginAttempts = 0;
let lockoutUntil: number | null = null;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

// ============ Auth Service ============

export const authService = {
  // Check if admin exists
  async hasAdmin(): Promise<boolean> {
    const count = await db.users.count();
    return count > 0;
  },

  // Register admin (first time setup)
  async registerAdmin(data: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; error?: string }> {
    // Validation
    if (!data.fullName || !data.username || !data.email || !data.password) {
      return { success: false, error: 'تمام فیلدها الزامی هستند' };
    }
    if (data.password !== data.confirmPassword) {
      return { success: false, error: 'رمز عبور و تکرار آن مطابقت ندارند' };
    }
    if (data.password.length < 6) {
      return { success: false, error: 'رمز عبور باید حداقل ۶ حرف باشد' };
    }
    if (data.username.length < 3) {
      return { success: false, error: 'نام کاربری باید حداقل ۳ حرف باشد' };
    }

    // Check existing admin
    const existingUser = await db.users.where('username').equals(data.username).first();
    if (existingUser) {
      return { success: false, error: 'این نام کاربری قبلاً ثبت شده است' };
    }

    const existingEmail = await db.users.where('email').equals(data.email).first();
    if (existingEmail) {
      return { success: false, error: 'این ایمیل قبلاً ثبت شده است' };
    }

    // Hash password
    const salt = await generateSalt();
    const passwordHash = await hashPassword(data.password, salt);

    const now = new Date().toISOString();
    await db.users.add({
      fullName: data.fullName,
      username: data.username,
      email: data.email,
      passwordHash,
      salt,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await this.logAudit('register', 'user', undefined, `ثبت‌نام مدیر: ${data.username}`);

    return { success: true };
  },

  // Login
  async login(username: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
    // Check lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 60000);
      return { success: false, error: `ورود موقتاً مسدود شده. ${remaining} دقیقه صبر کنید` };
    }

    const user = await db.users.where('username').equals(username).first();
    
    if (!user) {
      loginAttempts++;
      if (loginAttempts >= MAX_ATTEMPTS) {
        lockoutUntil = Date.now() + LOCKOUT_DURATION;
        loginAttempts = 0;
      }
      return { success: false, error: 'نام کاربری یا رمز عبور نادرست است' };
    }

    if (!user.isActive) {
      return { success: false, error: 'این حساب غیرفعال است' };
    }

    const hash = await hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      loginAttempts++;
      if (loginAttempts >= MAX_ATTEMPTS) {
        lockoutUntil = Date.now() + LOCKOUT_DURATION;
        loginAttempts = 0;
      }
      return { success: false, error: 'نام کاربری یا رمز عبور نادرست است' };
    }

    // Success
    loginAttempts = 0;
    lockoutUntil = null;
    currentUser = user;

    await this.logAudit('login', 'user', String(user.id), `ورود: ${user.username}`);

    return { success: true, user };
  },

  // Logout
  async logout(): Promise<void> {
    if (currentUser) {
      await this.logAudit('logout', 'user', String(currentUser.id), `خروج: ${currentUser.username}`);
    }
    currentUser = null;
  },

  // Get current user
  getCurrentUser(): User | null {
    return currentUser;
  },

  // Set current user (for session persistence)
  setCurrentUser(user: User | null) {
    currentUser = user;
  },

  // Update profile
  async updateProfile(userId: number, data: Partial<Pick<User, 'fullName' | 'email' | 'avatar'>>): Promise<{ success: boolean; error?: string }> {
    try {
      await db.users.update(userId, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      if (currentUser?.id === userId) {
        currentUser = { ...currentUser, ...data, updatedAt: new Date().toISOString() };
      }
      await this.logAudit('update_profile', 'user', String(userId));
      return { success: true };
    } catch (error) {
      return { success: false, error: 'خطا در بروزرسانی پروفایل' };
    }
  },

  // Change password
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const user = await db.users.get(userId);
    if (!user) return { success: false, error: 'کاربر یافت نشد' };

    const currentHash = await hashPassword(currentPassword, user.salt);
    if (currentHash !== user.passwordHash) {
      return { success: false, error: 'رمز فعلی نادرست است' };
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'رمز جدید باید حداقل ۶ حرف باشد' };
    }

    const newSalt = await generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);

    await db.users.update(userId, {
      passwordHash: newHash,
      salt: newSalt,
      updatedAt: new Date().toISOString(),
    });

    await this.logAudit('change_password', 'user', String(userId));
    return { success: true };
  },

  // Audit logging
  async logAudit(action: string, entityType: string, entityId?: string, details?: string) {
    await db.auditLogs.add({
      userId: currentUser?.id,
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString(),
    });
  },

  // Get audit logs
  async getAuditLogs(limit = 50): Promise<AuditLog[]> {
    return db.auditLogs.orderBy('createdAt').reverse().limit(limit).toArray();
  },

  // Reset lockout (for testing)
  resetLockout() {
    loginAttempts = 0;
    lockoutUntil = null;
  },
};
