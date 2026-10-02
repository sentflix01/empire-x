/**
 * entities.ts — typed API layer for all backend entities.
 *
 * Real-time updates use Socket.IO events (see AppLayout.tsx + socket lib).
 * The old subscribe() polling pattern has been removed — TD-007.
 */
import client from './client';

type AnyRecord = Record<string, any>;
type FilterObj = AnyRecord;

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface UserProfile extends BaseEntity {
  user_id: string;
  profile_type?: string;
  display_name?: string;
  full_name?: string;
  avatar_url?: string | string[];
  cover_url?: string | string[];
  cover_position?: string;
  bio?: string;
  headline?: string;
  location?: string;
  phone?: string;
  ticker_text?: string;
  ticker_type?: string;
  is_verified?: boolean;
  verification_type?: string;
  business_name?: string;
  business_category?: string;
  business_template?: string | string[];
  business_description?: string;
  business_contact_email?: string;
  business_contact_phone?: string;
  business_address?: string;
  business_theme_color?: string;
  business_logo_url?: string | string[];
  business_cover_url?: string | string[];
  business_cover_position?: string;
}

export interface Post extends BaseEntity {
  author_id: string;
  author_name?: string;
  author_avatar?: string;
  content?: string;
  image_url?: string;
  poll_options?: string;
  poll_ends_at?: string;
  like_count?: number;
  comment_count?: number;
  view_count?: number;
  status?: string;
}

export interface Product extends BaseEntity {
  seller_id?: string;
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  status?: string;
  view_count?: number;
  category?: string;
  image_url?: string;
}

export interface Business extends BaseEntity {
  owner_id?: string;
  business_name?: string;
  business_category?: string;
  business_template?: string | string[];
  business_theme_color?: string;
  business_contact_phone?: string;
  business_contact_email?: string;
  business_address?: string;
  business_description?: string;
  business_logo_url?: string | string[];
  business_cover_url?: string | string[];
  business_sections?: string;
  status?: string;
}

export interface Showroom extends BaseEntity {
  owner_id?: string;
  title?: string;
  description?: string;
  status?: string;
  image_url?: string;
}

export interface Order extends BaseEntity {
  buyer_id?: string;
  seller_id?: string;
  status?: string;
  total?: number;
  currency?: string;
  product_id?: string;
}

export interface Task extends BaseEntity {
  user_id?: string;
  agent_id?: string;
  title?: string;
  description?: string;
  status?: string;
  budget?: number;
}

export interface TaskBid extends BaseEntity {
  task_id?: string;
  bidder_id?: string;
  amount?: number;
  status?: string;
}

export interface Conversation extends BaseEntity {
  title?: string;
  participant_ids?: string[];
  updated_at?: string;
}

export interface Message extends BaseEntity {
  conversation_id?: string;
  sender_id?: string;
  content?: string;
  created_at?: string;
}

export interface Notification extends BaseEntity {
  user_id?: string;
  type?: string;
  read?: boolean;
  message?: string;
}

export interface Comment extends BaseEntity {
  post_id?: string;
  author_id?: string;
  content?: string;
}

export interface Story extends BaseEntity {
  author_id?: string;
  media_url?: string;
  expired_at?: string;
}

export interface Review extends BaseEntity {
  target_id?: string;
  author_id?: string;
  rating?: number;
  comment?: string;
}

export interface Save extends BaseEntity {
  target_id?: string;
  target_type?: string;
  user_id?: string;
}

export interface Event extends BaseEntity {
  title?: string;
  description?: string;
  start_at?: string;
  end_at?: string;
  status?: string;
}

export interface Job extends BaseEntity {
  title?: string;
  company?: string;
  status?: string;
}

export interface Course extends BaseEntity {
  title?: string;
  description?: string;
  status?: string;
}

export interface Follow extends BaseEntity {
  follower_id?: string;
  followee_id?: string;
}

export interface Like extends BaseEntity {
  target_id?: string;
  target_type?: string;
  user_id?: string;
}

interface EntityApi<T extends AnyRecord = AnyRecord> {
  list(sort?: string, limit?: number): Promise<T[]>;
  filter(filterObj?: FilterObj, sort?: string, limit?: number): Promise<T[]>;
  get(id: string): Promise<T>;
  create(data: Partial<T> & AnyRecord): Promise<T>;
  update(id: string, data: Partial<T> & AnyRecord): Promise<T>;
  delete(id: string): Promise<{ success: true }>;
}

function buildEntityApi<T extends AnyRecord = AnyRecord>(path: string): EntityApi<T> {
  // Normalise response: some endpoints (e.g. /api/posts) return a paginated
  // envelope { posts/items: T[], next_cursor } instead of a plain array.
  // We unwrap it so all callers get a consistent T[].
  function unwrap(data: unknown): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === 'object') {
      // Try common envelope keys in order
      for (const key of ['posts', 'items', 'data', 'results']) {
        const v = (data as Record<string, unknown>)[key];
        if (Array.isArray(v)) return v as T[];
      }
    }
    return [];
  }
  return {
    async list(sort = '-created_at', limit = 50) {
      const res = await client.get<T[]>(`/api/${path}`, { params: { sort, limit } });
      return unwrap(res.data);
    },
    async filter(filterObj: FilterObj = {}, sort = '-created_at', limit = 50) {
      const res = await client.get<T[]>(`/api/${path}`, { params: { ...filterObj, sort, limit } });
      return unwrap(res.data);
    },
    async get(id: string) {
      const res = await client.get<T>(`/api/${path}/${id}`);
      return res.data;
    },
    async create(data: AnyRecord) {
      const res = await client.post<T>(`/api/${path}`, data);
      return res.data;
    },
    async update(id: string, data: AnyRecord) {
      const res = await client.put<T>(`/api/${path}/${id}`, data);
      return res.data;
    },
    async delete(id: string) {
      await client.delete(`/api/${path}/${id}`);
      return { success: true as const };
    },
  };
}

