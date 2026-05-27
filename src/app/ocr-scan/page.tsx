'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Camera, Upload, FileText, Loader2, CheckCircle, XCircle,
  Eye, Trash2, Plus, Wallet, Calendar, RefreshCw,
  AlertTriangle, FileImage, Edit3, Save, Ban, History
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import Tesseract from 'tesseract.js';

const supabase = createClient();

interface OCRItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface OCRResult {
  supplier_name?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  items: OCRItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  confidence?: number;
  raw_text?: string;
}

interface StoredInvoice {
  id?: string;
  supplier_name?: string;
  invoice_number?: string;
  invoice_date?: string;
  total?: number;
  created_at: string;
}

const SKIP_ITEM_WORDS = [
  'المجموع', 'الإجمالي', 'الاجمالي', 'الضريبة', 'subtotal', 'total',
  'tax', 'vat', 'البيان', 'الكمية', 'السعر', 'الإجمالي', 'الصنف',
  'المنتج', 'المبلغ', 'القيمة', 'الصفحة', 'page'
];

async function preprocessImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const contrast = 1.4;
        gray = 128 + contrast * (gray - 128);
        if (gray > 145) gray = 255;
        else if (gray < 90) gray = 0;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = dataUrl;
  });
}

function parseSupplierName(text: string): string | undefined {
  const patterns = [
    /(?:اسم\s*)?المور[ِدّ]\s*[:\-–]?\s*(.+)/i,
    /شركة\s+([^\n]+)/i,
    /مؤسسة\s+([^\n]+)/i,
    /مورد\s*[:\-–]?\s*(.+)/i,
    /supplier\s*[:\-–]?\s*(.+)/i,
    /vendor\s*[:\-–]?\s*(.+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]?.trim()) return m[1].trim().replace(/[:\-–\s]+$/, '');
  }
  return undefined;
}

function parseInvoiceNumber(text: string): string | undefined {
  const patterns = [
    /(?:رقم الفاتورة|رقم الفاتوره|فاتورة رقم)\s*[:\-–]?\s*([^\n]+)/i,
    /INV-\s*\d+/i,
    /Invoice\s*(?:No\.?|Number|#)\s*[:\-–]?\s*([^\n]+)/i,
    /رقم\s*[:\-–]?\s*(\d{3,})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return (m[1] || m[0]).trim();
  }
  return undefined;
}

function tryParseDate(str: string): string | null {
  const cleaned = str.replace(/[^\d\/\-\.\s]/g, '').trim();
  const formats = [
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
  ];
  for (const f of formats) {
    const m = cleaned.match(f);
    if (m) {
      const [_, a, b, c] = m;
      const year = a.length === 4 ? a : c;
      const month = a.length === 4 ? b.padStart(2, '0') : a.padStart(2, '0');
      const day = a.length === 4 ? c.padStart(2, '0') : b.padStart(2, '0');
      const d = new Date(`${year}-${month}-${day}`);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }
  return null;
}

function extractDate(text: string, pattern: RegExp): string | undefined {
  const m = text.match(pattern);
  if (m) {
    const parsed = tryParseDate(m[1] || m[0]);
    if (parsed) return parsed;
  }
  return undefined;
}

function parseInvoiceDate(text: string): string | undefined {
  return extractDate(text, /(?:تاريخ الفاتورة|التاريخ|فاتورة تاريخ|تاريخ|invoice date|date)\s*[:\-–]?\s*([^\n]+)/i)
    || extractDate(text, /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/);
}

function parseDueDate(text: string): string | undefined {
  return extractDate(text, /(?:تاريخ الاستحقاق|استحقاق|due\s*date|تاريخ الاستحقاق)\s*[:\-–]?\s*([^\n]+)/i);
}

function parseItems(text: string): OCRItem[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items: OCRItem[] = [];

  for (const line of lines) {
    const nums = line.match(/\d+(?:[.,]\d+)?/g);
    if (!nums || nums.length < 3) continue;

    const lastThree = nums.slice(-3).map(n => parseFloat(n.replace(',', '')));
    const [qty, price, total] = lastThree;
    if (qty <= 0 || total <= 0) continue;

    const targetNum = nums[nums.length - 3];
    const idx = line.lastIndexOf(targetNum);
    const namePart = line.substring(0, idx).trim();

    if (!namePart || namePart.length < 2) continue;
    if (SKIP_ITEM_WORDS.some(w => namePart.includes(w))) continue;
    if (namePart.match(/^\d+[\s.]/)) continue;

    items.push({ name: namePart, quantity: qty, unit_price: price, total });
  }

  return items;
}

function pickNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat((m[1] || m[0]).replace(',', ''));
      if (!isNaN(val)) return val;
    }
  }
  return undefined;
}

