/**
 * Mock Dashboard Fixtures
 * Mock data for dashboard metrics and recent activity
 */

import type { DashboardSummary, AnalyticsData } from '../../types/api';
import type { ThreatSummary, Severity } from '../../types/threat';
import { ThreatCategory } from '../../types/threat';

// ============================================================================
// Activity Type Definition
// ============================================================================

/**
 * Activity type for dashboard recent activity feed
 * Matches the structure expected by useDashboardSummary hook
 */
export interface RecentActivity {
  readonly id: string;
  readonly type: 'threat_added' | 'threat_updated' | 'alert_triggered';
  readonly threatId: string;
  readonly threatTitle: string;
  readonly severity: Severity;
  readonly timestamp: string;
  readonly description: string;
}

// ============================================================================
// Dashboard Summary Mock Data
// ============================================================================

/**
 * Mock dashboard summary with severity distribution and timeline
 */
export const mockDashboardSummary: DashboardSummary = {
  totalThreats: 2847,
  criticalCount: 23,
  highCount: 156,
  mediumCount: 889,
  lowCount: 1779,
  newToday: 47,
  activeAlerts: 12,
  severityDistribution: {
    critical: 23,
    high: 156,
    medium: 889,
    low: 1779,
  },
  timeline: [
    { date: '2024-12-07', count: 145, critical: 3, high: 22, medium: 56, low: 64 },
    { date: '2024-12-08', count: 189, critical: 4, high: 29, medium: 72, low: 84 },
    { date: '2024-12-09', count: 167, critical: 2, high: 25, medium: 63, low: 77 },
    { date: '2024-12-10', count: 203, critical: 5, high: 31, medium: 78, low: 89 },
    { date: '2024-12-11', count: 178, critical: 3, high: 27, medium: 68, low: 80 },
    { date: '2024-12-12', count: 192, critical: 4, high: 29, medium: 73, low: 86 },
    { date: '2024-12-13', count: 215, critical: 6, high: 33, medium: 82, low: 94 },
  ],
  trending: [
    {
      id: 'threat-001',
      title: 'Critical: Zero-day RCE in Apache Struts',
      summary: 'Remote code execution vulnerability affects production systems',
      severity: 'critical',
      category: ThreatCategory.VULNERABILITY,
      source: 'NVD',
      publishedAt: new Date().toISOString(),
      cves: ['CVE-2024-1234'],
      industries: ['technology', 'finance'],
      hasDeepDive: true,
    } as ThreatSummary,
    {
      id: 'threat-002',
      title: 'High: Ransomware Campaign Targeting Finance',
      summary: 'LockBit operators targeting financial institutions',
      severity: 'high',
      category: ThreatCategory.RANSOMWARE,
      source: 'CISA',
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      cves: [],
      industries: ['finance', 'healthcare'],
      hasDeepDive: true,
    } as ThreatSummary,
    {
      id: 'threat-003',
      title: 'Medium: Phishing Campaign Detected',
      summary: 'Targeted phishing emails targeting enterprise users',
      severity: 'medium',
      category: ThreatCategory.PHISHING,
      source: 'Proofpoint',
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      cves: [],
      industries: ['all'],
      hasDeepDive: false,
    } as ThreatSummary,
  ],
} as const;

// ============================================================================
// Recent Activity Mock Data
// ============================================================================

/**
 * Mock recent activity data (10 items for dashboard feed)
 * Uses threatTitle and correct type enums to match hook expectations
 */
export const mockRecentActivity: readonly RecentActivity[] = [
  {
    id: 'activity-001',
    type: 'threat_added',
    threatId: 'threat-001',
    threatTitle: 'Critical: Zero-day RCE in Apache Struts',
    description: 'New remote code execution vulnerability discovered',
    severity: 'critical',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'activity-002',
    type: 'alert_triggered',
    threatId: 'threat-002',
    threatTitle: 'High: LockBit Ransomware Active',
    description: 'Multiple organizations targeted by LockBit operators',
    severity: 'high',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'activity-003',
    type: 'threat_added',
    threatId: 'threat-004',
    threatTitle: 'CVE-2024-5678: SQL Injection in WordPress Plugin',
    description: 'Critical SQL injection vulnerability in popular WordPress plugin',
    severity: 'critical',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'activity-004',
    type: 'threat_added',
    threatId: 'threat-003',
    threatTitle: 'Medium: Phishing Campaign Targeting Microsoft 365 Users',
    description: 'Credential harvesting campaign using fake MFA prompts',
    severity: 'medium',
    timestamp: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: 'activity-005',
    type: 'threat_updated',
    threatId: 'threat-005',
    threatTitle: 'Updated: APT29 Tactics and Techniques',
    description: 'New indicators of compromise identified for APT29',
    severity: 'high',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'activity-006',
    type: 'alert_triggered',
    threatId: 'threat-006',
    threatTitle: 'High: DDoS Campaign Targeting Financial Services',
    description: 'Coordinated DDoS attacks observed against banks',
    severity: 'high',
    timestamp: new Date(Date.now() - 9000000).toISOString(),
  },
  {
    id: 'activity-007',
    type: 'threat_added',
    threatId: 'threat-007',
    threatTitle: 'CVE-2024-9012: Buffer Overflow in OpenSSL',
    description: 'Memory corruption vulnerability in OpenSSL cryptographic library',
    severity: 'high',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 'activity-008',
    type: 'threat_added',
    threatId: 'threat-008',
    threatTitle: 'Low: Outdated Chrome Extension Vulnerability',
    description: 'Minor XSS vulnerability in outdated browser extension',
    severity: 'low',
    timestamp: new Date(Date.now() - 12600000).toISOString(),
  },
  {
    id: 'activity-009',
    type: 'threat_updated',
    threatId: 'threat-009',
    threatTitle: 'Updated: Cobalt Strike Beacon Detection',
    description: 'New network signatures for Cobalt Strike C2 beacons',
    severity: 'medium',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'activity-010',
    type: 'alert_triggered',
    threatId: 'threat-010',
    threatTitle: 'Medium: Supply Chain Compromise Detected',
    description: 'Malicious code injected into npm package with 50k+ downloads',
    severity: 'medium',
    timestamp: new Date(Date.now() - 16200000).toISOString(),
  },
] as const;

// ============================================================================
// Analytics Mock Data
// ============================================================================

/**
 * Mock analytics data for charts with 7-day timeline
 */
export const mockAnalyticsData: AnalyticsData = {
  timeSeries: [
    { date: '2024-12-07', count: 145 },
    { date: '2024-12-08', count: 189 },
    { date: '2024-12-09', count: 167 },
    { date: '2024-12-10', count: 203 },
    { date: '2024-12-11', count: 178 },
    { date: '2024-12-12', count: 192 },
    { date: '2024-12-13', count: 215 },
  ],
  byCategory: [
    { category: 'vulnerability', count: 889 },
    { category: 'malware', count: 567 },
    { category: 'phishing', count: 445 },
    { category: 'ransomware', count: 234 },
    { category: 'data_breach', count: 156 },
    { category: 'other', count: 556 },
  ],
  bySource: [
    { source: 'NVD', count: 1200 },
    { source: 'CISA', count: 850 },
    { source: 'CVE Details', count: 650 },
    { source: 'Proofpoint', count: 147 },
  ],
  bySeverity: [
    { severity: 'critical', count: 23 },
    { severity: 'high', count: 156 },
    { severity: 'medium', count: 889 },
    { severity: 'low', count: 1779 },
  ],
} as const;
