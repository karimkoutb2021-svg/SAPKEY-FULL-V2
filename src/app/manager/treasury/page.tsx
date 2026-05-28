'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { treasuryService, treasuryTransactionService, internalLoanService, STATUS_CONFIG, type TreasuryAccount, type TreasuryTransaction, type InternalLoan } from '@/lib/supabase/services/treasury';
import { Plus, Wallet, ArrowRightLeft, Search, Filter, Clock, CheckCircle, XCircle, RotateCcw, User, Truck, Briefcase, Camera, FileText, Download, AlertTriangle } from 'lucide-react';
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
    <div className="space-y-6" dir="rtl">
      {/* Summary */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)] p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 blur-[100px] rounded-full"></div>
        <div className="relative z-10">
          <p className="text-sm font-bold text-emerald-400/80 mb-2">إجمالي رصيد الخزينة</p>
          <p className="text-4xl font-black text-white tracking-tight">{totalBalance.toLocaleString('ar-EG')} <span className="text-xl text-emerald-400">ج.م</span></p>
          <p className="text-sm font-medium text-emerald-100/50 mt-2">{accounts.length} حساب نشط</p>
        </div>
      </div>

      {/* Smart Custodian Card */}
      <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl p-8 transition-all hover:border-white/[0.1]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-400" />
            رصيد العهدة
          </h2>
          {custodianWarning && (
            <span className="text-xs px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
              <AlertTriangle className="h-3.5 w-3.5" />
              رصيد منخفض
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-black text-white">{custodianBalance.toLocaleString('ar-EG')}</span>
          <span className="text-sm font-bold text-gray-400">ج.م</span>
          <span className="text-sm text-gray-600 mx-2">/</span>
          <span className="text-sm font-bold text-gray-500">{custodianLimit.toLocaleString('ar-EG')} ج.م</span>
        </div>
        <div className="w-full h-3 rounded-full bg-[#0A0A0C] border border-white/[0.04] overflow-hidden p-0.5">
          <div
            className={cn('h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_currentColor]',
              custodianWarning ? 'bg-red-500 text-red-500' : custodianPercent > 80 ? 'bg-emerald-500 text-emerald-500' : 'bg-amber-500 text-amber-500'
            )}
            style={{ width: `${custodianPercent}%` }}
          />
        </div>
      </div>

      {/* Accounts */}
      <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" />
            الحسابات
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => { setModalType('deposit'); setShowModal(true); }}
              className="px-5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-white hover:bg-white/[0.08] transition-all text-sm font-bold shadow-lg flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              عملية جديدة
            </button>
            <button
              onClick={() => setShowNewAccountModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-l from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 transition-all text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              حساب جديد
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] p-6 hover:border-white/[0.12] transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">{account.name_ar}</span>
                <span className={cn('text-xs px-3 py-1 rounded-xl font-bold border',
                  account.type === 'main' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  account.type === 'wallet' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  'bg-gray-500/10 text-gray-400 border-gray-500/20'
                )}>
                  {accountTypeLabels[account.type]}
                </span>
              </div>
              <p className="text-3xl font-black text-white tracking-tight mb-2">{account.current_balance.toLocaleString('ar-EG')} <span className="text-sm font-bold text-gray-500">ج.م</span></p>
              <p className="text-xs font-medium text-gray-500">رصيد افتتاحي: {account.opening_balance.toLocaleString('ar-EG')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Custodian Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-gray-400 mb-2">إجمالي عهد الكاشير</p>
            <p className="text-2xl font-black text-blue-400">{custodianCashierTotal.toLocaleString('ar-EG')} <span className="text-sm font-bold text-gray-500">ج.م</span></p>
            <p className="text-xs font-bold text-blue-500/50 mt-2">{activeCustodianCashier.length} عهدة نشطة</p>
          </div>
        </div>
        <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-gray-400 mb-2">إجمالي عهد المندوبين</p>
            <p className="text-2xl font-black text-amber-400">{custodianDriverTotal.toLocaleString('ar-EG')} <span className="text-sm font-bold text-gray-500">ج.م</span></p>
            <p className="text-xs font-bold text-amber-500/50 mt-2">{activeCustodianDriver.length} عهدة نشطة</p>
          </div>
        </div>
        <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-gray-400 mb-2">إجمالي السلف الشخصية</p>
            <p className="text-2xl font-black text-violet-400">{personalLoanTotal.toLocaleString('ar-EG')} <span className="text-sm font-bold text-gray-500">ج.م</span></p>
            <p className="text-xs font-bold text-violet-500/50 mt-2">{activePersonalLoans.length} سلفة نشطة</p>
          </div>
        </div>
      </div>

      {/* Internal Loans */}
      <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="h-5 w-5 text-amber-400" />
            القروض الداخلية والعهد
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowInternalLoanModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-l from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400 transition-all text-sm font-bold shadow-lg shadow-amber-500/25 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              سلفة/عهدة جديدة
            </button>
            <button
              onClick={() => setShowLoanModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-white hover:bg-white/[0.08] transition-all text-sm font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              قرض جديد (قديم)
            </button>
          </div>
        </div>

        {/* Loan type filter pills */}
        <div className="flex flex-wrap gap-2 p-2 rounded-2xl bg-white/[0.02] border border-white/[0.04] mb-8">
          {loanTypeFilterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setLoanTypeFilter(opt.value)}
              className={cn('px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300',
                loanTypeFilter === opt.value
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {filteredLoans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <FileText className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">لا توجد قروض أو عهد مطابقة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredLoans.map((loan) => (
              <div key={loan.id} className="rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] p-6 hover:border-white/[0.1] transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">{loan.borrower_name}</span>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-lg font-bold border', loanStatusColors[loan.status])}>
                      {loanStatusLabels[loan.status]}
                    </span>
                    {loan.loan_type && (
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-lg font-bold border', loanTypeColors[loan.loan_type] || 'bg-gray-500/20 text-gray-400')}>
                        {loanTypeLabels[loan.loan_type] || loan.loan_type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-[#0A0A0C]/50 border border-white/[0.02]">
                    <span className="text-xs text-gray-400 font-bold">المبلغ</span>
                    <span className="font-black text-white">{loan.amount.toLocaleString('ar-EG')} <span className="text-[10px] text-gray-500">ج.م</span></span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-xs text-amber-500/80 font-bold">المتبقي</span>
                    <span className="font-black text-amber-400">{loan.remaining_amount.toLocaleString('ar-EG')} <span className="text-[10px] text-amber-500/50">ج.م</span></span>
                  </div>
                  
                  {loan.reason && <p className="text-gray-400 text-xs font-medium px-2"><span className="text-gray-500">السبب:</span> {loan.reason}</p>}
                  
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold px-2 pt-2 border-t border-white/[0.04]">
                    <span>من: {new Date(loan.issue_date).toLocaleDateString('ar-EG')}</span>
                    {loan.expected_settlement_date && <span>إلى: {new Date(loan.expected_settlement_date).toLocaleDateString('ar-EG')}</span>}
                  </div>
                </div>
                
                {loan.status !== 'settled' && (
                  <div className="flex gap-2 mt-5">
                    <button
                      onClick={() => { setPartialSettleLoanId(loan.id); setShowPartialSettleModal(true); }}
                      className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.04] text-white text-xs font-bold hover:bg-white/[0.08] transition-colors"
                    >
                      تسديد جزئي
                    </button>
                    <button
                      onClick={() => handleFullSettle(loan.id)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
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
      <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl p-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Clock className="h-5 w-5 text-blue-400" />
          آخر العمليات
        </h2>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex flex-wrap gap-2 p-2 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            {filterTypeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value)}
                className={cn('px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300',
                  filterType === opt.value
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 p-2 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            {filterStatusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                className={cn('px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300',
                  filterStatus === opt.value
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-emerald-500/50">
            <span className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400 font-medium">جاري تحميل العمليات...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <FileText className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">لا توجد عمليات بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors gap-4">
                <div className="flex items-center gap-4">
                  <span className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg',
                    tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    tx.type === 'transfer_in' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    tx.type === 'transfer_out' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                  )}>
                    {tx.type === 'deposit' ? '↓' : tx.type === 'withdrawal' ? '↑' : tx.type === 'transfer_in' ? '←' : tx.type === 'transfer_out' ? '→' : '◎'}
                  </span>
                  <div>
                    <p className="text-base font-bold text-white mb-1">{typeLabels[tx.type] || tx.type}</p>
                    <p className="text-xs text-gray-400 font-medium">{tx.treasury_accounts?.name_ar} {tx.description ? `• ${tx.description}` : ''}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{new Date(tx.created_at).toLocaleString('ar-EG')}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className={cn('text-xl font-black',
                    tx.type === 'deposit' || tx.type === 'transfer_in' ? 'text-emerald-400' :
                    tx.type === 'withdrawal' || tx.type === 'transfer_out' ? 'text-red-400' : 'text-gray-300'
                  )}>
                    {tx.type === 'deposit' || tx.type === 'transfer_in' ? '+' : '-'}{tx.amount.toLocaleString('ar-EG')}
                  </p>
                  <div className="flex items-center gap-2">
                    {tx.attachment_url && (
                      <a href={tx.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline flex items-center gap-1 mt-2">
                        <FileText className="w-4 h-4" />
                        عرض المستند
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0C]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-[#111114]/95 backdrop-blur-3xl border border-white/[0.08] p-8 shadow-2xl shadow-emerald-500/10 space-y-6" dir="rtl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">عملية جديدة</h3>
                <p className="text-sm text-gray-400">اختر نوع العملية وأدخل التفاصيل.</p>
              </div>
              <button onClick={() => { setShowModal(false); clearAttachment(); }} className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-gray-400 hover:bg-white/[0.08] hover:text-white transition-colors">
                <XCircle size={20} />
              </button>
            </div>

            <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              {(['deposit', 'withdrawal', 'transfer', 'opening'] as const).map((t) => (
                <button key={t} onClick={() => setModalType(t)} className={cn('flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300',
                  modalType === t ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                )}>
                  {typeLabels[t]}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all [&>option]:bg-[#111114]">
                <option value="">اختر الحساب المصدر...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
              </select>

              {modalType === 'transfer' && (
                <select value={transferToAccount} onChange={(e) => setTransferToAccount(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all [&>option]:bg-[#111114]">
                  <option value="">اختر الحساب المحول إليه...</option>
                  {accounts.filter(a => a.id !== selectedAccount).map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
                </select>
              )}

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">ج.م</span>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="المبلغ (0.00)" className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-lg text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all placeholder-gray-500" />
              </div>

              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="الوصف أو ملاحظات (اختياري)" className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all placeholder-gray-500" />
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="تصنيف العملية (اختياري)" className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all placeholder-gray-500" />

              <div>
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileSelect} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={cn("flex items-center justify-center w-full gap-2 px-4 py-4 border-2 border-dashed rounded-2xl text-sm font-bold transition-all", attachmentUrl ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-white/[0.1] bg-white/[0.02] text-gray-400 hover:border-emerald-500/30 hover:bg-white/[0.04]")}>
                  {attachmentUrl ? <CheckCircle className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                  {attachmentUrl ? 'تم إرفاق المستند - انقر للتغيير' : 'إرفاق إيصال أو مستند'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowModal(false); clearAttachment(); }} className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors font-bold">إلغاء</button>
              <button onClick={handleSubmit} disabled={!selectedAccount || !amount} className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white font-bold hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:shadow-none">تأكيد وتنفيذ العملية</button>
            </div>
          </div>
        </div>
      )}

      {/* New Account Modal */}
      {showNewAccountModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0C]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-[#111114]/95 backdrop-blur-3xl border border-white/[0.08] p-8 shadow-2xl shadow-blue-500/10 space-y-6" dir="rtl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">حساب خزينة جديد</h3>
                <p className="text-sm text-gray-400">أدخل بيانات الحساب الجديد لضمه للنظام.</p>
              </div>
              <button onClick={() => setShowNewAccountModal(false)} className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-gray-400 hover:bg-white/[0.08] hover:text-white transition-colors">
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <input type="text" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="اسم الحساب (مثال: خزينة الإدارة)" className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder-gray-500" />
              
              <div className="grid grid-cols-2 gap-4">
                <select value={newAccountType} onChange={(e) => setNewAccountType(e.target.value as any)} className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all [&>option]:bg-[#111114]">
                  <option value="main">رئيسي</option>
                  <option value="private">خاص</option>
                  <option value="branch">فرع</option>
                  <option value="wallet">محفظة إلكترونية</option>
                </select>

                <select value={newAccountCurrency} onChange={(e) => setNewAccountCurrency(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all [&>option]:bg-[#111114]">
                  <option value="EGP">جنيه مصري (EGP)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                </select>
              </div>

              {newAccountType === 'wallet' && (
                <select value={newAccountWalletProvider} onChange={(e) => setNewAccountWalletProvider(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all [&>option]:bg-[#111114]">
                  <option value="">اختر مزود المحفظة...</option>
                  {walletProviders.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">الرصيد الافتتاحي</span>
                <input type="number" value={newAccountOpeningBalance} onChange={(e) => setNewAccountOpeningBalance(e.target.value)} placeholder="0.00" className="w-full pl-32 pr-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-lg text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder-gray-500" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNewAccountModal(false)} className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors font-bold">إلغاء</button>
              <button onClick={handleCreateAccount} disabled={creatingAccount || !newAccountName || !newAccountOpeningBalance} className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-blue-600 to-blue-500 text-white font-bold hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:shadow-none">
                {creatingAccount ? 'جاري الإنشاء...' : 'اعتماد الحساب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Old Loan Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0C]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-[#111114]/95 backdrop-blur-3xl border border-white/[0.08] p-8 shadow-2xl shadow-violet-500/10 space-y-6" dir="rtl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">قرض داخلي جديد (قديم)</h3>
              </div>
              <button onClick={() => setShowLoanModal(false)} className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-gray-400 hover:bg-white/[0.08] hover:text-white transition-colors">
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <input type="text" value={loanEmployeeName} onChange={(e) => setLoanEmployeeName(e.target.value)} placeholder="اسم الموظف" className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all placeholder-gray-500" />
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">ج.م</span>
                <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="المبلغ (0.00)" className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-lg text-white font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all placeholder-gray-500" />
              </div>
              <input type="text" value={loanReason} onChange={(e) => setLoanReason(e.target.value)} placeholder="السبب (اختياري)" className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all placeholder-gray-500" />
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400">تاريخ الاستحقاق</label>
                <input type="date" value={loanDueDate} onChange={(e) => setLoanDueDate(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowLoanModal(false)} className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors font-bold">إلغاء</button>
              <button onClick={handleCreateLoan} disabled={creatingLoan || !loanEmployeeName || !loanAmount} className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-violet-600 to-violet-500 text-white font-bold hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:shadow-none">
                {creatingLoan ? 'جاري الحفظ...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Internal Loan Modal */}
      {showInternalLoanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0C]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-[#111114]/95 backdrop-blur-3xl border border-white/[0.08] p-8 shadow-2xl shadow-amber-500/10 space-y-6" dir="rtl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">سلفة / عهدة جديدة</h3>
                <p className="text-sm text-gray-400">أدخل تفاصيل العهدة أو السلفة لاعتمادها.</p>
              </div>
              <button onClick={() => setShowInternalLoanModal(false)} className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-gray-400 hover:bg-white/[0.08] hover:text-white transition-colors">
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <select value={newLoanType} onChange={(e) => setNewLoanType(e.target.value as InternalLoan['loan_type'])} className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all [&>option]:bg-[#111114]">
                <option value="personal">سلفة شخصية</option>
                <option value="custodian_cashier">عهدة كاشير</option>
                <option value="custodian_driver">عهدة مندوب</option>
                <option value="advance_salary">سلفة موظف</option>
              </select>
              <input type="text" value={newLoanBorrowerName} onChange={(e) => setNewLoanBorrowerName(e.target.value)} placeholder="اسم المستلم" className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all placeholder-gray-500" />
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">ج.م</span>
                <input type="number" value={newLoanAmount2} onChange={(e) => setNewLoanAmount2(e.target.value)} placeholder="المبلغ (0.00)" className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-lg text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all placeholder-gray-500" />
              </div>
              <input type="text" value={newLoanReason2} onChange={(e) => setNewLoanReason2(e.target.value)} placeholder="السبب (اختياري)" className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all placeholder-gray-500" />
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400">تاريخ التسوية المتوقع</label>
                <input type="date" value={newLoanSettlementDate} onChange={(e) => setNewLoanSettlementDate(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowInternalLoanModal(false)} className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors font-bold">إلغاء</button>
              <button onClick={handleCreateInternalLoan} disabled={creatingInternalLoan || !newLoanBorrowerName || !newLoanAmount2} className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-amber-600 to-amber-500 text-white font-bold hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:shadow-none">
                {creatingInternalLoan ? 'جاري الاعتماد...' : 'اعتماد السلفة / العهدة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Settle Modal */}
      {showPartialSettleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0C]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[2rem] bg-[#111114]/95 backdrop-blur-3xl border border-white/[0.08] p-8 shadow-2xl shadow-emerald-500/10 space-y-6" dir="rtl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">تسديد جزئي</h3>
              <button onClick={() => setShowPartialSettleModal(false)} className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-gray-400 hover:bg-white/[0.08] hover:text-white transition-colors">
                <XCircle size={20} />
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">ج.م</span>
              <input type="number" value={partialSettleAmount} onChange={(e) => setPartialSettleAmount(e.target.value)} placeholder="المبلغ المسدد" className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-lg text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all placeholder-gray-500" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowPartialSettleModal(false)} className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors font-bold">إلغاء</button>
              <button onClick={handlePartialSettle} disabled={settlingPartial || !partialSettleAmount} className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white font-bold hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:shadow-none">
                {settlingPartial ? 'جاري التسديد...' : 'تأكيد التسديد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
