'use client';
import React, { useState, useEffect } from "react";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import client from "@/api/client";
import { useTranslation } from 'react-i18next';

import { Hash, ArrowLeft, Loader2 } from "lucide-react";
import PostCard from "@/components/feed/PostCard";

export default function HashtagFeed() {
  const { t } = useTranslation();
  const { name } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
    client.get(`/api/hashtags/${encodeURIComponent(name)}/posts`)
      .then(r => setPosts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [name]);

  return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/explore" className="p-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Hash className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">#{name}</h1>
              <p className="text-xs text-muted-foreground">{posts.length} posts</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <Hash className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <h3 className="font-display text-lg font-bold">No posts yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to use <span className="text-amber-600 font-medium">#{name}</span>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(p => (
              <PostCard key={p.id} post={p} currentUserId={user?.id} />
            ))}
          </div>
        )}
      </div>
  );
}




