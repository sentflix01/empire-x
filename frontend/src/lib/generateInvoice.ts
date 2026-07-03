// @ts-nocheck
import { jsPDF } from "jspdf";

/**
 * Generates and downloads a professional PDF invoice for an order.
 * @param {Object} order - The order object from the database
 */
export function generateInvoice(order) {
  const doc = new jsPDF();
  const dark = "#1a1a1a";
  const gray = "#6b7280";
  const lightGray = "#f3f4f6";

  // ── Header Band ──────────────────────────────────────────────────────────────
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, 210, 35, "F");
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 32, 210, 4, "F");

  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("EMPIRE X", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#cccccc");
  doc.text("Official Purchase Invoice", 14, 25);

  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const invNum = `INV-${String(order.id || "").slice(0, 8).toUpperCase()}`;
  doc.text(invNum, 196, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#cccccc");
  const dateStr = new Date(order.created_at || Date.now()).toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric"
  });
  doc.text(dateStr, 196, 22, { align: "right" });

  // ── Bill To / Seller ─────────────────────────────────────────────────────────
  let y = 50;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(gray);
  doc.text("BILL TO", 14, y);
  doc.text("FROM (SELLER)", 110, y);

  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(dark);
  doc.text(order.buyer_name || "Customer", 14, y);
  doc.text(order.seller_name || "Seller", 110, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(gray);
  if (order.buyer_phone) { doc.text(`Phone: ${order.buyer_phone}`, 14, y); }
  if (order.buyer_email) { y += 5; doc.text(`Email: ${order.buyer_email}`, 14, y); }
  if (order.delivery_address) { y += 5; doc.text(`Address: ${order.delivery_address}`, 14, y); }
  y += 16;

  // ── Table ────────────────────────────────────────────────────────────────────
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.4);
  doc.line(14, y, 196, y);
  y += 10;

  doc.setFillColor(26, 26, 26);
  doc.rect(14, y, 182, 10, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("ITEM / DESCRIPTION", 20, y + 6.5);
  doc.text("QTY", 130, y + 6.5, { align: "center" });
  doc.text("UNIT PRICE", 158, y + 6.5, { align: "center" });
  doc.text("TOTAL", 192, y + 6.5, { align: "right" });
  y += 14;

  doc.setFillColor(248, 248, 248);
  doc.rect(14, y - 2, 182, 14, "F");
  doc.setTextColor(dark);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(order.product_title || "Product", 20, y + 6);
  doc.text(String(order.quantity || 1), 130, y + 6, { align: "center" });
  doc.text(`${(order.unit_price || 0).toLocaleString()} ${order.currency || "ETB"}`, 158, y + 6, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(`${(order.total_price || 0).toLocaleString()} ${order.currency || "ETB"}`, 192, y + 6, { align: "right" });
  y += 20;

  // ── Total ─────────────────────────────────────────────────────────────────────
  doc.setDrawColor(230, 230, 230);
  doc.line(14, y, 196, y);
  y += 10;

  doc.setFillColor(212, 175, 55);
  doc.rect(110, y - 4, 86, 16, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL AMOUNT:", 118, y + 4);
  doc.setFontSize(11);
  doc.text(`${(order.total_price || 0).toLocaleString()} ${order.currency || "ETB"}`, 192, y + 4, { align: "right" });
  y += 24;

  // ── Status ────────────────────────────────────────────────────────────────────
  doc.setFillColor(248, 248, 248);
  doc.rect(14, y, 182, 14, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(gray);
  doc.text("Order Status:", 20, y + 6);
  const statusColors = { completed: [22, 163, 74], pending: [217, 119, 6], cancelled: [220, 38, 38], paid: [37, 99, 235] };
  const sc = statusColors[order.status] || [107, 114, 128];
  doc.setTextColor(sc[0], sc[1], sc[2]);
  doc.setFont("helvetica", "bold");
  doc.text((order.status || "pending").toUpperCase(), 60, y + 6);
  if (order.notes) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(gray);
    doc.text(`Notes: ${order.notes}`, 14, y + 20);
    y += 10;
  }
  y += 22;

  // ── Footer ────────────────────────────────────────────────────────────────────
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 272, 210, 25, "F");
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 272, 210, 2, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("EMPIRE X", 105, 281, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor("#aaaaaa");
  doc.text("Thank you for shopping on Empire X  |  support@empirex.com", 105, 289, { align: "center" });

  doc.save(`EmpireX_Invoice_${String(order.id || "order").slice(0, 8).toUpperCase()}.pdf`);
}

