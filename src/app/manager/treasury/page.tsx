'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { treasuryService, treasuryTransactionService, internalLoanService, STATUS_CONFIG, type TreasuryAccount, type TreasuryTransaction, type InternalLoan } from '@/lib/supabase/services/treasury';
import { Plus, Wallet, ArrowRightLeft, Search, Filter, Clock, CheckCircle, XCircle, RotateCcw, User, Truck, Briefcase, Camera, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const supabase = createClient();

interface TreasuryTransactionWithAccount extends TreasuryTransaction {
  treasury_accounts?: { name_ar: string } | null;
}

const typeLabels: Record<string, string> = {
  deposit: 'إيداع',
  withdrawal: 'سحب',
  transfer_in: 'تحويل وارد',
  transfer_out: 'تحويل صادر',
  transfer: 'تحويل',
  opening: 'رصيد افتتاحي',
};

const statusLabels: Record<string, string> = {
  pending: 'معلق',
  processing: 'قيد المعالجة',
  delayed: 'متأخر',
  completed: 'مكتمل',
  reconciled: 'مطابق',
  rejected: 'مرفوض',
  returned: 'مرتجع',
};

const loanStatusLabels: Record<string, string> = {
  active: 'نشط',
  partial: 'مسدد جزئياً',
  settled: 'مسدد',
};

const loanStatusColors: Record<string, string> = {
  active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  partial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  settled: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const accountTypeLabels: Record<string, string> = {
  main: 'رئيسي',
  private: 'خاص',
  branch: 'فرع',
  wallet: 'محفظة',
};

const loanTypeLabels: Record<string, string> = {
  personal: 'شخصية',
  custodian_cashier: 'عهدة كاشير',
  custodian_driver: 'عهدة مندوب',
  advance_salary: 'سلفة موظف',
};

const loanTypeColors: Record<string, string> = {
  personal: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  custodian_cashier: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  custodian_driver: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  advance_salary: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const loanTypePillLabels: Record<string, string> = {
  all: 'الكل',
  personal: 'سلفة شخصية',
  custodian_cashier: 'عهدة كاشير',
  custodian_driver: 'عهدة مندوب',
  advance_salary: 'سلفة موظف',
};

const walletProviders = [
  'Vodafone Cash',
  'InstaPay',
  'Orange Cash',
  'Etisalat Cash',
  'We Pay',
  'البنك',
];

function mapToInternalLoan(data: any): InternalLoan {
  if (data.loan_type) {
    return data;
  }
  return {
    id: data.id,
    borrower_id: data.borrower_id || '',
    borrower_name: data.employee_name || data.borrower_name || '',
    borrower_role: data.borrower_role || 'employee',
    loan_type: data.loan_type || 'personal',
    amount: data.amount,
    remaining_amount: data.remaining ?? data.remaining_amount,
    reason: data.reason || '',
    status: data.status,
    issue_date: data.issued_at || data.issue_date || data.created_at,
    expected_settlement_date: data.due_date || data.expected_settlement_date,
    settled_date: data.settled_date,
    created_at: data.created_at || data.issued_at,
  };
}

export default function TreasuryPage() {
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [transactions, setTransactions] = useState<TreasuryTransactionWithAccount[]>([]);
  const [loans, setLoans] = useState<InternalLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'deposit' | 'withdrawal' | 'transfer' | 'opening'>('deposit');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [transferToAccount, setTransferToAccount] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtering
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // New Account
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<'main' | 'private' | 'branch' | 'wallet'>('main');
  const [newAccountWalletProvider, setNewAccountWalletProvider] = useState('');
  const [newAccountOpeningBalance, setNewAccountOpeningBalance] = useState('');
  const [newAccountCurrency, setNewAccountCurrency] = useState('EGP');
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Old Loan Modal (kept for backward compat)
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanEmployeeName, setLoanEmployeeName] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanReason, setLoanReason] = useState('');
  const [loanDueDate, setLoanDueDate] = useState('');
  const [creatingLoan, setCreatingLoan] = useState(false);

  // New Internal Loan Modal
  const [showInternalLoanModal, setShowInternalLoanModal] = useState(false);
  const [newLoanType, setNewLoanType] = useState<InternalLoan['loan_type']>('personal');
  const [newLoanBorrowerName, setNewLoanBorrowerName] = useState('');
  const [newLoanAmount2, setNewLoanAmount2] = useState('');
  const [newLoanReason2, setNewLoanReason2] = useState('');
  const [newLoanSettlementDate, setNewLoanSettlementDate] = useState('');
  const [creatingInternalLoan, setCreatingInternalLoan] = useState(false);

  // Loan type filter
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>('all');

  // Partial Settle Modal
  const [showPartialSettleModal, setShowPartialSettleModal] = useState(false);
  const [partialSettleLoanId, setPartialSettleLoanId] = useState<string>('');
  const [partialSettleAmount, setPartialSettleAmount] = useState('');
  const [settlingPartial, setSettlingPartial] = useState(false);

  // Custodian
  const custodianLimit = 5000;
  const custodianBalance = accounts
    .filter(a => a.type === 'main' || a.type === 'private')
    .reduce((sum, a) => sum + a.current_balance, 0);
  const custodianPercent = Math.min((custodianBalance / custodianLimit) * 100, 100);
  const custodianWarning = custodianBalance < custodianLimit * 0.2;

  // Custodian summary computations
  const activeCustodianCashier = loans.filter(l => l.loan_type === 'custodian_cashier' && l.status !== 'settled');
  const activeCustodianDriver = loans.filter(l => l.loan_type === 'custodian_driver' && l.status !== 'settled');
  const activePersonalLoans = loans.filter(l => l.loan_type === 'personal' && l.status !== 'settled');

  const custodianCashierTotal = activeCustodianCashier.reduce((s, l) => s + l.remaining_amount, 0);
  const custodianDriverTotal = activeCustodianDriver.reduce((s, l) => s + l.remaining_amount, 0);
  const personalLoanTotal = activePersonalLoans.reduce((s, l) => s + l.remaining_amount, 0);

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('treasury-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'treasury_accounts' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'treasury_transactions' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    const [accountsRes, transactionsRes] = await Promise.all([
      supabase.from('treasury_accounts').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('treasury_transactions').select('*, treasury_accounts(name_ar)').order('created_at', { ascending: false }).limit(50),
    ]);

    if (accountsRes.data) setAccounts(accountsRes.data);
    if (transactionsRes.data) setTransactions(transactionsRes.data as TreasuryTransactionWithAccount[]);

    // Fetch internal loans (try new service first, fall back to old table)
    try {
      const { data: newLoans } = await internalLoanService.getAll();
      if (newLoans) {
        setLoans(newLoans);
      }
    } catch {
      try {
        const { data: oldLoans } = await supabase.from('treasury_loans').select('*').order('created_at', { ascending: false }).limit(20);
        if (oldLoans) {
          setLoans(oldLoans.map(mapToInternalLoan));
        }
      } catch {
        try {
          const stored = localStorage.getItem('treasury_loans');
          if (stored) {
            const parsed = JSON.parse(stored);
            setLoans(parsed.map(mapToInternalLoan));
          }
        } catch {}
      }
    }

    setLoading(false);
  }

  function saveLoansToLocal(newLoans: InternalLoan[]) {
    setLoans(newLoans);
    try { localStorage.setItem('treasury_loans', JSON.stringify(newLoans)); } catch {}
  }

  async function handleCreateAccount() {
    if (!newAccountName || !newAccountOpeningBalance) return;
    setCreatingAccount(true);

    const { error } = await supabase.from('treasury_accounts').insert({
      name_ar: newAccountName,
      type: newAccountType,
      wallet_provider: newAccountType === 'wallet' ? newAccountWalletProvider : null,
      opening_balance: parseFloat(newAccountOpeningBalance),
      current_balance: parseFloat(newAccountOpeningBalance),
      currency: newAccountCurrency,
      is_active: true,
    });

    if (!error) {
      setShowNewAccountModal(false);
      setNewAccountName('');
      setNewAccountType('main');
      setNewAccountWalletProvider('');
      setNewAccountOpeningBalance('');
      setNewAccountCurrency('EGP');
      fetchData();
    }

    setCreatingAccount(false);
  }

  async function handleCreateLoan() {
    if (!loanEmployeeName || !loanAmount || !loanDueDate) return;
    setCreatingLoan(true);

    const loan: InternalLoan = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      borrower_id: '',
      borrower_name: loanEmployeeName,
      borrower_role: 'employee',
      loan_type: 'personal',
      amount: parseFloat(loanAmount),
      remaining_amount: parseFloat(loanAmount),
      reason: loanReason,
      status: 'active',
      issue_date: new Date().toISOString(),
      expected_settlement_date: loanDueDate,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('treasury_loans').insert(loan);

    if (error) {
      saveLoansToLocal([loan, ...loans]);
    } else {
      fetchData();
    }

    setShowLoanModal(false);
    setLoanEmployeeName('');
    setLoanAmount('');
    setLoanReason('');
    setLoanDueDate('');
    setCreatingLoan(false);
  }

  async function handleCreateInternalLoan() {
    if (!newLoanBorrowerName || !newLoanAmount2) return;
    setCreatingInternalLoan(true);

    const roleMap: Record<string, 'manager' | 'cashier' | 'driver' | 'employee'> = {
      personal: 'employee',
      custodian_cashier: 'cashier',
      custodian_driver: 'driver',
      advance_salary: 'employee',
    };

    const { error } = await internalLoanService.create({
      borrower_id: '',
      borrower_name: newLoanBorrowerName,
      borrower_role: roleMap[newLoanType],
      loan_type: newLoanType,
      amount: parseFloat(newLoanAmount2),
      remaining_amount: parseFloat(newLoanAmount2),
      reason: newLoanReason2,
      status: 'active',
      issue_date: new Date().toISOString(),
      expected_settlement_date: newLoanSettlementDate || undefined,
    });

    if (error) {
      toast.error('فشل إضافة السلفة');
    } else {
      toast.success('تمت إضافة السلفة بنجاح');
      fetchData();
    }

    setShowInternalLoanModal(false);
    setNewLoanType('personal');
    setNewLoanBorrowerName('');
    setNewLoanAmount2('');
    setNewLoanReason2('');
    setNewLoanSettlementDate('');
    setCreatingInternalLoan(false);
  }

  async function handleTransactionAction(action: string, txId: string) {
    let res;
    if (action === 'confirm_receipt') {
      res = await treasuryTransactionService.confirmReceipt(txId);
    } else if (action === 'reconcile') {
      res = await treasuryTransactionService.reconcile(txId);
    } else if (action === 'processing') {
      res = await treasuryTransactionService.updateStatus(txId, 'processing');
    } else if (action === 'complete') {
      res = await treasuryTransactionService.updateStatus(txId, 'completed');
    }
    if (res && !res.error) {
      fetchData();
      toast.success('تم تحديث الحالة');
    } else {
      toast.error('فشل تحديث الحالة');
    }
  }

  async function handlePartialSettle() {
    if (!partialSettleLoanId || !partialSettleAmount) return;
    setSettlingPartial(true);
    const { error } = await internalLoanService.partialSettle(partialSettleLoanId, parseFloat(partialSettleAmount));
    if (error) {
      toast.error('فشل التسديد الجزئي');
    } else {
      toast.success('تم التسديد الجزئي');
      fetchData();
    }
    setShowPartialSettleModal(false);
    setPartialSettleLoanId('');
    setPartialSettleAmount('');
    setSettlingPartial(false);
  }

  async function handleFullSettle(loanId: string) {
    const { error } = await internalLoanService.fullSettle(loanId);
    if (error) {
      toast.error('فشل التسوية الكاملة');
    } else {
      toast.success('تمت التسوية الكاملة');
      fetchData();
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachmentUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearAttachment() {
    setAttachmentUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!selectedAccount || !amount) return;

    const account = accounts.find(a => a.id === selectedAccount);
    if (!account) return;

    const numAmount = parseFloat(amount);
    const balanceBefore = account.current_balance;
    let balanceAfter = balanceBefore;
    let type: TreasuryTransaction['type'] = 'deposit';

    if (modalType === 'deposit') {
      balanceAfter = balanceBefore + numAmount;
      type = 'deposit';
    } else if (modalType === 'withdrawal') {
      balanceAfter = balanceBefore - numAmount;
      type = 'withdrawal';
    } else if (modalType === 'opening') {
      balanceAfter = numAmount;
      type = 'opening';
    } else if (modalType === 'transfer') {
      if (!transferToAccount) return;
      const toAccount = accounts.find(a => a.id === transferToAccount);
      if (!toAccount) return;

      await supabase.from('treasury_transactions').insert({
        treasury_id: selectedAccount,
        type: 'transfer_out',
        amount: numAmount,
        description: `تحويل إلى ${toAccount.name_ar}`,
        status: 'completed',
        performed_at: new Date().toISOString(),
        balance_before: balanceBefore,
        balance_after: balanceBefore - numAmount,
        attachment_url: attachmentUrl,
      });

      await supabase.from('treasury_transactions').insert({
        treasury_id: transferToAccount,
        type: 'transfer_in',
        amount: numAmount,
        description: `تحويل من ${account.name_ar}`,
        status: 'completed',
        performed_at: new Date().toISOString(),
        balance_before: toAccount.current_balance,
        balance_after: toAccount.current_balance + numAmount,
      });

      await supabase.from('treasury_accounts').update({ current_balance: balanceBefore - numAmount }).eq('id', selectedAccount);
      await supabase.from('treasury_accounts').update({ current_balance: toAccount.current_balance + numAmount }).eq('id', transferToAccount);

      setShowModal(false);
      clearAttachment();
      fetchData();
      return;
    }

    await supabase.from('treasury_transactions').insert({
      treasury_id: selectedAccount,
      type,
      amount: numAmount,
      description,
      category,
      status: 'completed',
      performed_at: new Date().toISOString(),
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      attachment_url: attachmentUrl,
    });

    await supabase.from('treasury_accounts').update({ current_balance: balanceAfter }).eq('id', selectedAccount);

    setShowModal(false);
    setAmount('');
    setDescription('');
    setCategory('');
    setTransferToAccount('');
    clearAttachment();
    fetchData();
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);

  const filteredTransactions = transactions.filter(tx => {
    if (filterType !== 'all') {
      if (filterType === 'transfer') {
        if (tx.type !== 'transfer_in' && tx.type !== 'transfer_out') return false;
      } else if (tx.type !== filterType) return false;
    }
    if (filterStatus !== 'all' && tx.status !== filterStatus) return false;
    return true;
  });

  const filteredLoans = loans.filter(loan => {
    if (loanTypeFilter !== 'all' && loan.loan_type !== loanTypeFilter) return false;
    return true;
  });

  const filterTypeOptions = [
    { value: 'all', label: 'الكل' },
    { value: 'deposit', label: 'إيداع' },
    { value: 'withdrawal', label: 'سحب' },
    { value: 'transfer', label: 'تحويل' },
    { value: 'opening', label: 'رصيد افتتاحي' },
  ];

  const filterStatusOptions = [
    { value: 'all', label: 'الكل' },
    { value: 'completed', label: 'مكتمل' },
    { value: 'pending', label: 'معلق' },
    { value: 'rejected', label: 'مرفوض' },
  ];

  const loanTypeFilterOptions = [
    { value: 'all', label: 'الكل' },
    { value: 'personal', label: 'سلفة شخصية' },
    { value: 'custodian_cashier', label: 'عهدة كاشير' },
    { value: 'custodian_driver', label: 'عهدة مندوب' },
    { value: 'advance_salary', label: 'سلفة موظف' },
  ];

  function renderStatusActions(tx: TreasuryTransaction) {
    if (tx.status === 'delayed') {
      return (
        <button
          onClick={() => handleTransactionAction('confirm_receipt', tx.id)}
          className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-lg hover:bg-emerald-500/30 transition-colors"
        >
          تأكيد الوصول
        </button>
      );
    }
    if (tx.status === 'completed') {
      return (
        <button
          onClick={() => handleTransactionAction('reconcile', tx.id)}
          className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-lg hover:bg-emerald-500/30 transition-colors"
        >
          مطابقة
        </button>
      );
    }
    if (tx.status === 'pending') {
      return (
        <div className="flex gap-1">
          <button
            onClick={() => handleTransactionAction('processing', tx.id)}
            className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            قيد المعالجة
          </button>
          <button
            onClick={() => handleTransactionAction('complete', tx.id)}
            className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-lg hover:bg-emerald-500/30 transition-colors"
          >
            إكمال
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-6">
        <p className="text-sm text-gray-400">إجمالي رصيد الخزينة</p>
        <p className="text-3xl font-bold mt-1">{totalBalance.toLocaleString('ar-EG')} <span className="text-base text-gray-400">ج.م</span></p>
        <p className="text-sm text-gray-500 mt-1">{accounts.length} حساب نشط</p>
      </div>

      {/* Smart Custodian Card */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">رصيد العهدة</h2>
          {custodianWarning && (
            <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              رصيد منخفض
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold">{custodianBalance.toLocaleString('ar-EG')}</span>
          <span className="text-sm text-gray-400">ج.م</span>
          <span className="text-sm text-gray-500 mx-2">/</span>
          <span className="text-sm text-gray-400">{custodianLimit.toLocaleString('ar-EG')} ج.م</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500',
              custodianWarning ? 'bg-red-500' : custodianPercent > 80 ? 'bg-emerald-500' : 'bg-amber-500'
            )}
            style={{ width: `${custodianPercent}%` }}
          />
        </div>
      </div>

      {/* Accounts */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">الحسابات</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setModalType('deposit'); setShowModal(true); }}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
            >
              + عملية جديدة
            </button>
            <button
              onClick={() => setShowNewAccountModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm font-medium"
            >
              + حساب جديد
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 hover:bg-white/[0.06] transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{account.name_ar}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border',
                  account.type === 'main' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                  account.type === 'wallet' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  'bg-gray-500/20 text-gray-400 border-gray-500/30'
                )}>
                  {accountTypeLabels[account.type]}
                </span>
              </div>
              <p className="text-xl font-bold">{account.current_balance.toLocaleString('ar-EG')} <span className="text-sm text-gray-400">ج.م</span></p>
              <p className="text-xs text-gray-500 mt-1">رصيد افتتاحي: {account.opening_balance.toLocaleString('ar-EG')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Custodian Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
          <p className="text-xs text-gray-400 mb-1">إجمالي عهد الكاشير</p>
          <p className="text-lg font-bold text-blue-400">{custodianCashierTotal.toLocaleString('ar-EG')} <span className="text-xs text-gray-400">ج.م</span></p>
          <p className="text-xs text-gray-500">{activeCustodianCashier.length} عهدة نشطة</p>
        </div>
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
          <p className="text-xs text-gray-400 mb-1">إجمالي عهد المندوبين</p>
          <p className="text-lg font-bold text-amber-400">{custodianDriverTotal.toLocaleString('ar-EG')} <span className="text-xs text-gray-400">ج.م</span></p>
          <p className="text-xs text-gray-500">{activeCustodianDriver.length} عهدة نشطة</p>
        </div>
        <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-4">
          <p className="text-xs text-gray-400 mb-1">إجمالي السلف الشخصية</p>
          <p className="text-lg font-bold text-violet-400">{personalLoanTotal.toLocaleString('ar-EG')} <span className="text-xs text-gray-400">ج.م</span></p>
          <p className="text-xs text-gray-500">{activePersonalLoans.length} سلفة نشطة</p>
        </div>
      </div>

      {/* Internal Loans */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">القروض الداخلية</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLoanModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm font-medium"
            >
              + قرض جديد
            </button>
            <button
              onClick={() => setShowInternalLoanModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
            >
              + سلفة/عهدة
            </button>
          </div>
        </div>

        {/* Loan type filter pills */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] mb-4">
          {loanTypeFilterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setLoanTypeFilter(opt.value)}
              className={cn('px-3 py-1.5 rounded-lg text-xs transition-colors',
                loanTypeFilter === opt.value
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:text-gray-300'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {filteredLoans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">لا توجد قروض داخلية</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLoans.map((loan) => (
              <div key={loan.id} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{loan.borrower_name}</span>
                  <div className="flex gap-1">
                    {loan.loan_type && (
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border', loanTypeColors[loan.loan_type] || 'bg-gray-500/20 text-gray-400')}>
                        {loanTypeLabels[loan.loan_type] || loan.loan_type}
                      </span>
                    )}
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', loanStatusColors[loan.status])}>
                      {loanStatusLabels[loan.status]}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-300">
                    المبلغ: <span className="font-semibold">{loan.amount.toLocaleString('ar-EG')} ج.م</span>
                  </p>
                  <p className="text-gray-300">
                    المتبقي: <span className="font-semibold">{loan.remaining_amount.toLocaleString('ar-EG')} ج.م</span>
                  </p>
                  <p className="text-gray-500 text-xs">السبب: {loan.reason || '-'}</p>
                  <p className="text-gray-500 text-xs">تاريخ الإصدار: {new Date(loan.issue_date).toLocaleDateString('ar-EG')}</p>
                  {loan.expected_settlement_date && (
                    <p className="text-gray-500 text-xs">تاريخ التسوية المتوقع: {new Date(loan.expected_settlement_date).toLocaleDateString('ar-EG')}</p>
                  )}
                </div>
                {loan.status !== 'settled' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                    <button
                      onClick={() => { setPartialSettleLoanId(loan.id); setShowPartialSettleModal(true); }}
                      className="flex-1 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/30 transition-colors"
                    >
                      تسديد جزئي
                    </button>
                    <button
                      onClick={() => handleFullSettle(loan.id)}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 transition-colors"
                    >
                      تسوية كاملة
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold mb-4">آخر العمليات</h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04]">
            {filterTypeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value)}
                className={cn('px-3 py-1.5 rounded-lg text-xs transition-colors',
                  filterType === opt.value
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-400 hover:text-gray-300'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04]">
            {filterStatusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                className={cn('px-3 py-1.5 rounded-lg text-xs transition-colors',
                  filterStatus === opt.value
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-400 hover:text-gray-300'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">لا توجد عمليات بعد</div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-3">
                  <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm',
                    tx.type === 'deposit' ? 'bg-emerald-500/20 text-emerald-400' :
                    tx.type === 'withdrawal' ? 'bg-red-500/20 text-red-400' :
                    tx.type === 'transfer_in' ? 'bg-blue-500/20 text-blue-400' :
                    tx.type === 'transfer_out' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-gray-500/20 text-gray-400'
                  )}>
                    {tx.type === 'deposit' ? '↓' : tx.type === 'withdrawal' ? '↑' : tx.type === 'transfer_in' ? '←' : tx.type === 'transfer_out' ? '→' : '◎'}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{typeLabels[tx.type] || tx.type}</p>
                    <p className="text-xs text-gray-500">{tx.treasury_accounts?.name_ar} • {tx.description || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-left">
                  {renderStatusActions(tx)}
                  {tx.attachment_url && (
                    <a href={tx.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">
                      <FileText className="w-4 h-4 inline" />
                    </a>
                  )}
                  <div>
                    <p className={cn('text-sm font-semibold',
                      tx.type === 'deposit' || tx.type === 'transfer_in' ? 'text-emerald-400' :
                      tx.type === 'withdrawal' || tx.type === 'transfer_out' ? 'text-red-400' : 'text-gray-300'
                    )}>
                      {tx.type === 'deposit' || tx.type === 'transfer_in' ? '+' : '-'}{tx.amount.toLocaleString('ar-EG')}
                    </p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_CONFIG[tx.status]?.color || 'bg-gray-500/20 text-gray-400')}>
                      {STATUS_CONFIG[tx.status]?.icon || ''} {statusLabels[tx.status]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold">عملية جديدة</h3>

            <div className="flex gap-2">
              {(['deposit', 'withdrawal', 'transfer', 'opening'] as const).map((t) => (
                <button key={t} onClick={() => setModalType(t)} className={cn('flex-1 py-2 rounded-lg text-sm transition-colors',
                  modalType === t ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
                )}>
                  {typeLabels[t]}
                </button>
              ))}
            </div>

            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50">
              <option value="">اختر الحساب</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
            </select>

            {modalType === 'transfer' && (
              <select value={transferToAccount} onChange={(e) => setTransferToAccount(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50">
                <option value="">اختر الحساب المحول إليه</option>
                {accounts.filter(a => a.id !== selectedAccount).map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
              </select>
            )}

            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="المبلغ" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="الوصف (اختياري)" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="التصنيف (اختياري)" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            {/* Attachment Upload */}
            <div>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileSelect} className="hidden" />
              {attachmentUrl ? (
                <div className="relative inline-block">
                  <img src={attachmentUrl} alt="attachment" className="h-20 w-20 rounded-lg object-cover border border-white/[0.08]" />
                  <button onClick={clearAttachment} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center hover:bg-red-500">×</button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400 hover:text-gray-300 hover:bg-white/[0.06] transition-colors">
                  <Camera className="w-4 h-4" />
                  إرفاق مستند
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setShowModal(false); clearAttachment(); }} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors">إلغاء</button>
              <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-sm hover:bg-emerald-600 transition-colors font-medium">تأكيد</button>
            </div>
          </div>
        </div>
      )}

      {/* New Account Modal */}
      {showNewAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold">حساب جديد</h3>

            <input type="text" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="اسم الحساب" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <select value={newAccountType} onChange={(e) => setNewAccountType(e.target.value as any)} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50">
              <option value="main">رئيسي</option>
              <option value="private">خاص</option>
              <option value="branch">فرع</option>
              <option value="wallet">محفظة</option>
            </select>

            {newAccountType === 'wallet' && (
              <select value={newAccountWalletProvider} onChange={(e) => setNewAccountWalletProvider(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50">
                <option value="">اختر مزود المحفظة</option>
                {walletProviders.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}

            <input type="number" value={newAccountOpeningBalance} onChange={(e) => setNewAccountOpeningBalance(e.target.value)} placeholder="الرصيد الافتتاحي" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <select value={newAccountCurrency} onChange={(e) => setNewAccountCurrency(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50">
              <option value="EGP">جنيه مصري (EGP)</option>
              <option value="USD">دولار أمريكي (USD)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
            </select>

            <div className="flex gap-2">
              <button onClick={() => setShowNewAccountModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors">إلغاء</button>
              <button onClick={handleCreateAccount} disabled={creatingAccount} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-sm hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50">
                {creatingAccount ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Old Loan Modal (backward compat) */}
      {showLoanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold">قرض داخلي جديد</h3>

            <input type="text" value={loanEmployeeName} onChange={(e) => setLoanEmployeeName(e.target.value)} placeholder="اسم الموظف" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="المبلغ" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <input type="text" value={loanReason} onChange={(e) => setLoanReason(e.target.value)} placeholder="السبب (اختياري)" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <input type="date" value={loanDueDate} onChange={(e) => setLoanDueDate(e.target.value)} placeholder="تاريخ الاستحقاق" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <div className="flex gap-2">
              <button onClick={() => setShowLoanModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors">إلغاء</button>
              <button onClick={handleCreateLoan} disabled={creatingLoan} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-sm hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50">
                {creatingLoan ? 'جاري الحفظ...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Internal Loan Modal */}
      {showInternalLoanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold">سلفة / عهدة جديدة</h3>

            <select value={newLoanType} onChange={(e) => setNewLoanType(e.target.value as InternalLoan['loan_type'])} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50">
              <option value="personal">سلفة شخصية</option>
              <option value="custodian_cashier">عهدة كاشير</option>
              <option value="custodian_driver">عهدة مندوب</option>
              <option value="advance_salary">سلفة موظف</option>
            </select>

            <input type="text" value={newLoanBorrowerName} onChange={(e) => setNewLoanBorrowerName(e.target.value)} placeholder="اسم المستلم" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <input type="number" value={newLoanAmount2} onChange={(e) => setNewLoanAmount2(e.target.value)} placeholder="المبلغ" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <input type="text" value={newLoanReason2} onChange={(e) => setNewLoanReason2(e.target.value)} placeholder="السبب (اختياري)" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <input type="date" value={newLoanSettlementDate} onChange={(e) => setNewLoanSettlementDate(e.target.value)} placeholder="تاريخ التسوية المتوقع" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <div className="flex gap-2">
              <button onClick={() => setShowInternalLoanModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors">إلغاء</button>
              <button onClick={handleCreateInternalLoan} disabled={creatingInternalLoan} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-sm hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50">
                {creatingInternalLoan ? 'جاري الحفظ...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Settle Modal */}
      {showPartialSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold">تسديد جزئي</h3>

            <input type="number" value={partialSettleAmount} onChange={(e) => setPartialSettleAmount(e.target.value)} placeholder="المبلغ المسدد" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <div className="flex gap-2">
              <button onClick={() => setShowPartialSettleModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors">إلغاء</button>
              <button onClick={handlePartialSettle} disabled={settlingPartial} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-sm hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50">
                {settlingPartial ? 'جاري...' : 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
