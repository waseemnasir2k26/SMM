export interface Post {
  id: number;
  content: string;
  image_url?: string;
  video_url?: string;
  platforms: string[];
  status: 'draft' | 'posted' | 'failed' | 'scheduled';
  word_count: number;
  posted_time?: string;
  scheduled_time?: string;
  error_message?: string;
  created_at: string;
}

export interface PostAnalytics {
  id: number;
  postId: number;
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
}

export interface PlatformConfig {
  id: number;
  platform: string;
  client_id: string;
  client_secret: string;
  updated_at: string;
}

export interface PlatformToken {
  id: number;
  platform: string;
  account_name: string;
  connected: boolean;
  page_name?: string;
  username?: string; // Added for display
  avatar_url?: string; // Added for preview
}

export interface DashboardStats {
  totalPosts: number;
  postsThisWeek: number;
  failedPosts: number;
  connectedPlatforms: number;
}

export enum Platform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  YOUTUBE = 'youtube'
}