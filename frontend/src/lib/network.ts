'use client';

import { authHeaders } from './auth';
import type { SocialUser, NewsPost, SocialTarget } from './social';

export type Relationship = 'none' | 'outgoing' | 'incoming' | 'friends' | 'self';

export interface DirectoryUser extends SocialUser { bio?: string | null; relationship: Relationship }
export interface FriendsOverview { friends: SocialUser[]; incoming: SocialUser[]; outgoing: SocialUser[] }
export interface ProfileView {
  user: SocialUser & { bio?: string | null; createdAt: string };
  posts: NewsPost[];
  friendCount: number;
  relationship: Relationship;
}
export type NotificationType = 'FRIEND_REQUEST' | 'FRIEND_ACCEPT' | 'LIKE' | 'COMMENT' | 'REPOST';
export interface AppNotification {
  id: string; type: NotificationType; actorId?: string | null;
  targetType?: SocialTarget | null; targetId?: string | null;
  read: boolean; createdAt: string; actor: SocialUser | null;
}
export interface NotificationsOverview { items: AppNotification[]; unread: number }
export interface MyProfile { id: string; name?: string | null; email: string; image?: string | null; bio?: string | null; role: string }

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

export const network = {
  users: (search?: string) => req<DirectoryUser[]>(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  profile: (id: string) => req<ProfileView>(`/users/${id}`),
  friends: () => req<FriendsOverview>(`/friends`),
  request: (userId: string) => req<{ status: Relationship }>(`/friends/${userId}`, { method: 'POST' }),
  accept: (userId: string) => req<{ status: Relationship }>(`/friends/${userId}/accept`, { method: 'POST' }),
  remove: (userId: string) => req(`/friends/${userId}`, { method: 'DELETE' }),
  notifications: () => req<NotificationsOverview>(`/notifications`),
  markRead: () => req<{ ok: boolean }>(`/notifications/read`, { method: 'POST' }),
  myProfile: () => req<MyProfile>(`/profile`),
  updateProfile: (data: { name?: string; bio?: string; image?: string }) =>
    req<MyProfile>(`/profile`, { method: 'PATCH', body: JSON.stringify(data) }),
};
