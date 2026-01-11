# Voice Transformation Components

AI-powered voice transformation system for marketing content.

## Components

### VoiceTransform (Container)
Main container component orchestrating the complete transformation workflow.

**Features:**
- Voice agent selection
- Text input with validation (10-10,000 characters)
- Transformation generation (3 options)
- Option selection and application
- Error handling and rate limiting

**Usage:**
```tsx
import { VoiceTransform } from '@/components/marketing/voice';

function MyComponent() {
  return (
    <VoiceTransform
      initialText="Your text here"
      onApply={(transformedText) => {
        console.log('Applied:', transformedText);
      }}
      fieldPath="content.body"
      entityType="campaign"
      entityId="123"
    />
  );
}
```

### VoiceAgentSelector
Displays available voice agents for selection.

**Features:**
- Grid layout with agent cards
- Icons and colors from backend
- Selection state
- Loading and error states

### VoiceTransformInput
Text input for transformation with validation.

**Features:**
- Character count (10-10,000)
- Validation feedback
- Keyboard shortcut (Cmd/Ctrl+Enter)
- Loading state

### TransformationOptions
Displays 3 transformation options with selection.

**Features:**
- Conservative, Moderate, Bold variants
- Expandable text preview
- Copy to clipboard
- Temperature and token info
- Selection state

## Data Flow

```
1. User selects voice agent
   ↓
2. User enters text (10-10,000 chars)
   ↓
3. Click "Transform Text" or Cmd+Enter
   ↓
4. API: POST /v1/voice-agents/{id}/transform
   ↓
5. Display 3 options (Conservative, Moderate, Bold)
   ↓
6. User selects an option
   ↓
7. Click "Apply Selection"
   ↓
8. API: POST /v1/transformations/select
   ↓
9. onApply callback with transformed text
```

## API Integration

Uses TanStack Query hooks from `@/hooks/useVoice`:
- `useVoiceAgents()` - Fetch active agents
- `useVoiceAgent(id)` - Fetch agent details
- `useTransformText()` - Transform mutation
- `useSelectTransformation()` - Selection mutation

## Rate Limiting

- **Limit:** 30 transformations per hour per user
- **Enforcement:** Backend middleware
- **UI Feedback:** Error toast when rate limit exceeded

## Character Constraints

- **Minimum:** 10 characters
- **Maximum:** 10,000 characters
- **Validation:** Real-time with visual feedback

## Error Handling

- Agent selection required
- Text validation
- Rate limit errors
- Network errors
- API errors

All errors show user-friendly toast notifications.

## TypeScript Types

All types imported from `@/types/voice`:
- `VoiceAgent` - Agent metadata
- `TransformOption` - Individual transformation option
- `TransformRequest` - API request
- `TransformResponse` - API response
- And more...

## Testing

See `aci-frontend/e2e/voice-transformation.spec.ts` for E2E tests covering:
- Happy path workflow
- Validation errors
- Rate limiting
- API failures
- Console errors

## Integration

The `VoiceTransform` component can be integrated into:
- Content Studio
- Campaign Builder
- Newsletter Editor
- Any text editing interface

Simply import and use with the `onApply` callback to handle the transformed text.
