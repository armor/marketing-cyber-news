import { ContentStudio } from '@/components/marketing/content/ContentStudio';
import { PageHeader } from '@/components/layout/PageHeader';
import type {
  ContentChannel,
  ContentType,
  GeneratedContent,
  RefinementAction,
  SuggestedPrompt,
  BrandScore,
} from '@/types/content-studio';

/**
 * ContentStudioPage - Page wrapper for AI-powered content generation
 *
 * Features:
 * - Main layout integration
 * - API integration placeholders
 * - Mock data for development
 */
export function ContentStudioPage() {
  // Mock suggested prompts for development
  const suggestedPrompts: SuggestedPrompt[] = [
    {
      id: '1',
      text: 'Write a LinkedIn post announcing our new zero-day vulnerability detection feature',
      category: 'product',
      channels: ['linkedin', 'twitter'],
    },
    {
      id: '2',
      text: 'Create an engaging thread about the importance of real-time threat monitoring',
      category: 'thought-leadership',
      channels: ['twitter', 'linkedin'],
    },
    {
      id: '3',
      text: 'Draft an email newsletter highlighting this week\'s top cybersecurity threats',
      category: 'engagement',
      channels: ['email'],
    },
    {
      id: '4',
      text: 'Write a blog article explaining how AI improves threat detection accuracy',
      category: 'thought-leadership',
      channels: ['blog'],
    },
  ];

  // Mock API call for content generation
  const handleGenerate = async (
    _prompt: string,
    channel: ContentChannel,
    type: ContentType
  ): Promise<GeneratedContent> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock brand score
    const brandScore: BrandScore = {
      overall: 85,
      tone: 90,
      voice: 85,
      terminology: 80,
      style: 85,
      issues: [
        {
          id: 'issue-1',
          type: 'terminology',
          severity: 'medium',
          message: 'Consider using "cybersecurity professionals" instead of "security experts" to align with brand voice',
          suggestedFix: 'cybersecurity professionals',
          location: { start: 45, end: 60 },
        },
      ],
    };

    // Mock generated content
    const mockContent: GeneratedContent = {
      id: `content-${Date.now()}`,
      content: `🛡️ Exciting News for Cybersecurity Professionals!

We're thrilled to announce our latest feature: Real-time Zero-Day Vulnerability Detection powered by AI.

In today's threat landscape, staying ahead of unknown vulnerabilities is critical. Our new system:

✅ Monitors network traffic 24/7
✅ Detects anomalies using machine learning
✅ Alerts your team within seconds
✅ Provides actionable remediation steps

Traditional signature-based systems can't catch zero-days. That's why we built something better.

Learn more about how we're protecting organizations from emerging threats: [link]

#Cybersecurity #ThreatDetection #InfoSec #ZeroDay`,
      channel,
      contentType: type,
      brandScore,
      characterCount: 456,
      createdAt: new Date().toISOString(),
      status: 'draft',
    };

    return mockContent;
  };

  // Mock API call for content refinement
  const handleRefine = async (
    content: GeneratedContent,
    action: RefinementAction
  ): Promise<GeneratedContent> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    let refinedContent = content.content;

    // Mock refinement logic
    switch (action) {
      case 'make_shorter':
        refinedContent = content.content.substring(0, Math.floor(content.content.length * 0.7));
        break;
      case 'make_longer':
        refinedContent = content.content + '\n\nWant to see it in action? Schedule a demo with our team today.';
        break;
      case 'more_formal':
        refinedContent = content.content.replace(/We're/g, 'We are').replace(/can't/g, 'cannot');
        break;
      case 'more_casual':
        refinedContent = content.content.replace(/We are/g, "We're").replace(/cannot/g, "can't");
        break;
      case 'add_cta':
        refinedContent = content.content + '\n\n👉 Get started today: [link]';
        break;
      case 'remove_cta':
        refinedContent = content.content.replace(/\n\n👉 Get started today: \[link\]/, '');
        break;
    }

    return {
      ...content,
      content: refinedContent,
      characterCount: refinedContent.length,
      brandScore: {
        ...content.brandScore,
        overall: Math.min(100, content.brandScore.overall + 5),
      },
    };
  };

  // Mock API call for scheduling
  const handleSchedule = async (
    content: GeneratedContent,
    scheduledTime: string
  ): Promise<void> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('Scheduling content:', {
      contentId: content.id,
      channel: content.channel,
      scheduledFor: scheduledTime,
    });

    // In production, this would call the API:
    // await api.scheduleContent(content.id, scheduledTime);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content Studio' },
        ]}
        title="Content Studio"
        description="Generate on-brand content with AI for LinkedIn, Twitter, Email, and Blog"
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--spacing-6)' }}>
        <div
          style={{
            maxWidth: '56rem',
            margin: '0 auto',
          }}
        >
          {/* Content Studio Component */}
          <ContentStudio
            onGenerate={handleGenerate}
            onRefine={handleRefine}
            onSchedule={handleSchedule}
            suggestedPrompts={suggestedPrompts}
          />
        </div>
      </div>
    </div>
  );
}

export default ContentStudioPage;
