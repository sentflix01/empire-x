'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from "@/lib/AuthContext";
import { entities } from "@/api/entities";
import client from "@/api/client";

import Link from "next/link";
import { ArrowLeft, ScanBarcode, Sparkles, X } from "lucide-react";
import BarcodeScanner from "@/components/products/BarcodeScanner";
import { importPhoto, lookupCode, productCategory, PRODUCT_CATEGORIES, SOURCE_LABEL, type ExistingProduct } from "@/lib/productScan";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUpload from "@/components/ui/ImageUpload";
import { toast } from "sonner";
import ErrorBoundary from '@/components/ErrorBoundary';

const CATEGORIES = PRODUCT_CATEGORIES;

function ProductCreate() {
  const params = useParams();
  const searchParams = useSearchParams();
  const paramId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = searchParams.get("id") || paramId;
  const isEdit = Boolean(id);
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", price: "", stock: "1", category: "", tags: "", status: "active" });
  // Filled by a scan; saved with the product so the next seller's scan finds it.
  const [barcode, setBarcode] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("");
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [scanNote, setScanNote] = useState<{ tone: "info" | "warn"; text: string } | null>(null);
  const [alreadyMine, setAlreadyMine] = useState<ExistingProduct | null>(null);

  /** A scanned or typed code: fill the form from what the backend knows about it. */
  const handleCode = async (code: string) => {
    setScanning(false);
    setLooking(true);
    setAlreadyMine(null);
    setScanNote(null);
    try {
      const result = await lookupCode(code);
      if (result.kind === "text") { setScanNote({ tone: "warn", text: `${result.message} It says: "${result.text.slice(0, 80)}"` }); return; }
      setBarcode(result.gtin);
      if (result.source === "mine" && result.existing_product) { setAlreadyMine(result.existing_product); return; }
      const sug = result.suggestion;
      if (!sug) {
        setScanNote({ tone: "info", text: "We don't know this product yet. Fill it in once: the next seller who scans it gets your name and photo (never your price)." });
        return;
      }
      const category = productCategory(sug.category, result.source);
      setForm(p => ({ ...p, title: sug.title || p.title, description: sug.description || p.description, category: category || p.category }));
      setBrand(sug.brand ?? "");
      setUnit(sug.unit ?? "");
      if (sug.image_url && images.length === 0) {
        try { setImages([await importPhoto(sug.image_url)] as never[]); }
        catch { toast.info("We couldn't copy the photo. Add your own."); }
      }
      setScanNote({ tone: "info", text: `Filled from ${result.credit || SOURCE_LABEL[result.source]}. Check it, add your price, and save.` });
    } catch (err) {
      setScanNote({ tone: "warn", text: apiErrorMessage(err, "Could not look up this barcode. Type the details instead.") });
    } finally { setLooking(false); }
  };

  useEffect(() => {
    if (isEdit) loadProduct(user);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const loadProduct = async (currentUser) => {
    setLoading(true);
    try {
      const p = await entities.Product.get(id);
      if (p.seller_id !== currentUser?.id && currentUser?.role !== "admin") {
        toast.error("You can only edit your own products");
        router.push("/marketplace");
        return;
      }
      let imgs = [];
      try { imgs = JSON.parse((p.images as string) || "[]"); } catch { imgs = (p.images as string) ? [(p.images as string)] : []; }
      setImages(imgs);
      setBarcode((p.barcode as string) || "");
      setBrand((p.manufacturer as string) || "");
      setUnit((p.unit as string) && p.unit !== "pcs" ? (p.unit as string) : "");
      setForm({
        title: (p.title as string) || "",
        description: (p.description as string) || "",
        price: String(p.price ?? ""),
        stock: String(p.stock ?? "1"),
        category: (p.category as string) || "",
        tags: (p.tags as string) || "",
        status: (p.status as string) || "active",
      });
    } catch {
      toast.error("Product not found");
      router.push("/marketplace");
    }
    setLoading(false);
  };

  const handleGenerateDesc = async () => {
    if (!form.title) return;
    setGenerating(true);
    try {
      const { data } = await client.post("/api/ai/generate-description", { title: form.title, category: form.category, type: "product" });
      setForm(p => ({ ...p, description: data.description }));
    } catch { toast.info("AI unavailable — add OPENAI_API_KEY to backend/.env"); }
    setGenerating(false);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.price) return;
    setSaving(true);
    const payload = {
      seller_id: user?.id || "",
      title: form.title,
      description: form.description,
      price: parseFloat(form.price),
      stock: parseInt(form.stock) || 0,
      category: form.category,
      tags: form.tags,
      images: JSON.stringify(images),
      status: form.status,
      ...(barcode ? { barcode } : {}),
      ...(brand ? { manufacturer: brand } : {}),
      ...(unit ? { unit } : {}),
    };
    try {
      if (isEdit) {
        await entities.Product.update(id, payload);
        toast.success("Product updated");
      } else {
        await entities.Product.create({ ...payload, status: "active" });
        toast.success("Product listed");
      }
      router.push("/marketplace");
    } catch (err) {
      const body = err as { error?: string; existing_product_id?: string };
      if (body?.error === "barcode_exists" && body.existing_product_id) {
        toast.error("You already sell a product with this barcode.", { action: { label: "Open it", onClick: () => router.push(`/products/${body.existing_product_id}`) } });
      } else {
        toast.error(apiErrorMessage(err, "Failed to save product"));
      }
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div data-page-guide="product-create-title" className="max-w-lg mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="font-display text-2xl font-bold mb-4">{isEdit ? "Edit Product" : "List a Product"}</h1>
        {!isEdit && (
          <div className="mb-5 space-y-3 rounded-2xl border border-border/60 bg-card p-4">
            {scanning ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Scan the product's barcode</p>
                  <button type="button" onClick={() => setScanning(false)} aria-label="Close scanner" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"><X className="h-4 w-4" aria-hidden="true" /></button>
                </div>
                <BarcodeScanner onCode={(c) => { void handleCode(c); }} />
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setScanning(true)} disabled={looking}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-sm font-bold text-white disabled:opacity-60">
                  <ScanBarcode className="h-5 w-5" aria-hidden="true" />{looking ? "Looking it up…" : "Scan barcode"}
                </button>
                <Link href="/products/scan" className="inline-flex min-h-12 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-secondary">Scan many</Link>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Point your camera at the barcode and we fill in the name, photo and details for you.</p>
            {alreadyMine && (
              <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
                <p className="font-semibold">You already sell this: {alreadyMine.title}</p>
                <p className="text-xs">In stock: {alreadyMine.stock}</p>
                <div className="mt-2 flex gap-2">
                  <Link href={`/products/edit?id=${alreadyMine.id}`} className="inline-flex min-h-10 items-center rounded-full bg-amber-500 px-4 text-sm font-semibold text-white">Add stock</Link>
                  <Link href={`/products/${alreadyMine.id}`} className="inline-flex min-h-10 items-center rounded-full border border-amber-400 px-4 text-sm">Open it</Link>
                </div>
              </div>
            )}
            {scanNote && (
              <p role="status" className={`rounded-xl px-3 py-2 text-xs ${scanNote.tone === "warn" ? "bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-100" : "bg-sky-50 text-sky-950 dark:bg-sky-500/10 dark:text-sky-100"}`}>{scanNote.text}</p>
            )}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Product Images</Label>
            <ImageUpload multiple max={6} value={images} onChange={setImages as any} />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Product name" className="mt-1" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Description</Label>
              <button onClick={handleGenerateDesc} disabled={generating || !form.title} className="flex items-center gap-1 text-xs text-amber-600 hover:underline disabled:opacity-50">
                <Sparkles className="w-3 h-3" /> {generating ? "Generating..." : "AI Generate"}
              </button>
            </div>
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe your product..." className="mt-1 min-h-[100px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price</Label>
              <Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Stock</Label>
              <Input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="mt-1" />
            </div>
          </div>
          {(barcode || brand || unit) && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Barcode</Label>
                <Input value={barcode} onChange={e => setBarcode(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" className="mt-1 font-mono" />
              </div>
              <div>
                <Label>Brand</Label>
                <Input value={brand} onChange={e => setBrand(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Size</Label>
                <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="500 ml" className="mt-1" />
              </div>
            </div>
          )}
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {isEdit && (
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="sold_out">Sold Out</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={handleSubmit} disabled={saving} className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600">
            {saving ? "Saving..." : isEdit ? "Update Product" : "Publish Product"}
          </Button>
        </div>
      </div>
  );
}

export default function ProductCreatePage() {
  return <ErrorBoundary><ProductCreate /></ErrorBoundary>;
}
