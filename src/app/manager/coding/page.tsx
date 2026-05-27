'use client';

import { useEffect, useState, useRef } from 'react';
import { normalizeArabic } from '@/lib/arabic-normalize';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { codingDraftService, warehouseService, codingLabelService } from '@/lib/supabase/services/procurement';
import { inventoryService } from '@/lib/supabase/services/inventory';
import { QrCode, Barcode, FileSpreadsheet, Download, Upload, Printer, Search, Filter, Plus, Mic, MicOff, Check, X, Clock, AlertCircle, Eye, Package } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';

const supabase = createClient();

interface CodingDraft {
  id: string;
  product_code: string;
  product_name: string;
  category?: string;
  subcategory?: string;
  unit: string;
  shelf_number?: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  status: 'pending' | 'approved' | 'rejected' | 'active';
  submitted_by_name?: string;
  submitted_by_role?: string;
  rejection_reason?: string;
  created_at: string;
}

interface StockItem {
  id: string;
  product_name: string;
  sku: string;
  barcode?: string;
  selling_price: number;
  category?: string;
}

const CATEGORIES = ['مشروبات', 'ألبان', 'مواد غذائية', 'حلويات', 'معلبات', 'منظفات', 'أخرى'];
const SUBCATEGORIES: Record<string, string[]> = {
  'مشروبات': ['مياه', 'عصائر', 'مشروبات غازية', 'شاي وقهوة'],
  'ألبان': ['حليب', 'زبادي', 'أجبان', 'زبدة'],
  'مواد غذائية': ['أرز', 'مكرونة', 'زيوت', 'توابل'],
  'حلويات': ['شوكولاتة', 'بسكويت', 'حلويات شرقية'],
  'معلبات': ['خضروات', 'فواكه', 'لحوم', 'أسماك'],
  'منظفات': ['غسيل', 'أطباق', 'تنظيف أسطح'],
};
const UNITS = ['قطعة', 'علبة', 'كيلو', 'جنيه', 'متر', 'لتر', 'كيس', 'كرتونة'];

