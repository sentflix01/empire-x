'use client';
import React, { useState } from 'react';
import { Check, Copy, FlaskConical } from 'lucide-react';
import { CHAPA_TEST_CARDS, CHAPA_TEST_PHONES, STRIPE_TEST_CARDS, type TestCard } from '@/lib/paymentTestData';

function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value.replace(/\s/g, '')).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => undefined);
      }}
      aria-label={`Copy ${label}`}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 font-mono text-sm text-foreground hover:bg-secondary"
    >
      {value}
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
    </button>
  );
}

function Cards({ cards }: { cards: TestCard[] }) {
  return (
    <ul className="space-y-2">
      {cards.map((c) => (
        <li key={c.number} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="w-full text-xs font-medium text-foreground sm:w-auto sm:min-w-[9rem]">{c.brand}</span>
          <CopyValue value={c.number} label={`${c.brand} card number`} />
          <span className="text-xs text-muted-foreground">Expiry {c.expiry} · CVV {c.cvv}{c.note ? ` · ${c.note}` : ''}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * "You're in test mode" box with the provider's published test numbers and
 * cards, one tap to copy. Rendered only when the backend reports test keys.
 */
export default function TestModeHelper({ provider }: { provider: 'chapa' | 'stripe' }) {
  const [tab, setTab] = useState<'phone' | 'card'>(provider === 'chapa' ? 'phone' : 'card');
  return (
    <section aria-label="Test mode payment details" className="space-y-3 rounded-xl border border-sky-300/60 bg-sky-50 p-3 text-sky-950 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-100">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <FlaskConical className="h-4 w-4" aria-hidden="true" /> Test mode: no real money moves
      </p>
      <p className="text-xs opacity-90">
        {provider === 'chapa'
          ? "On Chapa's page, choose a method, paste one of these, then tap “Pay using Test Mode”."
          : "On the card page, paste a test card, use any future date and any CVC, then pay."}
      </p>
      {provider === 'chapa' && (
        <div role="tablist" aria-label="Test payment method" className="flex gap-2">
          {(['phone', 'card'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`min-h-9 rounded-full px-3 text-xs font-semibold ${tab === t ? 'bg-sky-600 text-white' : 'border border-sky-300 text-sky-900 dark:text-sky-100'}`}>
              {t === 'phone' ? 'Phone (telebirr, banks)' : 'Card'}
            </button>
          ))}
        </div>
      )}
      {provider === 'chapa' && tab === 'phone' ? (
        <ul className="space-y-2.5">
          {CHAPA_TEST_PHONES.map((g) => (
            <li key={g.providers} className="space-y-1">
              <p className="text-xs font-medium">{g.providers}{g.otp ? ` · OTP ${g.otp}` : ''}</p>
              <div className="flex flex-wrap gap-1.5">{g.numbers.map((n) => <CopyValue key={n} value={n} label={`${g.providers} test number ${n}`} />)}</div>
            </li>
          ))}
          <li className="text-xs opacity-80">Any other number shows a failed payment.</li>
        </ul>
      ) : (
        <Cards cards={provider === 'chapa' ? CHAPA_TEST_CARDS : STRIPE_TEST_CARDS} />
      )}
    </section>
  );
}
