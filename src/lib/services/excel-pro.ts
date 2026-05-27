'use client';

import * as XLSX from 'xlsx';

// ─── Professional Excel Utilities ──────────────────────────────────

type CellStyle = {
  font?: { bold?: boolean; sz?: number; color?: { rgb: string }; name?: string };
  fill?: { fgColor?: { rgb: string } };
  alignment?: { horizontal?: string; vertical?: string; wrapText?: boolean };
  border?: { top?: { style: string; color: { rgb: string } }; bottom?: { style: string; color: { rgb: string } }; left?: { style: string; color: { rgb: string } }; right?: { style: string; color: { rgb: string } } };
  numFmt?: string;
  protection?: { locked?: boolean };
};

export interface ExcelDropdownOption {
  label: string;
  value: string;
}

export interface ExcelColumn {
  key: string;
  labelAr: string;
  labelEn: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'currency' | 'readonly';
  width: number;
  required?: boolean;
  dropdownOptions?: ExcelDropdownOption[];
  comment?: string;
  locked?: boolean;
  format?: string;
}

export interface ExcelExportConfig {
  titleAr: string;
  titleEn: string;
  sheetName: string;
  columns: ExcelColumn[];
  rows: Record<string, any>[];
  brandColor?: string;
}

export interface ExcelImportResult {
  success: boolean;
  data: Record<string, any>[];
  errors: ImportError[];
  warnings: string[];
}

export interface ImportError {
  row: number;
  column: string;
  value: string;
  message: string;
}

// ─── Color Constants ───────────────────────────────────────────────

const COLORS = {
  headerBg: '1E293B',
  headerFont: 'FFFFFF',
  brandBg: '059669',
  brandFont: 'FFFFFF',
  titleBg: 'F8FAFC',
  titleFont: '1E293B',
  subtitleFont: '64748B',
  rowEven: 'F8FAFC',
  rowOdd: 'FFFFFF',
  totalBg: '059669',
  totalFont: 'FFFFFF',
  dropdownBg: 'FEF3C7',
  dropdownFont: '92400E',
  lockedBg: 'F1F5F9',
  lockedFont: '94A3B8',
  errorBg: 'FEE2E2',
  errorFont: 'DC2626',
  border: 'E2E8F0',
  commentBg: 'FFFFCC',
  commentFont: '333333',
};

// ─── Style Application ─────────────────────────────────────────────

function applyCellStyle(ws: XLSX.WorkSheet, addr: string, style: CellStyle) {
  if (!ws[addr]) ws[addr] = { t: 's', v: '' };
  ws[addr].s = { ...ws[addr].s, ...style };
}

function applyBorder(ws: XLSX.WorkSheet, addr: string) {
  applyCellStyle(ws, addr, {
    border: {
      top: { style: 'thin', color: { rgb: COLORS.border } },
      bottom: { style: 'thin', color: { rgb: COLORS.border } },
      left: { style: 'thin', color: { rgb: COLORS.border } },
      right: { style: 'thin', color: { rgb: COLORS.border } },
    },
  });
}

// ─── Professional Export ───────────────────────────────────────────

