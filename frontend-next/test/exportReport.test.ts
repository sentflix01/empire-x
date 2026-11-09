/**
 * Business Analytics CSV: products have Saves (bookmarks), not likes, and
 * revenue is a number even when order totals arrive as decimal strings.
 */
import { describe, expect, it } from 'vitest';
import { buildAnalyticsReport } from '@/lib/exportReport';

describe('buildAnalyticsReport', () => {
  const report = buildAnalyticsReport({
    bizName: 'Test Shop',
    stats: { totalSales: 350, totalOrders: 2, totalViews: 40, totalSaves: 3, totalEngagement: 45 },
    salesData: [{ day: 'Mon', sales: 350, orders: 2 }],
    engagementData: [{ day: 'Mon', engagement: 5, saves: 3, orders: 2 }],
    products: [{ id: 'p1', title: 'Coffee', view_count: 40, price: '100.00', stock: 4, status: 'active' }],
    saves: [{ target_id: 'p1' }, { target_id: 'p1' }, { target_id: 'p2' }],
    orders: [{ product_id: 'p1', product_title: 'Coffee', total_price: '100.00', currency: 'ETB', status: 'paid' }],
    conversionRate: 5,
  });
  const value = (metric: string) => report.find((r) => r.Metric === metric)?.Value;

  it('reports saves, not likes', () => {
    expect(value('Product Saves')).toBe(3);
    expect(value('Mon - Saves')).toBe(3);
    expect(report.some((r) => String(r.Metric).includes('Like') || String(r.Value).includes('Likes'))).toBe(false);
  });

  it('counts saves per product', () => {
    expect(String(value('Coffee'))).toContain('Saves: 2');
  });

  it('keeps revenue as the number it was given', () => {
    expect(value('Total Revenue')).toBe(350);
  });
});
