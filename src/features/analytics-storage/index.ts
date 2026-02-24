/**
 * Analytics storage feature (shell).
 *
 * This feature has no lifecycle actions of its own — it exists to satisfy
 * hook-app's feature registration pattern and to re-export the store/query
 * helpers for use by other features and entrypoints.
 */
import type { RegisterContext } from 'hook-app';

const FEATURE_NAME = 'analytics-storage';

export default ({ registerAction }: RegisterContext) => {
  registerAction({
    hook: '$INIT_FEATURE',
    name: FEATURE_NAME,
    handler: () => {
      console.log('[Analytics Storage] Initialized');
    },
  });
};

export type {
  AnalyticsSummary,
  AudienceMetricPoint,
  ContentMetricPoint,
  DemographicsSnapshot,
} from './queries.js';
export {
  getAudienceMetrics,
  getAvailableDateRange,
  getContentMetrics,
  getDemographicsSnapshot,
  getLatestSummary,
} from './queries.js';
export { storeAnalyticsResult } from './store.js';
