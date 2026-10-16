'use client'
/**
 * PurchaseModal — the Buy view. NodBusiness never holds funds
 * (docs/decisions/platform-model-decisions.md §2): the buyer sees the seller's
 * business details and payment accounts, places an order (no account needed),
 * pays the seller directly, then reports the payment from their private order
 * page (/order/<token>). Only the seller confirms the payment.
 */
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X, ShoppingBag, Check, Loader2, Copy, Phone, Mail, MapPin, CreditCard } from "lucide-react";
import client from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface PurchaseModalProps {
  item: {
    id?: string;
    title: string;
    description?: string;
    price?: number;
    currency?: string;
    images?: string;
    product_type?: string;
  };
  seller: {
    user_id: string;
    business_name?: string;
    display_name?: string;
  };
  buyer?: {
    id?: string;
    full_name?: string;
    email?: string;
  };
  /** Lets items typed into a showroom section (not catalogue products) show the seller's details. */
  showroomId?: string;
  /** Starting quantity, e.g. from the cart. */
  initialQuantity?: number;
  onClose: () => void;
  onPurchased?: () => void;
  partnershipCode?: string;
}

export interface PaymentAccount { id: string; method: string; provider_name: string; account_name: string; account_number: string; instructions: string | null }
interface SellerDetails {
  business: { business_name?: string; business_logo_url?: string | null; business_contact_phone?: string | null; business_contact_email?: string | null; business_address?: string | null; pickup_address?: string | null } | null;
  payment_accounts: PaymentAccount[];
  payment_window_days?: number;
}

const METHOD_LABEL: Record<string, string> = { bank: 'Bank transfer', mobile_money: 'Mobile money', other: 'Other' };

function copy(text: string, label: string) {
  navigator.clipboard?.writeText(text).then(() => toast.success(`${label} copied`)).catch(() => toast.error('Could not copy'));
}