const ConversationApi = {
  async list(sort = '-updated_at', limit = 30) {
    const res = await client.get('/api/messages/conversations', { params: { sort, limit } });
    return res.data;
  },
  async filter(filterObj: FilterObj = {}, sort = '-updated_at', limit = 30) {
    const res = await client.get('/api/messages/conversations', { params: { ...filterObj, sort, limit } });
    return res.data;
  },
  async get(id: string) {
    const res = await client.get(`/api/messages/conversations/${id}`);
    return res.data;
  },
  async create(data: AnyRecord) {
    const res = await client.post('/api/messages/conversations', data);
    return res.data;
  },
  async update(id: string, data: AnyRecord) {
    const res = await client.put(`/api/messages/conversations/${id}`, data);
    return res.data;
  },
  async delete() { return { success: true as const }; },
};

const MessageApi = {
  async list() { return []; },
  async filter(filterObj: FilterObj = {}) {
    if (filterObj.conversation_id) {
      const res = await client.get(
        `/api/messages/conversations/${filterObj.conversation_id}/messages`,
        { params: { limit: 100 } }
      );
      return res.data;
    }
    return [];
  },
  async get(_id: string) {
    // No GET /messages/:id endpoint on the backend — return null safely
    console.warn('MessageApi.get() is not supported by the backend');
    return null;
  },
  async create(data: AnyRecord) {
    const { conversation_id, ...rest } = data;
    const res = await client.post(`/api/messages/conversations/${conversation_id}/messages`, rest);
    return res.data;
  },
  async update(_id: string, _data: AnyRecord) {
    console.warn('MessageApi.update() is not supported by the backend');
    return null;
  },
  async delete(id: string) {
    await client.delete(`/api/messages/messages/${id}`);
    return { success: true as const };
  },
};

export const entities = {
  User:         buildEntityApi<UserProfile>('profiles'),
  UserProfile:  buildEntityApi<UserProfile>('profiles'),
  Post:         buildEntityApi<Post>('posts'),
  Product:      buildEntityApi<Product>('products'),
  Business:     buildEntityApi<Business>('businesses'),
  Showroom:     buildEntityApi<Showroom>('showrooms'),
  Order: {
    ...buildEntityApi<Order>('orders'),
    // GET /api/orders returns { orders: [...], next_cursor: ... } (keyset pagination)
    // — extract the array so consumers always get an array.
    async filter(filterObj: FilterObj = {}, sort = '-created_at', limit = 100) {
      const res = await client.get(`/api/orders`, { params: { ...filterObj, sort, limit } });
      return Array.isArray(res.data) ? res.data : res.data?.orders ?? [];
    },
  },
  Task:         buildEntityApi<Task>('tasks'),
  TaskBid: {
    async list(sort = '-created_at', limit = 50) {
      const res = await client.get<TaskBid[]>('/api/tasks/bids', { params: { sort, limit } });
      return res.data;
    },
    async filter(filterObj: FilterObj = {}) {
      if (filterObj.task_id) {
        const res = await client.get<TaskBid[]>(`/api/tasks/${filterObj.task_id}/bids`);
        return res.data;
      }
      return [];
    },
    async create(data: Partial<TaskBid> & AnyRecord) {
      const { task_id, ...rest } = data;
      const res = await client.post<TaskBid>(`/api/tasks/${task_id}/bids`, rest);
      return res.data;
    },
    async update(id: string, data: Partial<TaskBid> & AnyRecord) {
      const res = await client.put<TaskBid>(`/api/tasks/bids/${id}`, data);
      return res.data;
    },
    async get(id: string) {
      const res = await client.get<TaskBid>(`/api/tasks/bids/${id}`);
      return res.data;
    },
    async delete(id: string) {
      await client.delete(`/api/tasks/bids/${id}`);
      return { success: true as const };
    },
  },
  Conversation: ConversationApi,
  Message:      MessageApi,
  Notification: { ...buildEntityApi<Notification>('notifications') },
  Follow:       buildEntityApi<Follow>('profiles/follows'),
  Like: {
    async create(data: { target_id: string }) {
      const res = await client.post<Like>(`/api/posts/${data.target_id}/like`);
      return res.data;
    },
    async filter() { return [] as Like[]; },
    async list()   { return [] as Like[]; },
    async get()    { return null as null; },
    async update() { return null as null; },
    async delete() { return { success: true as const }; },
  },
  Comment: {
    async filter(filterObj: { post_id?: string } = {}, sort = '-created_at', limit = 50) {
      if (!filterObj.post_id) return [] as Comment[];
      const res = await client.get<Comment[]>(`/api/posts/${filterObj.post_id}/comments`, { params: { sort, limit } });
      return res.data;
    },
    async create(data: { post_id: string; [key: string]: unknown }) {
      const { post_id, ...rest } = data;
      const res = await client.post<Comment>(`/api/posts/${post_id}/comments`, rest);
      return res.data;
    },
    async list()   { return [] as Comment[]; },
    async get()    { return null as null; },
    async update() { return null as null; },
    async delete() { return { success: true as const }; },
  },
  Story:   buildEntityApi<Story>('stories'),
  Review:  buildEntityApi<Review>('reviews'),
  Save:    buildEntityApi<Save>('saves'),
  Event:   buildEntityApi<Event>('events'),
  Job:     buildEntityApi<Job>('jobs'),
  Course:  buildEntityApi<Course>('courses'),
};
