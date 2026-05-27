'use client';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface ReportColumn {
  key: string;
  label: string;
  labelAr: string;
  type?: 'text' | 'number' | 'date' | 'currency';
  width?: number;
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToJson(data: any, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, `${filename}.json`);
}

export function exportToExcel(report: ReportData, filename: string) {
  const wb = XLSX.utils.book_new();
  const headerRow = report.columns.map((c) => c.labelAr);
  const dataRows = report.rows.map((row) =>
    report.columns.map((col) => formatCellValue(row[col.key], col))
  );
  const wsData: any[][] = [[report.titleAr]];
  if (report.subtitleAr) wsData.push([report.subtitleAr]);
  wsData.push([]);
  wsData.push(headerRow);
  dataRows.forEach((r) => wsData.push(r));
  if (report.totals) {
    const totalsRow = report.columns.map((col) => {
      const val = report.totals![col.key];
      return val !== undefined ? String(val) : (col.key === '' ? 'الإجمالي' : '');
    });
    wsData.push(totalsRow);
  }
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = report.columns.map((c) => ({ wch: c.width || 20 }));
  const merges: XLSX.Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: report.columns.length - 1 } }];
  if (report.subtitleAr) merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: report.columns.length - 1 } });
  ws['!merges'] = merges;
  XLSX.utils.book_append_sheet(wb, ws, 'تقرير');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPdf(
  _chartElementId: string,
  report: ReportData,
  filename: string
) {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;top:0;left:0;width:794px;background:#fff;font-family:Arial,Tahoma,sans-serif;direction:rtl;z-index:-1;visibility:hidden;pointer-events:none;';
  document.body.appendChild(container);

  const totalsEntries = report.totals ? Object.entries(report.totals) : [];
  
  // Apple/Binance style professional CSS
  container.innerHTML = `
    <div style="padding:0; box-sizing: border-box; display: flex; flex-direction: column; min-height: 1122px; position: relative;">
      
      <!-- HEADER -->
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 30px 40px; display: flex; justify-content: space-between; align-items: center; color: white; border-bottom: 4px solid #3B82F6;">
        <div style="text-align: right;">
          <h1 style="font-size: 28px; font-weight: 900; margin: 0 0 6px 0; font-family: Tahoma, sans-serif;">${report.titleAr}</h1>
          ${report.subtitleAr ? `<p style="font-size: 13px; opacity: 0.8; margin: 0;">${report.subtitleAr}</p>` : ''}
        </div>
        <div style="text-align: left; display: flex; flex-direction: column; align-items: flex-start;">
          <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: white;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span style="font-size: 14px; font-weight: 900; letter-spacing: 1px;">SAPKEY OS</span>
          <span style="font-size: 9px; opacity: 0.6; margin-top: 2px;">${new Date().toLocaleString('ar-EG')}</span>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div style="padding: 30px 40px; flex: 1;">
        
        <!-- Totals Cards -->
        ${totalsEntries.length > 0 ? `
          <div style="display: grid; grid-template-columns: repeat(${Math.min(totalsEntries.length, 4)}, 1fr); gap: 16px; margin-bottom: 30px;">
            ${totalsEntries.map(([key, val]) => {
              const col = report.columns.find((c) => c.key === key);
              return `
                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px; text-align: right;">
                  <div style="font-size: 11px; color: #64748B; font-weight: 600; margin-bottom: 6px;">${col?.labelAr || key}</div>
                  <div style="font-size: 20px; font-weight: 900; color: #0F172A;">${formatCurrency(val)}</div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <!-- Data Table -->
        <div style="border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;" dir="rtl">
            <thead>
              <tr style="background: #F1F5F9; border-bottom: 2px solid #CBD5E1;">
                ${report.columns.map(col => `
                  <th style="padding: 14px 16px; text-align: ${col.type === 'number' || col.type === 'currency' ? 'center' : 'right'}; font-weight: 800; color: #334155; text-transform: uppercase;">
                    ${col.labelAr}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${report.rows.map((row, i) => `
                <tr style="background: ${i % 2 === 0 ? '#FFFFFF' : '#FAFAF9'}; border-bottom: 1px solid #F1F5F9;">
                  ${report.columns.map(col => {
                    const val = formatCellValue(row[col.key], col);
                    const isNum = col.type === 'number' || col.type === 'currency';
                    return `
                      <td style="padding: 12px 16px; text-align: ${isNum ? 'center' : 'right'}; color: #475569; ${isNum ? 'font-weight: 600; font-variant-numeric: tabular-nums;' : ''}">
                        ${val}
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
            ${report.totals ? `
              <tfoot>
                <tr style="background: #F8FAFC; border-top: 2px solid #CBD5E1;">
                  ${report.columns.map((col, j) => {
                    const val = report.totals![col.key] !== undefined ? formatCurrency(report.totals![col.key]) : (j === 0 ? 'الإجمالي الكلي' : '');
                    return `
                      <td style="padding: 16px; text-align: ${col.type === 'number' || col.type === 'currency' ? 'center' : 'right'}; font-weight: 900; color: #0F172A;">
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
      <div style="margin-top: auto; padding: 20px 40px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; color: #94A3B8; font-size: 10px;">
        <div>تم الإنشاء بواسطة نظام SAPKEY - جميع الحقوق محفوظة © ${new Date().getFullYear()}</div>
        <div style="font-weight: 600;">تقرير رسمي معتمد</div>
      </div>
    </div>
  `;

  try {
    await new Promise((r) => setTimeout(r, 500));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: container.scrollWidth,
      height: container.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = pdfWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;

    let heightLeft = scaledHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(`${filename}.pdf`);
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
