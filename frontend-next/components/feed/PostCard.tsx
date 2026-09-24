'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { entities } from '@/api/entities';
import client from '@/api/client';
import { auth } from '@/api/auth';

import {
  Heart, MessageCircle, Store, User as UserIcon,
  Tag, Sparkles, MapPin, CalendarDays, BarChart2, Newspaper,
  Maximize2, X, Reply, ChevronDown, ChevronUp,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { fromNow } from '@/lib/date';
import TickerBar from './TickerBar';
import PostCardMenu from './PostCardMenu';
import BusinessShowroomFeed from './BusinessShowroomFeed';
import ShareButton from '@/components/ui/ShareButton';
import BookmarkButton from '@/components/ui/BookmarkButton';
import VerifiedBadge, { VerificationType } from '@/components/ui/VerifiedBadge';
import ProfilePeek from '@/components/profile/ProfilePeek';
import { useTranslation } from 'react-i18next';
import SafeImage from '@/components/ui/SafeImage';

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

import { UserProfile } from '@/api/entities';

interface Profile extends UserProfile {
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
  author_id?: string;
  author_name?: string;
  author_avatar?: string;
  content?: string;
  parent_id?: string | null;
  reply_count?: number;
}

type Variant = 'image' | 'promo' | 'event' | 'location' | 'poll' | 'text';

function SafeAvatar({ src, alt, fallback, className = '' }: { src?: string | null; alt: string; fallback: React.ReactNode; className?: string }) {
  // Avatars are always small fixed-size — use fill=false with explicit dimensions
  // fill=true requires parent to have position:relative which breaks in many containers
  return <SafeImage src={src} alt={alt} fill={false} width={40} height={40} className={className} fallback={fallback} />;
}

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
          <Link key={i} href={`/hashtag/${part.slice(1)}`} className="text-amber-600 font-medium hover:underline">
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
      <div className="relative overflow-hidden bg-secondary/20" style={{ height: '22rem' }}>
        <SafeImage
          src={post.image_url}
          alt={post.content ? post.content.slice(0, 120) : 'Post image'}
          fill
          sizes="(max-width: 640px) 100vw, 600px"
          className="object-cover"
          loading="lazy"
          decoding="async"
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
        <div className="relative overflow-hidden bg-secondary/20" style={{ height: 220 }}>
          <SafeImage
            src={post.image_url}
            alt="Promo"
            fill
            sizes="(max-width: 640px) 100vw, 600px"
            className="object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setErr(true)}
          />
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
        <div className="relative overflow-hidden mx-4 mb-3 rounded-xl bg-secondary/20" style={{ height: 200 }}>
          <SafeImage
            src={post.image_url}
            alt="Event"
            fill
            sizes="(max-width: 640px) 100vw, 600px"
            className="object-cover rounded-xl"
            loading="lazy"
            decoding="async"
            onError={() => setErr(true)}
          />
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
        {isEnded ? ' · Poll ended' : post.poll_ends_at ? ` · Ends ${fromNow(post.poll_ends_at)}` : ''}
      </p>
    </div>
  );
}

/* ── Main PostCard ───────────────────────────────────── */
interface PostCardProps {
  post: Post;
  currentUserId?: string;
  currentUser?: { full_name?: string | null; [key: string]: unknown } | null;
  feedMode?: string;
}

