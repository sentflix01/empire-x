'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { entities } from '@/api/entities';
import client from '@/api/client';
import { uploadFile } from '@/lib/uploadFile';
import { X, Plus, Clock, Heart, MessageCircle, Send } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import { resolveMediaUrl } from '@/lib/media';
import ErrorBoundary from '@/components/ErrorBoundary';

const STORY_DURATION_MS = 5000; // 5 seconds per story

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption?: string;
  display_name?: string;
  avatar_url?: string;
  expires_at?: string;
  reaction_count?: number;
  comment_count?: number;
  reacted?: boolean;
}

interface StoryGroup {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  stories: Story[];
}

interface ViewingState {
  userStories: Story[];
  index: number;
  group: StoryGroup;
}

// Returns "Xh" or "Xm" remaining until expires_at
function expiryLabel(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

interface HexStoryProps {
  group: StoryGroup | null;
  onClick: () => void;
  isAdd?: boolean;
  uploading?: boolean;
}

function HexStory({ group, onClick, isAdd = false, uploading = false }: HexStoryProps) {
  const name = isAdd ? 'Add Story' : (group?.display_name ?? 'User');
  const thumbUrl = !isAdd ? group?.stories?.[0]?.media_url : undefined;
  const expiry = !isAdd ? expiryLabel(group?.stories?.[0]?.expires_at) : null;
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  useEffect(() => { setThumbnailFailed(false); }, [thumbUrl]);

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 shrink-0 group">
      <div className="relative">
        <div
          className="clip-hexagon-outer flex items-center justify-center"
          style={{
            width: 70, height: 76,
            background: isAdd
              ? 'linear-gradient(135deg,#f59e0b,#f97316)'
              : 'linear-gradient(135deg, #2563eb, #7c3aed)',
          }}
        >
          <div
            className="clip-hexagon bg-card flex items-center justify-center"
            style={{ width: 64, height: 70 }}
          >
            <div className="relative clip-hexagon overflow-hidden" style={{ width: 60, height: 66 }}>
              {isAdd ? (
                <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                  {uploading
                    ? <div className="w-5 h-5 border-2 border-amber-400/40 border-t-amber-500 rounded-full animate-spin" />
                    : <Plus className="w-6 h-6 text-amber-500" />}
                </div>
              ) : thumbUrl && !thumbnailFailed ? (
                <SafeImage src={thumbUrl} alt={name} sizes="64px" className="absolute inset-0 h-full w-full object-cover" onError={() => setThumbnailFailed(true)}
                  fallback={<SafeImage src={group?.avatar_url} alt={name} sizes="64px" className="absolute inset-0 h-full w-full object-cover" fallback={<StoryInitial name={name} />} />} />
              ) : group?.avatar_url && !thumbnailFailed ? (
                <SafeImage src={group.avatar_url} alt={name} sizes="64px" className="absolute inset-0 h-full w-full object-cover" onError={() => setThumbnailFailed(true)} fallback={<StoryInitial name={name} />} />
              ) : (
                <StoryInitial name={name} />
              )}
            </div>
          </div>
        </div>

        {/* Expiry badge */}
        {expiry && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-black/70 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap">
            <Clock className="w-2.5 h-2.5" />
            {expiry}
          </div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground max-w-[70px] truncate text-center mt-1">
        {name}
      </span>
    </button>
  );
}

function StoryInitial({ name }: { name: string }) {
  return <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>{name.charAt(0).toUpperCase()}</div>;
}

function Stories() {
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [viewing, setViewing] = useState<ViewingState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100
  const [mediaFailed, setMediaFailed] = useState(false);
  const [storyCommentsOpen, setStoryCommentsOpen] = useState(false);
  const [storyComments, setStoryComments] = useState<Array<{ id: string; author_name?: string; content: string }>>([]);
  const [storyReply, setStoryReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => { loadStories(); }, []);

  // Auto-advance timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(0);
    startTimeRef.current = Date.now();
    const TICK = 50;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION_MS) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        // advance to next
        setViewing(prev => {
          if (!prev) return null;
          if (prev.index < prev.userStories.length - 1) {
            const idx = prev.index + 1;
            client.post(`/api/stories/${prev.userStories[idx].id}/view`).catch(() => {});
            return { ...prev, index: idx };
          }
          return null; // close viewer
        });
      }
    }, TICK);
  }, []);

  // Restart timer whenever story index changes
  useEffect(() => {
    if (viewing && !storyCommentsOpen) {
      startTimer();
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setProgress(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer, viewing, storyCommentsOpen]);

  const loadStories = async () => {
    const data = (await entities.Story.list('-created_at', 200).catch(() => [])) as unknown as Story[];
    const grouped: Record<string, StoryGroup> = {};
    data.forEach(s => {
      if (!grouped[s.user_id]) {
        grouped[s.user_id] = {
          user_id: s.user_id,
          display_name: s.display_name,
          avatar_url: s.avatar_url,
          stories: [],
        };
      }
      grouped[s.user_id].stories.push(s);
    });
    setStories(Object.values(grouped));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      await entities.Story.create({
        media_url: url,
        media_type: file.type.startsWith('video') ? 'video' : 'image',
      });
      await loadStories();
    } catch { /* ignore */ }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const openStory = (group: StoryGroup) => {
    setStoryCommentsOpen(false);
    setStoryComments([]);
    setStoryReply('');
    setViewing({ userStories: group.stories, index: 0, group });
    client.post(`/api/stories/${group.stories[0].id}/view`).catch(() => {});
  };

  const nextStory = () => {
    if (!viewing) return;
    if (viewing.index < viewing.userStories.length - 1) {
      const idx = viewing.index + 1;
      client.post(`/api/stories/${viewing.userStories[idx].id}/view`).catch(() => {});
      setViewing({ ...viewing, index: idx });
    } else {
      setViewing(null);
    }
  };

  const prevStory = () => {
    if (viewing && viewing.index > 0) {
      setViewing({ ...viewing, index: viewing.index - 1 });
    }
  };

  const active = viewing ? viewing.userStories[viewing.index] : null;
  const storyExpiry = active?.expires_at ? expiryLabel(active.expires_at) : null;

  useEffect(() => {
    setMediaFailed(false);
    setStoryCommentsOpen(false);
    setStoryComments([]);
    setStoryReply('');
  }, [active?.id]);

  const toggleReaction = async () => {
    if (!active) return;
    const wasReacted = Boolean(active.reacted);
    setViewing(prev => prev ? {
      ...prev,
      userStories: prev.userStories.map(story => story.id === active.id
        ? { ...story, reacted: !wasReacted, reaction_count: Math.max(0, (story.reaction_count ?? 0) + (wasReacted ? -1 : 1)) }
        : story),
    } : prev);
    try {
      await client.post(`/api/stories/${active.id}/reactions`, { emoji: '❤️' });
    } catch {
      setViewing(prev => prev ? {
        ...prev,
        userStories: prev.userStories.map(story => story.id === active.id
          ? { ...story, reacted: wasReacted, reaction_count: Math.max(0, (story.reaction_count ?? 0) + (wasReacted ? 1 : -1)) }
          : story),
      } : prev);
    }
  };

  const openStoryComments = async () => {
    if (!active) return;
    const nextOpen = !storyCommentsOpen;
    setStoryCommentsOpen(nextOpen);
    if (nextOpen) {
      const { data } = await client.get(`/api/stories/${active.id}/comments`).catch(() => ({ data: [] }));
      setStoryComments(data);
    }
  };

  const sendStoryReply = async () => {
    if (!active || !storyReply.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      const { data } = await client.post(`/api/stories/${active.id}/comments`, { content: storyReply.trim() });
      setStoryComments(prev => [...prev, data]);
      setStoryReply('');
      setViewing(prev => prev ? {
        ...prev,
        userStories: prev.userStories.map(story => story.id === active.id
          ? { ...story, comment_count: (story.comment_count ?? 0) + 1 }
          : story),
      } : prev);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-0.5">
        <HexStory isAdd group={null} uploading={uploading} onClick={() => fileRef.current?.click()} />
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
        {stories.map(g => <HexStory key={g.user_id} group={g} onClick={() => openStory(g)} />)}
      </div>

      {viewing && active && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
          onClick={() => setViewing(null)}
        >
          <div
            className="relative w-full max-w-sm h-full max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Animated progress bars */}
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
              {viewing.userStories.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-none"
                    style={{
                      width: i < viewing.index
                        ? '100%'
                        : i === viewing.index
                          ? `${progress}%`
                          : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* User info + expiry */}
            <div className="absolute top-8 left-4 right-4 flex items-center gap-2 z-10 pt-3">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {viewing.group.display_name?.charAt(0) ?? '?'}
              </div>
              <span className="text-white text-sm font-medium flex-1">{viewing.group.display_name}</span>
              {storyExpiry && (
                <div className="flex items-center gap-1 bg-black/40 rounded-full px-2 py-0.5">
                  <Clock className="w-3 h-3 text-white/70" />
                  <span className="text-white/70 text-[10px] font-medium">{storyExpiry}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setViewing(null)}
              className="absolute top-8 right-4 z-10 p-1 mt-3"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Media */}
            {active.media_type === 'video' ? (
              <video
                key={active.id}
                src={resolveMediaUrl(active.media_url) || undefined}
                autoPlay
                className="w-full h-full object-cover rounded-2xl"
                onEnded={nextStory}
              />
            ) : !mediaFailed ? (
              <SafeImage
                key={active.id}
                src={active.media_url}
                alt=""
                sizes="(max-width: 768px) 100vw, 480px"
                className="w-full h-full object-cover rounded-2xl"
                onError={() => setMediaFailed(true)}
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-indigo-700 flex flex-col items-center justify-center gap-4">
                {/* Large branded avatar for text-only stories */}
                <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center shadow-2xl">
                  <span className="text-white text-4xl font-bold">
                    {viewing.group.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <span className="text-white/80 text-sm font-medium">{viewing.group.display_name}</span>
              </div>
            )}

            {active.caption && !storyCommentsOpen && (
              <div className="absolute bottom-20 left-4 right-4 bg-black/40 rounded-xl p-3">
                <p className="text-white text-sm">{active.caption}</p>
              </div>
            )}

            <div className="absolute bottom-4 left-4 right-4 z-20" onClick={e => e.stopPropagation()}>
              {storyCommentsOpen && (
                <div className="mb-2 max-h-44 overflow-y-auto rounded-2xl bg-black/65 p-3 backdrop-blur-sm">
                  {storyComments.length === 0 ? (
                    <p className="text-xs text-white/70">No replies yet. Start the conversation.</p>
                  ) : storyComments.map(comment => (
                    <div key={comment.id} className="py-1.5 text-sm text-white">
                      <span className="font-semibold">{comment.author_name || 'User'} </span>{comment.content}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button type="button" onClick={toggleReaction} className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors ${active.reacted ? 'bg-rose-500 text-white' : 'bg-black/45 text-white hover:bg-black/65'}`}>
                  <Heart className={`h-4 w-4 ${active.reacted ? 'fill-current' : ''}`} />{active.reaction_count ?? 0}
                </button>
                <button type="button" onClick={openStoryComments} className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors ${storyCommentsOpen ? 'bg-primary text-white' : 'bg-black/45 text-white hover:bg-black/65'}`}>
                  <MessageCircle className="h-4 w-4" />{active.comment_count ?? 0}
                </button>
                <div className="flex h-10 flex-1 items-center rounded-full bg-white px-3 shadow-lg">
                  <input value={storyReply} onFocus={() => setStoryCommentsOpen(true)} onChange={e => setStoryReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendStoryReply(); }} placeholder="Reply to story" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none" />
                  <button type="button" onClick={sendStoryReply} disabled={!storyReply.trim() || sendingReply} className="ml-2 rounded-full bg-primary p-1.5 text-white disabled:opacity-40" aria-label="Send story reply"><Send className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>

            {/* Tap zones */}
            <button onClick={prevStory} className="absolute left-0 top-0 bottom-0 w-1/3" />
            <button onClick={nextStory} className="absolute right-0 top-0 bottom-0 w-1/3" />
          </div>
        </div>
      )}
    </>
  );
}

export default function StoriesPage() {
  return <ErrorBoundary><Stories /></ErrorBoundary>;
}