function parseSubtotal(text: string): number | undefined {
  return pickNumber(text, [
    /(?:المجموع الفرعي|subtotal|المجموع قبل الضريبة)\s*[:\-–]?\s*(\d+(?:[.,]\d+)?)/i,
  ]);
}

function parseTax(text: string): number | undefined {
  return pickNumber(text, [
    /(?:الضريبة|ضريبة|VAT|tax|ضريبة القيمة المضافة|القيمة المضافة|ضريبه)\s*[:\-–]?\s*(\d+(?:[.,]\d+)?)/i,
    /ض\.م\.أ\s*[:\-–]?\s*(\d+(?:[.,]\d+)?)/i,
    /(\d+(?:[.,]\d+)?)\s*%\s*ضريبة/i,
  ]);
}

function parseTotal(text: string): number | undefined {
  return pickNumber(text, [
    /(?:الإجمالي|الاجمالي|total|المجموع الكلي|الاجمالى)\s*[:\-–]?\s*(\d+(?:[.,]\d+)?)/i,
  ]);
}

function parseOCRResult(text: string): OCRResult {
  const items = parseItems(text);
  const parsedSubtotal = parseSubtotal(text);
  const parsedTax = parseTax(text);
  const parsedTotal = parseTotal(text);

  return {
    supplier_name: parseSupplierName(text) || '',
    invoice_number: parseInvoiceNumber(text) || '',
    invoice_date: parseInvoiceDate(text) || '',
    due_date: parseDueDate(text) || '',
    items,
    subtotal: parsedSubtotal,
    tax: parsedTax,
    total: parsedTotal,
    raw_text: text,
  };
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function pdfToImages(file: File): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist');
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  } catch {
    // CDN fallback
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const maxPages = Math.min(pdf.numPages, 10);
  const images: string[] = [];
  const canvas = document.createElement('canvas');

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, viewport }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.92));
  }
  return images;
}

function ConfidenceBadge({ confidence }: { confidence?: number }) {
  if (confidence === undefined) return null;
  const pct = Math.round(confidence);
  const color = pct >= 85 ? 'bg-emerald-100 text-emerald-700' :
    pct >= 60 ? 'bg-amber-100 text-amber-700' :
      'bg-red-100 text-red-700';
  return (
    <Badge className={`${color} border-0`}>
      {pct}% دقة
    </Badge>
  );
}

