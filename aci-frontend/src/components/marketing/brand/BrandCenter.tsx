/**
 * BrandCenter Component
 *
 * Main brand center dashboard with health overview, quick actions, and section tabs.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { useBrandVoice } from '@/hooks/useBrandStore';
import { BrandHealthScore } from './BrandHealthScore';
import { AssetUploader } from './AssetUploader';
import { ContentTrainer } from './ContentTrainer';
import { TerminologyEditor } from './TerminologyEditor';
import { StrictnessSlider } from './StrictnessSlider';
import { FileText, Sparkles, BookOpen, Settings, Upload } from 'lucide-react';
import type { TabItem } from '@/components/ui/tabs';

// ============================================================================
// Types
// ============================================================================

export interface BrandCenterProps {
  readonly brandVoiceId: string;
}

// ============================================================================
// Component
// ============================================================================

export function BrandCenter({ brandVoiceId }: BrandCenterProps) {
  const { data: brandVoice, isLoading, isError } = useBrandVoice({ id: brandVoiceId });

  if (isLoading) {
    return (
      <div
        style={{
          padding: 'var(--spacing-8)',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        Loading brand center...
      </div>
    );
  }

  if (isError || !brandVoice) {
    return (
      <div
        style={{
          padding: 'var(--spacing-8)',
          textAlign: 'center',
          color: 'var(--color-semantic-error)',
        }}
      >
        Failed to load brand voice data
      </div>
    );
  }

  const tabs: readonly TabItem[] = [
    {
      id: 'voice',
      label: 'Voice Training',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
          <ContentTrainer brandVoiceId={brandVoiceId} />
          <AssetUploader brandVoiceId={brandVoiceId} />
        </div>
      ),
    },
    {
      id: 'terminology',
      label: 'Terminology',
      content: (
        <TerminologyEditor
          brandVoiceId={brandVoiceId}
          approvedTerms={brandVoice.approved_terms}
          bannedTerms={brandVoice.banned_terms}
        />
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      content: (
        <StrictnessSlider
          brandVoiceId={brandVoiceId}
          initialStrictness={brandVoice.strictness_level}
          initialAutoCorrect={brandVoice.auto_correct_enabled}
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: 'var(--typography-font-size-4xl)',
            fontWeight: 'var(--typography-font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-2)',
            fontFamily: 'var(--typography-font-family-display)',
          }}
        >
          {brandVoice.name}
        </h1>
        {brandVoice.description && (
          <p
            style={{
              fontSize: 'var(--typography-font-size-lg)',
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--typography-line-height-relaxed)',
            }}
          >
            {brandVoice.description}
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--spacing-4)',
        }}
      >
        <Card>
          <CardContent style={{ padding: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
              <div
                style={{
                  width: 'var(--spacing-12)',
                  height: 'var(--spacing-12)',
                  borderRadius: 'var(--border-radius-lg)',
                  background: 'var(--gradient-icon-neutral)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={24} style={{ color: 'var(--color-brand-primary)' }} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 'var(--typography-font-size-2xl)',
                    fontWeight: 'var(--typography-font-weight-bold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {brandVoice.total_documents}
                </div>
                <div
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Documents
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
              <div
                style={{
                  width: 'var(--spacing-12)',
                  height: 'var(--spacing-12)',
                  borderRadius: 'var(--border-radius-lg)',
                  background: 'var(--gradient-icon-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={24} style={{ color: 'var(--color-semantic-success)' }} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 'var(--typography-font-size-2xl)',
                    fontWeight: 'var(--typography-font-weight-bold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {brandVoice.total_examples}
                </div>
                <div
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Examples
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
              <div
                style={{
                  width: 'var(--spacing-12)',
                  height: 'var(--spacing-12)',
                  borderRadius: 'var(--border-radius-lg)',
                  background: 'var(--gradient-icon-neutral)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BookOpen size={24} style={{ color: 'var(--color-brand-primary)' }} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 'var(--typography-font-size-2xl)',
                    fontWeight: 'var(--typography-font-weight-bold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {brandVoice.approved_terms.length + brandVoice.banned_terms.length}
                </div>
                <div
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Terms
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 'var(--spacing-6)',
        }}
      >
        {/* Left Column - Health Score */}
        <div>
          <BrandHealthScore brandVoiceId={brandVoiceId} overallScore={brandVoice.health_score} />
        </div>

        {/* Right Column - Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for managing your brand voice</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
              <Button variant="primary" size="lg" style={{ justifyContent: 'flex-start' }}>
                <Upload size={20} />
                Upload Brand Guidelines
              </Button>
              <Button variant="secondary" size="lg" style={{ justifyContent: 'flex-start' }}>
                <Sparkles size={20} />
                Add Content Example
              </Button>
              <Button variant="secondary" size="lg" style={{ justifyContent: 'flex-start' }}>
                <BookOpen size={20} />
                Manage Terminology
              </Button>
              <Button variant="secondary" size="lg" style={{ justifyContent: 'flex-start' }}>
                <Settings size={20} />
                Adjust Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Sections */}
      <div style={{ marginTop: 'var(--spacing-6)' }}>
        <Tabs tabs={tabs} defaultTab="voice" />
      </div>
    </div>
  );
}
