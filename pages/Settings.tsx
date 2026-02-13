import React, { useEffect, useState } from 'react';
import { api, checkBackendHealth } from '../services/api';
import {
  Twitter,
  CheckCircle,
  XCircle,
  ExternalLink,
  Key,
  Loader2,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Server
} from 'lucide-react';

interface TwitterStatus {
  connected: boolean;
  username?: string;
  user_id?: string;
  name?: string;
  profile_image?: string;
  followers_count?: number;
  error?: string;
  required_keys?: string[];
}

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [twitterStatus, setTwitterStatus] = useState<TwitterStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const isOnline = await checkBackendHealth();
      setBackendOnline(isOnline);

      if (isOnline) {
        const status = await api.getTwitterStatus();
        setTwitterStatus(status);
      }
    } catch (e) {
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      await api.testTwitterConnection();
      await checkStatus();
      alert('Connection successful!');
    } catch (e: any) {
      alert(e.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const envKeys = [
    { name: 'TWITTER_API_KEY', desc: 'API Key (Consumer Key)' },
    { name: 'TWITTER_API_SECRET', desc: 'API Secret (Consumer Secret)' },
    { name: 'TWITTER_ACCESS_TOKEN', desc: 'Access Token' },
    { name: 'TWITTER_ACCESS_TOKEN_SECRET', desc: 'Access Token Secret' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-sky-100 rounded-lg">
          <Twitter size={24} className="text-sky-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Twitter Settings</h2>
          <p className="text-slate-500">Configure your Twitter/X connection</p>
        </div>
      </div>

      {/* Backend Status */}
      <div className={`p-4 rounded-xl border ${
        backendOnline
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          <Server size={20} className={backendOnline ? 'text-emerald-600' : 'text-red-600'} />
          <div>
            <p className={`font-medium ${backendOnline ? 'text-emerald-800' : 'text-red-800'}`}>
              Backend Server: {backendOnline ? 'Online' : 'Offline'}
            </p>
            {!backendOnline && (
              <p className="text-sm text-red-600 mt-1">
                Start the backend server: <code className="bg-red-100 px-1 rounded">cd backend && python main.py</code>
              </p>
            )}
          </div>
          <button
            onClick={checkStatus}
            className="ml-auto p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Twitter Connection Status */}
      {backendOnline && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-sky-100 rounded-xl">
                <Twitter size={28} className="text-sky-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">Twitter / X</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${
                    twitterStatus?.connected ? 'bg-emerald-500' : 'bg-slate-300'
                  }`} />
                  <span className="text-sm text-slate-500">
                    {twitterStatus?.connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-300 flex items-center gap-2"
              >
                {testing ? (
                  <><Loader2 size={16} className="animate-spin" /> Testing...</>
                ) : (
                  <><RefreshCw size={16} /> Test Connection</>
                )}
              </button>
            </div>
          </div>

          <div className="p-6">
            {twitterStatus?.connected ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  {twitterStatus.profile_image && (
                    <img
                      src={twitterStatus.profile_image}
                      alt="Profile"
                      className="w-16 h-16 rounded-full border-2 border-emerald-300"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-emerald-600" />
                      <span className="font-semibold text-emerald-800">Connected</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900 mt-1">
                      @{twitterStatus.username}
                    </p>
                    {twitterStatus.name && (
                      <p className="text-slate-600">{twitterStatus.name}</p>
                    )}
                    {twitterStatus.followers_count !== undefined && (
                      <p className="text-sm text-slate-500 mt-1">
                        {twitterStatus.followers_count.toLocaleString()} followers
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Not Connected</p>
                    <p className="text-amber-700 mt-1">
                      {twitterStatus?.error || 'Twitter API credentials are not configured.'}
                    </p>
                    {twitterStatus?.required_keys && (
                      <div className="mt-3 p-3 bg-amber-100 rounded-lg">
                        <p className="text-sm font-medium text-amber-800 mb-2">Missing:</p>
                        <ul className="text-sm text-amber-700 space-y-1">
                          {twitterStatus.required_keys.map(key => (
                            <li key={key}>• {key}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Setup Guide */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Key size={20} />
            Setup Guide
          </h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
            <p className="text-sm text-sky-800">
              <strong>Twitter API v2 (Free Tier)</strong> - You need a Twitter Developer account
              with Free tier access. This allows posting tweets with media.
            </p>
          </div>

          {/* Steps */}
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-semibold text-xs">1</span>
              <div>
                <p className="font-medium text-slate-900">Create a Developer Account</p>
                <p className="text-sm text-slate-600 mt-1">
                  Go to{' '}
                  <a
                    href="https://developer.twitter.com/en/portal/petition/essential/basic-info"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    Twitter Developer Portal <ExternalLink size={12} />
                  </a>
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-semibold text-xs">2</span>
              <div>
                <p className="font-medium text-slate-900">Create a Project & App</p>
                <p className="text-sm text-slate-600 mt-1">
                  Create a new Project, then create an App. Name it "Social Media Dashboard".
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-semibold text-xs">3</span>
              <div>
                <p className="font-medium text-slate-900">Configure User Authentication</p>
                <p className="text-sm text-slate-600 mt-1">
                  Go to App Settings → User authentication settings:
                </p>
                <ul className="text-sm text-slate-600 mt-2 space-y-1 ml-4">
                  <li>• App permissions: <strong>Read and write</strong></li>
                  <li>• Type: <strong>Web App, Automated App, or Bot</strong></li>
                  <li>• Callback URL: <code className="bg-slate-100 px-1 rounded text-xs">http://localhost:5173</code></li>
                </ul>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-semibold text-xs">4</span>
              <div>
                <p className="font-medium text-slate-900">Generate Keys & Tokens</p>
                <p className="text-sm text-slate-600 mt-1">
                  Go to "Keys and Tokens" tab and generate all 4 credentials.
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-semibold text-xs">5</span>
              <div>
                <p className="font-medium text-slate-900">Create .env File</p>
                <p className="text-sm text-slate-600 mt-1">
                  Copy <code className="bg-slate-100 px-1 rounded text-xs">backend/.env.example</code> to{' '}
                  <code className="bg-slate-100 px-1 rounded text-xs">backend/.env</code> and fill in your keys.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Required Environment Variables</h3>
        </div>

        <div className="p-6">
          <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm overflow-x-auto">
            {envKeys.map((key) => (
              <div
                key={key.name}
                className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
              >
                <div>
                  <span className="text-emerald-400">{key.name}</span>
                  <span className="text-slate-500">=</span>
                  <span className="text-amber-300">your_value_here</span>
                </div>
                <button
                  onClick={() => copyToClipboard(`${key.name}=`, key.name)}
                  className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                  title="Copy"
                >
                  {copiedKey === key.name ? (
                    <Check size={16} className="text-emerald-400" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-slate-600">
            <p className="font-medium mb-2">File location:</p>
            <code className="bg-slate-100 px-2 py-1 rounded">backend/.env</code>
          </div>
        </div>
      </div>

      {/* Run Backend */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Start the Backend Server</h3>

        <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm text-slate-100">
          <p className="text-slate-400"># Install dependencies</p>
          <p>cd backend && pip install -r requirements.txt</p>
          <p className="text-slate-400 mt-3"># Start server</p>
          <p>python main.py</p>
        </div>

        <p className="text-sm text-slate-500 mt-4">
          Server will run at <code className="bg-slate-100 px-1 rounded">http://localhost:8000</code>
        </p>
      </div>
    </div>
  );
};

export default Settings;
