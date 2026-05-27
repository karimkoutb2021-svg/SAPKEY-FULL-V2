const fs = require('fs');

const filePath = 'src/app/manager/treasury/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '{/* Operation Modal */}';
const endMarker = '{/* Partial Settle Modal */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf('</button>\r\n            </div>\r\n          </div>\r\n        </div>\r\n      )}\r\n    </div>', startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find markers');
    process.exit(1);
}

const replacement = `{/* Operation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowModal(false); clearAttachment(); }} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">عملية جديدة</h3>
              <button onClick={() => { setShowModal(false); clearAttachment(); }} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                {(['deposit', 'withdrawal', 'transfer', 'opening'] as const).map((t) => (
                  <button key={t} onClick={() => setModalType(t)} className={cn('flex-1 py-2 rounded-xl text-sm font-bold transition-all',
                    modalType === t ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'
                  )}>
                    {typeLabels[t]}
                  </button>
                ))}
              </div>

              <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-medium">
                <option value="">اختر الحساب</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
              </select>

              {modalType === 'transfer' && (
                <select value={transferToAccount} onChange={(e) => setTransferToAccount(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-medium">
                  <option value="">اختر الحساب المحول إليه</option>
                  {accounts.filter(a => a.id !== selectedAccount).map(a => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
                </select>
              )}

              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="المبلغ" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-semibold" />
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="الوصف (اختياري)" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all" />
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="التصنيف (اختياري)" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all" />

              <div>
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileSelect} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center w-full gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:border-emerald-500/50 transition-all font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                  {attachmentUrl ? 'تغيير المستند' : 'إرفاق مستند'}
                </button>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => { setShowModal(false); clearAttachment(); }} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-bold">إلغاء</button>
              <button onClick={handleSubmit} disabled={!selectedAccount || !amount} className="flex-1 py-3 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white text-sm hover:from-emerald-500 hover:to-emerald-400 transition-all font-bold shadow-lg shadow-emerald-500/25 disabled:opacity-50">تأكيد العملية</button>
            </div>
          </div>
        </div>
      )}

      {/* New Account Modal */}
      {showNewAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewAccountModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">حساب جديد</h3>
            </div>
            <div className="p-6 space-y-4">
              <input type="text" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="اسم الحساب" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all" />
              <select value={newAccountType} onChange={(e) => setNewAccountType(e.target.value as any)} className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium">
                <option value="main">رئيسي</option>
                <option value="private">خاص</option>
                <option value="branch">فرع</option>
                <option value="wallet">محفظة</option>
              </select>
              {newAccountType === 'wallet' && (
                <select value={newAccountWalletProvider} onChange={(e) => setNewAccountWalletProvider(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium">
                  <option value="">اختر مزود المحفظة</option>
                  {walletProviders.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              <input type="number" value={newAccountOpeningBalance} onChange={(e) => setNewAccountOpeningBalance(e.target.value)} placeholder="الرصيد الافتتاحي" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-semibold" />
              <select value={newAccountCurrency} onChange={(e) => setNewAccountCurrency(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium">
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
              </select>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setShowNewAccountModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-bold">إلغاء</button>
              <button onClick={handleCreateAccount} disabled={creatingAccount || !newAccountName || !newAccountOpeningBalance} className="flex-1 py-3 rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 text-white text-sm hover:from-blue-500 hover:to-blue-400 transition-all font-bold shadow-lg shadow-blue-500/25 disabled:opacity-50">
                {creatingAccount ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Old Loan Modal (backward compat) */}
      {showLoanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLoanModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">قرض داخلي جديد</h3>
            </div>
            <div className="p-6 space-y-4">
              <input type="text" value={loanEmployeeName} onChange={(e) => setLoanEmployeeName(e.target.value)} placeholder="اسم الموظف" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all" />
              <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="المبلغ" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all font-semibold" />
              <input type="text" value={loanReason} onChange={(e) => setLoanReason(e.target.value)} placeholder="السبب (اختياري)" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all" />
              <input type="date" value={loanDueDate} onChange={(e) => setLoanDueDate(e.target.value)} placeholder="تاريخ الاستحقاق" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all" />
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setShowLoanModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-bold">إلغاء</button>
              <button onClick={handleCreateLoan} disabled={creatingLoan || !loanEmployeeName || !loanAmount} className="flex-1 py-3 rounded-xl bg-gradient-to-l from-violet-600 to-violet-500 text-white text-sm hover:from-violet-500 hover:to-violet-400 transition-all font-bold shadow-lg shadow-violet-500/25 disabled:opacity-50">
                {creatingLoan ? 'جاري الحفظ...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Internal Loan Modal */}
      {showInternalLoanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowInternalLoanModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">سلفة / عهدة جديدة</h3>
            </div>
            <div className="p-6 space-y-4">
              <select value={newLoanType} onChange={(e) => setNewLoanType(e.target.value as InternalLoan['loan_type'])} className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-medium">
                <option value="personal">سلفة شخصية</option>
                <option value="custodian_cashier">عهدة كاشير</option>
                <option value="custodian_driver">عهدة مندوب</option>
                <option value="advance_salary">سلفة موظف</option>
              </select>
              <input type="text" value={newLoanBorrowerName} onChange={(e) => setNewLoanBorrowerName(e.target.value)} placeholder="اسم المستلم" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all" />
              <input type="number" value={newLoanAmount2} onChange={(e) => setNewLoanAmount2(e.target.value)} placeholder="المبلغ" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-semibold" />
              <input type="text" value={newLoanReason2} onChange={(e) => setNewLoanReason2(e.target.value)} placeholder="السبب (اختياري)" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all" />
              <input type="date" value={newLoanSettlementDate} onChange={(e) => setNewLoanSettlementDate(e.target.value)} placeholder="تاريخ التسوية المتوقع" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all" />
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setShowInternalLoanModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-bold">إلغاء</button>
              <button onClick={handleCreateInternalLoan} disabled={creatingInternalLoan || !newLoanBorrowerName || !newLoanAmount2} className="flex-1 py-3 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white text-sm hover:from-emerald-500 hover:to-emerald-400 transition-all font-bold shadow-lg shadow-emerald-500/25 disabled:opacity-50">
                {creatingInternalLoan ? 'جاري الحفظ...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Settle Modal */}
      {showPartialSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPartialSettleModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">تسديد جزئي</h3>
            </div>
            <div className="p-6 space-y-4">
              <input type="number" value={partialSettleAmount} onChange={(e) => setPartialSettleAmount(e.target.value)} placeholder="المبلغ المسدد" className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all font-semibold" />
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setShowPartialSettleModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-bold">إلغاء</button>
              <button onClick={handlePartialSettle} disabled={settlingPartial || !partialSettleAmount} className="flex-1 py-3 rounded-xl bg-gradient-to-l from-amber-500 to-amber-400 text-white text-sm hover:from-amber-400 hover:to-amber-300 transition-all font-bold shadow-lg shadow-amber-500/25 disabled:opacity-50">
                {settlingPartial ? 'جاري...' : 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex + 90); // approximate length of the rest of the file ending tags
// Instead of guessing, let's just do a clean string replacement.

const realEndString = `      {/* Partial Settle Modal */}
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
    </div>`;

const lines = content.split('\\n');
const startLineIdx = lines.findIndex(l => l.includes('{/* Operation Modal */}'));
const endLineIdx = lines.findIndex(l => l.includes('</button>')) // Not reliable

let fixedContent = content.replace(/\{\/\* Operation Modal \*\/\}(.|\n)*\{\/\* Partial Settle Modal \*\/\}(.|\n)*?\}\)\}\s*<\/div>/, replacement);

fs.writeFileSync(filePath, fixedContent);
console.log('Replaced successfully');
