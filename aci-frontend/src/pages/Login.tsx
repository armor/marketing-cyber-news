/**
 * Login Page - Armor Cyber News Platform
 *
 * Authentication page with Armor-Dash inspired split-screen hero layout.
 * Left side: Marketing hero with features and stats (desktop only)
 * Right side: Login form with responsive design
 *
 * Content is tailored for the Armor Cyber News newsletter automation platform,
 * not a direct copy of Armor-Dash.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Shield,
  TrendingUp,
  Zap,
  Lock,
  ArrowRight,
  Sparkles,
  Newspaper,
  Bot,
  CheckCircle,
  Send,
  BarChart3,
  ExternalLink,
  Mail,
} from 'lucide-react';

// Armor-Dash color palette
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
};

// System font stack (matches Geist fallback)
const fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// Features specific to Armor Cyber News platform
const features = [
  { icon: Newspaper, text: 'Curated Threat Intelligence Feed' },
  { icon: Bot, text: 'AI-Powered Content Generation' },
  { icon: CheckCircle, text: 'Human-in-the-Loop Approval Workflow' },
  { icon: Send, text: 'Multi-Channel Newsletter Delivery' },
  { icon: BarChart3, text: 'Engagement Analytics & Tracking' },
  { icon: Zap, text: 'Real-Time Threat Alerts' },
  { icon: Mail, text: 'Email, HubSpot & Mailchimp Integration' },
];

// Platform stats
const stats = [
  { value: '500+', label: 'Articles/Month' },
  { value: '50K+', label: 'Subscribers' },
  { value: '< 2hrs', label: 'Time to Publish' },
];

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

      {/* Left Side - Marketing Hero (hidden on mobile) */}
      <div
        className="hidden lg:flex"
        style={{
          width: '60%',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* Dark overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1,
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px',
            color: colors.white,
            width: '100%',
          }}
        >
          {/* Logo */}
          <div>
            <img
              src="/branding/logos/armor-dash-white-logo.svg"
              alt="Armor"
              style={{ height: '52px', width: 'auto' }}
            />
          </div>

          {/* Main Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h1 style={{ fontSize: '52px', fontWeight: 700, lineHeight: 1.1, margin: 0, letterSpacing: '-0.02em' }}>
                <span style={{ color: colors.white }}>AI-Powered</span>
                <br />
                <span
                  style={{
                    background: `linear-gradient(to right, ${colors.orange400}, ${colors.amber400})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Cyber News Platform
                </span>
              </h1>
              <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.7)', maxWidth: '440px', margin: 0, lineHeight: 1.5 }}>
                Automate your cybersecurity newsletter with intelligent threat curation,
                AI-generated content, and seamless multi-channel delivery.
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.85)',
                  width: 'fit-content',
                }}
              >
                <Sparkles style={{ width: '14px', height: '14px', color: colors.amber400 }} />
                <span>Powered by Claude AI</span>
              </div>
            </div>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: 'rgba(255, 255, 255, 0.9)',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} color={colors.amber400} strokeWidth={2} />
                    </div>
                    <span style={{ fontSize: '14px' }}>{feature.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '40px', paddingTop: '16px' }}>
              {stats.map((stat, idx) => (
                <div key={idx}>
                  <div style={{ fontSize: '42px', fontWeight: 800, color: colors.white, letterSpacing: '-0.02em' }}>{stat.value}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div>
            <div
              style={{
                padding: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontStyle: 'italic', margin: '0 0 12px 0', fontSize: '14px', lineHeight: 1.5 }}>
                "Reduced our newsletter production time from 8 hours to under 2.
                The AI curation is remarkably accurate at identifying relevant threats."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    border: `1px solid rgba(251, 191, 36, 0.4)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, color: colors.amber400 }}>SOC</span>
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: colors.white, fontSize: '14px' }}>Sarah Chen</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>SOC Manager, Enterprise Client</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div
        className="w-full lg:w-2/5"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          backgroundColor: 'rgba(10, 10, 16, 0.95)',
          backdropFilter: 'blur(12px)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ width: '100%', maxWidth: '360px' }}>
          {/* Mobile Logo */}
          <div className="lg:hidden" style={{ marginBottom: '24px', textAlign: 'center' }}>
            <img
              src="/branding/logos/armor-dash-white-logo.svg"
              alt="Armor"
              style={{ margin: '0 auto', height: '36px', width: 'auto' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '26px', fontWeight: 700, color: colors.white, margin: 0, letterSpacing: '-0.01em' }}>
                Welcome to{' '}
                <span
                  style={{
                    background: `linear-gradient(to right, ${colors.orange500}, ${colors.amber500})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Cyber News
                </span>
              </h2>
              <p style={{ color: colors.zinc400, margin: '6px 0 0 0', fontSize: '14px' }}>
                Sign in to manage your newsletter
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: '12px',
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

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label
                    htmlFor="password"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: colors.white,
                    }}
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    style={{
                      fontSize: '13px',
                      color: colors.amber500,
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  placeholder="••••••••"
                  required
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
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div style={{ position: 'relative', margin: '4px 0' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', borderTop: `1px solid ${colors.zinc700}` }} />
              </div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <span
                  style={{
                    padding: '0 8px',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: colors.zinc500,
                    backgroundColor: 'rgba(10, 10, 16, 0.95)',
                  }}
                >
                  New to Armor?
                </span>
              </div>
            </div>

            {/* Register CTA */}
            <Link
              to="/register"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 16px',
                border: `1px solid ${colors.zinc700}`,
                borderRadius: '6px',
                color: colors.white,
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background-color 0.15s',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.zinc800)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Lock size={14} />
              Request Access
            </Link>

            {/* Security Badges */}
            <div style={{ paddingTop: '12px', textAlign: 'center', fontSize: '11px', color: colors.zinc500 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '6px' }}>
                <Shield size={14} />
                <span>Enterprise-Grade Security</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>SOC 2 Type II</span>
                <span style={{ color: colors.zinc600 }}>•</span>
                <span>ISO 27001</span>
                <span style={{ color: colors.zinc600 }}>•</span>
                <span>GDPR Compliant</span>
              </div>
            </div>

            {/* Armor Website Link */}
            <div style={{ paddingTop: '12px', textAlign: 'center' }}>
              <a
                href="https://www.armor.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: colors.amber500,
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = colors.amber400)}
                onMouseLeave={(e) => (e.currentTarget.style.color = colors.amber500)}
              >
                Visit Armor.com
                <ExternalLink size={12} />
              </a>
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
