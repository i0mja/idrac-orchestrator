import { ProtocolManager, ProtocolManagerOptions } from './protocolManager.js';
import { RedfishProtocolClient } from './redfish.js';
import { WsmanProtocolClient } from './wsman.js';
import { RacadmProtocolClient } from './racadm.js';
import { IpmiProtocolClient } from './ipmi.js';
import { SshProtocolClient } from './ssh.js';
import type { Credentials, FirmwareUpdateRequest, ProtocolDetectionResult, ServerIdentity } from './types.js';

export * from './types.js';
export * from './protocolManager.js';

export function createDefaultProtocolManager(options: ProtocolManagerOptions = {}) {
  const clients = [
    new RedfishProtocolClient(),
    new WsmanProtocolClient(),
    new RacadmProtocolClient(),
    new IpmiProtocolClient(),
    new SshProtocolClient()
  ];
  return new ProtocolManager(clients, options);
}

export async function detectProtocols(identity: ServerIdentity, credentials: Credentials, options: ProtocolManagerOptions = {}): Promise<ProtocolDetectionResult> {
  const manager = createDefaultProtocolManager(options);
  try {
    return await manager.detect(identity, credentials);
  } finally {
    await manager.dispose();
  }
}

export async function executeWithFallback(request: FirmwareUpdateRequest, options: ProtocolManagerOptions = {}) {
  const manager = createDefaultProtocolManager(options);
  try {
    return await manager.runUpdate(request);
  } finally {
    await manager.dispose();
  }
}
