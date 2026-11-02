'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { entities } from '@/api/entities';
import client from '@/api/client';
import { auth } from '@/api/auth';
import { useAuth } from '@/lib/AuthContext';

import {
  Heart, MessageCircle, Store, User as UserIcon,
  Tag, Sparkles, MapPin, CalendarDays, BarChart2, Newspaper,
  Maximize2, Reply, ChevronDown, ChevronUp,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { fromNow } from '@/lib/date';
import TickerBar from './TickerBar';
import PostCardMenu from './PostCardMenu';
import EditPostDialog from './EditPostDialog';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BusinessFeedCard } from './BusinessShowroomFeed';
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
  /** In-app destination, e.g. /showroom/<slug> for a site announcement. */
  link_url?: string | null;
  like_count?: number | null;
  comment_count?: number;
  created_at?: string;
  post_type?: string;
  /** Set when the author edited the text or photo. */
  edited_at?: string | null;
  /** Reactions (one per person): mine, the top three, and the total in like_count (null when the owner hides it). */
  my_reaction?: Reaction | null;
  top_reactions?: Reaction[];
  liked_by_me?: boolean;
  comment_policy?: CommentPolicy | null;
  hide_like_count?: boolean | null;
  notifications_off?: boolean | null;
  is_pinned?: boolean | null;
}

import { UserProfile } from '@/api/entities';
import PhotoViewer from '@/components/feed/PhotoViewer';
import PostMoreMenu from '@/components/feed/PostMoreMenu';
import CommentMenu from '@/components/feed/CommentMenu';
import ReactionPicker from '@/components/feed/ReactionPicker';
import WhoReactedDialog from '@/components/feed/WhoReactedDialog';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import { editComment, postLink, react, reactToComment, REACTIONS, setMuted, unhidePost, unreact, type CommentPolicy, type Reaction } from '@/lib/socialApi';
import { loadOwnerFeedBusinesses } from '@/lib/feedBusiness';
import EmojiInsertButton from '@/components/ui/EmojiInsertButton';

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
  created_at?: string;
  edited_at?: string | null;
  my_reaction?: Reaction | null;
  reaction_count?: number;
  top_reactions?: Reaction[];
  /** True while the server round-trip is in flight (optimistic entry). */
  _pending?: boolean;
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

/** Edit a comment in place (Enter saves, Escape cancels). */
function CommentEditor({ initial, onSave, onCancel }: { initial: string; onSave: (text: string) => Promise<void>; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try { await onSave(value); } catch (err) { toast.error(apiErrorMessage(err, 'Could not save your edit.')); setBusy(false); }
  };
  return (
    <div className="mt-1 space-y-1">
      <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={2} aria-label="Edit comment"
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void save(); } if (e.key === 'Escape') onCancel(); }}
        className="w-full resize-none rounded-lg border border-border bg-background px-2 py-1 text-sm" />
      <div className="flex gap-2">
        <button type="button" onClick={() => void save()} disabled={busy || !text.trim()} className="min-h-8 rounded-full bg-amber-500 px-3 text-xs font-semibold text-white disabled:opacity-50">Save</button>
        <button type="button" onClick={onCancel} className="min-h-8 rounded-full px-3 text-xs">Cancel</button>
      </div>
    </div>
  );
}

