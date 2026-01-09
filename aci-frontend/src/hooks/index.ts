export { useArticles } from './useArticles';
export { useWebSocket } from './useWebSocket';
export { useDashboardSummary } from './useDashboardSummary';
export type {
  UseDashboardSummaryOptions,
  UseDashboardSummaryReturn,
  RecentActivity,
} from './useDashboardSummary';
export { useThreats } from './useThreats';
export type {
  UseThreatsOptions,
  UseThreatsReturn,
  PaginationMeta,
} from './useThreats';
export { useThreat } from './useThreat';
export type { UseThreatReturn } from './useThreat';
export { useToggleBookmark } from './useToggleBookmark';
export type { UseToggleBookmarkReturn } from './useToggleBookmark';

// Approval workflow hooks
export { useApprovalQueue } from './useApprovalQueue';
export type {
  UseApprovalQueueOptions,
  UseApprovalQueueReturn,
} from './useApprovalQueue';
export { useApprovalHistory } from './useApprovalHistory';
export type { UseApprovalHistoryReturn } from './useApprovalHistory';
export {
  useApproveArticle,
  useRejectArticle,
  useReleaseArticle,
  useResetArticle,
  useUpdateUserRole,
} from './useApprovalMutations';
export { approvalKeys } from './approvalKeys';

// Newsletter configuration hooks
export { useNewsletterConfigs } from './useNewsletterConfigs';
export type {
  UseNewsletterConfigsOptions,
  UseNewsletterConfigsReturn,
} from './useNewsletterConfigs';
export { useNewsletterConfig } from './useNewsletterConfig';
export type {
  UseNewsletterConfigOptions,
  UseNewsletterConfigReturn,
} from './useNewsletterConfig';
export {
  useCreateConfig,
  useUpdateConfig,
  useDeleteConfig,
} from './useNewsletterConfigMutations';

// Newsletter segment hooks
export { useSegments } from './useSegments';
export type { UseSegmentsOptions, UseSegmentsReturn } from './useSegments';
export { useSegment } from './useSegment';
export type { UseSegmentOptions, UseSegmentReturn } from './useSegment';
export { useCreateSegment, useUpdateSegment } from './useSegmentMutations';

// Newsletter query keys
export { newsletterKeys } from './newsletterKeys';

// Content source hooks
export { useContentSources } from './useContentSources';
export type {
  UseContentSourcesOptions,
  UseContentSourcesReturn,
} from './useContentSources';

// Content item hooks
export { useContentItems } from './useContentItems';
export type {
  UseContentItemsOptions,
  UseContentItemsReturn,
} from './useContentItems';

// Content mutations
export { useCreateContentSource, useSyncContent } from './useContentMutations';

// Newsletter issue hooks
export { useIssues } from './useIssues';
export type { UseIssuesOptions, UseIssuesReturn } from './useIssues';
export { useIssue } from './useIssue';
export type { UseIssueOptions, UseIssueReturn } from './useIssue';
export { useIssuePreview } from './useIssuePreview';
export type {
  UseIssuePreviewOptions,
  UseIssuePreviewReturn,
} from './useIssuePreview';

// Issue mutations
export {
  useGenerateIssue,
  useApproveIssue,
  useRejectIssue,
  useSendIssue,
} from './useIssueMutations';

// Marketing campaign hooks
export { useCampaigns } from './useCampaigns';
export { useCampaign, useCampaignStats } from './useCampaign';
export { useCampaignMutations } from './useCampaignMutations';

// Marketing query keys
export { marketingKeys } from './marketingKeys';

// Claims library hooks
export { useClaims } from './useClaims';
export type { UseClaimsOptions, UseClaimsReturn } from './useClaims';
export { useClaim } from './useClaim';
export type { UseClaimOptions, UseClaimReturn } from './useClaim';
export {
  useCreateClaim,
  useUpdateClaim,
  useDeleteClaim,
  useApproveClaim,
  useRejectClaim,
  useRecordClaimUsage,
} from './useClaimMutations';
export { useClaimCategories } from './useClaimCategories';
export type {
  UseClaimCategoriesOptions,
  UseClaimCategoriesReturn,
} from './useClaimCategories';
export { useClaimSearch } from './useClaimSearch';
export type { UseClaimSearchOptions, UseClaimSearchReturn } from './useClaimSearch';
export { useClaimValidation, getValidationState } from './useClaimValidation';
export type { UseClaimValidationState } from './useClaimValidation';

// Claims query keys
export { claimsKeys } from './claimsKeys';
