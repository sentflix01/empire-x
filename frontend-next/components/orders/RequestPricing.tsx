'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { apiErrorMessage } from '@/lib/apiErrorMessage';

interface Props {
  order: { id: string; quantity: number; currency?: string; listed_price_text?: string | null; business_id?: string | null;
    /** Room bookings: the per-night price the guest saw, and the stay length. */
    unit_price?: number | string | null; nights?: number | null };
  onUpdated: (order: Record<string, unknown>) => void;
}

/**
 * The seller's answer to a "Request to order": set the unit price (the buyer
 * can then pay) or decline. The listed price from the website is shown for
 * reference only. For a room booking the price is per night and starts at
 * the room's price; the total is price × nights × rooms.
 */
export default function RequestPricing({ order, onUpdated }: Props) {
  const isStay = Number(order.nights) > 0;
  const [price, setPrice] = useState(isStay && Number(order.unit_price) > 0 ? String(Number(order.unit_price)) : '');
  const [busy, setBusy] = useState<'price' | 'decline' | null>(null);
  const [needsAccount, setNeedsAccount] = useState(false);
  const unit = Number(price);
  const valid = Number.isFinite(unit) && unit > 0;
  const currency = order.currency ?? 'ETB';
  const multiplier = order.quantity * (isStay ? Number(order.nights) : 1);
  const unitLabel = isStay ? 'Price per night' : 'Price per item';

  const setOrderPrice = async () => {
    if (!valid || busy) return;
    setBusy('price');
    try {
      const { data } = await client.post(`/api/direct-orders/${order.id}/set-price`, { unit_price: unit });
      onUpdated(data.order);
      toast.success('Price confirmed. The buyer can now pay you.');
    } catch (err) {
      if ((err as { code?: string } | null)?.code === 'NO_PAYMENT_ACCOUNTS') setNeedsAccount(true);
      toast.error(apiErrorMessage(err, 'Could not set the price'));
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    if (busy) return;
    setBusy('decline');
    try {
      const { data } = await client.post(`/api/direct-orders/${order.id}/decline-request`, {});
      onUpdated(data.order);
      toast.success('Request declined. The buyer has been told.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not decline the request'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-full space-y-2 rounded-xl border border-primary/30 bg-primary-subtle/60 p-3 text-sm">
      <p className="text-foreground">
        {isStay ? 'Confirm this booking at the price per night, or lower it' : 'Set the price to confirm this request'}{order.listed_price_text ? <> (your website lists <strong>{order.listed_price_text}</strong>)</> : null}.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5">
          <span className="sr-only">{unitLabel} in {currency}</span>
          <input
            type="number" min="0" step="0.01" inputMode="decimal" value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={`${unitLabel} (${currency})`}
            className="h-9 w-40 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
          />
        </label>
        {valid && multiplier > 1 && (
          <span className="text-xs text-muted-foreground">Total {(Math.round(unit * multiplier * 100) / 100).toLocaleString()} {currency}</span>
        )}
        <Button size="sm" className="h-8 rounded-full text-xs" onClick={setOrderPrice} disabled={!valid || !!busy}>
          {busy === 'price' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm at this price'}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs text-destructive" onClick={decline} disabled={!!busy}>
          {busy === 'decline' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Decline'}
        </Button>
      </div>
      {needsAccount && (
        <p className="text-xs text-foreground">
          Buyers need to know how to pay you. <Link href={order.business_id ? `/business/edit?id=${encodeURIComponent(order.business_id)}` : '/businesses'} className="font-medium text-primary underline">Add a payment account</Link>, then confirm the price.
        </p>
      )}
    </div>
  );
}