export function exportProfessionalExcel(config: ExcelExportConfig, filename: string) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  const { columns, rows, titleAr, titleEn, sheetName } = config;
  const colCount = columns.length;
  const rowCount = rows.length;

  // Row 0: Title
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
  const titleAddr = XLSX.utils.encode_cell({ r: 0, c: 0 });
  ws[titleAddr] = { t: 's', v: titleAr };
  applyCellStyle(ws, titleAddr, {
    font: { bold: true, sz: 16, color: { rgb: COLORS.titleFont }, name: 'Arial' },
    fill: { fgColor: { rgb: COLORS.titleBg } },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  applyBorder(ws, titleAddr);

  // Row 1: Subtitle + Export Date
  const subAddr = XLSX.utils.encode_cell({ r: 1, c: 0 });
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } });
  ws[subAddr] = { t: 's', v: `${titleEn}  |  ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}  |  ${rowCount} سجل` };
  applyCellStyle(ws, subAddr, {
    font: { sz: 10, color: { rgb: COLORS.subtitleFont }, name: 'Arial' },
    fill: { fgColor: { rgb: COLORS.titleBg } },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  applyBorder(ws, subAddr);

  // Row 2: Empty spacer
  for (let C = 0; C < colCount; C++) {
    const addr = XLSX.utils.encode_cell({ r: 2, c: C });
    ws[addr] = { t: 's', v: '' };
    applyBorder(ws, addr);
  }

  // Data Validation Array
  const validations: any[] = [];

  // Row 3: Header Row
  for (let C = 0; C < colCount; C++) {
    const col = columns[C];
    const addr = XLSX.utils.encode_cell({ r: 3, c: C });
    ws[addr] = { t: 's', v: col.labelAr };
    applyCellStyle(ws, addr, {
      font: { bold: true, sz: 11, color: { rgb: COLORS.headerFont }, name: 'Arial' },
      fill: { fgColor: { rgb: COLORS.headerBg } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    });
    applyBorder(ws, addr);

    if (col.dropdownOptions) {
      const optionsText = col.dropdownOptions.map(o => o.label).join('، ');
      ws[addr].c = [{ a: 'النظام', t: `قائمة منسدلة: ${optionsText}` }];
      
      // Add native Excel data validation (dropdown) for this column from row 5 to 1000
      const colLetter = XLSX.utils.encode_col(C);
      validations.push({
        sqref: `${colLetter}5:${colLetter}1000`,
        type: 'list',
        allowBlank: true,
        showErrorMessage: true,
        errorTitle: 'قيمة غير صالحة',
        error: 'الرجاء اختيار قيمة من القائمة المنسدلة',
        formula1: `"${col.dropdownOptions.map(o => o.label).join(',')}"`
      });
    }
    if (col.comment) {
      ws[addr].c = [{ a: 'النظام', t: col.comment }];
    }
    if (col.required) {
      const existingComment = ws[addr].c?.[0]?.t || '';
      ws[addr].c = [{ a: 'النظام', t: `⚠️ مطلوب - ${existingComment}` }];
    }
  }

  // Inject Data Validations
  if (validations.length > 0) {
    ws['!dataValidation'] = validations;
  }

  // Data Rows (starting at row 4)
  for (let R = 0; R < rowCount; R++) {
    const row = rows[R];
    const dataRow = R + 4;

    for (let C = 0; C < colCount; C++) {
      const col = columns[C];
      const addr = XLSX.utils.encode_cell({ r: dataRow, c: C });
      const rawVal = row[col.key];

      if (col.locked) {
        // Locked/readonly cells
        ws[addr] = { t: 's', v: String(rawVal ?? '') };
        applyCellStyle(ws, addr, {
          fill: { fgColor: { rgb: COLORS.lockedBg } },
          font: { sz: 10, color: { rgb: COLORS.lockedFont }, name: 'Arial' },
          alignment: { horizontal: 'center', vertical: 'center' },
          protection: { locked: true },
        });
        applyBorder(ws, addr);
        ws[addr].c = [{ a: 'النظام', t: '🔒 هذه الخلية للقراءة فقط - لا يمكن تعديلها' }];
      } else if (col.type === 'number' || col.type === 'currency') {
        ws[addr] = { t: 'n', v: Number(rawVal) || 0 };
        const bgColor = R % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;
        applyCellStyle(ws, addr, {
          fill: { fgColor: { rgb: bgColor } },
          font: { sz: 10, bold: col.type === 'currency', name: 'Arial' },
          numFmt: col.type === 'currency' ? '#,##0.00' : '#,##0',
          alignment: { horizontal: 'center', vertical: 'center' },
        });
        applyBorder(ws, addr);
      } else if (col.type === 'dropdown') {
        const val = String(rawVal ?? '');
        ws[addr] = { t: 's', v: val };
        
        // Conditional formatting based on specific values
        let fgColor = COLORS.dropdownBg;
        let fontColor = COLORS.dropdownFont;
        if (val === 'نفذ من المخزون' || val === 'غير نشط') {
          fgColor = COLORS.errorBg;
          fontColor = COLORS.errorFont;
        }

        applyCellStyle(ws, addr, {
          fill: { fgColor: { rgb: fgColor } },
          font: { sz: 10, color: { rgb: fontColor }, name: 'Arial', bold: fgColor === COLORS.errorBg },
          alignment: { horizontal: 'center', vertical: 'center' },
        });
        applyBorder(ws, addr);
      } else {
        ws[addr] = { t: 's', v: String(rawVal ?? '') };
        
        let fgColor = R % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;
        let fontColor = '334155';
        
        // Conditional formatting for negative/low stock (Assuming column key implies stock)
        if (col.key === 'stock' || col.key === 'quantity') {
           const numVal = Number(rawVal);
           if (numVal <= 0) {
             fgColor = COLORS.errorBg;
             fontColor = COLORS.errorFont;
           }
        }
        
        applyCellStyle(ws, addr, {
          fill: { fgColor: { rgb: fgColor } },
          font: { sz: 10, name: 'Arial', color: { rgb: fontColor } },
          alignment: { horizontal: col.type === 'text' ? 'right' : 'center', vertical: 'center' },
        });
        applyBorder(ws, addr);
      }
    }
  }

  // Totals Row (if numeric columns exist)
  const numericCols = columns.filter(c => c.type === 'number' || c.type === 'currency');
  if (numericCols.length > 0 && rowCount > 0) {
    const totalRow = rowCount + 4;
    for (let C = 0; C < colCount; C++) {
      const col = columns[C];
      const addr = XLSX.utils.encode_cell({ r: totalRow, c: C });

      if (col.type === 'number' || col.type === 'currency') {
        const sum = rows.reduce((acc, row) => acc + (Number(row[col.key]) || 0), 0);
        ws[addr] = { t: 'n', v: sum };
        applyCellStyle(ws, addr, {
          fill: { fgColor: { rgb: COLORS.totalBg } },
          font: { bold: true, sz: 11, color: { rgb: COLORS.totalFont }, name: 'Arial' },
          numFmt: col.type === 'currency' ? '#,##0.00' : '#,##0',
          alignment: { horizontal: 'center', vertical: 'center' },
        });
      } else if (C === colCount - 1) {
        ws[addr] = { t: 's', v: 'الإجمالي' };
        applyCellStyle(ws, addr, {
          fill: { fgColor: { rgb: COLORS.totalBg } },
          font: { bold: true, sz: 11, color: { rgb: COLORS.totalFont }, name: 'Arial' },
          alignment: { horizontal: 'center', vertical: 'center' },
        });
      } else {
        ws[addr] = { t: 's', v: '' };
        applyCellStyle(ws, addr, {
          fill: { fgColor: { rgb: COLORS.totalBg } },
        });
      }
      applyBorder(ws, addr);
    }
  }

  // Column widths
  ws['!cols'] = columns.map(col => ({ wch: col.width }));

  // Freeze panes (freeze title + subtitle + spacer + header = 4 rows)
  ws['!freeze'] = { xSplit: 0, ySplit: 4 };

  // Auto-filter on header row
  const headerRange = XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } });
  ws['!autofilter'] = { ref: headerRange };

  // Print settings
  ws['!pageSetup'] = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Instructions sheet
  const instrWs = XLSX.utils.aoa_to_sheet([
    ['تعليمات الاستخدام'],
    [''],
    ['1. الخلايا الصفراء = قوائم منسدلة - اختر من القيم المسموحة'],
    ['2. الخلايا الرمادية = للقراءة فقط - لا يمكن تعديلها'],
    ['3. الخلايا البيضاء = يمكنك الكتابة فيها بحرية'],
    ['4. الصف الأخضر = إجمالي محسوب تلقائياً'],
    ['5. عند الاستيراد سيتم التحقق من صحة البيانات'],
    [''],
    ['الأعمدة والمتطلبات'],
  ]);

  columns.forEach((col, i) => {
    const row = 8 + i;
    instrWs[XLSX.utils.encode_cell({ r: row, c: 0 })] = { t: 's', v: col.labelAr };
    instrWs[XLSX.utils.encode_cell({ r: row, c: 1 })] = { t: 's', v: col.type };
    instrWs[XLSX.utils.encode_cell({ r: row, c: 2 })] = { t: 's', v: col.required ? 'مطلوب' : 'اختياري' };
    instrWs[XLSX.utils.encode_cell({ r: row, c: 3 })] = { t: 's', v: col.comment || '' };
    if (col.dropdownOptions) {
      instrWs[XLSX.utils.encode_cell({ r: row, c: 4 })] = { t: 's', v: col.dropdownOptions.map(o => o.label).join('، ') };
    }
  });

  instrWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  instrWs['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 40 }, { wch: 40 }];

  XLSX.utils.book_append_sheet(wb, instrWs, 'تعليمات');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Professional Import with Validation ───────────────────────────

export function importProfessionalExcel(
  file: File,
  columns: ExcelColumn[],
  headerRow: number = 0
): Promise<ExcelImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellStyles: true, cellFormula: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(ws, { header: 1 });

        if (json.length < 2) {
          resolve({ success: false, data: [], errors: [], warnings: ['الملف فارغ أو لا يحتوي على بيانات'] });
          return;
        }

        // Find header row
        const headerData = json[headerRow] as (string | number | undefined)[];
        const headers = headerData.map((h) => String(h ?? '').trim());

        // Map columns
        const colMapping: { excelIndex: number; config: ExcelColumn }[] = [];
        const missingCols: string[] = [];

        columns.forEach((col) => {
          const idx = headers.findIndex(h =>
            h === col.labelAr || h === col.labelEn || h.toLowerCase() === col.key.toLowerCase()
          );
          if (idx >= 0) {
            colMapping.push({ excelIndex: idx, config: col });
          } else if (col.required) {
            missingCols.push(col.labelAr);
          }
        });

        if (missingCols.length > 0) {
          resolve({
            success: false,
            data: [],
            errors: [],
            warnings: [`الأعمدة المطلوبة التالية مفقودة: ${missingCols.join('، ')}`],
          });
          return;
        }

        const result: ExcelImportResult = { success: true, data: [], errors: [], warnings: [] };

        // Process data rows
        for (let i = headerRow + 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.every((cell) => !cell || String(cell).trim() === '')) continue;

          const record: Record<string, any> = {};
          let rowHasError = false;

          for (const { excelIndex, config } of colMapping) {
            const rawVal = row[excelIndex];
            const strVal = String(rawVal ?? '').trim();

            // Required check
            if (config.required && !strVal) {
              result.errors.push({
                row: i + 1,
                column: config.labelAr,
                value: '',
                message: 'حقل مطلوب ولا يمكن أن يكون فارغاً',
              });
              rowHasError = true;
              continue;
            }

            // Type validation
            if (strVal) {
              if (config.type === 'number' || config.type === 'currency') {
                const num = Number(strVal);
                if (isNaN(num)) {
                  result.errors.push({
                    row: i + 1,
                    column: config.labelAr,
                    value: strVal,
                    message: 'يجب أن يكون رقماً صحيحاً',
                  });
                  rowHasError = true;
                  continue;
                }
                record[config.key] = num;
              } else if (config.type === 'dropdown' && config.dropdownOptions) {
                const match = config.dropdownOptions.find(o =>
                  o.value === strVal || o.label === strVal
                );
                if (!match) {
                  result.errors.push({
                    row: i + 1,
                    column: config.labelAr,
                    value: strVal,
                    message: `قيمة غير صالحة. القيم المسموحة: ${config.dropdownOptions.map(o => o.label).join('، ')}`,
                  });
                  rowHasError = true;
                  continue;
                }
                record[config.key] = match.value;
              } else {
                record[config.key] = strVal;
              }
            } else {
              record[config.key] = '';
            }
          }

          if (!rowHasError) {
            result.data.push(record);
          }
        }

        if (result.errors.length > 0) {
          result.success = false;
          result.warnings.push(`تم العثور على ${result.errors.length} خطأ في ${new Set(result.errors.map(e => e.row)).size} صف`);
        }

        if (result.data.length === 0 && result.errors.length === 0) {
          result.warnings.push('لا توجد بيانات صالحة للاستيراد');
        }

        resolve(result);
      } catch {
        resolve({ success: false, data: [], errors: [], warnings: ['حدث خطأ أثناء قراءة الملف'] });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ─── Predefined Dropdown Lists ─────────────────────────────────────

export const DROPDOWNS = {
  categories: [
    { label: 'مواد غذائية', value: 'groceries' },
    { label: 'مشروبات', value: 'beverages' },
    { label: 'ألبان وأجبان', value: 'dairy' },
    { label: 'خضار وفواكه', value: 'vegetables' },
    { label: 'لحوم وأسماك', value: 'meat' },
    { label: 'مخبوزات', value: 'bakery' },
    { label: 'حلويات', value: 'sweets' },
    { label: 'منظفات', value: 'cleaning' },
    { label: 'عناية شخصية', value: 'personal_care' },
    { label: 'أخرى', value: 'other' },
  ],
  units: [
    { label: 'قطعة', value: 'piece' },
    { label: 'كيلو', value: 'kg' },
    { label: 'جرام', value: 'gram' },
    { label: 'لتر', value: 'liter' },
    { label: 'ملليلتر', value: 'ml' },
    { label: 'علبة', value: 'can' },
    { label: 'زجاجة', value: 'bottle' },
    { label: 'كرتون', value: 'carton' },
    { label: 'كيس', value: 'bag' },
    { label: 'عبوة', value: 'pack' },
  ],
  status: [
    { label: 'نشط', value: 'active' },
    { label: 'غير نشط', value: 'inactive' },
    { label: 'نفذ من المخزون', value: 'out_of_stock' },
  ],
  paymentMethods: [
    { label: 'نقدي', value: 'cash' },
    { label: 'بطاقة', value: 'card' },
    { label: 'تحويل بنكي', value: 'bank_transfer' },
    { label: 'شيك', value: 'check' },
  ],
};

// ─── Product Export Config ─────────────────────────────────────────

export function getProductExportConfig(products: any[], categories: any[]): ExcelExportConfig {
  return {
    titleAr: 'تقرير المنتجات',
    titleEn: 'Products Report',
    sheetName: 'المنتجات',
    brandColor: '#059669',
    columns: [
      { key: 'barcode', labelAr: 'الباركود', labelEn: 'Barcode', type: 'text', width: 18, required: true, locked: true, comment: 'كود الباركود الفريد' },
      { key: 'nameAr', labelAr: 'الاسم (عربي)', labelEn: 'Name (AR)', type: 'text', width: 25, required: true },
      { key: 'nameEn', labelAr: 'الاسم (إنجليزي)', labelEn: 'Name (EN)', type: 'text', width: 25, required: true },
      { key: 'category', labelAr: 'التصنيف', labelEn: 'Category', type: 'dropdown', width: 18, required: true, dropdownOptions: DROPDOWNS.categories },
      { key: 'unit', labelAr: 'الوحدة', labelEn: 'Unit', type: 'dropdown', width: 12, required: true, dropdownOptions: DROPDOWNS.units },
      { key: 'cost', labelAr: 'سعر التكلفة', labelEn: 'Cost Price', type: 'currency', width: 15, required: true },
      { key: 'price', labelAr: 'سعر البيع', labelEn: 'Sale Price', type: 'currency', width: 15, required: true },
      { key: 'stock', labelAr: 'المخزون', labelEn: 'Stock', type: 'number', width: 12, required: true },
      { key: 'minStock', labelAr: 'الحد الأدنى', labelEn: 'Min Stock', type: 'number', width: 12 },
      { key: 'status', labelAr: 'الحالة', labelEn: 'Status', type: 'dropdown', width: 15, dropdownOptions: DROPDOWNS.status, locked: true },
      { key: 'id', labelAr: 'معرف النظام', labelEn: 'System ID', type: 'readonly', width: 20, locked: true, comment: 'لا يمكن تعديل هذا الحقل' },
    ],
    rows: products.map(p => ({
      barcode: p.barcode || '',
      nameAr: p.nameAr || p.name_ar || '',
      nameEn: p.nameEn || p.name_en || p.name || '',
      category: p.category || '',
      unit: p.unit || '',
      cost: Number(p.cost || 0),
      price: Number(p.price || p.sale_price || p.unit_price || 0),
      stock: Number(p.stock || p.quantity || 0),
      minStock: Number(p.minStock || p.min_stock || 0),
      status: p.active ? 'نشط' : 'غير نشط',
      id: p.id || '',
    })),
  };
}
