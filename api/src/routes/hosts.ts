import { FastifyInstance } from 'fastify';
import db from '../db/index.js';
import { hosts } from '../db/schema.js';
import { detectCapabilities } from '../lib/detect.js';
import { eq } from 'drizzle-orm';

export default async function hostsRoutes(app: FastifyInstance) {
  app.post('/hosts', async (request) => {
    const body = request.body as any;
    const items = Array.isArray(body) ? body : [body];
    const rows = items.map((h: any) => ({
      fqdn: h.fqdn, mgmtIp: h.mgmtIp, model: h.model ?? null, serviceTag: h.serviceTag ?? null,
      vcenterUrl: h.vcenterUrl ?? null, clusterMoid: h.clusterMoid ?? null, hostMoid: h.hostMoid ?? null, tags: h.tags ?? null
    }));
    // @ts-ignore drizzle insert
    await db.insert(hosts).values(rows);
    return { inserted: rows.length };
  });

  app.get('/hosts/:id', async (request) => {
    const { id } = request.params as { id: string };
    const [row] = await db.select().from(hosts).where(eq(hosts.id, id));
    return row ?? { id };
  });

  app.post('/hosts/:id/discover', async (request) => {
    const { id } = request.params as { id: string };
    const [row] = await db.select().from(hosts).where(eq(hosts.id, id));
    if (!row) return { error: 'not_found' };

    const result = await detectCapabilities({
      redfish: async () => {
        try { const r = await fetch(`https://${row.mgmtIp}/redfish/v1/`); return r.ok; } catch { return false; }
      },
      wsman: async () => false,
      racadm: async () => false
    });

    await db.update(hosts).set({ mgmtKind: result.mgmtKind }).where(eq(hosts.id, id));
    return result;
  });

  app.post('/hosts/:id/test-credentials', async () => {
    // TODO: attempt a lightweight Redfish GET and/or vCenter login
    return { success: true };
  });
}
