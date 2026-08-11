'use client';
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileText, Shield, Cookie, Scale, ChevronDown, ChevronUp } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

type TabId = 'terms' | 'privacy' | 'cookies' | 'seller';

const TABS: { id: TabId; label: string; icon: any; color: string }[] = [
  { id: 'terms',   label: 'Terms of Service',  icon: Scale,    color: 'text-blue-600' },
  { id: 'privacy', label: 'Privacy Policy',     icon: Shield,   color: 'text-violet-600' },
  { id: 'cookies', label: 'Cookie Policy',      icon: Cookie,   color: 'text-amber-600' },
  { id: 'seller',  label: 'Seller Agreement',   icon: FileText, color: 'text-emerald-600' },
];

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/40 last:border-0">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/30 transition-colors">
        <span className="text-sm font-semibold">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

function TermsContent() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <Accordion title="1. Acceptance of Terms">
        <p>By registering an account or accessing Halehame, you agree to these Terms of Service. If you do not agree, do not use the platform. These Terms form a binding agreement between you and Halehame.</p>
      </Accordion>
      <Accordion title="2. Eligibility">
        <p>You must be <strong>at least 18 years old</strong> to create an account. Business accounts must be operated by a person with legal authority to bind that business. Accounts are personal and non-transferable.</p>
      </Accordion>
      <Accordion title="3. Prohibited Activities">
        <p>Users may not:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Post content violating Ethiopian law (Computer Crime Proclamation No. 958/2016)</li>
          <li>Impersonate another person, business, or organization</li>
          <li>Upload malware, spyware, or harmful code</li>
          <li>Use the platform for money laundering or terrorism financing</li>
          <li>Scrape or automate requests without written permission</li>
          <li>Sell counterfeit or prohibited goods</li>
          <li>Harass or target individuals based on protected characteristics</li>
          <li>Post content involving minors in any exploitative context</li>
        </ul>
      </Accordion>
      <Accordion title="4. Content Ownership & License">
        <p>You retain ownership of content you post. You grant Halehame a worldwide, royalty-free, sublicensable license to display and distribute your content within the platform. We may remove content that violates these Terms without notice.</p>
      </Accordion>
      <Accordion title="5. Commerce & Payments">
        <p>Sellers are responsible for the accuracy of product listings, pricing, and delivery. Halehame is a platform — we are not a party to buyer-seller transactions. Payment processing is handled by Stripe (international) and Chapa (Ethiopia).</p>
      </Accordion>
      <Accordion title="6. Intellectual Property">
        <p>The Halehame name, logo, brand identity, and codebase are proprietary. Users may not reproduce or redistribute without written permission. DMCA/copyright takedown: <a href="mailto:legal@halehame.app" className="text-blue-600 hover:underline">legal@halehame.app</a></p>
      </Accordion>
      <Accordion title="7. Limitation of Liability">
        <p>Halehame is not liable for user-generated content or losses from platform outages. Our maximum liability to any user shall not exceed fees paid to us in the 12 months preceding the claim.</p>
      </Accordion>
      <Accordion title="8. Governing Law">
        <p>These Terms are governed by the laws of the <strong>Federal Democratic Republic of Ethiopia</strong>. Disputes shall be submitted to the courts of Addis Ababa, Ethiopia.</p>
      </Accordion>
      <Accordion title="9. Changes to Terms">
        <p>We may update these Terms with 30 days' notice via in-app notification. Continued use after the effective date constitutes acceptance.</p>
      </Accordion>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <Accordion title="1. What Data We Collect">
        <p><strong>Account Data:</strong> Email, full name, profile photo, bio, location (optional).</p>
        <p><strong>Usage Data:</strong> Pages visited, features used, device type, browser, IP address.</p>
        <p><strong>Location Data:</strong> GPS only when using Nearby Map — with explicit consent. Never tracked in background.</p>
        <p><strong>Payment Data:</strong> We do NOT store card numbers. Stripe and Chapa handle all card data.</p>
        <p><strong>Messages:</strong> Stored for delivery and dispute resolution only. Never sold.</p>
      </Accordion>
      <Accordion title="2. How We Use Your Data">
        <ul className="list-disc list-inside space-y-1">
          <li>Providing the service (account, orders, messages)</li>
          <li>Fraud detection and platform security</li>
          <li>Push notifications you opted into</li>
          <li>Improving the platform (anonymous analytics)</li>
          <li>Marketing emails (only with opt-in)</li>
          <li>Complying with Ethiopian law and tax obligations</li>
        </ul>
      </Accordion>
      <Accordion title="3. Data Sharing">
        <p>We share data with: Stripe (payments), Chapa (payments), Resend (emails), Sentry (error tracking, no PII), Railway/Vercel/Neon (hosting). We <strong>do not sell</strong> your personal data to advertisers or data brokers.</p>
      </Accordion>
      <Accordion title="4. Data Retention">
        <ul className="list-disc list-inside space-y-1">
          <li>Account data: until you delete your account</li>
          <li>Order records: 7 years (Ethiopian commercial law)</li>
          <li>Message history: 1 year after account deletion</li>
          <li>Server logs: 90 days</li>
        </ul>
      </Accordion>
      <Accordion title="5. Your Rights">
        <p>You have the right to: access your data, correct inaccurate data, delete your account, export your data, object to marketing, and withdraw consent. Contact: <a href="mailto:privacy@halehame.app" className="text-blue-600 hover:underline">privacy@halehame.app</a>. We respond within 30 days.</p>
      </Accordion>
      <Accordion title="6. Security Measures">
        <ul className="list-disc list-inside space-y-1">
          <li>Passwords: bcrypt hash (never plaintext)</li>
          <li>HTTPS everywhere (TLS 1.2+ enforced)</li>
          <li>Database: encrypted at rest (Neon managed PostgreSQL)</li>
          <li>API: parameterized queries, allowlisted endpoints</li>
          <li>Backups: daily automated, 7-day retention</li>
        </ul>
      </Accordion>
      <Accordion title="7. Children's Privacy">
        <p>Halehame is not intended for users under 18. We do not knowingly collect data from minors. Contact us immediately if you believe a minor has registered.</p>
      </Accordion>
      <Accordion title="8. Contact & DPO">
        <p>Email: <a href="mailto:privacy@halehame.app" className="text-blue-600 hover:underline">privacy@halehame.app</a><br />Address: Addis Ababa, Ethiopia</p>
      </Accordion>
    </div>
  );
}

