/**
 * StrictnessSlider Component
 *
 * Settings component for brand voice strictness level and auto-correct toggle.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useUpdateBrandSettings } from '@/hooks/useBrandMutations';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface StrictnessSliderProps {
  readonly brandVoiceId: string;
  readonly initialStrictness: number;
  readonly initialAutoCorrect: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function getStrictnessLevel(value: number): {
  label: string;
  description: string;
  color: string;
  icon: typeof Shield;
} {
  if (value >= 80) {
    return {
      label: 'Very Strict',
      description: 'Block any content that deviates from brand voice',
      color: 'var(--color-semantic-error)',
      icon: ShieldAlert,
    };
  }
  if (value >= 60) {
    return {
      label: 'Strict',
      description: 'Flag major deviations, allow minor variations',
      color: 'var(--color-warning)',
      icon: ShieldCheck,
    };
  }
  if (value >= 40) {
    return {
      label: 'Moderate',
      description: 'Suggest improvements, allow creative freedom',
      color: 'var(--color-brand-primary)',
      icon: Shield,
    };
  }
  return {
    label: 'Lenient',
    description: 'Minimal enforcement, mostly suggestions',
    color: 'var(--color-semantic-success)',
    icon: Shield,
  };
}

// ============================================================================
// Component
// ============================================================================

export function StrictnessSlider({
  brandVoiceId,
  initialStrictness,
  initialAutoCorrect,
}: StrictnessSliderProps) {
  const [strictness, setStrictness] = useState(initialStrictness);
  const [autoCorrect, setAutoCorrect] = useState(initialAutoCorrect);
  const [hasChanges, setHasChanges] = useState(false);

  const updateMutation = useUpdateBrandSettings();

  useEffect(() => {
    const changed =
      strictness !== initialStrictness || autoCorrect !== initialAutoCorrect;
    setHasChanges(changed);
  }, [strictness, autoCorrect, initialStrictness, initialAutoCorrect]);

  const handleSave = () => {
    updateMutation.mutate({
      brandVoiceId,
      request: {
        strictness_level: strictness,
        auto_correct_enabled: autoCorrect,
      },
    });
    setHasChanges(false);
  };

  const level = getStrictnessLevel(strictness);
  const IconComponent = level.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enforcement Settings</CardTitle>
        <CardDescription>
          Control how strictly the brand voice is enforced in generated content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
          {/* Strictness Level Display */}
          <div
            style={{
              padding: 'var(--spacing-5)',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--border-radius-lg)',
              border: `var(--border-width-thin) solid var(--color-border-default)`,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-4)',
            }}
          >
            <IconComponent size={32} style={{ color: level.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 'var(--typography-font-size-lg)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  color: level.color,
                  marginBottom: 'var(--spacing-1)',
                }}
              >
                {level.label}
              </div>
              <div
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {level.description}
              </div>
            </div>
            <div
              style={{
                fontSize: 'var(--typography-font-size-3xl)',
                fontWeight: 'var(--typography-font-weight-bold)',
                color: level.color,
                minWidth: '64px',
                textAlign: 'right',
              }}
            >
              {strictness}%
            </div>
          </div>

          {/* Strictness Slider */}
          <div>
            <Label htmlFor="strictness-slider">Strictness Level</Label>
            <input
              id="strictness-slider"
              type="range"
              min="0"
              max="100"
              step="5"
              value={strictness}
              onChange={(e) => setStrictness(Number(e.target.value))}
              style={{
                width: '100%',
                height: 'var(--spacing-3)',
                borderRadius: 'var(--border-radius-full)',
                outline: 'none',
                appearance: 'none',
                background: `linear-gradient(to right,
                  var(--color-semantic-success) 0%,
                  var(--color-brand-primary) 40%,
                  var(--color-warning) 60%,
                  var(--color-semantic-error) 80%,
                  var(--color-semantic-error) 100%)`,
                cursor: 'pointer',
                marginTop: 'var(--spacing-3)',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 'var(--spacing-2)',
                fontSize: 'var(--typography-font-size-xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>Lenient (0%)</span>
              <span>Moderate (50%)</span>
              <span>Strict (100%)</span>
            </div>
          </div>

          {/* Auto-Correct Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--spacing-4)',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--border-radius-lg)',
              border: `var(--border-width-thin) solid var(--color-border-default)`,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 'var(--typography-font-size-base)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-1)',
                }}
              >
                Auto-Correct
              </div>
              <div
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Automatically replace banned terms with approved alternatives
              </div>
            </div>
            <label
              style={{
                position: 'relative',
                display: 'inline-block',
                width: '52px',
                height: '28px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={autoCorrect}
                onChange={(e) => setAutoCorrect(e.target.checked)}
                style={{
                  opacity: 0,
                  width: 0,
                  height: 0,
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: autoCorrect
                    ? 'var(--color-brand-primary)'
                    : 'var(--color-border-default)',
                  borderRadius: 'var(--border-radius-full)',
                  transition: 'background-color var(--motion-duration-fast) var(--motion-easing-default)',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    content: '',
                    height: '20px',
                    width: '20px',
                    left: autoCorrect ? '28px' : '4px',
                    bottom: '4px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: 'left var(--motion-duration-fast) var(--motion-easing-default)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                />
              </span>
            </label>
          </div>

          {/* Preview of Strictness Effect */}
          <div
            style={{
              padding: 'var(--spacing-4)',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--border-radius-lg)',
              borderLeft: `var(--border-width-thick) solid ${level.color}`,
            }}
          >
            <div
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-semibold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              What this means
            </div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-1)',
              }}
            >
              {strictness >= 80 && (
                <>
                  <li
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      paddingLeft: 'var(--spacing-5)',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: level.color }}>•</span>
                    Content must match brand voice exactly
                  </li>
                  <li
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      paddingLeft: 'var(--spacing-5)',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: level.color }}>•</span>
                    All banned terms are blocked
                  </li>
                  <li
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      paddingLeft: 'var(--spacing-5)',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: level.color }}>•</span>
                    Minimal creative variations allowed
                  </li>
                </>
              )}
              {strictness >= 60 && strictness < 80 && (
                <>
                  <li
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      paddingLeft: 'var(--spacing-5)',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: level.color }}>•</span>
                    Major deviations flagged for review
                  </li>
                  <li
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      paddingLeft: 'var(--spacing-5)',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: level.color }}>•</span>
                    Banned terms are highlighted
                  </li>
                  <li
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      paddingLeft: 'var(--spacing-5)',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: level.color }}>•</span>
                    Some creative variations allowed
                  </li>
                </>
              )}
              {strictness >= 40 && strictness < 60 && (
                <>
                  <li
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      paddingLeft: 'var(--spacing-5)',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: level.color }}>•</span>
                    Suggestions provided, not enforced
                  </li>
                  <li
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      paddingLeft: 'var(--spacing-5)',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: level.color }}>•</span>
                    Creative freedom encouraged
                  </li>
                  <li
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      paddingLeft: 'var(--spacing-5)',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: level.color }}>•</span>
                    Banned terms shown as warnings
                  </li>
                </>
              )}
              {strictness < 40 && (
                <>
                  <li
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      paddingLeft: 'var(--spacing-5)',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: level.color }}>•</span>
                    Minimal brand voice enforcement
                  </li>
                  <li
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      paddingLeft: 'var(--spacing-5)',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: level.color }}>•</span>
                    Maximum creative flexibility
                  </li>
                  <li
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      paddingLeft: 'var(--spacing-5)',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: level.color }}>•</span>
                    Only severe violations flagged
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div
              style={{
                padding: 'var(--spacing-4)',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--border-radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: 'var(--typography-font-size-sm)', color: 'var(--color-text-secondary)' }}>
                You have unsaved changes
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                style={{
                  padding: 'var(--spacing-2) var(--spacing-4)',
                  backgroundColor: 'var(--color-brand-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: updateMutation.isPending ? 0.6 : 1,
                  transition: 'all var(--motion-duration-fast) var(--motion-easing-default)',
                }}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
