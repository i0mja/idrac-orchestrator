import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProtocolManager } from '../src/lib/protocols/protocolManager.js';
import type {
  Credentials,
  FirmwareUpdateRequest,
  FirmwareUpdateResult,
  ProtocolCapability,
  ProtocolClient,
  ProtocolHealth,
  ServerIdentity
} from '../src/lib/protocols/types.js';

class MockClient implements ProtocolClient {
  constructor(
    public protocol: any,
    private capability: Partial<ProtocolCapability>,
    private updateResult: Partial<FirmwareUpdateResult>,
    private shouldThrow = false
  ) {}
  readonly priority = this.protocol === 'REDFISH' ? 10 : this.protocol === 'WSMAN' ? 20 : 30;
  async detectCapability(_identity: ServerIdentity, _credentials: Credentials): Promise<ProtocolCapability> {
    if (this.shouldThrow) throw new Error('detect failed');
    return {
      protocol: this.protocol,
      supported: Boolean(this.capability.supported),
      updateModes: this.capability.updateModes ?? ['SIMPLE_UPDATE'],
      generation: '16G',
      ...this.capability
    } as ProtocolCapability;
  }
  async healthCheck(_identity: ServerIdentity, _credentials: Credentials): Promise<ProtocolHealth> {
    return { protocol: this.protocol, status: 'healthy', checkedAt: Date.now() };
  }
  async performFirmwareUpdate(_request: FirmwareUpdateRequest): Promise<FirmwareUpdateResult> {
    if (this.shouldThrow) throw new Error(`${this.protocol} failure`);
    return {
      protocol: this.protocol,
      status: 'COMPLETED',
      startedAt: Date.now(),
      messages: [],
      ...this.updateResult
    } as FirmwareUpdateResult;
  }
  async close() {}
}

test('protocol manager falls back to next protocol on failure', async () => {
  const clients: ProtocolClient[] = [
    new MockClient('REDFISH', { supported: true }, {}, true),
    new MockClient('WSMAN', { supported: true }, { taskLocation: 'task-1' })
  ];
  const manager = new ProtocolManager(clients);
  const result = await manager.runUpdate({
    host: 'idrac.example.com',
    credentials: { username: 'root', password: 'calvin' },
    mode: 'SIMPLE_UPDATE',
    components: [{ id: 'BIOS', imageUri: 'http://example.com/bios.exe' }]
  });
  assert.equal(result.protocol, 'WSMAN');
  await manager.dispose();
});

test('protocol manager returns detection results for all clients', async () => {
  const clients: ProtocolClient[] = [
    new MockClient('REDFISH', { supported: true, updateModes: ['SIMPLE_UPDATE'] }, {}),
    new MockClient('RACADM', { supported: false }, {})
  ];
  const manager = new ProtocolManager(clients);
  const detection = await manager.detect({ host: 'host' }, { username: 'root', password: 'calvin' });
  assert.equal(detection.capabilities.length, 2);
  assert.ok(detection.capabilities[0].supported);
  await manager.dispose();
});
