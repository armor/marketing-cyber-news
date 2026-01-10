/**
 * Forgot Password Page - Armor Cyber News Platform
 *
 * Request password reset by entering email address.
 * Uses the same Armor-Dash inspired styling as the Login page.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, ApiError } from '@/services/api/client';
import {
  Shield,
  ArrowLeft,
  Mail,
  CheckCircle,
} from 'lucide-react';

// Armor-Dash color palette (matches Login.tsx)
const colors = {
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  orange400: '#fb923c',
  orange500: '#f97316',
  zinc400: '#a1a1aa',
  zinc500: '#71717a',
  zinc600: '#52525b',
  zinc700: '#3f3f46',
  zinc800: '#27272a',
  zinc900: '#18181b',
  white: '#ffffff',
  black: '#000000',
  red500: '#ef4444',
  green500: '#22c55e',
};

// System font stack (matches Geist fallback)
const fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export function ForgotPassword(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setIsSuccess(true);
    } catch (err) {
      // Always show success to prevent email enumeration attacks
      // Backend also returns success for non-existent emails
      if (err instanceof ApiError && err.statusCode === 400) {
        setError(err.message);
      } else {
        // For any other error, still show success (security best practice)
        setIsSuccess(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', fontFamily }}>
      {/* Full-page background image */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/branding/login-bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 0,
        }}
      />

      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '48px 24px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* Logo */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <img
              src="/branding/logos/armor-dash-white-logo.svg"
              alt="Armor"
              style={{ margin: '0 auto', height: '44px', width: 'auto' }}
            />
          </div>

          {/* Card */}
          <div
            style={{
              backgroundColor: 'rgba(10, 10, 16, 0.95)',
              backdropFilter: 'blur(12px)',
              borderRadius: '12px',
              border: `1px solid ${colors.zinc700}`,
              padding: '32px',
            }}
          >
            {isSuccess ? (
              // Success State
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    margin: '0 auto 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '50%',
                  }}
                >
                  <CheckCircle size={32} color={colors.green500} />
                </div>
                <h2
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: colors.white,
                    margin: '0 0 12px 0',
                  }}
                >
                  Check Your Email
                </h2>
                <p style={{ color: colors.zinc400, margin: '0 0 24px 0', fontSize: '14px', lineHeight: 1.6 }}>
                  If an account exists for <strong style={{ color: colors.white }}>{email}</strong>,
                  you will receive a password reset link shortly.
                </p>
                <p style={{ color: colors.zinc500, margin: '0 0 24px 0', fontSize: '13px' }}>
                  The link will expire in 1 hour.
                </p>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    backgroundColor: colors.white,
                    color: colors.zinc900,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <ArrowLeft size={16} />
                  Back to Sign In
                </Link>
              </div>
            ) : (
              // Form State
              <>
                <div style={{ marginBottom: '24px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      margin: '0 auto 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(251, 191, 36, 0.1)',
                      borderRadius: '10px',
                    }}
                  >
                    <Mail size={24} color={colors.amber400} />
                  </div>
                  <h2
                    style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      color: colors.white,
                      margin: '0 0 8px 0',
                      textAlign: 'center',
                    }}
                  >
                    Forgot Password?
                  </h2>
                  <p style={{ color: colors.zinc400, margin: 0, fontSize: '14px', textAlign: 'center' }}>
                    Enter your email and we'll send you a reset link
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div
                    style={{
                      padding: '12px',
                      marginBottom: '16px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                    }}
                  >
                    <p style={{ fontSize: '13px', color: colors.red500, margin: 0 }}>{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label
                      htmlFor="email"
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: colors.white,
                        marginBottom: '6px',
                      }}
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: colors.zinc800,
                        border: `1px solid ${colors.zinc700}`,
                        borderRadius: '6px',
                        color: colors.white,
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily,
                      }}
                      placeholder="you@company.com"
                      required
                      autoFocus
                      onFocus={(e) => {
                        e.target.style.borderColor = colors.amber500;
                        e.target.style.boxShadow = `0 0 0 2px rgba(245, 158, 11, 0.15)`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = colors.zinc700;
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: colors.white,
                      color: colors.zinc900,
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'opacity 0.15s',
                      fontFamily,
                    }}
                    onMouseEnter={(e) => !isLoading && (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={(e) => !isLoading && (e.currentTarget.style.opacity = '1')}
                  >
                    {isLoading ? (
                      <>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid rgba(24, 24, 27, 0.3)',
                            borderTopColor: colors.zinc900,
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                          }}
                        />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <Link
                    to="/login"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      color: colors.zinc400,
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = colors.amber500)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = colors.zinc400)}
                  >
                    <ArrowLeft size={14} />
                    Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Security Badge */}
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: colors.zinc500 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Shield size={14} />
              <span>Secure password reset - link expires in 1 hour</span>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframes for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
