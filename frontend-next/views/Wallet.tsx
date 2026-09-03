
'use client';
import React, { useState, useEffect } from "react";
import client from "@/api/client";
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fromNow } from "@/lib/date";
import { useTranslation } from "react-i18next";
import ErrorBoundary from "@/components/ErrorBoundary";

const TX_ICONS = {
  credit: { icon: ArrowDownLeft, color: "text-green-600 bg-green-50" },
  debit: { icon: ArrowUpRight, color: "text-red-600 bg-red-50" },
  withdrawal: { icon: ArrowUpRight, color: "text-primary bg-primary/10" },
  refund: { icon: ArrowDownLeft, color: "text-accent bg-accent/10" },
};

function Wallet() {
  const { t } = useTranslation();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState("overview");
  const [topupAmount, setTopupAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNum, setAccountNum] = useState("");
  const [processing, setProcessing] = useState(false);
  const [returnBanner, setReturnBanner] = useState<"success"|"cancelled"|"failed"|null>(null);

  useEffect(() => {
    loadWallet();
    // Handle Stripe / Chapa return redirects
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const topup = params.get('topup');
      if (topup === 'success') {
        setReturnBanner('success');
        toast.success('💳 Top-up confirmed! Your balance has been updated.');
        window.history.replaceState({}, '', '/wallet');
      } else if (topup === 'cancelled') {
        setReturnBanner('cancelled');
        toast.info('Top-up cancelled — you were not charged.');
        window.history.replaceState({}, '', '/wallet');
      } else if (topup === 'failed') {
        setReturnBanner('failed');
        toast.error('Top-up was not completed. Please try again.');
        window.history.replaceState({}, '', '/wallet');
      }
    }
  }, []);

  const loadWallet = async () => {
    try {
      const { data } = await client.get("/api/wallet/me");
      setWallet(data);
      setLoadError('');
    } catch (err: any) {
      setLoadError(err?.error || err?.message || 'Failed to load wallet');
    }
    setLoading(false);
  };

  const handleTopup = async () => {
    if (!topupAmount || parseFloat(topupAmount) <= 0) return;
    setProcessing(true);
    try {
      await client.post("/api/wallet/topup", { amount: parseFloat(topupAmount) });
      setTopupAmount("");
      await loadWallet();
      toast.success(t('wallet.topUpSuccess'));
    } catch (e) { toast.error(e?.response?.data?.error || t('wallet.topUpFailed')); }
    setProcessing(false);
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !bankName || !accountNum) return;
    setProcessing(true);
    try {
      const { data } = await client.post("/api/wallet/withdraw", {
        amount: parseFloat(withdrawAmount), bank_name: bankName, account_number: accountNum
      });
      setWithdrawAmount(""); setBankName(""); setAccountNum("");
      await loadWallet();
      toast.success(data.message || t('wallet.withdrawSuccess'));
    } catch (e) { toast.error(e?.response?.data?.error || t('wallet.withdrawFailed')); }
    setProcessing(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"/></div>;

  if (loadError) return (
    <div className="max-w-lg mx-auto text-center py-20">
      <WalletIcon className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
      <p className="text-sm text-destructive font-medium">{loadError}</p>
      <button onClick={() => { setLoading(true); loadWallet(); }} className="mt-3 text-xs text-amber-600 hover:underline font-medium">Retry</button>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto">
        {/* Payment return banner */}
        {returnBanner === 'success' && (
          <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200 text-green-800">
            <svg className="w-5 h-5 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <div>
              <p className="font-semibold text-sm">Top-up Successful!</p>
              <p className="text-xs text-green-700">Your wallet balance has been updated.</p>
            </div>
            <button onClick={() => setReturnBanner(null)} className="ml-auto text-green-500 hover:text-green-700">✕</button>
          </div>
        )}
        {returnBanner === 'cancelled' && (
          <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
            <svg className="w-5 h-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            <div>
              <p className="font-semibold text-sm">Top-up Cancelled</p>
              <p className="text-xs text-amber-700">You were not charged. Try again whenever you're ready.</p>
            </div>
            <button onClick={() => setReturnBanner(null)} className="ml-auto text-amber-500 hover:text-amber-700">✕</button>
          </div>
        )}
        {returnBanner === 'failed' && (
          <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800">
            <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            <div>
              <p className="font-semibold text-sm">Top-up Failed</p>
              <p className="text-xs text-red-700">Payment was not completed. Please try again.</p>
            </div>
            <button onClick={() => setReturnBanner(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}
        <div className="flex items-center gap-2 mb-6">
          <WalletIcon className="w-6 h-6 text-amber-500"/>
          <h1 className="font-display text-2xl font-bold">{t('wallet.title')}</h1>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white mb-6">
          <p className="text-sm text-white/70 mb-1">{t('wallet.availableBalance')}</p>
          <p className="text-4xl font-bold">{wallet?.balance?.toLocaleString() || "0"}</p>
          <p className="text-sm text-white/70 mt-1">{wallet?.currency || "USD"}</p>
        </div>
        <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 mb-5">
          {["overview","topup","withdraw"].map(t2=>(
            <button key={t2} onClick={()=>setTab(t2)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${tab===t2?"bg-amber-500 text-white":"text-muted-foreground hover:bg-secondary"}`}>
              {t2 === "topup" ? t('wallet.topUp') : t2 === "withdraw" ? t('wallet.withdraw') : t('wallet.history')}
            </button>
          ))}
        </div>
        {tab === "overview" && (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            {!wallet?.transactions?.length ? (
              <div className="text-center py-12 text-muted-foreground text-sm">{t('wallet.noTransactions')}</div>
            ) : wallet.transactions.map(tx => {
              const cfg = TX_ICONS[tx.type] || TX_ICONS.credit;
              const Icon = cfg.icon;
              return (
                <div key={tx.id} className="flex items-center gap-3 p-4 border-b border-border/30 last:border-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                    <Icon className="w-4 h-4"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                    <p className="text-xs text-muted-foreground">{fromNow(tx.created_at)}</p>
                  </div>
                  <p className={`text-sm font-bold shrink-0 ${tx.type==="credit"||tx.type==="refund" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type==="credit"||tx.type==="refund" ? "+" : "-"}{tx.amount?.toLocaleString()} ETB
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {tab === "topup" && (
          <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
            <p className="text-sm text-muted-foreground">{t('wallet.topUpDesc')}</p>
            <div><Label>{t('wallet.amount')}</Label><Input type="number" value={topupAmount} onChange={e=>setTopupAmount(e.target.value)} placeholder={t('wallet.amountPlaceholder')} className="mt-1"/></div>

            {/* Chapa — ETB top-up (primary) */}
            <Button
              disabled={processing || !topupAmount || parseFloat(topupAmount) <= 0}
              className="w-full rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold"
              onClick={async () => {
                setProcessing(true);
                try {
                  const { data } = await client.post("/api/wallet/topup/chapa", {
                    amount: parseFloat(topupAmount),
                  });
                  if (data?.checkout_url) window.location.href = data.checkout_url;
                  else toast.error("Chapa unavailable — use manual top-up or add CHAPA_SECRET_KEY");
                } catch (e) {
                  toast.error(e?.response?.data?.error || "Chapa top-up unavailable");
                }
                setProcessing(false);
              }}
            >
              {processing ? "Processing..." : `🇪🇹 Top Up with Chapa • ${parseFloat(topupAmount || "0").toLocaleString()} ETB`}
            </Button>

            {/* Stripe — cards, wallets & local payment methods */}
            <Button
              disabled={processing || !topupAmount || parseFloat(topupAmount) <= 0}
              className="w-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-semibold"
              onClick={async () => {
                setProcessing(true);
                try {
                  const { data } = await client.post("/api/wallet/topup/stripe", {
                    amount: parseFloat(topupAmount),
                  });
                  if (data?.checkout_url) {
                    if (data.display?.currency === "USD") {
                      toast.info(`You'll be charged ${data.display.amount.toLocaleString()} USD ≈ ${parseFloat(topupAmount).toLocaleString()} ETB`);
                    }
                    window.location.href = data.checkout_url;
                    return; // keep spinner up while redirecting
                  }
                  toast.error("Stripe unavailable — use the Chapa top-up instead");
                } catch (e) {
                  toast.error(e?.response?.data?.error || "Stripe top-up unavailable");
                }
                setProcessing(false);
              }}
            >
              {processing ? "Processing..." : `💳 Top Up with Card & Wallets • ${parseFloat(topupAmount || "0").toLocaleString()} ETB`}
            </Button>

            {/* Manual / admin top-up — only visible to admin users */}
            {(wallet as any)?.user_role === 'admin' && (
              <Button onClick={handleTopup} variant="outline" disabled={processing||!topupAmount} className="w-full rounded-full border-amber-300 text-amber-700">
                {processing ? t('wallet.processing') : t('wallet.topUpBtn') + " (Admin Test)"}
              </Button>
            )}
          </div>
        )}
        {tab === "withdraw" && (
          <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
            <p className="text-sm text-muted-foreground">{t('wallet.withdrawDesc')}</p>
            <div><Label>{t('wallet.amount')}</Label><Input type="number" value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} placeholder={t('wallet.amountPlaceholder')} className="mt-1"/></div>
            <div><Label>{t('wallet.bankName')}</Label><Input value={bankName} onChange={e=>setBankName(e.target.value)} placeholder={t('wallet.bankPlaceholder')} className="mt-1"/></div>
            <div><Label>{t('wallet.accountNumber')}</Label><Input value={accountNum} onChange={e=>setAccountNum(e.target.value)} placeholder={t('wallet.accountPlaceholder')} className="mt-1"/></div>
            <Button onClick={handleWithdraw} disabled={processing||!withdrawAmount||!bankName||!accountNum} className="w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600">
              {processing ? t('wallet.submitting') : t('wallet.withdrawBtn')}
            </Button>
          </div>
        )}
      </div>
  );
}





export default function WalletPage() {
  return <ErrorBoundary><Wallet /></ErrorBoundary>;
}
