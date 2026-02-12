import React from 'react';
import { Facebook, Instagram, Twitter, Linkedin, Youtube, LayoutDashboard, PenSquare, List, Settings } from 'lucide-react';
import { Platform } from './types';

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
  { label: 'Create Post', path: '/create', icon: <PenSquare size={20} /> },
  { label: 'All Posts', path: '/posts', icon: <List size={20} /> },
  { label: 'Settings', path: '/settings', icon: <Settings size={20} /> },
];

export const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  [Platform.FACEBOOK]: <Facebook className="text-blue-600" size={20} />,
  [Platform.INSTAGRAM]: <Instagram className="text-pink-600" size={20} />,
  [Platform.TWITTER]: <Twitter className="text-sky-500" size={20} />,
  [Platform.LINKEDIN]: <Linkedin className="text-blue-700" size={20} />,
  [Platform.YOUTUBE]: <Youtube className="text-red-600" size={20} />,
};

export const PLATFORM_LABELS: Record<string, string> = {
  [Platform.FACEBOOK]: 'Facebook Page',
  [Platform.INSTAGRAM]: 'Instagram',
  [Platform.TWITTER]: 'Twitter / X',
  [Platform.LINKEDIN]: 'LinkedIn',
  [Platform.YOUTUBE]: 'YouTube',
};