import { useAuth } from '../contexts/AuthContext';
import { websocketService } from '../services/websocketService';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onNavigate: (page: 'articles' | 'bookmarks' | 'history' | 'stats') => void;
  currentPage: string;
}

export function Header({ onNavigate, currentPage }: HeaderProps) {
  const { user, logout } = useAuth();
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  useEffect(() => {
    // Connect to WebSocket when component mounts
    websocketService.connect();

    // Poll connection status
    const interval = setInterval(() => {
      setWsStatus(websocketService.getConnectionState());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const wsStatusColors = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-red-500',
  };

  const navItems = [
    { key: 'articles', label: 'Articles', icon: '📰' },
    { key: 'bookmarks', label: 'Bookmarks', icon: '🔖' },
    { key: 'history', label: 'History', icon: '📜' },
    { key: 'stats', label: 'Stats', icon: '📊' },
  ] as const;

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">
              <span className="text-primary">NEXUS</span>
            </h1>
            <div className="hidden sm:block">
              <span className="text-sm text-gray-400">by Armor</span>
              <span className="text-xs text-gray-500 block">Proactive Cyber Defense</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === item.key
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* WebSocket Status Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${wsStatusColors[wsStatus]}`}
                title={`WebSocket: ${wsStatus}`}
              />
              <span className="text-xs text-gray-400 hidden sm:block">
                {wsStatus === 'connected' ? 'Live' : wsStatus}
              </span>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center gap-2 mt-4 overflow-x-auto pb-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                currentPage === item.key
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
