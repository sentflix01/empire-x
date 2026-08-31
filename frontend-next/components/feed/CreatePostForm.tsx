'use client'
import React, { useState } from "react";
import NextImage from 'next/image';
import { entities } from "@/api/entities";
import { Image, Send, X } from "lucide-react";
import { uploadFile } from "@/lib/uploadFile";
import { useTranslation } from 'react-i18next';

export default function CreatePostForm({ user, onPostCreated }) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const { t } = useTranslation();

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      let image_url = "";
      if (imageFile) {
        image_url = await uploadFile(imageFile);
      }
      const post = await entities.Post.create({
        author_id: user?.id || "",
        author_name: user?.full_name || "User",
        content: content.trim(),
        image_url,
        post_type: image_url ? "image" : "text",
      });
      setContent("");
      handleRemoveImage();
      onPostCreated(post);
    } catch (err) {
      console.error("Post creation failed:", err);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 px-4 py-3">
      {/* Image preview (shown above input when selected) */}
      {imagePreview && (
        <div className="relative mb-2">
          <NextImage src={imagePreview} alt="Preview" width={600} height={160} className="rounded-xl max-h-40 object-cover w-full" unoptimized />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            aria-label="Remove image"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Single row: avatar + input with icons inside */}
      <div className="flex items-center gap-2">
        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xs shrink-0 overflow-hidden">
          {user?.avatar_url
            ? <NextImage src={user.avatar_url} alt={`${user.full_name || 'User'}'s avatar`} width={32} height={32} className="w-full h-full object-cover" unoptimized />
            : (user?.full_name?.charAt(0) || "E")}
        </div>

        {/* Input with icons inside on the right */}
        <div className="flex-1 flex items-center bg-secondary/50 rounded-full px-3 py-1.5 gap-2 border border-border/30 focus-within:border-primary/30 transition-colors">
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            placeholder={t ? t('feed.whatsHappening') : "What's happening?"}
            className="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
          />
          {/* Photo icon */}
          <label className="shrink-0 cursor-pointer text-muted-foreground hover:text-amber-500 transition-colors">
            <Image className="w-4 h-4" />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </label>
          {/* Send icon */}
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || posting}
            aria-label="Post"
            className="shrink-0 text-amber-500 disabled:opacity-30 hover:text-amber-600 transition-colors"
          >
            {posting
              ? <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