/* ── Post type renderers ────────────────────────────── */
function ImagePost({ post, onOpen }: { post: Post; onOpen: () => void }) {
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
        {/* The photo opens full screen; the caption sits above it so hashtag links stay tappable. */}
        <button type="button" onClick={onOpen} aria-label="Open photo full screen" className="absolute inset-0 block cursor-zoom-in">
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
        </button>
        {post.content && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-4">
            <p className="text-white text-sm leading-relaxed line-clamp-3 [&_a]:pointer-events-auto">
              <RenderText text={post.content} />
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PromoPost({ post, themeColor, primaryBiz, onOpen }: { post: Post; themeColor: string; primaryBiz: Business | null; onOpen: () => void }) {
  const [err, setErr] = useState(false);
  return (
    <div>
      {post.image_url && !err && (
        <button type="button" onClick={onOpen} aria-label="Open photo full screen" className="relative block w-full overflow-hidden bg-secondary/20 cursor-zoom-in " style={{ height: 220 }}>
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
        </button>
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

function EventPost({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const [err, setErr] = useState(false);
  return (
    <div>
      {post.image_url && !err && (
        <div className="mx-4 mb-3">
        <button type="button" onClick={onOpen} aria-label="Open photo full screen" className="relative block w-full overflow-hidden bg-secondary/20 cursor-zoom-in rounded-xl" style={{ height: 200 }}>
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
        </button>
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
  /** Called after the post was deleted, so the list can drop it. */
  onDeleted?: (postId: string) => void;
}

export default function PostCard({ post: postProp, currentUserId, currentUser, feedMode, onDeleted }: PostCardProps) {
  const { t } = useTranslation();
  const { isAuthenticated, user: authUser } = useAuth();
  // Local copy so an edit shows at once; resets when the parent passes a new post.
  const [post, setPost] = useState<Post>(postProp);
  useEffect(() => { setPost(postProp); }, [postProp]);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const viewerId = currentUserId ?? (authUser?.id as string | undefined);
  const isAuthor = Boolean(viewerId && post.author_id === viewerId);
  const isAdmin = (authUser as { role?: string } | null)?.role === 'admin' || (currentUser as { role?: string } | null | undefined)?.role === 'admin';

  const savePost = async (changes: { content: string; image_url: string | null }) => {
    const before = post;
    const post_type = before.post_type === 'image' || before.post_type === 'text' || !before.post_type
      ? (changes.image_url ? 'image' : 'text')
      : before.post_type;
    setPost({ ...before, ...changes, post_type, edited_at: new Date().toISOString() });
    try {
      const saved = await entities.Post.update(before.id, { ...changes, post_type }) as Partial<Post> | null;
      if (saved) setPost((current) => ({ ...current, ...saved }));
      toast.success('Post updated');
    } catch (err) {
      setPost(before);
      throw err;
    }
  };

  const deletePost = async () => {
    // Hide the card at once and bring it back if the request fails.
    setDeleting(true);
    setConfirmDelete(false);
    setDeleted(true);
    try {
      await entities.Post.delete(post.id);
      toast.success('Post deleted');
      onDeleted?.(post.id);
    } catch {
      setDeleted(false);
      toast.error('Could not delete the post. Try again.');
    } finally {
      setDeleting(false);
    }
  };
  const embeddedLikedByMe = post.my_reaction !== undefined ? post.my_reaction : post.liked_by_me;
  const [myReaction, setMyReaction] = useState<Reaction | null>(post.my_reaction ?? (post.liked_by_me ? '❤️' : null));
  const liked = Boolean(myReaction);
  const [likeCount, setLikeCount] = useState<number | null>(post.like_count === null ? null : (post.like_count ?? 0));
  const [topReactions, setTopReactions] = useState<Reaction[]>(post.top_reactions ?? []);
  const [hiddenNote, setHiddenNote] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [likePicker, setLikePicker] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = React.useRef(false);
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<Profile | null>(null);
  const [authorBusinesses, setAuthorBusinesses] = useState<Business[]>([]);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  // The business view shows the same full card as the business feed (site sections and spotlight).
  const [authorCard, setAuthorCard] = useState<Business | null | undefined>(undefined);
  const [viewMode, setViewMode] = useState('personal');
  const [flipping, setFlipping] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<{ full_name?: string } | null>(null);
  const [peekOpen, setPeekOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // comment id
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null); // emoji+action popup
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  // Controlled text for each reply input, keyed by comment id
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  // Cached profile data for comment authors (business_name + is_verified + verification_type)
  const [commentAuthorProfiles, setCommentAuthorProfiles] = useState<Record<string, { business_name?: string; is_verified?: boolean; verification_type?: string }>>({});

  useEffect(() => { if (feedMode) setViewMode(feedMode); }, [feedMode]);
  useEffect(() => { if (isAuthenticated && !currentUserData && !currentUser) auth.me().then(setCurrentUserData).catch(() => {}); }, [currentUser, currentUserData, isAuthenticated]);
  useEffect(() => {
    // Server embeds liked_by_me on feed/single payloads; per-card lookup only
    // as legacy fallback when the flag is absent.
    if (embeddedLikedByMe !== undefined) {
      setMyReaction(post.my_reaction ?? (embeddedLikedByMe ? '❤️' : null));
      return;
    }
    if (!isAuthenticated) { setMyReaction(null); return; }
    client.get(`/api/posts/${post.id}/like`)
      .then(({ data }) => setMyReaction(data.liked ? '❤️' : null))
      .catch(() => setMyReaction(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, embeddedLikedByMe, isAuthenticated]);
  useEffect(() => {
    if (!post.author_id) return;
    entities.UserProfile.filter({ user_id: post.author_id })
      .then((p: Profile[]) => { if (p.length) setAuthorProfile(p[0]); })
      .catch(() => {});
    entities.Business.filter({ owner_id: post.author_id })
      .then((b: Business[]) => setAuthorBusinesses(b ?? []))
      .catch(() => {});
  }, [post.author_id]);

  useEffect(() => {
    if (viewMode !== 'business' || authorCard !== undefined || !post.author_id) return;
    let cancelled = false;
    loadOwnerFeedBusinesses(post.author_id)
      .then((entries) => { if (!cancelled) setAuthorCard((entries[0] as Business | undefined) ?? null); })
      .catch(() => { if (!cancelled) setAuthorCard(null); });
    return () => { cancelled = true; };
  }, [viewMode, authorCard, post.author_id]);

  /** Set, change or remove my reaction (null removes it). */
  const applyReaction = async (next: Reaction | null) => {
    const before = { myReaction, likeCount, topReactions };
    setMyReaction(next);
    if (likeCount !== null) setLikeCount((c) => Math.max(0, (c ?? 0) + (!before.myReaction && next ? 1 : before.myReaction && !next ? -1 : 0)));
    try {
      const summary = next ? await react(post.id, next) : await unreact(post.id);
      setMyReaction(summary.my_reaction);
      setLikeCount(summary.like_count);
      setTopReactions(summary.top_reactions);
    } catch (err) {
      setMyReaction(before.myReaction); setLikeCount(before.likeCount); setTopReactions(before.topReactions);
      toast.error(apiErrorMessage(err, 'Could not save your reaction.'));
    }
  };
  const handleLike = () => applyReaction(myReaction ? null : '❤️');
  const startLongPress = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => { longPressed.current = true; setLikePicker(true); }, 450);
  };
  const cancelLongPress = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };
  const removeFromFeed = (why: 'muted' | 'blocked') => {
    setDeleted(true);
    const name = post.author_name ?? 'this person';
    if (why === 'muted') {
      toast.success(`Muted ${name}. Their posts won’t show in your feed.`, {
        action: { label: 'Undo', onClick: () => { void setMuted(post.author_id, false).then(() => setDeleted(false)); } },
      });
    } else {
      toast.success(`Blocked ${name}. You can unblock them in Privacy settings.`);
    }
  };

  const handleShowComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      try {
        // Fetch oldest-first so root comments appear in chronological order
        const rows = await entities.Comment.filter({ post_id: post.id }, 'created_at', 100);
        setComments(rows);
        // Batch-fetch business profiles for comment authors
        const uniqueAuthorIds = [...new Set((rows as Comment[]).map(c => c.author_id).filter((id): id is string => Boolean(id)))];
        Promise.all(
          uniqueAuthorIds.map(id =>
            entities.UserProfile.filter({ user_id: id })
              .then((p: Profile[]) => ({ id, profile: p[0] ?? null }))
              .catch(() => ({ id, profile: null }))
          )
        ).then(results => {
          const map: Record<string, { business_name?: string; is_verified?: boolean; verification_type?: string }> = {};
          results.forEach(({ id, profile }) => {
            if (profile) map[id] = { business_name: (profile as any).business_name ?? undefined, is_verified: (profile as any).is_verified ?? undefined, verification_type: (profile as any).verification_type ?? undefined };
          });
          setCommentAuthorProfiles(map);
        }).catch(() => {});
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
    const text = commentText.trim();
    const optimisticId = `pending-${Date.now()}`;
    const optimistic: Comment = {
      id: optimisticId,
      author_id: viewerId,
      author_name: currentUser?.full_name ?? currentUserData?.full_name ?? 'You',
      author_avatar: undefined,
      content: text,
      created_at: new Date().toISOString(),
      parent_id: null,
      reply_count: 0,
      reaction_count: 0,
      _pending: true,
    };
    setComments(prev => [...prev, optimistic]);
    setCommentCount(count => count + 1);
    setCommentText('');
    setShowAllComments(true);
    try {
      const c = await entities.Comment.create({ post_id: post.id, content: text });
      setComments(prev => prev.map(x => x.id === optimisticId ? { ...c, _pending: false } : x));
      // Seed profile cache for the current user if not already present — read state
      // directly from the closure to avoid side effects inside a state updater.
      if (viewerId && !commentAuthorProfiles[viewerId]) {
        entities.UserProfile.filter({ user_id: viewerId })
          .then((p: Profile[]) => {
            if (p[0]) setCommentAuthorProfiles(m => ({ ...m, [viewerId]: { business_name: (p[0] as any).business_name ?? undefined, is_verified: (p[0] as any).is_verified ?? undefined, verification_type: (p[0] as any).verification_type ?? undefined } }));
          })
          .catch(() => {});
      }
    } catch (err) {
      setComments(prev => prev.filter(x => x.id !== optimisticId));
      setCommentCount(count => Math.max(0, count - 1));
      setCommentText(text);
      toast.error(apiErrorMessage(err, 'Could not post your comment.'));
    }
  };

  const handleAddReply = async (parent: Comment, value: string) => {
    const content = value.trim();
    if (!content) return;
    // Optimistic reply entry
    const optimisticId = `pending-reply-${Date.now()}`;
    const optimistic: Comment = {
      id: optimisticId,
      author_id: viewerId,
      author_name: currentUser?.full_name ?? currentUserData?.full_name ?? 'You',
      author_avatar: undefined,
      content,
      created_at: new Date().toISOString(),
      parent_id: parent.id,
      reply_count: 0,
      reaction_count: 0,
      _pending: true,
    };
    setComments(prev => [...prev, optimistic]);
    setCommentCount(count => count + 1);
    setComments(prev => prev.map(c =>
      c.id === parent.id ? { ...c, reply_count: (c.reply_count ?? 0) + 1 } : c
    ));
    setExpandedReplies(prev => ({ ...prev, [parent.id]: true }));
    setReplyingTo(null);
    try {
      const reply = await entities.Comment.create({
        post_id: post.id,
        parent_id: parent.id,
        content,
      }) as Comment;
      setComments(prev => prev.map(x => x.id === optimisticId ? { ...reply, _pending: false } : x));
      // Seed profile cache for the reply author if not already present — read state
      // directly from the closure to avoid side effects inside a state updater.
      const authorId = (reply as Comment).author_id;
      if (authorId && !commentAuthorProfiles[authorId]) {
        entities.UserProfile.filter({ user_id: authorId })
          .then((p: Profile[]) => {
            if (p[0]) setCommentAuthorProfiles(m => ({ ...m, [authorId]: { business_name: (p[0] as any).business_name ?? undefined, is_verified: (p[0] as any).is_verified ?? undefined, verification_type: (p[0] as any).verification_type ?? undefined } }));
          })
          .catch(() => {});
      }
      // Reply succeeded — signal success so the caller can clear the draft
      return true;
    } catch (err) {
      // Roll back the optimistic entry
      setComments(prev => prev.filter(x => x.id !== optimisticId));
      setCommentCount(count => Math.max(0, count - 1));
      setComments(prev => prev.map(c =>
        c.id === parent.id ? { ...c, reply_count: Math.max(0, (c.reply_count ?? 1) - 1) } : c
      ));
      toast.error(apiErrorMessage(err, 'Could not post your reply.'));
      return false;
    }
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

  // Ticker display logic:
  // - ticker_type 'none' with empty ticker_text = never touched, skip auto-gen
  // - ticker_type 'none' with ticker_text set = user explicitly turned off, hide
  // - ticker_type null/undefined = not configured, auto-generate from business contact info
  // - ticker_type 'auto' = auto-generate from ticker_text or business contact info
  // - any other type = show ticker_text directly
  const rawTickerType = (authorProfile?.ticker_type as string | undefined);
  const profileTickerText = (authorProfile?.ticker_text as string | undefined)?.trim();

  // Resolve effective type: null means "not configured" → auto-generate
  const tickerType = rawTickerType === 'none'
    ? 'none'
    : rawTickerType || 'auto';   // null/undefined → treat as 'auto'

  const tickerText = (() => {
    if (tickerType === 'none') return undefined;
    // Use explicitly set text first
    if (profileTickerText) return profileTickerText;
    // Auto-generate from business contact info — check direct columns first
    const phone   = (primaryBiz?.business_contact_phone as string | undefined)?.trim();
    const email   = (primaryBiz?.business_contact_email as string | undefined)?.trim();
    const address = (primaryBiz?.business_address       as string | undefined)?.trim();
    const bizName = (primaryBiz?.business_name          as string | undefined)?.trim();
    if (phone)   return `📞 ${phone}  ·  ${bizName ?? ''}`;
    if (email)   return `✉️ ${email}`;
    if (address) return `📍 ${address}`;
    // Fallback: read from the contact section inside business_sections JSON
    try {
      const sectionsRaw = primaryBiz?.business_sections as string | undefined;
      if (sectionsRaw) {
        const parsed: Array<Record<string, unknown>> = JSON.parse(sectionsRaw);
        const contact = parsed.find(s => s.type === 'contact');
        if (contact) {
          const p = (contact.phone    as string | undefined)?.trim();
          const e = (contact.email    as string | undefined)?.trim();
          const a = (contact.location as string | undefined)?.trim();
          if (p) return `📞 ${p}  ·  ${bizName ?? ''}`;
          if (e) return `✉️ ${e}`;
          if (a) return `📍 ${a}`;
        }
      }
    } catch { /* ignore JSON parse errors */ }
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

  if (deleted) return null;
  if (hiddenNote) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3 text-sm">
        <span className="text-muted-foreground">You won’t see this post in your feed.</span>
        <button type="button" onClick={() => { void unhidePost(post.id).then(() => setHiddenNote(false)).catch(() => toast.error('Could not undo.')); }}
          className="min-h-9 rounded-full px-3 font-semibold text-primary hover:bg-secondary">Undo</button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-sm transition-shadow">
      {viewerOpen && post.image_url && (
        <PhotoViewer
          photos={[{ src: post.image_url, alt: post.content ? post.content.slice(0, 120) : 'Post photo' }]}
          author={post.author_name}
          caption={post.content}
          onClose={() => setViewerOpen(false)}
          footer={
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleLike} aria-pressed={liked} aria-label={`${liked ? 'Unlike' : 'Like'} photo`}
                className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${liked ? 'bg-red-500 text-white' : 'bg-white/15 text-white'}`}>
                <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} aria-hidden="true" /> {likeCount}
              </button>
              {viewMode === 'personal' && (
                <button type="button" onClick={() => { setViewerOpen(false); if (!showComments) void handleShowComments(); }} aria-label={`Comments (${commentCount})`}
                  className="flex min-h-11 items-center gap-1.5 rounded-full bg-white/15 px-4 text-sm font-semibold text-white">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> {commentCount}
                </button>
              )}
            </div>
          }
        />
      )}
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Link
          href={`/profile/${post.author_id}?view=${viewMode === 'business' ? 'business' : 'personal'}`}
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
            <Link href={`/profile/${post.author_id}?view=${viewMode === 'business' ? 'business' : 'personal'}`} className="text-sm font-semibold hover:underline truncate">
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
                    href={
                      (b.business_slug ?? (b as { slug?: string }).slug)
                        ? `/showroom/${b.business_slug ?? (b as { slug?: string }).slug}`
                        : `/profile/${post.author_id}?view=business`
                    }
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
            {viewMode !== 'business' && post.edited_at && (
              <span title={`Edited ${fromNow(post.edited_at)}`}> · Edited</span>
            )}
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
        <PostCardMenu
          currentView={viewMode}
          onSelect={handleViewChange}
        />
      </div>

      {/* Body */}
      <div className={`transition-all duration-300 ${flipping ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {viewMode === 'personal' ? (
          <>
            {variant === 'image'    && <ImagePost    post={post} onOpen={() => setViewerOpen(true)} />}
            {variant === 'promo'    && <PromoPost    post={post} themeColor={themeColor} primaryBiz={primaryBiz} onOpen={() => setViewerOpen(true)} />}
            {variant === 'event'    && <EventPost    post={post} onOpen={() => setViewerOpen(true)} />}
            {variant === 'location' && <LocationPost post={post} />}
            {variant === 'poll'     && <PollPost     post={post} />}
            {variant === 'text'     && <TextPost     post={post} isPromo={isPromo} themeColor={themeColor} primaryBiz={primaryBiz} />}
            {post.link_url?.startsWith('/') && !post.link_url.startsWith('//') && (
              <div className="px-4 pb-3">
                <Link href={post.link_url} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: themeColor }}>
                  <Store className="w-4 h-4" /> Visit site
                </Link>
              </div>
            )}
          </>
        ) : (() => {
          const biz = authorCard ?? (authorCard === null ? authorBusinesses[0] : undefined);
          if (!biz || !authorProfile) {
            return (
              <div className="px-4 py-6 text-center">
                <Store className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('feed.loadingShowroom')}</p>
              </div>
            );
          }
          return (
            <BusinessFeedCard
              biz={biz}
              ownerName={post.author_name}
              ownerAvatarUrl={post.author_avatar}
              ownerIsVerified={authorProfile?.is_verified ?? false}
              viewer={viewerId ? { id: viewerId } : null}
            />
          );
        })()}
      </div>

      {/* Actions */}
      {viewMode === 'personal' && (
        <div className="flex items-center gap-1 px-4 pb-3 pt-1">
          <Popover open={likePicker} onOpenChange={setLikePicker}>
            <PopoverAnchor asChild>
              <button
                type="button"
                onClick={() => { if (longPressed.current) { longPressed.current = false; return; } void handleLike(); }}
                onPointerDown={startLongPress}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onContextMenu={(e) => { e.preventDefault(); setLikePicker(true); }}
                aria-label={`${liked ? 'Unlike' : 'Like'} post by ${post.author_name ?? 'user'}`}
                aria-pressed={liked}
                title="Hold for more reactions"
                className={`post-action-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all select-none ${liked ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-muted-foreground hover:bg-secondary'}`}
              >
                {myReaction && myReaction !== '❤️'
                  ? <span aria-hidden="true" className="text-base leading-none">{myReaction}</span>
                  : <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} aria-hidden="true" />}
              </button>
            </PopoverAnchor>
            <PopoverContent side="top" align="start" className="w-auto rounded-full p-1">
              <ReactionPicker current={myReaction} onPick={(r) => { setLikePicker(false); void applyReaction(myReaction === r ? null : r); }} size="sm" />
            </PopoverContent>
          </Popover>
          {(topReactions.length > 0 || (likeCount ?? 0) > 0) && (
            <button
              type="button"
              onClick={() => setReactionsOpen(true)}
              aria-label={likeCount === null ? 'See reactions' : `See who reacted (${likeCount})`}
              className="post-action-btn -ml-1 flex items-center gap-1 rounded-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
            >
              <span aria-hidden="true" className="flex -space-x-1 text-sm">{topReactions.map((r) => <span key={r}>{r}</span>)}</span>
              {likeCount !== null && <span className="font-medium">{likeCount}</span>}
            </button>
          )}
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
            url={postLink(post.id)}
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
          <PostMoreMenu
            post={post}
            isAuthor={isAuthor}
            isAdmin={isAdmin}
            signedIn={Boolean(viewerId)}
            myReaction={myReaction}
            onReact={(r) => { void applyReaction(myReaction === r ? null : r); }}
            onReply={() => { if (!showComments) void handleShowComments(); setTimeout(() => document.getElementById(`comment-input-${post.id}`)?.focus(), 150); }}
            onEdit={isAuthor ? () => setEditOpen(true) : undefined}
            onDelete={isAuthor || isAdmin ? () => setConfirmDelete(true) : undefined}
            onHidden={() => setHiddenNote(true)}
            onRemoved={removeFromFeed}
            onSettings={(changes) => {
              setPost((p) => ({ ...p, ...changes }));
              if (changes.hide_like_count === false && likeCount === null) setLikeCount(0);
            }}
          />
          <WhoReactedDialog postId={post.id} open={reactionsOpen} onOpenChange={setReactionsOpen} />
        </div>
      )}

      {/* Ticker */}
      {viewMode === 'personal' && tickerText && tickerType !== 'none' && (
        <TickerBar text={tickerText} type={tickerType} />
      )}

      {/* Comments */}
      {showComments && viewMode === 'personal' && (
        <div className="border-t border-border/50 px-4 py-3">
          {post.comment_policy === 'off' && !isAuthor ? (
            <p className="mb-3 rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">Comments are turned off for this post.</p>
          ) : (
          <div className="flex gap-2 mb-3 items-center">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-semibold shrink-0" aria-hidden="true">
              {currentUser?.full_name?.charAt(0) ?? '?'}
            </div>
            <input
              id={`comment-input-${post.id}`}
              ref={commentInputRef}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
              placeholder={t('feed.postComment')}
              aria-label={t('feed.postComment')}
              maxLength={500}
              className="flex-1 min-w-0 text-sm bg-secondary/50 rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-amber-500/30"
            />
            <EmojiInsertButton value={commentText} inputRef={commentInputRef} placement="above"
              onChange={(next) => setCommentText(next.slice(0, 500))} />
            {commentText.length > 0 && (
              <span
                className={`text-[11px] shrink-0 tabular-nums ${commentText.length > 200 ? 'text-amber-500' : 'text-muted-foreground'}`}
                aria-live="polite"
                aria-label={`${commentText.length} of 500 characters`}
              >
                {commentText.length}/500
              </span>
            )}
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              aria-label="Post comment"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-amber-500 text-white disabled:opacity-40 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          )}

          {loadingComments ? (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Show 3 root comments by default, rest on demand */}
              <div className="space-y-2">
                {(showAllComments ? rootComments : rootComments.slice(0, 3)).map(c => (
                  <div key={c.id} className={`space-y-1.5 ${c._pending ? 'opacity-60' : ''}`}>
                    <div className="flex gap-2 group">
                      {/* Avatar — clickable link to commenter's profile */}
                      {c.author_id ? (
                        <Link
                          href={`/profile/${c.author_id}`}
                          className="relative w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden"
                          aria-label={`View ${c.author_name ?? 'user'}'s profile`}
                        >
                          <SafeAvatar
                            src={(c as any).author_avatar}
                            alt={`${c.author_name ?? 'User'} avatar`}
                            className="w-full h-full object-cover rounded-full"
                            fallback={c.author_name?.charAt(0) ?? '?'}
                          />
                        </Link>
                      ) : (
                        <span className="relative w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                          <SafeAvatar
                            src={(c as any).author_avatar}
                            alt={`${c.author_name ?? 'User'} avatar`}
                            className="w-full h-full object-cover rounded-full"
                            fallback={c.author_name?.charAt(0) ?? '?'}
                          />
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div
                          className="bg-secondary/60 dark:bg-secondary/40 rounded-2xl px-3 py-2 select-none"
                          onContextMenu={e => { e.preventDefault(); setCommentMenuId(commentMenuId === c.id ? null : c.id); }}
                        >
                          <div className="flex items-center gap-1 flex-wrap">
                            {c.author_id ? (
                              <Link
                                href={`/profile/${c.author_id}`}
                                className="text-xs font-semibold hover:underline"
                              >
                                {c.author_name ?? 'Unknown'}
                              </Link>
                            ) : (
                              <span className="text-xs font-semibold">{c.author_name ?? 'Unknown'}</span>
                            )}
                            {commentAuthorProfiles[c.author_id ?? '']?.is_verified && (
                              <VerifiedBadge type={commentAuthorProfiles[c.author_id ?? '']?.verification_type as VerificationType} size="sm" />
                            )}
                          </div>
                          {commentAuthorProfiles[c.author_id ?? '']?.business_name && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                              <Store className="w-2.5 h-2.5 text-primary shrink-0" />
                              {commentAuthorProfiles[c.author_id ?? ''].business_name}
                            </p>
                          )}
                          {editingCommentId === c.id ? (
                            <CommentEditor initial={c.content ?? ''} onCancel={() => setEditingCommentId(null)}
                              onSave={async (text) => {
                                const updated = await editComment(post.id, c.id, text);
                                setComments(prev => prev.map(x => x.id === c.id ? { ...x, content: updated.content, edited_at: updated.edited_at } : x));
                                setEditingCommentId(null);
                              }} />
                          ) : (
                            <p className="text-sm leading-relaxed">{c.content}{c.edited_at && <span className="ml-1 text-[11px] text-muted-foreground">(edited)</span>}</p>
                          )}
                        </div>
                        {/* Reaction bubble */}
                        {(c.reaction_count ?? 0) > 0 && (
                          <span className="ml-2 -mt-1 inline-flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 text-[11px]" aria-label={`${c.reaction_count} reactions`}>
                            <span aria-hidden="true">{(c.top_reactions ?? [c.my_reaction]).filter(Boolean).slice(0, 3).join('')}</span>{c.reaction_count}
                          </span>
                        )}
                        {/* Action row */}
                        <div className="flex items-center gap-3 mt-1 ml-1 text-[11px] text-muted-foreground">
                          {/* Quick heart react */}
                          <button
                            onClick={async () => {
                              if (!viewerId) return;
                              const next = c.my_reaction ? null : '❤️';
                              const result = await reactToComment(post.id, c.id, next).catch(() => null);
                              if (result) setComments(prev => prev.map(x => x.id === c.id ? { ...x, my_reaction: result.my_reaction, reaction_count: result.reaction_count, top_reactions: result.my_reaction ? Array.from(new Set([result.my_reaction, ...(x.top_reactions ?? [])])).slice(0, 3) as typeof REACTIONS[number][] : x.top_reactions } : x));
                            }}
                            className={`flex items-center gap-0.5 transition-colors ${c.my_reaction ? 'text-red-500' : 'hover:text-red-500'}`}
                            aria-label={c.my_reaction ? 'Unlike comment' : 'Like comment'}
                            aria-pressed={Boolean(c.my_reaction)}
                          >
                            <Heart className={`w-3 h-3 ${c.my_reaction ? 'fill-current' : ''}`} aria-hidden="true" />
                            {(c.reaction_count ?? 0) > 0 && <span>{c.reaction_count}</span>}
                          </button>
                          {/* Reply */}
                          <button onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                            className="hover:text-amber-600 flex items-center gap-0.5 transition-colors">
                            <Reply className="w-3 h-3" />
                            {t('common.reply')}
                          </button>
                          {/* Timestamp */}
                          {c.created_at && (
                            <span className="text-[11px] text-muted-foreground">{fromNow(c.created_at)}</span>
                          )}
                          {/* ⋯ menu */}
                          <CommentMenu
                            comment={c}
                            postId={post.id}
                            viewerId={viewerId}
                            isPostAuthor={isAuthor}
                            isAdmin={isAdmin}
                            open={commentMenuId === c.id}
                            onOpenChange={(open) => setCommentMenuId(open ? c.id : null)}
                            onReply={() => setReplyingTo(c.id)}
                            onEdit={() => setEditingCommentId(c.id)}
                            onDelete={() => handleDeleteComment(c.id, null)}
                            onReacted={(r) => setComments(prev => prev.map(x => x.id === c.id ? { ...x, my_reaction: r.my_reaction, reaction_count: r.reaction_count, top_reactions: r.my_reaction ? Array.from(new Set([r.my_reaction, ...(x.top_reactions ?? [])])).slice(0, 3) as typeof REACTIONS[number][] : x.top_reactions } : x))}
                            onAuthorHidden={(authorId) => setComments(prev => prev.filter(x => x.author_id !== authorId))}
                          />
                        </div>
                        {/* Controlled reply input */}
                        {replyingTo === c.id && (
                          <div className="flex gap-1.5 mt-1.5 ml-2">
                            <input
                              autoFocus
                              value={replyTexts[c.id] ?? ''}
                              onChange={e => setReplyTexts(prev => ({ ...prev, [c.id]: e.target.value }))}
                              placeholder={t('feed.replyTo', { name: c.author_name })}
                              aria-label={t('feed.replyTo', { name: c.author_name })}
                              maxLength={500}
                              className="flex-1 text-xs bg-secondary/50 rounded-full px-3 py-1.5 outline-none focus:ring-1 focus:ring-amber-500/30"
                              onKeyDown={async e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  const val = replyTexts[c.id]?.trim();
                                  if (!val) return;
                                  const ok = await handleAddReply(c, val);
                                  if (ok) setReplyTexts(prev => ({ ...prev, [c.id]: '' }));
                                }
                                if (e.key === 'Escape') { setReplyingTo(null); setReplyTexts(prev => ({ ...prev, [c.id]: '' })); }
                              }}
                            />
                            {(replyTexts[c.id]?.length ?? 0) > 0 && (
                              <span
                                className={`text-[11px] shrink-0 self-center tabular-nums ${(replyTexts[c.id]?.length ?? 0) > 200 ? 'text-amber-500' : 'text-muted-foreground'}`}
                                aria-live="polite"
                                aria-label={`${replyTexts[c.id]?.length ?? 0} of 500 characters`}
                              >
                                {replyTexts[c.id]?.length ?? 0}/500
                              </span>
                            )}
                            <button
                              onClick={async () => {
                                const val = replyTexts[c.id]?.trim();
                                if (!val) return;
                                const ok = await handleAddReply(c, val);
                                if (ok) setReplyTexts(prev => ({ ...prev, [c.id]: '' }));
                              }}
                              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-amber-500 text-white text-xs"
                              aria-label="Send reply"
                            >↑</button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Replies section */}
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
                        <div
                          className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
                          style={{ maxHeight: expandedReplies[c.id] ? '2000px' : '0px' }}
                        >
                          <div className="mt-2 space-y-2 border-l-2 border-amber-200 pl-3">
                            {(repliesByParent[c.id] ?? []).map(reply => (
                                <div key={reply.id} className="flex gap-2 group">
                                  {reply.author_id ? (
                                    <Link
                                      href={`/profile/${reply.author_id}`}
                                      className="relative w-6 h-6 rounded-full bg-secondary shrink-0 overflow-hidden text-[10px] font-semibold flex items-center justify-center"
                                      aria-label={`View ${reply.author_name ?? 'user'}'s profile`}
                                    >
                                      <SafeAvatar src={(reply as any).author_avatar} alt={`${reply.author_name ?? 'User'} avatar`} className="w-full h-full object-cover" fallback={reply.author_name?.charAt(0) ?? '?'} />
                                    </Link>
                                  ) : (
                                    <span className="relative w-6 h-6 rounded-full bg-secondary shrink-0 overflow-hidden text-[10px] font-semibold flex items-center justify-center">
                                      <SafeAvatar src={(reply as any).author_avatar} alt={`${reply.author_name ?? 'User'} avatar`} className="w-full h-full object-cover" fallback={reply.author_name?.charAt(0) ?? '?'} />
                                    </span>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {reply.author_id ? (
                                          <Link
                                            href={`/profile/${reply.author_id}`}
                                            className="text-xs font-semibold hover:underline"
                                          >
                                            {reply.author_name ?? 'Unknown'}
                                          </Link>
                                        ) : (
                                          <span className="text-xs font-semibold">{reply.author_name ?? 'Unknown'}</span>
                                        )}
                                        {commentAuthorProfiles[reply.author_id ?? '']?.is_verified && (
                                          <VerifiedBadge type={commentAuthorProfiles[reply.author_id ?? '']?.verification_type as VerificationType} size="sm" />
                                        )}
                                      </div>
                                      {commentAuthorProfiles[reply.author_id ?? '']?.business_name && (
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                          <Store className="w-2.5 h-2.5 text-primary shrink-0" />
                                          {commentAuthorProfiles[reply.author_id ?? ''].business_name}
                                        </p>
                                      )}
                                      {editingCommentId === reply.id ? (
                                        <CommentEditor initial={reply.content ?? ''} onCancel={() => setEditingCommentId(null)}
                                          onSave={async (text) => {
                                            const updated = await editComment(post.id, reply.id, text);
                                            setComments(prev => prev.map(x => x.id === reply.id ? { ...x, content: updated.content, edited_at: updated.edited_at } : x));
                                            setEditingCommentId(null);
                                          }} />
                                      ) : (
                                        <p className="text-sm leading-relaxed">{reply.content}{reply.edited_at && <span className="ml-1 text-[11px] text-muted-foreground">(edited)</span>}</p>
                                      )}
                                    </div>
                                    {/* Reaction bubble on reply */}
                                    {(reply.reaction_count ?? 0) > 0 && (
                                      <span className="ml-1 inline-flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 text-[11px]" aria-label={`${reply.reaction_count} reactions`}>
                                        <span aria-hidden="true">{(reply.top_reactions ?? [reply.my_reaction]).filter(Boolean).slice(0, 3).join('')}</span>{reply.reaction_count}
                                      </span>
                                    )}
                                    {/* Reply action row */}
                                    <div className="ml-1 mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                                      {/* Quick heart react on reply */}
                                      <button
                                        onClick={async () => {
                                          if (!viewerId) return;
                                          const next = reply.my_reaction ? null : '❤️';
                                          const result = await reactToComment(post.id, reply.id, next).catch(() => null);
                                          if (result) setComments(prev => prev.map(x => x.id === reply.id ? { ...x, my_reaction: result.my_reaction, reaction_count: result.reaction_count, top_reactions: result.my_reaction ? Array.from(new Set([result.my_reaction, ...(x.top_reactions ?? [])])).slice(0, 3) as typeof REACTIONS[number][] : x.top_reactions } : x));
                                        }}
                                        className={`flex items-center gap-0.5 transition-colors ${reply.my_reaction ? 'text-red-500' : 'hover:text-red-500'}`}
                                        aria-label={reply.my_reaction ? 'Unlike reply' : 'Like reply'}
                                        aria-pressed={Boolean(reply.my_reaction)}
                                      >
                                        <Heart className={`w-3 h-3 ${reply.my_reaction ? 'fill-current' : ''}`} aria-hidden="true" />
                                        {(reply.reaction_count ?? 0) > 0 && <span>{reply.reaction_count}</span>}
                                      </button>
                                      {/* Reply */}
                                      <button onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                                        className="hover:text-amber-600 flex items-center gap-0.5 transition-colors">
                                        <Reply className="w-3 h-3" />
                                        {t('common.reply')}
                                      </button>
                                      {/* Timestamp */}
                                      {reply.created_at && (
                                        <span>{fromNow(reply.created_at)}</span>
                                      )}
                                      <CommentMenu
                                        comment={reply}
                                        postId={post.id}
                                        viewerId={viewerId}
                                        isPostAuthor={isAuthor}
                                        isAdmin={isAdmin}
                                        open={commentMenuId === reply.id}
                                        onOpenChange={(open) => setCommentMenuId(open ? reply.id : null)}
                                        onReply={() => setReplyingTo(c.id)}
                                        onEdit={() => setEditingCommentId(reply.id)}
                                        onDelete={() => handleDeleteComment(reply.id, c.id)}
                                        onReacted={(r) => setComments(prev => prev.map(x => x.id === reply.id ? { ...x, my_reaction: r.my_reaction, reaction_count: r.reaction_count, top_reactions: r.my_reaction ? Array.from(new Set([r.my_reaction, ...(x.top_reactions ?? [])])).slice(0, 3) as typeof REACTIONS[number][] : x.top_reactions } : x))}
                                        onAuthorHidden={(authorId) => setComments(prev => prev.filter(x => x.author_id !== authorId))}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                        </div>
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

      {isAuthor && (
        <EditPostDialog open={editOpen} post={post} onOpenChange={setEditOpen} onSave={savePost} />
      )}
      <AlertDialog open={confirmDelete} onOpenChange={(open: boolean) => { if (!deleting) setConfirmDelete(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader className="">
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the post with its likes and comments. It can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="">
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e: React.MouseEvent) => { e.preventDefault(); void deletePost(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
