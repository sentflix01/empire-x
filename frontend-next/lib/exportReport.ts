/** A CSV row: column name → cell value. */
export type ReportRow = Record<string, string | number | null | undefined>;

/**
 * Generate a CSV string from analytics data and trigger a browser download.
 */
export function downloadCSV(filename: string, rows: ReportRow[]): void {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        const str = val === null || val === undefined ? "" : String(val);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type Amount = number | string | null | undefined;

export interface AnalyticsReportInput {
  bizName: string;
  stats: { totalSales: Amount; totalOrders: Amount; totalViews: Amount; totalSaves: Amount; totalEngagement: Amount };
  salesData: Array<{ day: string; sales: Amount; orders: Amount }>;
  engagementData: Array<{ day: string; engagement: Amount; saves: Amount; orders: Amount }>;
  products: Array<{ id?: string; title?: string; view_count?: Amount; price?: Amount; stock?: Amount; status?: string }>;
  /** Saves (bookmarks) of the products. */
  saves: Array<{ target_id?: string }>;
  orders: Array<{
    product_id?: string | null; product_title?: string; buyer_name?: string | null; quantity?: Amount;
    total_price?: Amount; currency?: string; status?: string; created_at?: string;
  }>;
  conversionRate: Amount;
}

/**
 * Build analytics report rows from dashboard data.
 */
export function buildAnalyticsReport({
  bizName, stats, salesData, engagementData, products, saves, orders, conversionRate,
}: AnalyticsReportInput): ReportRow[] {
  const report: ReportRow[] = [];

  // Summary section
  report.push({ Metric: "Business", Value: bizName });
  report.push({ Metric: "Report Date", Value: new Date().toLocaleString() });
  report.push({ Metric: "Total Revenue (paid orders)", Value: stats.totalSales });
  report.push({ Metric: "Total Orders", Value: stats.totalOrders });
  report.push({ Metric: "Product Views", Value: stats.totalViews });
  report.push({ Metric: "Product Saves", Value: stats.totalSaves });
  report.push({ Metric: "Total Engagement", Value: stats.totalEngagement });
  report.push({ Metric: "Conversion Rate (%)", Value: conversionRate });
  report.push({ Metric: "", Value: "" });

  // Sales by day
  report.push({ Metric: "--- Sales (Last 7 Days) ---", Value: "" });
  salesData.forEach((d) => {
    report.push({ Metric: `${d.day} - Revenue`, Value: d.sales });
    report.push({ Metric: `${d.day} - Orders`, Value: d.orders });
  });
  report.push({ Metric: "", Value: "" });

  // Engagement by day
  report.push({ Metric: "--- Engagement (Last 7 Days) ---", Value: "" });
  engagementData.forEach((d) => {
    report.push({ Metric: `${d.day} - Engagement`, Value: d.engagement });
    report.push({ Metric: `${d.day} - Saves`, Value: d.saves });
    report.push({ Metric: `${d.day} - Orders`, Value: d.orders });
  });
  report.push({ Metric: "", Value: "" });

  // Product performance
  report.push({ Metric: "--- Product Performance ---", Value: "" });
  products.forEach((p) => {
    const productSaves = saves.filter((l) => l.target_id === p.id).length;
    const productOrders = orders.filter((o) => o.product_id === p.id).length;
    report.push({
      Metric: p.title,
      Value: `Views: ${p.view_count || 0} | Saves: ${productSaves} | Orders: ${productOrders} | Price: ${p.price || 0} | Stock: ${p.stock || 0} | Status: ${p.status}`,
    });
  });
  report.push({ Metric: "", Value: "" });

  // Recent orders
  if (orders.length > 0) {
    report.push({ Metric: "--- Recent Orders ---", Value: "" });
    orders.slice(0, 10).forEach((o) => {
      report.push({
        Metric: o.product_title,
        Value: `Buyer: ${o.buyer_name || "N/A"} | Qty: ${o.quantity} | Total: ${o.total_price} ${o.currency} | Status: ${o.status} | Date: ${o.created_at ? new Date(o.created_at).toLocaleDateString() : "N/A"}`,
      });
    });
  }

  return report;
}
