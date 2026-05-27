'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, MapPin, Building2, CreditCard, Banknote, FileText, Check, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SupplierAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  onSave: (formData: any) => Promise<void>;
}

export function SupplierAddModal({ isOpen, onClose, categories, onSave }: SupplierAddModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'financial'>('basic');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    contact_person: '',
    phone: '',
    phone_2: '',
    email: '',
    address: '',
    city: '',
    tax_number: '',
    commercial_registration: '',
    bank_name: '',
    bank_account: '',
    iban: '',
    opening_balance: 0,
    credit_limit: 0,
    payment_terms: 30,
    notes: '',
    category_id: ''
  });

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.name_ar) {
      toast.error('يرجى إدخال اسم المورد');
      return;
    }
    setLoading(true);
    try {
      await onSave(formData);
      toast.success('تم إضافة المورد بنجاح');
      onClose();
    } catch (e) {
      toast.error('حدث خطأ أثناء إضافة المورد');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'البيانات الأساسية', icon: Store },
    { id: 'contact', label: 'معلومات الاتصال', icon: Phone },
    { id: 'financial', label: 'البيانات المالية', icon: CreditCard },
  ] as const;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={onClose} 
        />
        
        <motion.div 
          initial={{ y: 50, opacity: 0, scale: 0.95 }} 
          animate={{ y: 0, opacity: 1, scale: 1 }} 
          exit={{ y: 20, opacity: 0, scale: 0.95 }} 
          transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
          className="relative w-full max-w-3xl bg-[#0A0A0C] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" 
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">إضافة مورد جديد</h3>
                <p className="text-sm text-gray-400 mt-0.5">أدخل بيانات المورد بدقة لإضافته للنظام</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex p-4 gap-2 border-b border-white/5 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id 
                    ? "bg-white text-black shadow-lg"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-6">
              
              {activeTab === 'basic' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-300">اسم المورد (عربي) <span className="text-red-500">*</span></label>
                      <Input value={formData.name_ar} onChange={(e) => setFormData({...formData, name_ar: e.target.value})} className="h-12 rounded-xl bg-white/5 border-white/10 text-white focus-visible:ring-emerald-500/50" placeholder="مثال: شركة المراعي" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-300">اسم المورد (إنجليزي)</label>
                      <Input value={formData.name_en} onChange={(e) => setFormData({...formData, name_en: e.target.value})} className="h-12 rounded-xl bg-white/5 border-white/10 text-white focus-visible:ring-emerald-500/50" placeholder="Almarai Co." dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-300">فئة المورد</label>
                      <select 
                        value={formData.category_id} 
                        onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                        className="w-full h-12 rounded-xl bg-white/5 border-white/10 text-white focus-visible:ring-emerald-500/50 outline-none px-3"
                      >
                        <option value="" className="bg-[#0A0A0C]">اختر الفئة</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id} className="bg-[#0A0A0C]">{cat.name_ar}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-300">ملاحظات عامة</label>
                      <Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="h-12 rounded-xl bg-white/5 border-white/10 text-white focus-visible:ring-emerald-500/50" placeholder="أي ملاحظات إضافية..." />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'contact' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 mb-6">
                    <h4 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2"><Phone className="h-4 w-4" /> التواصل</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400">الشخص المسؤول</label>
                        <Input value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} className="h-11 rounded-xl bg-white/5 border-white/10 text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400">البريد الإلكتروني</label>
                        <Input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="h-11 rounded-xl bg-white/5 border-white/10 text-white" dir="ltr" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400">رقم الهاتف الأساسي</label>
                        <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="h-11 rounded-xl bg-white/5 border-white/10 text-white font-mono" dir="ltr" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400">رقم هاتف بديل</label>
                        <Input value={formData.phone_2} onChange={(e) => setFormData({...formData, phone_2: e.target.value})} className="h-11 rounded-xl bg-white/5 border-white/10 text-white font-mono" dir="ltr" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <h4 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2"><MapPin className="h-4 w-4" /> العنوان</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400">المدينة</label>
                        <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="h-11 rounded-xl bg-white/5 border-white/10 text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400">العنوان بالتفصيل</label>
                        <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="h-11 rounded-xl bg-white/5 border-white/10 text-white" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'financial' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                      <h4 className="text-sm font-bold text-gray-200 flex items-center gap-2"><Banknote className="h-4 w-4 text-emerald-400" /> الحسابات والائتمان</h4>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400">الرصيد الافتتاحي (لك)</label>
                          <Input type="number" value={formData.opening_balance} onChange={(e) => setFormData({...formData, opening_balance: parseFloat(e.target.value) || 0})} className="h-10 bg-white/5 border-white/10 text-white font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400">حد الائتمان (أقصى مديونية)</label>
                          <Input type="number" value={formData.credit_limit} onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})} className="h-10 bg-white/5 border-white/10 text-white font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400">شروط الدفع (عدد الأيام)</label>
                          <Input type="number" value={formData.payment_terms} onChange={(e) => setFormData({...formData, payment_terms: parseInt(e.target.value) || 0})} className="h-10 bg-white/5 border-white/10 text-white font-mono" />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                      <h4 className="text-sm font-bold text-gray-200 flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-400" /> الضرائب والبنك</h4>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400">الرقم الضريبي</label>
                          <Input value={formData.tax_number} onChange={(e) => setFormData({...formData, tax_number: e.target.value})} className="h-10 bg-white/5 border-white/10 text-white font-mono" dir="ltr" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400">رقم السجل التجاري</label>
                          <Input value={formData.commercial_registration} onChange={(e) => setFormData({...formData, commercial_registration: e.target.value})} className="h-10 bg-white/5 border-white/10 text-white font-mono" dir="ltr" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400">اسم البنك & الآيبان (IBAN)</label>
                          <div className="flex gap-2">
                            <Input value={formData.bank_name} onChange={(e) => setFormData({...formData, bank_name: e.target.value})} placeholder="البنك" className="h-10 bg-white/5 border-white/10 text-white w-1/3" />
                            <Input value={formData.iban} onChange={(e) => setFormData({...formData, iban: e.target.value})} placeholder="SA..." className="h-10 bg-white/5 border-white/10 text-white flex-1 font-mono" dir="ltr" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                </motion.div>
              )}

            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} className="rounded-xl h-12 px-6 font-medium text-gray-400 hover:text-white hover:bg-white/10">
              إلغاء
            </Button>
            <Button disabled={loading} onClick={handleSave} className="rounded-xl h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 font-bold flex items-center gap-2 transition-all">
              {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span> : <Check className="h-5 w-5" />}
              حفظ المورد
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
