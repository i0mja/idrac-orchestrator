export interface Probers {
  redfish: () => Promise<boolean>;
  wsman: () => Promise<boolean>;
  racadm: () => Promise<boolean>;
  ipmi?: () => Promise<boolean>;
}

export interface DetectResult {
  mgmtKind: string;
  features: Record<string, boolean>;
}

export async function detectCapabilities(probers: Probers): Promise<DetectResult> {
  if (await probers.redfish()) {
    return { mgmtKind: 'idrac9', features: { redfish: true } };
  }
  if (await probers.wsman()) {
    return { mgmtKind: 'lc', features: { wsman: true, lc: true } };
  }
  if (await probers.racadm()) {
    return { mgmtKind: 'racadm', features: { racadm: true } };
  }
  const ipmi = probers.ipmi ? await probers.ipmi() : false;
  return { mgmtKind: 'unknown', features: { ipmi } };
}
