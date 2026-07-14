import React, { useState } from "react";
import { Share2, Check, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

/**
 * Universal share button using Web Share API on mobile,
 * with clipboard copy fallback on desktop.
 *
 * Props:
 *   title    – Share title text
 *   text     – Share body text (description)
 *   url      – URL to share (defaults to current page)
 *   size     – "sm" | "md" (default "sm")
 *   label    – Optional text label next to icon
 */
export default function ShareButton({ title, text, url, size = "sm", label }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url || window.location.href;
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (canNativeShare) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (err) {
        // User cancelled or error — fall through to clipboard
        if (err.name === "AbortError") return;
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const btnClass = `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
    copied
      ? "text-green-600 bg-green-50"
      : "text-muted-foreground hover:bg-secondary"
  }`;

  return (
    <button onClick={handleShare} className={btnClass} title="Share">
      {copied ? (
        <Check className={iconSize} />
      ) : canNativeShare ? (
        <Share2 className={iconSize} />
      ) : (
        <LinkIcon className={iconSize} />
      )}
      {label && <span className="font-medium">{copied ? "Copied!" : label}</span>}
    </button>
  );
}

