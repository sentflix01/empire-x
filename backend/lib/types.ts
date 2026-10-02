/**
 * lib/types.ts — Shared type definitions for the Nodbusiness backend
 *
 * Why this file exists:
 *   The backend is JavaScript today. Adding this single .ts file gives every
 *   route, middleware, and utility a shared vocabulary for the data shapes
 *   flowing through the system. New code can import these types directly;
 *   existing .js files get IntelliSense and hover documentation automatically
 *   because tsconfig.json has allowJs:true and checkJs:false.
 *
 * Migration path:
 *   1. This file (types.ts) — shared contracts, no logic
 *   2. lib/apiError.ts, utils/crud.ts, middleware/auth.ts — highest-value
 *   3. Route files one at a time — rename .js → .ts, fix errors incrementally
 *
 * Express augmentation:
 *   The global Express.Request namespace is extended so req.user, req.requestId,
 *   and req.realOnly are typed throughout the entire codebase without imports.
 */

import type { Response } from 'express';

// ── Core domain models ────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin' | 'moderator';
  is_banned: boolean;
  is_verified: boolean;
  is_seed: boolean;
  provider: string | null;
  provider_id: string | null;
  last_seen: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_image: string | null;
  headline: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  follower_count: number;
  following_count: number;
  is_verified: boolean;
  verification_type: 'personal' | 'business' | 'creator' | 'official' | null;
  verified_at: Date | null;
  verification_note: string | null;
  has_business_profile: boolean;
  presence_visibility: 'everyone' | 'nobody';
  ticker_text: string | null;
  ticker_type: string | null;
  profile_type: string | null;
  points: number;
  updated_at: Date;
  created_at: Date;
}

export interface Post {
  id: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  content: string;
  image_url: string | null;
  post_type: 'text' | 'image' | 'poll' | 'event' | 'promo' | 'location';
  like_count: number;
  comment_count: number;
  poll_options: PollOption[] | null;
  poll_ends_at: Date | null;
  is_pinned: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PollOption {
  id: string;
  text: string;
  vote_count: number;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  content: string;
  parent_id: string | null;
  reply_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: string;
  seller_id: string;
  business_id: string | null;
  showroom_id: string | null;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  images: string[];
  category: string | null;
  status: 'active' | 'draft';
  stock: number | null;
  view_count: number;
  average_rating: number;
  review_count: number;
  latitude: number | null;
  longitude: number | null;
  created_at: Date;
  updated_at: Date;
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'refunded'
  | 'payment_failed'
  | 'return_requested'
  | 'return_approved';

export type PaymentProvider = 'stripe' | 'chapa' | 'cod' | null;

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  business_id: string | null;
  product_id: string | null;
  product_title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  status: OrderStatus;
  payment_provider: PaymentProvider;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  chapa_tx_ref: string | null;
  amount_subtotal: number;
  amount_discount: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  delivery_address: string;
  notes: string;
  created_at: Date;
  updated_at: Date;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  updated_at: Date;
  created_at: Date;
}

export type WalletTransactionType =
  | 'credit'
  | 'debit'
  | 'withdrawal'
  | 'refund'
  | 'pending_topup'
  | 'failed_topup';

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: WalletTransactionType;
  amount: number;
  description: string;
  reference: string | null;
  created_at: Date;
}

export interface Conversation {
  id: string;
  type: 'dm' | 'group' | 'channel';
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  admin_id: string | null;
  last_message: string;
  last_message_at: Date | null;
  participant_ids: string;   // legacy JSON column — use conversation_participants table
  participant_names: string; // legacy JSON column
  created_at: Date;
  updated_at: Date;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member';
  last_read_at: Date | null;
  joined_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string | null;
  content: string;
  type: 'text' | 'image' | 'file';
  reply_to_id: string | null;
  edited: boolean;
  created_at: Date;
  updated_at: Date;
}

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'message'
  | 'order'
  | 'inquiry'
  | 'info';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: Date;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  category: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Showroom {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  category: string | null;
  cover_image: string | null;
  logo_url: string | null;
  status: 'draft' | 'published';
  view_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Task {
  id: string;
  requester_id: string;
  title: string;
  description: string | null;
  task_type: string | null;
  offered_payment: number | null;
  currency: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface Commission {
  id: string;
  order_id: string;
  seller_id: string;
  gross: number;
  rate: number;
  amount: number;
  created_at: Date;
}

// ── API response shapes ───────────────────────────────────────────────────────

/**
 * Standard success response wrapper.
 * Routes may return data directly (legacy) or wrapped in { data, meta }.
 * New routes should use the wrapped form for consistency.
 */
export interface ApiSuccess<T> {
  data: T;
  meta?: {
    total?: number;
    next_cursor?: string | number | null;
    has_more?: boolean;
  };
}

/**
 * Standard error response — every error endpoint returns this shape.
 */
export interface ApiError {
  error: string;     // human-readable message
  code: string;      // machine-readable: NOT_FOUND | VALIDATION_ERROR | INTERNAL_ERROR …
  request_id?: string;
  fields?: Array<{ field: string; message: string }>;
}

// ── CRUD helper types ─────────────────────────────────────────────────────────

export type FilterObject = Record<string, string | number | boolean | null | undefined>;

export interface WhereResult {
  clause: string;
  values: unknown[];
}

export interface SortResult {
  col: string;
  dir: 'ASC' | 'DESC';
}

export interface ListOptions {
  filter?: FilterObject;
  sort?: string;
  limit?: number | string;
}

// ── Middleware types ──────────────────────────────────────────────────────────

/** Shape attached to req.user by requireAuth / optionalAuth */
export interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  is_banned: boolean;
  /** True for the built-in demo accounts and generated seed personas. */
  is_demo: boolean;
}

// ── Express namespace augmentation ───────────────────────────────────────────
// Augmenting the global Express.Request here means req.user, req.requestId,
// and req.realOnly are typed in every route file without any import.

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth / optionalAuth middleware. Null on unauthenticated routes. */
      user: AuthUser | null;
      /** UUID injected by middleware/requestId.js — present on every request. */
      requestId: string;
      /** Set by middleware/realMode.js when X-Real-Only: 1 header is present. */
      realOnly: boolean;
      /** Set only after the demo cookie has been validated against the demo database. */
      demoSession?: { id: string; userId: string; expiresAt: Date };
    }
  }
}

// Re-export Response for convenience in helpers that only need the res type
export type { Response };
