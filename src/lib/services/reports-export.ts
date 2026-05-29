'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';

export interface ReportColumn {
  key: string;
  label: string;
  labelAr: string;
  type?: 'text' | 'number' | 'date' | 'currency';
  width?: number;
  dropdown?: string[]; // Data validation options
}

export interface ReportData {
  title: string;
  titleAr: string;
  subtitle?: string;
  subtitleAr?: string;
  columns: ReportColumn[];
  rows: Record<string, any>[];
  totals?: Record<string, number>;
  chartData?: any[];
  chartType?: 'bar' | 'line' | 'pie' | 'area';
}

function triggerDownload(blob: Blob, filename: string) {
  saveAs(blob, filename);
}

export function exportToJson(data: any, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, `${filename}.json`);
}

export async function exportToExcel(report: ReportData, filename: string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('التقرير', { views: [{ rightToLeft: true }] });

  // Add Title
  worksheet.mergeCells('A1', `${String.fromCharCode(64 + report.columns.length)}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = report.titleAr;
  titleCell.font = { name: 'Cairo', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 40;

  // Add Subtitle
  let currentRow = 2;
  if (report.subtitleAr) {
    worksheet.mergeCells(`A2:${String.fromCharCode(64 + report.columns.length)}2`);
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = report.subtitleAr;
    subtitleCell.font = { name: 'Cairo', size: 11, color: { argb: 'FF6B7280' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 25;
    currentRow = 3;
  }

  // Blank Row
  currentRow++;

  // Add Headers
  const headerRow = worksheet.getRow(currentRow);
  report.columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.labelAr;
    cell.font = { name: 'Cairo', bold: true, color: { argb: 'FF374151' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'medium', color: { argb: 'FF10B981' } },
    };
    worksheet.getColumn(index + 1).width = col.width || 20;
  });
  headerRow.height = 30;
  currentRow++;

  // Add Data Rows with Formatting
  report.rows.forEach((rowData, index) => {
    const row = worksheet.getRow(currentRow);
    report.columns.forEach((col, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      const val = rowData[col.key];

      if (col.type === 'number' || col.type === 'currency') {
        cell.value = Number(val) || 0;
        cell.numFmt = col.type === 'currency' ? '#,##0.00 "ج.م"' : '#,##0';
        cell.alignment = { horizontal: 'center' };
      } else if (col.type === 'date') {
        cell.value = val ? new Date(val).toLocaleDateString('ar-EG') : '—';
        cell.alignment = { horizontal: 'center' };
      } else {
        cell.value = val ?? '—';
        cell.alignment = { horizontal: 'right' };
      }

      // Dropdown (Data Validation)
      if (col.dropdown && col.dropdown.length > 0) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${col.dropdown.join(',')}"`],
          showErrorMessage: true,
          errorTitle: 'قيمة غير صالحة',
          error: 'يرجى اختيار قيمة من القائمة المنسدلة',
        };
      }

      // Conditional Formatting (Coloring rows based on values)
      if ((col.type === 'number' || col.type === 'currency') && cell.value < 0) {
        cell.font = { color: { argb: 'FFEF4444' } }; // Red for negative
      }

      cell.border = { bottom: { style: 'hair', color: { argb: 'FFF3F4F6' } } };
    });
    currentRow++;
  });

  // Add Totals
  if (report.totals) {
    const totalsRow = worksheet.getRow(currentRow);
    report.columns.forEach((col, colIndex) => {
      const cell = totalsRow.getCell(colIndex + 1);
      const val = report.totals![col.key];
      
      if (val !== undefined) {
        cell.value = val;
        cell.numFmt = col.type === 'currency' ? '#,##0.00 "ج.م"' : '#,##0';
        cell.alignment = { horizontal: 'center' };
      } else if (colIndex === 0) {
        cell.value = 'الإجمالي الكلي';
        cell.alignment = { horizontal: 'right' };
      }
      
      cell.font = { name: 'Cairo', bold: true, size: 12, color: { argb: 'FF111827' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      cell.border = { top: { style: 'medium', color: { argb: 'FFD1D5DB' } } };
    });
    totalsRow.height = 35;
  }

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(new Blob([buffer]), `${filename}.xlsx`);
}

export async function exportToPdf(
  _chartElementId: string,
  report: ReportData,
  filename: string
) {
  const container = document.createElement('div');
  // Visible off-screen instead of hidden so that browsers actually render it
  container.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:794px;background:#fff;font-family:"Cairo",Tahoma,sans-serif;direction:rtl;';
  document.body.appendChild(container);

  const totalsEntries = report.totals ? Object.entries(report.totals) : [];
  
  container.innerHTML = `
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap" rel="stylesheet">
    <div style="padding:0; box-sizing: border-box; display: flex; flex-direction: column; min-height: 1122px; position: relative; font-family: 'Cairo', sans-serif;">
      
      <!-- HEADER -->
      <div style="background: linear-gradient(135deg, #0A0A0C 0%, #111114 100%); padding: 30px 40px; display: flex; justify-content: space-between; align-items: center; color: white; border-bottom: 4px solid #10B981;">
        <div style="text-align: right;">
          <h1 style="font-size: 28px; font-weight: 900; margin: 0 0 6px 0; font-family: 'Cairo', sans-serif;">${report.titleAr}</h1>
          ${report.subtitleAr ? `<p style="font-size: 13px; opacity: 0.8; margin: 0;">${report.subtitleAr}</p>` : ''}
        </div>
        <div style="text-align: left; display: flex; flex-direction: column; align-items: flex-start;">
          <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span style="font-size: 14px; font-weight: 900; letter-spacing: 1px;">SAPKEY OS</span>
          <span style="font-size: 9px; opacity: 0.6; margin-top: 2px;">${new Date().toLocaleString('ar-EG')}</span>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div style="padding: 30px 40px; flex: 1; background: #FFFFFF;">
        
        <!-- Totals Cards -->
        ${totalsEntries.length > 0 ? `
          <div style="display: grid; grid-template-columns: repeat(${Math.min(totalsEntries.length, 4)}, 1fr); gap: 16px; margin-bottom: 30px;">
            ${totalsEntries.map(([key, val]) => {
              const col = report.columns.find((c) => c.key === key);
              return `
                <div style="background: #FAFAFA; border: 1px solid #E5E7EB; border-radius: 16px; padding: 20px; text-align: right;">
                  <div style="font-size: 11px; color: #6B7280; font-weight: 600; margin-bottom: 6px;">${col?.labelAr || key}</div>
                  <div style="font-size: 20px; font-weight: 900; color: #111827;">${formatCurrency(val as number)}</div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <!-- Data Table -->
        <div style="border-radius: 12px; overflow: hidden; border: 1px solid #E5E7EB;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;" dir="rtl">
            <thead>
              <tr style="background: #F9FAFB; border-bottom: 2px solid #D1D5DB;">
                ${report.columns.map(col => `
                  <th style="padding: 14px 16px; text-align: ${col.type === 'number' || col.type === 'currency' ? 'center' : 'right'}; font-weight: 800; color: #374151; text-transform: uppercase;">
                    ${col.labelAr}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${report.rows.map((row, i) => `
                <tr style="background: ${i % 2 === 0 ? '#FFFFFF' : '#F9FAFB'}; border-bottom: 1px solid #F3F4F6;">
                  ${report.columns.map(col => {
                    const val = formatCellValue(row[col.key], col);
                    const isNum = col.type === 'number' || col.type === 'currency';
                    return `
                      <td style="padding: 12px 16px; text-align: ${isNum ? 'center' : 'right'}; color: #4B5563; ${isNum ? 'font-weight: 600; font-variant-numeric: tabular-nums;' : ''}">
                        ${val}
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
            ${report.totals ? `
              <tfoot>
                <tr style="background: #F3F4F6; border-top: 2px solid #D1D5DB;">
                  ${report.columns.map((col, j) => {
                    const val = report.totals![col.key] !== undefined ? formatCurrency(report.totals![col.key] as number) : (j === 0 ? 'الإجمالي الكلي' : '');
                    return `
                      <td style="padding: 16px; text-align: ${col.type === 'number' || col.type === 'currency' ? 'center' : 'right'}; font-weight: 900; color: #111827;">
                        ${val}
                      </td>
                    `;
                  }).join('')}
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="margin-top: auto; padding: 20px 40px; border-top: 1px solid #E5E7EB; background: #FAFAFA; display: flex; justify-content: space-between; align-items: center; color: #9CA3AF; font-size: 10px;">
        <div>تم الإنشاء بواسطة نظام SAPKEY - جميع الحقوق محفوظة © ${new Date().getFullYear()}</div>
        <div style="font-weight: 600;">تقرير رسمي معتمد</div>
      </div>
    </div>
  `;

  try {
    await document.fonts.ready;
    
    const opt = {
      margin:       0,
      filename:     `${filename}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Use html2pdf instead of custom jsPDF canvas slicing
    await html2pdf().set(opt).from(container).save();

  } catch (err) {
    console.error('PDF generation failed:', err);
    throw new Error('فشل في إنشاء PDF، يرجى المحاولة مرة أخرى');
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

function formatCellValue(val: any, col?: ReportColumn): string {
  if (val === null || val === undefined) return '—';
  if (col?.type === 'date') return new Date(val).toLocaleDateString('ar-EG');
  if (col?.type === 'currency') return formatCurrency(Number(val));
  if (col?.type === 'number') return Number(val).toLocaleString('ar-EG');
  return String(val);
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
  }).format(val).replace('ج.م.‏', 'ج.م');
}

export function exportBackupAsJson(backupData: any) {
  const date = new Date().toISOString().split('T')[0];
  exportToJson(backupData, `sapkey-backup-${date}`);
}

export function exportBackupAsExcel(backupData: any) {
  const date = new Date().toISOString().split('T')[0];
  if (backupData.subscriptions?.length) {
    const subReport: ReportData = {
      title: 'Subscriptions Backup',
      titleAr: 'النسخ الاحتياطي - الاشتراكات',
      columns: [
        { key: 'tenantId', label: 'Tenant', labelAr: 'المستأجر', width: 25 },
        { key: 'planId', label: 'Plan', labelAr: 'الباقة', width: 18 },
        { key: 'status', label: 'Status', labelAr: 'الحالة', width: 12 },
        { key: 'startDate', label: 'Start', labelAr: 'تاريخ البداية', type: 'date', width: 15 },
        { key: 'endDate', label: 'End', labelAr: 'تاريخ الانتهاء', type: 'date', width: 15 },
      ],
      rows: backupData.subscriptions.map((s: any) => ({
        tenantId: s.tenantId,
        planId: s.planId || s.name || s.id,
        status: s.status || 'active',
        startDate: s.startDate || s.created_at,
        endDate: s.endDate,
      })),
    };
    exportToExcel(subReport, `sapkey-subscriptions-${date}`);
  }
  if (backupData.users?.length) {
    const userReport: ReportData = {
      title: 'Users Backup',
      titleAr: 'النسخ الاحتياطي - المستخدمين',
      columns: [
        { key: 'email', label: 'Email', labelAr: 'البريد', width: 30 },
        { key: 'full_name_ar', label: 'Name', labelAr: 'الاسم', width: 25 },
        { key: 'phone', label: 'Phone', labelAr: 'الهاتف', width: 18 },
        { key: 'role', label: 'Role', labelAr: 'الدور', width: 12 },
        { key: 'is_active', label: 'Active', labelAr: 'نشط', width: 10 },
      ],
      rows: backupData.users.map((u: any) => u),
    };
    exportToExcel(userReport, `sapkey-users-${date}`);
  }
  if (backupData.auditLogs?.length) {
    const logReport: ReportData = {
      title: 'Audit Logs Backup',
      titleAr: 'النسخ الاحتياطي - سجل المراجعة',
      columns: [
        { key: 'entity_type', label: 'Type', labelAr: 'النوع', width: 15 },
        { key: 'entity_id', label: 'Entity', labelAr: 'الكيان', width: 20 },
        { key: 'action', label: 'Action', labelAr: 'الإجراء', width: 15 },
        { key: 'created_at', label: 'Date', labelAr: 'التاريخ', type: 'date', width: 20 },
      ],
      rows: backupData.auditLogs.map((l: any) => l),
    };
    exportToExcel(logReport, `sapkey-audit-logs-${date}`);
  }
}

