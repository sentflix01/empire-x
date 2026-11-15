'use client';
import React, { useId, useState } from 'react';
import {
  ArrowDown, ArrowUp, Plus, Search, X, Circle, type LucideIcon, UtensilsCrossed, Clock, Wallet,
  Award, Briefcase, CalendarCheck, FolderOpen, GitBranch, Handshake, HelpCircle, Images, Info, Mail, MapPin, Megaphone, MessageSquareQuote, PlayCircle, Send, ShoppingBag, Sparkles, Tag, TrendingUp, Users, Zap, Share2, Building2, Package, Navigation, Bookmark,
} from 'lucide-react';
import { SECTION_TYPES, type SectionType } from '@/lib/builderSections';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Section icons by the names the catalogue uses (lib/builderSections.ts).
const ICONS: Record<string, LucideIcon> = { UtensilsCrossed, Clock, Wallet, Award, Briefcase, CalendarCheck, FolderOpen, GitBranch, Handshake, HelpCircle, Images, Info, Mail, MapPin, Megaphone, MessageSquareQuote, PlayCircle, Send, ShoppingBag, Sparkles, Tag, TrendingUp, Users, Zap, Share2, Building2, Package, Navigation, Bookmark };

export const SECTION_GROUPS = [
  { title: 'Top of the page', desc: 'First impression and the main button', keys: ['hero', 'offer', 'cta', 'video'] },
  {
    title: 'Middle of the page',
    desc: 'What you sell, proof, and details',
    keys: [
      'about', 'features', 'items', 'menu', 'gallery', 'team', 'faq', 'pricing', 'services', 'portfolio',
      'stats', 'process', 'caseStudies', 'partners', 'awards', 'booking', 'industries', 'inventory_catalog',
      'live_location_tracking',
    ],
  },
  { title: 'Bottom of the page', desc: 'How people reach, pay and follow you', keys: ['payment_info', 'hours', 'map', 'contact', 'social', 'newsletter', 'save_showroom', 'feed_ticker'] },
];

