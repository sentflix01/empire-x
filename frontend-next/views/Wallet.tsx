
'use client';
import React, { useState, useEffect } from "react";
import client from "@/lib/api/client";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fromNow } from "@/lib/date";
import { useTranslation } from "react-i18next";
import ErrorBoundary from "@/components/ErrorBoundary";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { formatAmount } from "@/lib/money";

/** GET /api/wallet/me (backend routes/wallet.ts). Money columns are NUMERIC, so they arrive as decimal strings. */
interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit' | 'withdrawal' | 'refund';
  amount: number | string;
  description?: string | null;
  created_at: string;
}
interface WalletData {
  id: string;
  balance: number | string;
  currency?: string | null;
  transactions?: WalletTransaction[];
}

const TX_ICONS: Record<WalletTransaction['type'], { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  credit: { icon: ArrowDownLeft, color: "text-success bg-success-subtle" },
  debit: { icon: ArrowUpRight, color: "text-destructive bg-destructive-subtle" },
  withdrawal: { icon: ArrowUpRight, color: "text-primary bg-primary/10" },
  refund: { icon: ArrowDownLeft, color: "text-accent bg-accent/10" },
};

function Wallet() {
  const { t } = useTranslation();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState("overview");
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
    } catch (e) { toast.error(apiErrorMessage(e, t('wallet.withdrawFailed'))); }
    setProcessing(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"/></div>;

  if (loadError) return (
    <div className="max-w-lg mx-auto text-center py-20">
      <WalletIcon className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
      <p className="text-sm text-destructive font-medium">{loadError}</p>
      <button onClick={() => { setLoading(true); loadWallet(); }} className="mt-3 text-xs text-primary hover:underline font-medium">Retry</button>
    </div>
  );

  return (
    <div data-page-guide="wallet-balance" className="max-w-lg mx-auto">
        {/* Payment return banner */}
        {returnBanner === 'success' && (
          <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-success-subtle border border-success/30 text-success-subtle-foreground">
            <svg className="w-5 h-5 shrink-0 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <div>
              <p className="font-semibold text-sm">Top-up Successful!</p>
              <p className="text-xs text-success">Your wallet balance has been updated.</p>
            </div>
            <button onClick={() => setReturnBanner(null)} className="ml-auto text-success hover:text-success">✕</button>
          </div>
        )}
        {returnBanner === 'cancelled' && (
          <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-primary-subtle border border-primary/30 text-primary-subtle-foreground">
            <svg className="w-5 h-5 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            <div>
              <p className="font-semibold text-sm">Top-up Cancelled</p>
              <p className="text-xs text-primary">You were not charged. Try again whenever you're ready.</p>
            </div>
            <button onClick={() => setReturnBanner(null)} className="ml-auto text-primary hover:text-primary">✕</button>
          </div>
        )}
        {returnBanner === 'failed' && (
          <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-destructive-subtle border border-destructive/30 text-destructive-subtle-foreground">
            <svg className="w-5 h-5 shrink-0 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            <div>
              <p className="font-semibold text-sm">Top-up Failed</p>
              <p className="text-xs text-destructive">Payment was not completed. Please try again.</p>
            </div>
            <button onClick={() => setReturnBanner(null)} className="ml-auto text-destructive hover:text-destructive">✕</button>
          </div>
        )}
        <div className="flex items-center gap-2 mb-6">
          <WalletIcon className="w-6 h-6 text-primary"/>
          <h1 className="font-display text-2xl font-bold">{t('wallet.title')}</h1>
        </div>
        <div data-page-guide="wallet-balance" className="bg-primary rounded-2xl p-6 text-white mb-6">
          <p className="text-sm text-white/70 mb-1">{t('wallet.availableBalance')}</p>
          <p className="text-4xl font-bold">{formatAmount(wallet?.balance) || "0"}</p>
          <p data-page-guide="wallet-currency" className="text-sm text-white/70 mt-1">{wallet?.currency || "ETB"}</p>
        </div>
        <div data-page-guide="wallet-filter" className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 mb-5">
          {["overview","withdraw"].map(t2=>(
            <button key={t2} onClick={()=>setTab(t2)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${tab===t2?"bg-primary text-white":"text-muted-foreground hover:bg-secondary"}`}>
              {t2 === "topup" ? t('wallet.topUp') : t2 === "withdraw" ? t('wallet.withdraw') : t('wallet.history')}
            </button>
          ))}
        </div>
        {tab === "overview" && (
          <div data-page-guide="wallet-transactions" className="bg-card rounded-2xl border border-border/50 overflow-hidden">
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
                  <p className={`text-sm font-bold shrink-0 ${tx.type==="credit"||tx.type==="refund" ? "text-success" : "text-destructive"}`}>
                    {tx.type==="credit"||tx.type==="refund" ? "+" : "-"}{formatAmount(tx.amount)} {wallet.currency || "ETB"}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* NodBusiness never holds funds (docs/decisions/platform-model-decisions.md §1):
            the wallet no longer accepts money. Existing balances can still be withdrawn. */}
        <p data-page-guide="wallet-topup" className="text-xs text-muted-foreground px-1">The wallet no longer accepts top-ups. NodBusiness never holds your money; buyers pay sellers directly. You can withdraw any existing balance.</p>
        {tab === "withdraw" && (
          <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
            <p className="text-sm text-muted-foreground">{t('wallet.withdrawDesc')}</p>
            <div><Label>{t('wallet.amount')}</Label><Input type="number" value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} placeholder={t('wallet.amountPlaceholder')} className="mt-1"/></div>
            <div><Label>{t('wallet.bankName')}</Label><Input value={bankName} onChange={e=>setBankName(e.target.value)} placeholder={t('wallet.bankPlaceholder')} className="mt-1"/></div>
            <div><Label>{t('wallet.accountNumber')}</Label><Input value={accountNum} onChange={e=>setAccountNum(e.target.value)} placeholder={t('wallet.accountPlaceholder')} className="mt-1"/></div>
            <Button data-page-guide="wallet-payout" onClick={handleWithdraw} disabled={processing||!withdrawAmount||!bankName||!accountNum} className="w-full rounded-full bg-primary">
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
