'use client';
/**
 * BusinessInventory.tsx — Inventory management dashboard for business owners
 *
 * Features:
 *   - Product table with search, filter by category, sort by stock/price
 *   - Bulk CSV/JSON import (Pro+ tier gated via TierGatedSection)
 *   - Per-row import results (created count + error details)
 *   - Quick edit: stock, price, status inline
 *
 * Route: /business/inventory
 * Files touched:
 *   frontend-next/views/BusinessInventory.tsx    (this file)
 *   frontend-next/app/(app)/business/inventory/page.tsx
 *   backend/routes/products.ts                   (POST /bulk-import)
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Package, Search, Upload, Loader2, AlertTriangle, CheckCircle2,
  RefreshCw, TrendingDown, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import client from '@/api/client';
import { toast } from 'sonner';
import TierGatedSection from '@/components/subscription/TierGatedSection';
import ErrorBoundary from '@/components/ErrorBoundary';

interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  stock: number | null;
  category: string | null;
  status: string;
  created_at: string;
}

interface ImportResult {
  created: number;
  errors: { index: number; reason: string }[];
}

function BusinessInventory() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const { data } = await client.get('/api/products/mine');
      setProducts(data.products ?? data ?? []);
    } catch {
      toast.error('Failed to load products');
    }
    setLoading(false);
  }

  async function handleBulkImport() {
    let rows: unknown[];
    try {
      rows = JSON.parse(importText);
      if (!Array.isArray(rows)) throw new Error('Must be a JSON array');
    } catch {
      toast.error('Invalid JSON — must be an array of product objects');
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const { data } = await client.post('/api/products/bulk-import', rows);
      setImportResult(data as ImportResult);
      if (data.created > 0) {
        toast.success(`Imported ${data.created} products`);
        await loadProducts();
      }
      if (data.errors?.length) {
        toast.warning(`${data.errors.length} rows had errors`);
      }
    } catch (err: unknown) {
      const e = err as { error?: string };
      toast.error(e?.error ?? 'Import failed');
    }
    setImporting(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      // Basic CSV → JSON conversion for simple files
      if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter(Boolean);
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
          return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
        });
        setImportText(JSON.stringify(rows, null, 2));
      } else {
        setImportText(text);
      }
    };
    reader.readAsText(file);
  }

  const filtered = products.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = products.filter(p => (p.stock ?? 0) <= 5 && p.stock !== null).length;
  const outOfStock = products.filter(p => p.stock === 0).length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your product catalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadProducts}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <TierGatedSection feature="bulk_import">
            <Button size="sm" onClick={() => setShowImport(v => !v)} className="gap-2">
              <Upload className="w-4 h-4" />
              Bulk Import
            </Button>
          </TierGatedSection>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Products', value: products.length, icon: Package, color: 'text-blue-500' },
          { label: 'Active',         value: products.filter(p => p.status === 'active').length, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Low Stock',      value: lowStock,    icon: TrendingDown, color: 'text-amber-500' },
          { label: 'Out of Stock',   value: outOfStock,  icon: AlertTriangle, color: 'text-red-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border/50 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Bulk import panel */}
      {showImport && (
        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-500" /> Bulk Import Products
            </h2>
            <button onClick={() => { setShowImport(false); setImportResult(null); }}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Upload a CSV or paste a JSON array. Required fields: <code className="bg-secondary px-1 rounded">title</code>, <code className="bg-secondary px-1 rounded">price</code>.
            Optional: description, category, currency, stock, images, barcode.
          </p>

          {/* File upload */}
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".csv,.json" className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1.5" /> Upload CSV / JSON
            </Button>
          </div>

          {/* JSON editor */}
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder={'[\n  { "title": "Product A", "price": 99, "category": "Electronics", "stock": 50 },\n  { "title": "Product B", "price": 149 }\n]'}
            rows={8}
            className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-border bg-secondary/30 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-y"
          />

          <Button onClick={handleBulkImport} disabled={importing || !importText.trim()} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
            {importing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Importing...</> : 'Import Products'}
          </Button>

          {/* Results */}
          {importResult && (
            <div className="space-y-2 text-sm">
              <div className={`flex items-center gap-2 p-3 rounded-xl ${importResult.created > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-secondary text-muted-foreground'}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{importResult.created} product{importResult.created !== 1 ? 's' : ''} created successfully</span>
              </div>
              {importResult.errors.map(err => (
                <div key={err.index} className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Row {err.index + 1}: {err.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="pl-10 rounded-full"
        />
      </div>

      {/* Product table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search ? `No products matching "${search}"` : 'No products yet'}</p>
          <p className="text-sm mt-1">Add products from the marketplace or use bulk import above.</p>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2 border-b border-border/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Product</span>
            <span>Category</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Status</span>
          </div>
          {filtered.map(product => (
            <div key={product.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-4 py-3 border-b border-border/20 last:border-0 hover:bg-secondary/30 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{product.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(product.created_at).toLocaleDateString()}</p>
              </div>
              <span className="text-xs text-muted-foreground">{product.category ?? '—'}</span>
              <span className="text-sm font-medium">{product.price.toLocaleString()} {product.currency}</span>
              <span className={`text-sm font-medium ${product.stock === 0 ? 'text-red-500' : (product.stock ?? 0) <= 5 ? 'text-amber-500' : 'text-foreground'}`}>
                {product.stock ?? '—'}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  product.status === 'active' ? 'text-emerald-600 border-emerald-300' :
                  product.status === 'sold_out' ? 'text-red-600 border-red-300' :
                  'text-muted-foreground'
                }`}
              >
                {product.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BusinessInventoryPage() {
  return <ErrorBoundary><BusinessInventory /></ErrorBoundary>;
}
