/* eslint-disable react-refresh/only-export-components */
/**
 * EXAMPLE_USAGE.tsx - Example usage of Campaign components
 *
 * This file demonstrates how to integrate the campaign components
 * in a real page with state management and API calls.
 *
 * NOTE: This is an example file for reference only.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CampaignBuilder,
  CampaignList,
  type Campaign,
  type CampaignFormData,
} from './index';

// ============================================================================
// Example 1: Campaign List Page
// ============================================================================

/**
 * Page showing all campaigns with CRUD operations
 */
export function CampaignsPage() {
  const [showBuilder, setShowBuilder] = useState(false);
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const response = await fetch('/api/campaigns');
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      return response.json() as Promise<Campaign[]>;
    },
  });

  // Create campaign mutation
  const createMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create campaign');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setShowBuilder(false);
    },
  });

  // Pause campaign mutation
  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/campaigns/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      });
      if (!response.ok) throw new Error('Failed to pause campaign');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  // Resume campaign mutation
  const resumeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/campaigns/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!response.ok) throw new Error('Failed to resume campaign');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  // Delete campaign mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete campaign');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  if (showBuilder) {
    return (
      <div style={{ padding: 'var(--spacing-6)' }}>
        <CampaignBuilder
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowBuilder(false)}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-6)' }}>
      <h1
        style={{
          fontSize: 'var(--typography-font-size-3xl)',
          fontWeight: 'var(--typography-font-weight-bold)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--spacing-6)',
        }}
      >
        Marketing Campaigns
      </h1>

      <CampaignList
        campaigns={campaigns ?? []}
        isLoading={isLoading}
        onCreateCampaign={() => setShowBuilder(true)}
        onEditCampaign={(campaign) => {
          console.log('Edit campaign:', campaign);
          // Navigate to edit page or open modal
        }}
        onPauseCampaign={(campaign) => pauseMutation.mutate(campaign.id)}
        onResumeCampaign={(campaign) => resumeMutation.mutate(campaign.id)}
        onDeleteCampaign={(campaign) => {
          if (confirm(`Delete campaign "${campaign.name}"?`)) {
            deleteMutation.mutate(campaign.id);
          }
        }}
      />
    </div>
  );
}

// ============================================================================
// Example 2: Standalone Campaign Builder (Modal or Separate Page)
// ============================================================================

/**
 * Page for creating a new campaign
 */
export function CreateCampaignPage() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create campaign');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      // Navigate to campaigns list
      // navigate('/campaigns');
    },
  });

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'var(--spacing-6)',
      }}
    >
      <CampaignBuilder
        onSubmit={(data) => createMutation.mutate(data)}
        onCancel={() => {
          // Navigate back
          // navigate('/campaigns');
        }}
      />
    </div>
  );
}

// ============================================================================
// Example 3: Edit Existing Campaign
// ============================================================================

/**
 * Page for editing an existing campaign
 */
export function EditCampaignPage({ campaignId }: { campaignId: string }) {
  const queryClient = useQueryClient();

  // Fetch existing campaign
  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaigns', campaignId],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');
      return response.json() as Promise<Campaign>;
    },
  });

  // Update campaign mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update campaign');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      // Navigate back to campaigns list
      // navigate('/campaigns');
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!campaign) {
    return <div>Campaign not found</div>;
  }

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'var(--spacing-6)',
      }}
    >
      <CampaignBuilder
        initialData={{
          name: campaign.name,
          goal: campaign.goal ?? null,
          channels: campaign.channels,
          frequency: campaign.frequency ?? null,
          contentStyle: campaign.contentStyle ?? null,
        }}
        onSubmit={(data) => updateMutation.mutate(data)}
        onCancel={() => {
          // Navigate back
          // navigate('/campaigns');
        }}
      />
    </div>
  );
}

// ============================================================================
// Example 4: Mock Data for Testing
// ============================================================================

/**
 * Mock campaigns for testing the UI
 */
export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    name: 'Q1 2025 Brand Awareness Campaign',
    goal: 'awareness',
    channels: ['linkedin', 'twitter'],
    frequency: 'weekly',
    contentStyle: 'thought-leadership',
    status: 'active',
    createdAt: '2024-12-01T00:00:00Z',
    nextPost: '2024-12-28T10:00:00Z',
    totalPosts: 12,
  },
  {
    id: '2',
    name: 'Product Launch Campaign',
    goal: 'leads',
    channels: ['linkedin', 'email'],
    frequency: 'biweekly',
    contentStyle: 'product-focused',
    status: 'active',
    createdAt: '2024-11-15T00:00:00Z',
    nextPost: '2024-12-29T14:00:00Z',
    totalPosts: 8,
  },
  {
    id: '3',
    name: 'Educational Content Series',
    goal: 'engagement',
    channels: ['twitter'],
    frequency: 'daily',
    contentStyle: 'educational',
    status: 'paused',
    createdAt: '2024-10-01T00:00:00Z',
    totalPosts: 45,
  },
  {
    id: '4',
    name: 'Holiday Promotions',
    goal: 'traffic',
    channels: ['linkedin', 'twitter', 'email'],
    frequency: 'daily',
    contentStyle: 'promotional',
    status: 'draft',
    createdAt: '2024-12-20T00:00:00Z',
    totalPosts: 0,
  },
];

/**
 * Component for testing with mock data (no API calls)
 */
export function CampaignsPageMock() {
  const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS);
  const [showBuilder, setShowBuilder] = useState(false);

  const handleCreate = (data: CampaignFormData) => {
    const newCampaign: Campaign = {
      id: String(campaigns.length + 1),
      name: data.name,
      channels: data.channels,
      goal: data.goal ?? 'awareness',
      frequency: data.frequency ?? 'weekly',
      contentStyle: data.contentStyle ?? 'educational',
      status: 'draft',
      createdAt: new Date().toISOString(),
      totalPosts: 0,
    };
    setCampaigns([...campaigns, newCampaign]);
    setShowBuilder(false);
  };

  const handlePause = (campaign: Campaign) => {
    setCampaigns(
      campaigns.map((c) =>
        c.id === campaign.id ? { ...c, status: 'paused' as const } : c
      )
    );
  };

  const handleResume = (campaign: Campaign) => {
    setCampaigns(
      campaigns.map((c) =>
        c.id === campaign.id ? { ...c, status: 'active' as const } : c
      )
    );
  };

  const handleDelete = (campaign: Campaign) => {
    if (confirm(`Delete campaign "${campaign.name}"?`)) {
      setCampaigns(campaigns.filter((c) => c.id !== campaign.id));
    }
  };

  if (showBuilder) {
    return (
      <div style={{ padding: 'var(--spacing-6)' }}>
        <CampaignBuilder
          onSubmit={handleCreate}
          onCancel={() => setShowBuilder(false)}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-6)' }}>
      <h1
        style={{
          fontSize: 'var(--typography-font-size-3xl)',
          fontWeight: 'var(--typography-font-weight-bold)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--spacing-6)',
        }}
      >
        Marketing Campaigns (Mock)
      </h1>

      <CampaignList
        campaigns={campaigns}
        onCreateCampaign={() => setShowBuilder(true)}
        onPauseCampaign={handlePause}
        onResumeCampaign={handleResume}
        onDeleteCampaign={handleDelete}
      />
    </div>
  );
}
