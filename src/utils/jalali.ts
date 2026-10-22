import * as jalaali from 'jalaali-js';

// Convert Gregorian to Jalali (Shamsi)
export function toJalali(date: Date | string): { jy: number; jm: number; jd: number } {
  const d = typeof date === 'string' ? new Date(date) : date;
  return jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// Convert Jalali to Gregorian
export function toGregorian(jy: number, jm: number, jd: number): Date {
  const g = jalaali.toGregorian(jy, jm, jd);
  return new Date(g.gy, g.gm - 1, g.gd);
}

// Format date as Jalali string
export function formatJalali(date: Date | string): string {
  const j = toJalali(date);
  return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
}

// Format date with month name
export function formatJalaliLong(date: Date | string): string {
  const j = toJalali(date);
  const months = [
    'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
    'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'
  ];
  return `${j.jd} ${months[j.jm - 1]} ${j.jy}`;
}

// Get today's Jalali date
export function todayJalali(): string {
  return formatJalali(new Date());
}

// Format currency (AFN)
export function formatCurrency(amountInPaisa: number): string {
  const afn = amountInPaisa / 100;
  return afn.toLocaleString('fa-AF', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ؋';
}

// Format number with Persian digits
export function toPersianDigits(str: string | number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/[0-9]/g, d => persianDigits[parseInt(d)]);
}

// Parse Jalali date string to ISO date
export function jalaliToISO(jalaliStr: string): string {
  const parts = jalaliStr.split('/').map(Number);
  if (parts.length !== 3) return new Date().toISOString().split('T')[0];
  const g = toGregorian(parts[0], parts[1], parts[2]);
  return g.toISOString().split('T')[0];
}
