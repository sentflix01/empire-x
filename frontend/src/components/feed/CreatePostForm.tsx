// @ts-nocheck
import React, { useState } from "react";
import { entities } from "@/api/entities";
import { Image, Send, X } from "lucide-react";
import { uploadFile } from "@/lib/uploadFile";
import { Button } from "@/components/ui/button";

export default function CreatePostForm({ user, onPostCreated }) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [posting, setPosting] = useState(false);

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
    <div className="bg-card rounded-2xl border border-border/50 p-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
          {user?.full_name?.charAt(0) || "E"}
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's happening in your empire?"
            className="w-full resize-none text-sm outline-none min-h-[60px] placeholder:text-muted-foreground/60"
            rows={2}
          />
          {imagePreview && (
            <div className="relative mt-2">
              <img src={imagePreview} alt="" className="rounded-xl max-h-48 object-cover" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white text-xs hover:bg-black/70 transition-colors"
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
            <label className="p-2 rounded-full hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-amber-600">
              <Image className="w-5 h-5" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            </label>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || posting}
              size="sm"
              className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 px-5"
            >
              {posting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

