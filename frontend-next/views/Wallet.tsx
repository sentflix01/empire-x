'use client';
import React, { useState, useEffect } from "react";
import client from "@/api/client";
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import moment from "moment";
import { useTranslation } from "react-i18next";

const TX_ICONS = {
  credit: { icon: ArrowDownLeft, color: "text-green-600 bg-green-50" },
  debit: { icon: ArrowUpRight, color: "text-red-600 bg-red-50" },
  withdrawal: { icon: ArrowUpRight, color: "text-blue-600 bg-blue-50" },
  refund: { icon: ArrowDownLeft, color: "text-purple-600 bg-purple-50" },
};

export default function Wallet() {
  const { t } = useTranslation();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [topupAmount, setTopupAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNum, setAccountNum] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => { loadWallet(); }, []);

  const loadWallet = async () => {
    try {
      const { data } = await client.get("/api/wallet/me");
      setWallet(data);
    } catch {}
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
      toast.success(data.message || t('wallet.withdrawFailed'));
    } catch (e) { toast.error(e?.response?.data?.error || t('wallet.withdrawFailed')); }
    setProcessing(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <WalletIcon className="w-6 h-6 text-amber-500"/>
          <h1 className="font-display text-2xl font-bold">{t('wallet.title')}</h1>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white mb-6">
          <p className="text-sm text-white/70 mb-1">{t('wallet.availableBalance')}</p>
          <p className="text-4xl font-bold">{wallet?.balance?.toLocaleString() || "0"}</p>
          <p className="text-sm text-white/70 mt-1">{wallet?.currency || "ETB"}</p>
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
                    <p className="text-xs text-muted-foreground">{moment(tx.created_at).fromNow()}</p>
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
            <Button onClick={handleTopup} disabled={processing||!topupAmount} className="w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600">
              {processing ? t('wallet.processing') : t('wallet.topUpBtn')}
            </Button>
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



