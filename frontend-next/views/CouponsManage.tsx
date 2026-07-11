'use client'
import React, { useState, useEffect } from "react";
import client from "@/api/client";
import { auth } from "@/api/auth";
import { Tag, Plus, Trash2, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import moment from "moment";
import { useTranslation } from 'react-i18next';

export default function CouponsManage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({
    code: "", discount_type: "percentage", discount_value: "",
    min_order: "", usage_limit: "", expires_at: ""
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const { data } = await client.get("/api/coupons/mine");
      setCoupons(data);
    } catch { toast.error("Failed to load coupons"); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.code || !form.discount_value) {
      toast.error(t('common.required'));
      return;
    }
    setSaving(true);
    try {
      const { data } = await client.post("/api/coupons", {
        code: form.code.toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order: form.min_order ? parseFloat(form.min_order) : 0,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        expires_at: form.expires_at || null,
      });
      setCoupons(prev => [data, ...prev]);
      setForm({ code: "", discount_type: "percentage", discount_value: "", min_order: "", usage_limit: "", expires_at: "" });
      setShowForm(false);
      toast.success("Coupon created!");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to create coupon");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await client.delete(`/api/coupons/${id}`);
      setCoupons(prev => prev.filter(c => c.id !== id));
      toast.success("Coupon deleted");
    } catch { toast.error("Failed to delete coupon"); }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      toast.success("Code copied!");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setForm(f => ({ ...f, code }));
  };

  return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Tag className="w-6 h-6 text-amber-500" />
            <div>
              <h1 className="font-display text-2xl font-bold">Coupon Codes</h1>
              <p className="text-sm text-muted-foreground">Create discount codes for your customers</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            size="sm"
            className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
          >
            <Plus className="w-4 h-4 mr-1" /> New Coupon
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-card rounded-2xl border border-border/50 p-5 mb-5 space-y-4">
            <h2 className="font-semibold text-sm">New Discount Code</h2>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Coupon Code</Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="SAVE20"
                  className="mt-1 font-mono tracking-widest"
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" className="h-10 rounded-xl" onClick={generateCode}>
                  Generate
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger className="mt-1 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (ETB)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                  placeholder={form.discount_type === "percentage" ? "20" : "50"}
                  className="mt-1 h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Min. Order (ETB)</Label>
                <Input type="number" value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} placeholder="0" className="mt-1 h-10" />
              </div>
              <div>
                <Label>Usage Limit</Label>
                <Input type="number" value={form.usage_limit} onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))} placeholder="Unlimited" className="mt-1 h-10" />
              </div>
              <div>
                <Label>Expires At</Label>
                <Input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} className="mt-1 h-10" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={saving} className="flex-1 h-10 rounded-full bg-gradient-to-r from-amber-500 to-amber-600">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.create')}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="h-10 rounded-full">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Coupon List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <Tag className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <h3 className="font-display text-lg font-bold">No coupons yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Create discount codes to boost your sales</p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map(c => {
              const isExpired = c.expires_at && new Date() > new Date(c.expires_at);
              const isExhausted = c.usage_limit && c.usage_count >= c.usage_limit;
              const isInactive = !c.is_active || isExpired || isExhausted;

              return (
                <div key={c.id} className={`bg-card rounded-2xl border p-4 transition-opacity ${isInactive ? "opacity-60 border-border/30" : "border-border/50"}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-lg tracking-widest text-amber-600">{c.code}</span>
                        <button onClick={() => handleCopy(c.code)} className="p-1 rounded hover:bg-secondary transition-colors">
                          {copied === c.code ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                        {isInactive && <Badge variant="outline" className="text-xs text-red-500 border-red-200">{isExpired ? t('coupons.expired') : isExhausted ? "Used up" : t('common.inactive')}</Badge>}
                      </div>
                      <p className="text-sm font-semibold">
                        {c.discount_type === "percentage" ? `${c.discount_value}% off` : `${c.discount_value} ETB off`}
                        {c.min_order > 0 && <span className="text-muted-foreground font-normal"> on orders over {c.min_order} ETB</span>}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>Used: {c.usage_count}{c.usage_limit ? `/${c.usage_limit}` : ""}</span>
                        {c.expires_at && <span>Expires: {moment(c.expires_at).fromNow()}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(c.id)} className="p-2 rounded-full hover:bg-red-50 hover:text-red-500 text-muted-foreground transition-colors ml-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}



