import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Post } from '../types';
import { PLATFORM_ICONS } from '../constants';
import { Trash2, Send, Clock, AlertTriangle, CheckCircle, Search, Filter, Info } from 'lucide-react';

const Posts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPosts = async () => {
    try {
      const data = await api.getPosts();
      setPosts(data);
    } catch (error) {
      console.error("Failed to load posts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePublish = async (id: number) => {
    if (!window.confirm("Are you sure you want to publish this post now?")) return;
    
    setPublishingId(id);
    try {
      await api.publishPost(id);
      // Refresh local state optimistically or re-fetch
      // In a real app, we would re-fetch to get the updated state from server including errors if any
      const updatedPosts = await api.getPosts();
      setPosts(updatedPosts);
    } catch (error) {
      // Re-fetch to get the error state
      const updatedPosts = await api.getPosts();
      setPosts(updatedPosts);
      alert("Failed to publish post. Check the error details.");
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this post permanently?")) return;
    
    try {
      await api.deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      alert("Failed to delete post.");
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
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle size={12} /> Posted</span>;
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
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700"><Clock size={12} /> Scheduled</span>;
      default:
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Draft</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">All Posts</h2>
        <div className="flex gap-3 w-full sm:w-auto">
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
           <div className="p-12 text-center">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
           </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No posts found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Content</th>
                  <th className="px-6 py-4">Platforms</th>
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
                      {(post.image_url || post.video_url) && (
                         <div className="mt-1 flex gap-2">
                            {post.image_url && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Image</span>}
                            {post.video_url && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Video</span>}
                         </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex -space-x-1">
                        {post.platforms.map(p => (
                          <div key={p} className="bg-white p-1 rounded-full border border-slate-200 shadow-sm z-10" title={p}>
                             {React.cloneElement(PLATFORM_ICONS[p] as React.ReactElement, { size: 14 })}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">
                        {post.scheduled_time 
                          ? <span className="text-indigo-600 font-medium">{new Date(post.scheduled_time).toLocaleDateString()}</span>
                          : new Date(post.created_at).toLocaleDateString()
                        }
                      </div>
                      <div className="text-xs text-slate-400">
                        {post.scheduled_time 
                          ? new Date(post.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(post)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(post.status === 'draft' || post.status === 'failed') && (
                          <button 
                            onClick={() => handlePublish(post.id)}
                            disabled={publishingId === post.id}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Publish Now"
                          >
                            {publishingId === post.id ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Send size={18} />}
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(post.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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