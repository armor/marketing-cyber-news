/**
 * CompetitorMonitor.tsx - Main Competitor Monitoring Dashboard
 *
 * Main dashboard component that combines all competitor monitoring features:
 * - Competitor list with add/remove functionality
 * - Recent alerts
 * - Content feed from selected competitor
 * - Analysis and insights
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompetitorList } from './CompetitorList';
import { CompetitorAlerts } from './CompetitorAlerts';
import { CompetitorContentFeed } from './CompetitorContentFeed';
import { CompetitorInsights } from './CompetitorInsights';
import { useCompetitors, useCompetitorContent, useCompetitorAnalysis, useCompetitorAlerts, useCompetitorMutations } from '../../../hooks/useCompetitors';
import type { CompetitorProfile, AddCompetitorRequest } from '../../../types/marketing';

interface CompetitorMonitorProps {
  campaignId: string;
}

export function CompetitorMonitor({ campaignId }: CompetitorMonitorProps) {
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorProfile | null>(null);

  // Queries
  const { data: competitorsData, isLoading: competitorsLoading } = useCompetitors(campaignId);
  const { data: alertsData, isLoading: alertsLoading } = useCompetitorAlerts(campaignId);
  const { data: contentData, isLoading: contentLoading } = useCompetitorContent(
    campaignId,
    selectedCompetitor?.id
  );
  const { data: analysisData, isLoading: analysisLoading } = useCompetitorAnalysis(
    campaignId,
    selectedCompetitor?.id
  );

  // Mutations
  const { addMutation, removeMutation, fetchMutation, markReadMutation } = useCompetitorMutations(campaignId);

  const competitors = competitorsData ?? [];
  const alerts = alertsData ?? [];
  const content = contentData ?? [];

  const handleAddCompetitor = async (request: AddCompetitorRequest) => {
    await addMutation.mutateAsync(request);
  };

  const handleRemoveCompetitor = async (competitor: CompetitorProfile) => {
    if (confirm(`Are you sure you want to remove "${competitor.name}" from monitoring?`)) {
      await removeMutation.mutateAsync(competitor.id);
      if (selectedCompetitor?.id === competitor.id) {
        setSelectedCompetitor(null);
      }
    }
  };

  const handleRefreshCompetitor = async (competitor: CompetitorProfile) => {
    await fetchMutation.mutateAsync(competitor.id);
  };

  const handleViewDetails = (competitor: CompetitorProfile) => {
    setSelectedCompetitor(competitor);
  };

  const handleMarkAlertRead = async (alertId: string) => {
    await markReadMutation.mutateAsync(alertId);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-6)',
      }}
    >
      {/* Header */}
      <div>
        <h2
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          Competitor Monitoring
        </h2>
        <p
          style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text-muted)',
          }}
        >
          Track competitor content, analyze posting patterns, and get alerts on new activity
        </p>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <CompetitorAlerts
          alerts={alerts}
          isLoading={alertsLoading}
          onMarkRead={handleMarkAlertRead}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="competitors" className="w-full">
        <TabsList>
          <TabsTrigger value="competitors">
            Competitors ({competitors.length})
          </TabsTrigger>
          {selectedCompetitor && (
            <>
              <TabsTrigger value="content">
                Content
              </TabsTrigger>
              <TabsTrigger value="insights">
                Insights
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="competitors" style={{ marginTop: 'var(--spacing-6)' }}>
          <CompetitorList
            campaignId={campaignId}
            competitors={competitors}
            isLoading={competitorsLoading}
            onAdd={handleAddCompetitor}
            onRefresh={handleRefreshCompetitor}
            onRemove={handleRemoveCompetitor}
            onViewDetails={handleViewDetails}
            isAddingLoading={addMutation.isPending}
          />
        </TabsContent>

        {selectedCompetitor && (
          <>
            <TabsContent value="content" style={{ marginTop: 'var(--spacing-6)' }}>
              <div>
                <h3
                  style={{
                    fontSize: 'var(--font-size-xl)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--spacing-4)',
                  }}
                >
                  Recent Content from {selectedCompetitor.name}
                </h3>
                <CompetitorContentFeed
                  content={content}
                  isLoading={contentLoading}
                />
              </div>
            </TabsContent>

            <TabsContent value="insights" style={{ marginTop: 'var(--spacing-6)' }}>
              <CompetitorInsights
                analysis={analysisData}
                isLoading={analysisLoading}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
