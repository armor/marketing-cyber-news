/**
 * TransformationOptions Component
 *
 * Displays 3 transformation options: Conservative, Moderate, Bold.
 * Shows text preview, temperature, tokens used.
 * Allows selection and preview.
 */

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Check, Copy, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { TransformOption } from '@/types/voice';
import { TRANSFORM_LABEL_DISPLAY, TRANSFORM_LABEL_DESCRIPTIONS } from '@/types/voice';

interface TransformationOptionsProps {
  options: TransformOption[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onApply: () => void;
  isApplying?: boolean;
  className?: string;
}

/**
 * Badge variant for each transform label
 */
const LABEL_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  conservative: 'secondary',
  moderate: 'default',
  bold: 'outline',
};

export function TransformationOptions({
  options,
  selectedIndex,
  onSelect,
  onApply,
  isApplying = false,
  className = '',
}: TransformationOptionsProps) {
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Option ${index + 1} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleToggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Transformation Options</h3>
        {selectedIndex !== null && (
          <Button
            onClick={onApply}
            disabled={isApplying}
            size="sm"
          >
            {isApplying ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Apply Selection
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedIndex === option.index;
          const isExpanded = expandedIndex === option.index;
          const variant = LABEL_VARIANTS[option.label] ?? 'default';

          return (
            <Card
              key={option.index}
              data-testid="transform-option"
              data-option-index={option.index}
              data-option-label={option.label}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'ring-2 ring-primary shadow-md'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onSelect(option.index)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={variant}>
                      {TRANSFORM_LABEL_DISPLAY[option.label]}
                    </Badge>
                    {isSelected && (
                      <Badge variant="default" className="bg-primary">
                        <Check className="h-3 w-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      aria-label="Expand"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleExpand(option.index);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      aria-label="Copy"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(option.text, option.index);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {TRANSFORM_LABEL_DESCRIPTIONS[option.label]}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {isExpanded ? (
                  <Textarea
                    value={option.text}
                    readOnly
                    className="min-h-[120px] resize-y"
                  />
                ) : (
                  <p className="text-sm line-clamp-3">{option.text}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>Temperature: {option.temperature.toFixed(2)}</span>
                  <span>Tokens: {option.tokens_used}</span>
                  <span>Option {option.index + 1}/3</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedIndex === null && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          Click an option to select it, then click "Apply Selection" to use it
        </p>
      )}
    </div>
  );
}
