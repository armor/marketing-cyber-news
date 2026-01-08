/**
 * CalendarFilters Component
 *
 * Filter controls for calendar view:
 * - Channel multi-select (Email/Newsletter)
 * - Status filter
 * - Configuration/campaign filter
 */

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { IssueStatus } from '@/types/newsletter';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

interface CalendarFiltersProps {
  selectedStatuses: IssueStatus[];
  onStatusChange: (statuses: IssueStatus[]) => void;
  selectedConfigId?: string;
  onConfigChange: (configId?: string) => void;
  configurations?: Array<{ id: string; name: string }>;
}

const STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
];

export function CalendarFilters({
  selectedStatuses,
  onStatusChange,
  selectedConfigId,
  onConfigChange,
  configurations = [],
}: CalendarFiltersProps) {
  const [open, setOpen] = useState(false);

  const handleStatusToggle = (status: IssueStatus) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    onStatusChange(newStatuses);
  };

  const handleClearFilters = () => {
    onStatusChange([]);
    onConfigChange(undefined);
  };

  const activeFilterCount =
    selectedStatuses.length + (selectedConfigId ? 1 : 0);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-2)',
      }}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
            }}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 var(--spacing-1)',
                  fontSize: 'var(--typography-font-size-xs)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  color: 'var(--color-bg-elevated)',
                  backgroundColor: 'var(--color-brand-primary)',
                  borderRadius: 'var(--border-radius-full)',
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          style={{
            width: '320px',
            padding: 'var(--spacing-4)',
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--spacing-4)',
            }}
          >
            <h3
              style={{
                fontSize: 'var(--typography-font-size-base)',
                fontWeight: 'var(--typography-font-weight-semibold)',
                color: 'var(--color-text-primary)',
              }}
            >
              Filter Events
            </h3>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Status Filter */}
          <div style={{ marginBottom: 'var(--spacing-4)' }}>
            <Label
              style={{
                display: 'block',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              Status
            </Label>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-3)',
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                  }}
                >
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={selectedStatuses.includes(option.value)}
                    onCheckedChange={() => handleStatusToggle(option.value)}
                  />
                  <label
                    htmlFor={`status-${option.value}`}
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration Filter */}
          {configurations.length > 0 && (
            <div>
              <Label
                style={{
                  display: 'block',
                  marginBottom: 'var(--spacing-2)',
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Campaign
              </Label>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-2)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                  }}
                >
                  <Checkbox
                    id="config-all"
                    checked={!selectedConfigId}
                    onCheckedChange={() => onConfigChange(undefined)}
                  />
                  <label
                    htmlFor="config-all"
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    All Campaigns
                  </label>
                </div>
                {configurations.map((config) => (
                  <div
                    key={config.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-2)',
                    }}
                  >
                    <Checkbox
                      id={`config-${config.id}`}
                      checked={selectedConfigId === config.id}
                      onCheckedChange={() => onConfigChange(config.id)}
                    />
                    <label
                      htmlFor={`config-${config.id}`}
                      style={{
                        fontSize: 'var(--typography-font-size-sm)',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      {config.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            flexWrap: 'wrap',
          }}
        >
          {selectedStatuses.map((status) => (
            <div
              key={status}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
                padding: '4px var(--spacing-2)',
                fontSize: 'var(--typography-font-size-xs)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-primary)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--border-radius-md)',
              }}
            >
              {STATUS_OPTIONS.find((opt) => opt.value === status)?.label}
              <button
                onClick={() => handleStatusToggle(status)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
                aria-label={`Remove ${status} filter`}
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {selectedConfigId && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
                padding: '4px var(--spacing-2)',
                fontSize: 'var(--typography-font-size-xs)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-primary)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--border-radius-md)',
              }}
            >
              {configurations.find((c) => c.id === selectedConfigId)?.name}
              <button
                onClick={() => onConfigChange(undefined)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
                aria-label="Remove campaign filter"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
