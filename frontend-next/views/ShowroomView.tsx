// @ts-nocheck
'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { entities } from "@/api/entities";
import client from "@/api/client";
import { auth } from "@/api/auth";
import { useTranslation } from 'react-i18next';

import { ArrowLeft, QrCode, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import SectionRenderer, { resolveCtaTarget, firstProductsIndex } from "@/components/showroom/SectionRenderer";
import ErrorBoundary from '@/components/ErrorBoundary';

function ShowroomView() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id;
  const slugParam = params.slug;
  const router = useRouter();
  const [showroom, setShowroom] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [user, setUser] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    auth.me().then(setUser).catch(() => {}).finally(() => setAuthResolved(true));
    loadShowroom();
  }, [id, slugParam]);

  const loadShowroom = async () => {
    setLoading(true);
    try {
      // Slug route (/showroom/[slug]) uses the public slug endpoint; id route uses the entity API
      const s = slugParam
        ? (await client.get(`/api/showrooms/slug/${slugParam}`)).data
        : await entities.Showroom.get(id);
      setShowroom(s);
      const prods = await entities.Product.filter({ seller_id: s.owner_id, status: "active" }, "-created_at", 24);
      setProducts(prods);
    } catch {
      setShowroom(null);
    }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;
  if (!showroom) return <UnavailableNotice title="Showroom not found" message="This mini-website doesn't exist or has been removed." />;


  const sections = (() => { try { return JSON.parse(showroom.sections); } catch { return []; } })();
  const ctaTarget = resolveCtaTarget(sections);
  const productsIdx = firstProductsIndex(sections);

  const isOwner = user?.id === showroom.owner_id;

  // Public access rule: only published showrooms are viewable; drafts/archived stay owner-only.
  // Wait for auth to resolve so owners previewing their own draft don't flash the notice.
  if (showroom.status !== "published" && !(authResolved && isOwner)) {
    if (!authResolved) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;
    return <UnavailableNotice title="Showroom unavailable" message="This mini-website is not publicly available." />;
  }

  // Canonical share URL — slug-based when available (stable, human-readable)
  const showroomUrl = typeof window !== 'undefined'
    ? showroom.slug
      ? `${window.location.origin}/showroom/${showroom.slug}`
      : `${window.location.origin}/showrooms/${showroom.id}`
    : '';
  const themeColor = showroom.theme_color || "#D4AF37";
  const profile = {
    ...showroom,
    business_name: showroom.title,
    business_description: showroom.description,
    display_name: showroom.title,
  };

  return (
    <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            {showroom.status !== "published" && isOwner && (
              <Badge variant="outline" className="text-amber-600 border-amber-400/50">Draft preview</Badge>
            )}
            {isOwner && (
              <>
                <Badge variant="outline">{showroom.status}</Badge>
                <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => setShowQr(v => !v)}>
                  <QrCode className="w-3 h-3 mr-1" /> QR Code
                </Button>
              </>
            )}
          </div>
        </div>

        {showQr && (
          <div className="bg-card rounded-2xl border border-border/50 p-6 mb-4 flex flex-col items-center gap-3">
            <h3 className="font-semibold text-sm">Showroom QR Code</h3>
            <QRCodeSVG value={showroomUrl} size={180} level="H" includeMargin />
            <p className="text-xs text-muted-foreground text-center">Scan to visit {showroom.title}</p>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
          {sections.map((section, i) => (
            <SectionRenderer
              key={i}
              section={section}
              sectionIndex={i}
              products={section.type === "products" || section.type === "featured_products" ? products : []}
              themeColor={themeColor}
              profile={profile}
              isOwner={isOwner}
              showProductLinks
              ctaTarget={ctaTarget}
              isPrimaryProducts={i === productsIdx}
            />
          ))}
          {!sections.some(s => s.type === "contact") && (
            <SectionRenderer section={{ type: "contact", title: "Get in Touch" }} sectionIndex={sections.length} themeColor={themeColor} profile={profile} />
          )}
          <div className="px-5 py-6 bg-secondary text-center">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {showroom.title}. Powered by Empire X 👑</p>
          </div>
        </div>
      </div>
  );
}

/** 404-like notice for missing / unpublished showrooms viewed anonymously */
function UnavailableNotice({ title, message }: { title: string; message: string }) {
  return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <Crown className="w-12 h-12 text-amber-400/40 mx-auto mb-3" />
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
      <Link href="/" className="inline-block mt-4">
        <Button variant="outline" className="rounded-full">Go Home</Button>
      </Link>
    </div>
  );
}

export default function ShowroomViewPage() {
  return <ErrorBoundary><ShowroomView /></ErrorBoundary>;
}
