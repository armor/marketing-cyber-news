import type { Severity, ThreatCategory } from './threat';

/**
 * Alert criteria for matching threats
 */
export interface AlertCriteria {
  readonly keywords: readonly string[];
  readonly severities: readonly Severity[];
  readonly categories: readonly ThreatCategory[];
  readonly sources: readonly string[];
}

/**
 * Alert entity - custom notification rule created by user
 */
export interface Alert {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly description: string | null;
  readonly isEnabled: boolean;
  readonly criteria: AlertCriteria;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastTriggeredAt: string | null;
  readonly matchCount: number;
}

/**
 * Alert match - records when an alert matched a threat
 */
export interface AlertMatch {
  readonly alertId: string;
  readonly threatId: string;
  readonly matchedAt: string;
  readonly matchedKeywords: readonly string[];
}

/**
 * Input for creating a new alert
 */
export interface CreateAlertInput {
  readonly name: string;
  readonly description?: string;
  readonly criteria: AlertCriteria;
}

/**
 * Input for updating an existing alert
 */
export interface UpdateAlertInput {
  readonly name?: string;
  readonly description?: string;
  readonly isEnabled?: boolean;
  readonly criteria?: Partial<AlertCriteria>;
}
