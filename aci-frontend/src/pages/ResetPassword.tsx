/**
 * Reset Password Page - Armor Cyber News Platform
 *
 * Complete password reset using a valid token from the URL.
 * Uses the same Armor-Dash inspired styling as the Login page.
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient, ApiError } from '@/services/api/client';
import {
  Shield,
  ArrowLeft,
  Lock,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
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

// Password validation rules
const passwordRules = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
];

export function ResetPassword(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirect to login after 5 seconds on success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  // Check if token is present
  if (!token) {
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
            <div
              style={{
                backgroundColor: 'rgba(10, 10, 16, 0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: `1px solid ${colors.zinc700}`,
                padding: '32px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '50%',
                }}
              >
                <AlertTriangle size={32} color={colors.red500} />
              </div>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: colors.white,
                  margin: '0 0 12px 0',
                }}
              >
                Invalid Reset Link
              </h2>
              <p style={{ color: colors.zinc400, margin: '0 0 24px 0', fontSize: '14px' }}>
                This password reset link is invalid or missing. Please request a new one.
              </p>
              <Link
                to="/forgot-password"
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
                }}
              >
                Request New Link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const failedRules = passwordRules.filter((rule) => !rule.test(password));
    if (failedRules.length > 0) {
      setError('Password does not meet requirements');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post('/auth/reset-password', {
        token,
        new_password: password,
      });
      setIsSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to reset password. Please try again.');
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
                  Password Reset Complete
                </h2>
                <p style={{ color: colors.zinc400, margin: '0 0 24px 0', fontSize: '14px', lineHeight: 1.6 }}>
                  Your password has been successfully reset. You will be redirected to the login page
                  in 5 seconds.
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
                  Sign In Now
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
                    <Lock size={24} color={colors.amber400} />
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
                    Set New Password
                  </h2>
                  <p style={{ color: colors.zinc400, margin: 0, fontSize: '14px', textAlign: 'center' }}>
                    Enter your new password below
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
                      htmlFor="password"
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: colors.white,
                        marginBottom: '6px',
                      }}
                    >
                      New Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 40px 10px 12px',
                          backgroundColor: colors.zinc800,
                          border: `1px solid ${colors.zinc700}`,
                          borderRadius: '6px',
                          color: colors.white,
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily,
                        }}
                        placeholder="Enter new password"
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
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {showPassword ? (
                          <EyeOff size={18} color={colors.zinc500} />
                        ) : (
                          <Eye size={18} color={colors.zinc500} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Password Requirements */}
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: `1px solid ${colors.zinc800}`,
                    }}
                  >
                    <p style={{ fontSize: '12px', color: colors.zinc500, margin: '0 0 8px 0' }}>
                      Password must have:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {passwordRules.map((rule) => {
                        const passed = rule.test(password);
                        return (
                          <div
                            key={rule.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              color: passed ? colors.green500 : colors.zinc500,
                            }}
                          >
                            <CheckCircle size={12} style={{ opacity: passed ? 1 : 0.3 }} />
                            {rule.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: colors.white,
                        marginBottom: '6px',
                      }}
                    >
                      Confirm Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 40px 10px 12px',
                          backgroundColor: colors.zinc800,
                          border: `1px solid ${
                            confirmPassword && password !== confirmPassword ? colors.red500 : colors.zinc700
                          }`,
                          borderRadius: '6px',
                          color: colors.white,
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily,
                        }}
                        placeholder="Confirm new password"
                        required
                        onFocus={(e) => {
                          if (!(confirmPassword && password !== confirmPassword)) {
                            e.target.style.borderColor = colors.amber500;
                            e.target.style.boxShadow = `0 0 0 2px rgba(245, 158, 11, 0.15)`;
                          }
                        }}
                        onBlur={(e) => {
                          if (!(confirmPassword && password !== confirmPassword)) {
                            e.target.style.borderColor = colors.zinc700;
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} color={colors.zinc500} />
                        ) : (
                          <Eye size={18} color={colors.zinc500} />
                        )}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p style={{ fontSize: '12px', color: colors.red500, margin: '4px 0 0 0' }}>
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || password !== confirmPassword}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: colors.white,
                      color: colors.zinc900,
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isLoading || password !== confirmPassword ? 'not-allowed' : 'pointer',
                      opacity: isLoading || password !== confirmPassword ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'opacity 0.15s',
                      fontFamily,
                    }}
                    onMouseEnter={(e) =>
                      !(isLoading || password !== confirmPassword) && (e.currentTarget.style.opacity = '0.9')
                    }
                    onMouseLeave={(e) =>
                      !(isLoading || password !== confirmPassword) && (e.currentTarget.style.opacity = '1')
                    }
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
                        Resetting...
                      </>
                    ) : (
                      'Reset Password'
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
              <span>Enterprise-Grade Security</span>
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
