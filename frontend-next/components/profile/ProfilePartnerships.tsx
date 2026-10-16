'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { profilePartnershipsApi, type ProfilePartnership } from '@/api/profilePartnerships';
import { entities } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import PurchaseModal from '@/components/checkout/PurchaseModal';
import SafeImage from '@/components/ui/SafeImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Handshake, ShoppingBag, Clock, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/lib/apiErrorMessage';

type ProfileData = { user_id: string; display_name?: string };
type BusinessData = { id: string; business_name: string };
type ProductData = { id: string; title: string; description?: string; price: number; currency?: string; images?: string };

const defaultEndDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
};

export default function ProfilePartnerships({ profile }: { profile: ProfileData }) {
  const { user } = useAuth();
  const router = useRouter();
  const [storefronts, setStorefronts] = useState<ProfilePartnership[]>([]);
  const [mine, setMine] = useState<ProfilePartnership[]>([]);
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [offerings, setOfferings] = useState<ProductData[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [commissionRows, setCommissionRows] = useState<Array<Record<string, unknown>>>([]);
  const [payoutRows, setPayoutRows] = useState<Array<Record<string, unknown>>>([]);
  const [earned, setEarned] = useState<Record<string, number>>({});
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [rate, setRate] = useState('10');
  const [endsAt, setEndsAt] = useState(defaultEndDate);
  const [busy, setBusy] = useState(false);
  const [purchase, setPurchase] = useState<{ product: ProductData; partnership: ProfilePartnership } | null>(null);

  const reload = useCallback(async () => {
    const publicRows = await profilePartnershipsApi.forProfile(profile.user_id).catch(() => []);
    setStorefronts(publicRows);
    if (!user) return;
    const ownedRows = await profilePartnershipsApi.mine().catch(() => []);
    setMine(ownedRows);
    const [earnings, payouts] = await Promise.all([
      profilePartnershipsApi.commissions().catch(() => ({ commissions: [], totals: { earnedByCurrency: {}, paidByCurrency: {} } })),
      profilePartnershipsApi.payouts().catch(() => []),
    ]);
    setCommissionRows(earnings.commissions);
    setEarned(earnings.totals.earnedByCurrency ?? {});
    setPayoutRows(payouts);
    if (user.id !== profile.user_id) {
      const ownBusinesses = await entities.Business.filter({ owner_id: user.id }, '-created_at', 50).catch(() => []);
      setBusinesses(ownBusinesses as BusinessData[]);
    }
  }, [profile.user_id, user]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedBusiness) { setOfferings([]); setSelectedProductIds([]); return; }
    void profilePartnershipsApi.products(selectedBusiness).then(rows => {
      if (!cancelled) { setOfferings(rows); setSelectedProductIds([]); }
    }).catch(() => {
      if (!cancelled) { setOfferings([]); setSelectedProductIds([]); toast.error('Could not load this business’s active offerings'); }
    });
    return () => { cancelled = true; };
  }, [selectedBusiness]);

  const invites = mine.filter(row => row.profile_owner_id === user?.id && row.status === 'pending');
  const ownedStorefronts = storefronts.filter(row => row.profile_owner_id === profile.user_id);

  const invite = async () => {
    if (!selectedBusiness) { toast.error('Choose one of your businesses first'); return; }
    setBusy(true);
    try {
      await profilePartnershipsApi.create({
        business_id: selectedBusiness,
        profile_owner_id: profile.user_id,
        commission_rate: Number(rate),
        ends_at: new Date(`${endsAt}T23:59:59`).toISOString(),
        product_ids: selectedProductIds,
      });
      toast.success('Partnership offer sent');
      setSelectedBusiness('');
      setSelectedProductIds([]);
      await reload();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not send partnership offer'));
    } finally { setBusy(false); }
  };

  const decide = async (id: string, accepted: boolean) => {
    setBusy(true);
    try {
      if (accepted) await profilePartnershipsApi.accept(id);
      else await profilePartnershipsApi.decline(id);
      toast.success(accepted ? 'Partnership accepted' : 'Offer declined');
      await reload();
    } catch (error) { toast.error(apiErrorMessage(error, 'Could not update partnership')); }
    finally { setBusy(false); }
  };

  const endDeal = async (id: string) => {
    setBusy(true);
    try { await profilePartnershipsApi.terminate(id); toast.success('Partnership ended'); await reload(); }
    catch (error) { toast.error(apiErrorMessage(error, 'Could not end partnership')); }
    finally { setBusy(false); }
  };

  const recordPayout = async (partnershipId: string) => {
    const eligible = commissionRows.filter(row => row.partnership_id === partnershipId && row.status === 'earned');
    if (!eligible.length) return;
    if (!window.confirm(`Record a manual payout of ${eligible.reduce((sum, row) => sum + Number(row.amount || 0), 0).toLocaleString()} ${String(eligible[0].currency || 'ETB')} for ${eligible.length} completed order(s)? Confirm only after paying the profile owner outside the app.`)) return;
    const reference = window.prompt('Optional payment reference (bank/mobile-money receipt ID):') || '';
    setBusy(true);
    try {
      await profilePartnershipsApi.recordPayout(partnershipId, eligible.map(row => String(row.id)), reference);
      toast.success('Manual payout recorded');
      await reload();
    } catch (error) { toast.error(apiErrorMessage(error, 'Could not record payout')); }
    finally { setBusy(false); }
  };

  if (!user && ownedStorefronts.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Profile-owner business partnerships">
      {invites.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Handshake className="w-4 h-4 text-amber-600" /> Partnership offers</h3>
          {invites.map(deal => (
            <div key={deal.id} className="rounded-xl border bg-card p-3 space-y-2">
              <p className="text-sm"><strong>{deal.business_name}</strong> offers you {(Number(deal.commission_rate) * 100).toFixed(1)}% of eligible completed sales until {new Date(deal.ends_at).toLocaleDateString()}.</p>
              <p className="text-xs text-muted-foreground">Accepting adds a clearly labeled business storefront to your profile. Your account remains yours.</p>
              <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={() => void decide(deal.id, true)}>Accept</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void decide(deal.id, false)}>Decline</Button></div>
            </div>
          ))}
        </div>
      )}

      {user && (mine.some(deal => deal.status === 'active') || commissionRows.length > 0 || payoutRows.length > 0) && (
        <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-2">
          <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Partnership commissions</h3><span className="font-bold text-amber-600 text-right">{Object.entries(earned).map(([currency, amount]) => `${amount.toLocaleString()} ${currency}`).join(' · ') || 'No unpaid commission yet'}</span></div>
          <p className="text-xs text-muted-foreground">Commissions are based on the after-discount product subtotal and accrue only when an order is completed. Payouts are manual and must be paid outside the app; this is not a withdrawable wallet balance.</p>
          {mine.filter(deal => deal.status === 'active').map(deal => <div key={deal.id} className="flex flex-wrap justify-between items-center gap-2 border-t pt-2 text-sm"><span>{deal.business_name} · {(Number(deal.commission_rate) * 100).toFixed(1)}% · until {new Date(deal.ends_at).toLocaleDateString()}</span>{deal.profile_owner_id === user.id ? <Button size="sm" variant="outline" disabled={busy} onClick={() => void endDeal(deal.id)}>End partnership</Button> : <Button size="sm" variant="outline" disabled={busy || !commissionRows.some(row => row.partnership_id === deal.id && row.status === 'earned')} onClick={() => void recordPayout(deal.id)}>Record paid payout</Button>}</div>)}
          {commissionRows.slice(0, 10).map((row, index) => <div key={String(row.id ?? index)} className="flex justify-between gap-3 border-t pt-2 text-xs"><span>{String(row.business_name)} · {String(row.product_title)}{Number(row.adjustment_count) > 0 && <span className="block text-muted-foreground">Refund/dispute adjustments: {Number(row.adjustment_delta).toLocaleString()} {String(row.currency)} across {Number(row.adjustment_count)} event(s)</span>}</span><span className="shrink-0 text-right">{Number(row.amount).toLocaleString()} {String(row.currency)} · {String(row.status)}</span></div>)}
          {payoutRows.slice(0, 10).map((row, index) => <div key={String(row.id ?? index)} className="flex justify-between border-t pt-2 text-xs"><span>Manual payout · {String(row.business_name)} · {new Date(String(row.paid_at)).toLocaleDateString()}{row.payment_reference ? ` · Ref ${String(row.payment_reference)}` : ''}</span><span>{Number(row.amount).toLocaleString()} {String(row.currency)}</span></div>)}
        </div>
      )}

      {user && user.id !== profile.user_id && businesses.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Handshake className="w-4 h-4 text-amber-600" /> Invite {profile.display_name || 'this profile'} to partner</h3>
          <p className="text-xs text-muted-foreground">Choose the exact active products or services to feature. They earn the agreed share of each completed referred order’s product subtotal after discounts, excluding delivery and tax.</p>
          <div className="grid sm:grid-cols-3 gap-2">
            <Select value={selectedBusiness} onValueChange={setSelectedBusiness}><SelectTrigger><SelectValue placeholder="Your business" /></SelectTrigger><SelectContent>{businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.business_name}</SelectItem>)}</SelectContent></Select>
            <Input aria-label="Commission percent" type="number" min="0.01" max="50" step="0.01" value={rate} onChange={e => setRate(e.target.value)} placeholder="Commission %" />
            <Input aria-label="Agreement expiry date" type="date" value={endsAt} min={new Date().toISOString().slice(0, 10)} onChange={e => setEndsAt(e.target.value)} />
          </div>
          {selectedBusiness && <fieldset className="rounded-xl border p-3 space-y-2" disabled={busy}>
            <legend className="px-1 text-sm font-medium">Choose offerings</legend>
            {offerings.length === 0 ? <p className="text-xs text-muted-foreground">No active offerings found for this business.</p> : offerings.map(product => <label key={product.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selectedProductIds.includes(product.id)} onChange={event => setSelectedProductIds(current => event.target.checked ? [...current, product.id] : current.filter(id => id !== product.id))} />
              <span className="flex-1">{product.title}</span><span className="text-muted-foreground">{Number(product.price).toLocaleString()} {product.currency}</span>
            </label>)}
          </fieldset>}
          <Button disabled={busy || !selectedBusiness || !rate || !endsAt || selectedProductIds.length === 0} onClick={() => void invite()}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send offer'}</Button>
        </div>
      )}

      {ownedStorefronts.length > 0 && (
        <div className="space-y-3">
          {ownedStorefronts.map(deal => (
            <div key={deal.id} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border/50 bg-secondary/30 p-4">
                {deal.business_logo_url ? <SafeImage src={deal.business_logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><Store className="w-5 h-5" /></div>}
                <div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Partner storefront · authorized by {deal.profile_owner_name}</p><h3 className="font-semibold truncate">{deal.business_name}</h3><p className="text-xs text-muted-foreground">{(Number(deal.commission_rate) * 100).toFixed(1)}% commission on completed orders until {new Date(deal.ends_at).toLocaleDateString()}</p></div>
                <Button size="icon" variant="ghost" aria-label="Copy partnership link" onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/profile/${profile.user_id}?partner=${deal.share_code}`); toast.success('Partnership link copied'); }}><Copy className="w-4 h-4" /></Button>
              </div>
              {deal.business_description && <p className="px-4 pt-3 text-sm text-muted-foreground">{deal.business_description}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                {(deal.products ?? []).map(product => <button key={product.id} className="text-left rounded-xl border border-border/50 overflow-hidden hover:border-amber-400 transition-colors" onClick={() => user && setPurchase({ product, partnership: deal })}>
                  {product.images ? <SafeImage src={(() => { try { return JSON.parse(product.images)[0]; } catch { return product.images; } })()} alt={product.title} className="aspect-square w-full object-cover bg-secondary/30" /> : <div className="aspect-square w-full bg-secondary/30 flex items-center justify-center"><ShoppingBag className="w-7 h-7 text-muted-foreground" /></div>}
                  <div className="p-2"><p className="text-sm font-medium line-clamp-2">{product.title}</p><p className="text-xs font-bold text-amber-600 mt-1">{Number(product.price).toLocaleString()} {product.currency}</p></div>
                </button>)}
              </div>
              {new Date(deal.ends_at) <= new Date() && <p className="px-4 pb-3 text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Agreement expired</p>}
            </div>
          ))}
        </div>
      )}

      {purchase && user && <PurchaseModal
        item={{ ...purchase.product, product_type: 'product' }}
        seller={{ user_id: purchase.partnership.business_owner_id!, business_name: purchase.partnership.business_name }}
        buyer={user}
        partnershipCode={purchase.partnership.share_code}
        onClose={() => setPurchase(null)}
        onPurchased={() => { setPurchase(null); router.refresh(); }}
      />}
    </section>
  );
}
