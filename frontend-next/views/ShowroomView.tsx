'use client';
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { entities } from "@/api/entities";
import client from "@/api/client";
import { useAuth } from "@/lib/AuthContext";

import { ArrowLeft, QrCode, X, Send, Loader2, Check } from "lucide-react";
import BrandLogo from '@/components/brand/BrandLogo';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import SectionRenderer, { resolveCtaTarget, firstProductsIndex, isCatalogueSection } from "@/components/showroom/SectionRenderer";
import NewsletterSignupsPanel from "@/components/showroom/NewsletterSignupsPanel";
import WhatsAppFloat from "@/components/showroom/WhatsAppFloat";
import { siteFontFamily } from "@/lib/siteFonts";
import PurchaseModal from "@/components/checkout/PurchaseModal";
import QRLandingModal from "@/components/showroom/QRLandingModal";
import TryDemoButton from '@/components/landing/TryDemoButton';
import ErrorBoundary from '@/components/ErrorBoundary';
import SignInRequired, { isSignInRequired } from '@/components/auth/SignInRequired';
import { toast } from "sonner";

/* ── Lightweight inquiry / "Get Quote" modal ─────────────────────────────── */
function GetQuoteModal({ serviceName, serviceDesc, businessName, ownerId, isAuthenticated, onClose }: {
  serviceName: string;
  serviceDesc?: string;
  businessName: string;
  ownerId: string;
  isAuthenticated: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(`Hi, I'm interested in ${serviceName}. Please share availability and next steps.`);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!isAuthenticated) return;
    if (!name.trim() || !phone.trim()) {
      toast.error('Please enter your name and phone number');
      return;
    }
    setSending(true);
    try {
      // Send inquiry as a direct message to the business owner
      await client.post('/api/messages/inquiry', {
        receiver_id: ownerId,
        subject: `Service request: ${serviceName}`,
        body: `Name: ${name}\nPhone: ${phone}${email ? `\nEmail: ${email}` : ''}\n\n${message}`,
      });
      toast.success('Request sent. The business will follow up; this is not a confirmed booking.');
      onClose();
    } catch {
      toast.error('Could not send the request. Please sign in again or contact the business directly.');
    } finally {
      setSending(false);
    }
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
            <h2 className="font-display text-base font-bold">Send a request</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{serviceName} · {businessName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">Sign in to send a service request. You can also start a Demo session from the page header.</p>
            <Link href="/login" className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
              Sign in to continue
            </Link>
          </div>
        ) : (
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
              : <><Send className="w-4 h-4 mr-2" />Send Request</>}
          </Button>
        </div>
        )}
      </div>
    </div>
  );
}

