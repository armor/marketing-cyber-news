/**
 * BrandCenterPage
 *
 * Page wrapper for the Brand Center component.
 */

import { BrandCenter } from '@/components/marketing/brand/BrandCenter';

// ============================================================================
// Component
// ============================================================================

export default function BrandCenterPage() {
  // TODO: Get brandVoiceId from route params or context
  // For now, using a default ID
  const brandVoiceId = 'default-brand-voice';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--gradient-page)',
        padding: 'var(--spacing-layout-page)',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <BrandCenter brandVoiceId={brandVoiceId} />
      </div>
    </div>
  );
}
