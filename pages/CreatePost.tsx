import React, { useState, useEffect } from 'react';
import { Platform, PlatformToken } from '../types';
import { PLATFORM_ICONS, PLATFORM_LABELS } from '../constants';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Image, Video, Send, Loader2, CalendarClock, Globe, ThumbsUp, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';

const PreviewCard = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white border rounded-lg shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const [platformData, setPlatformData] = useState<PlatformToken[]>([]);

  useEffect(() => {
    // Fetch platform data to get user avatars/names for preview
    api.getPlatformStatus().then(data => setPlatformData(data));
  }, []);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => {
      const newSelection = prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform];
      
      // Update active preview tab if needed
      if (newSelection.length > 0 && (!activePreview || !newSelection.includes(activePreview))) {
        setActivePreview(newSelection[0]);
      } else if (newSelection.length === 0) {
        setActivePreview(null);
      }
      
      return newSelection;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlatforms.length === 0) {
      alert("Please select at least one platform.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createPost({
        content,
        image_url: imageUrl || undefined,
        video_url: videoUrl || undefined,
        platforms: selectedPlatforms,
        scheduled_time: scheduledTime || undefined
      });
      navigate('/posts');
    } catch (error) {
      console.error("Failed to create post", error);
      alert("Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).length;
  const charCount = content.length;
  const isTwitterSelected = selectedPlatforms.includes(Platform.TWITTER);
  const isOverTwitterLimit = isTwitterSelected && charCount > 280;

  // Render Logic for Live Previews
  const renderPreview = (platform: string) => {
    const platformInfo = platformData.find(p => p.platform === platform);
    const name = platformInfo?.page_name || platformInfo?.account_name || "Your Account";
    const username = platformInfo?.username || "@username";
    const avatar = platformInfo?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback";

    // Generic Mock UI components
    const Avatar = ({ size = "w-10 h-10" }) => (
      <img src={avatar} alt="Avatar" className={`${size} rounded-full bg-slate-100 object-cover`} />
    );

    const MediaPreview = () => {
       if (imageUrl) return <img src={imageUrl} alt="Post media" className="w-full h-auto object-cover max-h-[300px]" />;
       if (videoUrl) return <div className="w-full h-[200px] bg-slate-900 flex items-center justify-center text-white"><Video size={32} /></div>;
       return null;
    };

    switch (platform) {
      case Platform.FACEBOOK:
        return (
          <PreviewCard className="border-slate-200">
             <div className="p-3 flex gap-2 items-center">
                <Avatar />
                <div>
                  <p className="font-semibold text-sm text-slate-900 leading-tight">{name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">Just now <Globe size={10} /></p>
                </div>
                <MoreHorizontal size={16} className="ml-auto text-slate-400" />
             </div>
             <div className="px-3 pb-3 text-sm text-slate-800 whitespace-pre-wrap">{content}</div>
             <MediaPreview />
             <div className="px-3 py-2 border-t border-slate-100 flex justify-between text-slate-500">
                <div className="flex items-center gap-1"><ThumbsUp size={16} /> <span className="text-xs font-medium">Like</span></div>
                <div className="flex items-center gap-1"><MessageCircle size={16} /> <span className="text-xs font-medium">Comment</span></div>
                <div className="flex items-center gap-1"><Share2 size={16} /> <span className="text-xs font-medium">Share</span></div>
             </div>
          </PreviewCard>
        );
      
      case Platform.TWITTER:
        return (
          <PreviewCard className="border-slate-100 p-3">
             <div className="flex gap-3">
                <Avatar />
                <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-1">
                      <span className="font-bold text-sm text-slate-900">{name}</span>
                      <span className="text-sm text-slate-500 truncate">{username} · 1m</span>
                   </div>
                   <p className="text-sm text-slate-900 whitespace-pre-wrap mb-2">{content}</p>
                   {imageUrl || videoUrl ? <div className="rounded-xl overflow-hidden border border-slate-200 mb-2"><MediaPreview /></div> : null}
                   <div className="flex justify-between text-slate-500 max-w-xs">
                      <MessageCircle size={16} />
                      <div className="flex gap-1 items-center"><Share2 size={16} className="rotate-90" /></div>
                      <ThumbsUp size={16} />
                      <Share2 size={16} />
                   </div>
                </div>
             </div>
          </PreviewCard>
        );

      case Platform.INSTAGRAM:
        return (
          <PreviewCard className="border-slate-200 max-w-xs mx-auto">
             <div className="p-2 flex items-center gap-2">
                <Avatar size="w-8 h-8" />
                <span className="text-xs font-semibold">{username}</span>
                <MoreHorizontal size={16} className="ml-auto text-slate-900" />
             </div>
             <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                {imageUrl || videoUrl ? <MediaPreview /> : <span className="text-xs text-slate-400">Media Required</span>}
             </div>
             <div className="p-2">
                <div className="flex gap-3 mb-2 text-slate-800">
                   <ThumbsUp size={20} className="hover:text-red-500" />
                   <MessageCircle size={20} />
                   <Share2 size={20} />
                </div>
                <p className="text-xs text-slate-800">
                  <span className="font-semibold">{username}</span> {content}
                </p>
             </div>
          </PreviewCard>
        );
      
      case Platform.LINKEDIN:
        return (
           <PreviewCard className="border-slate-200">
             <div className="p-3 flex gap-2 items-center">
                <Avatar />
                <div>
                  <p className="font-semibold text-sm text-slate-900 leading-tight">{name}</p>
                  <p className="text-xs text-slate-500">{username.replace('@','')}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">1m • <Globe size={10} /></p>
                </div>
             </div>
             <div className="px-3 pb-2 text-sm text-slate-800 whitespace-pre-wrap">{content}</div>
             <MediaPreview />
             <div className="px-3 py-2 border-t border-slate-100 flex justify-between text-slate-500 px-6">
                <div className="flex flex-col items-center gap-1"><ThumbsUp size={16} /> <span className="text-xs">Like</span></div>
                <div className="flex flex-col items-center gap-1"><MessageCircle size={16} /> <span className="text-xs">Comment</span></div>
                <div className="flex flex-col items-center gap-1"><Share2 size={16} /> <span className="text-xs">Share</span></div>
                <div className="flex flex-col items-center gap-1"><Send size={16} /> <span className="text-xs">Send</span></div>
             </div>
          </PreviewCard>
        );

      default: // YouTube etc
        return (
          <PreviewCard className="p-4 text-center text-slate-500 text-sm">
             Preview not available for {PLATFORM_LABELS[platform]}
          </PreviewCard>
        );
    }
  };


  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Create New Post</h2>
        <p className="text-slate-500">Draft, preview, and schedule content for all your channels.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Editor & Configuration */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Content Editor */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Post Content
            </label>
            <textarea
              className="w-full h-32 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-slate-800 placeholder-slate-400 text-sm"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            ></textarea>
            <div className="flex justify-between mt-2 text-xs text-slate-400">
              <span>{wordCount} words</span>
              <span className={isOverTwitterLimit ? 'text-red-500 font-bold' : ''}>
                {charCount} characters
                {isTwitterSelected && ' / 280'}
              </span>
            </div>
          </div>

          {/* Media & Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-medium text-slate-700">Media</h3>
                <div className="space-y-3">
                  <div>
                    <input
                      type="url"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                      placeholder="Image URL"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      type="url"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                      placeholder="Video URL"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                    />
                  </div>
                </div>
             </div>

             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                   <CalendarClock size={16} /> Scheduling
                </h3>
                <div>
                   <label className="text-xs text-slate-500 mb-1 block">Publish Date (Optional)</label>
                   <input 
                      type="datetime-local"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xs text-slate-700"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                   />
                </div>
                <p className="text-[10px] text-slate-400">Leave blank to publish immediately or save as draft.</p>
             </div>
          </div>

          {/* Platform Selection */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-medium text-slate-700 mb-4">Select Platforms</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.values(Platform).map((platform) => (
                <label 
                  key={platform} 
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedPlatforms.includes(platform)
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedPlatforms.includes(platform)}
                    onChange={() => togglePlatform(platform)}
                  />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    selectedPlatforms.includes(platform) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                  }`}>
                    {selectedPlatforms.includes(platform) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {React.cloneElement(PLATFORM_ICONS[platform] as React.ReactElement, { size: 16 })}
                  <span className="text-xs font-medium text-slate-700 truncate">{PLATFORM_LABELS[platform]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-2">
             <button
                type="submit"
                disabled={isSubmitting || !content || selectedPlatforms.length === 0}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    {scheduledTime ? <CalendarClock size={20} /> : <Send size={20} />}
                    {scheduledTime ? 'Schedule Post' : 'Create Post'}
                  </>
                )}
              </button>
          </div>
        </form>

        {/* Right Column: Live Preview */}
        <div className="flex flex-col h-full">
            <div className="sticky top-6 space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Live Preview</h3>
                </div>

                {selectedPlatforms.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl h-64 flex items-center justify-center text-slate-400 text-sm">
                        Select a platform to see preview
                    </div>
                ) : (
                   <div className="space-y-4">
                      {/* Tabs */}
                      <div className="flex gap-2 overflow-x-auto pb-2">
                          {selectedPlatforms.map(p => (
                              <button 
                                key={p}
                                onClick={() => setActivePreview(p)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                    activePreview === p 
                                    ? 'bg-slate-800 text-white' 
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {React.cloneElement(PLATFORM_ICONS[p] as React.ReactElement, { size: 12 })}
                                {PLATFORM_LABELS[p]}
                              </button>
                          ))}
                      </div>

                      {/* Preview Container */}
                      <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 min-h-[400px] flex items-center justify-center">
                          <div className="w-full max-w-sm">
                              {activePreview && renderPreview(activePreview)}
                          </div>
                      </div>
                   </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;