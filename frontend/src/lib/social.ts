'use client';

import { authHeaders } from './auth';

export type SocialTarget = 'TRIP' | 'POST';

export interface SocialUser { id: string; name?: string | null; email: string; image?: string | null }

export interface FeedTrip {
  id: string; slug: string; title: string; subtitle?: string | null; heroImage?: string | null;
  summary?: string | null; durationDays: number; seasonLabel?: string | null;
  country?: { name: string } | null;
  likes: number; comments: number; reposts: number; likedByMe: boolean; repostedByMe: boolean;
}
export interface NewsPost {
  id: string; text: string; imageUrl?: string | null; createdAt: string; author: SocialUser;
  likes: number; comments: number; likedByMe: boolean;
}
export interface SocialComment {
  id: string; text: string; createdAt: string; user: SocialUser; targetType: SocialTarget; targetId: string;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init.headers || {}) },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const social = {
  feed: () => req<FeedTrip[]>(`/feed`),
  news: () => req<NewsPost[]>(`/news`),
  createPost: (text: string, imageUrl?: string) => req<NewsPost>(`/news`, { method: 'POST', body: JSON.stringify({ text, imageUrl }) }),
  deletePost: (id: string) => req(`/posts/${id}`, { method: 'DELETE' }),
  toggleLike: (targetType: SocialTarget, targetId: string) =>
    req<{ liked: boolean; count: number }>(`/like`, { method: 'POST', body: JSON.stringify({ targetType, targetId }) }),
  comments: (targetType: SocialTarget, targetId: string) =>
    req<SocialComment[]>(`/comments?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`),
  addComment: (targetType: SocialTarget, targetId: string, text: string) =>
    req<SocialComment>(`/comments`, { method: 'POST', body: JSON.stringify({ targetType, targetId, text }) }),
  deleteComment: (id: string) => req(`/comments/${id}`, { method: 'DELETE' }),
  toggleRepost: (tripId: string) => req<{ reposted: boolean; count: number }>(`/reposts/${tripId}`, { method: 'POST' }),
};