export default function OCRScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [editable, setEditable] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previousInvoices, setPreviousInvoices] = useState<StoredInvoice[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ocr_invoices') || '[]');
      setPreviousInvoices(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const ch = supabase.channel('sync-ocr')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_invoices' }, () => {
        window.location.reload();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
      setEditable(null);
      setError(null);
      setIsEditing(false);
      setOcrProgress(0);
    }
  };

  const handleScan = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setOcrProgress(0);

    try {
      let imagesToProcess: string[] = [];

      if (file.type === 'application/pdf') {
        imagesToProcess = await pdfToImages(file);
      } else {
        const dataUrl = await fileToDataUrl(file);
        const processed = await preprocessImage(dataUrl);
        imagesToProcess = [processed];
      }

      let fullText = '';
      let totalConfidence = 0;
      let completedPages = 0;

      for (const img of imagesToProcess) {
        const { data } = await Tesseract.recognize(img, 'ara+eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(
                (completedPages + (m.progress || 0)) / imagesToProcess.length
              );
            }
          },
        });
        fullText += data.text + '\n';
        totalConfidence += data.confidence || 0;
        completedPages++;
      }

      const parsed: OCRResult = parseOCRResult(fullText.trim());
      parsed.confidence = imagesToProcess.length > 0
        ? totalConfidence / imagesToProcess.length
        : 0;
      parsed.raw_text = fullText.trim();

      setResult(parsed);
      setEditable({ ...parsed, items: parsed.items.map(i => ({ ...i })) });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء معالجة المستند'
      );
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = useCallback(() => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setEditable(null);
    setError(null);
    setIsEditing(false);
    setOcrProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleRetry = () => {
    handleScan();
  };

  const toggleEdit = () => {
    if (isEditing && result && editable) {
      setResult({ ...editable, items: editable.items.map(i => ({ ...i })) });
    }
    setIsEditing(!isEditing);
  };

  const cancelEdit = () => {
    if (result) setEditable({ ...result, items: result.items.map(i => ({ ...i })) });
    setIsEditing(false);
  };

  const updateField = (field: keyof OCRResult, value: string | number | undefined) => {
    if (!editable) return;
    setEditable({ ...editable, [field]: value });
  };

  const updateItem = (index: number, field: keyof OCRItem, value: string | number) => {
    if (!editable) return;
    const items = [...editable.items];
    items[index] = { ...items[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      items[index].total = Math.round(items[index].quantity * items[index].unit_price * 100) / 100;
    }
    setEditable({ ...editable, items });
  };

  const addItem = () => {
    if (!editable) return;
    setEditable({
      ...editable,
      items: [...editable.items, { name: '', quantity: 1, unit_price: 0, total: 0 }],
    });
  };

  const removeItem = (index: number) => {
    if (!editable) return;
    setEditable({ ...editable, items: editable.items.filter((_, i) => i !== index) });
  };

  const saveToLocalStorage = (data: OCRResult, invoiceId?: string | null) => {
    try {
      const existing: StoredInvoice[] = JSON.parse(localStorage.getItem('ocr_invoices') || '[]');
      existing.unshift({
        id: invoiceId || undefined,
        supplier_name: data.supplier_name,
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        total: data.total,
        created_at: new Date().toISOString(),
      });
      const updated = existing.slice(0, 50);
      localStorage.setItem('ocr_invoices', JSON.stringify(updated));
      setPreviousInvoices(updated);
    } catch {
      // localStorage full or unavailable
    }
  };

  const handleCreateInvoice = async () => {
    if (!editable) return;
    setSaving(true);
    let invoiceId: string | null = null;
    let savedToSupabase = false;

    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('purchase_invoices')
        .insert({
          invoice_number: editable.invoice_number,
          supplier_name_ar: editable.supplier_name,
          invoice_date: editable.invoice_date,
          due_date: editable.due_date,
          status: 'draft',
          importance: 'medium',
          subtotal: editable.subtotal,
          tax_amount: editable.tax,
          tax_percent: 15,
          total: editable.total,
          ocr_data: result || editable,
          original_file_url: preview,
        })
        .select()
        .single();

      if (!invoiceError && invoiceData) {
        invoiceId = invoiceData.id;
        savedToSupabase = true;

        if (editable.items.length > 0) {
          const items = editable.items.map((item) => ({
            invoice_id: invoiceData.id,
            product_name_ar: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
            unit: 'قطعة',
            tax_percent: 15,
          }));
          await supabase.from('purchase_invoice_items').insert(items);
        }
      }
    } catch (err) {
      console.error('Supabase save failed, saving to localStorage only:', err);
    }

    saveToLocalStorage(editable, invoiceId);

    if (savedToSupabase) {
      alert('تم إنشاء فاتورة المسودة بنجاح!');
    } else {
      alert('تم حفظ الفاتورة محلياً (تعذر الحفظ في قاعدة البيانات)');
    }

    setSaving(false);
    handleClear();
  };

  const isPdf = file?.type === 'application/pdf';

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">مسح الفواتير (OCR)</h1>
          <p className="text-xs text-muted-foreground mt-1">مسح الفواتير ضوئياً واستخراج البيانات تلقائياً</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">تحميل الملف</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
            >
              {preview ? (
                <div className="relative">
                  {isPdf ? (
                    <div className="max-h-48 mx-auto rounded-lg bg-muted flex items-center justify-center p-4">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <span className="mr-2 text-sm text-muted-foreground">{file?.name}</span>
                    </div>
                  ) : (
                    <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">اضغط لرفع صورة أو ملف PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {processing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>جاري المعالجة...</span>
                  <span className="font-mono">{Math.round(ocrProgress * 100)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(1, ocrProgress * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {file && !processing && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleScan} disabled={processing}>
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      جاري المسح...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 ml-1" />
                      مسح المستند
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleClear}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {error && (
              <div className="space-y-2">
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
                <Button variant="outline" size="sm" onClick={handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 ml-1" />
                  إعادة محاولة
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">النتائج المستخرجة</CardTitle>
            {result && editable && (
              <div className="flex gap-1">
                {isEditing ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      <Ban className="h-4 w-4 ml-1" />
                      إلغاء
                    </Button>
                    <Button variant="default" size="sm" onClick={toggleEdit}>
                      <Save className="h-4 w-4 ml-1" />
                      تأكيد
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={toggleEdit}>
                    <Edit3 className="h-4 w-4 ml-1" />
                    تحرير
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {result && editable ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm flex-1">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    تم استخراج البيانات بنجاح
                  </div>
                  <ConfidenceBadge confidence={result.confidence} />
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="المورد"
                        value={editable.supplier_name || ''}
                        icon={<FileText className="h-4 w-4" />}
                        onChange={(e) => updateField('supplier_name', e.target.value)}
                      />
                      <Input
                        label="رقم الفاتورة"
                        value={editable.invoice_number || ''}
                        icon={<FileText className="h-4 w-4" />}
                        onChange={(e) => updateField('invoice_number', e.target.value)}
                      />
                      <Input
                        label="تاريخ الفاتورة"
                        type="date"
                        value={editable.invoice_date || ''}
                        icon={<Calendar className="h-4 w-4" />}
                        onChange={(e) => updateField('invoice_date', e.target.value)}
                      />
                      <Input
                        label="تاريخ الاستحقاق"
                        type="date"
                        value={editable.due_date || ''}
                        icon={<Calendar className="h-4 w-4" />}
                        onChange={(e) => updateField('due_date', e.target.value)}
                      />
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground">المنتجات ({editable.items.length})</p>
                        <Button variant="ghost" size="sm" onClick={addItem}>
                          <Plus className="h-3 w-3 ml-1" />
                          إضافة
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {editable.items.map((item, i) => (
                          <div key={i} className="p-2 bg-muted/50 rounded-lg space-y-2">
                            <div className="grid grid-cols-4 gap-2">
                              <div className="col-span-4">
                                <input
                                  className="w-full h-8 rounded border border-input bg-background px-2 text-sm"
                                  value={item.name}
                                  onChange={(e) => updateItem(i, 'name', e.target.value)}
                                  placeholder="اسم المنتج"
                                />
                              </div>
                              <input
                                className="w-full h-8 rounded border border-input bg-background px-2 text-sm"
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(i, 'quantity', Math.max(0, parseFloat(e.target.value) || 0))}
                                placeholder="الكمية"
                              />
                              <input
                                className="w-full h-8 rounded border border-input bg-background px-2 text-sm"
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateItem(i, 'unit_price', Math.max(0, parseFloat(e.target.value) || 0))}
                                placeholder="السعر"
                              />
                              <input
                                className="w-full h-8 rounded border border-input bg-background px-2 text-sm"
                                type="number"
                                step="0.01"
                                value={item.total}
                                onChange={(e) => updateItem(i, 'total', Math.max(0, parseFloat(e.target.value) || 0))}
                                placeholder="الإجمالي"
                              />
                              <button
                                onClick={() => removeItem(i)}
                                className="h-8 w-8 rounded border border-input flex items-center justify-center text-destructive hover:bg-destructive/10"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <Input
                        label="المجموع الفرعي"
                        type="number"
                        step="0.01"
                        value={editable.subtotal ?? ''}
                        icon={<Wallet className="h-4 w-4" />}
                        onChange={(e) => updateField('subtotal', e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                      <Input
                        label="الضريبة"
                        type="number"
                        step="0.01"
                        value={editable.tax ?? ''}
                        icon={<Wallet className="h-4 w-4" />}
                        onChange={(e) => updateField('tax', e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                      <Input
                        label="الإجمالي"
                        type="number"
                        step="0.01"
                        value={editable.total ?? ''}
                        icon={<Wallet className="h-4 w-4" />}
                        onChange={(e) => updateField('total', e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">المورد</p>
                        <p className="font-medium">{editable.supplier_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">رقم الفاتورة</p>
                        <p className="font-mono font-medium">{editable.invoice_number || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">تاريخ الفاتورة</p>
                        <p className="font-medium">
                          {editable.invoice_date
                            ? formatDate(new Date(editable.invoice_date).getTime())
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">تاريخ الاستحقاق</p>
                        <p className="font-medium">
                          {editable.due_date
                            ? formatDate(new Date(editable.due_date).getTime())
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {editable.items.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-xs text-muted-foreground mb-2">المنتجات ({editable.items.length})</p>
                        <div className="space-y-2">
                          {editable.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                              <span>{item.name}</span>
                              <div className="text-left flex-shrink-0">
                                <span className="ml-2">{item.quantity}x</span>
                                <span className="font-medium">{formatCurrency(item.total)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">المجموع</span>
                        <span className="font-medium">{formatCurrency(editable.subtotal || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">الضريبة (15%)</span>
                        <span className="font-medium">{formatCurrency(editable.tax || 0)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>الإجمالي</span>
                        <span className="text-primary">{formatCurrency(editable.total || 0)}</span>
                      </div>
                    </div>

                    <Button className="w-full mt-4" onClick={handleCreateInvoice} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 ml-1" />
                          إنشاء فاتورة مسودة
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : processing ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin opacity-50" />
                <p className="text-sm">جاري مسح المستند ضوئياً...</p>
                <p className="text-xs mt-1">يتم استخراج النصوص والبيانات</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">لم يتم مسح أي مستند بعد</p>
                <p className="text-xs mt-1">قم بتحميل صورة فاتورة أو PDF للمتابعة</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">سجل الفواتير الممسوحة</CardTitle>
        </CardHeader>
        <CardContent>
          {previousInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">لا توجد فواتير ممسوحة سابقاً</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-right pb-2 pl-4">المورد</th>
                    <th className="text-right pb-2 pl-4">رقم الفاتورة</th>
                    <th className="text-right pb-2 pl-4">التاريخ</th>
                    <th className="text-right pb-2 pl-4">الإجمالي</th>
                    <th className="text-right pb-2">تاريخ المسح</th>
                  </tr>
                </thead>
                <tbody>
                  {previousInvoices.map((inv, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pl-4">{inv.supplier_name || '—'}</td>
                      <td className="py-2 pl-4 font-mono text-xs">{inv.invoice_number || '—'}</td>
                      <td className="py-2 pl-4">{inv.invoice_date || '—'}</td>
                      <td className="py-2 pl-4 font-medium">{inv.total ? formatCurrency(inv.total) : '—'}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {formatDate(new Date(inv.created_at).getTime())}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
