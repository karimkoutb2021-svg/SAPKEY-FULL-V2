'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChartAccount {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category: string;
  parentId: string | null;
  balance: number;
  isActive: boolean;
  description?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: number;
  description: string;
  descriptionAr: string;
  lines: JournalLine[];
  type: 'sales' | 'purchase' | 'expense' | 'payment' | 'receipt' | 'transfer' | 'salary' | 'adjustment' | 'petty_cash';
  status: 'draft' | 'posted' | 'cancelled';
  createdBy: string;
  createdAt: number;
  reference?: string;
  attachment?: string;
}

export interface JournalLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface PettyCashEntry {
  id: string;
  date: number;
  description: string;
  amount: number;
  accountId: string;
  paidBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  receipt?: string;
  createdAt: number;
}

const DEFAULT_CHART: ChartAccount[] = [
  // === الأصول (1000-1999) ===
  { id: 'a1', code: '1000', nameAr: 'الأصول المتداولة', nameEn: 'Current Assets', type: 'asset', category: 'asset', parentId: null, balance: 0, isActive: true },
  { id: 'a1_1', code: '1001', nameAr: 'الصندوق', nameEn: 'Cash', type: 'asset', category: 'asset', parentId: 'a1', balance: 0, isActive: true, description: 'نقدية الصندوق الرئيسي' },
  { id: 'a1_2', code: '1002', nameAr: 'الصندوق الفرعي', nameEn: 'Petty Cash', type: 'asset', category: 'asset', parentId: 'a1', balance: 0, isActive: true, description: 'مصروفات نثرية' },
  { id: 'a1_3', code: '1003', nameAr: 'البنك - الأهلي', nameEn: 'Bank - NBE', type: 'asset', category: 'asset', parentId: 'a1', balance: 0, isActive: true },
  { id: 'a1_4', code: '1004', nameAr: 'البنك - CIB', nameEn: 'Bank - CIB', type: 'asset', category: 'asset', parentId: 'a1', balance: 0, isActive: true },
  { id: 'a1_5', code: '1005', nameAr: 'ذمم العملاء', nameEn: 'Accounts Receivable', type: 'asset', category: 'asset', parentId: 'a1', balance: 0, isActive: true, description: 'مبالغ مستحقة من العملاء' },
  { id: 'a1_6', code: '1006', nameAr: 'المخزون', nameEn: 'Inventory', type: 'asset', category: 'asset', parentId: 'a1', balance: 0, isActive: true, description: 'رصيد المخزون الحالي' },
  { id: 'a1_7', code: '1007', nameAr: 'سلف موظفين', nameEn: 'Employee Advances', type: 'asset', category: 'asset', parentId: 'a1', balance: 0, isActive: true },

  { id: 'a2', code: '1100', nameAr: 'الأصول الثابتة', nameEn: 'Fixed Assets', type: 'asset', category: 'asset', parentId: null, balance: 0, isActive: true },
  { id: 'a2_1', code: '1101', nameAr: 'أثاث ومعدات', nameEn: 'Furniture & Equipment', type: 'asset', category: 'asset', parentId: 'a2', balance: 0, isActive: true },
  { id: 'a2_2', code: '1102', nameAr: 'أجهزة كمبيوتر', nameEn: 'Computer Equipment', type: 'asset', category: 'asset', parentId: 'a2', balance: 0, isActive: true },
  { id: 'a2_3', code: '1103', nameAr: 'ثلاجات ومجمدات', nameEn: 'Refrigerators & Freezers', type: 'asset', category: 'asset', parentId: 'a2', balance: 0, isActive: true },
  { id: 'a2_4', code: '1104', nameAr: 'سيارات توصيل', nameEn: 'Delivery Vehicles', type: 'asset', category: 'asset', parentId: 'a2', balance: 0, isActive: true },
  { id: 'a2_5', code: '1105', nameAr: 'مجمع الإهلاك', nameEn: 'Accumulated Depreciation', type: 'asset', category: 'asset', parentId: 'a2', balance: 0, isActive: true },

  // === الخصوم (2000-2999) ===
  { id: 'l1', code: '2000', nameAr: 'الخصوم المتداولة', nameEn: 'Current Liabilities', type: 'liability', category: 'liability', parentId: null, balance: 0, isActive: true },
  { id: 'l1_1', code: '2001', nameAr: 'ذمم الموردين', nameEn: 'Accounts Payable', type: 'liability', category: 'liability', parentId: 'l1', balance: 0, isActive: true, description: 'مبالغ مستحقة للموردين' },
  { id: 'l1_2', code: '2002', nameAr: 'ضريبة القيمة المضافة', nameEn: 'VAT Payable', type: 'liability', category: 'liability', parentId: 'l1', balance: 0, isActive: true, description: 'ضريبة 15% مستحقة' },
  { id: 'l1_3', code: '2003', nameAr: 'رواتب مستحقة', nameEn: 'Accrued Salaries', type: 'liability', category: 'liability', parentId: 'l1', balance: 0, isActive: true },
  { id: 'l1_4', code: '2004', nameAr: 'تأمينات مستحقة', nameEn: 'Accrued Insurance', type: 'liability', category: 'liability', parentId: 'l1', balance: 0, isActive: true },
  { id: 'l1_5', code: '2005', nameAr: 'قروض قصيرة الأجل', nameEn: 'Short-term Loans', type: 'liability', category: 'liability', parentId: 'l1', balance: 0, isActive: true },

  { id: 'l2', code: '2100', nameAr: 'الخصوم طويلة الأجل', nameEn: 'Long-term Liabilities', type: 'liability', category: 'liability', parentId: null, balance: 0, isActive: true },
  { id: 'l2_1', code: '2101', nameAr: 'قروض بنكية', nameEn: 'Bank Loans', type: 'liability', category: 'liability', parentId: 'l2', balance: 0, isActive: true },

  // === حقوق الملكية (3000-3999) ===
  { id: 'e1', code: '3000', nameAr: 'حقوق الملكية', nameEn: 'Equity', type: 'equity', category: 'equity', parentId: null, balance: 0, isActive: true },
  { id: 'e1_1', code: '3001', nameAr: 'رأس المال', nameEn: 'Capital', type: 'equity', category: 'equity', parentId: 'e1', balance: 0, isActive: true },
  { id: 'e1_2', code: '3002', nameAr: 'أرباح محتجزة', nameEn: 'Retained Earnings', type: 'equity', category: 'equity', parentId: 'e1', balance: 0, isActive: true },
  { id: 'e1_3', code: '3003', nameAr: 'سحب المالك', nameEn: 'Owner Drawings', type: 'equity', category: 'equity', parentId: 'e1', balance: 0, isActive: true },

  // === الإيرادات (4000-4999) ===
  { id: 'r1', code: '4000', nameAr: 'الإيرادات', nameEn: 'Revenue', type: 'revenue', category: 'revenue', parentId: null, balance: 0, isActive: true },
  { id: 'r1_1', code: '4001', nameAr: 'مبيعات نقدية', nameEn: 'Cash Sales', type: 'revenue', category: 'revenue', parentId: 'r1', balance: 0, isActive: true, description: 'إيرادات المبيعات النقدية من POS' },
  { id: 'r1_2', code: '4002', nameAr: 'مبيعات آجلة', nameEn: 'Credit Sales', type: 'revenue', category: 'revenue', parentId: 'r1', balance: 0, isActive: true, description: 'إيرادات المبيعات الآجلة' },
  { id: 'r1_3', code: '4003', nameAr: 'مبيعات جملة', nameEn: 'Wholesale Sales', type: 'revenue', category: 'revenue', parentId: 'r1', balance: 0, isActive: true },
  { id: 'r1_4', code: '4004', nameAr: 'مبيعات إلكترونية', nameEn: 'Online Sales', type: 'revenue', category: 'revenue', parentId: 'r1', balance: 0, isActive: true },
  { id: 'r1_5', code: '4005', nameAr: 'إيرادات توصيل', nameEn: 'Delivery Revenue', type: 'revenue', category: 'revenue', parentId: 'r1', balance: 0, isActive: true },
  { id: 'r1_6', code: '4006', nameAr: 'مرتجعات مبيعات', nameEn: 'Sales Returns', type: 'revenue', category: 'revenue', parentId: 'r1', balance: 0, isActive: true },
  { id: 'r1_7', code: '4007', nameAr: 'خصومات مبيعات', nameEn: 'Sales Discounts', type: 'revenue', category: 'revenue', parentId: 'r1', balance: 0, isActive: true },
  { id: 'r1_8', code: '4008', nameAr: 'إيرادات أخرى', nameEn: 'Other Revenue', type: 'revenue', category: 'revenue', parentId: 'r1', balance: 0, isActive: true },

  // === المصروفات (5000-6999) ===
  { id: 'c1', code: '5000', nameAr: 'تكلفة البضاعة المباعة', nameEn: 'Cost of Goods Sold', type: 'expense', category: 'expense', parentId: null, balance: 0, isActive: true },
  { id: 'c1_1', code: '5001', nameAr: 'تكلفة مشتريات', nameEn: 'Purchase Cost', type: 'expense', category: 'expense', parentId: 'c1', balance: 0, isActive: true },
  { id: 'c1_2', code: '5002', nameAr: 'تكلفة شحن مشتريات', nameEn: 'Freight In', type: 'expense', category: 'expense', parentId: 'c1', balance: 0, isActive: true },
  { id: 'c1_3', code: '5003', nameAr: 'مرتجعات مشتريات', nameEn: 'Purchase Returns', type: 'expense', category: 'expense', parentId: 'c1', balance: 0, isActive: true },
  { id: 'c1_4', code: '5004', nameAr: 'نقص مخزون', nameEn: 'Inventory Shrinkage', type: 'expense', category: 'expense', parentId: 'c1', balance: 0, isActive: true },
  { id: 'c1_5', code: '5005', nameAr: 'تالف مخزون', nameEn: 'Inventory Damage', type: 'expense', category: 'expense', parentId: 'c1', balance: 0, isActive: true },

  { id: 'o1', code: '6000', nameAr: 'المصروفات التشغيلية', nameEn: 'Operating Expenses', type: 'expense', category: 'expense', parentId: null, balance: 0, isActive: true },
  { id: 'o1_1', code: '6001', nameAr: 'رواتب الموظفين', nameEn: 'Employee Salaries', type: 'expense', category: 'expense', parentId: 'o1', balance: 0, isActive: true },
  { id: 'o1_2', code: '6002', nameAr: 'تأمينات اجتماعية', nameEn: 'Social Insurance', type: 'expense', category: 'expense', parentId: 'o1', balance: 0, isActive: true },
  { id: 'o1_3', code: '6003', nameAr: 'إيجار', nameEn: 'Rent', type: 'expense', category: 'expense', parentId: 'o1', balance: 0, isActive: true },
  { id: 'o1_4', code: '6004', nameAr: 'كهرباء', nameEn: 'Electricity', type: 'expense', category: 'expense', parentId: 'o1', balance: 0, isActive: true },
  { id: 'o1_5', code: '6005', nameAr: 'مياه', nameEn: 'Water', type: 'expense', category: 'expense', parentId: 'o1', balance: 0, isActive: true },
  { id: 'o1_6', code: '6006', nameAr: 'غاز', nameEn: 'Gas', type: 'expense', category: 'expense', parentId: 'o1', balance: 0, isActive: true },
  { id: 'o1_7', code: '6007', nameAr: 'إنترنت واتصالات', nameEn: 'Internet & Telecom', type: 'expense', category: 'expense', parentId: 'o1', balance: 0, isActive: true },
  { id: 'o1_8', code: '6008', nameAr: 'صيانة معدات', nameEn: 'Equipment Maintenance', type: 'expense', category: 'expense', parentId: 'o1', balance: 0, isActive: true },
  { id: 'o1_9', code: '6009', nameAr: 'أكياس ومواد تغليف', nameEn: 'Bags & Packaging', type: 'expense', category: 'expense', parentId: 'o1', balance: 0, isActive: true },
  { id: 'o1_10', code: '6010', nameAr: 'نظافة', nameEn: 'Cleaning Supplies', type: 'expense', category: 'expense', parentId: 'o1', balance: 0, isActive: true },
  { id: 'o1_11', code: '6011', nameAr: 'مصروفات توصيل', nameEn: 'Delivery Expenses', type: 'expense', category: 'expense', parentId: 'o1', balance: 0, isActive: true },
  { id: 'o1_12', code: '6012', nameAr: 'وقود سيارات', nameEn: 'Fuel', type: 'expense', category: 'expense', parentId: 'o1', balance: 0, isActive: true },
  { id: 'o1_13', code: '6013', nameAr: 'إهلاك', nameEn: 'Depreciation', type: 'expense', category: 'expense', parentId: 'o1', balance: 0, isActive: true },

  { id: 'a3', code: '6100', nameAr: 'المصروفات الإدارية', nameEn: 'Administrative Expenses', type: 'expense', category: 'expense', parentId: null, balance: 0, isActive: true },
  { id: 'a3_1', code: '6101', nameAr: 'قرطاسية', nameEn: 'Stationery', type: 'expense', category: 'expense', parentId: 'a3', balance: 0, isActive: true },
  { id: 'a3_2', code: '6102', nameAr: 'اشتراكات برمجيات', nameEn: 'Software Subscriptions', type: 'expense', category: 'expense', parentId: 'a3', balance: 0, isActive: true },
  { id: 'a3_3', code: '6103', nameAr: 'رسوم بنكية', nameEn: 'Bank Charges', type: 'expense', category: 'expense', parentId: 'a3', balance: 0, isActive: true },
  { id: 'a3_4', code: '6104', nameAr: 'تأمين', nameEn: 'Insurance', type: 'expense', category: 'expense', parentId: 'a3', balance: 0, isActive: true },
  { id: 'a3_5', code: '6105', nameAr: 'استشارات قانونية', nameEn: 'Legal Consultation', type: 'expense', category: 'expense', parentId: 'a3', balance: 0, isActive: true },
  { id: 'a3_6', code: '6106', nameAr: 'ترخيص تجاري', nameEn: 'Commercial License', type: 'expense', category: 'expense', parentId: 'a3', balance: 0, isActive: true },

  { id: 'm1', code: '6200', nameAr: 'المصروفات البيعية', nameEn: 'Selling Expenses', type: 'expense', category: 'expense', parentId: null, balance: 0, isActive: true },
  { id: 'm1_1', code: '6201', nameAr: 'إعلانات وتسويق', nameEn: 'Advertising & Marketing', type: 'expense', category: 'expense', parentId: 'm1', balance: 0, isActive: true },
  { id: 'm1_2', code: '6202', nameAr: 'عمولات مبيعات', nameEn: 'Sales Commissions', type: 'expense', category: 'expense', parentId: 'm1', balance: 0, isActive: true },
  { id: 'm1_3', code: '6203', nameAr: 'عروض وخصومات', nameEn: 'Promotions & Discounts', type: 'expense', category: 'expense', parentId: 'm1', balance: 0, isActive: true },

  { id: 'p1', code: '6300', nameAr: 'مصروفات نثرية', nameEn: 'Petty Cash Expenses', type: 'expense', category: 'expense', parentId: null, balance: 0, isActive: true },
  { id: 'p1_1', code: '6301', nameAr: 'مشروبات موظفين', nameEn: 'Staff Beverages', type: 'expense', category: 'expense', parentId: 'p1', balance: 0, isActive: true },
  { id: 'p1_2', code: '6302', nameAr: 'أدوات تنظيف طارئة', nameEn: 'Emergency Cleaning', type: 'expense', category: 'expense', parentId: 'p1', balance: 0, isActive: true },
  { id: 'p1_3', code: '6303', nameAr: 'مواصلات', nameEn: 'Transportation', type: 'expense', category: 'expense', parentId: 'p1', balance: 0, isActive: true },
  { id: 'p1_4', code: '6304', nameAr: 'طوارئ', nameEn: 'Emergency', type: 'expense', category: 'expense', parentId: 'p1', balance: 0, isActive: true },
];

