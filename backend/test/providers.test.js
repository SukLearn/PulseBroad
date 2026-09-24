import test from 'node:test';
import assert from 'node:assert/strict';
import { checkGoogle } from '../src/status-providers/google.js';
import { checkCloudflare } from '../src/status-providers/cloudflare.js';
import { checkAws } from '../src/status-providers/aws.js';

test('malformed provider responses never report operational', async () => {
  await assert.rejects(() => checkGoogle({ fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }), /Invalid Google/);
  await assert.rejects(() => checkCloudflare({ fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }), /Invalid Cloudflare/);
  await assert.rejects(() => checkAws({ fetchImpl: async () => ({ ok: true, text: async () => '<html>error</html>' }) }), /Invalid AWS/);
});
