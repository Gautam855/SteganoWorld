/**
 * 🌐 Chat API Client — REST + WebSocket
 * ========================================
 * Handles all communication with the E2EE chat backend.
 * All messages are encrypted client-side BEFORE being sent.
 */

import { getKeys } from './keyStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
const CHAT_API = `${API_BASE}/api/chat`;


// ─── Helpers ─────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const keys = await getKeys();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (keys?.token) {
    headers['Authorization'] = `Bearer ${keys.token}`;
  }
  return headers;
}

async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${CHAT_API}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API Error: ${response.status}`);
  }

  return data;
}


// ─── Auth API ────────────────────────────────────────────────────

export async function registerUser(data: {
  username: string;
  display_name: string;
  public_key: string;
  encryption_public_key?: string;
}) {
  return apiRequest('/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function requestChallenge(username: string) {
  return apiRequest('/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function verifyChallenge(username: string, signature: string) {
  return apiRequest('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ username, signature }),
  });
}


// ─── User API ────────────────────────────────────────────────────

export async function getUsers() {
  return apiRequest('/users');
}

export async function getUser(userId: string) {
  return apiRequest(`/users/${userId}`);
}

export async function searchUsers(query: string) {
  return apiRequest(`/users/search?q=${encodeURIComponent(query)}`);
}

export async function getMe() {
  return apiRequest('/me');
}


// ─── Message API ─────────────────────────────────────────────────

export async function sendMessage(data: {
  recipient_id: string;
  encrypted_message: string;
  encrypted_aes_key_recipient: string;
  encrypted_aes_key_sender: string;
  iv: string;
  message_type?: string;
}) {
  return apiRequest('/messages/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getConversation(otherUserId: string, limit = 30, before?: string) {
  let url = `/messages/${otherUserId}?limit=${limit}`;
  if (before) url += `&before=${encodeURIComponent(before)}`;
  return apiRequest(url);
}

export async function getConversations() {
  return apiRequest('/conversations');
}

export async function markAsRead(otherUserId: string) {
  return apiRequest(`/messages/read/${otherUserId}`, {
    method: 'PUT',
  });
}


// ─── Image API (Normal + Stego) ──────────────────────────────────

export async function uploadChatImage(file: File | Blob, type: 'image' | 'stego' = 'image'): Promise<{ image_id: string }> {
  const keys = await getKeys();
  const formData = new FormData();
  const filename = type === 'stego' ? 'stego.png' : (file instanceof File ? file.name : 'image.png');
  formData.append('image', file, filename);

  const response = await fetch(`${CHAT_API}/stego/upload?type=${type}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${keys?.token || ''}`,
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

// Keep backward compatibility
export async function uploadStegoImage(blob: Blob): Promise<{ image_id: string }> {
  return uploadChatImage(blob, 'stego');
}

export async function downloadStegoImage(imageId: string): Promise<Blob> {
  const keys = await getKeys();
  const response = await fetch(`${CHAT_API}/stego/download/${imageId}`, {
    headers: {
      'Authorization': `Bearer ${keys?.token || ''}`,
    },
  });

  if (!response.ok) throw new Error('Failed to download image');
  return response.blob();
}

// ─── Shared Links API ─────────────────────────────────────────────

export async function createSharedLink(data: {
  image_id: string;
  access_list: { user_id: string; encrypted_aes_key: string }[];
  burn_after_views?: number;
}) {
  return apiRequest('/shared/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSharedLink(linkId: string) {
  return apiRequest(`/shared/${linkId}`, {
    method: 'GET',
  });
}


// ─── WebSocket ───────────────────────────────────────────────────

export function getWebSocketUrl(): string {
  return API_BASE;
}
