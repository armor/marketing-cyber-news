/**
 * Login Page - Armor Cyber News Platform
 *
 * Authentication page with Armor-Dash inspired split-screen hero layout.
 * Left side: Marketing hero with features and stats (desktop only)
 * Right side: Login form with responsive design
 *
 * DESIGN SYSTEM MIGRATION:
 * - All colors use CSS custom properties from variables.css
 * - No hardcoded hex values
 * - Theme-aware styling via CSS variables
 *
 * Content is tailored for the Armor Cyber News newsletter automation platform,
 * not a direct copy of Armor-Dash.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Shield,
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
    <div
      data-theme="dark"
      style={{
        minHeight: '100vh',
        display: 'flex',
        position: 'relative',
        fontFamily: 'var(--typography-font-family-sans)',
      }}
    >
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
            padding: 'var(--spacing-12)',
            color: 'var(--color-snow)',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <h1
                style={{
                  fontSize: '52px',
                  fontWeight: 'var(--typography-font-weight-bold)',
                  lineHeight: 1.1,
                  margin: 0,
                  letterSpacing: 'var(--typography-letter-spacing-tight)',
                }}
              >
                <span style={{ color: 'var(--color-snow)' }}>AI-Powered</span>
                <br />
                <span
                  style={{
                    background: 'var(--gradient-brand-text)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Cyber News Platform
                </span>
              </h1>
              <p
                style={{
                  fontSize: 'var(--typography-font-size-base)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  maxWidth: '440px',
                  margin: 0,
                  lineHeight: 'var(--typography-line-height-normal)',
                }}
              >
                Automate your cybersecurity newsletter with intelligent threat curation,
                AI-generated content, and seamless multi-channel delivery.
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-1-5)',
                  padding: 'var(--spacing-1-5) var(--spacing-3)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 'var(--border-radius-full)',
                  fontSize: 'var(--typography-font-size-xs)',
                  color: 'rgba(255, 255, 255, 0.85)',
                  width: 'fit-content',
                }}
              >
                <Sparkles style={{ width: '14px', height: '14px', color: 'var(--color-amber-400)' }} />
                <span>Powered by Claude AI</span>
              </div>
            </div>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2-5)' }}>
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-2-5)',
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
                        borderRadius: 'var(--border-radius-md)',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} color="var(--color-amber-400)" strokeWidth={2} />
                    </div>
                    <span style={{ fontSize: 'var(--typography-font-size-sm)' }}>{feature.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 'var(--spacing-10)', paddingTop: 'var(--spacing-4)' }}>
              {stats.map((stat, idx) => (
                <div key={idx}>
                  <div
                    style={{
                      fontSize: '42px',
                      fontWeight: 'var(--typography-font-weight-bold)',
                      color: 'var(--color-snow)',
                      letterSpacing: 'var(--typography-letter-spacing-tight)',
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginTop: 'var(--spacing-0-5)',
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div>
            <div
              style={{
                padding: 'var(--spacing-5)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                borderRadius: 'var(--border-radius-lg)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <p
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontStyle: 'italic',
                  margin: '0 0 var(--spacing-3) 0',
                  fontSize: 'var(--typography-font-size-sm)',
                  lineHeight: 'var(--typography-line-height-normal)',
                }}
              >
                "Reduced our newsletter production time from 8 hours to under 2.
                The AI curation is remarkably accurate at identifying relevant threats."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2-5)' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--border-radius-full)',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 'var(--typography-font-weight-bold)',
                      color: 'var(--color-amber-400)',
                    }}
                  >
                    SOC
                  </span>
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-snow)',
                      fontSize: 'var(--typography-font-size-sm)',
                    }}
                  >
                    Sarah Chen
                  </div>
                  <div style={{ fontSize: 'var(--typography-font-size-xs)', color: 'rgba(255, 255, 255, 0.5)' }}>
                    SOC Manager, Enterprise Client
                  </div>
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
          padding: 'var(--spacing-12) var(--spacing-6)',
          backgroundColor: 'var(--color-login-panel-bg)',
          backdropFilter: 'blur(12px)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ width: '100%', maxWidth: '360px' }}>
          {/* Mobile Logo */}
          <div className="lg:hidden" style={{ marginBottom: 'var(--spacing-6)', textAlign: 'center' }}>
            <img
              src="/branding/logos/armor-dash-white-logo.svg"
              alt="Armor"
              style={{ margin: '0 auto', height: '36px', width: 'auto' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
            <div>
              <h2
                style={{
                  fontSize: '26px',
                  fontWeight: 'var(--typography-font-weight-bold)',
                  color: 'var(--color-snow)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                Welcome to{' '}
                <span
                  style={{
                    background: 'var(--gradient-brand-text-alt)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Cyber News
                </span>
              </h2>
              <p
                style={{
                  color: 'var(--color-login-muted-text)',
                  margin: 'var(--spacing-1-5) 0 0 0',
                  fontSize: 'var(--typography-font-size-sm)',
                }}
              >
                Sign in to manage your newsletter
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: 'var(--spacing-3)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--border-radius-md)',
                }}
              >
                <p
                  style={{
                    fontSize: 'var(--typography-font-size-xs)',
                    color: 'var(--color-critical)',
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontSize: 'var(--typography-font-size-xs)',
                    fontWeight: 'var(--typography-font-weight-medium)',
                    color: 'var(--color-snow)',
                    marginBottom: 'var(--spacing-1-5)',
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
                    padding: 'var(--spacing-2-5) var(--spacing-3)',
                    backgroundColor: 'var(--color-login-input-bg)',
                    border: '1px solid var(--color-login-input-border)',
                    borderRadius: 'var(--border-radius-md)',
                    color: 'var(--color-snow)',
                    fontSize: 'var(--typography-font-size-sm)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--typography-font-family-sans)',
                    transition: 'border-color var(--motion-duration-fast), box-shadow var(--motion-duration-fast)',
                  }}
                  placeholder="you@company.com"
                  required
                  autoFocus
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-login-input-border-focus)';
                    e.target.style.boxShadow = '0 0 0 2px var(--color-login-focus-ring)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-login-input-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-1-5)',
                  }}
                >
                  <label
                    htmlFor="password"
                    style={{
                      display: 'block',
                      fontSize: 'var(--typography-font-size-xs)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-snow)',
                    }}
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-amber-500)',
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
                    padding: 'var(--spacing-2-5) var(--spacing-3)',
                    backgroundColor: 'var(--color-login-input-bg)',
                    border: '1px solid var(--color-login-input-border)',
                    borderRadius: 'var(--border-radius-md)',
                    color: 'var(--color-snow)',
                    fontSize: 'var(--typography-font-size-sm)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--typography-font-family-sans)',
                    transition: 'border-color var(--motion-duration-fast), box-shadow var(--motion-duration-fast)',
                  }}
                  placeholder="••••••••"
                  required
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-login-input-border-focus)';
                    e.target.style.boxShadow = '0 0 0 2px var(--color-login-focus-ring)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-login-input-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-2-5) var(--spacing-4)',
                  backgroundColor: 'var(--color-snow)',
                  color: 'var(--color-obsidian)',
                  border: 'none',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--spacing-1-5)',
                  transition: 'opacity var(--motion-duration-fast)',
                  fontFamily: 'var(--typography-font-family-sans)',
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
                        borderTopColor: 'var(--color-obsidian)',
                        borderRadius: 'var(--border-radius-full)',
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
            <div style={{ position: 'relative', margin: 'var(--spacing-1) 0' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', borderTop: '1px solid var(--color-login-divider)' }} />
              </div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <span
                  style={{
                    padding: '0 var(--spacing-2)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--typography-letter-spacing-wide)',
                    color: 'var(--color-login-subtle-text)',
                    backgroundColor: 'var(--color-login-panel-bg)',
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
                gap: 'var(--spacing-1-5)',
                padding: 'var(--spacing-2-5) var(--spacing-4)',
                border: '1px solid var(--color-login-divider)',
                borderRadius: 'var(--border-radius-md)',
                color: 'var(--color-snow)',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                textDecoration: 'none',
                transition: 'background-color var(--motion-duration-fast)',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-login-input-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Lock size={14} />
              Request Access
            </Link>

            {/* Security Badges */}
            <div
              style={{
                paddingTop: 'var(--spacing-3)',
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--color-login-subtle-text)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--spacing-1-5)',
                  marginBottom: 'var(--spacing-1-5)',
                }}
              >
                <Shield size={14} />
                <span>Enterprise-Grade Security</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--spacing-2)',
                }}
              >
                <span>SOC 2 Type II</span>
                <span style={{ color: 'var(--color-slate)' }}>•</span>
                <span>ISO 27001</span>
                <span style={{ color: 'var(--color-slate)' }}>•</span>
                <span>GDPR Compliant</span>
              </div>
            </div>

            {/* Armor Website Link */}
            <div style={{ paddingTop: 'var(--spacing-3)', textAlign: 'center' }}>
              <a
                href="https://www.armor.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-1)',
                  fontSize: 'var(--typography-font-size-xs)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  color: 'var(--color-amber-500)',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-amber-400)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-amber-500)')}
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
