'use client';
/**
 * PaymentAccountsManager — lets a business owner list the accounts buyers pay
 * them with directly (bank, mobile money). NodBusiness never holds funds; these
 * details are shown to buyers in the Buy view. Backed by
 * /api/businesses/:id/payment-accounts (owner only).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface PaymentAccount {
  id: string;
  method: 'bank' | 'mobile_money' | 'other';
  provider_name: string;
  account_name: string;
  account_number: string;
  instructions: string | null;
  is_active: boolean;
}

const METHOD_LABELS: Record<PaymentAccount['method'], string> = {
  bank: 'Bank transfer',
  mobile_money: 'Mobile money',
  other: 'Other',
};

const EMPTY = { method: 'bank' as PaymentAccount['method'], provider_name: '', account_name: '', account_number: '', instructions: '' };

export default function PaymentAccountsManager({ businessId }: { businessId: string }) {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await client.get<PaymentAccount[]>(`/api/businesses/${businessId}/payment-accounts`);
      setAccounts(data);
    } catch (err: any) {
      toast.error(err?.error ?? 'Could not load payment accounts');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setSaving(true);
    try {
      const { data } = await client.post<PaymentAccount>(`/api/businesses/${businessId}/payment-accounts`, {
        ...draft, instructions: draft.instructions.trim() || null,
      });
      setAccounts((prev) => [...prev, data]);
      setDraft(EMPTY);
      toast.success('Payment account added');
    } catch (err: any) {
      toast.error(err?.error ?? 'Could not add payment account');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (account: PaymentAccount) => {
    try {
      const { data } = await client.put<PaymentAccount>(`/api/businesses/${businessId}/payment-accounts/${account.id}`, { is_active: !account.is_active });
      setAccounts((prev) => prev.map((a) => (a.id === account.id ? data : a)));
    } catch (err: any) {
      toast.error(err?.error ?? 'Could not update payment account');
    }
  };

  const remove = async (account: PaymentAccount) => {
    try {
      await client.delete(`/api/businesses/${businessId}/payment-accounts/${account.id}`);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
    } catch (err: any) {
      toast.error(err?.error ?? 'Could not delete payment account');
    }
  };

  const canAdd = draft.provider_name.trim() && draft.account_name.trim() && draft.account_number.trim();

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-4 space-y-4" aria-labelledby="payment-accounts-heading">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-amber-500" />
        <h2 id="payment-accounts-heading" className="font-semibold">Payment accounts</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Buyers see these on the Buy screen and pay you directly. NodBusiness never receives or holds the money.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payment accounts yet. Add at least one so buyers know how to pay you.</p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-start gap-3 rounded-xl border border-border/50 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{account.provider_name} · {METHOD_LABELS[account.method]}</p>
                <p className="text-xs text-muted-foreground truncate">{account.account_name} · {account.account_number}</p>
                {account.instructions && <p className="text-xs text-muted-foreground mt-1">{account.instructions}</p>}
              </div>
              <Switch checked={account.is_active} onCheckedChange={() => toggle(account)} aria-label={`Show ${account.provider_name} to buyers`} />
              <button type="button" onClick={() => remove(account)} className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${account.provider_name}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 border-t border-border/40 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pa-method">Method</Label>
            <select id="pa-method" value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value as PaymentAccount['method'] })} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
              {Object.entries(METHOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="pa-provider">Bank or service</Label>
            <Input id="pa-provider" value={draft.provider_name} onChange={(e) => setDraft({ ...draft, provider_name: e.target.value })} placeholder="e.g. CBE, telebirr" maxLength={80} className="mt-1 h-11" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pa-name">Account name</Label>
            <Input id="pa-name" value={draft.account_name} onChange={(e) => setDraft({ ...draft, account_name: e.target.value })} maxLength={120} className="mt-1 h-11" />
          </div>
          <div>
            <Label htmlFor="pa-number">Account / phone number</Label>
            <Input id="pa-number" value={draft.account_number} onChange={(e) => setDraft({ ...draft, account_number: e.target.value })} maxLength={60} className="mt-1 h-11" />
          </div>
        </div>
        <div>
          <Label htmlFor="pa-instructions">Instructions (optional)</Label>
          <Input id="pa-instructions" value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} placeholder="e.g. Use your order number as the reference" maxLength={500} className="mt-1 h-11" />
        </div>
        <Button type="button" variant="outline" onClick={add} disabled={!canAdd || saving} className="w-full rounded-full">
          <Plus className="w-4 h-4 mr-1" /> {saving ? 'Adding…' : 'Add payment account'}
        </Button>
      </div>
    </section>
  );
}
