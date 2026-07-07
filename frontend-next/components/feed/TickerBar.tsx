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
    color: '#2563EB',
    badgeLabel: 'AUTO',
    Icon: Zap,
    placeholder: 'Type anything — type is detected automatically',
  },
  {
    value: 'promo',
    label: 'Promotion',
    description: 'Sales, discounts, special offers',
    color: '#F97316',
    badgeLabel: 'PROMO',
    Icon: Tag,
    placeholder: '30% OFF this weekend only! Visit us at Bole — Limited time offer',
  },
  {
    value: 'news',
    label: 'Breaking News',
    description: 'Announcements, launches, urgent updates',
    color: '#EF4444',
    badgeLabel: 'LIVE',
    Icon: Newspaper,
    placeholder: 'We just opened our new branch in Bole! Grand opening this Saturday',
  },
  {
    value: 'contact',
    label: 'Contact Info',
    description: 'Phone number, email, working hours',
    color: '#3B82F6',
    badgeLabel: 'CONTACT',
    Icon: Phone,
    placeholder: '+251 912 345 678  ·  Available Mon–Sat 9AM–6PM',
  },
  {
    value: 'location',
    label: 'Location',
    description: 'Address, directions, map pin',
    color: '#06B6D4',
    badgeLabel: 'LOCATION',
    Icon: MapPin,
    placeholder: 'Find us at Bole Road, opposite Edna Mall  ·  Addis Ababa',
  },
  {
    value: 'custom',
    label: 'Custom Message',
    description: 'Any message you want to scroll',
    color: '#8B5CF6',
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
  contact:  { bar: 'from-blue-500 to-cyan-500',    badge: 'bg-blue-500',   text: 'text-blue-900',   bg: 'bg-blue-50/80',   border: 'border-blue-200/60',   label: 'CONTACT',  Icon: Phone },
  promo:    { bar: 'from-orange-500 to-amber-500', badge: 'bg-orange-500', text: 'text-orange-900', bg: 'bg-orange-50/80', border: 'border-orange-200/60', label: 'PROMO',    Icon: Tag },
  news:     { bar: 'from-red-600 to-rose-500',     badge: 'bg-red-600',    text: 'text-red-900',    bg: 'bg-red-50/80',    border: 'border-red-200/60',    label: 'LIVE',     Icon: Newspaper },
  location: { bar: 'from-cyan-500 to-sky-500',     badge: 'bg-cyan-500',   text: 'text-cyan-900',   bg: 'bg-cyan-50/80',   border: 'border-cyan-200/60',   label: 'LOCATION', Icon: MapPin },
  custom:   { bar: 'from-purple-500 to-violet-500',badge: 'bg-purple-500', text: 'text-purple-900', bg: 'bg-purple-50/80', border: 'border-purple-200/60', label: 'INFO',     Icon: Megaphone },
  email:    { bar: 'from-purple-500 to-pink-500',  badge: 'bg-purple-500', text: 'text-purple-900', bg: 'bg-purple-50/80', border: 'border-purple-200/60', label: 'EMAIL',    Icon: Mail },
  update:   { bar: 'from-green-500 to-emerald-500',badge: 'bg-green-500',  text: 'text-green-900',  bg: 'bg-green-50/80',  border: 'border-green-200/60',  label: 'NEW',      Icon: Zap },
  auto:     { bar: 'from-amber-500 to-yellow-500', badge: 'bg-amber-500',  text: 'text-amber-900',  bg: 'bg-amber-50/80',  border: 'border-amber-200/60',  label: 'INFO',     Icon: Megaphone },
  default:  { bar: 'from-amber-500 to-amber-600',  badge: 'bg-amber-500',  text: 'text-amber-900',  bg: 'bg-amber-50/80',  border: 'border-amber-200/60',  label: 'INFO',     Icon: Megaphone },
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
