/**
 * ChatCache — Ultra-fast in-memory + sessionStorage cache
 * ========================================================
 * Stale-while-revalidate pattern:
 *   1. Show cached data INSTANTLY
 *   2. Fetch fresh data in background
 *   3. Update UI when fresh data arrives
 *
 * Cached items:
 *   - Conversations list (sidebar)
 *   - Messages per conversation (per user)
 *   - Image blob URLs (permanent until page reload)
 */

const CACHE_PREFIX = 'stego_cache_';
const MESSAGE_TTL = 5 * 60 * 1000;     // 5 min for messages
const CONV_TTL    = 2 * 60 * 1000;     // 2 min for conversations
const IMAGE_CACHE = new Map<string, string>(); // imageId → blobURL (in-memory, permanent)

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ─── Session Storage Helpers ────────────────────────────────────

function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // sessionStorage full — silently fail
  }
}

function getCache<T>(key: string, ttl: number): T | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    // Return even if stale (caller decides whether to refresh)
    if (Date.now() - entry.timestamp > ttl * 3) {
      // Too stale — don't use at all (3x TTL)
      sessionStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function isFresh(key: string, ttl: number): boolean {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return false;
    const entry = JSON.parse(raw);
    return Date.now() - entry.timestamp < ttl;
  } catch {
    return false;
  }
}

function removeCache(key: string): void {
  sessionStorage.removeItem(CACHE_PREFIX + key);
}

// ─── Conversations Cache ────────────────────────────────────────

export function getCachedConversations(): any[] | null {
  return getCache<any[]>('conversations', CONV_TTL);
}

export function setCachedConversations(data: any[]): void {
  setCache('conversations', data);
}

export function isConversationsFresh(): boolean {
  return isFresh('conversations', CONV_TTL);
}

// ─── Messages Cache (per conversation) ──────────────────────────

export function getCachedMessages(otherUserId: string): any | null {
  return getCache<any>(`msgs_${otherUserId}`, MESSAGE_TTL);
}

export function setCachedMessages(otherUserId: string, data: {
  messages: any[];
  has_more: boolean;
  oldest_timestamp: string | null;
}): void {
  setCache(`msgs_${otherUserId}`, data);
}

export function isMessagesFresh(otherUserId: string): boolean {
  return isFresh(`msgs_${otherUserId}`, MESSAGE_TTL);
}

export function invalidateMessages(otherUserId: string): void {
  removeCache(`msgs_${otherUserId}`);
}

// ─── Image Blob URL Cache (in-memory, ultra fast) ───────────────

export function getCachedImageUrl(imageId: string): string | null {
  return IMAGE_CACHE.get(imageId) || null;
}

export function setCachedImageUrl(imageId: string, blobUrl: string): void {
  IMAGE_CACHE.set(imageId, blobUrl);
}

export function getImageCacheSize(): number {
  return IMAGE_CACHE.size;
}

// ─── Clear All ──────────────────────────────────────────────────

export function clearAllCache(): void {
  // Clear sessionStorage entries
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
  }
  keys.forEach(k => sessionStorage.removeItem(k));

  // Revoke image blob URLs
  IMAGE_CACHE.forEach(url => URL.revokeObjectURL(url));
  IMAGE_CACHE.clear();
}
