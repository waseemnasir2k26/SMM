import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PlatformToken, Platform } from '../types';
import { PLATFORM_ICONS, PLATFORM_LABELS } from '../constants';
import { Save, LogIn, LogOut, CheckCircle, ExternalLink, Key } from 'lucide-react';

const Settings: React.FC = () => {
  const [tokens, setTokens] = useState<PlatformToken[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for credential forms
  const [credentials, setCredentials] = useState<Record<string, { id: string, secret: string }>>({
    [Platform.TWITTER]: { id: '', secret: '' },
    [Platform.FACEBOOK]: { id: '', secret: '' },
    [Platform.LINKEDIN]: { id: '', secret: '' },
    [Platform.YOUTUBE]: { id: '', secret: '' },
    [Platform.INSTAGRAM]: { id: '', secret: '' },
  });

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await api.getPlatformStatus();
      setTokens(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialChange = (platform: string, field: 'id' | 'secret', value: string) => {
    setCredentials(prev => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value }
    }));
  };

  const saveCredentials = async (platform: string) => {
    const { id, secret } = credentials[platform];
    if (!id || !secret) {
        alert("Client ID and Secret are required.");
        return;
    }
    try {
        await api.saveCredentials(platform, id, secret);
        alert(`Credentials saved for ${PLATFORM_LABELS[platform]}`);
        setCredentials(prev => ({ ...prev, [platform]: { id: '', secret: '' } }));
    } catch (e) {
        alert("Failed to save credentials");
    }
  };

  const handleConnect = async (platform: string) => {
    try {
        const url = await api.connectPlatform(platform);
        console.log(`Redirecting to ${url}`);
        // Simulate OAuth flow for demo purposes
        const platformName = PLATFORM_LABELS[platform];
        alert(`Redirecting to ${platformName} to authorize access...`);
        
        // Simulating the callback delay
        setTimeout(async () => {
            // Force refresh of status from "server"
            // In a real app, this would happen after the OAuth callback redirect
            const updatedTokens = await api.getPlatformStatus();
            setTokens(updatedTokens);
        }, 1500);
    } catch (e) {
        alert("Failed to initiate connection");
    }
  };

  const handleDisconnect = async (platform: string) => {
      if (!confirm(`Disconnect ${PLATFORM_LABELS[platform]}?`)) return;
      try {
          await api.disconnectPlatform(platform);
          // Optimistically update UI
          setTokens(prev => prev.map(t => 
            t.platform === platform ? { ...t, connected: false, account_name: '', username: undefined, page_name: undefined } : t
        ));
      } catch (e) {
          alert("Failed to disconnect");
      }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings & Connections</h2>
        <p className="text-slate-500">Manage your API credentials and connect your social accounts.</p>
      </div>

      <div className="space-y-6">
        {Object.values(Platform).map((platform) => {
            const tokenData = tokens.find(t => t.platform === platform);
            const isConnected = tokenData?.connected;

            return (
                <div key={platform} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                            {React.cloneElement(PLATFORM_ICONS[platform] as React.ReactElement, { size: 24 })}
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 text-lg">{PLATFORM_LABELS[platform]}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span className="text-xs font-medium text-slate-500">
                                    {isConnected ? 'Connected' : 'Not Connected'}
                                </span>
                            </div>
                        </div>
                        <div className="ml-auto">
                            {isConnected ? (
                                <button 
                                    onClick={() => handleDisconnect(platform)}
                                    className="flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                                >
                                    <LogOut size={16} /> Disconnect
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleConnect(platform)}
                                    className="flex items-center gap-2 text-sm bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-lg transition-colors"
                                >
                                    <LogIn size={16} /> Connect Account
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Credentials Form */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                <Key size={14} className="text-slate-400" />
                                API Configuration
                            </h4>
                            <p className="text-xs text-slate-500 mb-2">
                                Enter your OAuth App Client ID and Secret to enable connections.
                            </p>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Client ID</label>
                                <input 
                                    type="text" 
                                    value={credentials[platform]?.id || ''}
                                    onChange={(e) => handleCredentialChange(platform, 'id', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Enter Client ID"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Client Secret</label>
                                <input 
                                    type="password" 
                                    value={credentials[platform]?.secret || ''}
                                    onChange={(e) => handleCredentialChange(platform, 'secret', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="••••••••••••••"
                                />
                            </div>
                            <button 
                                onClick={() => saveCredentials(platform)}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                                <Save size={14} /> Save Credentials
                            </button>
                        </div>

                        {/* Connection Info */}
                        <div className="bg-slate-50 rounded-lg p-5">
                            <h4 className="text-sm font-semibold text-slate-900 mb-3">Connection Details</h4>
                            {isConnected ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Connected As</span>
                                        <div className="text-right">
                                            <span className="block font-medium text-slate-800">{tokenData?.account_name}</span>
                                            {tokenData?.username && <span className="block text-xs text-slate-500">{tokenData.username}</span>}
                                        </div>
                                    </div>
                                    {tokenData?.page_name && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Managing Page</span>
                                            <span className="font-medium text-slate-800">{tokenData.page_name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-emerald-600 mt-2">
                                        <CheckCircle size={14} /> Token Active
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-sm text-slate-400">No account connected yet.</p>
                                    <p className="text-xs text-slate-400 mt-1">Configure API keys, then click Connect.</p>
                                </div>
                            )}
                            
                            <div className="mt-6 pt-4 border-t border-slate-200">
                                <a href="#" className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors">
                                    <ExternalLink size={12} /> Developer Docs: How to get API Keys
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default Settings;