// @ts-nocheck
import Link from 'next/link';
import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";

import { toast } from "sonner";
import client from "@/api/client";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  id: number;
  product_id: string | number;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

// ─── StarRating subcomponent (not exported) ───────────────────────────────────

interface StarRatingProps {
  value: number;
  onChange?: (n: number) => void;
  size?: "sm" | "md";
}

function StarRating({ value, onChange, size = "md" }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";

  if (onChange) {
    // Interactive mode
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= (hover || value);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="focus:outline-none"
              aria-label={`Rate ${n} star${n !== 1 ? "s" : ""}`}
            >
              <Star
                className={`${iconSize} transition-colors ${
                  filled
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          );
        })}
      </div>
    );
  }

  // Display-only mode
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${iconSize} ${
            n <= value
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );
}

// ─── ReviewsSection (default export) ─────────────────────────────────────────

interface ReviewsSectionProps {
  productId: string | number;
  currentUser: { id: string } | null;
}

export default function ReviewsSection({ productId, currentUser }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [ratingInput, setRatingInput] = useState(0);
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationError, setValidationError] = useState("");

  const loadReviews = async () => {
    try {
      const { data } = await client.get(`/api/reviews/product/${productId}`);
      setReviews(data);
      const mine = data.find((r: Review) => r.reviewer_id === currentUser?.id) ?? null;
      setMyReview(mine);
      if (mine) {
        setRatingInput(mine.rating);
        setCommentInput(mine.comment ?? "");
      }
    } catch {
      // silently fail — reviews section is non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ratingInput < 1) {
      setValidationError("Please select a star rating before submitting.");
      return;
    }
    setValidationError("");
    setSubmitting(true);
    try {
      await client.post("/api/reviews", {
        product_id: productId,
        rating: ratingInput,
        comment: commentInput,
      });
      await loadReviews();
      toast.success(myReview ? "Review updated" : "Review submitted");
    } catch (err: any) {
      toast.error(err?.error ?? "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!myReview) return;
    setDeleting(true);
    try {
      await client.delete(`/api/reviews/${myReview.id}`);
      await loadReviews();
      setRatingInput(0);
      setCommentInput("");
      toast.success("Review deleted");
    } catch (err: any) {
      toast.error(err?.error ?? "Failed to delete review");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <h2 className="font-display text-base font-semibold">Reviews</h2>

      {/* Review list */}
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No reviews yet. Be the first!
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-card border border-border/50 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center gap-2.5">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {r.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-none">
                    {r.display_name ?? "Anonymous"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <StarRating value={r.rating} size="sm" />
              </div>
              {r.comment && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {r.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submission form — authenticated */}
      {currentUser ? (
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border/50 rounded-xl p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold">
            {myReview ? "Edit your review" : "Leave a review"}
          </h3>

          <StarRating value={ratingInput} onChange={setRatingInput} />

          {validationError && (
            <p className="text-xs text-destructive">{validationError}</p>
          )}

          <textarea
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            rows={3}
            placeholder="Share your thoughts (optional)"
            className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
          />

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 font-semibold"
            >
              {submitting ? "Submitting…" : myReview ? "Update review" : "Submit review"}
            </Button>

            {myReview && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            )}
          </div>
        </form>
      ) : (
        /* Unauthenticated prompt */
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Sign in to leave a review
          </Link>
        </p>
      )}
    </div>
  );
}

