import { detectProtocols } from './protocols/index.js';
import type { Credentials, ProtocolDetectionResult, ServerIdentity } from './protocols/types.js';

export interface DetectRequest {
  host: string;
  credentials: Credentials;
  identity?: Partial<ServerIdentity>;
}

export async function detectCapabilities(request: DetectRequest): Promise<ProtocolDetectionResult> {
  const identity: ServerIdentity = {
    host: request.host,
    ...request.identity
  };
  return detectProtocols(identity, request.credentials);
}
