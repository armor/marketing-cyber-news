/**
 * CalendarPage Component
 *
 * Content calendar page showing all scheduled newsletter issues.
 * Wraps CalendarView with filters and header.
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { CalendarView } from '@/components/marketing/calendar/CalendarView';
import { CalendarFilters } from '@/components/marketing/calendar/CalendarFilters';
import type { IssueStatus } from '@/types/newsletter';
import { useNewsletterConfigs } from '@/hooks/useNewsletterConfigs';
import { useNavigate } from 'react-router-dom';

export function CalendarPage() {
  const navigate = useNavigate();

  // Filter state
  const [selectedStatuses, setSelectedStatuses] = useState<IssueStatus[]>([
    'scheduled',
    'approved',
  ]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>();

  // Fetch configurations for filter
  const { data: configurationsData } = useNewsletterConfigs({
    page: 1,
    pageSize: 100,
  });

  const configurations =
    configurationsData?.data.map((config) => ({
      id: config.id,
      name: config.name,
    })) || [];

  return (
    <div className="flex flex-col h-full">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Calendar' },
        ]}
        title="Content Calendar"
        description="View and manage your scheduled newsletter content"
        actions={
          <Button
            onClick={() => navigate('/newsletter/content')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
            }}
          >
            <Plus size={20} />
            Create Newsletter
          </Button>
        }
      >
        {/* Filters */}
        <CalendarFilters
          selectedStatuses={selectedStatuses}
          onStatusChange={setSelectedStatuses}
          selectedConfigId={selectedConfigId}
          onConfigChange={setSelectedConfigId}
          configurations={configurations}
        />
      </PageHeader>

      {/* Calendar */}
      <div
        className="flex-1 overflow-auto"
        style={{
          padding: 'var(--spacing-6)',
        }}
      >
        <CalendarView
          selectedStatuses={selectedStatuses}
          selectedConfigId={selectedConfigId}
        />
      </div>
    </div>
  );
}