interface AccountingState {
  accounts: ChartAccount[];
  journalEntries: JournalEntry[];
  pettyCashEntries: PettyCashEntry[];
  nextEntryNumber: number;

  // Accounts
  addAccount: (account: { code: string; nameAr: string; nameEn: string; type: ChartAccount['type']; category?: string; parentId: string | null; isActive: boolean; description?: string }) => void;
  updateAccount: (id: string, updates: Partial<ChartAccount>) => void;
  deleteAccount: (id: string) => void;
  getAccount: (id: string) => ChartAccount | undefined;
  getAccountsByType: (type: ChartAccount['type']) => ChartAccount[];
  getChildAccounts: (parentId: string) => ChartAccount[];
  getRootAccounts: () => ChartAccount[];

  // Journal
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'entryNumber' | 'createdAt'>) => string;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  cancelJournalEntry: (id: string) => void;
  getJournalEntries: (filters?: { type?: string; status?: string; from?: number; to?: number }) => JournalEntry[];
  getEntryById: (id: string) => JournalEntry | undefined;

  // Petty Cash
  addPettyCashEntry: (entry: Omit<PettyCashEntry, 'id' | 'createdAt'>) => void;
  approvePettyCashEntry: (id: string, approvedBy: string) => void;
  rejectPettyCashEntry: (id: string) => void;
  getPettyCashEntries: (status?: string) => PettyCashEntry[];

  // Balances
  updateAccountBalance: (accountId: string, amount: number, isDebit: boolean) => void;
  getAccountBalance: (accountId: string) => number;
  getTrialBalance: () => { accounts: { account: ChartAccount; debit: number; credit: number }[]; totalDebit: number; totalCredit: number };
  getProfitLoss: () => { revenue: number; cogs: number; operatingExpenses: number; adminExpenses: number; sellingExpenses: number; pettyCashExpenses: number; netProfit: number };
  getBalanceSheet: () => { assets: number; liabilities: number; equity: number; netProfit: number; total: number };
}