export default function PostCard({ post, currentUserId, currentUser, feedMode }: PostCardProps) {
  const { t } = useTranslation();
  const [liked, setLiked] = useState(Boolean((post as unknown as Record<string, unknown>).liked_by_me));
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<Profile | null>(null);
  const [authorBusinesses, setAuthorBusinesses] = useState<Business[]>([]);
  const [viewMode, setViewMode] = useState('personal');
  const [flipping, setFlipping] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<{ full_name?: string } | null>(null);
  const [peekOpen, setPeekOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // comment id
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null); // emoji+action popup
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  useEffect(() => { if (feedMode) setViewMode(feedMode); }, [feedMode]);
  useEffect(() => { if (!currentUserData && !currentUser) auth.me().then(setCurrentUserData).catch(() => {}); }, [currentUser, currentUserData]);
  useEffect(() => {
    // Server embeds liked_by_me on feed/single payloads; per-card lookup only
    // as legacy fallback when the flag is absent.
    if ((post as unknown as Record<string, unknown>).liked_by_me !== undefined) return;
    client.get(`/api/posts/${post.id}/like`)
      .then(({ data }) => setLiked(Boolean(data.liked)))
      .catch(() => setLiked(false));
  }, [post.id]);
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
    try {
      const result = await entities.Like.create({ target_id: post.id });
      const r = result as unknown as { like_count?: number };
      if (typeof r.like_count === 'number') {
        setLikeCount(r.like_count);
      }
    }
    catch { setLiked(!nl); setLikeCount(c => nl ? Math.max(0, c - 1) : c + 1); }
  };

  const handleShowComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      try {
        // Fetch oldest-first so root comments appear in chronological order
        const rows = await entities.Comment.filter({ post_id: post.id }, 'created_at', 100);
        setComments(rows);
      } catch {
        setComments([]);
      }
      setLoadingComments(false);
      setShowAllComments(false);
      setExpandedReplies({});
    }
    setShowComments(v => !v);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      const c = await entities.Comment.create({
        post_id: post.id,
        content: commentText.trim(),
      });
      setComments(prev => [...prev, c]);
      setCommentCount(count => count + 1);
      setCommentText('');
      setShowAllComments(true); // show all so the new comment is visible
    } catch (err: any) {
      // toast imported at top via sonner — show inline error
      setCommentText(commentText); // keep text so user can retry
    }
  };

  const handleAddReply = async (parent: Comment, value: string) => {
    const content = value.trim();
    if (!content) return;
    try {
      const reply = await entities.Comment.create({
        post_id: post.id,
        parent_id: parent.id,
        content,
      }) as Comment;
      setComments(prev => [...prev, reply]);
      setCommentCount(count => count + 1);
      // Increment reply_count on the parent comment immediately
      setComments(prev => prev.map(c =>
        c.id === parent.id ? { ...c, reply_count: (c.reply_count ?? 0) + 1 } : c
      ));
      setExpandedReplies(prev => ({ ...prev, [parent.id]: true }));
      setReplyingTo(null);
    } catch { /* ignore */ }
  };

  const handleDeleteComment = async (commentId: string, parentId?: string | null) => {
    try {
      await client.delete(`/api/posts/${post.id}/comments/${commentId}`);
      // Remove the comment and all its replies from local state
      const toRemove = new Set([commentId]);
      comments.forEach(c => { if (c.parent_id === commentId) toRemove.add(c.id); });
      setComments(prev => prev.filter(c => !toRemove.has(c.id)));
      setCommentCount(count => Math.max(0, count - toRemove.size));
      // Update parent reply_count if this was a reply
      if (parentId) {
        setComments(prev => prev.map(c =>
          c.id === parentId ? { ...c, reply_count: Math.max(0, (c.reply_count ?? 1) - 1) } : c
        ));
      }
    } catch { /* ignore */ }
  };

  const rootComments = comments.filter(comment => !comment.parent_id);
  const repliesByParent = comments.reduce<Record<string, Comment[]>>((groups, comment) => {
    if (comment.parent_id) (groups[comment.parent_id] ??= []).push(comment);
    return groups;
  }, {});

  const handleViewChange = (v: string) => {
    if (v === viewMode) return;
    setFlipping(true);
    setTimeout(() => { setViewMode(v); setFlipping(false); }, 220);
  };

  const primaryBiz = authorBusinesses[0] ?? null;
  const themeColor = (primaryBiz?.business_theme_color as string | undefined) ?? '#2563EB';
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

  type BadgeEntry = { Icon: React.ComponentType<{ className?: string }> ; label: string; cls: string };
  const VBADGE: Partial<Record<Variant, BadgeEntry>> = {
    promo:    { Icon: Tag as React.ComponentType<{ className?: string }>,          label: 'Promo',    cls: 'bg-red-100 text-red-600' },
    event:    { Icon: CalendarDays as React.ComponentType<{ className?: string }>, label: 'Event',    cls: 'bg-emerald-100 text-emerald-700' },
    location: { Icon: MapPin as React.ComponentType<{ className?: string }>,       label: 'Location', cls: 'bg-blue-100 text-blue-700' },
    poll:     { Icon: BarChart2 as React.ComponentType<{ className?: string }>,    label: 'Poll',     cls: 'bg-purple-100 text-purple-700' },
    image:    { Icon: Newspaper as React.ComponentType<{ className?: string }>,    label: 'Photo',    cls: 'bg-slate-100 text-slate-600' },
  };
  const vb = VBADGE[variant] ?? null;

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Link
          href={`/profile/${post.author_id}`}
          className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden ${viewMode === 'business' ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-primary'}`}
          aria-label={`View ${post.author_name ?? 'user'}'s profile`}
        >
          <SafeAvatar
            src={(post.author_avatar || authorProfile?.avatar_url) as string | undefined}
            alt={`${post.author_name ?? 'User'} avatar`}
            className="w-full h-full object-cover"
            fallback={post.author_name?.charAt(0) ?? '?'}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/profile/${post.author_id}`} className="text-sm font-semibold hover:underline truncate">
              {post.author_name ?? 'Unknown'}
            </Link>
            {authorProfile?.is_verified && (
              <VerifiedBadge type={authorProfile.verification_type as VerificationType} size="sm" />
            )}
            {viewMode === 'personal' && <UserIcon className="w-3 h-3 text-blue-400 shrink-0" />}
            {viewMode === 'business' && <Store className="w-3 h-3 text-amber-500 shrink-0" />}
            {vb && viewMode === 'personal' && (() => {
              const Icon = vb.Icon;
              return (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${vb.cls}`}>
                  <Icon className="w-2.5 h-2.5" />
                  {vb.label}
                </span>
              );
            })()}
          </div>
          {viewMode === 'personal' && authorBusinesses.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-0.5">
              {authorBusinesses.slice(0, 2).map((b, idx) => (
                <React.Fragment key={b.id}>
                  {idx > 0 && (
                    <span className="text-muted-foreground text-[10px] select-none" aria-hidden="true">|</span>
                  )}
                  <Link
                    href={`/profile/${post.author_id}?view=business`}
                    className="text-[10px] text-muted-foreground font-medium hover:text-primary hover:underline flex items-center gap-0.5"
                  >
                    <Store className="w-2.5 h-2.5 text-primary" />{b.business_name}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {viewMode === 'business' ? t('feed.businessShowroom') : fromNow(post.created_at)}
          </p>
        </div>
        {/* Profile Peek button */}
        <button
          onClick={() => setPeekOpen(true)}
          className="p-1.5 rounded-full hover:bg-secondary transition-colors shrink-0"
          aria-label={`Quick profile peek for ${post.author_name ?? 'user'}`}
        >
          <Maximize2 className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
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
            <p className="text-sm text-muted-foreground">{t('feed.loadingShowroom')}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {viewMode === 'personal' && (
        <div className="flex items-center gap-1 px-4 pb-3 pt-1">
          <button
            onClick={handleLike}
            aria-label={`${liked ? 'Unlike' : 'Like'} post by ${post.author_name ?? 'user'}`}
            aria-pressed={liked}
            className={`post-action-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${liked ? 'text-red-500 bg-red-50' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} aria-hidden="true" />
            <span className="font-medium">{likeCount}</span>
          </button>
          <button
            onClick={handleShowComments}
            aria-label={`${showComments ? 'Hide' : 'View'} comments (${commentCount})`}
            aria-expanded={showComments}
            className="post-action-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:bg-secondary transition-all"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            <span className="font-medium">{commentCount}</span>
          </button>
          <ShareButton
            title={`${post.author_name ?? 'Nodbusiness'} on Nodbusiness`}
            text={(post.content ?? '').slice(0, 100)}
            url={`${typeof window !== 'undefined' ? window.location.origin : 'https://nodbusiness.app'}/profile/${post.author_id}`}
            label=""
          />
          <BookmarkButton
            targetId={post.id}
            targetType="post"
            itemData={{
              title: post.content?.slice(0, 100),
              thumbnailUrl: post.image_url ?? undefined,
            }}
            className="p-1.5"
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
          <div className="flex gap-2 mb-3 items-center">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-semibold shrink-0" aria-hidden="true">
              {currentUser?.full_name?.charAt(0) ?? '?'}
            </div>
            <input
              id={`comment-input-${post.id}`}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
              placeholder={t('feed.postComment')}
              aria-label={t('feed.postComment')}
              className="flex-1 min-w-0 text-sm bg-secondary/50 rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-amber-500/30"
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              aria-label="Post comment"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-amber-500 text-white disabled:opacity-40 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>

          {loadingComments ? (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Show 3 root comments by default, rest on demand */}
              <div className="space-y-2">
                {(showAllComments ? rootComments : rootComments.slice(0, 3)).map(c => (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex gap-2 group">
                      <div className="relative w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                        <SafeAvatar
                          src={(c as any).author_avatar}
                          alt={`${c.author_name ?? 'User'} avatar`}
                          className="w-full h-full object-cover rounded-full"
                          fallback={c.author_name?.charAt(0) ?? '?'}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="bg-secondary/50 rounded-xl px-3 py-2 cursor-pointer select-none"
                          onContextMenu={e => { e.preventDefault(); setCommentMenuId(commentMenuId === c.id ? null : c.id); }}
                          onClick={() => {}}
                        >
                          <p className="text-xs font-semibold">{c.author_name ?? 'Unknown'}</p>
                          <p className="text-sm">{c.content}</p>
                        </div>
                        {/* Emoji + action popup */}
                        {commentMenuId === c.id && (
                          <div className="relative z-50">
                            <div className="absolute left-0 mt-1 w-56 rounded-2xl bg-card border border-border shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                              {/* Emoji row */}
                              <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                                {['❤️','👏','👍','👎','🔥','🤩','😂'].map(emoji => (
                                  <button key={emoji} onClick={() => setCommentMenuId(null)}
                                    className="text-lg hover:scale-125 transition-transform p-0.5" type="button">
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              {/* Action list */}
                              <div className="py-1">
                                {[
                                  { label: 'Reply',    icon: '↩️', action: () => { setReplyingTo(c.id); setCommentMenuId(null); } },
                                  { label: 'Copy',     icon: '📋', action: () => { navigator.clipboard?.writeText(c.content ?? ''); setCommentMenuId(null); } },
                                  { label: 'Copy Link',icon: '🔗', action: () => { navigator.clipboard?.writeText(`${window.location.href}#comment-${c.id}`); setCommentMenuId(null); } },
                                  { label: 'Translate',icon: '🌐', action: () => setCommentMenuId(null) },
                                  ...((c as any).author_id === currentUserId || (currentUser as any)?.role === 'admin'
                                    ? [{ label: 'Delete', icon: '🗑️', action: () => { handleDeleteComment(c.id, null); setCommentMenuId(null); }, danger: true }]
                                    : []),
                                ].map(item => (
                                  <button key={item.label} onClick={item.action} type="button"
                                    className={`flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-secondary/60 transition-colors ${(item as any).danger ? 'text-destructive' : ''}`}>
                                    <span className="text-base w-5">{item.icon}</span>
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {/* Backdrop */}
                            <div className="fixed inset-0 z-40" onClick={() => setCommentMenuId(null)} />
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-0.5 ml-2">
                          <button onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                            className="text-[11px] text-muted-foreground hover:text-amber-600 flex items-center gap-0.5 transition-colors">
                            <Reply className="w-3 h-3" />
                            {t('common.reply')}
                          </button>
                          {((c as any).author_id === currentUserId || (currentUser as any)?.role === 'admin') && (
                            <button onClick={() => handleDeleteComment(c.id, null)}
                              className="text-[11px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5">
                              <X className="w-3 h-3" /> Delete
                            </button>
                          )}
                        </div>
                        {replyingTo === c.id && (
                          <div className="flex gap-1.5 mt-1.5 ml-2">
                            <input autoFocus
                              placeholder={t('feed.replyTo', { name: c.author_name })}
                              aria-label={t('feed.replyTo', { name: c.author_name })}
                              className="flex-1 text-xs bg-secondary/50 rounded-full px-3 py-1.5 outline-none focus:ring-1 focus:ring-amber-500/30"
                              onKeyDown={async e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (!val) return;
                                  await handleAddReply(c, val);
                                  (e.target as HTMLInputElement).value = '';
                                }
                                if (e.key === 'Escape') setReplyingTo(null);
                              }}
                            />
                            <button
                              onClick={async e => {
                                const input = (e.currentTarget.previousSibling as HTMLInputElement);
                                const val = input?.value?.trim();
                                if (!val) return;
                                await handleAddReply(c, val);
                                if (input) input.value = '';
                              }}
                              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-amber-500 text-white text-xs"
                            >↑</button>
                          </div>
                        )}
                      </div>
                    </div>
                    {((c.reply_count ?? 0) > 0 || (repliesByParent[c.id]?.length ?? 0) > 0) && (
                      <div className="ml-9 pt-0.5">
                        <button
                          onClick={() => setExpandedReplies(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                          className="text-[11px] font-medium text-amber-600 hover:text-amber-700 flex items-center gap-0.5"
                        >
                          {expandedReplies[c.id]
                            ? <><ChevronUp className="w-3 h-3" /> Hide replies</>
                            : <><ChevronDown className="w-3 h-3" /> View {repliesByParent[c.id]?.length || c.reply_count} repl{(repliesByParent[c.id]?.length || c.reply_count) === 1 ? 'y' : 'ies'}</>
                          }
                        </button>
                        {expandedReplies[c.id] && (
                          <div className="mt-2 space-y-2 border-l-2 border-amber-200 pl-3">
                            {(repliesByParent[c.id] ?? []).map(reply => (
                              <div key={reply.id} className="flex gap-2 group">
                                <div className="relative w-6 h-6 rounded-full bg-secondary shrink-0 overflow-hidden text-[10px] font-semibold flex items-center justify-center">
                                  <SafeAvatar src={(reply as any).author_avatar} alt={`${reply.author_name ?? 'User'} avatar`} className="w-full h-full object-cover" fallback={reply.author_name?.charAt(0) ?? '?'} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2">
                                    <p className="text-xs font-semibold">{reply.author_name ?? 'Unknown'}</p>
                                    <p className="text-sm">{reply.content}</p>
                                  </div>
                                  {((reply as any).author_id === currentUserId || (currentUser as any)?.role === 'admin') && (
                                    <button onClick={() => handleDeleteComment(reply.id, c.id)}
                                      className="mt-0.5 ml-2 text-[11px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5">
                                      <X className="w-3 h-3" /> Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {rootComments.length > 3 && (
                <button onClick={() => setShowAllComments(v => !v)}
                  className="mt-2 text-xs text-amber-600 hover:underline flex items-center gap-1 font-medium">
                  {showAllComments
                    ? <><ChevronUp className="w-3 h-3" /> {t('feed.hideComments')}</>
                    : <><ChevronDown className="w-3 h-3" /> {t('feed.viewMoreComments', { count: rootComments.length - 3 })}</>
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
