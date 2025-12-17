/**
 * Login Page
 *
 * Authentication page with themed design using Fortified Horizon tokens.
 * Centered card layout with NEXUS branding.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Shield } from 'lucide-react';

export function Login(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'var(--gradient-hero)',
      }}
    >
      {/* Login Card */}
      <div
        className="mx-4"
        style={{
          width: '400px',
          maxWidth: '100%',
          background: 'var(--gradient-card)',
          borderRadius: 'var(--border-radius-xl)',
          boxShadow: 'var(--shadow-hero)',
          border: '1px solid var(--color-border-default)',
          padding: 'var(--spacing-6)',
          boxSizing: 'border-box',
        }}
      >
        {/* Header/Branding */}
        <div className="text-center" style={{ marginBottom: 'var(--spacing-6)' }}>
          {/* Logo */}
          <div
            className="inline-flex items-center justify-center"
            style={{
              width: 'var(--spacing-12)',
              height: 'var(--spacing-12)',
              borderRadius: 'var(--border-radius-lg)',
              background: 'var(--gradient-btn-primary)',
              boxShadow: 'var(--shadow-btn-primary)',
              marginBottom: 'var(--spacing-3)',
            }}
          >
            <Shield
              className="w-6 h-6"
              style={{ color: 'var(--color-bg-elevated)' }}
            />
          </div>

          <h1
            className="font-bold tracking-tight"
            style={{
              fontSize: 'var(--typography-font-size-2xl)',
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            NEXUS
          </h1>
          <p
            className="font-medium"
            style={{
              color: 'var(--color-brand-primary)',
              fontSize: 'var(--typography-font-size-sm)',
              marginTop: 'var(--spacing-1)',
            }}
          >
            by Armor
          </p>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 'var(--typography-font-size-xs)',
              marginTop: 'var(--spacing-1)',
            }}
          >
            Proactive Cyber Defense
          </p>

          <h2
            className="font-semibold"
            style={{
              fontSize: 'var(--typography-font-size-lg)',
              color: 'var(--color-text-primary)',
              marginTop: 'var(--spacing-4)',
            }}
          >
            Sign In
          </h2>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: 'var(--gradient-badge-critical)',
              border: '1px solid var(--color-semantic-error)',
              color: 'var(--color-semantic-error)',
              padding: 'var(--spacing-3) var(--spacing-4)',
              borderRadius: 'var(--border-radius-md)',
              marginBottom: 'var(--spacing-6)',
              fontSize: 'var(--typography-font-size-sm)',
            }}
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--spacing-5)' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: 'var(--spacing-3) var(--spacing-4)',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--border-radius-lg)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--typography-font-size-base)',
                transition: 'all var(--motion-duration-fast)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-focus)';
                e.currentTarget.style.boxShadow = 'var(--shadow-focus)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-default)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: 'var(--spacing-6)' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: 'var(--spacing-3) var(--spacing-4)',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--border-radius-lg)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--typography-font-size-base)',
                transition: 'all var(--motion-duration-fast)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-focus)';
                e.currentTarget.style.boxShadow = 'var(--shadow-focus)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-default)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: 'var(--spacing-3) var(--spacing-4)',
              background: 'var(--gradient-btn-primary)',
              color: 'var(--color-bg-elevated)',
              fontWeight: 'var(--typography-font-weight-semibold)',
              fontSize: 'var(--typography-font-size-base)',
              borderRadius: 'var(--border-radius-lg)',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              boxShadow: 'var(--shadow-btn-primary)',
              transition: 'all var(--motion-duration-fast)',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.boxShadow = 'var(--shadow-btn-primary-hover)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-btn-primary)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer Link */}
        <p
          className="text-center"
          style={{
            color: 'var(--color-text-muted)',
            fontSize: 'var(--typography-font-size-sm)',
            marginTop: 'var(--spacing-6)',
          }}
        >
          Don't have an account?{' '}
          <Link
            to="/register"
            style={{
              color: 'var(--color-brand-primary)',
              textDecoration: 'none',
              fontWeight: 'var(--typography-font-weight-medium)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
