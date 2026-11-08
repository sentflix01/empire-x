'use client'
import { HEX } from '@/lib/colorTokens';
import React from 'react';
import {
  Megaphone, Phone, Mail, Tag, Zap, Newspaper, MapPin,
  X, LucideProps,
} from 'lucide-react';

/* ── Ticker type definitions (exported for ProfileEdit) ── */
export interface TickerTypeOption {
  value: string;
  label: string;
  description: string;
  color: string | null;
  badgeLabel: string;
  Icon: React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>;
  placeholder: string;
}

export const TICKER_TYPES: TickerTypeOption[] = [
  {
    value: 'none',
    label: 'Off',
    description: 'No ticker — pure social feed',
    color: null,
    badgeLabel: 'OFF',
    Icon: X,
    placeholder: '',
  },
  {
    value: 'auto',
    label: 'Auto-detect',
    description: 'Type is detected from your message',
    color: HEX.primary,
    badgeLabel: 'AUTO',
    Icon: Zap,
    placeholder: 'Type anything — type is detected automatically',
  },
  {
    value: 'promo',
    label: 'Promotion',
    description: 'Sales, discounts, special offers',
    color: HEX.brandSecondary,
    badgeLabel: 'PROMO',
    Icon: Tag,
    placeholder: '30% OFF this weekend only! Limited time offer — shop now',
  },
  {
    value: 'news',
    label: 'Breaking News',
    description: 'Announcements, launches, urgent updates',
    color: HEX.destructive,
    badgeLabel: 'LIVE',
    Icon: Newspaper,
    placeholder: 'We just opened our new branch! Grand opening this Saturday — come visit us',
  },
  {
    value: 'contact',
    label: 'Contact Info',
    description: 'Phone number, email, working hours',
    color: HEX.primary,
    badgeLabel: 'CONTACT',
    Icon: Phone,
    placeholder: '+1 234 567 8900  ·  Available Mon–Sat 9AM–6PM',
  },
  {
    value: 'location',
    label: 'Location',
    description: 'Address, directions, map pin',
    color: HEX.primary,
    badgeLabel: 'LOCATION',
    Icon: MapPin,
    placeholder: 'Find us at your nearest location',
  },
  {
    value: 'custom',
    label: 'Custom Message',
    description: 'Any message you want to scroll',
    color: HEX.muted,
    badgeLabel: 'INFO',
    Icon: Megaphone,
    placeholder: 'Your custom scrolling message goes here...',
  },
];

/* ── Internal render config ── */
interface TypeConfig {
  bar: string;
  badge: string;
  text: string;
  bg: string;
  border: string;
  label: string;
  Icon: React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  contact:  { bar: 'from-primary to-primary',    badge: 'bg-primary',   text: 'text-primary-subtle-foreground',   bg: 'bg-primary-subtle/80',   border: 'border-primary/30',   label: 'CONTACT',  Icon: Phone },
  promo:    { bar: 'from-primary to-primary', badge: 'bg-primary', text: 'text-primary-subtle-foreground', bg: 'bg-primary-subtle/80', border: 'border-primary/30', label: 'PROMO',    Icon: Tag },
  news:     { bar: 'from-destructive to-destructive',     badge: 'bg-destructive',    text: 'text-destructive-subtle-foreground',    bg: 'bg-destructive-subtle/80',    border: 'border-destructive/30',    label: 'LIVE',     Icon: Newspaper },
  location: { bar: 'from-primary to-primary',     badge: 'bg-primary',   text: 'text-primary-subtle-foreground',   bg: 'bg-primary-subtle/80',   border: 'border-primary/30',   label: 'LOCATION', Icon: MapPin },
  custom:   { bar: 'from-brand-secondary to-brand-secondary',badge: 'bg-brand-secondary', text: 'text-brand-secondary-subtle-foreground', bg: 'bg-brand-secondary-subtle/80', border: 'border-brand-secondary/30', label: 'INFO',     Icon: Megaphone },
  email:    { bar: 'from-brand-secondary to-brand-secondary',  badge: 'bg-brand-secondary', text: 'text-brand-secondary-subtle-foreground', bg: 'bg-brand-secondary-subtle/80', border: 'border-brand-secondary/30', label: 'EMAIL',    Icon: Mail },
  update:   { bar: 'from-success to-success',badge: 'bg-success',  text: 'text-success-subtle-foreground',  bg: 'bg-success-subtle/80',  border: 'border-success/30',  label: 'NEW',      Icon: Zap },
  auto:     { bar: 'from-primary to-primary', badge: 'bg-primary',  text: 'text-primary-subtle-foreground',  bg: 'bg-primary-subtle/80',  border: 'border-primary/30',  label: 'INFO',     Icon: Megaphone },
  default:  { bar: 'from-primary to-primary',  badge: 'bg-primary',  text: 'text-primary-subtle-foreground',  bg: 'bg-primary-subtle/80',  border: 'border-primary/30',  label: 'INFO',     Icon: Megaphone },
};

function autoDetectType(text: string): string {
  const t = text.toLowerCase();
  if (/@|email|gmail/.test(t)) return 'email';
  if (/\+?\d[\d\s-]{6,}/.test(t)) return 'contact';
  if (/sale| off|promo|deal|%|discount|free/.test(t)) return 'promo';
  if (/breaking|live|urgent|alert|just launched|new branch|grand opening/.test(t)) return 'news';
  if (/located|find us|visit us|address|opposite|next to/.test(t)) return 'location';
  if (/update|new|launch/.test(t)) return 'update';
  return 'default';
}

interface TickerBarProps {
  text: string;
  type?: string;
}

export default function TickerBar({ text, type = 'auto' }: TickerBarProps) {
  if (!text?.trim() || type === 'none') return null;

  const resolvedType = type === 'auto'
    ? autoDetectType(text)
    : (TYPE_CONFIG[type] ? type : 'default');

  const cfg = TYPE_CONFIG[resolvedType] ?? TYPE_CONFIG.default;
  const { Icon } = cfg;
  // Repeat text so marquee is seamless
  const repeated = Array(5).fill(text + '   ·   ').join('');

  return (
    <div className={`border-t overflow-hidden ${cfg.border} ${cfg.bg}`}>
      {/* Gradient top accent line */}
      <div className={`h-[2px] w-full bg-gradient-to-r ${cfg.bar}`} />
      <div className="flex items-center overflow-hidden">
        {/* Type badge */}
        <div className={`shrink-0 flex items-center gap-1 px-3 py-1.5 ${cfg.badge}`}>
          <Icon className="w-3 h-3 text-white" />
          <span className="text-[10px] font-bold text-white tracking-widest">{cfg.label}</span>
        </div>
        {/* Scrolling text */}
        <div className="overflow-hidden flex-1 py-1.5 min-w-0">
          <div className={`flex animate-marquee whitespace-nowrap w-max ${cfg.text}`}>
            <span className="text-xs font-medium px-3">{repeated}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
