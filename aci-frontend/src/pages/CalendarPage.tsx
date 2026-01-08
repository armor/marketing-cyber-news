/**
 * CalendarPage Component
 *
 * Content calendar page showing all scheduled newsletter issues.
 * Wraps CalendarView with filters and header.
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-bg-primary)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 'var(--spacing-6)',
          borderBottom: '1px solid var(--color-border-default)',
          backgroundColor: 'var(--color-bg-elevated)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-4)',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 'var(--typography-font-size-3xl)',
                fontWeight: 'var(--typography-font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-1)',
              }}
            >
              Content Calendar
            </h1>
            <p
              style={{
                fontSize: 'var(--typography-font-size-base)',
                color: 'var(--color-text-secondary)',
              }}
            >
              View and manage your scheduled newsletter content
            </p>
          </div>

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
        </div>

        {/* Filters */}
        <CalendarFilters
          selectedStatuses={selectedStatuses}
          onStatusChange={setSelectedStatuses}
          selectedConfigId={selectedConfigId}
          onConfigChange={setSelectedConfigId}
          configurations={configurations}
        />
      </div>

      {/* Calendar */}
      <div
        style={{
          flex: 1,
          padding: 'var(--spacing-6)',
          overflow: 'auto',
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