export default function CodingPage() {
  const auth = useAuthStore();
  const user = auth.user;
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'list' | 'excel' | 'voice' | 'labels'>('list');
  const [drafts, setDrafts] = useState<CodingDraft[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Excel
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelPreview, setExcelPreview] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // Voice Wizard
  const [voiceStep, setVoiceStep] = useState(0);
  const [voiceData, setVoiceData] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Labels
  const [selectedForPrint, setSelectedForPrint] = useState<string[]>([]);
  const [printType, setPrintType] = useState<'barcode' | 'qr' | 'both'>('barcode');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Approval modal
  const [approvalModal, setApprovalModal] = useState<{ open: boolean; draft: CodingDraft | null }>({ open: false, draft: null });
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('coding-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coding_drafts' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coding_labels' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    const [draftsRes, stockRes] = await Promise.all([
      codingDraftService.getAll(),
      inventoryService.getAll(),
    ]);
    if (draftsRes.data) setDrafts(draftsRes.data);
    if (stockRes.data) setStockItems(stockRes.data);
    setLoading(false);
  }

  // Excel Export
  function handleExportTemplate() {
    const headers = ['كود المنتج', 'اسم الصنف', 'القسم الرئيسي', 'القسم الفرعي', 'الوحدة', 'رقم الرف', 'الحد الأدنى', 'سعر التكلفة', 'سعر البيع'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    // Add dropdown validation info as comments
    ws['!cols'] = headers.map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قالب التكويـد');
    XLSX.writeFile(wb, 'coding-template.xlsx');
    toast.success('تم تصدير القالب');
  }

  function handleExportCurrent() {
    const data = stockItems.map(item => ({
      'كود المنتج': item.sku,
      'اسم الصنف': item.product_name,
      'الباركود': item.barcode || '',
      'سعر البيع': item.selling_price,
      'القسم': item.category || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المنتجات');
    XLSX.writeFile(wb, 'current-products.xlsx');
    toast.success('تم تصدير المنتجات');
  }

  // Excel Import
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      const headers = data[0];
      const rows = data.slice(1).map(row => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      });
      setExcelPreview(rows);
    };
    reader.readAsBinaryString(file);
  }

  async function handleExcelImport() {
    if (!excelPreview.length) return;
    setUploading(true);

    for (const row of excelPreview) {
      const productCode = row['كود المنتج'] || `AUTO-${Date.now()}`;
      const productName = row['اسم الصنف'] || 'منتج جديد';
      const category = row['القسم الرئيسي'] || '';
      const subcategory = row['القسم الفرعي'] || '';
      const unit = row['الوحدة'] || 'قطعة';
      const shelfNumber = row['رقم الرف'] || '';
      const minStock = parseFloat(row['الحد الأدنى']) || 10;
      const costPrice = parseFloat(row['سعر التكلفة']) || 0;
      const sellingPrice = parseFloat(row['سعر البيع']) || 0;

      await codingDraftService.create({
        product_code: productCode,
        product_name: productName,
        category,
        subcategory,
        unit,
        shelf_number: shelfNumber,
        cost_price: costPrice,
        selling_price: sellingPrice,
        min_stock: minStock,
        status: 'pending',
        submitted_by: user?.id,
submitted_by_name: user?.nameAr || user?.name,
        submitted_by_role: user?.role,
      });
    }

    setUploading(false);
    setExcelPreview([]);
    setExcelFile(null);
    toast.success(`تم رفع ${excelPreview.length} صنف بنجاح`);
    fetchData();
  }

  // Voice Wizard (Egyptian Arabic NLP)
  const voiceSteps = [
    { key: 'product_code', label: 'كود المنتج', placeholder: 'مثال: مية الف واحد' },
    { key: 'product_name', label: 'اسم الصنف', placeholder: 'مثال: لبن نيدو خمسمية جرام' },
    { key: 'shelf_number', label: 'رقم الرف', placeholder: 'مثال: الرف التاني قطاع الجبن' },
    { key: 'category', label: 'القسم', placeholder: 'مثال: ألبان' },
    { key: 'unit', label: 'الوحدة', placeholder: 'مثال: علبة' },
    { key: 'cost_price', label: 'سعر التكلفة', placeholder: 'مثال: خمستاشر' },
    { key: 'selling_price', label: 'سعر البيع', placeholder: 'مثال: تمنتاشر' },
  ];

  function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('المتصفح لا يدعم التعرف على الصوت');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(transcript);
      setIsRecording(false);

      // Egyptian Arabic NLP processing
      const processed = processEgyptianArabic(transcript, voiceSteps[voiceStep].key);
      setVoiceData(prev => ({ ...prev, [voiceSteps[voiceStep].key]: processed }));
    };

    recognition.onerror = () => {
      setIsRecording(false);
      toast.error('خطأ في التعرف على الصوت');
    };

    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function processEgyptianArabic(text: string, field: string): string {
    let processed = text;

    // Egyptian Arabic number words to digits
    const numberMap: Record<string, string> = {
      'الفين': '2000', 'تلات الاف': '3000', 'الف': '1000',
      'ميتين': '200', 'ثلاثمية': '300', 'أربعمية': '400', 'خمسمية': '500',
      'ستمية': '600', 'سبعمية': '700', 'تمنمية': '800', 'تسعمية': '900',
      'مية': '100',
      'نص': '0.5', 'ربع': '0.25', 'تلت': '0.33',
      'اتنين': '2', 'تلاتة': '3', 'واحد': '1', 'أربعة': '4', 'خمسة': '5',
      'ستة': '6', 'سبعة': '7', 'تمنية': '8', 'تسعة': '9', 'عشرة': '10',
    };

    if (field === 'product_code') {
      // Extract numbers from speech
      Object.entries(numberMap).forEach(([word, num]) => {
        processed = processed.replace(new RegExp(word, 'g'), num);
      });
      // Remove non-numeric characters
      processed = processed.replace(/[^0-9]/g, '');
    } else if (field === 'cost_price' || field === 'selling_price') {
      Object.entries(numberMap).forEach(([word, num]) => {
        processed = processed.replace(new RegExp(word, 'g'), num);
      });
      processed = processed.replace(/[^0-9.]/g, '');
    } else if (field === 'shelf_number') {
      // "الرف التاني" -> "رف 2"
      const ordinalMap: Record<string, string> = {
        'الأول': '1', 'التاني': '2', 'التالت': '3', 'الرابع': '4', 'الخامس': '5',
        'السادس': '6', 'السابع': '7', 'التامن': '8', 'التاسع': '9', 'العاشر': '10',
      };
      Object.entries(ordinalMap).forEach(([word, num]) => {
        processed = processed.replace(new RegExp(word, 'g'), num);
      });
    }

    return processed.trim();
  }

  function stopVoiceRecognition() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }

  async function submitVoiceCoding() {
    const code = voiceData['product_code'] || `AUTO-${Date.now()}`;
    const name = voiceData['product_name'] || 'منتج جديد';

    if (isManager) {
      // Auto-approve and create stock item directly for managers
      const { data: draft } = await codingDraftService.create({
        product_code: code,
        product_name: name,
        category: voiceData['category'] || '',
        subcategory: '',
        unit: voiceData['unit'] || 'قطعة',
        shelf_number: voiceData['shelf_number'] || '',
        cost_price: parseFloat(voiceData['cost_price']) || 0,
        selling_price: parseFloat(voiceData['selling_price']) || 0,
        min_stock: 10,
        status: 'approved',
        submitted_by: user?.id,
        submitted_by_name: user?.nameAr || user?.name,
        submitted_by_role: user?.role,
        voice_input: voiceData,
      });

      if (draft) {
        await supabase.from('stock_items').insert({
          product_id: draft.id,
          product_name: draft.product_name,
          sku: draft.product_code,
          barcode: draft.product_code,
          current_qty: 0,
          min_qty: draft.min_stock,
          max_qty: draft.min_stock * 10,
          unit: draft.unit,
          cost_price: draft.cost_price,
          selling_price: draft.selling_price,
          location: draft.shelf_number || '',
          category: draft.category,
        });

        // Create coding label
        await supabase.from('coding_labels').insert({
          stock_item_id: draft.id,
          product_name: draft.product_name,
          product_sku: draft.product_code,
          selling_price: draft.selling_price,
          label_type: 'barcode',
          barcode_data: draft.product_code,
        });
      }

      toast.success('تم اعتماد التكويـد الصوتي وإنشاء الصنف');
    } else {
      await codingDraftService.create({
        product_code: code,
        product_name: name,
        category: voiceData['category'] || '',
        subcategory: '',
        unit: voiceData['unit'] || 'قطعة',
        shelf_number: voiceData['shelf_number'] || '',
        cost_price: parseFloat(voiceData['cost_price']) || 0,
        selling_price: parseFloat(voiceData['selling_price']) || 0,
        min_stock: 10,
        status: 'pending',
        submitted_by: user?.id,
        submitted_by_name: user?.nameAr || user?.name,
        submitted_by_role: user?.role,
        voice_input: voiceData,
      });
      toast.success('تم إرسال التكويـد كمسودة للمدير');
    }
    setVoiceStep(0);
    setVoiceData({});
    setVoiceTranscript('');
    fetchData();
  }

  // Approval
  async function handleApprove(draft: CodingDraft) {
    await codingDraftService.approve(draft.id, user?.id || '');

    // Create stock item
    await supabase.from('stock_items').insert({
      product_id: draft.id,
      product_name: draft.product_name,
      sku: draft.product_code,
      barcode: draft.product_code,
      current_qty: 0,
      min_qty: draft.min_stock,
      max_qty: draft.min_stock * 10,
      unit: draft.unit,
      cost_price: draft.cost_price,
      selling_price: draft.selling_price,
      location: draft.shelf_number || '',
      category: draft.category,
    });

    toast.success('تم اعتماد التكويـد وإنشاء الصنف');
    setApprovalModal({ open: false, draft: null });
    setRejectionReason('');
    fetchData();
  }

  async function handleReject(draft: CodingDraft) {
    if (!rejectionReason) {
      toast.error('اكتب سبب الرفض');
      return;
    }
    await codingDraftService.reject(draft.id, rejectionReason);
    toast.success('تم رفض التكويـد');
    setApprovalModal({ open: false, draft: null });
    setRejectionReason('');
    fetchData();
  }

  // Label Printing
  async function handlePrintLabels() {
    if (!selectedForPrint.length) {
      toast.error('اختر منتجات للطباعة');
      return;
    }

    const itemsToPrint = stockItems.filter(item => selectedForPrint.includes(item.id));

    // Create labels in DB
    for (const item of itemsToPrint) {
      await codingLabelService.create({
        stock_item_id: item.id,
        product_name: item.product_name,
        product_sku: item.sku,
        selling_price: item.selling_price,
        label_type: printType,
        barcode_data: item.barcode || item.sku,
        qr_data: JSON.stringify({ sku: item.sku, name: item.product_name, price: item.selling_price }),
      });
    }

    // Generate PDF-like print view
    generatePrintView(itemsToPrint);
    toast.success('تم إنشاء الملصقات');
  }

  function generatePrintView(items: StockItem[]) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labelsPerRow = 3;
    const labelsPerPage = 12;

    let html = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>ملصقات المنتجات</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
        <style>
          @page { size: A4; margin: 10mm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .page { width: 190mm; padding: 5mm; page-break-after: always; }
          .grid { display: grid; grid-template-columns: repeat(${labelsPerRow}, 1fr); gap: 3mm; }
          .label {
            border: 1px dashed #999; padding: 3mm; text-align: center;
            page-break-inside: avoid; position: relative;
          }
          .label::before, .label::after {
            content: '+'; position: absolute; color: #ccc; font-size: 8px;
          }
          .label::before { top: -4px; left: -4px; }
          .label::after { bottom: -4px; right: -4px; }
          .label-name { font-size: 10px; font-weight: bold; margin-bottom: 2px; }
          .label-price { font-size: 12px; color: #059669; font-weight: bold; }
          .label-barcode { margin-top: 2px; }
          .label-barcode svg { max-width: 100%; height: 20px; }
          .crop-mark { position: absolute; width: 5mm; height: 0.5px; background: #ccc; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
    `;

    for (let i = 0; i < items.length; i += labelsPerPage) {
      html += '<div class="page"><div class="grid">';
      const pageItems = items.slice(i, i + labelsPerPage);
      for (const item of pageItems) {
        html += `
          <div class="label">
            <div class="label-name">${item.product_name}</div>
            <div class="label-price">${item.selling_price.toLocaleString('ar-EG')} ج.م</div>
            <div class="label-barcode">
              <svg class="barcode" data-value="${item.barcode || item.sku}"></svg>
            </div>
          </div>
        `;
      }
      html += '</div></div>';
    }

    html += `
      <script>
        document.querySelectorAll('.barcode').forEach(svg => {
          JsBarcode(svg, svg.dataset.value, { format: 'CODE128', width: 1.5, height: 20, displayValue: false });
        });
        setTimeout(() => window.print(), 500);
      <\/script>
      </body></html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  const filteredDrafts = drafts.filter(d => {
    const matchesSearch = normalizeArabic(d.product_name).includes(normalizeArabic(search)) || d.product_code.includes(search);
    const matchesFilter = filterStatus === 'all' || d.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredForPrint = stockItems.filter(item => {
    if (!dateFrom && !dateTo) return true;
    // Filter by coding date if available
    return true;
  });

  if (loading) return <div className="text-center py-8 text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('list')} className={cn('px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors', activeTab === 'list' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]')}>
          <Eye size={14} className="inline ml-1" /> مسودات التكويـد
        </button>
        <button onClick={() => setActiveTab('excel')} className={cn('px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors', activeTab === 'excel' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]')}>
          <FileSpreadsheet size={14} className="inline ml-1" /> إكسيل
        </button>
        <button onClick={() => setActiveTab('labels')} className={cn('px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors', activeTab === 'labels' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]')}>
          <Printer size={14} className="inline ml-1" /> طباعة ملصقات
        </button>
        <button onClick={() => setActiveTab('voice')} className={cn('px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors', activeTab === 'voice' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]')}>
          <Mic size={14} className="inline ml-1" /> تكويـد صوتي
        </button>
      </div>

      {/* Drafts List (Manager) */}
        {activeTab === 'list' && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..." className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />
            </div>
            {([['all', 'الكل'], ['pending', 'معلق'], ['approved', 'معتمد'], ['rejected', 'مرفوض']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setFilterStatus(key)} className={cn('px-4 py-2 rounded-xl text-sm transition-colors', filterStatus === key ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]')}>{label}</button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredDrafts.map(draft => {
              const statusColors = { pending: 'bg-amber-500/20 text-amber-400', approved: 'bg-emerald-500/20 text-emerald-400', rejected: 'bg-red-500/20 text-red-400', active: 'bg-blue-500/20 text-blue-400' };
              const statusLabels = { pending: 'معلق', approved: 'معتمد', rejected: 'مرفوض', active: 'نشط' };
              return (
                <div key={draft.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-4">
                    <Package className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-sm">{draft.product_name}</p>
                      <p className="text-xs text-gray-500">{draft.product_code} • {draft.category || 'بدون قسم'} • {draft.submitted_by_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xs px-2 py-1 rounded-full', statusColors[draft.status])}>{statusLabels[draft.status]}</span>
                    {draft.status === 'pending' && isManager && (
                      <button onClick={() => setApprovalModal({ open: true, draft })} className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 transition-colors">مراجعة</button>
                    )}
                    {draft.status === 'rejected' && draft.rejection_reason && (
                      <span className="text-xs text-red-400 max-w-[150px] truncate" title={draft.rejection_reason}>{draft.rejection_reason}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Excel Import/Export (Manager) */}
      {activeTab === 'excel' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <h3 className="text-lg font-semibold mb-4">تصدير واستيراد الإكسيل</h3>
            <div className="flex gap-3 mb-6">
              <button onClick={handleExportTemplate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm">
                <Download size={16} /> تصدير القالب
              </button>
              <button onClick={handleExportCurrent} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors text-sm">
                <FileSpreadsheet size={16} /> تصدير المنتجات الحالية
              </button>
            </div>

            <div className="border-2 border-dashed border-white/[0.1] rounded-xl p-8 text-center">
              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-3">ارفع ملف الإكسيل هنا</p>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="excel-upload" />
              <label htmlFor="excel-upload" className="px-6 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer text-sm font-medium inline-block">
                اختيار ملف
              </label>
              {excelFile && <p className="text-xs text-gray-500 mt-2">{excelFile.name}</p>}
            </div>
          </div>

          {excelPreview.length > 0 && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">معاينة ({excelPreview.length} صنف)</h3>
                <button onClick={handleExcelImport} disabled={uploading} className="px-6 py-2 rounded-xl bg-emerald-500 text-sm hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50">
                  {uploading ? 'جاري الرفع...' : 'اعتماد ورفع'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-gray-400">
                      <th className="text-right py-2 px-2">الكود</th>
                      <th className="text-right py-2 px-2">الاسم</th>
                      <th className="text-right py-2 px-2">القسم</th>
                      <th className="text-right py-2 px-2">الوحدة</th>
                      <th className="text-right py-2 px-2">الرف</th>
                      <th className="text-right py-2 px-2">التكلفة</th>
                      <th className="text-right py-2 px-2">البيع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelPreview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-white/[0.03]">
                        <td className="py-2 px-2 font-mono text-xs">{row['كود المنتج'] || '-'}</td>
                        <td className="py-2 px-2">{row['اسم الصنف'] || '-'}</td>
                        <td className="py-2 px-2 text-xs text-gray-400">{row['القسم الرئيسي'] || '-'}</td>
                        <td className="py-2 px-2 text-xs">{row['الوحدة'] || '-'}</td>
                        <td className="py-2 px-2 text-xs">{row['رقم الرف'] || '-'}</td>
                        <td className="py-2 px-2 text-xs">{row['سعر التكلفة'] || '0'}</td>
                        <td className="py-2 px-2 text-xs">{row['سعر البيع'] || '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {excelPreview.length > 10 && <p className="text-xs text-gray-500 mt-2">... و{excelPreview.length - 10} صنف آخر</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voice Wizard */}
      {activeTab === 'voice' && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h3 className="text-lg font-semibold mb-2">معالج التكويـد الصوتي</h3>
          <p className="text-sm text-gray-400 mb-6">
            {isManager ? 'التكويـد المباشر - سيتم اعتماد الأصناف فوراً' : 'سيتم إرسال التكويـد كمسودة للمدير'}
          </p>

          <div className="max-w-2xl mx-auto">
            {/* Step indicator */}
            <div className="flex items-center justify-between mb-8 px-4">
              {voiceSteps.map((step, i) => (
                <div key={step.key} className="flex flex-col items-center flex-1 relative">
                  <div className={cn('h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-all z-10',
                    i < voiceStep ? 'bg-emerald-500 text-white' :
                    i === voiceStep ? 'bg-white dark:bg-slate-800 text-emerald-500 border-2 border-emerald-500 ring-4 ring-emerald-500/20' :
                    'bg-gray-100 dark:bg-slate-800 text-gray-400 border border-gray-200 dark:border-slate-700'
                  )}>
                    {i < voiceStep ? <Check size={16} /> : i + 1}
                  </div>
                  <span className={cn("text-[10px] mt-2 font-bold absolute top-10 whitespace-nowrap", i <= voiceStep ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400")}>
                    {step.label}
                  </span>
                  {i < voiceSteps.length - 1 && (
                    <div className="absolute top-5 left-1/2 w-full h-1 -z-0">
                      <div className={cn("h-full transition-all duration-500 rounded-full", i < voiceStep ? "bg-emerald-500" : "bg-gray-200 dark:bg-slate-700")} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Current step */}
            <div className="text-center mt-12">
              <div className="p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-white/20 shadow-2xl mb-6">
                <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2">{voiceSteps[voiceStep].label}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">{voiceSteps[voiceStep].placeholder}</p>

                {/* Voice input */}
                <div className="mb-6">
                  <button
                    onClick={isRecording ? stopVoiceRecognition : startVoiceRecognition}
                    className={cn('w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all duration-300 shadow-xl',
                      isRecording ? 'bg-red-500/20 border-2 border-red-500 animate-pulse' : 'bg-emerald-500 border-2 border-emerald-400 hover:scale-105'
                    )}
                  >
                    {isRecording ? <MicOff className="w-8 h-8 text-red-500" /> : <Mic className="w-8 h-8 text-white" />}
                  </button>
                  <p className="text-xs font-bold text-gray-500 mt-4">{isRecording ? 'جاري التسجيل... تحدث الآن' : 'اضغط للتحدث أو استخدم لوحة المفاتيح'}</p>
                </div>

                {/* Transcript */}
                {voiceTranscript && (
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 mb-4 text-right">
                    <p className="text-[10px] font-bold text-gray-500 mb-1 uppercase">النص المنطوق:</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{voiceTranscript}</p>
                  </div>
                )}

                {/* Processed value */}
                {voiceData[voiceSteps[voiceStep].key] && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-right">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 uppercase">القيمة المستخرجة:</p>
                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{voiceData[voiceSteps[voiceStep].key]}</p>
                  </div>
                )}

                {/* Manual edit */}
                <input
                  type="text"
                  value={voiceData[voiceSteps[voiceStep].key] || ''}
                  onChange={(e) => setVoiceData(prev => ({ ...prev, [voiceSteps[voiceStep].key]: e.target.value }))}
                  placeholder="أو اكتب يدوياً هنا..."
                  className="w-full mt-4 px-5 py-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-center text-lg font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner"
                />
              </div>

              {/* Navigation */}
              <div className="flex gap-4 px-4">
                {voiceStep > 0 && (
                  <button onClick={() => setVoiceStep(voiceStep - 1)} className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 transition-colors shadow-sm">
                    السابق
                  </button>
                )}
                {voiceStep < voiceSteps.length - 1 ? (
                  <button
                    onClick={() => setVoiceStep(voiceStep + 1)}
                    disabled={!voiceData[voiceSteps[voiceStep].key]}
                    className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:grayscale"
                  >
                    التالي
                  </button>
                ) : (
                  <button
                    onClick={submitVoiceCoding}
                    disabled={!voiceData[voiceSteps[voiceStep].key]}
                    className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-blue-500 to-indigo-600 text-white font-black hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {isManager ? 'اعتماد وإنشاء' : 'إرسال للمراجعة'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Label Printing (Manager) */}
      {activeTab === 'labels' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <h3 className="text-lg font-semibold mb-4">طباعة ملصقات المنتجات</h3>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو SKU..." className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div className="flex gap-2">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />
              </div>
            </div>

            {/* Print type */}
            <div className="flex gap-2 mb-4">
              {([['barcode', 'باركود'], ['qr', 'QR'], ['both', 'كلاهما']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setPrintType(key)} className={cn('px-4 py-2 rounded-xl text-sm transition-colors', printType === key ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]')}>{label}</button>
              ))}
            </div>

            {/* Select all */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setSelectedForPrint(selectedForPrint.length === filteredForPrint.length ? [] : filteredForPrint.map(i => i.id))} className="text-xs text-emerald-400 hover:text-emerald-300">
                {selectedForPrint.length === filteredForPrint.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
              <span className="text-xs text-gray-400">{selectedForPrint.length} محدد</span>
            </div>

            {/* Product list */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredForPrint.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedForPrint(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])}
                  className={cn('w-full flex items-center justify-between p-3 rounded-xl border text-right transition-all',
                    selectedForPrint.includes(item.id) ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/[0.06] hover:bg-white/[0.04]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-5 h-5 rounded border flex items-center justify-center', selectedForPrint.includes(item.id) ? 'bg-emerald-500 border-emerald-500' : 'border-white/[0.2]')}>
                      {selectedForPrint.includes(item.id) && <Check size={12} className="text-white" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-gray-500">{item.sku} • {item.selling_price.toLocaleString('ar-EG')} ج.م</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={handlePrintLabels} disabled={!selectedForPrint.length} className="w-full mt-4 py-2.5 rounded-xl bg-emerald-500 text-sm hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              <Printer size={16} /> طباعة {selectedForPrint.length} ملصق
            </button>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approvalModal.open && approvalModal.draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold">مراجعة التكويـد</h3>

            <div className="p-4 rounded-xl bg-white/[0.03] space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">المنتج</span><span>{approvalModal.draft.product_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">الكود</span><span className="font-mono">{approvalModal.draft.product_code}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">القسم</span><span>{approvalModal.draft.category || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">الوحدة</span><span>{approvalModal.draft.unit}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">التكلفة</span><span>{approvalModal.draft.cost_price} ج.م</span></div>
              <div className="flex justify-between"><span className="text-gray-400">البيع</span><span className="font-bold text-emerald-400">{approvalModal.draft.selling_price} ج.م</span></div>
              <div className="flex justify-between"><span className="text-gray-400">قدمه</span><span>{approvalModal.draft.submitted_by_name}</span></div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">سبب الرفض (اختياري)</label>
              <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="اكتب سبب الرفض..." className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-red-500/50 min-h-[60px]" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setApprovalModal({ open: false, draft: null })} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors">إلغاء</button>
              <button onClick={() => handleReject(approvalModal.draft!)} className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors">رفض</button>
              <button onClick={() => handleApprove(approvalModal.draft!)} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-sm hover:bg-emerald-600 transition-colors font-medium">اعتماد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
