'use client';
/**
 * Quick scan mode, like a till: the camera stays open, every scan adds a row
 * (+1 when scanned again). Products you already sell get stock added; new
 * ones need a price. The list stays on this device until "Save all".
 */
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import SafeImage from '@/components/ui/SafeImage';
import BarcodeScanner from '@/components/products/BarcodeScanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/AuthContext';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import { importPhoto, lookupCode, productCategory, saveScanBatch, SOURCE_LABEL, type BatchItem, type LookupSource } from '@/lib/productScan';

export interface ScanRow {
  key: string;
  gtin: string;
  state: 'looking' | 'mine' | 'new';
  qty: number;
  productId?: string;
  title: string;
  price: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  unit?: string | null;
  image?: string | null;
  source?: LookupSource;
  currentStock?: number;
  error?: string;
}

function ProductQuickScan() {
  const { user } = useAuth();
  const storageKey = `nb_quick_scan:${user?.id ?? 'guest'}`;
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [saving, setSaving] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]'); if (Array.isArray(saved)) setRows(saved.filter((r: ScanRow) => r.state !== 'looking')); } catch { /* fresh list */ }
    loaded.current = true;
  }, [storageKey]);
  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(storageKey, JSON.stringify(rows)); } catch { /* storage full or blocked */ }
  }, [rows, storageKey]);

  const patch = (key: string, change: Partial<ScanRow>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...change, error: change.error } : r)));

  const onCode = async (code: string) => {
    const pending = `looking:${code}:${Date.now()}`;
    setRows((list) => [{ key: pending, gtin: '', state: 'looking', qty: 1, title: code, price: '' }, ...list]);
    const dropPending = (list: ScanRow[]) => list.filter((r) => r.key !== pending);
    let result;
    try { result = await lookupCode(code); }
    catch (err) { setRows(dropPending); toast.error(apiErrorMessage(err, 'Could not look up this barcode.')); return; }
    if (result.kind === 'text') { setRows(dropPending); toast.info(result.message); return; }
    const found = result;
    let isRepeat = false;
    setRows((current) => {
      const list = dropPending(current);
      const existing = list.find((r) => r.gtin === found.gtin);
      if (existing) { isRepeat = true; return list.map((r) => (r.gtin === found.gtin ? { ...r, qty: r.qty + 1 } : r)); }
      const sug = found.suggestion;
      const row: ScanRow = found.source === 'mine' && found.existing_product
        ? { key: found.gtin, gtin: found.gtin, state: 'mine', qty: 1, productId: found.existing_product.id, title: found.existing_product.title, price: String(found.existing_product.price), currentStock: found.existing_product.stock, source: 'mine' }
        : { key: found.gtin, gtin: found.gtin, state: 'new', qty: 1, title: sug?.title ?? '', price: '', description: sug?.description, category: productCategory(sug?.category, found.source) || null, brand: sug?.brand, unit: sug?.unit, image: sug?.image_url, source: found.source };
      return [row, ...list];
    });
    if (isRepeat) toast.success('+1');
  };

  const lookingUp = rows.filter((r) => r.state === 'looking').length;
  const missingPrice = rows.filter((r) => r.state === 'new' && !(Number(r.price) > 0));
  const missingName = rows.filter((r) => r.state === 'new' && !r.title.trim());

  const saveAll = async () => {
    if (!rows.length || lookingUp || missingPrice.length || missingName.length) return;
    setSaving(true);
    try {
      const items: BatchItem[] = [];
      let photosMissed = 0;
      for (const r of rows) {
        if (r.state === 'looking') continue;
        if (r.state === 'mine' && r.productId) { items.push({ product_id: r.productId, add_stock: r.qty }); continue; }
        let image = r.image ?? null;
        if (image) { try { image = await importPhoto(image); } catch { image = null; photosMissed += 1; } }
        items.push({ title: r.title.trim(), price: Number(r.price), stock: r.qty, barcode: r.gtin, description: r.description ?? null, category: r.category ?? null, manufacturer: r.brand ?? null, unit: r.unit ?? null, images: image ? [image] : [] });
      }
      const done = await saveScanBatch(items);
      toast.success(`Saved: ${done.created.length} new product${done.created.length === 1 ? '' : 's'}, ${done.updated.length} stock update${done.updated.length === 1 ? '' : 's'}.`);
      if (photosMissed) toast.info(`${photosMissed} photo${photosMissed === 1 ? '' : 's'} couldn't be copied. Add your own from the product page.`);
      setRows([]);
    } catch (err) {
      const body = err as { index?: number; message?: string };
      if (typeof body?.index === 'number' && rows[body.index]) patch(rows[body.index].key, { error: body.message });
      toast.error(apiErrorMessage(err, 'Could not save the list. Nothing was saved.'));
    } finally { setSaving(false); }
  };

  return (
    <div data-page-guide="scan-viewfinder" className="mx-auto max-w-lg space-y-4 pb-40 md:pb-24">
      <Link href="/products/create" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold">Scan many products</h1>
        <p className="text-sm text-muted-foreground">Scan item after item. Products you already sell get +1 stock; new ones just need a price.</p>
      </div>
      <BarcodeScanner continuous onCode={(c) => { void onCode(c); }} />

      <section aria-label="Scanned products" className="space-y-2">
        <h2 className="text-sm font-semibold">Scanned ({rows.length})</h2>
        {rows.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Nothing scanned yet.</p>}
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key} className={`rounded-2xl border bg-card p-3 ${r.error ? 'border-red-400' : 'border-border/60'}`}>
              <div className="flex gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {r.image ? <SafeImage fill={false} width={56} height={56} src={r.image} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  {r.state === 'looking' ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Looking up <span className="font-mono">{r.title}</span>…
                    </p>
                  ) : r.state === 'mine' ? (
                    <>
                      <p className="truncate text-sm font-semibold">{r.title}</p>
                      <p className="text-xs text-muted-foreground">You sell this · in stock {r.currentStock} → {(r.currentStock ?? 0) + r.qty}</p>
                    </>
                  ) : (
                    <>
                      <input value={r.title} onChange={(e) => patch(r.key, { title: e.target.value })} placeholder="Product name" aria-label={`Name for ${r.gtin}`}
                        className="min-h-9 w-full rounded-lg border border-border bg-background px-2 text-sm font-semibold" />
                      <div className="flex items-center gap-2">
                        <input value={r.price} onChange={(e) => patch(r.key, { price: e.target.value.replace(/[^\d.]/g, '') })} inputMode="decimal" placeholder="Add price"
                          aria-label={`Price for ${r.title || r.gtin}`}
                          className={`min-h-9 w-28 rounded-lg border bg-background px-2 text-sm ${Number(r.price) > 0 ? 'border-border' : 'border-amber-400'}`} />
                        <span className="text-xs text-muted-foreground">ETB</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{r.source && r.source !== 'not_found' ? `From ${SOURCE_LABEL[r.source]}` : 'New to NodBusiness: type its name once'}</p>
                    </>
                  )}
                  {r.error && <p role="alert" className="text-xs text-destructive">{r.error}</p>}
                </div>
                {r.state !== 'looking' && <div className="flex shrink-0 flex-col items-end justify-between">
                  <button type="button" onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))} aria-label={`Remove ${r.title || r.gtin}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => patch(r.key, { qty: Math.max(1, r.qty - 1) })} aria-label={`One fewer ${r.title || r.gtin}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border"><Minus className="h-3.5 w-3.5" aria-hidden="true" /></button>
                    <span className="w-6 text-center text-sm font-semibold" aria-label={`Quantity ${r.qty}`}>{r.qty}</span>
                    <button type="button" onClick={() => patch(r.key, { qty: r.qty + 1 })} aria-label={`One more ${r.title || r.gtin}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border"><Plus className="h-3.5 w-3.5" aria-hidden="true" /></button>
                  </div>
                </div>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {rows.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-card/95 p-3 backdrop-blur md:bottom-0">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <p className="flex-1 text-xs text-muted-foreground">
              {lookingUp ? 'Looking up…' : missingPrice.length || missingName.length ? `Add ${missingName.length ? 'names and ' : ''}prices to ${missingPrice.length || missingName.length} item(s) first` : 'Ready to save'}
            </p>
            <button type="button" onClick={() => void saveAll()} disabled={saving || lookingUp > 0 || missingPrice.length > 0 || missingName.length > 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-sm font-bold text-white disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Save all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductQuickScanPage() {
  return <ErrorBoundary><ProductQuickScan /></ErrorBoundary>;
}
