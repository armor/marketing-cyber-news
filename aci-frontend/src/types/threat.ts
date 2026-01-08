/**
 * Threat Intelligence Types
 * Based on NEXUS Frontend data model for cybersecurity threat tracking
 */

/**
 * Severity levels for threats and CVEs
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

/**
 * Threat categorization taxonomy
 */
export enum ThreatCategory {
  MALWARE = 'malware',
  PHISHING = 'phishing',
  RANSOMWARE = 'ransomware',
  DATA_BREACH = 'data_breach',
  VULNERABILITY = 'vulnerability',
  APT = 'apt',
  DDOS = 'ddos',
  INSIDER_THREAT = 'insider_threat',
  SUPPLY_CHAIN = 'supply_chain',
  ZERO_DAY = 'zero_day',
}

/**
 * CVE (Common Vulnerabilities and Exposures) entity
 */
export interface CVE {
  readonly id: string; // Format: CVE-XXXX-XXXXX
  readonly severity: Severity;
  readonly cvssScore: number | null;
  readonly description: string;
}

/**
 * External reference/source for threat intelligence
 */
export interface ExternalReference {
  readonly title: string;
  readonly url: string;
  readonly source: string; // e.g., "MITRE ATT&CK", "CISA", "NVD"
  readonly type: 'advisory' | 'article' | 'report' | 'cve' | 'mitre' | 'other';
}

/**
 * Industry classification for threat relevance
 */
export type Industry =
  | 'finance'
  | 'healthcare'
  | 'manufacturing'
  | 'energy'
  | 'retail'
  | 'technology'
  | 'government'
  | 'education'
  | 'telecommunications'
  | 'transportation'
  | 'defense'
  | 'critical_infrastructure'
  | 'all';

/**
 * Priority level for recommendations
 */
export type RecommendationPriority = 'immediate' | 'short_term' | 'long_term';

/**
 * Actionable recommendation for threat mitigation
 */
export interface Recommendation {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly priority: RecommendationPriority;
  readonly category: 'patch' | 'configuration' | 'monitoring' | 'access_control' | 'backup' | 'training' | 'other';
}

/**
 * MITRE ATT&CK technique mapping
 */
export interface MitreTechnique {
  readonly id: string; // e.g., "T1566.001"
  readonly name: string; // e.g., "Spearphishing Attachment"
  readonly tactic: string; // e.g., "Initial Access"
  readonly url: string;
}

/**
 * Indicator of Compromise (IOC)
 */
export interface IOC {
  readonly type: 'ip' | 'domain' | 'hash_md5' | 'hash_sha1' | 'hash_sha256' | 'url' | 'email' | 'file_name' | 'registry_key';
  readonly value: string;
  readonly description?: string;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly firstSeen?: string;
  readonly lastSeen?: string;
}

/**
 * Technical analysis section for Deep Dive
 */
export interface TechnicalAnalysis {
  readonly attackVector: string;
  readonly exploitationMethod: string;
  readonly affectedSystems: readonly string[];
  readonly prerequisites: readonly string[];
  readonly detectionMethods: readonly string[];
}

/**
 * Timeline event for attack progression
 */
export interface TimelineEvent {
  readonly timestamp: string;
  readonly event: string;
  readonly phase: 'initial_access' | 'execution' | 'persistence' | 'privilege_escalation' | 'defense_evasion' | 'credential_access' | 'discovery' | 'lateral_movement' | 'collection' | 'exfiltration' | 'impact';
  readonly details?: string;
}

/**
 * Premium Deep Dive content (gated/paid)
 */
export interface DeepDive {
  readonly isAvailable: boolean;
  readonly isLocked: boolean; // true if user needs to upgrade to access
  readonly preview?: string; // teaser content for non-premium users
  // Full content (only populated if user has access)
  readonly technicalAnalysis?: TechnicalAnalysis;
  readonly mitreTechniques: readonly MitreTechnique[];
  readonly iocs: readonly IOC[];
  readonly timeline: readonly TimelineEvent[];
  readonly detailedRemediation: string; // Markdown - step-by-step remediation
  readonly executiveSummary: string; // Markdown - for C-suite briefings
  readonly threatActorProfile?: string; // Markdown - actor attribution and history
  readonly relatedThreats: readonly string[]; // IDs of related threats
}

/**
 * Armor CTA (Call to Action) for threat response
 */
export interface ArmorCTAData {
  readonly type: 'service' | 'product' | 'consultation';
  readonly title: string;
  readonly url: string;
}

/**
 * Complete Threat entity (detail view)
 */
export interface Threat {
  readonly id: string; // UUID
  readonly title: string;
  readonly summary: string;
  readonly content: string; // Markdown format
  readonly severity: Severity;
  readonly category: ThreatCategory;
  readonly source: string; // Feed source name
  readonly sourceUrl: string | null;
  readonly publishedAt: string; // ISO 8601 date string
  readonly createdAt: string; // ISO 8601 date string
  readonly updatedAt: string; // ISO 8601 date string
  readonly cves: readonly CVE[];
  readonly tags: readonly string[];
  readonly viewCount: number;
  readonly isBookmarked?: boolean;
  // New fields for enhanced threat intelligence display
  readonly externalReferences: readonly ExternalReference[];
  readonly industries: readonly Industry[];
  readonly recommendations: readonly Recommendation[];
  // Premium Deep Dive content (gated for paid users)
  readonly deepDive?: DeepDive;
  // AI Enrichment fields from backend
  readonly threatType?: string; // AI-classified threat type
  readonly attackVector?: string; // How the attack was/could be executed
  readonly impactAssessment?: string; // Detailed analysis of potential impact
  readonly recommendedActions?: readonly string[]; // AI-generated security recommendations
  readonly armorCta?: ArmorCTAData; // Call-to-action for Armor services
  readonly iocs?: readonly IOC[]; // Indicators of Compromise
}

/**
 * Lightweight Threat summary (list view)
 */
export interface ThreatSummary {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly severity: Severity;
  readonly category: ThreatCategory;
  readonly source: string;
  readonly publishedAt: string; // ISO 8601 date string
  readonly cves: readonly string[]; // CVE IDs only
  readonly isBookmarked?: boolean;
  // New fields for list view
  readonly industries: readonly Industry[];
  readonly hasDeepDive: boolean; // Indicates premium content available
}

/**
 * Date range filter
 */
export interface DateRange {
  readonly start: string; // ISO 8601 date string
  readonly end: string; // ISO 8601 date string
}

/**
 * Threat filtering criteria
 */
export interface ThreatFilters {
  readonly severity?: readonly Severity[];
  readonly category?: readonly ThreatCategory[];
  readonly source?: readonly string[];
  readonly dateRange?: DateRange;
  readonly search?: string;
}
