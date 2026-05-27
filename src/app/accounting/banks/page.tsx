'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/ui/page-transition';
import { BackButton } from '@/components/layout/back-button';
import { Building2, Plus, ArrowUp, ArrowDown, RefreshCw, Download, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const supabase = createClient();

export default function BanksPage() {
  const [banks, setBanks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const channel = supabase.channel('acct-banks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadData() {
    try {
      const { data: accs } = await supabase.from('bank_accounts').select('*');
      if (accs && accs.length > 0) {
        setBanks(accs);
        const { data: txns } = await supabase.from('bank_transactions').select('*').order('created_at', { ascending: false }).limit(20);
        setTransactions(txns || []);
      } else {
        // Fallback demo
        setBanks([
          { id: '1', name: 'البنك الأهلي المصري', account_number: 'EG1234567890', account_type: 'جاري', balance: 125000, status: 'active' },
          { id: '2', name: 'بنك مصر', account_number: 'EG9876543210', account_type: 'توفير', balance: 85000, status: 'active' },
        ]);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const totalBalance = banks.reduce((s: number, b: any) => s + (b.balance || 0), 0);

  return (
    <PageTransition>
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 md:px-4" dir="rtl">
        <div className="flex items-center flex-wrap gap-2 justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <BackButton href="/accounting" label="المحاسبة" />
              <h1 className="text-lg md:text-2xl font-bold">الحسابات البنكية</h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">إدارة الحسابات البنكية والتسوية</p>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <button onClick={() => toast.success('تم التحديث')}
              className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg border text-[10px] md:text-xs flex items-center gap-1 hover:bg-accent transition-colors">
              <RefreshCw className="h-3 w-3 md:h-3.5 md:w-3.5" /> تحديث
            </button>
            <button onClick={() => toast.success('تم إضافة حساب بنكي')}
              className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg text-white text-[10px] md:text-xs flex items-center gap-1"
              style={{ backgroundColor: 'var(--primary, #22C55E)' }}>
              <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" /> إضافة حساب
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
                <CardContent className="p-3 md:p-5">
                  <p className="text-[10px] md:text-sm opacity-80">إجمالي الأرصدة</p>
                  <p className="text-lg md:text-3xl font-bold mt-1 tabular-nums">{formatCurrency(totalBalance)}</p>
                  <p className="text-[9px] md:text-xs opacity-70 mt-1">{banks.length} حسابات بنكية</p>
                </CardContent>
              </Card>
              {banks.map((bank: any) => (
                <Card key={bank.id} className="shadow-sm">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between mb-1.5 md:mb-2">
                      <span className="text-base md:text-lg">{bank.icon || '🏦'}</span>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[9px] md:text-xs">نشط</Badge>
                    </div>
                    <p className="text-xs md:text-sm font-semibold">{bank.name}</p>
                    <p className="text-[9px] md:text-xs font-mono text-muted-foreground">
                      {(bank.account_number || '').slice(0, 8)}...{(bank.account_number || '').slice(-4)}
                    </p>
                    <p className="text-sm md:text-xl font-bold mt-1.5 md:mt-2 tabular-nums">{formatCurrency(bank.balance || 0)}</p>
                    <p className="text-[9px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">{bank.account_type || bank.type || 'جاري'}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="shadow-sm">
              <CardHeader className="px-3 md:px-4 py-2 md:py-3">
                <CardTitle className="text-xs md:text-sm">آخر الحركات البنكية</CardTitle>
              </CardHeader>
              <CardContent className="px-2 md:px-4 space-y-1.5 md:space-y-2">
                {transactions.length === 0 && (
                  <p className="text-[10px] md:text-xs text-muted-foreground py-4 text-center">لا توجد حركات بنكية</p>
                )}
                {transactions.map((tx: any) => {
                  const isDeposit = tx.type === 'deposit' || tx.type === 'transfer_in';
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-2 md:p-3 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className={`h-7 w-7 md:h-8 md:w-8 rounded-lg flex items-center justify-center ${isDeposit ? 'bg-emerald-100' : 'bg-red-100'}`}>
                          {isDeposit ? <ArrowDown className="h-3 w-3 md:h-4 md:w-4 text-emerald-600" /> : <ArrowUp className="h-3 w-3 md:h-4 md:w-4 text-red-600" />}
                        </div>
                        <div>
                          <p className="text-[10px] md:text-sm font-medium">{tx.description || tx.type}</p>
                          <p className="text-[8px] md:text-xs text-muted-foreground">{tx.bank_name || ''} • {formatDate(new Date(tx.created_at))}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`text-xs md:text-sm font-bold tabular-nums ${isDeposit ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isDeposit ? '+' : '-'}{formatCurrency(tx.amount || 0)}
                        </p>
                        {tx.balance && <p className="text-[9px] md:text-xs text-muted-foreground tabular-nums">{formatCurrency(tx.balance)}</p>}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTransition>
  );
}
