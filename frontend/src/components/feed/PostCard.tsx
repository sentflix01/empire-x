import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { entities } from '@/api/entities';
import client from '@/api/client';
import { auth } from '@/api/auth';
import { Link } from 'react-router-dom';
import {
  Heart, MessageCircle, Store, User as UserIcon,
  Tag, Sparkles, MapPin, CalendarDays, BarChart2, Newspaper,
  Maximize2, Minimize2, X, Reply, ChevronDown, ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';
import TickerBar from './TickerBar';
import PostCardMenu from './PostCardMenu';
import BusinessShowroomFeed from './BusinessShowroomFeed';
import ShareButton from '@/components/ui/ShareButton';
import VerifiedBadge, { VerificationType } from '@/components/ui/VerifiedBadge';

/* ── Types ──────────────────────────────────────────── */
interface Post {
  id: string;
  author_id: string;
  author_name?: string;
  author_avatar?: string;
  content?: string;
  image_url?: string;
  poll_options?: string;
  poll_ends_at?: string;
  like_count?: number;
  comment_count?: number;
  created_at?: string;
}

interface Profile {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  ticker_text?: string;
  ticker_type?: string;
  is_verified?: boolean;
  verification_type?: VerificationType;
  [key: string]: unknown;
}

interface Business {
  id: string;
  business_name?: string;
  business_category?: string;
  business_theme_color?: string;
  business_contact_phone?: string;
  business_contact_email?: string;
  business_address?: string;
  [key: string]: unknown;
}

interface Comment {
  id: string;
  author_name?: string;
  content?: string;
}

type Variant = 'image' | 'promo' | 'event' | 'location' | 'poll' | 'text';

/* ── Category accent colours ─────────────────────────── */
const CAT_ACCENT: Record<string, { bg: string; border: string; badge: string; label: string }> = {
  restaurant: { bg: 'bg-orange-50',  border: 'border-orange-200/70',  badge: 'bg-orange-100 text-orange-700',   label: 'Food' },
  shop:       { bg: 'bg-blue-50',    border: 'border-blue-200/70',    badge: 'bg-blue-100 text-blue-700',       label: 'Shop' },
  service:    { bg: 'bg-cyan-50',    border: 'border-cyan-200/70',    badge: 'bg-cyan-100 text-cyan-700',       label: 'Service' },
  health:     { bg: 'bg-green-50',   border: 'border-green-200/70',   badge: 'bg-green-100 text-green-700',     label: 'Health' },
  portfolio:  { bg: 'bg-pink-50',    border: 'border-pink-200/70',    badge: 'bg-pink-100 text-pink-700',       label: 'Creative' },
  event:      { bg: 'bg-emerald-50', border: 'border-emerald-200/70', badge: 'bg-emerald-100 text-emerald-700', label: 'Events' },
  realestate: { bg: 'bg-sky-50',     border: 'border-sky-200/70',     badge: 'bg-sky-100 text-sky-700',         label: 'Property' },
  course:     { bg: 'bg-purple-50',  border: 'border-purple-200/70',  badge: 'bg-purple-100 text-purple-700',   label: 'Education' },
  other:      { bg: 'bg-amber-50',   border: 'border-amber-200/70',   badge: 'bg-amber-100 text-amber-700',     label: 'Business' },
};

/* ── Detect post visual variant ─────────────────────── */
function detectVariant(post: Post): Variant {
  if (post.poll_options) return 'poll';
  const t = (post.content ?? '').toLowerCase();
  if (post.image_url) {
    if (/sale| off|promo|deal|%|free|offer/.test(t)) return 'promo';
    if (/event|summit|workshop|festival|concert/.test(t)) return 'event';
    return 'image';
  }
  if (/find us|visit us|located|open in/.test(t)) return 'location';
  if (/sale| off|promo|deal|%|free/.test(t)) return 'promo';
  if (/\bevent\b|join us|this friday|workshop|seminar/.test(t)) return 'event';
  return 'text';
}

/* ── Hashtag renderer ───────────────────────────────── */
function RenderText({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <>
      {text.split(/(#[\w\u1200-\u137F]+)/g).map((part, i) =>
        part.startsWith('#') ? (
          <Link key={i} to={`/hashtag/${part.slice(1)}`} className="text-amber-600 font-medium hover:underline">
            {part}
          </Link>
        ) : (
          part
        )
      )}
    </>
  );
}

/* ── Post type renderers ────────────────────────────── */
function ImagePost({ post }: { post: Post }) {
  const [err, setErr] = useState(false);
  if (err || !post.image_url) {
    return (
      <div className="px-4 pb-3">
        <p className="text-sm leading-relaxed"><RenderText text={post.content} /></p>
      </div>
    );
  }
  return (
    <div className="pb-3">
      <div className="relative overflow-hidden" style={{ maxHeight: 360 }}>
        <img
          src={post.image_url} alt=""
          className="w-full object-cover"
          style={{ maxHeight: 360 }}
          onError={() => setErr(true)}
        />
        {post.content && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-4">
            <p className="text-white text-sm leading-relaxed line-clamp-3">
              <RenderText text={post.content} />
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PromoPost({ post, themeColor, primaryBiz }: { post: Post; themeColor: string; primaryBiz: Business | null }) {
  const [err, setErr] = useState(false);
  return (
    <div>
      {post.image_url && !err && (
        <div className="relative overflow-hidden" style={{ maxHeight: 220 }}>
          <img src={post.image_url} alt="" className="w-full object-cover" style={{ maxHeight: 220 }} onError={() => setErr(true)} />
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute top-3 left-3">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow">
              <Tag className="w-3 h-3" /> SPECIAL OFFER
            </span>
          </div>
        </div>
      )}
      <div className="px-4 py-3" style={{ borderLeft: `4px solid ${themeColor}` }}>
        {primaryBiz?.business_name && (
          <p className="text-xs font-bold mb-1" style={{ color: themeColor }}>{primaryBiz.business_name}</p>
        )}
        <p className="text-sm leading-relaxed font-medium"><RenderText text={post.content} /></p>
      </div>
    </div>
  );
}

function EventPost({ post }: { post: Post }) {
  const [err, setErr] = useState(false);
  return (
    <div>
      {post.image_url && !err && (
        <div className="relative overflow-hidden mx-4 mb-3 rounded-xl" style={{ maxHeight: 200 }}>
          <img src={post.image_url} alt="" className="w-full object-cover rounded-xl" style={{ maxHeight: 200 }} onError={() => setErr(true)} />
          <div className="absolute top-3 right-3">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white">
              <CalendarDays className="w-3 h-3" /> Event
            </span>
          </div>
        </div>
      )}
      <div className="px-4 pb-3">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200/60">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm leading-relaxed"><RenderText text={post.content} /></p>
        </div>
      </div>
    </div>
  );
}

function LocationPost({ post }: { post: Post }) {
  return (
    <div className="px-4 pb-3">
      <div className="rounded-xl overflow-hidden border border-blue-200/60">
        <div className="bg-gradient-to-br from-blue-100 to-sky-100 h-20 flex items-center justify-center relative">
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle,#3b82f6 1px,transparent 1px)', backgroundSize: '18px 18px' }}
          />
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg z-10">
            <MapPin className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="px-3 py-2.5 bg-card">
          <p className="text-sm leading-relaxed"><RenderText text={post.content} /></p>
        </div>
      </div>
    </div>
  );
}

function TextPost({ post, isPromo, themeColor, primaryBiz }: { post: Post; isPromo: boolean; themeColor: string; primaryBiz: Business | null }) {
  return (
    <div className="px-4 pb-3">
      {isPromo && primaryBiz?.business_name && (
        <div
          className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: themeColor + '15', borderLeft: `3px solid ${themeColor}` }}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: themeColor }} />
          <span className="text-xs font-semibold" style={{ color: themeColor }}>
            {primaryBiz.business_name} · Special Offer
          </span>
        </div>
      )}
      <p className="text-sm leading-relaxed whitespace-pre-wrap"><RenderText text={post.content} /></p>
    </div>
  );
}

function PollPost({ post }: { post: Post }) {
  const [options, setOptions] = useState<Array<{ id: string; text: string; vote_count?: number }>>(() => {
    try { return JSON.parse(post.poll_options ?? '[]'); } catch { return []; }
  });
  const [voted, setVoted] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const isEnded = !!(post.poll_ends_at && new Date() > new Date(post.poll_ends_at));
  const total = options.reduce((s, o) => s + (o.vote_count ?? 0), 0);
  const COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981'];

  const vote = async (id: string) => {
    if (voted || isEnded || voting) return;
    setVoting(true);
    try {
      const { data } = await client.post(`/api/polls/${post.id}/vote`, { option_id: id });
      setOptions(data.options);
      setVoted(id);
    } catch { /* ignore */ }
    setVoting(false);
  };

  if (!options.length) return null;
  return (
    <div className="px-4 pb-3">
      <p className="text-sm font-medium mb-3 leading-relaxed"><RenderText text={post.content} /></p>
      <div className="space-y-2">
        {options.map((opt, idx) => {
          const pct = total > 0 ? Math.round((opt.vote_count ?? 0) / total * 100) : 0;
          const isMine = voted === opt.id;
          const color = COLORS[idx % COLORS.length];
          return (
            <button
              key={opt.id}
              onClick={() => vote(opt.id)}
              disabled={!!voted || isEnded || voting}
              className={`relative w-full text-left rounded-xl px-4 py-2.5 text-sm font-medium overflow-hidden border transition-all ${
                isMine ? 'border-2' : 'border-border/50 hover:border-border'
              } ${!voted && !isEnded ? 'cursor-pointer' : 'cursor-default'}`}
              style={isMine ? { borderColor: color } : {}}
            >
              {(voted || isEnded) && (
                <div
                  className="absolute left-0 top-0 bottom-0 rounded-xl transition-all duration-700 opacity-15"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              )}
              <span className="relative z-10 flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  {opt.text}
                </span>
                {(voted || isEnded) && (
                  <span className="text-xs font-bold ml-2" style={{ color }}>{pct}%</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {total} vote{total !== 1 ? 's' : ''}
        {isEnded ? ' · Poll ended' : post.poll_ends_at ? ` · Ends ${moment(post.poll_ends_at).fromNow()}` : ''}
      </p>
    </div>
  );
}

/* ── Profile Peek — full-screen modal ───────────────── */
interface ProfilePeekProps {
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  initialView?: 'personal' | 'business';
  onClose: () => void;
}

function ProfilePeek({ authorId, authorName, initialView = 'personal', onClose }: ProfilePeekProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [peekView, setPeekView] = useState<'personal' | 'business'>(initialView);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    auth.me().then(setCurrentUser).catch(() => {});
    Promise.all([
      entities.UserProfile.filter({ user_id: authorId }),
      entities.Business.filter({ owner_id: authorId }),
    ]).then(([profiles, bizs]) => {
      if (profiles.length) setProfile(profiles[0] as Profile);
      setBusinesses(bizs as Business[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authorId]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const hasBusiness = businesses.length > 0 || (profile as any)?.has_business_profile;
  const primaryBiz = businesses[0] ?? null;
  const themeColor: string = (primaryBiz?.business_theme_color as string) ?? (profile as any)?.business_theme_color ?? '#D4AF37';
  const isOwner = currentUser?.id === (profile as any)?.user_id;

  return createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      >
        {/* Modal panel — centered, max width, tall but not full height */}
        <motion.div
          className="relative flex flex-col bg-background rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: 'min(480px, calc(100vw - 32px))',
            height: 'min(82vh, 700px)',
          }}
          initial={{ opacity: 0, scale: 0.93, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 16 }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          onClick={e => e.stopPropagation()}
        >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-border/50 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3 min-w-0">
            <p className="font-semibold text-sm truncate">
              {peekView === 'personal'
                ? ((profile as any)?.display_name ?? authorName ?? 'Profile')
                : ((profile as any)?.business_name ?? 'Business Profile')}
            </p>
            {hasBusiness && (
              <div className="flex bg-secondary/70 rounded-full p-0.5 gap-0.5 ring-1 ring-border/40 shrink-0">
                <button
                  onClick={() => setPeekView('personal')}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all ${peekView === 'personal' ? 'bg-blue-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <UserIcon className="w-3 h-3" /> Personal
                </button>
                <button
                  onClick={() => setPeekView('business')}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all ${peekView === 'business' ? 'text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  style={peekView === 'business' ? { backgroundColor: themeColor } : {}}
                >
                  <Store className="w-3 h-3" /> Business
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/profile/${authorId}${peekView === 'business' ? '?view=business' : ''}`}
              onClick={onClose}
              className="text-xs font-medium text-amber-600 hover:underline"
            >
              Full page →
            </Link>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
              title="Close (Esc)"
            >
              <Minimize2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : !profile ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <UserIcon className="w-10 h-10 opacity-20" />
              <p className="text-sm">Profile not found</p>
            </div>
          ) : peekView === 'personal' ? (
            <PersonalProfileEmbed profile={profile} businesses={businesses} currentUser={currentUser} isOwner={isOwner} />
          ) : (
            <BusinessProfileEmbed profile={profile} business={primaryBiz} businesses={businesses} currentUser={currentUser} isOwner={isOwner} themeColor={themeColor} />
          )}
        </div>
      </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

/* ── Personal profile embed ─────────────────────────── */
function PersonalProfileEmbed({ profile, businesses, currentUser, isOwner }: any) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const skills = (() => { try { return JSON.parse((profile as any)?.skills || '[]'); } catch { return []; } })();
  const experience = (() => { try { return JSON.parse((profile as any)?.experience || '[]'); } catch { return []; } })();

  useEffect(() => {
    entities.Post.filter({ author_id: profile.user_id }, '-created_at', 20)
      .then((p: Post[]) => { setPosts(p); setLoadingPosts(false); })
      .catch(() => setLoadingPosts(false));
  }, [profile.user_id]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-12">
      <div className="bg-card dark:bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-amber-400 to-orange-500">
          {(profile as any)?.cover_url && <img src={(profile as any).cover_url} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="px-5 pb-4">
          <div className="-mt-10 mb-3">
            <div className="w-20 h-20 rounded-2xl bg-card dark:bg-card p-0.5 shadow-lg overflow-hidden">
              {(profile as any)?.avatar_url
                ? <img src={(profile as any).avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                : <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">{((profile as any)?.display_name ?? '?').charAt(0)}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl font-bold">{(profile as any)?.display_name}</h1>
            {(profile as any)?.is_verified && <VerifiedBadge type={(profile as any)?.verification_type} size="lg" />}
          </div>
          {(profile as any)?.headline && <p className="text-sm text-muted-foreground">{(profile as any).headline}</p>}
          {(profile as any)?.bio && <p className="text-sm mt-2 leading-relaxed">{(profile as any).bio}</p>}
          {(profile as any)?.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><MapPin className="w-3 h-3" />{(profile as any).location}</p>
          )}
          <div className="flex gap-5 mt-3 text-sm border-t border-border/40 pt-3">
            <span><strong>{(profile as any)?.follower_count ?? 0}</strong> <span className="text-muted-foreground">Followers</span></span>
            <span><strong>{(profile as any)?.following_count ?? 0}</strong> <span className="text-muted-foreground">Following</span></span>
            <span><strong>{(profile as any)?.connection_count ?? 0}</strong> <span className="text-muted-foreground">Connections</span></span>
          </div>
        </div>
      </div>

      {skills.length > 0 && (
        <div className="bg-card dark:bg-card rounded-2xl border border-border/50 p-4">
          <h3 className="font-semibold text-sm mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((s: string, i: number) => <span key={i} className="px-3 py-1 rounded-full bg-secondary text-xs font-medium">{s}</span>)}
          </div>
        </div>
      )}

      {experience.length > 0 && (
        <div className="bg-card dark:bg-card rounded-2xl border border-border/50 p-4">
          <h3 className="font-semibold text-sm mb-3">Experience</h3>
          {experience.map((e: any, i: number) => (
            <div key={i} className="flex gap-3 mb-3 last:mb-0">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.company}</p>
                {e.period && <p className="text-xs text-muted-foreground">{e.period}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="font-semibold text-sm mb-3 px-1">Posts</h3>
        {loadingPosts ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>
        ) : posts.length === 0 ? (
          <div className="bg-card dark:bg-card rounded-2xl border border-border/50 p-8 text-center text-sm text-muted-foreground">No posts yet</div>
        ) : (
          <div className="space-y-3">
            {posts.map(p => (
              <div key={p.id} className="bg-card dark:bg-card rounded-2xl border border-border/50 p-4">
                {(p as any).image_url && (
                  <img src={(p as any).image_url} alt="" className="w-full rounded-xl object-cover mb-3" style={{ maxHeight: 240 }} />
                )}
                <p className="text-sm leading-relaxed">{(p as any).content}</p>
                <p className="text-xs text-muted-foreground mt-2">❤️ {(p as any).like_count ?? 0} · 💬 {(p as any).comment_count ?? 0} · {moment((p as any).created_at).fromNow()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Business profile embed ─────────────────────────── */
function BusinessProfileEmbed({ profile, business, businesses, currentUser, isOwner, themeColor }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const biz = { ...profile, ...(business ?? {}) };

  useEffect(() => {
    entities.Product.filter({ seller_id: profile.user_id, status: 'active' }, '-created_at', 20)
      .then((p: any[]) => setProducts(p))
      .catch(() => {});
  }, [profile.user_id]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-12">
      <div className="bg-card dark:bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${themeColor}cc, ${themeColor}66)` }}>
          {biz.business_cover_url && <img src={biz.business_cover_url} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="px-5 pb-4">
          <div className="-mt-10 mb-3">
            <div className="w-20 h-20 rounded-2xl bg-card dark:bg-card p-0.5 shadow-lg overflow-hidden">
              {biz.business_logo_url
                ? <img src={biz.business_logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                : <div className="w-full h-full rounded-xl flex items-center justify-center text-white text-3xl font-bold" style={{ backgroundColor: themeColor }}>{(biz.business_name ?? 'B').charAt(0)}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl font-bold">{biz.business_name}</h1>
            {profile.is_verified && <VerifiedBadge type={profile.verification_type} size="lg" />}
          </div>
          {biz.business_description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{biz.business_description}</p>}
          {biz.business_address && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><MapPin className="w-3 h-3" />{biz.business_address}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            {biz.business_contact_phone && <a href={`tel:${biz.business_contact_phone}`} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full">📞 {biz.business_contact_phone}</a>}
            {biz.business_contact_email && <a href={`mailto:${biz.business_contact_email}`} className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full">✉️ {biz.business_contact_email}</a>}
            {biz.business_hours && <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full">🕐 {biz.business_hours}</span>}
          </div>
        </div>
      </div>

      {businesses.length > 1 && (
        <div className="bg-card dark:bg-card rounded-2xl border border-border/50 p-4">
          <h3 className="font-semibold text-sm mb-3">All Businesses</h3>
          <div className="space-y-2">
            {businesses.map((b: any) => (
              <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: b.business_theme_color || '#D4AF37' }}>
                  {b.business_name?.charAt(0) ?? 'B'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{b.business_name}</p>
                  <p className="text-xs text-muted-foreground">{b.business_category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {products.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3 px-1">Products</h3>
          <div className="grid grid-cols-2 gap-3">
            {products.map((p: any) => {
              const imgs = (() => { try { return JSON.parse(p.images || '[]'); } catch { return []; } })();
              return (
                <Link key={p.id} to={`/products/${p.id}`} className="bg-card dark:bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="aspect-square bg-secondary/30">
                    {imgs[0] && <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold truncate">{p.title}</p>
                    <p className="text-xs text-amber-600 font-bold mt-0.5">{p.price?.toLocaleString()} {p.currency}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main PostCard ───────────────────────────────────── */
interface PostCardProps {
  post: Post;
  currentUserId?: string;
  feedMode?: string;
}

export default function PostCard({ post, currentUserId, feedMode }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<Profile | null>(null);
  const [authorBusinesses, setAuthorBusinesses] = useState<Business[]>([]);
  const [viewMode, setViewMode] = useState('personal');
  const [flipping, setFlipping] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ full_name?: string } | null>(null);
  const [peekOpen, setPeekOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // comment id
  const [showAllComments, setShowAllComments] = useState(false);

  useEffect(() => { if (feedMode) setViewMode(feedMode); }, [feedMode]);
  useEffect(() => { if (!currentUser) auth.me().then(setCurrentUser).catch(() => {}); }, []);
  useEffect(() => {
    if (!post.author_id) return;
    entities.UserProfile.filter({ user_id: post.author_id })
      .then((p: Profile[]) => { if (p.length) setAuthorProfile(p[0]); })
      .catch(() => {});
    entities.Business.filter({ owner_id: post.author_id })
      .then((b: Business[]) => setAuthorBusinesses(b ?? []))
      .catch(() => {});
  }, [post.author_id]);

  const handleLike = async () => {
    const nl = !liked;
    setLiked(nl);
    setLikeCount(c => nl ? c + 1 : Math.max(0, c - 1));
    try { await entities.Like.create({ target_id: post.id }); }
    catch { setLiked(!nl); setLikeCount(c => nl ? Math.max(0, c - 1) : c + 1); }
  };

  const handleShowComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      const c = await entities.Comment.filter({ post_id: post.id }, '-created_at', 20);
      setComments(c);
      setLoadingComments(false);
      setShowAllComments(false); // reset to show 1 on fresh open
    }
    setShowComments(v => !v);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const c = await entities.Comment.create({
      post_id: post.id,
      author_id: currentUserId,
      author_name: currentUser?.full_name ?? 'You',
      content: commentText.trim(),
    });
    setComments(prev => [c, ...prev]);
    setCommentText('');
  };

  const handleViewChange = (v: string) => {
    if (v === viewMode) return;
    setFlipping(true);
    setTimeout(() => { setViewMode(v); setFlipping(false); }, 220);
  };

  const primaryBiz = authorBusinesses[0] ?? null;
  const bizCat = primaryBiz?.business_category ?? null;
  const accent = bizCat ? (CAT_ACCENT[bizCat] ?? CAT_ACCENT.other) : null;
  const themeColor = (primaryBiz?.business_theme_color as string | undefined) ?? '#D4AF37';
  const variant = detectVariant(post);
  const isPromo = variant === 'promo';

  // Ticker is fully opt-in:
  // - 'none' (or no profile yet) → never show ticker
  // - 'auto' → show ticker_text if set; if blank, auto-generate from business contact info
  // - any other type → show ticker_text directly (no auto-generation)
  const rawTickerType = (authorProfile?.ticker_type as string | undefined) ?? 'none';
  const tickerType = rawTickerType;

  const tickerText = (() => {
    if (rawTickerType === 'none') return undefined;
    const profileText = authorProfile?.ticker_text as string | undefined;
    if (profileText?.trim()) return profileText;
    // Only auto-generate from business info when the user chose 'auto'
    if (rawTickerType === 'auto') {
      return (
        (primaryBiz?.business_contact_phone ? `Call: ${primaryBiz.business_contact_phone}  |  ${primaryBiz.business_name ?? ''}` : undefined) ??
        (primaryBiz?.business_contact_email ? `Email: ${primaryBiz.business_contact_email}` : undefined) ??
        (primaryBiz?.business_address ? `Visit: ${primaryBiz.business_address}` : undefined)
      );
    }
    return undefined;
  })();

  type BadgeEntry = { Icon: React.ComponentType<{ className?: string }>; label: string; cls: string };
  const VBADGE: Partial<Record<Variant, BadgeEntry>> = {
    promo:    { Icon: Tag,          label: 'Promo',    cls: 'bg-red-100 text-red-600' },
    event:    { Icon: CalendarDays, label: 'Event',    cls: 'bg-emerald-100 text-emerald-700' },
    location: { Icon: MapPin,       label: 'Location', cls: 'bg-blue-100 text-blue-700' },
    poll:     { Icon: BarChart2,    label: 'Poll',     cls: 'bg-purple-100 text-purple-700' },
    image:    { Icon: Newspaper,    label: 'Photo',    cls: 'bg-slate-100 text-slate-600' },
  };
  const vb = VBADGE[variant] ?? null;

  return (
    <div className={`bg-card rounded-2xl border overflow-hidden hover:shadow-sm transition-shadow ${accent && viewMode === 'personal' ? accent.border : 'border-border/50'}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 pt-4 pb-3 ${accent && viewMode === 'personal' ? accent.bg : ''}`}>
        <Link
          to={`/profile/${post.author_id}`}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden"
        >
          {post.author_avatar
            ? <img src={post.author_avatar} alt="" className="w-full h-full object-cover" />
            : (post.author_name?.charAt(0) ?? '?')}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link to={`/profile/${post.author_id}`} className="text-sm font-semibold hover:underline truncate">
              {post.author_name ?? 'Unknown'}
            </Link>
            {authorProfile?.is_verified && (
              <VerifiedBadge type={authorProfile.verification_type} size="sm" />
            )}
            {viewMode === 'personal' && <UserIcon className="w-3 h-3 text-blue-400 shrink-0" />}
            {viewMode === 'business' && <Store className="w-3 h-3 text-amber-500 shrink-0" />}
            {accent && viewMode === 'personal' && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${accent.badge}`}>{accent.label}</span>
            )}
            {vb && viewMode === 'personal' && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${vb.cls}`}>
                <vb.Icon className="w-2.5 h-2.5" />{vb.label}
              </span>
            )}
          </div>
          {viewMode === 'personal' && authorBusinesses.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-0.5">
              {authorBusinesses.slice(0, 2).map(b => (
                <Link
                  key={b.id}
                  to={`/profile/${post.author_id}?view=business`}
                  className="text-[10px] text-amber-700 font-medium hover:underline flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-full"
                >
                  <Store className="w-2.5 h-2.5" />{b.business_name}
                </Link>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {viewMode === 'business' ? 'Business showroom' : moment(post.created_at).fromNow()}
          </p>
        </div>
        {/* Scale / Profile Peek button */}
        <button
          onClick={() => setPeekOpen(true)}
          className="p-1.5 rounded-full hover:bg-secondary transition-colors shrink-0"
          title="Quick profile peek"
        >
          <Maximize2 className="w-4 h-4 text-muted-foreground" />
        </button>
        <PostCardMenu currentView={viewMode} onSelect={handleViewChange} />
      </div>

      {/* Body */}
      <div className={`transition-all duration-300 ${flipping ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {viewMode === 'personal' ? (
          <>
            {variant === 'image'    && <ImagePost    post={post} />}
            {variant === 'promo'    && <PromoPost    post={post} themeColor={themeColor} primaryBiz={primaryBiz} />}
            {variant === 'event'    && <EventPost    post={post} />}
            {variant === 'location' && <LocationPost post={post} />}
            {variant === 'poll'     && <PollPost     post={post} />}
            {variant === 'text'     && <TextPost     post={post} isPromo={isPromo} themeColor={themeColor} primaryBiz={primaryBiz} />}
          </>
        ) : authorProfile ? (
          <BusinessShowroomFeed
            profile={authorProfile as never}
            currentUser={currentUser as never}
            businesses={authorBusinesses as never}
          />
        ) : (
          <div className="px-4 py-6 text-center">
            <Store className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {viewMode === 'personal' && (
        <div className="flex items-center gap-1 px-4 pb-3 pt-1">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${liked ? 'text-red-500 bg-red-50' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            <span className="font-medium">{likeCount}</span>
          </button>
          <button
            onClick={handleShowComments}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:bg-secondary transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="font-medium">{post.comment_count ?? 0}</span>
          </button>
          <ShareButton
            title={`${post.author_name ?? 'Empire X'} on Empire X`}
            text={(post.content ?? '').slice(0, 100)}
            url={`${window.location.origin}/profile/${post.author_id}`}
            label=""
          />
        </div>
      )}

      {/* Ticker */}
      {viewMode === 'personal' && tickerText && tickerType !== 'none' && (
        <TickerBar text={tickerText} type={tickerType} />
      )}

      {/* Comments */}
      {showComments && viewMode === 'personal' && (
        <div className="border-t border-border/50 px-4 py-3">
          {/* Comment input */}
          <div className="flex gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {currentUser?.full_name?.charAt(0) ?? '?'}
            </div>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
              placeholder="Write a comment..."
              className="flex-1 text-sm bg-secondary/50 rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-amber-500/30"
            />
          </div>

          {loadingComments ? (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Show 1 comment by default, rest on demand */}
              <div className="space-y-2">
                {(showAllComments ? comments : comments.slice(0, 1)).map(c => (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex gap-2 group">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold shrink-0">
                        {(c as any).author_avatar
                          ? <img src={(c as any).author_avatar} alt="" className="w-full h-full object-cover rounded-full" />
                          : c.author_name?.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-secondary/50 rounded-xl px-3 py-2">
                          <p className="text-xs font-semibold">{c.author_name}</p>
                          <p className="text-sm">{c.content}</p>
                        </div>
                        {/* Reply button */}
                        <button
                          onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                          className="mt-0.5 ml-2 text-[11px] text-muted-foreground hover:text-amber-600 flex items-center gap-0.5 transition-colors"
                        >
                          <Reply className="w-3 h-3" />
                          Reply
                        </button>
                        {/* Inline reply input */}
                        {replyingTo === c.id && (
                          <div className="flex gap-1.5 mt-1.5 ml-2">
                            <input
                              autoFocus
                              placeholder={`Reply to ${c.author_name}...`}
                              className="flex-1 text-xs bg-secondary/50 rounded-full px-3 py-1.5 outline-none focus:ring-1 focus:ring-amber-500/30"
                              onKeyDown={async e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (!val) return;
                                  const newC = await entities.Comment.create({
                                    post_id: post.id,
                                    author_id: currentUserId,
                                    author_name: currentUser?.full_name ?? 'You',
                                    content: `@${c.author_name} ${val}`,
                                  });
                                  setComments(prev => [newC, ...prev]);
                                  setReplyingTo(null);
                                  (e.target as HTMLInputElement).value = '';
                                }
                                if (e.key === 'Escape') setReplyingTo(null);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show more / show less comments */}
              {comments.length > 1 && (
                <button
                  onClick={() => setShowAllComments(v => !v)}
                  className="mt-2 text-xs text-amber-600 hover:underline flex items-center gap-1 font-medium"
                >
                  {showAllComments
                    ? <><ChevronUp className="w-3 h-3" /> Hide comments</>
                    : <><ChevronDown className="w-3 h-3" /> View {comments.length - 1} more comment{comments.length - 1 !== 1 ? 's' : ''}</>
                  }
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Profile Peek — inline overlay, covers only this card */}
      <AnimatePresence>
        {peekOpen && (
          <ProfilePeek
            authorId={post.author_id}
            authorName={post.author_name}
            authorAvatar={post.author_avatar}
            initialView={viewMode as 'personal' | 'business'}
            onClose={() => setPeekOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
