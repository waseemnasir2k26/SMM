import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, checkBackendHealth } from '../services/api';
import {
  Send,
  Loader2,
  CalendarClock,
  Image,
  Video,
  X,
  Upload,
  Twitter,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Content state
  const [content, setContent] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Media state
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Character counts
  const charCount = content.length;
  const maxChars = 280;
  const isOverLimit = charCount > maxChars;
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  // Check backend and Twitter status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setBackendStatus('checking');
    try {
      const isOnline = await checkBackendHealth();
      setBackendStatus(isOnline ? 'online' : 'offline');

      if (isOnline) {
        const twitterStatus = await api.getTwitterStatus();
        setTwitterConnected(twitterStatus.connected);
        if (twitterStatus.username) {
          setTwitterUsername(twitterStatus.username);
        }
      }
    } catch (e) {
      setBackendStatus('offline');
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError('Please select an image or video file');
      return;
    }

    // Check file size
    const maxSize = isVideo ? 512 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File too large. Max: ${isVideo ? '512MB' : '5MB'}`);
      return;
    }

    setMediaFile(file);
    setMediaType(isImage ? 'image' : 'video');
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Remove media
  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview('');
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!content.trim()) {
      setError('Please enter some content');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createPost({
        content,
        scheduled_time: scheduledTime || undefined,
      });

      setSuccess('Draft saved!');
      setTimeout(() => navigate('/posts'), 1500);
    } catch (e: any) {
      setError(e.message || 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Publish directly to Twitter
  const handlePublishNow = async () => {
    if (!content.trim()) {
      setError('Please enter some content');
      return;
    }

    if (isOverLimit) {
      setError('Tweet exceeds 280 characters');
      return;
    }

    if (!twitterConnected) {
      setError('Twitter not connected. Check Settings.');
      return;
    }

    setIsPublishing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await api.publishDirect(content, mediaFile || undefined);

      if (result.success) {
        const tweetUrl = result.twitter_result?.url;
        setSuccess(
          tweetUrl
            ? `Posted! View: ${tweetUrl}`
            : 'Posted successfully!'
        );
        setTimeout(() => navigate('/posts'), 2000);
      } else {
        throw new Error(result.twitter_result?.error || 'Post failed');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to post. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-sky-100 rounded-lg">
            <Twitter size={24} className="text-sky-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Create Tweet</h2>
            <p className="text-slate-500">Post directly to Twitter/X</p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex gap-4 mt-4">
          {/* Backend Status */}
          <div className="flex items-center gap-2 text-sm">
            {backendStatus === 'checking' && (
              <><Loader2 size={14} className="animate-spin text-slate-400" /> Checking...</>
            )}
            {backendStatus === 'online' && (
              <><CheckCircle size={14} className="text-emerald-500" /> Backend Online</>
            )}
            {backendStatus === 'offline' && (
              <>
                <AlertCircle size={14} className="text-red-500" /> Backend Offline
                <button onClick={checkStatus} className="ml-2 text-indigo-600 hover:underline">
                  <RefreshCw size={12} />
                </button>
              </>
            )}
          </div>

          {/* Twitter Status */}
          {backendStatus === 'online' && (
            <div className="flex items-center gap-2 text-sm">
              {twitterConnected ? (
                <>
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span>@{twitterUsername}</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} className="text-amber-500" />
                  <span>Twitter not connected</span>
                  <a href="#/settings" className="text-indigo-600 hover:underline">Connect</a>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-2">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Editor */}
        <div className="space-y-6">
          {/* Content */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-slate-700">Tweet Content</label>
              <span className={`text-sm font-medium ${
                isOverLimit ? 'text-red-500' : charCount > 250 ? 'text-amber-500' : 'text-slate-400'
              }`}>
                {charCount} / {maxChars}
              </span>
            </div>

            <textarea
              className={`w-full h-40 p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-slate-800 placeholder-slate-400 ${
                isOverLimit ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={500}
            />

            <div className="flex justify-between mt-2 text-xs text-slate-400">
              <span>{wordCount} words</span>
              {isOverLimit && (
                <span className="text-red-500 font-medium">
                  {charCount - maxChars} characters over limit
                </span>
              )}
            </div>
          </div>

          {/* Media Upload */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-medium text-slate-700 mb-4">Media (Optional)</h3>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!mediaPreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-8 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors flex flex-col items-center gap-3 text-slate-400"
              >
                <Upload size={32} />
                <span className="text-sm font-medium">Click to upload image or video</span>
                <span className="text-xs">Images: JPG, PNG, GIF (5MB) | Videos: MP4, MOV (512MB)</span>
              </button>
            ) : (
              <div className="relative">
                {mediaType === 'video' ? (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full max-h-64 rounded-lg bg-black"
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full max-h-64 object-contain rounded-lg bg-slate-100"
                  />
                )}

                <button
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                >
                  <X size={16} />
                </button>

                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  {mediaType === 'video' ? <Video size={14} /> : <Image size={14} />}
                  <span>{mediaFile?.name}</span>
                  <span>({(mediaFile?.size || 0 / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              </div>
            )}
          </div>

          {/* Schedule (Optional) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
              <CalendarClock size={16} />
              Schedule (Optional)
            </h3>
            <input
              type="datetime-local"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-xs text-slate-400 mt-2">
              Leave blank to post immediately or save as draft
            </p>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-6">
          <div className="sticky top-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Live Preview
            </h3>

            {/* Twitter Preview Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 flex gap-3">
                <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center">
                  <Twitter size={24} className="text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {twitterUsername || 'Your Account'}
                    </span>
                    <span className="text-slate-500 text-sm">
                      @{twitterUsername || 'username'} · now
                    </span>
                  </div>

                  <p className="text-slate-800 whitespace-pre-wrap mt-1 break-words">
                    {content || 'Your tweet will appear here...'}
                  </p>

                  {mediaPreview && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-slate-200">
                      {mediaType === 'video' ? (
                        <video
                          src={mediaPreview}
                          className="w-full max-h-48 object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={mediaPreview}
                          alt="Media"
                          className="w-full max-h-48 object-cover"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleSaveDraft}
                disabled={isSubmitting || !content.trim() || backendStatus !== 'online'}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    Saving...
                  </span>
                ) : (
                  'Save Draft'
                )}
              </button>

              <button
                onClick={handlePublishNow}
                disabled={
                  isPublishing ||
                  !content.trim() ||
                  isOverLimit ||
                  !twitterConnected ||
                  backendStatus !== 'online'
                }
                className="flex-1 py-3 px-4 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Post to Twitter
                  </>
                )}
              </button>
            </div>

            {/* Twitter Limits Info */}
            <div className="mt-6 p-4 bg-sky-50 border border-sky-100 rounded-xl">
              <h4 className="font-medium text-sky-800 mb-2">Twitter Limits</h4>
              <ul className="text-sm text-sky-700 space-y-1">
                <li>• Max 280 characters per tweet</li>
                <li>• Images: JPG, PNG, GIF, WEBP (max 5MB)</li>
                <li>• Videos: MP4, MOV (max 512MB, 2:20 length)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
