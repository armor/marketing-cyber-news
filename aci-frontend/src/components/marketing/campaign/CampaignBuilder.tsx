/**
 * CampaignBuilder.tsx - Marketing Campaign Builder Wizard
 *
 * Multi-step wizard for creating marketing campaigns with:
 * - Goal selection
 * - Channel selection
 * - Frequency and style configuration
 * - Review and launch
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GoalSelector } from './GoalSelector';
import { ChannelPicker } from './ChannelPicker';
import { FrequencySelector } from './FrequencySelector';
import { ContentStyleSelector } from './ContentStyleSelector';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface CampaignFormData {
  goal: 'awareness' | 'leads' | 'engagement' | 'traffic' | null;
  channels: string[];
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | null;
  contentStyle: 'thought-leadership' | 'product-focused' | 'educational' | 'promotional' | null;
  name: string;
}

interface CampaignBuilderProps {
  onSubmit: (data: CampaignFormData) => void | Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<CampaignFormData>;
}

const STEPS = [
  { id: 'goal', label: 'Select Goal', description: 'What do you want to achieve?' },
  { id: 'channels', label: 'Choose Channels', description: 'Where should we publish?' },
  { id: 'frequency', label: 'Set Frequency & Style', description: 'How often and what tone?' },
  { id: 'review', label: 'Review & Launch', description: 'Confirm your campaign' },
] as const;

export function CampaignBuilder({ onSubmit, onCancel, initialData }: CampaignBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { watch, setValue, handleSubmit } = useForm<CampaignFormData>({
    defaultValues: {
      goal: initialData?.goal || null,
      channels: initialData?.channels || [],
      frequency: initialData?.frequency || null,
      contentStyle: initialData?.contentStyle || null,
      name: initialData?.name || '',
    },
  });

  const formData = watch();

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return formData.goal !== null;
      case 1:
        return formData.channels.length > 0;
      case 2:
        return formData.frequency !== null && formData.contentStyle !== null;
      case 3:
        return formData.name.trim().length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFormSubmit = async (data: CampaignFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <GoalSelector
            value={formData.goal}
            onChange={(goal) => setValue('goal', goal)}
          />
        );
      case 1:
        return (
          <ChannelPicker
            selected={formData.channels}
            onChange={(channels) => setValue('channels', channels)}
          />
        );
      case 2:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
            <FrequencySelector
              value={formData.frequency}
              onChange={(frequency) => setValue('frequency', frequency)}
            />
            <ContentStyleSelector
              value={formData.contentStyle}
              onChange={(style) => setValue('contentStyle', style)}
            />
          </div>
        );
      case 3:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div>
              <label
                htmlFor="campaign-name"
                style={{
                  display: 'block',
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  marginBottom: 'var(--spacing-2)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Campaign Name
              </label>
              <input
                id="campaign-name"
                type="text"
                value={formData.name}
                onChange={(e) => setValue('name', e.target.value)}
                placeholder="e.g., Q1 2025 Brand Awareness Campaign"
                style={{
                  width: '100%',
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--border-radius-md)',
                  border: `var(--border-width-thin) solid var(--color-border-default)`,
                  fontSize: 'var(--typography-font-size-base)',
                  fontFamily: 'var(--typography-font-family-sans)',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-bg-elevated)',
                  transition: `border-color var(--motion-duration-fast) var(--motion-easing-default)`,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-border-focus)';
                  e.target.style.outline = 'none';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border-default)';
                }}
              />
            </div>

            <div
              style={{
                padding: 'var(--spacing-6)',
                borderRadius: 'var(--border-radius-lg)',
                background: 'var(--color-bg-secondary)',
                border: `var(--border-width-thin) solid var(--color-border-default)`,
              }}
            >
              <h3
                style={{
                  fontSize: 'var(--typography-font-size-lg)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  marginBottom: 'var(--spacing-4)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Campaign Summary
              </h3>
              <dl style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
                <div>
                  <dt
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-muted)',
                      marginBottom: 'var(--spacing-1)',
                    }}
                  >
                    Goal
                  </dt>
                  <dd
                    style={{
                      fontSize: 'var(--typography-font-size-base)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {formData.goal || 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-muted)',
                      marginBottom: 'var(--spacing-1)',
                    }}
                  >
                    Channels
                  </dt>
                  <dd
                    style={{
                      fontSize: 'var(--typography-font-size-base)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {formData.channels.join(', ') || 'None selected'}
                  </dd>
                </div>
                <div>
                  <dt
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-muted)',
                      marginBottom: 'var(--spacing-1)',
                    }}
                  >
                    Frequency
                  </dt>
                  <dd
                    style={{
                      fontSize: 'var(--typography-font-size-base)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {formData.frequency || 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-muted)',
                      marginBottom: 'var(--spacing-1)',
                    }}
                  >
                    Content Style
                  </dt>
                  <dd
                    style={{
                      fontSize: 'var(--typography-font-size-base)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {formData.contentStyle?.replace('-', ' ') || 'Not set'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Create Campaign</CardTitle>
          <div style={{ marginTop: 'var(--spacing-4)' }}>
            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-2)',
                marginBottom: 'var(--spacing-3)',
              }}
            >
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  style={{
                    flex: 1,
                    height: 'var(--spacing-2)',
                    borderRadius: 'var(--border-radius-full)',
                    background:
                      index <= currentStep
                        ? 'var(--color-brand-primary)'
                        : 'var(--color-border-default)',
                    transition: `background var(--motion-duration-normal) var(--motion-easing-default)`,
                  }}
                />
              ))}
            </div>
            <div>
              <p
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-muted)',
                  marginBottom: 'var(--spacing-1)',
                }}
              >
                Step {currentStep + 1} of {STEPS.length}
              </p>
              <p
                style={{
                  fontSize: 'var(--typography-font-size-lg)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {STEPS[currentStep].label}
              </p>
              <p
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  marginTop: 'var(--spacing-1)',
                }}
              >
                {STEPS[currentStep].description}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent style={{ minHeight: '400px' }}>
          {renderStepContent()}
        </CardContent>

        <CardFooter style={{ justifyContent: 'space-between' }}>
          <div>
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
              >
                <ChevronLeft />
                Back
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}

            {currentStep < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!isStepValid(currentStep)}
              >
                Next
                <ChevronRight />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!isStepValid(currentStep) || isSubmitting}
              >
                <Check />
                {isSubmitting ? 'Launching...' : 'Launch Campaign'}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
