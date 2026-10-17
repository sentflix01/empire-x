/**
 * PDF receipt for a paid ETB plan payment, in the same style as the order invoice.
 */
import { jsPDF } from 'jspdf';
import { loadLogo } from './generateInvoice';
import { describePayment, formatBirr, formatDate, type SubscriptionReceipt } from './etbBilling';

export async function generateSubscriptionReceipt(r: SubscriptionReceipt): Promise<void> {
  const logo = await loadLogo();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 20;
  const brand: [number, number, number] = [37, 99, 235];
  const dark: [number, number, number] = [30, 30, 30];
  const gray: [number, number, number] = [100, 100, 100];

  doc.setFillColor(...brand);
  doc.rect(0, 0, W, 38, 'F');
  const textX = logo ? margin + 22 : margin;
  if (logo) doc.addImage(logo, 'PNG', margin, 8, 18, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Nodbusiness', textX, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Plan payment receipt', textX, 24);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIPT', W - margin, 16, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(r.receipt_number, W - margin, 24, { align: 'right' });

  const rows: Array<[string, string]> = [
    ['Business', r.business_name],
    ['Plan', describePayment(r)],
    ['Active from', formatDate(r.period_start)],
    ['Active until', formatDate(r.period_end)],
    ['Paid on', formatDate(r.paid_at)],
    ['Paid with', r.provider === 'chapa' ? 'Chapa (telebirr, bank or card)' : r.provider],
    ['Payment reference', r.provider_ref],
  ];
  let y = 54;
  doc.setTextColor(...dark);
  doc.setFontSize(11);
  for (const [label, value] of rows) {
    doc.setTextColor(...gray);
    doc.text(label, margin, y);
    doc.setTextColor(...dark);
    doc.text(String(value), W - margin, y, { align: 'right' });
    y += 9;
  }
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, W - margin, y);
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Total paid', margin, y);
  doc.text(formatBirr(r.amount), W - margin, y, { align: 'right' });
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text('Prepaid plan: there are no automatic charges. Renew before the end date to keep your website published.', margin, y);
  doc.text('Questions: support@nodbusiness.app', margin, y + 6);

  doc.save(`nodbusiness-receipt-${r.receipt_number}.pdf`);
}
