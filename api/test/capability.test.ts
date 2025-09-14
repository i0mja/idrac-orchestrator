import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { detectCapabilities } from '../src/lib/detect.js';

test('detect redfish capability', async () => {
  const result = await detectCapabilities({
    redfish: async () => true,
    wsman: async () => false,
    racadm: async () => false,
  });
  assert.equal(result.mgmtKind, 'idrac9');
  assert.equal(result.features.redfish, true);
});

test('fallback to unknown', async () => {
  const result = await detectCapabilities({
    redfish: async () => false,
    wsman: async () => false,
    racadm: async () => false,
  });
  assert.equal(result.mgmtKind, 'unknown');
});
