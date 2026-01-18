/**
 * AgentSelector Component (T049)
 *
 * Dropdown component for selecting voice agents.
 * Shows agent name, description, icon, and color indicator.
 */

import * as React from 'react';
import { Loader2Icon, Sparkles, Wand2, PenTool, MessageSquare, Shield, UserCheck, TrendingUp, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { VoiceAgent } from '@/types/voice';

interface AgentSelectorProps {
  /** List of available voice agents */
  agents: VoiceAgent[];
  /** Currently selected agent ID */
  selectedAgentId: string | null;
  /** Callback when agent is selected */
  onSelect: (agentId: string) => void;
  /** Whether agents are loading */
  isLoading?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Placeholder text when no agent is selected */
  placeholder?: string;
  /** ARIA label */
  'aria-label'?: string;
}

/** Icon mapping for voice agents */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'wand-2': Wand2,
  'sparkles': Sparkles,
  'pen-tool': PenTool,
  'message-square': MessageSquare,
  'shield': Shield,
  'user-check': UserCheck,
  'trending-up': TrendingUp,
  'book-open': BookOpen,
};

/** Get a Lucide icon component by name */
function getIconComponent(iconName: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  return ICON_MAP[iconName] ?? Sparkles;
}

export function AgentSelector({
  agents,
  selectedAgentId,
  onSelect,
  isLoading = false,
  disabled = false,
  placeholder = 'Select a voice agent',
  'aria-label': ariaLabel = 'Voice agent selector',
}: AgentSelectorProps) {
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          height: 'var(--spacing-10)',
          padding: 'var(--spacing-3)',
          borderRadius: 'var(--border-radius-md)',
          borderWidth: 'var(--border-width-thin)',
          borderColor: 'var(--color-border-default)',
          backgroundColor: 'var(--color-surface-elevated)',
        }}
      >
        <Loader2Icon className="size-4 animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
        <span
          style={{
            marginLeft: 'var(--spacing-2)',
            fontSize: 'var(--typography-font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Loading agents...
        </span>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          height: 'var(--spacing-10)',
          padding: 'var(--spacing-3)',
          borderRadius: 'var(--border-radius-md)',
          borderWidth: 'var(--border-width-thin)',
          borderColor: 'var(--color-border-default)',
          backgroundColor: 'var(--color-surface-elevated)',
          fontSize: 'var(--typography-font-size-sm)',
          color: 'var(--color-text-tertiary)',
        }}
      >
        No voice agents available
      </div>
    );
  }

  return (
    <Select
      value={selectedAgentId ?? undefined}
      onValueChange={onSelect}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          'w-full',
          selectedAgent && 'border-l-4'
        )}
        style={{
          borderLeftColor: selectedAgent?.color,
        }}
      >
        <SelectValue placeholder={placeholder}>
          {selectedAgent && (
            <div className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
              <AgentIcon agent={selectedAgent} size="sm" />
              <span>{selectedAgent.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {agents.map((agent) => (
          <SelectItem
            key={agent.id}
            value={agent.id}
            className="cursor-pointer"
          >
            <div className="flex items-center" style={{ gap: 'var(--spacing-3)' }}>
              <AgentIcon agent={agent} size="md" />
              <div className="flex flex-col">
                <span
                  className="font-medium"
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {agent.name}
                </span>
                {agent.description && (
                  <span
                    className="line-clamp-1"
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    {agent.description}
                  </span>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Agent icon with color background */
interface AgentIconProps {
  agent: VoiceAgent;
  size?: 'sm' | 'md' | 'lg';
}

function AgentIcon({ agent, size = 'md' }: AgentIconProps) {
  const IconComponent = getIconComponent(agent.icon);

  const sizeStyles = {
    sm: { container: 'var(--spacing-6)', icon: 'size-3' },
    md: { container: 'var(--spacing-8)', icon: 'size-4' },
    lg: { container: 'var(--spacing-10)', icon: 'size-5' },
  };

  const styles = sizeStyles[size];

  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: styles.container,
        height: styles.container,
        borderRadius: 'var(--border-radius-md)',
        backgroundColor: `${agent.color}20`,
      }}
    >
      <IconComponent className={styles.icon} style={{ color: agent.color }} />
    </div>
  );
}

export { AgentIcon };
export default AgentSelector;
