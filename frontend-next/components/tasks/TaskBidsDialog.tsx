// @ts-nocheck
import { useRouter } from 'next/navigation';
import React, { useState } from "react";
import { entities } from "@/api/entities";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, MessageSquare, Banknote } from "lucide-react";
import { findOrCreateConversation } from "@/lib/messaging";
import { createNotification } from "@/lib/notifications";

export default function TaskBidsDialog({ task, user, bids, onClose, onAccepted }) {
  const [processing, setProcessing] = useState("");
  const router = useRouter();

  const sortedBids = [...bids].sort((a, b) => (a.bid_amount || 0) - (b.bid_amount || 0));

  const handleAccept = async (bid) => {
    setProcessing(bid.id);
    await entities.Task.update(task.id, { agent_id: bid.bidder_id, status: "in_progress" });
    await entities.TaskBid.update(bid.id, { status: "accepted" });
    const others = bids.filter((b) => b.id !== bid.id && b.status === "pending");
    if (others.length > 0) {
      // Reject all other pending bids one by one
      await Promise.all(others.map((b) => entities.TaskBid.update(b.id, { status: "rejected" })));
    }
    await createNotification(
      bid.bidder_id,
      "task_update",
      "Your bid was accepted! 🎉",
      `Your bid for "${task.title}" was accepted. Contact the requester to get started.`,
      "/tasks"
    );
    setProcessing("");
    onAccepted?.();
    onClose();
  };

  const handleMessage = async (bid) => {
    setProcessing("msg-" + bid.id);
    try {
      const conv = await findOrCreateConversation(user, bid.bidder_id, bid.bidder_name);
      if (conv) router.push(`/messages/${conv.id}`);
    } catch (e) {
      console.error(e);
    }
    setProcessing("");
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bids for "{task.title}"</DialogTitle>
        </DialogHeader>
        {sortedBids.length === 0 ? (
          <div className="text-center py-8">
            <Banknote className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No bids yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedBids.map((bid) => {
              const isAccepted = bid.status === "accepted";
              const isRejected = bid.status === "rejected";
              return (
                <div
                  key={bid.id}
                  className={`p-4 rounded-xl border ${
                    isAccepted ? "border-green-300 bg-green-50" : isRejected ? "border-border/40 opacity-50" : "border-border/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{bid.bidder_name}</p>
                      {bid.message && <p className="text-xs text-muted-foreground mt-1">{bid.message}</p>}
                    </div>
                    <p className="text-sm font-bold text-amber-600 shrink-0 ml-2">{bid.bid_amount?.toLocaleString()} ETB</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        isAccepted ? "text-green-600 border-green-200" : isRejected ? "text-red-500" : "text-amber-600 border-amber-200"
                      }`}
                    >
                      {bid.status}
                    </Badge>
                    {(isAccepted || bid.status === "pending") && (
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => handleMessage(bid)} disabled={processing === "msg-" + bid.id}>
                        <MessageSquare className="w-3 h-3 mr-1" /> Message
                      </Button>
                    )}
                    {bid.status === "pending" && (
                      <Button size="sm" className="h-7 text-xs rounded-full bg-gradient-to-r from-amber-500 to-amber-600" onClick={() => handleAccept(bid)} disabled={!!processing}>
                        <Check className="w-3 h-3 mr-1" /> Accept
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

