'use client';
import React from 'react';
import {
  ArrowDown, ArrowUp, Plus, X, Circle, type LucideIcon, UtensilsCrossed, Clock, Wallet,
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
      'about', 'features', 'items', 'menu', 'gallery', 'testimonials', 'team', 'faq', 'pricing', 'services', 'portfolio',
      'stats', 'process', 'caseStudies', 'partners', 'awards', 'booking', 'industries', 'inventory_catalog',
      'live_location_tracking',
    ],
  },
  { title: 'Bottom of the page', desc: 'How people reach, pay and follow you', keys: ['payment_info', 'hours', 'map', 'contact', 'social', 'newsletter', 'save_showroom'] },
];

function TierBadge({ tier }: { tier: SectionType['tier'] }) {
  if (tier !== 'premium' && tier !== 'pro') return null;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${tier === 'pro'
      ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200'}`}>
      {tier === 'pro' ? 'Pro' : 'Premium'}
    </span>
  );
}

function SectionIcon({ icon, active }: { icon: string; active?: boolean }) {
  const Icon = ICONS[icon] ?? Circle;
  return (
    <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-blue-600 text-white" : "bg-secondary text-muted-foreground"}`}>
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
  const surface = dark ? 'bg-slate-800 text-slate-100' : 'bg-card text-foreground';
  const line = dark ? 'border-slate-700' : 'border-border/60';

  return (
    <div className={`flex h-full min-h-0 flex-col ${surface}`}>
      <div className={`flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 ${line}`}>
        <p className="text-sm font-bold">Your page</p>
        <span className="text-xs text-muted-foreground">{onPage.length} sections · {completion}% filled</span>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="ml-auto inline-flex min-h-8 items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 text-[11px] font-semibold text-blue-800 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-100">
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
              <li key={sec.key} className={`flex min-h-12 items-center gap-2 px-3 py-1 ${dark ? 'hover:bg-slate-700/40' : 'hover:bg-secondary/50'}`}>
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
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ol>
        </section>

        {SECTION_GROUPS.map((group) => {
          const available = group.keys.map((k) => sectionsByKey.get(k)).filter((s): s is SectionType => Boolean(s) && !activeSections.includes(s!.key));
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
                      className={`flex min-h-12 w-full items-center gap-2 px-3 py-1 text-left ${dark ? 'hover:bg-slate-700/40' : 'hover:bg-secondary/50'}`}>
                      <SectionIcon icon={sec.icon} />
                      <span className="min-w-0 flex-1 truncate text-sm">{sec.label}</span>
                      <TierBadge tier={sec.tier} />
                      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-200 text-blue-700 dark:border-blue-400/40 dark:text-blue-200">
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
