/**
 * VoiceAgentForm Component
 *
 * Form for creating or editing voice agents.
 * Includes all agent configuration fields with validation.
 */

import { type ReactElement, useState, useEffect } from 'react';
import { Wand2, Sparkles, PenTool, MessageSquare, Shield, UserCheck, TrendingUp, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVoiceAgent } from '@/hooks/useVoice';
import { useCreateVoiceAgent, useUpdateVoiceAgent } from '@/hooks/useVoiceAgentAdmin';
import { DEFAULT_AGENT_COLORS } from '@/types/voice';

// ============================================================================
// Types
// ============================================================================

interface VoiceAgentFormProps {
  readonly agentId?: string;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

interface FormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  status: 'active' | 'draft' | 'inactive';
}

// ============================================================================
// Constants
// ============================================================================

const ICON_OPTIONS = [
  { value: 'wand-2', label: 'Wand', Icon: Wand2 },
  { value: 'sparkles', label: 'Sparkles', Icon: Sparkles },
  { value: 'pen-tool', label: 'Pen', Icon: PenTool },
  { value: 'message-square', label: 'Message', Icon: MessageSquare },
  { value: 'shield', label: 'Shield', Icon: Shield },
  { value: 'user-check', label: 'User', Icon: UserCheck },
  { value: 'trending-up', label: 'Trending', Icon: TrendingUp },
  { value: 'book-open', label: 'Book', Icon: BookOpen },
] as const;

const DEFAULT_FORM_DATA: FormData = {
  name: '',
  description: '',
  icon: 'wand-2',
  color: DEFAULT_AGENT_COLORS[0],
  system_prompt: '',
  temperature: 0.7,
  max_tokens: 500,
  status: 'draft',
};

// ============================================================================
// Component
// ============================================================================

export function VoiceAgentForm({
  agentId,
  onSave,
  onCancel,
}: VoiceAgentFormProps): ReactElement {
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const { data: agent, isLoading } = useVoiceAgent(agentId ?? null);
  const createMutation = useCreateVoiceAgent();
  const updateMutation = useUpdateVoiceAgent();

  const isEditMode = !!agentId;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Load existing agent data
  useEffect(() => {
    if (!agent) {
      return;
    }

    setFormData({
      name: agent.name,
      description: agent.description ?? '',
      icon: agent.icon,
      color: agent.color,
      system_prompt: agent.system_prompt,
      temperature: agent.temperature,
      max_tokens: agent.max_tokens,
      status: agent.status,
    });
  }, [agent]);

  // ============================================================================
  // Validation
  // ============================================================================

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.system_prompt.trim()) {
      newErrors.system_prompt = 'System prompt is required';
    }

    if (formData.temperature < 0 || formData.temperature > 1) {
      newErrors.temperature = 'Temperature must be between 0 and 1';
    }

    if (formData.max_tokens < 100 || formData.max_tokens > 2000) {
      newErrors.max_tokens = 'Max tokens must be between 100 and 2000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const data = {
      name: formData.name,
      description: formData.description || undefined,
      icon: formData.icon,
      color: formData.color,
      system_prompt: formData.system_prompt,
      temperature: formData.temperature,
      max_tokens: formData.max_tokens,
      status: formData.status,
    };

    if (isEditMode && agentId) {
      updateMutation.mutate(
        { id: agentId, data },
        { onSuccess: onSave }
      );
    } else {
      createMutation.mutate(
        { data },
        { onSuccess: onSave }
      );
    }
  };

  const handleChange = (field: keyof FormData, value: string | number): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-6)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading agent...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 'var(--spacing-6)' }}>
      <h2
        style={{
          fontSize: 'var(--typography-font-size-xl)',
          fontWeight: 'var(--typography-font-weight-semibold)',
          marginBottom: 'var(--spacing-6)',
        }}
      >
        {isEditMode ? 'Edit Voice Agent' : 'Create Voice Agent'}
      </h2>

      {/* Name */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Professional Tone"
        />
        {errors.name && (
          <p style={{ color: 'var(--color-destructive)', fontSize: 'var(--typography-font-size-sm)', marginTop: 'var(--spacing-1)' }}>
            {errors.name}
          </p>
        )}
      </div>

      {/* Description */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Transforms text into a professional business tone"
        />
      </div>

      {/* Icon & Color Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-4)' }}>
        {/* Icon */}
        <div>
          <Label htmlFor="icon">Icon</Label>
          <Select value={formData.icon} onValueChange={(value) => handleChange('icon', value)}>
            <SelectTrigger id="icon">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map(({ value, label, Icon }) => (
                <SelectItem key={value} value={value}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                    <Icon className="size-4" />
                    <span>{label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Color */}
        <div>
          <Label htmlFor="color">Color</Label>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
            {DEFAULT_AGENT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleChange('color', color)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: color,
                  border: formData.color === color ? '2px solid var(--color-text-primary)' : '1px solid var(--color-border)',
                  cursor: 'pointer',
                }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* System Prompt */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <Label htmlFor="system_prompt">System Prompt *</Label>
        <Textarea
          id="system_prompt"
          value={formData.system_prompt}
          onChange={(e) => handleChange('system_prompt', e.target.value)}
          placeholder="You are a professional writing assistant..."
          rows={6}
        />
        {errors.system_prompt && (
          <p style={{ color: 'var(--color-destructive)', fontSize: 'var(--typography-font-size-sm)', marginTop: 'var(--spacing-1)' }}>
            {errors.system_prompt}
          </p>
        )}
      </div>

      {/* Temperature */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <Label htmlFor="temperature">
          Temperature: {formData.temperature.toFixed(2)}
        </Label>
        <input
          id="temperature"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={formData.temperature}
          onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <p style={{ fontSize: 'var(--typography-font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-1)' }}>
          Lower = more consistent, Higher = more creative
        </p>
        {errors.temperature && (
          <p style={{ color: 'var(--color-destructive)', fontSize: 'var(--typography-font-size-sm)' }}>
            {errors.temperature}
          </p>
        )}
      </div>

      {/* Max Tokens */}
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <Label htmlFor="max_tokens">Max Tokens</Label>
        <Input
          id="max_tokens"
          type="number"
          min="100"
          max="2000"
          value={formData.max_tokens}
          onChange={(e) => handleChange('max_tokens', parseInt(e.target.value, 10))}
        />
        {errors.max_tokens && (
          <p style={{ color: 'var(--color-destructive)', fontSize: 'var(--typography-font-size-sm)', marginTop: 'var(--spacing-1)' }}>
            {errors.max_tokens}
          </p>
        )}
      </div>

      {/* Status */}
      <div style={{ marginBottom: 'var(--spacing-6)' }}>
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-3)' }}>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : isEditMode ? 'Update Agent' : 'Create Agent'}
        </Button>
      </div>
    </form>
  );
}
