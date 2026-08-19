'use client'
import React, { useState, useEffect } from "react";
import client from "@/api/client";
import { auth } from "@/api/auth";
import { Copy, Check, Gift, Users, Star, Share2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import ErrorBoundary from '@/components/ErrorBoundary';

function Referral() {
  const { t } = useTranslation();
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [points, setPoints] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [refRes, profileRes] = await Promise.allSettled([
        client.get("/api/referral/my-code"),
        client.get("/api/profiles/me"),
      ]);
      if (refRes.status === "fulfilled") setReferralData(refRes.value.data);
      if (profileRes.status === "fulfilled") setPoints(profileRes.value.data?.points ?? null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load referral data");
    }
    setLoading(false);
  };

  const copyCode = async () => {
    if (!referralData?.code) return;
    await navigator.clipboard.writeText(referralData.code);
    setCodeCopied(true);
    toast.success(t('referral.copied'));
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyLink = async () => {
    if (!referralData?.referral_link) return;
    await navigator.clipboard.writeText(referralData.referral_link);
    setLinkCopied(true);
    toast.success(t('referral.copied'));
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!referralData?.referral_link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Nodbusiness",
          text: "Join me on Nodbusiness — the superapp for social, commerce, and services. Use my referral link to get 20 bonus points!",
          url: referralData.referral_link,
        });
      } catch (err: any) {
        // User cancelled share — not an error worth toasting
        if (err?.name !== 'AbortError') copyLink();
      }
    } else {
      copyLink();
    }
  };

  const handleApply = async () => {
    if (!applyCode.trim()) return;
    setApplying(true);
    try {
      const { data } = await client.post("/api/referral/apply", { code: applyCode.trim() });
      toast.success(data.message || "Referral applied! You earned 20 points 🎉");
      setApplyCode("");
      loadData();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to apply referral code");
    }
    setApplying(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Referral Program</h1>
          <p className="text-sm text-muted-foreground">Invite friends, earn points together</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border/50 rounded-2xl p-4 text-center">
          <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-2">
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold">{referralData?.total_referred ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Friends Referred</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 text-center">
          <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-2">
            <Star className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold">{(referralData?.total_referred ?? 0) * 50}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Points Earned</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 text-center">
          <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-2">
            <Gift className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold">{points ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">My Total Points</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
        <h2 className="font-bold text-base mb-3">How it works</h2>
        <div className="space-y-2.5">
          {[
            { step: "1", text: "Share your unique referral code or link with friends" },
            { step: "2", text: "Your friend signs up and enters your code" },
            { step: "3", text: "You earn 50 points · They earn 20 welcome points" },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {step}
              </span>
              <p className="text-sm text-white/90">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Your referral code */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-sm">Your Referral Code</h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-secondary/50 rounded-xl px-4 py-3 font-mono text-lg font-bold tracking-widest text-amber-600 text-center select-all">
            {referralData?.code ?? "—"}
          </div>
          <Button variant="outline" size="icon" onClick={copyCode} className="h-12 w-12 rounded-xl shrink-0">
            {codeCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Referral Link</p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={referralData?.referral_link ?? ""}
              className="text-xs rounded-xl bg-secondary/30 border-border/50 h-9"
            />
            <Button variant="outline" size="icon" onClick={copyLink} className="h-9 w-9 rounded-xl shrink-0">
              {linkCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        <Button
          onClick={shareLink}
          className="w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 font-semibold"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share with Friends
        </Button>
      </div>

      {/* Apply a referral code */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
        <div>
          <h2 className="font-semibold text-sm">Have a Referral Code?</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Enter a friend's code to earn 20 welcome points</p>
        </div>
        <div className="flex gap-2">
          <Input
            value={applyCode}
            onChange={e => setApplyCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC12345"
            maxLength={8}
            className="rounded-xl font-mono tracking-wider uppercase"
            onKeyDown={e => { if (e.key === "Enter") handleApply(); }}
          />
          <Button
            onClick={handleApply}
            disabled={applying || !applyCode.trim()}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shrink-0"
          >
            {applying ? "Applying…" : t('common.apply')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReferralPage() {
  return <ErrorBoundary><Referral /></ErrorBoundary>;
}
