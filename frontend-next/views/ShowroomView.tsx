'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { entities } from "@/api/entities";
import client from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { useTranslation } from 'react-i18next';

import { ArrowLeft, QrCode, Crown, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import SectionRenderer, { resolveCtaTarget, firstProductsIndex } from "@/components/showroom/SectionRenderer";
import PurchaseModal from "@/components/checkout/PurchaseModal";
import ErrorBoundary from '@/components/ErrorBoundary';
import { toast } from "sonner";

/* ── Lightweight inquiry / "Get Quote" modal ─────────────────────────────── */
function GetQuoteModal({ serviceName, serviceDesc, businessName, ownerId, onClose }: {
  serviceName: string;
  serviceDesc?: string;
  businessName: string;
  ownerId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(`Hi, I'm interested in your ${serviceName} service. Please send me a quote.`);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error('Please enter your name and phone number');
      return;
    }
    setSending(true);
    try {
      // Send inquiry as a direct message to the business owner
      await client.post('/api/messages/inquiry', {
        receiver_id: ownerId,
        subject: `Quote Request: ${serviceName}`,
        body: `Name: ${name}\nPhone: ${phone}${email ? `\nEmail: ${email}` : ''}\n\n${message}`,
      });
      toast.success('Inquiry sent! The business will contact you shortly.');
      onClose();
    } catch {
      // Fallback: create a notification for the owner
      try {
        await client.post('/api/notifications', {
          user_id: ownerId,
          type: 'inquiry',
          title: `Quote Request: ${serviceName}`,
          body: `${name} (${phone}) is requesting a quote for ${serviceName}.`,
        });
        toast.success('Inquiry sent! The business will contact you shortly.');
        onClose();
      } catch {
        toast.error('Could not send inquiry. Please contact the business directly.');
      }
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'hsl(var(--card))' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50" style={{ backgroundColor: 'hsl(var(--card))' }}>
          <div>
            <h2 className="font-display text-base font-bold">Request a Quote</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{serviceName} · {businessName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {serviceDesc && (
            <p className="text-xs text-muted-foreground bg-secondary/40 rounded-xl px-3 py-2">{serviceDesc}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Your Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="mt-1 h-10" />
            </div>
            <div>
              <Label className="text-xs">Phone *</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900..." className="mt-1 h-10" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Email (optional)</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="mt-1 h-10" />
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={sending || !name.trim() || !phone.trim()}
            className="w-full h-11 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold"
          >
            {sending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
              : <><Send className="w-4 h-4 mr-2" />Send Inquiry</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
  const { user } = useAuth();
  const [authResolved] = useState(true); // auth state from useAuth is synchronous
  const [purchaseItem, setPurchaseItem] = useState(null);
  const [quoteItem, setQuoteItem] = useState<{ name: string; desc?: string } | null>(null);

  useEffect(() => {
    loadShowroom();
  }, [id, slugParam]);

  const loadShowroom = async () => {
    setLoading(true);
    try {
      const s = slugParam
        ? (await client.get(`/api/showrooms/slug/${slugParam}`)).data
        : await entities.Showroom.get(id as string);
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

  if (showroom.status !== "published" && !(authResolved && isOwner)) {
    if (!authResolved) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;
    return <UnavailableNotice title="Showroom unavailable" message="This mini-website is not publicly available." />;
  }

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

  // Handler called by SectionRenderer when a priced service or product is clicked
  const handleBuy = (item) => {
    if (!user) { router.push('/login'); return; }
    setPurchaseItem(item);
  };

  // Handler for "Get Quote" service items
  const handleGetQuote = (serviceName: string, serviceDesc?: string) => {
    if (!user) { router.push('/login'); return; }
    setQuoteItem({ name: serviceName, desc: serviceDesc });
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
              onBuy={isOwner ? undefined : handleBuy}
              onGetQuote={isOwner ? undefined : handleGetQuote}
              ctaTarget={ctaTarget}
              isPrimaryProducts={i === productsIdx}
            />
          ))}
          {!sections.some(s => s.type === "contact") && (
            <SectionRenderer section={{ type: "contact", title: "Get in Touch" }} sectionIndex={sections.length} themeColor={themeColor} profile={profile} />
          )}
          <div className="px-5 py-6 bg-secondary text-center">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {showroom.title}. Powered by Nodbusiness 👑</p>
          </div>
        </div>

        {/* Payment modal — opens when user clicks a priced service or product */}
        {purchaseItem && (
          <PurchaseModal
            item={purchaseItem}
            seller={{ user_id: showroom.owner_id, business_name: showroom.title }}
            buyer={user ? { id: user.id, full_name: user.full_name, email: user.email } : undefined}
            onClose={() => setPurchaseItem(null)}
            onPurchased={() => setPurchaseItem(null)}
          />
        )}

        {/* Get Quote modal — opens when user clicks a "Get Quote" service */}
        {quoteItem && (
          <GetQuoteModal
            serviceName={quoteItem.name}
            serviceDesc={quoteItem.desc}
            businessName={showroom.title}
            ownerId={showroom.owner_id}
            onClose={() => setQuoteItem(null)}
          />
        )}
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
