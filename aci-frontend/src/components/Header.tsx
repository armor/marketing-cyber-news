import { useAuth } from '@/hooks/useAuth';
import { websocketService } from '@/services/websocketService';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onNavigate: (page: 'articles' | 'bookmarks' | 'history' | 'stats') => void;
  currentPage: string;
}

export function Header({ onNavigate, currentPage }: HeaderProps) {
  const { user, logout } = useAuth();
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [hoveredLogout, setHoveredLogout] = useState(false);

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
    connected: 'var(--color-success)',
    connecting: 'var(--color-warning)',
    disconnected: 'var(--color-critical)',
  };

  const navItems = [
    { key: 'articles', label: 'Articles', icon: '📰' },
    { key: 'bookmarks', label: 'Bookmarks', icon: '🔖' },
    { key: 'history', label: 'History', icon: '📜' },
    { key: 'stats', label: 'Stats', icon: '📊' },
  ] as const;

  const getNavButtonStyle = (itemKey: string) => {
    const isActive = currentPage === itemKey;
    const isHovered = hoveredNav === itemKey;

    if (isActive) {
      return {
        background: 'var(--gradient-btn-trust)',
        color: 'var(--color-text-primary)',
        boxShadow: 'var(--shadow-btn-accent)',
      };
    }

    return {
      backgroundColor: isHovered ? 'var(--color-bg-elevated)' : 'transparent',
      color: 'var(--color-text-secondary)',
    };
  };

  return (
    <header
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderBottom: `var(--border-width-thin) solid var(--color-border-default)`,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          maxWidth: '80rem',
          marginLeft: 'auto',
          marginRight: 'auto',
          padding: 'var(--spacing-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo and Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            <h1
              style={{
                fontSize: 'var(--typography-font-size-2xl)',
                fontWeight: 'var(--typography-font-weight-bold)',
                color: 'var(--color-text-primary)',
              }}
            >
              <span style={{ color: 'var(--color-brand-primary)' }}>NEXUS</span>
            </h1>
            <div className="hidden sm:block">
              <span style={{ fontSize: 'var(--typography-font-size-sm)', color: 'var(--color-text-muted)' }}>
                by Armor
              </span>
              <span
                style={{
                  fontSize: 'var(--typography-font-size-xs)',
                  color: 'var(--color-text-muted)',
                  display: 'block',
                }}
              >
                Proactive Cyber Defense
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav
            className="hidden md:flex"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}
          >
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                onMouseEnter={() => setHoveredNav(item.key)}
                onMouseLeave={() => setHoveredNav(null)}
                style={{
                  ...getNavButtonStyle(item.key),
                  padding: `var(--spacing-2) var(--spacing-4)`,
                  borderRadius: 'var(--border-radius-lg)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  transition: `all var(--motion-duration-fast) var(--motion-easing-default)`,
                }}
              >
                <span style={{ marginRight: 'var(--spacing-2)' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* User Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            {/* WebSocket Status Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <div
                style={{
                  width: 'var(--spacing-2)',
                  height: 'var(--spacing-2)',
                  borderRadius: 'var(--border-radius-full)',
                  backgroundColor: wsStatusColors[wsStatus],
                  animation: wsStatus === 'connecting' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                }}
                title={`WebSocket: ${wsStatus}`}
              />
              <span
                className="hidden sm:block"
                style={{
                  fontSize: 'var(--typography-font-size-xs)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {wsStatus === 'connected' ? 'Live' : wsStatus}
              </span>
            </div>

            {/* User Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
              <div className="hidden sm:block" style={{ textAlign: 'right' }}>
                <p
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {user?.name}
                </p>
                <p
                  style={{
                    fontSize: 'var(--typography-font-size-xs)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {user?.email}
                </p>
              </div>
              <button
                onClick={logout}
                onMouseEnter={() => setHoveredLogout(true)}
                onMouseLeave={() => setHoveredLogout(false)}
                style={{
                  padding: `var(--spacing-2) var(--spacing-3)`,
                  fontSize: 'var(--typography-font-size-sm)',
                  color: hoveredLogout ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  backgroundColor: hoveredLogout ? 'var(--color-bg-secondary)' : 'transparent',
                  borderRadius: 'var(--border-radius-lg)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: `all var(--motion-duration-fast) var(--motion-easing-default)`,
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav
          className="md:hidden"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            marginTop: 'var(--spacing-4)',
            overflowX: 'auto',
            paddingBottom: 'var(--spacing-2)',
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              onMouseEnter={() => setHoveredNav(item.key)}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                ...getNavButtonStyle(item.key),
                padding: `var(--spacing-2) var(--spacing-4)`,
                borderRadius: 'var(--border-radius-lg)',
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                transition: `all var(--motion-duration-fast) var(--motion-easing-default)`,
              }}
            >
              <span style={{ marginRight: 'var(--spacing-2)' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
