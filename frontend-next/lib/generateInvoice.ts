/**
 * generateInvoice — generates a PDF invoice for a completed order using jsPDF.
 * jspdf is already installed in the project.
 */
import { jsPDF } from "jspdf";

interface Order {
  id: string;
  product_title?: string;
  quantity?: number;
  total_price?: number;
  currency?: string;
  status?: string;
  buyer_name?: string;
  buyer_email?: string;
  seller_id?: string;
  delivery_address?: string;
  created_at?: string;
  [key: string]: unknown;
}

/** Loads the brand emblem as a data URL for the PDF header; null if it can't be fetched. */
export async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch("/icons/icon-192.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateInvoice(order: Order): Promise<void> {
  const logo = await loadLogo();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210; // A4 width
  const margin = 20;
  const contentWidth = W - margin * 2;

  // ── Colours ──────────────────────────────────────────────────────────────
  const brand  = [37,  99, 235]  as [number, number, number];
  const dark   = [30,  30,  30]  as [number, number, number];
  const gray   = [100, 100, 100] as [number, number, number];
  const light  = [245, 245, 245] as [number, number, number];
  const white  = [255, 255, 255] as [number, number, number];

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(...brand);
  doc.rect(0, 0, W, 38, "F");

  // Brand emblem, with the text beside it.
  const textX = logo ? margin + 22 : margin;
  if (logo) doc.addImage(logo, "PNG", margin, 8, 18, 18);

  doc.setTextColor(...white);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Nodbusiness", textX, 16);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Global Superapp — Social · Commerce · Services", textX, 24);
  doc.text("www.nodbusiness.app  |  support@nodbusiness.app", textX, 30);

  // Invoice label (right side of header)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", W - margin, 16, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`#${order.id?.slice(0, 8).toUpperCase() ?? "N/A"}`, W - margin, 24, { align: "right" });
  doc.text(`Date: ${order.created_at ? new Date(order.created_at).toLocaleDateString("en-GB") : "—"}`, W - margin, 30, { align: "right" });

  let y = 50;

  // ── Bill To ───────────────────────────────────────────────────────────────
  doc.setTextColor(...dark);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(order.buyer_name || "Customer", margin, y); y += 5;
  if (order.buyer_email) { doc.text(order.buyer_email, margin, y); y += 5; }
  if (order.delivery_address) { doc.text(order.delivery_address, margin, y); y += 5; }

  // Status badge (right side)
  const statusColors: Record<string, [number, number, number]> = {
    completed:  [22, 163, 74],
    paid:       [22, 163, 74],
    processing: [59, 130, 246],
    pending:    [234, 179, 8],
    cancelled:  [239, 68, 68],
  };
  const statusColor = statusColors[order.status ?? "pending"] ?? gray;
  doc.setFillColor(...statusColor);
  doc.roundedRect(W - margin - 40, 48, 40, 10, 2, 2, "F");
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text((order.status ?? "pending").toUpperCase(), W - margin - 20, 54.5, { align: "center" });

  y = Math.max(y, 68);

  // ── Divider ───────────────────────────────────────────────────────────────
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 8;

  // ── Table header ──────────────────────────────────────────────────────────
  doc.setFillColor(...light);
  doc.rect(margin, y, contentWidth, 9, "F");
  doc.setTextColor(...dark);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  const col1 = margin + 2;
  const col2 = margin + contentWidth * 0.55;
  const col3 = margin + contentWidth * 0.72;
  const col4 = W - margin - 2;

  doc.text("Description", col1, y + 6);
  doc.text("Qty", col2, y + 6);
  doc.text("Unit Price", col3, y + 6);
  doc.text("Total", col4, y + 6, { align: "right" });
  y += 14;

  // ── Table row ─────────────────────────────────────────────────────────────
  const qty = order.quantity ?? 1;
  const total = order.total_price ?? 0;
  const unitPrice = qty > 0 ? total / qty : total;
  const currency = order.currency ?? "ETB";

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  doc.text(order.product_title ?? "Product", col1, y);
  doc.text(String(qty), col2, y);
  doc.text(`${unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`, col3, y);
  doc.text(`${total.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`, col4, y, { align: "right" });
  y += 5;

  // Row separator
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, y, W - margin, y);
  y += 10;

  // ── Totals block ──────────────────────────────────────────────────────────
  const totalX = W - margin - 70;
  const totalWidth = 70;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.setFontSize(9);
  doc.text("Subtotal:", totalX, y);
  doc.setTextColor(...dark);
  doc.text(`${total.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`, W - margin, y, { align: "right" });
  y += 5;

  doc.setTextColor(...gray);
  doc.text("VAT (0%):", totalX, y);
  doc.setTextColor(...dark);
  doc.text(`0.00 ${currency}`, W - margin, y, { align: "right" });
  y += 5;

  // Total line
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.5);
  doc.line(totalX, y, W - margin, y);
  y += 5;

  doc.setFillColor(...brand);
  doc.rect(totalX - 2, y - 2, totalWidth + 2, 11, "F");
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", totalX + 2, y + 6);
  doc.text(`${total.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`, W - margin - 2, y + 6, { align: "right" });
  y += 20;

  // ── Order details ─────────────────────────────────────────────────────────
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ORDER DETAILS", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(`Order ID: ${order.id ?? "—"}`, margin, y); y += 5;
  doc.text(`Product: ${order.product_title ?? "—"}`, margin, y); y += 5;
  doc.text(`Quantity: ${order.quantity ?? 1}`, margin, y); y += 5;
  doc.text(`Payment Status: ${(order.status ?? "—").toUpperCase()}`, margin, y); y += 5;
  if (order.delivery_address) {
    doc.text(`Delivery: ${order.delivery_address}`, margin, y);
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  y = 270;
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.3);
  doc.line(margin, y, W - margin, y);
  y += 5;
  doc.setTextColor(...gray);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for using Nodbusiness — The Global Superapp for Social, Commerce & Services.", margin, y);
  doc.text("For support: support@nodbusiness.app", margin, y + 5);
  doc.text(`Invoice generated: ${new Date().toLocaleString("en-GB")}`, W - margin, y, { align: "right" });

  // ── Save ─────────────────────────────────────────────────────────────────
  const filename = `invoice_${order.id?.slice(0, 8) ?? "order"}_${Date.now()}.pdf`;
  doc.save(filename);
}
