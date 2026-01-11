/**
 * VoiceTransformKeyboardHandler
 *
 * Global keyboard shortcut handler for voice transformation.
 * Listens for Ctrl+Shift+T (Cmd+Shift+T on Mac) and opens
 * a voice transformation dialog with the selected/focused text.
 */

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VoiceTransform } from './VoiceTransform';
import { useVoiceTransformKeyboard } from '@/hooks/useVoiceTransformKeyboard';
import { toast } from 'sonner';

interface VoiceTransformKeyboardHandlerProps {
  /**
   * Whether the keyboard handler is enabled
   * @default true
   */
  enabled?: boolean;

  /**
   * Children to render
   */
  children: React.ReactNode;
}

export function VoiceTransformKeyboardHandler({
  enabled = true,
  children,
}: VoiceTransformKeyboardHandlerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [initialText, setInitialText] = React.useState('');

  useVoiceTransformKeyboard({
    enabled,
    onTrigger: (text) => {
      if (text.trim()) {
        setInitialText(text);
        setIsOpen(true);
      } else {
        toast.info('Select or focus text to transform', {
          description: 'Place your cursor in a text field or select text, then press Ctrl+Shift+T',
        });
      }
    },
  });

  const handleApply = (transformedText: string) => {
    // Copy to clipboard
    navigator.clipboard.writeText(transformedText).then(() => {
      toast.success('Transformed text copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
    setIsOpen(false);
    setInitialText('');
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setInitialText('');
    }
  };

  return (
    <>
      {children}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Voice Transformation</DialogTitle>
          </DialogHeader>
          <VoiceTransform
            initialText={initialText}
            onApply={handleApply}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
