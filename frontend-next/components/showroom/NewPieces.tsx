'use client';
/**
 * Website pieces for local businesses: How to pay me (living: reads the
 * business's payment accounts), Opening hours, Menu and Today's offer.
 * Rendered by SectionRenderer on the published site and in Studio's preview.
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Clock, Copy, Landmark, Smartphone, Tag, UtensilsCrossed, Wallet } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import client from '@/api/client';
import { sectionItemBuyPayload, type BuyPayload } from '@/lib/sectionItemPurchase';
import { formatTime, isOpenNow, readOpeningHours, todayIndex } from '@/lib/openingHours';

interface Account { id: string; method: 'bank' | 'mobile_money' | 'other'; provider_name: string; account_name: string; account_number: string; instructions?: string | null }

function CopyNumber({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" aria-label={`Copy ${label}`}
      onClick={() => navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => undefined)}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-background px-3 font-mono text-sm hover:bg-secondary">
      {value}
      {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Copy className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
    </button>
  );
}

/** How to pay me: the business's active payment accounts, always current. */
export function PaymentInfoSection({ s, sectionIndex, businessId, isOwner, preview, themeColor }: {
  s: Record<string, any>; sectionIndex: number; businessId?: string | null; isOwner: boolean; preview: boolean; themeColor: string;
}) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  useEffect(() => {
    if (!businessId) { setAccounts([]); return; }
    let cancelled = false;
    client.get(`/api/businesses/${businessId}/checkout-info`)
      .then(({ data }) => { if (!cancelled) setAccounts(Array.isArray(data?.payment_accounts) ? data.payment_accounts : []); })
      .catch(() => { if (!cancelled) setAccounts([]); });
    return () => { cancelled = true; };
  }, [businessId]);

  const ownerView = isOwner || preview;
  if (accounts && accounts.length === 0 && !ownerView) return null;
  return (
    <div id={`section-${sectionIndex}`} className="px-5 py-10">
      <h2 className="font-display text-lg font-bold mb-1 flex items-center gap-2"><Wallet className="h-5 w-5" style={{ color: themeColor }} aria-hidden="true" />{s.payTitle || s.title || 'How to pay'}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{ownerView ? 'Buyers pay you directly' : 'Pay us directly'}. NodBusiness never holds the money.</p>
      {accounts === null ? (
        <p role="status" className="text-sm text-muted-foreground">Loading…</p>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          <p>Add your telebirr, CBE or bank account once in Business settings. It shows here and on every order, always up to date.</p>
          {businessId
            ? <Link href={`/business/edit?id=${businessId}#payment-accounts`} className="mt-2 inline-flex min-h-10 items-center font-semibold underline">Add payment accounts →</Link>
            : <p className="mt-1 text-xs">Choose your business in More, then add accounts.</p>}
        </div>
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li key={a.id} className="rounded-xl border border-border/50 bg-card p-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {a.method === 'bank' ? <Landmark className="h-4 w-4" aria-hidden="true" /> : <Smartphone className="h-4 w-4" aria-hidden="true" />}
                {a.provider_name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.account_name}</p>
              <div className="mt-2"><CopyNumber value={a.account_number} label={`${a.provider_name} number`} /></div>
              {a.instructions && <p className="mt-2 text-xs text-muted-foreground">{a.instructions}</p>}
            </li>
          ))}
        </ul>
      )}
      {s.payNote && <p className="mt-3 text-sm font-medium">{s.payNote}</p>}
    </div>
  );
}

