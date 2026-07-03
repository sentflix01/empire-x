/**
 * entities.ts — typed API layer for all backend entities.
 */
import client from './client';

type FilterObj = Record<string, unknown>;

interface EntityApi<T = Record<string, unknown>> {
  list(sort?: string, limit?: number): Promise<T[]>;
  filter(filterObj?: FilterObj, sort?: string, limit?: number): Promise<T[]>;
  get(id: string): Promise<T>;
  create(data: Record<string, unknown>): Promise<T>;
  update(id: string, data: Record<string, unknown>): Promise<T>;
  delete(id: string): Promise<{ success: true }>;
  subscribe(callback: () => void, intervalMs?: number): () => void;
}

function buildEntityApi<T = Record<string, unknown>>(path: string): EntityApi<T> {
  return {
    async list(sort = '-created_at', limit = 50) {
      const res = await client.get<T[]>(`/api/${path}`, { params: { sort, limit } });
      return res.data;
    },
    async filter(filterObj: FilterObj = {}, sort = '-created_at', limit = 50) {
      const res = await client.get<T[]>(`/api/${path}`, { params: { ...filterObj, sort, limit } });
      return res.data;
    },
    async get(id: string) {
      const res = await client.get<T>(`/api/${path}/${id}`);
      return res.data;
    },
    async create(data: Record<string, unknown>) {
      const res = await client.post<T>(`/api/${path}`, data);
      return res.data;
    },
    async update(id: string, data: Record<string, unknown>) {
      const res = await client.put<T>(`/api/${path}/${id}`, data);
      return res.data;
    },
    async delete(id: string) {
      await client.delete(`/api/${path}/${id}`);
      return { success: true as const };
    },
    subscribe(callback: () => void, intervalMs = 30000) {
      const id = setInterval(callback, intervalMs);
      return () => clearInterval(id);
    },
  };
}

const ConversationApi = {
  async list(sort = '-updated_at', limit = 100) {
    const res = await client.get('/api/messages/conversations', { params: { sort, limit } });
    return res.data;
  },
  async filter(filterObj: FilterObj = {}, sort = '-updated_at', limit = 100) {
    const res = await client.get('/api/messages/conversations', { params: { ...filterObj, sort, limit } });
    return res.data;
  },
  async get(id: string) {
    const res = await client.get(`/api/messages/conversations/${id}`);
    return res.data;
  },
  async create(data: Record<string, unknown>) {
    const res = await client.post('/api/messages/conversations', data);
    return res.data;
  },
  async update(id: string, data: Record<string, unknown>) {
    const res = await client.put(`/api/messages/conversations/${id}`, data);
    return res.data;
  },
  async delete() { return { success: true as const }; },
  subscribe(callback: () => void, intervalMs = 10000) {
    const id = setInterval(callback, intervalMs);
    return () => clearInterval(id);
  },
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
  async get(id: string) {
    const res = await client.get(`/api/messages/messages/${id}`);
    return res.data;
  },
  async create(data: Record<string, unknown>) {
    const { conversation_id, ...rest } = data;
    const res = await client.post(`/api/messages/conversations/${conversation_id}/messages`, rest);
    return res.data;
  },
  async update(id: string, data: Record<string, unknown>) {
    const res = await client.put(`/api/messages/messages/${id}`, data);
    return res.data;
  },
  async delete(id: string) {
    await client.delete(`/api/messages/messages/${id}`);
    return { success: true as const };
  },
  subscribe(callback: () => void, intervalMs = 5000) {
    const id = setInterval(callback, intervalMs);
    return () => clearInterval(id);
  },
};

export const entities = {
  User:         buildEntityApi('profiles'),
  UserProfile:  buildEntityApi('profiles'),
  Post:         buildEntityApi('posts'),
  Product:      buildEntityApi('products'),
  Business:     buildEntityApi('businesses'),
  Showroom:     buildEntityApi('showrooms'),
  Order:        buildEntityApi('orders'),
  Task:         buildEntityApi('tasks'),
  TaskBid: {
    async list(sort = '-created_at', limit = 50) {
      const res = await client.get('/api/tasks/bids', { params: { sort, limit } });
      return res.data;
    },
    async filter(filterObj: FilterObj = {}) {
      if (filterObj.task_id) {
        const res = await client.get(`/api/tasks/${filterObj.task_id}/bids`);
        return res.data;
      }
      return [];
    },
    async create(data: Record<string, unknown>) {
      const { task_id, ...rest } = data;
      const res = await client.post(`/api/tasks/${task_id}/bids`, rest);
      return res.data;
    },
    async update(id: string, data: Record<string, unknown>) {
      const res = await client.put(`/api/tasks/bids/${id}`, data);
      return res.data;
    },
    async get(id: string) {
      const res = await client.get(`/api/tasks/bids/${id}`);
      return res.data;
    },
    async delete(id: string) {
      await client.delete(`/api/tasks/bids/${id}`);
      return { success: true as const };
    },
    subscribe(callback: () => void, ms = 30000) {
      const id = setInterval(callback, ms);
      return () => clearInterval(id);
    },
  },
  Conversation: ConversationApi,
  Message:      MessageApi,
  Notification: { ...buildEntityApi('notifications') },
  Follow:       buildEntityApi('profiles/follows'),
  Like: {
    async create(data: { target_id: string }) {
      const res = await client.post(`/api/posts/${data.target_id}/like`);
      return res.data;
    },
    async filter() { return []; },
    async list()   { return []; },
    async get()    { return null; },
    async update() { return null; },
    async delete() { return { success: true as const }; },
    subscribe(cb: () => void, ms = 30000) {
      const id = setInterval(cb, ms);
      return () => clearInterval(id);
    },
  },
  Comment: {
    async filter(filterObj: { post_id?: string } = {}, sort = '-created_at', limit = 50) {
      if (!filterObj.post_id) return [];
      const res = await client.get(`/api/posts/${filterObj.post_id}/comments`, { params: { sort, limit } });
      return res.data;
    },
    async create(data: { post_id: string; [key: string]: unknown }) {
      const { post_id, ...rest } = data;
      const res = await client.post(`/api/posts/${post_id}/comments`, rest);
      return res.data;
    },
    async list()   { return []; },
    async get()    { return null; },
    async update() { return null; },
    async delete() { return { success: true as const }; },
    subscribe(cb: () => void, ms = 30000) {
      const id = setInterval(cb, ms);
      return () => clearInterval(id);
    },
  },
  Story:   buildEntityApi('stories'),
  Review:  buildEntityApi('reviews'),
  Save:    buildEntityApi('saves'),
  Event:   buildEntityApi('events'),
  Job:     buildEntityApi('jobs'),
  Course:  buildEntityApi('courses'),
};
