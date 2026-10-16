'use client';
/**
 * OrderStatus — the buyer's private order page (/order/<token>), reached from
 * the link emailed at checkout. No account needed. Shows the order, the
 * seller's payment accounts and pickup address, and lets the buyer report a
 * direct payment (reference and optional receipt). Only the seller confirms.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock, Loader2, MapPin, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import client, { apiFetch } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaymentAccountList, type PaymentAccount } from '@/components/checkout/PurchaseModal';

interface OrderView {
  order: {
    id: string; product_title: string; quantity: number; total_price: string | number; currency: string; status: string;
    payment_reference: string | null; has_receipt: boolean; payment_expires_at: string | null; created_at: string;
  };
  business: { business_name?: string; business_contact_phone?: string | null; business_contact_email?: string | null; pickup_address?: string | null } | null;
  payment_accounts: PaymentAccount[];
  receipt_uploads: boolean;
}

const STATUS_TEXT: Record<string, { label: string; tone: 'wait' | 'ok' | 'bad' }> = {
  awaiting_payment: { label: 'Waiting for your payment', tone: 'wait' },
  payment_reported: { label: 'Payment reported — waiting for the seller to confirm', tone: 'wait' },
  paid: { label: 'Payment confirmed by the seller', tone: 'ok' },
  confirmed: { label: 'Confirmed by the seller', tone: 'ok' },
  processing: { label: 'Being prepared', tone: 'ok' },
  shipped: { label: 'On its way', tone: 'ok' },
  delivered: { label: 'Delivered', tone: 'ok' },
  completed: { label: 'Completed', tone: 'ok' },
  expired: { label: 'Expired — the payment was not confirmed in time', tone: 'bad' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
};

export default function OrderStatus() {
  const params = useParams();
  const token = String(Array.isArray(params?.token) ? params.token[0] : params?.token ?? '');
  const [view, setView] = useState<OrderView | null>(null);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await client.get<OrderView>(`/api/direct-orders/link/${encodeURIComponent(token)}`);
      setView(data);
    } catch (err: any) {
      setError(err?.status === 404 ? 'This order link is not valid.' : 'Could not load your order. Please try again.');
    }
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);

  const reportPayment = async () => {
    setSending(true);
    try {
      const form = new FormData();
      if (reference.trim()) form.append('payment_reference', reference.trim());
      if (receipt) form.append('receipt', receipt);
      const res = await apiFetch(`/api/direct-orders/link/${encodeURIComponent(token)}/report-payment`, { method: 'POST', body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? 'Could not report the payment'); return; }
      toast.success('Thanks — the seller has been told you paid');
      setReceipt(null);
      await load();
    } finally {
      setSending(false);
    }
  };

  if (error) return <main className="mx-auto max-w-md p-6 text-center"><p>{error}</p><Link href="/landing" className="text-primary underline">Go to NodBusiness</Link></main>;
  if (!view) return <main className="flex min-h-[50vh] items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></main>;

  const { order, business } = view;
  const status = STATUS_TEXT[order.status] ?? { label: order.status, tone: 'wait' as const };
  const canReport = ['awaiting_payment', 'payment_reported'].includes(order.status);
  const Icon = status.tone === 'ok' ? CheckCircle2 : status.tone === 'bad' ? XCircle : Clock;

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold">Your order</h1>
      <section className="rounded-2xl border border-border/50 bg-card p-4 space-y-1">
        <p className="font-medium">{order.quantity}× {order.product_title}</p>
        <p className="text-sm">Total: <strong>{Number(order.total_price).toLocaleString()} {order.currency}</strong></p>
        <p className="text-sm text-muted-foreground">From {business?.business_name ?? 'the seller'}</p>
        <p className={`mt-2 flex items-center gap-2 text-sm font-medium ${status.tone === 'ok' ? 'text-green-600' : status.tone === 'bad' ? 'text-destructive' : 'text-amber-600'}`}>
          <Icon className="w-4 h-4" /> {status.label}
        </p>
        {canReport && order.payment_expires_at && (
          <p className="text-xs text-muted-foreground">Expires on {new Date(order.payment_expires_at).toLocaleDateString()} unless the seller confirms payment.</p>
        )}
      </section>

      {canReport && (
        <section className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
          <h2 className="font-semibold">Pay the seller directly</h2>
          <PaymentAccountList accounts={view.payment_accounts} />
          <p className="text-xs text-muted-foreground">NodBusiness never receives your money.</p>
          <div className="space-y-2 border-t border-border/40 pt-3">
            <Label htmlFor="payment-reference">Transaction reference (optional)</Label>
            <Input id="payment-reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} placeholder={order.payment_reference ?? 'e.g. the transfer ID'} className="h-11" />
            {view.receipt_uploads && (
              <>
                <Label htmlFor="payment-receipt">Receipt photo or PDF (optional, private)</Label>
                <Input id="payment-receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
              </>
            )}
            <Button onClick={reportPayment} disabled={sending} className="w-full rounded-full">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : order.status === 'payment_reported' ? 'Update my payment details' : "I've paid"}
            </Button>
          </div>
        </section>
      )}

      {(business?.pickup_address || business?.business_contact_phone || business?.business_contact_email) && (
        <section className="rounded-2xl border border-border/50 bg-card p-4 space-y-1 text-sm">
          <h2 className="font-semibold">Seller contact</h2>
          {business?.pickup_address && <p><MapPin className="inline w-4 h-4 mr-1" />Pickup: {business.pickup_address}</p>}
          {business?.business_contact_phone && <p>Phone: {business.business_contact_phone}</p>}
          {business?.business_contact_email && <p>Email: {business.business_contact_email}</p>}
        </section>
      )}

      <p className="text-center text-xs text-muted-foreground">Keep this link private: anyone with it can see this order.</p>
    </main>
  );
}