/** Opening hours with an "Open now" badge (the visitor's local time). */
export function OpeningHoursSection({ s, sectionIndex, legacyHours, isOwner, preview, themeColor }: {
  s: Record<string, any>; sectionIndex: number; legacyHours: Array<{ day: string; hours: string }>; isOwner: boolean; preview: boolean; themeColor: string;
}) {
  const week = readOpeningHours(s.openingHours);
  const title = s.hoursTitle || s.title || 'Opening Hours';
  if (!week && legacyHours.length === 0) {
    if (!isOwner && !preview) return null;
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        <h2 className="font-display text-lg font-bold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground">Set your days and times in Studio and they appear here.</p>
      </div>
    );
  }
  const today = todayIndex();
  return (
    <div id={`section-${sectionIndex}`} className="px-5 py-10">
      <h2 className="font-display text-lg font-bold mb-4 flex flex-wrap items-center gap-2">
        <Clock className="w-5 h-5" style={{ color: themeColor }} aria-hidden="true" />{title}
        {week && (isOpenNow(week)
          ? <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Open now</span>
          : <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Closed now</span>)}
      </h2>
      <dl className="max-w-xs space-y-1">
        {week ? week.map((d, i) => (
          <div key={d.day} className={`flex justify-between gap-4 border-b border-border/20 py-1 text-sm ${i === today ? 'font-semibold' : ''}`}>
            <dt className={i === today ? '' : 'text-muted-foreground'}>{d.day}{i === today ? ' (today)' : ''}</dt>
            <dd>{d.open ? `${formatTime(d.from)} – ${formatTime(d.to)}` : 'Closed'}</dd>
          </div>
        )) : legacyHours.map((h) => (
          <div key={h.day} className="flex justify-between gap-4 border-b border-border/20 py-1 text-sm">
            <dt className="text-muted-foreground">{h.day}</dt><dd className="font-medium">{h.hours}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Menu: dishes grouped as the owner named them, each with Order. */
export function MenuSection({ s, sectionIndex, onBuy, themeColor }: {
  s: Record<string, any>; sectionIndex: number; onBuy?: (item: BuyPayload) => void; themeColor: string;
}) {
  const dishes: Array<Record<string, any>> = (Array.isArray(s.dishes) ? s.dishes : []).filter((d: any) => d?.name);
  const groups = dishes.reduce<Array<{ name: string; items: Array<Record<string, any>> }>>((acc, d) => {
    const name = String(d.category || '').trim();
    const group = acc.find((g) => g.name === name) ?? (acc.push({ name, items: [] }), acc[acc.length - 1]);
    group.items.push(d);
    return acc;
  }, []);
  return (
    <div id={`section-${sectionIndex}`} className="px-5 py-10">
      <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2"><UtensilsCrossed className="h-5 w-5" style={{ color: themeColor }} aria-hidden="true" />{s.menuTitle || s.title || 'Our Menu'}</h2>
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.name || '_'} aria-label={g.name || 'Menu'}>
            {g.name && <h3 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: themeColor }}>{g.name}</h3>}
            <ul className="divide-y divide-border/40">
              {g.items.map((d, i) => {
                const buy = sectionItemBuyPayload(d, 'Dish');
                return (
                  <li key={i} className="flex items-center gap-3 py-3">
                    {d.photo && <SafeImage fill={false} width={128} height={128} loading="lazy" src={d.photo} alt={d.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{d.name}</p>
                      {d.desc && <p className="text-xs text-muted-foreground">{d.desc}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {d.price && <span className="text-sm font-bold" style={{ color: themeColor }}>{d.price}</span>}
                      {buy && onBuy && (
                        <button type="button" onClick={() => onBuy(buy)} className="min-h-9 rounded-full px-3 text-xs font-semibold text-white" style={{ backgroundColor: themeColor }}>
                          Order
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Last moment of the offer's last day, in the visitor's local time; null when unset. */
export function offerEndsAt(value: unknown): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999) : null;
}

/** Today's offer: hidden from visitors after its last day. */
export function OfferSection({ s, sectionIndex, ctaTarget, isOwner, preview, themeColor, now = new Date() }: {
  s: Record<string, any>; sectionIndex: number; ctaTarget?: string | null; isOwner: boolean; preview: boolean; themeColor: string; now?: Date;
}) {
  const ends = offerEndsAt(s.offerEnds);
  const ended = Boolean(ends && ends.getTime() < now.getTime());
  if (!s.offerTitle && !(isOwner || preview)) return null;
  if (ended && !(isOwner || preview)) return null;
  const daysLeft = ends ? Math.floor((ends.getTime() - now.getTime()) / 86_400_000) : null;
  return (
    <div id={`section-${sectionIndex}`} className="px-5 py-6">
      {ended && (
        <p role="status" className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          This offer ended on {ends!.toLocaleDateString()}. Visitors no longer see it: change the last day or remove it.
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border-2" style={{ borderColor: themeColor }}>
        {s.offerPhoto && <SafeImage fill={false} width={800} height={400} loading="lazy" src={s.offerPhoto} alt="" className="h-40 w-full object-cover" />}
        <div className="p-4">
          <p className="mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white" style={{ backgroundColor: themeColor }}>
            <Tag className="h-3 w-3" aria-hidden="true" /> Offer
          </p>
          <h2 className="font-display text-lg font-bold">{s.offerTitle || 'Your offer'}</h2>
          {s.offerDesc && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{s.offerDesc}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {ends && !ended && (
              <span className="text-xs font-medium text-muted-foreground">
                {daysLeft === 0 ? 'Ends today' : daysLeft === 1 ? 'Ends tomorrow' : `Ends ${ends.toLocaleDateString()}`}
              </span>
            )}
            {s.offerBtn && ctaTarget && (
              <a href={ctaTarget} className="inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-white" style={{ backgroundColor: themeColor }}>{s.offerBtn}</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