function TierBadge({ tier }: { tier: SectionType['tier'] }) {
  if (tier !== 'premium' && tier !== 'pro') return null;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${tier === 'pro'
      ? 'bg-brand-secondary-subtle text-brand-secondary'
      : 'bg-primary-subtle text-primary'}`}>
      {tier === 'pro' ? 'Pro' : 'Premium'}
    </span>
  );
}

function SectionIcon({ icon, active }: { icon: string; active?: boolean }) {
  const Icon = ICONS[icon] ?? Circle;
  return (
    <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

export interface SectionsPanelProps {
  activeSections: string[];
  onToggle: (key: string) => void;
  onMove: (key: string, dir: -1 | 1) => void;
  /** Share of the chosen sections' fields that are filled in (0–100). */
  completion: number;
  plan: { label: string; price: number; tier: string };
  dark?: boolean;
}

/**
 * The website as an ordered list of pieces ("On your page", same order as the
 * live site) plus the catalogue to add more. Rows are at least 44px tall and
 * every control is a labelled button, so it works by touch and screen reader.
 */
export default function SectionsPanel({ activeSections, onToggle, onMove, completion, plan, dark = false }: SectionsPanelProps) {
  const sectionsByKey = new Map(SECTION_TYPES.map((s) => [s.key, s]));
  const onPage = activeSections.map((k) => sectionsByKey.get(k)).filter((s): s is SectionType => Boolean(s));
  const surface = dark ? 'bg-inverse text-inverse-foreground/70' : 'bg-card text-foreground';
  const line = dark ? 'border-foreground/20' : 'border-border/60';
  const [query, setQuery] = useState('');
  const searchId = useId();
  const q = query.trim().toLowerCase();
  const matches = (sec: SectionType) => !q || `${sec.label} ${sec.key} ${sec.purpose ?? ''}`.toLowerCase().includes(q);
  const groups = SECTION_GROUPS.map((group) => ({
    ...group,
    available: group.keys.map((k) => sectionsByKey.get(k)).filter((s): s is SectionType => Boolean(s) && !activeSections.includes(s!.key) && matches(s!)),
  }));
  const noMatch = q !== '' && groups.every((g) => g.available.length === 0);

  return (
    <div className={`flex h-full min-h-0 flex-col ${surface}`}>
      <div className={`flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 ${line}`}>
        <p className="text-sm font-bold">Your page</p>
        <span className="text-xs text-muted-foreground">{onPage.length} sections · {completion}% filled</span>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="ml-auto inline-flex min-h-8 items-center rounded-full border border-primary/30 bg-primary-subtle px-2.5 text-[11px] font-semibold text-primary-subtle-foreground">
              Needs {plan.label} · {plan.price.toLocaleString()} ETB
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(18rem,calc(100vw-2rem))] text-sm">
            <p>To publish these sections you need the <strong>{plan.label} plan</strong> ({plan.price.toLocaleString()} ETB a month).</p>
            <p className="mt-2 text-xs text-muted-foreground">More than 5 sections needs Premium, more than 25 needs Pro. Sections marked Premium or Pro also raise the plan.</p>
          </PopoverContent>
        </Popover>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <section aria-label="On your page" className={`border-b ${line}`}>
          <h3 className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">On your page, top to bottom</h3>
          {onPage.length === 0 && <p className="px-3 pb-3 text-sm text-muted-foreground">Nothing yet. Add a section below.</p>}
          <ol>
            {onPage.map((sec, i) => (
              <li key={sec.key} className={`flex min-h-12 items-center gap-2 px-3 py-1 ${dark ? 'hover:bg-muted-foreground/40' : 'hover:bg-secondary/50'}`}>
                <span className="w-4 shrink-0 text-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
                <SectionIcon icon={sec.icon} active />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{sec.label}</span>
                <TierBadge tier={sec.tier} />
                <button type="button" onClick={() => onMove(sec.key, -1)} disabled={i === 0} aria-label={`Move ${sec.label} up`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-25">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => onMove(sec.key, 1)} disabled={i === onPage.length - 1} aria-label={`Move ${sec.label} down`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-25">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => onToggle(sec.key)} aria-label={`Remove ${sec.label}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive-subtle hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ol>
        </section>

        <div className={`sticky top-0 z-10 border-b px-3 py-2 ${line} ${dark ? 'bg-inverse' : 'bg-card'}`}>
          <label htmlFor={searchId} className="sr-only">Find a section to add</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input id={searchId} type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a section to add (e.g. menu, prices)" autoComplete="off"
              className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
        {noMatch && (
          <p role="status" className="px-3 py-4 text-sm text-muted-foreground">
            No section matches “{query.trim()}”. Try another word, like “photos”, “prices” or “contact”.
          </p>
        )}
        {groups.map((group) => {
          const { available } = group;
          if (available.length === 0) return null;
          return (
            <section key={group.title} aria-label={`Add to the ${group.title.toLowerCase()}`} className={`border-b last:border-b-0 ${line}`}>
              <div className="px-3 pb-1 pt-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Add · {group.title}</h3>
                <p className="text-xs text-muted-foreground">{group.desc}</p>
              </div>
              <ul>
                {available.map((sec) => (
                  <li key={sec.key}>
                    <button type="button" onClick={() => onToggle(sec.key)} aria-label={`Add ${sec.label}`}
                      className={`flex min-h-12 w-full items-center gap-2 px-3 py-1 text-left ${dark ? 'hover:bg-muted-foreground/40' : 'hover:bg-secondary/50'}`}>
                      <SectionIcon icon={sec.icon} />
                      <span className="min-w-0 flex-1 truncate text-sm">{sec.label}</span>
                      <TierBadge tier={sec.tier} />
                      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 text-primary">
                        <Plus className="h-4 w-4" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
