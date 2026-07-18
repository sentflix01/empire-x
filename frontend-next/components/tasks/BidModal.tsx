// @ts-nocheck
'use client'
import React, { useState } from "react";
import { entities } from "@/api/entities";
import { createNotification } from "@/lib/notifications";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function BidModal({ task, user, onClose, onPlaced }) {
  const [bidAmount, setBidAmount] = useState(task.offered_payment?.toString() || "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!bidAmount) return;
    setSaving(true);
    await entities.TaskBid.create({
      task_id: task.id,
      bidder_id: user?.id || "",
      bidder_name: user?.full_name || "Anonymous",
      bid_amount: parseFloat(bidAmount),
      message,
      status: "pending",
    });
    await createNotification(
      task.requester_id,
      "task_update",
      `New bid on "${task.title}"`,
      `${user?.full_name || "Someone"} bid ${bidAmount} ETB for your task.`,
      "/tasks"
    );
    setSaving(false);
    onPlaced?.();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-secondary/30 rounded-xl p-3">
            <p className="text-sm font-semibold">{task.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Offered payment: <span className="font-semibold text-amber-600">{task.offered_payment?.toLocaleString()} {task.currency || "ETB"}</span>
            </p>
          </div>
          <div>
            <Label>Your Bid (ETB)</Label>
            <Input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder="Enter your price" className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Bid at, below, or above the offered amount</p>
          </div>
          <div>
            <Label>Message (optional)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Introduce yourself and why you're the right person..." className="mt-1" rows={3} />
          </div>
          <Button onClick={handleSubmit} disabled={saving || !bidAmount} className="w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600">
            {saving ? "Sending..." : "Submit Application"} <Send className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