export function PaymentAccountList({ accounts }: { accounts: PaymentAccount[] }) {
  return (
    <ul className="space-y-2">
      {accounts.map((a) => (
        <li key={a.id} className="rounded-xl border border-border/50 bg-background p-3">
          <p className="text-xs text-muted-foreground">{METHOD_LABEL[a.method] ?? a.method} · {a.provider_name}</p>
          <p className="text-sm font-medium">{a.account_name}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm break-all">{a.account_number}</span>
            <button type="button" onClick={() => copy(a.account_number, 'Account number')} className="shrink-0 rounded-full p-1.5 hover:bg-secondary" aria-label={`Copy ${a.provider_name} account number`}>
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {a.instructions && <p className="text-xs text-muted-foreground mt-1">{a.instructions}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function PurchaseModal({ item, seller, buyer, showroomId, initialQuantity, onClose, onPurchased, partnershipCode }: PurchaseModalProps) {
  const [step, setStep] = useState<'details' | 'contact' | 'done'>('details');
  const [details, setDetails] = useState<SellerDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [quantity, setQuantity] = useState(Math.max(1, Math.floor(initialQuantity ?? 1)));
  const [processing, setProcessing] = useState(false);
  const [contact, setContact] = useState({ name: buyer?.full_name ?? '', phone: '', email: buyer?.email ?? '', address: '', notes: '' });
  const [placed, setPlaced] = useState<{ access_token: string; details: SellerDetails } | null>(null);

  const isProduct = !!item.id;
  const unitPrice = Number(item.price ?? 0);
  const total = useMemo(() => Math.round(unitPrice * quantity * 100) / 100, [unitPrice, quantity]);
  const currency = item.currency ?? 'ETB';
  const sellerName = details?.business?.business_name ?? seller.business_name ?? seller.display_name ?? 'the seller';

  useEffect(() => {
    const query = item.id ? `product_id=${encodeURIComponent(item.id)}` : showroomId ? `showroom_id=${encodeURIComponent(showroomId)}` : null;
    if (!query) { setLoadingDetails(false); return; }
    client.get<SellerDetails>(`/api/direct-orders/checkout-info?${query}`)
      .then(({ data }) => setDetails(data))
      .catch(() => setDetails(null))
      .finally(() => setLoadingDetails(false));
  }, [item.id, showroomId]);

  const accounts = details?.payment_accounts ?? [];
  const contactValid = !!contact.name.trim()
    && /^\+?[0-9\s-]{7,20}$/.test(contact.phone.trim())
    && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email.trim());

  const placeOrder = async () => {
    setProcessing(true);
    try {
      const { data } = await client.post('/api/direct-orders', {
        product_id: item.id,
        quantity,
        buyer_name: contact.name.trim(),
        buyer_phone: contact.phone.trim(),
        buyer_email: contact.email.trim(),
        delivery_address: contact.address.trim() || undefined,
        notes: contact.notes.trim() || undefined,
        partnership_code: partnershipCode,
      });
      setPlaced({ access_token: data.access_token, details: { business: data.business, payment_accounts: data.payment_accounts } });
      setStep('done');
      onPurchased?.();
    } catch (err: any) {
      toast.error(err?.error ?? 'Could not place the order');
    } finally {
      setProcessing(false);
    }
  };

  const business = details?.business;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="purchase-title">
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="purchase-title" className="font-semibold flex items-center gap-2">
            {step === 'done' ? <Check className="w-5 h-5 text-green-600" /> : <ShoppingBag className="w-5 h-5 text-amber-500" />}
            {step === 'done' ? 'Order placed' : 'Buy'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="rounded-xl bg-secondary/40 p-3">
          <p className="font-medium">{item.title}</p>
          {unitPrice > 0 && <p className="text-sm text-muted-foreground">{unitPrice.toLocaleString()} {currency} each</p>}
        </div>

        {step === 'details' && (
          <>
            <section aria-label="Seller" className="space-y-1 text-sm">
              <p className="font-medium">Sold by {sellerName}</p>
              {business?.business_contact_phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" /> {business.business_contact_phone}</p>}
              {business?.business_contact_email && <p className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" /> {business.business_contact_email}</p>}
              {business?.business_address && <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4" /> {business.business_address}</p>}
            </section>

            <section aria-label="How to pay" className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2"><CreditCard className="w-4 h-4" /> Pay the seller directly</p>
              {loadingDetails ? (
                <p className="text-sm text-muted-foreground"><Loader2 className="inline w-4 h-4 animate-spin mr-1" />Loading payment details…</p>
              ) : accounts.length ? (
                <>
                  <PaymentAccountList accounts={accounts} />
                  <p className="text-xs text-muted-foreground">NodBusiness never receives your money. You pay {sellerName} and they confirm it.</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{sellerName} has not added payment details yet. Contact them to arrange payment.</p>
              )}
            </section>

            {isProduct && accounts.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="purchase-qty">Quantity</Label>
                  <Input id="purchase-qty" type="number" min={1} max={10000} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))} className="w-24 h-10" />
                </div>
                {unitPrice > 0 && <p className="text-right font-semibold">Total: {total.toLocaleString()} {currency}</p>}
                <Button onClick={() => setStep('contact')} className="w-full rounded-full">Continue</Button>
              </>
            )}
          </>
        )}

        {step === 'contact' && (
          <>
            <p className="text-sm text-muted-foreground">No account needed. We email you a private link to your order.</p>
            <div className="space-y-3">
              <div><Label htmlFor="buyer-name">Name</Label><Input id="buyer-name" autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} maxLength={200} className="mt-1 h-11" /></div>
              <div><Label htmlFor="buyer-phone">Phone</Label><Input id="buyer-phone" type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="+251 9 12 34 56 78" maxLength={20} className="mt-1 h-11" /></div>
              <div><Label htmlFor="buyer-email">Email</Label><Input id="buyer-email" type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} maxLength={320} className="mt-1 h-11" /></div>
              <div><Label htmlFor="buyer-address">Delivery address (optional)</Label><Input id="buyer-address" autoComplete="street-address" value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} maxLength={2000} className="mt-1 h-11" /></div>
              <div><Label htmlFor="buyer-notes">Note to seller (optional)</Label><Input id="buyer-notes" value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} maxLength={2000} className="mt-1 h-11" /></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('details')} className="flex-1 rounded-full" disabled={processing}>Back</Button>
              <Button onClick={placeOrder} disabled={!contactValid || processing} className="flex-1 rounded-full">
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Place order${unitPrice > 0 ? ` · ${total.toLocaleString()} ${currency}` : ''}`}
              </Button>
            </div>
          </>
        )}

        {step === 'done' && placed && (
          <>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Pay {sellerName}{unitPrice > 0 ? ` ${total.toLocaleString()} ${currency}` : ''} using one of the accounts below.</li>
              <li>Open your order page and tap <strong>I&apos;ve paid</strong>.</li>
              <li>{sellerName} confirms when the money arrives.</li>
            </ol>
            <PaymentAccountList accounts={placed.details.payment_accounts} />
            {placed.details.business?.pickup_address && (
              <p className="text-sm"><MapPin className="inline w-4 h-4 mr-1" />Pickup: {placed.details.business.pickup_address}</p>
            )}
            <p className="text-xs text-muted-foreground">We emailed this link to you. Keep it private: anyone with it can see your order.</p>
            <Link href={`/order/${placed.access_token}`} className="flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Open my order</Link>
          </>
        )}
      </div>
    </div>
  );
}
