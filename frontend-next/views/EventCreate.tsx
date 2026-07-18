// @ts-nocheck
'use client'
import { useRouter } from 'next/navigation';
import React, { useState } from "react";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import { useTranslation } from 'react-i18next';

import { ArrowLeft, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUpload from "@/components/ui/ImageUpload";

function EventCreate() {
  const { t } = useTranslation();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", cover_image: "", location: "", is_online: false,
    online_link: "", start_at: "", end_at: "", ticket_price: "0", currency: "ETB", capacity: ""
  });

  const handleSubmit = async () => {
    if (!form.title || !form.start_at) return;
    setSaving(true);
    try {
      const u = await auth.me();
      await entities.Event.create({
        ...form,
        ticket_price: parseFloat(form.ticket_price) || 0,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        is_online: form.is_online,
        status: "published",
        organizer_id: u.id,
      });
      router.push("/events");
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2 mb-6">
          <CalendarDays className="w-6 h-6 text-amber-500" />
          <h1 className="font-display text-2xl font-bold">Create Event</h1>
        </div>
        <div className="space-y-4">
          <div><Label>Cover Image</Label><div className="mt-1"><ImageUpload value={form.cover_image} onChange={url => setForm({...form, cover_image: url})} aspectRatio="aspect-video" placeholder="Upload cover" /></div></div>
          <div><Label>Event Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Tech Meetup Addis 2025" className="mt-1" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe your event..." className="mt-1" rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Date & Time</Label><Input type="datetime-local" value={form.start_at} onChange={e => setForm({...form, start_at: e.target.value})} className="mt-1" /></div>
            <div><Label>End Date & Time</Label><Input type="datetime-local" value={form.end_at} onChange={e => setForm({...form, end_at: e.target.value})} className="mt-1" /></div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="online" checked={form.is_online} onChange={e => setForm({...form, is_online: e.target.checked})} className="w-4 h-4" />
            <Label htmlFor="online">Online event</Label>
          </div>
          {form.is_online ? (
            <div><Label>Online Link</Label><Input value={form.online_link} onChange={e => setForm({...form, online_link: e.target.value})} placeholder="https://zoom.us/..." className="mt-1" /></div>
          ) : (
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Venue, City" className="mt-1" /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Ticket Price (ETB) — 0 for free</Label><Input type="number" value={form.ticket_price} onChange={e => setForm({...form, ticket_price: e.target.value})} className="mt-1" /></div>
            <div><Label>Capacity (optional)</Label><Input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} placeholder="Unlimited" className="mt-1" /></div>
          </div>
          <Button onClick={handleSubmit} disabled={saving || !form.title || !form.start_at} className="w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600">
            {saving ? "Creating..." : "Publish Event ✨"}
          </Button>
        </div>
      </div>
  );
}




export default EventCreate;
