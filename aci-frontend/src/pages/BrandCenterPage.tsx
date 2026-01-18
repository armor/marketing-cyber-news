/**
 * BrandCenterPage
 *
 * Page wrapper for the Brand Center component.
 */

import { BrandCenter } from '@/components/marketing/brand/BrandCenter';
import { PageHeader } from '@/components/layout/PageHeader';

// ============================================================================
// Component
// ============================================================================

export default function BrandCenterPage() {
  // TODO: Get brandVoiceId from route params or context
  // For now, using a default ID
  const brandVoiceId = 'default-brand-voice';

  return (
    <div className="flex flex-col h-full">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Brand Center' },
        ]}
        title="Brand Center"
        description="Manage your brand voice and content guidelines"
      />

      {/* Main Content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: 'var(--spacing-6)' }}
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
    </div>
  );
}
