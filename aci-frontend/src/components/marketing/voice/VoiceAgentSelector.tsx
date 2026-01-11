/**
 * VoiceAgentSelector Component
 *
 * Displays available voice agents for selection.
 * Shows agent name, description, icon, and color.
 */

import * as React from 'react';
import { Wand2, Sparkles, PenTool, MessageSquare, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useVoiceAgents } from '@/hooks/useVoice';
import type { VoiceAgent } from '@/types/voice';

interface VoiceAgentSelectorProps {
  selectedAgentId: string | null;
  onSelectAgent: (agent: VoiceAgent) => void;
  className?: string;
}

/**
 * Map icon names to Lucide icon components
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'wand-2': Wand2,
  'sparkles': Sparkles,
  'pen-tool': PenTool,
  'message-square': MessageSquare,
  'shield': Shield,
};

/**
 * Get icon component by name, default to Wand2
 */
function getIconComponent(iconName: string) {
  return ICON_MAP[iconName] ?? Wand2;
}

export function VoiceAgentSelector({
  selectedAgentId,
  onSelectAgent,
  className = '',
}: VoiceAgentSelectorProps) {
  const { data: agents, isLoading, error } = useVoiceAgents();

  if (isLoading) {
    return (
      <div className={className}>
        <h3 className="text-sm font-medium mb-3">Select Voice Agent</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <h3 className="text-sm font-medium mb-3 text-destructive">
          Failed to load voice agents
        </h3>
        <p className="text-sm text-muted-foreground">
          Please try again later or contact support.
        </p>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className={className}>
        <h3 className="text-sm font-medium mb-3">No Voice Agents Available</h3>
        <p className="text-sm text-muted-foreground">
          No active voice agents found. Please contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-sm font-medium mb-3">Select Voice Agent</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {agents.map((agent) => {
          const IconComponent = getIconComponent(agent.icon);
          const isSelected = selectedAgentId === agent.id;

          return (
            <Card
              key={agent.id}
              data-testid="voice-agent-card"
              data-agent-id={agent.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? 'ring-2 ring-primary shadow-md'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onSelectAgent(agent)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="rounded-md p-2 flex items-center justify-center"
                    style={{ backgroundColor: `${agent.color}20` }}
                  >
                    <div style={{ color: agent.color }}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {agent.name}
                      </h4>
                      {isSelected && (
                        <Badge variant="default" className="text-xs shrink-0">
                          Selected
                        </Badge>
                      )}
                    </div>
                    {agent.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {agent.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
