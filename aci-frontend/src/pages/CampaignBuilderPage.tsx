/**
 * CampaignBuilderPage
 *
 * Wrapper page for the multi-step campaign creation wizard.
 *
 * Features:
 * - Back navigation to campaign list
 * - CampaignBuilder wizard component
 * - Success redirect to campaign detail
 *
 * @example
 * ```tsx
 * <Route path="/campaigns/new" element={<CampaignBuilderPage />} />
 * ```
 */

import { type ReactElement, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CampaignBuilder, type CampaignFormData } from '@/components/marketing/campaign/CampaignBuilder';
import { useCampaignMutations } from '@/hooks/useCampaignMutations';

// ============================================================================
// Component
// ============================================================================

export function CampaignBuilderPage(): ReactElement {
  const navigate = useNavigate();
  const { create } = useCampaignMutations();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleBack = useCallback((): void => {
    navigate('/campaigns');
  }, [navigate]);

  const handleSubmit = useCallback(
    async (data: CampaignFormData): Promise<void> => {
      if (!data.goal || !data.frequency || !data.contentStyle) {
        toast.error('Missing required fields');
        return;
      }

      try {
        const response = await create.mutateAsync({
          name: data.name,
          goal: data.goal,
          channels: data.channels as Array<'linkedin' | 'twitter' | 'blog' | 'email' | 'facebook' | 'instagram'>,
          frequency: data.frequency,
          content_style: data.contentStyle as 'thought_leadership' | 'product_focused' | 'industry_news' | 'educational' | 'promotional',
        });

        toast.success('Campaign Created', {
          description: 'Your campaign has been created successfully',
        });

        // Navigate to the created campaign
        if (response && typeof response === 'object' && 'id' in response) {
          navigate(`/campaigns/${(response as { id: string }).id}`);
        } else {
          navigate('/campaigns');
        }
      } catch (error) {
        toast.error('Failed to create campaign', {
          description: error instanceof Error ? error.message : 'An error occurred',
        });
      }
    },
    [create, navigate]
  );

  const handleCancel = useCallback((): void => {
    navigate('/campaigns');
  }, [navigate]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-background)',
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: `var(--border-width-thin) solid var(--color-border-default)`,
          padding: 'var(--spacing-6)',
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-4)',
            }}
          >
            <Button
              onClick={handleBack}
              variant="ghost"
              size="sm"
              aria-label="Back to campaigns"
            >
              <ArrowLeft
                style={{
                  width: 'var(--spacing-4)',
                  height: 'var(--spacing-4)',
                }}
              />
            </Button>
            <div>
              <h1
                style={{
                  fontSize: 'var(--typography-font-size-2xl)',
                  fontWeight: 'var(--typography-font-weight-bold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-1)',
                }}
              >
                Create Campaign
              </h1>
              <p
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Set up a new marketing automation campaign
              </p>
            </div>
          </div>

          {/* Breadcrumb */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
              marginTop: 'var(--spacing-4)',
              fontSize: 'var(--typography-font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <button
              onClick={handleBack}
              className="hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                color: 'var(--color-text-secondary)',
              }}
              aria-label="Go to Campaigns"
            >
              Campaigns
            </button>
            <span>&gt;</span>
            <span
              style={{
                color: 'var(--color-text-primary)',
                fontWeight: 'var(--typography-font-weight-medium)',
              }}
            >
              New Campaign
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          padding: 'var(--spacing-6)',
        }}
      >
        <div className="max-w-4xl mx-auto">
          <CampaignBuilder onSubmit={handleSubmit} onCancel={handleCancel} />
        </div>
      </main>
    </div>
  );
}

CampaignBuilderPage.displayName = 'CampaignBuilderPage';
