// @ts-nocheck
import React, { useState, useEffect } from "react";
import { auth } from "@/api/auth";
import { entities } from "@/api/entities";
import client from "@/api/client";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUpload from "@/components/ui/ImageUpload";
import { toast } from "sonner";

const CATEGORIES = ["Electronics", "Fashion", "Food", "Services", "Handmade", "Beauty", "Home", "Other"];

export default function ProductCreate() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", price: "", stock: "1", category: "", tags: "", status: "active" });

  useEffect(() => {
    auth.me().then(u => {
      setUser(u);
      if (isEdit) loadProduct(u);
    }).catch(() => {});
  }, [id]);

  const loadProduct = async (currentUser) => {
    setLoading(true);
    try {
      const p = await entities.Product.get(id);
      if (p.seller_id !== currentUser?.id && currentUser?.role !== "admin") {
        toast.error("You can only edit your own products");
        navigate("/marketplace");
        return;
      }
      let imgs = [];
      try { imgs = JSON.parse(p.images || "[]"); } catch { imgs = p.images ? [p.images] : []; }
      setImages(imgs);
      setForm({
        title: p.title || "",
        description: p.description || "",
        price: String(p.price ?? ""),
        stock: String(p.stock ?? "1"),
        category: p.category || "",
        tags: p.tags || "",
        status: p.status || "active",
      });
    } catch {
      toast.error("Product not found");
      navigate("/marketplace");
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
    };
    try {
      if (isEdit) {
        await entities.Product.update(id, payload);
        toast.success("Product updated");
      } else {
        await entities.Product.create({ ...payload, status: "active" });
        toast.success("Product listed");
      }
      navigate("/marketplace");
    } catch {
      toast.error("Failed to save product");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-lg mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="font-display text-2xl font-bold mb-6">{isEdit ? "Edit Product" : "List a Product"}</h1>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Product Images</Label>
            <ImageUpload multiple max={6} value={images} onChange={setImages} />
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
              <Label>Price (ETB)</Label>
              <Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Stock</Label>
              <Input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="mt-1" />
            </div>
          </div>
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