export const useAccountingStore = create<AccountingState>()(
  persist(
    (set, get) => ({
      accounts: DEFAULT_CHART,
      journalEntries: [],
      pettyCashEntries: [],
      nextEntryNumber: 1,

      addAccount: (account) => {
        const newAccount: ChartAccount = {
          id: `acc_${Date.now()}`,
          code: account.code,
          nameAr: account.nameAr,
          nameEn: account.nameEn,
          type: account.type,
          category: account.category || account.type,
          parentId: account.parentId,
          balance: 0,
          isActive: account.isActive,
          description: account.description,
        };
        set({ accounts: [...get().accounts, newAccount] });
      },

      updateAccount: (id, updates) => {
        set({ accounts: get().accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)) });
      },

      deleteAccount: (id) => {
        set({ accounts: get().accounts.filter((a) => a.id !== id && a.parentId !== id) });
      },

      getAccount: (id) => get().accounts.find((a) => a.id === id),

      getAccountsByType: (type) => get().accounts.filter((a) => a.type === type && a.isActive),

      getChildAccounts: (parentId) => get().accounts.filter((a) => a.parentId === parentId && a.isActive),

      getRootAccounts: () => get().accounts.filter((a) => a.parentId === null && a.isActive),

      addJournalEntry: (entry) => {
        const entryNumber = `JE-${String(get().nextEntryNumber).padStart(4, '0')}`;
        const newEntry: JournalEntry = {
          ...entry,
          id: `je_${Date.now()}`,
          entryNumber,
          createdAt: Date.now(),
        };

        // Update account balances
        const { accounts } = get();
        const updatedAccounts = accounts.map((acc) => {
          const line = newEntry.lines.find((l) => l.accountId === acc.id);
          if (!line) return acc;
          const newBalance = acc.balance + line.debit - line.credit;
          return { ...acc, balance: newBalance };
        });

        set({
          journalEntries: [newEntry, ...get().journalEntries],
          nextEntryNumber: get().nextEntryNumber + 1,
          accounts: updatedAccounts,
        });

        return entryNumber;
      },

      updateJournalEntry: (id, updates) => {
        set({ journalEntries: get().journalEntries.map((e) => (e.id === id ? { ...e, ...updates } : e)) });
      },

      cancelJournalEntry: (id) => {
        const entry = get().journalEntries.find((e) => e.id === id);
        if (!entry || entry.status === 'cancelled') return;

        // Reverse the balances
        const { accounts } = get();
        const updatedAccounts = accounts.map((acc) => {
          const line = entry.lines.find((l) => l.accountId === acc.id);
          if (!line) return acc;
          const newBalance = acc.balance - line.debit + line.credit;
          return { ...acc, balance: newBalance };
        });

        set({
          journalEntries: get().journalEntries.map((e) => (e.id === id ? { ...e, status: 'cancelled' as const } : e)),
          accounts: updatedAccounts,
        });
      },

      getJournalEntries: (filters) => {
        let entries = get().journalEntries;
        if (filters?.type) entries = entries.filter((e) => e.type === filters.type);
        if (filters?.status) entries = entries.filter((e) => e.status === filters.status);
        if (filters?.from) entries = entries.filter((e) => e.date >= filters.from!);
        if (filters?.to) entries = entries.filter((e) => e.date <= filters.to!);
        return entries;
      },

      getEntryById: (id) => get().journalEntries.find((e) => e.id === id),

      addPettyCashEntry: (entry) => {
        const newEntry: PettyCashEntry = {
          ...entry,
          id: `pc_${Date.now()}`,
          createdAt: Date.now(),
        };
        set({ pettyCashEntries: [newEntry, ...get().pettyCashEntries] });
      },

      approvePettyCashEntry: (id, approvedBy) => {
        const entry = get().pettyCashEntries.find((e) => e.id === id);
        if (!entry) return;

        // Create journal entry for approved petty cash
        get().addJournalEntry({
          date: entry.date,
          description: `مصروف نثري: ${entry.description}`,
          descriptionAr: `مصروف نثري: ${entry.description}`,
          lines: [
            { accountId: entry.accountId, accountName: get().getAccount(entry.accountId)?.nameAr || '', debit: entry.amount, credit: 0 },
            { accountId: 'a1_2', accountName: 'الصندوق الفرعي', debit: 0, credit: entry.amount },
          ],
          type: 'petty_cash',
          status: 'posted',
          createdBy: approvedBy,
          reference: id,
        });

        set({
          pettyCashEntries: get().pettyCashEntries.map((e) =>
            e.id === id ? { ...e, status: 'approved' as const, approvedBy } : e
          ),
        });
      },

      rejectPettyCashEntry: (id) => {
        set({
          pettyCashEntries: get().pettyCashEntries.map((e) =>
            e.id === id ? { ...e, status: 'rejected' as const } : e
          ),
        });
      },

      getPettyCashEntries: (status) => {
        let entries = get().pettyCashEntries;
        if (status) entries = entries.filter((e) => e.status === status);
        return entries;
      },

      updateAccountBalance: (accountId, amount, isDebit) => {
        set({
          accounts: get().accounts.map((a) =>
            a.id === accountId ? { ...a, balance: a.balance + (isDebit ? amount : -amount) } : a
          ),
        });
      },

      getAccountBalance: (accountId) => {
        return get().accounts.find((a) => a.id === accountId)?.balance || 0;
      },

      getTrialBalance: () => {
        const accounts = get().accounts.filter((a) => a.isActive && a.balance !== 0);
        let totalDebit = 0;
        let totalCredit = 0;

        const result = accounts.map((account) => {
          let debit = 0;
          let credit = 0;

          if (account.type === 'asset' || account.type === 'expense') {
            if (account.balance > 0) debit = account.balance;
            else credit = Math.abs(account.balance);
          } else {
            if (account.balance > 0) credit = account.balance;
            else debit = Math.abs(account.balance);
          }

          totalDebit += debit;
          totalCredit += credit;

          return { account, debit, credit };
        });

        return { accounts: result, totalDebit, totalCredit };
      },

      getProfitLoss: () => {
        const accounts = get().accounts;
        const getBalance = (parentId: string) =>
          accounts
            .filter((a) => a.parentId === parentId)
            .reduce((sum, a) => sum + Math.abs(a.balance), 0);

        const revenue = getBalance('r1');
        const cogs = getBalance('c1');
        const operatingExpenses = getBalance('o1');
        const adminExpenses = getBalance('a3');
        const sellingExpenses = getBalance('m1');
        const pettyCashExpenses = getBalance('p1');

        const netProfit = revenue - cogs - operatingExpenses - adminExpenses - sellingExpenses - pettyCashExpenses;

        return { revenue, cogs, operatingExpenses, adminExpenses, sellingExpenses, pettyCashExpenses, netProfit };
      },

      getBalanceSheet: () => {
        const accounts = get().accounts;
        const getBalance = (parentId: string) =>
          accounts
            .filter((a) => a.parentId === parentId)
            .reduce((sum, a) => sum + Math.abs(a.balance), 0);

        const assets = getBalance('a1') + getBalance('a2');
        const liabilities = getBalance('l1') + getBalance('l2');
        const equity = getBalance('e1');
        const netProfit = get().getProfitLoss().netProfit;

        return { assets, liabilities, equity, netProfit, total: assets };
      },
    }),
    {
      name: 'accounting-store',
      version: 1,
    }
  )
);
