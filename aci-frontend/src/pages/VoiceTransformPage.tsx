/**
 * VoiceTransformPage
 *
 * Standalone page for voice transformation testing and usage.
 * Marketing users can transform text using AI voice agents.
 */

import * as React from 'react';
import { VoiceTransform } from '@/components/marketing/voice';
import { toast } from 'sonner';

export function VoiceTransformPage() {
  const [transformedText, setTransformedText] = React.useState<string>('');

  const handleApply = (text: string) => {
    setTransformedText(text);
    toast.success('Transformation applied! You can now copy or use this text.');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Voice Transformation</h1>
        <p className="text-muted-foreground mt-2">
          Transform your marketing text using AI-powered voice agents. Each transformation provides
          3 options to choose from.
        </p>
      </div>

      <VoiceTransform
        onApply={handleApply}
        entityType="standalone"
      />

      {transformedText && (
        <div className="bg-muted/50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">Applied Transformation</h2>
          <p className="text-sm whitespace-pre-wrap">{transformedText}</p>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(transformedText);
              toast.success('Copied to clipboard');
            }}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  );
}
