import React, { useEffect, useState } from 'react';
import { api, checkBackendHealth } from '../services/api';
import { Post } from '../types';
import {
  Trash2,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Info,
  Twitter,
  ExternalLink,
  Loader2,
  RefreshCw,
  Server
} from 'lucide-react';

const Posts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [backendOnline, setBackendOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const isOnline = await checkBackendHealth();
      setBackendOnline(isOnline);

      if (isOnline) {
        const data = await api.getPosts();
        setPosts(data);
      } else {
        setError('Backend server is offline');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePublish = async (id: number) => {
    if (!window.confirm('Publish this post to Twitter now?')) return;

    setPublishingId(id);
    try {
      const result = await api.publishPost(id);

      if (result.success) {
        // Update local state
        setPosts(prev =>
          prev.map(p =>
            p.id === id
              ? {
                  ...p,
                  status: 'posted',
                  posted_time: new Date().toISOString(),
                  tweet_url: result.twitter_result?.url
                }
              : p
          )
        );
      } else {
        // Re-fetch to get error state
        await fetchPosts();
        alert(`Failed to publish: ${result.twitter_result?.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      await fetchPosts();
      alert(`Failed to publish: ${e.message}`);
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this post permanently?')) return;

    try {
      await api.deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      alert('Failed to delete post.');
    }
  };

  const showErrorDetails = (errorMessage?: string) => {
    alert(`Publishing Failed:\n\n${errorMessage || 'Unknown error occurred.'}`);
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || post.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (post: Post) => {
    switch (post.status) {
      case 'posted':
        return (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              <CheckCircle size={12} /> Posted
            </span>
            {(post as any).tweet_url && (
              <a
                href={(post as any).tweet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-500 hover:text-sky-600"
                title="View on Twitter"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        );
      case 'failed':
        return (
          <button
            onClick={() => showErrorDetails(post.error_message)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            title="Click to view error"
          >
            <AlertTriangle size={12} /> Failed <Info size={10} />
          </button>
        );
      case 'scheduled':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
            <Clock size={12} /> Scheduled
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 rounded-lg">
            <Twitter size={20} className="text-sky-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">All Posts</h2>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={fetchPosts}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search content..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <select
              className="h-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm appearance-none cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="draft">Drafts</option>
              <option value="scheduled">Scheduled</option>
              <option value="posted">Posted</option>
              <option value="failed">Failed</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>
      </div>

      {/* Backend Offline Warning */}
      {!backendOnline && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <Server className="text-red-500" size={20} />
          <div>
            <p className="font-medium text-red-800">Backend Server Offline</p>
            <p className="text-sm text-red-600">
              Start the server: <code className="bg-red-100 px-1 rounded">cd backend && python main.py</code>
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && backendOnline && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="text-amber-500" size={20} />
          <p className="text-amber-700">{error}</p>
        </div>
      )}

      {/* Posts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
            <p className="text-slate-500 mt-4">Loading posts...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {posts.length === 0 ? (
              <div>
                <Twitter size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-lg font-medium">No posts yet</p>
                <p className="text-sm mt-1">Create your first tweet to get started!</p>
                <a
                  href="#/create"
                  className="inline-block mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                >
                  Create Post
                </a>
              </div>
            ) : (
              'No posts found matching your criteria.'
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Content</th>
                  <th className="px-6 py-4">Platform</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900 line-clamp-2 max-w-md">
                        {post.content}
                      </p>
                      <div className="mt-1 flex gap-2 text-xs text-slate-400">
                        <span>{post.content.length} chars</span>
                        {post.image_url && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">Image</span>
                        )}
                        {post.video_url && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">Video</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-sky-100 rounded-lg">
                          <Twitter size={14} className="text-sky-500" />
                        </div>
                        <span className="text-sm text-slate-600">Twitter</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">
                        {post.scheduled_time ? (
                          <span className="text-indigo-600 font-medium">
                            {new Date(post.scheduled_time).toLocaleDateString()}
                          </span>
                        ) : (
                          new Date(post.created_at).toLocaleDateString()
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(post.scheduled_time || post.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(post)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(post.status === 'draft' || post.status === 'failed') && (
                          <button
                            onClick={() => handlePublish(post.id)}
                            disabled={publishingId === post.id || !backendOnline}
                            className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Publish to Twitter"
                          >
                            {publishingId === post.id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Send size={18} />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={!backendOnline}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Posts;
