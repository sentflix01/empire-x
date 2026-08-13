'use client'
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import { useAuth } from "@/lib/AuthContext";
import { useTranslation } from 'react-i18next';

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ErrorBoundary from '@/components/ErrorBoundary';

const TASK_TYPES = [
  { value: "bill_payment", label: "💰 Bill Payment" },
  { value: "document_pickup", label: "📄 Document Pickup" },
  { value: "gov_form", label: "🏛️ Government Form" },
  { value: "delivery", label: "🚚 Delivery" },
  { value: "queue_standing", label: "🧍 Queue Standing" },
  { value: "grocery", label: "🛒 Grocery Purchase" },
  { value: "other", label: "📋 Other" },
];

function TaskCreate() {
  const { t } = useTranslation();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", task_type: "", location: "", offered_payment: "", deadline: "" });
  // user state now sourced from useAuth() hook
  const { user: _authUser } = useAuth();
  useEffect(() => { if (_authUser) setUser(_authUser); }, [_authUser]);

  const handleSubmit = async () => {
    if (!form.title || !form.task_type || !form.offered_payment) return;
    setSaving(true);
    try {
      await entities.Task.create({
        requester_id: user?.id || "",
        title: form.title,
        description: form.description,
        task_type: form.task_type,
        location: form.location,
        offered_payment: parseFloat(form.offered_payment),
        deadline: form.deadline || undefined,
        status: "open",
      });
      router.push("/tasks");
    } catch (err: any) {
      toast.error(err?.error || err?.message || "Failed to post task");
    } finally {
      setSaving(false);
    }
  };

  return (
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="font-display text-2xl font-bold mb-6">Post a Task</h1>
        <div className="space-y-4">
          <div>
            <Label>Task Type</Label>
            <Select value={form.task_type} onValueChange={v => setForm({...form, task_type: v})}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select task type" /></SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Pick up my passport from immigration" className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Provide details..." className="mt-1" rows={3} />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. Downtown, New York" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Payment</Label>
              <Input type="number" value={form.offered_payment} onChange={e => setForm({...form, offered_payment: e.target.value})} placeholder="500" className="mt-1" />
            </div>
            <div>
              <Label>Deadline</Label>
              <Input type="datetime-local" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} className="mt-1" />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={saving || !form.title || !form.task_type || !form.offered_payment} className="w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
            {saving ? "Posting..." : "Post Task"}
          </Button>
        </div>
      </div>
  );
}

export default function TaskCreatePage() {
  return <ErrorBoundary><TaskCreate /></ErrorBoundary>;
}