function ShowroomView() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const slugParam = params.slug;
  const [showroom, setShowroom] = useState(null);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsLoadingMore, setProductsLoadingMore] = useState(false);
  const [nextProductCursor, setNextProductCursor] = useState<string | null>(null);
  const [productsError, setProductsError] = useState('');
  const catalogRequestId = useRef(0);
  const [loading, setLoading] = useState(true);
  const [signInRequired, setSignInRequired] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const { user } = useAuth();
  const [authResolved] = useState(true); // auth state from useAuth is synchronous
  const [purchaseItem, setPurchaseItem] = useState(null);
  const [quoteItem, setQuoteItem] = useState<{ name: string; desc?: string } | null>(null);

  const loadShowroom = useCallback(async () => {
    setLoading(true);
    setSignInRequired(false);
    try {
      const s = slugParam
        ? (await client.get(`/api/showrooms/slug/${slugParam}`)).data
        : await entities.Showroom.get(id as string);
      setShowroom(s);
    } catch (err) {
      setShowroom(null);
      setSignInRequired(isSignInRequired(err));
    } finally {
      setLoading(false);
    }
  }, [id, slugParam]);

  useEffect(() => {
    loadShowroom();
  }, [loadShowroom]);

  useEffect(() => {
    const ownerId = showroom?.owner_id;
    if (!ownerId) return;

    const requestId = ++catalogRequestId.current;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setProductsLoading(true);
      setProductsLoadingMore(false);
      setProductsError('');
      void entities.Product.filterPage({
          seller_id: ownerId,
          status: 'active',
          ...(productSearch.trim() ? { search: productSearch.trim() } : {}),
          ...(productCategory ? { category: productCategory } : {}),
        }, '-created_at', 24).then(({ items, nextCursor }) => {
        if (cancelled || catalogRequestId.current !== requestId) return;
        setProducts(items);
        setNextProductCursor(nextCursor);
        if (!productSearch.trim() && !productCategory) {
          const categories = [...new Set(items.map(item => String(item.category || '').trim()).filter(Boolean))];
          setProductCategories(categories.sort((a, b) => a.localeCompare(b)));
        }
      }).catch(() => {
        if (cancelled || catalogRequestId.current !== requestId) return;
        setProducts([]);
        setNextProductCursor(null);
        setProductsError('Could not load the catalog. Please try again.');
        toast.error('Could not load the business catalog.');
      }).finally(() => {
        if (!cancelled && catalogRequestId.current === requestId) setProductsLoading(false);
      });
    }, productSearch.trim() ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (catalogRequestId.current === requestId) catalogRequestId.current += 1;
    };
  }, [showroom?.owner_id, productSearch, productCategory]);

  const loadMoreProducts = useCallback(async () => {
    const ownerId = showroom?.owner_id;
    const cursor = nextProductCursor;
    if (!ownerId || !cursor || productsLoadingMore) return;

    const requestId = catalogRequestId.current;
    setProductsLoadingMore(true);
    try {
      const { items, nextCursor } = await entities.Product.filterPage({
        seller_id: ownerId,
        status: 'active',
        ...(productSearch.trim() ? { search: productSearch.trim() } : {}),
        ...(productCategory ? { category: productCategory } : {}),
      }, '-created_at', 24, cursor);
      if (catalogRequestId.current !== requestId) return;
      setProducts(current => {
        const existingIds = new Set(current.map(item => item.id));
        return [...current, ...items.filter(item => !existingIds.has(item.id))];
      });
      setNextProductCursor(nextCursor);
    } catch {
      if (catalogRequestId.current === requestId) {
        toast.error('Could not load more products. Please try again.');
      }
    } finally {
      if (catalogRequestId.current === requestId) setProductsLoadingMore(false);
    }
  }, [showroom?.owner_id, nextProductCursor, productsLoadingMore, productSearch, productCategory]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;
  if (!showroom && signInRequired) return <SignInRequired />;
  if (!showroom) return <UnavailableNotice title="Showroom not found" message="This mini-website doesn't exist or has been removed." />;

  const sections = (() => { try { return JSON.parse(showroom.sections); } catch { return []; } })();
  const ctaTarget = resolveCtaTarget(sections);
  const productsIdx = firstProductsIndex(sections);
  const isOwner = user?.id === showroom.owner_id;
  // Style choices made in Studio travel with the top section (lib/builderSections.ts: siteFont, whatsappButton).
  const hero = sections.find(sec => sec?.type === "hero") ?? {};
  const siteFont = typeof hero.siteFont === "string" && hero.siteFont ? hero.siteFont : null;
  const whatsappNumber = String(sections.find(sec => sec?.type === "contact")?.whatsapp ?? "").replace(/\D/g, "");
  const showWhatsappFloat = hero.whatsappButton !== false && Boolean(whatsappNumber);

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
    // Guests can buy — they'll enter name/phone at checkout
    setPurchaseItem(item);
  };

  // Handler for "Get Quote" service items
  const handleGetQuote = (serviceName: string, serviceDesc?: string) => {
    // Guests can request quotes — they'll enter contact info in the modal
    setQuoteItem({ name: serviceName, desc: serviceDesc });
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/showrooms');
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* QR Landing Modal — shown to first-time unauthenticated visitors */}
      {!user && (
        <QRLandingModal
          businessName={showroom.title}
          businessCategory={showroom.category}
          logoUrl={showroom.logo_url}
          currentPath={typeof window !== 'undefined' ? window.location.pathname : ''}
          themeColor={themeColor}
        />
      )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={handleGoBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Go back
          </button>
          <div className="flex items-center gap-2">
            {!user && <TryDemoButton />}
            {showroom.status !== "published" && isOwner && (
              <Badge variant="outline" className="text-amber-600 border-amber-400/50">Draft preview</Badge>
            )}
            {isOwner && (
              <>
                <Badge variant="outline">{showroom.status}</Badge>
                <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => setShowQr(v => !v)}>
                  <QrCode className="w-3 h-3 mr-1" /> QR Code
                </Button>
                {showroom.status === "published" && (
                  <Link href={`/profile/${showroom.owner_id}?view=business`}>
                    <Button size="sm" className="rounded-full h-8 bg-amber-500 text-white hover:bg-amber-600">
                      <Check className="w-3 h-3 mr-1" /> Finish
                    </Button>
                  </Link>
                )}
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

        {isOwner && sections.some(sec => sec?.type === "newsletter") && <NewsletterSignupsPanel showroomId={String(showroom.id)} />}

        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm" style={siteFont ? { fontFamily: siteFontFamily(siteFont) } : undefined}>
          {sections.map((section, i) => (
            <SectionRenderer
              key={i}
              section={section}
              sectionIndex={i}
              products={isCatalogueSection(section.type) ? products : []}
              productSearch={productSearch}
              productCategory={productCategory}
              productCategories={productCategories}
              productsLoading={productsLoading}
              productsLoadingMore={productsLoadingMore}
              productsError={productsError}
              hasMoreProducts={Boolean(nextProductCursor)}
              onLoadMoreProducts={loadMoreProducts}
              themeColor={themeColor}
              profile={profile}
              isOwner={isOwner}
              showProductLinks
              onBuy={isOwner ? undefined : handleBuy}
              onGetQuote={isOwner ? undefined : handleGetQuote}
              onProductSearchChange={setProductSearch}
              onProductCategoryChange={setProductCategory}
              ctaTarget={ctaTarget}
              isPrimaryProducts={i === productsIdx}
              showroomId={String(showroom.id)}
              businessId={showroom.business_id ?? null}
            />
          ))}
          {!sections.some(s => s.type === "contact") && (
            <SectionRenderer section={{ type: "contact", title: "Get in Touch" }} sectionIndex={sections.length} themeColor={themeColor} profile={profile} />
          )}
          {showWhatsappFloat && <WhatsAppFloat number={whatsappNumber} />}
          <div className="px-5 py-6 bg-secondary text-center">
            <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground">© {new Date().getFullYear()} {showroom.title}. Powered by <BrandLogo className="w-3.5 h-3.5" /> Nodbusiness</p>
          </div>
        </div>

        {/* Payment modal — opens when user clicks a priced service or product */}
        {purchaseItem && (
          <PurchaseModal
            item={purchaseItem}
            seller={{ user_id: showroom.owner_id, business_name: showroom.title }}
            showroomId={showroom.id}
            buyer={user ? { id: user.id, full_name: user.full_name, email: user.email } : undefined}
            onClose={() => setPurchaseItem(null)}
          />
        )}

        {/* Get Quote modal — opens when user clicks a "Get Quote" service */}
        {quoteItem && (
          <GetQuoteModal
            serviceName={quoteItem.name}
            serviceDesc={quoteItem.desc}
            businessName={showroom.title}
            ownerId={showroom.owner_id}
            isAuthenticated={Boolean(user)}
            onClose={() => setQuoteItem(null)}
          />
        )}

        {/* Guest sticky bottom bar — shown after modal is dismissed */}
        {!user && (
          <div className="sticky bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-card/95 backdrop-blur-xl px-4 py-3">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold">Like what you see?</p>
                <p className="text-[11px] text-muted-foreground">Join Nodbusiness to buy, follow, and sell.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/login?return=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
                  className="h-8 px-3 rounded-xl border border-border text-xs font-semibold hover:bg-secondary/50 transition-colors flex items-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="h-8 px-3 rounded-xl text-white text-xs font-semibold flex items-center transition-opacity hover:opacity-90"
                  style={{ backgroundColor: themeColor }}
                >
                  Join Free
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

/** 404-like notice for missing / unpublished showrooms viewed anonymously */
function UnavailableNotice({ title, message }: { title: string; message: string }) {
  return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <BrandLogo className="w-12 h-12 text-amber-400/40 mx-auto mb-3" />
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
