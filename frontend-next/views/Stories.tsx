'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { entities } from '@/api/entities';
import client from '@/api/client';
import { uploadFile } from '@/lib/uploadFile';
import { X, Plus, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 shrink-0 group">
      <div className="relative">
        <div
          className="clip-hexagon-outer flex items-center justify-center"
          style={{
            width: 70, height: 76,
            background: isAdd
              ? 'linear-gradient(135deg,#fbbf24,#f97316)'
              : 'linear-gradient(135deg,#f97316,#ec4899,#8b5cf6,#fbbf24)',
          }}
        >
          <div
            className="clip-hexagon bg-card flex items-center justify-center"
            style={{ width: 64, height: 70 }}
          >
            <div className="clip-hexagon overflow-hidden" style={{ width: 60, height: 66 }}>
              {isAdd ? (
                <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                  {uploading
                    ? <div className="w-5 h-5 border-2 border-amber-400/40 border-t-amber-500 rounded-full animate-spin" />
                    : <Plus className="w-6 h-6 text-amber-500" />}
                </div>
              ) : thumbUrl ? (
                <Image src={thumbUrl} alt={name} fill className="object-cover" unoptimized />
              ) : group?.avatar_url ? (
                <Image src={group.avatar_url} alt={name} fill className="object-cover" unoptimized />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
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

export default function Stories() {
  const { t } = useTranslation();
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [viewing, setViewing] = useState<ViewingState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100
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
    if (viewing) {
      startTimer();
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setProgress(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [viewing?.index, viewing !== null]);

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
                src={active.media_url}
                autoPlay
                className="w-full h-full object-cover rounded-2xl"
                onEnded={nextStory}
              />
            ) : (
              <img
                key={active.id}
                src={active.media_url}
                alt=""
                className="w-full h-full object-cover rounded-2xl"
              />
            )}

            {active.caption && (
              <div className="absolute bottom-8 left-4 right-4 bg-black/40 rounded-xl p-3">
                <p className="text-white text-sm">{active.caption}</p>
              </div>
            )}

            {/* Tap zones */}
            <button onClick={prevStory} className="absolute left-0 top-0 bottom-0 w-1/3" />
            <button onClick={nextStory} className="absolute right-0 top-0 bottom-0 w-1/3" />
          </div>
        </div>
      )}
    </>
  );
}

