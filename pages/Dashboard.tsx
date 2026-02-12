import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DashboardStats, Post, PostAnalytics } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { ArrowUpRight, CheckCircle2, AlertCircle, Share2, CalendarClock, Activity, MessageCircle, ThumbsUp, Eye } from 'lucide-react';
import { PLATFORM_ICONS } from '../constants';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [analytics, setAnalytics] = useState<PostAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, postsData, analyticsData] = await Promise.all([
          api.getStats(),
          api.getPosts(),
          api.getAnalytics()
        ]);
        setStats(statsData);
        setRecentPosts(postsData.slice(0, 5)); // Just the 5 most recent
        setAnalytics(analyticsData);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Mock data for charts
  const activityData = [
    { name: 'Mon', posts: 2 },
    { name: 'Tue', posts: 4 },
    { name: 'Wed', posts: 1 },
    { name: 'Thu', posts: 6 },
    { name: 'Fri', posts: 8 },
    { name: 'Sat', posts: 3 },
    { name: 'Sun', posts: 2 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Enrich analytics with post content
  const enrichedAnalytics = analytics.map(stat => {
    const post = recentPosts.find(p => p.id === stat.postId);
    return { ...stat, postContent: post?.content || 'Unknown Post' };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
          <p className="text-slate-500">Welcome back, here's what's happening.</p>
        </div>
        <div className="text-sm text-slate-400">
            Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Posts" 
          value={stats?.totalPosts || 0} 
          icon={<Share2 className="text-blue-600" size={24} />}
          trend="+12%"
          trendUp={true}
        />
        <StatCard 
          title="Scheduled" 
          value={stats?.postsThisWeek || 0} 
          icon={<CalendarClock className="text-indigo-600" size={24} />}
          subtext="Coming up this week"
        />
        <StatCard 
          title="Connected" 
          value={stats?.connectedPlatforms || 0} 
          icon={<CheckCircle2 className="text-emerald-600" size={24} />}
          subtext="Active platforms"
        />
        <StatCard 
          title="Failed" 
          value={stats?.failedPosts || 0} 
          icon={<AlertCircle className="text-red-600" size={24} />}
          subtext="Needs attention"
          alert={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-6">Posting Activity (Last 7 Days)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="posts" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-semibold text-slate-800 mb-4">Recent Posts</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {recentPosts.length === 0 ? (
                <p className="text-slate-400 text-sm">No recent activity.</p>
            ) : (
                recentPosts.map((post) => (
                <div key={post.id} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                        post.status === 'posted' ? 'bg-emerald-500' : 
                        post.status === 'failed' ? 'bg-red-500' : 
                        post.status === 'scheduled' ? 'bg-sky-500' : 'bg-amber-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{post.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="flex -space-x-1">
                                {post.platforms.map(p => (
                                    <span key={p} className="bg-white rounded-full p-0.5 shadow-sm border border-slate-100 z-0">
                                        {React.cloneElement(PLATFORM_ICONS[p] as React.ReactElement, { size: 12 })}
                                    </span>
                                ))}
                            </span>
                            <span className="text-xs text-slate-400">
                                {post.status === 'scheduled' 
                                  ? `Scheduled: ${new Date(post.scheduled_time!).toLocaleDateString()}` 
                                  : new Date(post.created_at).toLocaleDateString()
                                }
                            </span>
                        </div>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* New Analytics Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <h3 className="font-semibold text-slate-800 flex items-center gap-2">
             <Activity className="text-indigo-500" size={20} />
             Recent Post Performance
           </h3>
           <button className="text-xs font-medium text-indigo-600 hover:text-indigo-800">View Full Report</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                <th className="px-6 py-3">Post</th>
                <th className="px-6 py-3">Platform</th>
                <th className="px-6 py-3 text-right">Reach</th>
                <th className="px-6 py-3 text-right">Likes</th>
                <th className="px-6 py-3 text-right">Comments</th>
                <th className="px-6 py-3 text-right">Shares</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrichedAnalytics.length > 0 ? enrichedAnalytics.map((stat) => (
                <tr key={`${stat.postId}-${stat.platform}`} className="hover:bg-slate-50">
                   <td className="px-6 py-4">
                     <p className="text-sm text-slate-900 font-medium truncate max-w-xs">{stat.postContent}</p>
                   </td>
                   <td className="px-6 py-4">
                     <div className="flex items-center gap-2 text-sm text-slate-600 capitalize">
                       {React.cloneElement(PLATFORM_ICONS[stat.platform] as React.ReactElement, { size: 16 })}
                       {stat.platform}
                     </div>
                   </td>
                   <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm text-slate-700">
                        <Eye size={14} className="text-slate-400" /> {stat.reach.toLocaleString()}
                      </div>
                   </td>
                   <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm text-slate-700">
                        <ThumbsUp size={14} className="text-emerald-500" /> {stat.likes.toLocaleString()}
                      </div>
                   </td>
                   <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm text-slate-700">
                        <MessageCircle size={14} className="text-blue-500" /> {stat.comments.toLocaleString()}
                      </div>
                   </td>
                   <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm text-slate-700">
                        <Share2 size={14} className="text-purple-500" /> {stat.shares.toLocaleString()}
                      </div>
                   </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">
                    No analytics data available for recent posts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  subtext?: string;
  alert?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendUp, subtext, alert }) => (
  <div className={`p-6 rounded-xl border shadow-sm bg-white ${alert ? 'border-red-100 bg-red-50/30' : 'border-slate-200'}`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-lg ${alert ? 'bg-red-100' : 'bg-slate-100'}`}>
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center text-xs font-semibold ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend}
          {trendUp && <ArrowUpRight size={14} className="ml-0.5" />}
        </div>
      )}
    </div>
    <div>
      <h4 className="text-slate-500 text-sm font-medium mb-1">{title}</h4>
      <span className="text-2xl font-bold text-slate-900">{value}</span>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  </div>
);

export default Dashboard;