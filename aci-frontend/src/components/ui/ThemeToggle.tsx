/**
 * ThemeToggle Component - Armor Brand Style
 *
 * Button to toggle between light and dark themes with animated sun/moon icons.
 * Matches the header button styling with glass effect backgrounds.
 */

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/stores/ThemeContext';

export interface ThemeToggleProps {
  readonly className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps): React.ReactElement {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${className}`}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      type="button"
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
      }}
    >
      {/* Sun icon - visible in light mode, hidden in dark mode */}
      <Sun
        className={`h-5 w-5 text-muted-foreground transition-all duration-300 ${
          resolvedTheme === 'dark'
            ? 'rotate-90 scale-0 opacity-0'
            : 'rotate-0 scale-100 opacity-100'
        }`}
      />
      {/* Moon icon - visible in dark mode, hidden in light mode */}
      <Moon
        className={`absolute h-5 w-5 text-muted-foreground transition-all duration-300 ${
          resolvedTheme === 'dark'
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        }`}
      />
    </button>
  );
}

ThemeToggle.displayName = 'ThemeToggle';