function CookieContent() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <Accordion title="What Are Cookies?">
        <p>Cookies are small text files stored in your browser. We use them to keep you logged in and ensure the platform works correctly.</p>
      </Accordion>
      <Accordion title="Cookies We Use">
        <div className="space-y-2">
          {[
            { name: 'access_token', purpose: 'Authentication session', required: true },
            { name: '_vercel_jwt', purpose: 'Vercel preview deployments', required: false },
          ].map(c => (
            <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
              <div>
                <p className="text-xs font-semibold font-mono">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.purpose}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.required ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-secondary text-muted-foreground'}`}>
                {c.required ? 'Required' : 'Optional'}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2">We use <strong>no third-party tracking or advertising cookies.</strong></p>
      </Accordion>
      <Accordion title="Managing Cookies">
        <p>You can clear cookies in your browser settings. Note: clearing the access_token cookie will log you out of Halehame.</p>
      </Accordion>
    </div>
  );
}

function SellerContent() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <Accordion title="1. Seller Eligibility">
        <p>Any registered Halehame user (18+) may create a business profile and list products or services. Business accounts must accurately represent a real business entity.</p>
      </Accordion>
      <Accordion title="2. Product Listings">
        <p>Sellers must: provide accurate descriptions and images, price products in ETB or supported currencies, maintain accurate stock levels, and remove discontinued products promptly. Prohibited: counterfeit goods, illegal items, adult content, weapons, or any item banned under Ethiopian law.</p>
      </Accordion>
      <Accordion title="3. Commission & Fees">
        <p>Halehame charges a platform commission on completed orders (rate configurable by admin, displayed in your analytics). The commission is deducted automatically from your wallet balance after each confirmed order.</p>
      </Accordion>
      <Accordion title="4. Payments & Payouts">
        <p>Payments are processed via Stripe (international cards) and Chapa (Ethiopian banks/mobile money). Funds are credited to your Halehame wallet. Payouts to your bank account are subject to NBE compliance requirements and KYC verification.</p>
      </Accordion>
      <Accordion title="5. Orders & Fulfillment">
        <p>Sellers are responsible for: confirming orders within 24 hours, shipping within the stated delivery time, providing tracking information, and responding to buyer messages within 48 hours. Failure to fulfill orders may result in account suspension.</p>
      </Accordion>
      <Accordion title="6. Returns & Disputes">
        <p>Buyers may request returns within the platform's return window. Sellers must respond to return requests within 48 hours. Unresolved disputes are mediated by Halehame admin, whose decision is final.</p>
      </Accordion>
      <Accordion title="7. Suspension & Termination">
        <p>We may suspend or terminate seller accounts for: fraudulent activity, repeated policy violations, sustained negative reviews, or legal violations. Pending payouts will be held during investigation.</p>
      </Accordion>
      <Accordion title="8. Contact">
        <p>Seller support: <a href="mailto:sellers@halehame.app" className="text-blue-600 hover:underline">sellers@halehame.app</a></p>
      </Accordion>
    </div>
  );
}

const CONTENT: Record<TabId, React.ReactNode> = {
  terms:   <TermsContent />,
  privacy: <PrivacyContent />,
  cookies: <CookieContent />,
  seller:  <SellerContent />,
};

function ServiceAgreementView() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get('tab') as TabId) || 'terms';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const active = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-10">

      {/* ── Header ── */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Service Agreement</h1>
            <p className="text-white/70 text-xs">Halehame · Addis Ababa, Ethiopia · Last updated August 2026</p>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 border ${
                isActive
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-card text-muted-foreground border-border/50 hover:bg-secondary'
              }`}>
              <Icon className={`w-3.5 h-3.5 ${isActive ? '' : t.color}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Active section header ── */}
      <div className="flex items-center gap-2 px-1">
        {React.createElement(active.icon, { className: `w-4 h-4 ${active.color}` })}
        <h2 className="text-base font-bold">{active.label}</h2>
      </div>

      {/* ── Content ── */}
      {CONTENT[activeTab]}

      <p className="text-center text-[10px] text-muted-foreground">
        Questions? <a href="mailto:legal@halehame.app" className="text-blue-600 hover:underline">legal@halehame.app</a>
      </p>
    </div>
  );
}

export default function ServiceAgreementPage() {
  return <ErrorBoundary><ServiceAgreementView /></ErrorBoundary>;
}
