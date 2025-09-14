export type DetectFns = {
  redfish: () => Promise<boolean>;
  wsman: () => Promise<boolean>;
  racadm: () => Promise<boolean>;
  ipmi?: () => Promise<boolean>;
};

export async function detectCapabilities(fns: DetectFns) {
  const redfish = await fns.redfish().catch(() => false);
  if (redfish) return { mgmtKind: 'idrac9', features: { redfish: true, wsman: false, racadm: false, ipmi: false } };

  const wsman = await fns.wsman().catch(() => false);
  if (wsman) return { mgmtKind: 'idrac7', features: { redfish: false, wsman: true, racadm: false, ipmi: false } };

  const racadm = await fns.racadm().catch(() => false);
  if (racadm) return { mgmtKind: 'drac5', features: { redfish: false, wsman: false, racadm: true, ipmi: false } };

  const ipmi = fns.ipmi ? await fns.ipmi().catch(() => false) : false;
  return { mgmtKind: 'unknown', features: { redfish: false, wsman: false, racadm: false, ipmi } };
}
