/**
 * SOCIAL MEDIA DASHBOARD - API SERVICE
 * =====================================
 * Real API integration with Twitter backend.
 *
 * Backend URL: http://localhost:8000/api
 *
 * Features:
 * - Real Twitter posting
 * - File upload support
 * - Retry on failure
 * - Proper error handling
 */

import { Post, PlatformToken, DashboardStats, PostAnalytics } from '../types';

// API Base URL - change this for production
const API_BASE_URL = 'http://localhost:8000/api';

// ============== HELPER FUNCTIONS ==============

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: Record<string, string> = {};

  // Only set Content-Type if not FormData
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

// Retry wrapper for critical operations
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.log(`[API] Attempt ${attempt + 1}/${maxRetries} failed:`, error);

      if (attempt < maxRetries - 1) {
        const waitTime = delayMs * Math.pow(2, attempt);
        console.log(`[API] Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error('All retries failed');
}

// ============== API METHODS ==============

export const api = {
  // Dashboard stats
  getStats: async (): Promise<DashboardStats> => {
    return fetchAPI<DashboardStats>('/stats');
  },

  // Get all posts
  getPosts: async (): Promise<Post[]> => {
    const result = await fetchAPI<{ posts: Post[] }>('/posts');
    return result.posts;
  },

  // Create a new post (draft)
  createPost: async (postData: Partial<Post>): Promise<Post> => {
    const result = await fetchAPI<{ success: boolean; post: Post }>('/posts', {
      method: 'POST',
      body: JSON.stringify({
        content: postData.content,
        image_url: postData.image_url,
        video_url: postData.video_url,
        scheduled_time: postData.scheduled_time,
      }),
    });
    return result.post;
  },

  // Delete a post
  deletePost: async (id: number): Promise<void> => {
    await fetchAPI(`/posts/${id}`, { method: 'DELETE' });
  },

  // Publish a post to Twitter (with retry)
  publishPost: async (id: number): Promise<{
    success: boolean;
    post: Post;
    twitter_result: {
      success: boolean;
      post_id?: string;
      url?: string;
      error?: string;
    };
  }> => {
    return withRetry(
      () => fetchAPI(`/posts/${id}/publish`, { method: 'POST' }),
      3, // max retries
      2000 // initial delay
    );
  },

  // Direct publish with file upload
  publishDirect: async (
    content: string,
    file?: File
  ): Promise<{
    success: boolean;
    post: Post;
    twitter_result: any;
  }> => {
    const formData = new FormData();
    formData.append('content', content);

    if (file) {
      formData.append('file', file);
    }

    return withRetry(
      () => fetchAPI('/publish-direct', {
        method: 'POST',
        body: formData,
      }),
      3,
      2000
    );
  },

  // Upload media file
  uploadMedia: async (file: File): Promise<{
    success: boolean;
    file_path: string;
    file_name: string;
    file_size: number;
    content_type: string;
    is_video: boolean;
  }> => {
    const formData = new FormData();
    formData.append('file', file);

    return fetchAPI('/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // Get Twitter connection status
  getTwitterStatus: async (): Promise<{
    connected: boolean;
    username?: string;
    user_id?: string;
    name?: string;
    profile_image?: string;
    error?: string;
    required_keys?: string[];
  }> => {
    return fetchAPI('/twitter/status');
  },

  // Test Twitter connection
  testTwitterConnection: async (): Promise<{
    success: boolean;
    message: string;
    username?: string;
  }> => {
    return fetchAPI('/twitter/test', { method: 'POST' });
  },

  // Get platform status (compatibility)
  getPlatformStatus: async (): Promise<PlatformToken[]> => {
    return fetchAPI<PlatformToken[]>('/platforms/status');
  },

  // Analytics (placeholder)
  getAnalytics: async (): Promise<PostAnalytics[]> => {
    // Return empty for now - implement when analytics backend is ready
    return [];
  },

  // Credentials (placeholder - implement backend if needed)
  saveCredentials: async (platform: string, clientId: string, clientSecret: string): Promise<void> => {
    console.log(`[API] Save credentials for ${platform} - implement backend`);
  },

  connectPlatform: async (platform: string): Promise<string> => {
    if (platform !== 'twitter') {
      throw new Error('Only Twitter is supported');
    }
    // For Twitter, credentials are in .env - no OAuth flow needed
    return '/settings';
  },

  disconnectPlatform: async (platform: string): Promise<void> => {
    console.log(`[API] Disconnect ${platform} - remove credentials from .env`);
  },
};

// ============== FALLBACK TO MOCK (if backend not available) ==============

// Check if backend is available
let backendAvailable: boolean | null = null;

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    backendAvailable = response.ok;
    return backendAvailable;
  } catch {
    backendAvailable = false;
    return false;
  }
}

export function isBackendAvailable(): boolean | null {
  return backendAvailable;
}
