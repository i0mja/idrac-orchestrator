import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createClient } from '../src/lib/vcenter/index.js';

test('waitTask resolves success', async () => {
  const client = createClient('http://vcenter.local', 'token');
  let calls = 0;
  const fetchStub = async () => {
    calls++;
    if (calls < 2) {
      return { json: async () => ({ value: { state: 'RUNNING' } }) } as any;
    }
    return { json: async () => ({ value: { state: 'SUCCEEDED' } }) } as any;
  };
  const res = await client.waitTask('123', 3000, fetchStub);
  assert.equal(res, 'success');
});

test('waitTask resolves error on failure state', async () => {
  const client = createClient('http://vcenter.local', 'token');
  const fetchStub = async () => ({ json: async () => ({ value: { state: 'FAILED' } }) }) as any;
  const res = await client.waitTask('123', 1000, fetchStub);
  assert.equal(res, 'error');
});
