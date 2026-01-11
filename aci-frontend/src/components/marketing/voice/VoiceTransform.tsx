/**
 * VoiceTransform Component
 *
 * Container component integrating the complete voice transformation workflow:
 * 1. Select voice agent
 * 2. Enter text to transform
 * 3. View 3 transformation options
 * 4. Select and apply transformation
 *
 * Handles state management, API calls, error handling, and rate limiting.
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { VoiceAgentSelector } from './VoiceAgentSelector';
import { VoiceTransformInput } from './VoiceTransformInput';
import { TransformationOptions } from './TransformationOptions';
import { useTransformText, useSelectTransformation } from '@/hooks/useVoice';
import type { VoiceAgent, TransformOption } from '@/types/voice';
import { toast } from 'sonner';

interface VoiceTransformProps {
  /**
   * Initial text to transform (optional)
   */
  initialText?: string;

  /**
   * Callback when transformation is applied
   * @param text - The selected transformed text
   */
  onApply?: (text: string) => void;

  /**
   * Field path for tracking (optional)
   */
  fieldPath?: string;

  /**
   * Entity type for tracking (optional)
   */
  entityType?: string;

  /**
   * Entity ID for tracking (optional)
   */
  entityId?: string;

  className?: string;
}

export function VoiceTransform({
  initialText = '',
  onApply,
  fieldPath,
  entityType,
  entityId,
  className = '',
}: VoiceTransformProps) {
  // State
  const [selectedAgent, setSelectedAgent] = React.useState<VoiceAgent | null>(null);
  const [inputText, setInputText] = React.useState(initialText);
  const [options, setOptions] = React.useState<TransformOption[] | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const [requestId, setRequestId] = React.useState<string | null>(null);

  // Mutations
  const transformMutation = useTransformText();
  const selectMutation = useSelectTransformation();

  // Update input text if initialText changes
  React.useEffect(() => {
    setInputText(initialText);
  }, [initialText]);

  const handleTransform = async () => {
    if (!selectedAgent) {
      toast.error('Please select a voice agent first');
      return;
    }

    if (!inputText.trim()) {
      toast.error('Please enter text to transform');
      return;
    }

    // Reset previous results
    setOptions(null);
    setSelectedIndex(null);
    setRequestId(null);

    try {
      const result = await transformMutation.mutateAsync({
        agentId: selectedAgent.id,
        request: {
          text: inputText,
          num_options: 3,
          field_path: fieldPath,
          entity_type: entityType,
          entity_id: entityId,
        },
      });

      setOptions(result.options);
      setRequestId(result.request_id);
      toast.success('Transformation complete! Select an option below.');
    } catch (error) {
      // Error handling is done in the mutation's onError
      console.error('Transform error:', error);
    }
  };

  const handleSelectOption = (index: number) => {
    setSelectedIndex(index);
  };

  const handleApply = async () => {
    if (selectedIndex === null || !options || !requestId) {
      toast.error('Please select a transformation option');
      return;
    }

    const selectedOption = options[selectedIndex];
    if (!selectedOption) {
      toast.error('Invalid option selected');
      return;
    }

    try {
      await selectMutation.mutateAsync({
        request_id: requestId,
        transformation_index: selectedIndex,
        field_path: fieldPath,
        entity_type: entityType,
        entity_id: entityId,
      });

      // Call onApply callback if provided
      if (onApply) {
        onApply(selectedOption.text);
      }

      // Reset state
      setInputText('');
      setOptions(null);
      setSelectedIndex(null);
      setRequestId(null);
    } catch (error) {
      // Error handling is done in the mutation's onError
      console.error('Apply error:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Voice Transformation</CardTitle>
        <CardDescription>
          Transform your text using AI-powered voice agents. Each transformation provides 3 options
          to choose from.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Select Voice Agent */}
        <VoiceAgentSelector
          selectedAgentId={selectedAgent?.id ?? null}
          onSelectAgent={setSelectedAgent}
        />

        <Separator />

        {/* Step 2: Enter Text */}
        <VoiceTransformInput
          value={inputText}
          onChange={setInputText}
          onTransform={handleTransform}
          isLoading={transformMutation.isPending}
          disabled={!selectedAgent}
        />

        {/* Show rate limit info */}
        <p className="text-xs text-muted-foreground">
          Rate limit: 30 transformations per hour. Use wisely!
        </p>

        {/* Step 3: View and Select Options */}
        {options && options.length > 0 && (
          <>
            <Separator />
            <TransformationOptions
              options={options}
              selectedIndex={selectedIndex}
              onSelect={handleSelectOption}
              onApply={handleApply}
              isApplying={selectMutation.isPending}
            />
          </>
        )}

        {/* Show loading state */}
        {transformMutation.isPending && (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                Generating transformation options...
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
