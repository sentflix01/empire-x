/**
 * Axios HTTP client for Next.js — uses NEXT_PUBLIC_ env vars.
 * Auto-attaches JWT, handles 401 logout.
 * Token stored in both localStorage (client) and cookie (for middleware).
 */
import axios, { InternalAxiosRequestConfig } from 'axios';

// Next.js uses NEXT_PUBLIC_ prefix for client-side env vars
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      // Also clear the cookie used by Next.js middleware
      document.cookie = 'access_token=; path=/; max-age=0';
      if (
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/register'
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data ?? error);
  }
);

/**
 * Store token in both localStorage and cookie so Next.js middleware can read it.
 */
export function storeToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', token);
  // HttpOnly would be more secure but requires server-side set.
  // For now, a regular cookie lets the middleware read it client-side.
  const maxAge = 7 * 24 * 60 * 60; // 7 days
  document.cookie = `access_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Remove token from both localStorage and cookie.
 */
export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  document.cookie = 'access_token=; path=/; max-age=0';
}

export default client;
