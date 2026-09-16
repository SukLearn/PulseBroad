import { checkGoogle } from './google.js';
import { checkCloudflare } from './cloudflare.js';
import { checkAws } from './aws.js';

const adapters = { google: checkGoogle, cloudflare: checkCloudflare, aws: checkAws };

export async function monitorProvider(service, options = {}) {
  const adapter = adapters[service.provider_key];
  if (!adapter) throw new Error(`Unknown status provider: ${service.provider_key}`);
  return adapter({ timeoutMs: service.timeout_ms ?? options.defaultTimeoutMs, ...options });
}

