/**
 * Cron Job Configuration Utilities
 * 
 * This module provides utilities for managing cron job feature flags
 * and configuration settings for the GOALETE meeting management system.
 */

export interface CronJobConfig {
  /** Master toggle for all cron job execution */
  cronJobsEnabled: boolean;
}

export interface CronJobStatus {
  /** Overall cron job system status */
  enabled: boolean;
  /** Configuration source */
  source: 'environment' | 'default';
  /** Last check timestamp */
  timestamp: string;
}

/**
 * Get current cron job configuration from environment variables
 */
export function getCronJobConfig(): CronJobConfig {
  return {
    cronJobsEnabled: process.env.ENABLE_CRON_JOBS !== 'false' // Defaults to true
  };
}

/**
 * Get current cron job status with detailed information
 */
export function getCronJobStatus(): CronJobStatus {
  const config = getCronJobConfig();
  
  return {
    enabled: config.cronJobsEnabled,
    source: 'environment',
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if a specific cron job feature is enabled
 */
export function isCronFeatureEnabled(feature: 'meeting-creation' | 'email-notifications'): boolean {
  const config = getCronJobConfig();
  
  if (!config.cronJobsEnabled) {
    return false;
  }
  
  // All features are enabled when cron jobs are enabled
  return true;
}

/**
 * Get a human-readable status message for cron job configuration
 */
export function getCronJobStatusMessage(): string {
  const config = getCronJobConfig();
  
  if (!config.cronJobsEnabled) {
    return "All cron jobs are disabled";
  }
  
  return "All cron job features are enabled";
}

/**
 * Cron job configuration constants
 */
export const CRON_JOB_DEFAULTS = {
  CRON_JOBS_ENABLED: true
} as const;

/**
 * Cron job feature descriptions for documentation
 */
export const CRON_FEATURE_DESCRIPTIONS = {
  'master-toggle': 'Master switch for all cron job execution',
  'meeting-creation': 'Automatically create daily meetings for active subscriptions',
  'email-notifications': 'Send meeting invite emails to active subscribers'
} as const;
