import { Post, PlatformToken, PlatformConfig, DashboardStats, PostAnalytics } from '../types';

// Mock data to ensure the UI works in the preview environment without a real backend
const MOCK_POSTS: Post[] = [
  {
    id: 1,
    content: "Just launched our new product line! Check it out. 🚀 #startup #launch",
    platforms: ['twitter', 'linkedin'],
    status: 'posted',
    word_count: 12,
    posted_time: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 90000000).toISOString(),
  },
  {
    id: 2,
    content: "Behind the scenes at the office today.",
    image_url: "https://picsum.photos/800/600",
    platforms: ['instagram', 'facebook'],
    status: 'draft',
    word_count: 7,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    content: "New video tutorial is live on YouTube!",
    video_url: "https://youtube.com/watch?v=123",
    platforms: ['youtube', 'twitter'],
    status: 'failed',
    error_message: "Video upload failed: Invalid format or connection timeout.",
    word_count: 8,
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 4,
    content: "Upcoming webinar regarding Q4 trends.",
    platforms: ['linkedin'],
    status: 'scheduled',
    scheduled_time: new Date(Date.now() + 86400000).toISOString(),
    word_count: 6,
    created_at: new Date().toISOString(),
  }
];

const MOCK_ANALYTICS: PostAnalytics[] = [
  { id: 1, postId: 1, platform: 'twitter', likes: 45, comments: 12, shares: 8, reach: 1250 },
  { id: 2, postId: 1, platform: 'linkedin', likes: 120, comments: 34, shares: 15, reach: 3400 },
];

const MOCK_PLATFORM_STATUS: PlatformToken[] = [
  { 
    id: 1, 
    platform: 'twitter', 
    account_name: 'SocialSync App', 
    username: '@SocialSyncApp',
    connected: true,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SocialSync'
  },
  { 
    id: 2, 
    platform: 'facebook', 
    account_name: 'John Doe', 
    page_name: 'SocialSync Official Page', 
    connected: true,
    avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=FB'
  },
  { 
    id: 3, 
    platform: 'linkedin', 
    account_name: '', 
    connected: false 
  },
  { 
    id: 4, 
    platform: 'instagram', 
    account_name: '', 
    connected: false 
  },
  { 
    id: 5, 
    platform: 'youtube', 
    account_name: 'SocialSync TV', 
    username: '@SocialSyncTV',
    connected: true,
    avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=YT'
  },
];

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  getStats: async (): Promise<DashboardStats> => {
    await delay(500);
    return {
      totalPosts: 142,
      postsThisWeek: 12,
      failedPosts: 3,
      connectedPlatforms: 3,
    };
  },

  getPosts: async (): Promise<Post[]> => {
    await delay(600);
    return [...MOCK_POSTS];
  },

  getAnalytics: async (): Promise<PostAnalytics[]> => {
    await delay(700);
    return [...MOCK_ANALYTICS];
  },

  createPost: async (postData: Partial<Post>): Promise<Post> => {
    await delay(800);
    const newPost: Post = {
      id: Math.floor(Math.random() * 10000),
      content: postData.content || '',
      image_url: postData.image_url,
      video_url: postData.video_url,
      platforms: postData.platforms || [],
      status: postData.scheduled_time ? 'scheduled' : 'draft',
      scheduled_time: postData.scheduled_time,
      word_count: (postData.content || '').split(' ').length,
      created_at: new Date().toISOString(),
    };
    MOCK_POSTS.unshift(newPost);
    return newPost;
  },

  deletePost: async (id: number): Promise<void> => {
    await delay(400);
    const index = MOCK_POSTS.findIndex(p => p.id === id);
    if (index > -1) {
      MOCK_POSTS.splice(index, 1);
    }
  },

  publishPost: async (id: number): Promise<void> => {
    await delay(1500); // Simulate API call to platforms
    const post = MOCK_POSTS.find(p => p.id === id);
    if (post) {
      // Randomly fail for demonstration if it was already failed or specific content
      if (Math.random() > 0.9) {
          post.status = 'failed';
          post.error_message = 'Simulated timeout error from provider.';
          throw new Error("Simulated failure");
      }
      post.status = 'posted';
      post.posted_time = new Date().toISOString();
      post.error_message = undefined;
    }
  },

  getPlatformStatus: async (): Promise<PlatformToken[]> => {
    await delay(500);
    return [...MOCK_PLATFORM_STATUS];
  },

  saveCredentials: async (platform: string, clientId: string, clientSecret: string): Promise<void> => {
    await delay(800);
    console.log(`Saved credentials for ${platform}`);
  },

  connectPlatform: async (platform: string): Promise<string> => {
    // In a real app, this returns the OAuth URL. 
    // Here we return a mock URL to demonstrate the flow.
    await delay(500);
    
    // Simulate successful connection update in mock DB
    const p = MOCK_PLATFORM_STATUS.find(pt => pt.platform === platform);
    if (p) {
        p.connected = true;
        p.account_name = `Demo ${platform.charAt(0).toUpperCase() + platform.slice(1)} User`;
        p.username = `@demo_${platform}_user`;
        p.avatar_url = `https://api.dicebear.com/7.x/initials/svg?seed=${platform}`;
        
        if (platform === 'facebook' || platform === 'instagram') {
             p.page_name = `Demo ${platform.charAt(0).toUpperCase() + platform.slice(1)} Page`;
        }
    }
    
    return `/api/auth/${platform}/connect`;
  },
  
  disconnectPlatform: async (platform: string): Promise<void> => {
     await delay(600);
     const p = MOCK_PLATFORM_STATUS.find(pt => pt.platform === platform);
     if (p) {
         p.connected = false;
         p.account_name = '';
         p.page_name = undefined;
         p.username = undefined;
         p.avatar_url = undefined;
     }
  }
};