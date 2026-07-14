'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import { useTranslation } from 'react-i18next';

import { ArrowLeft, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import SectionRenderer from "@/components/showroom/SectionRenderer";

export default function ShowroomView() {
  const { t } = useTranslation();
  const { id } = useParams();
  const router = useRouter();
  const [showroom, setShowroom] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [user, setUser] = useState(null);
  const showroomUrl = typeof window !== 'undefined' ? `${window.location.origin}/showrooms/${id}` : '';

  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
    loadShowroom();
  }, [id]);

  const loadShowroom = async () => {
    setLoading(true);
    try {
      const s = await entities.Showroom.get(id);
      setShowroom(s);
      const prods = await entities.Product.filter({ seller_id: s.owner_id, status: "active" }, "-created_at", 24);
      setProducts(prods);
    } catch {
      setShowroom(null);
    }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;
  if (!showroom) return <div className="text-center py-20"><p>Showroom not found</p></div>;

  const sections = (() => { try { return JSON.parse(showroom.sections); } catch { return []; } })();
  const isOwner = user?.id === showroom.owner_id;
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
          {isOwner && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">{showroom.status}</Badge>
              <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => setShowQr(v => !v)}>
                <QrCode className="w-3 h-3 mr-1" /> QR Code
              </Button>
            </div>
          )}
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




