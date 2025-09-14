import { detectCapabilities } from '../lib/detect.js';
import * as redfish from '../lib/redfish/client.js';
import * as lc from '../lib/lc/index.js';
import * as racadm from '../lib/racadm/index.js';

export type HostRunState =
  | 'PRECHECKS' | 'ENTER_MAINT' | 'APPLY' | 'REBOOT' | 'POSTCHECKS' | 'EXIT_MAINT' | 'DONE' | 'ERROR';

export async function runStateMachine(hostId: string): Promise<HostRunState> {
  // TODO: load host + plan/artifacts from DB using hostId; for now, demonstrate detection + one apply
  const caps = await detectCapabilities({
    redfish: async () => {
      try { const res = await fetch(`https://${hostId}/redfish/v1/`); return res.ok; } catch { return false; }
    },
    wsman: async () => false, // implement real LC probe later
    racadm: async () => false
  });

  // DEMO: choose path (real code should loop through artifacts, handle vCenter maintenance, etc.)
  if (caps.features.redfish) {
    // redfish path would: POST SimpleUpdate (one image per call), wait, reboot if needed
    return 'DONE';
  } else if (caps.features.wsman) {
    await lc.stageDup(hostId, 'image'); // placeholder
    return 'DONE';
  } else {
    await racadm.fwupdate(hostId, 'image');
    return 'DONE';
  }
}
