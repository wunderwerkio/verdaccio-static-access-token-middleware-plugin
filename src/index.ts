import type { EnrichedConfig } from './types';
import StaticAccessTokenMiddlewarePlugin from './middleware';

/**
 * Creates middleware plugin instance.
 *
 * @param config - The config object.
 */
export default function (config: EnrichedConfig): StaticAccessTokenMiddlewarePlugin {
  return new StaticAccessTokenMiddlewarePlugin(config);
}
