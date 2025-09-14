import { FastifyInstance } from 'fastify';
import db from '../db/index.js';
import { hosts } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { detectCapabilities } from '../lib/detect.js';

export default async function hostsRoutes(app: FastifyInstance) {
  app.post('/hosts', async (request) => {
    const body = request.body as any;
    const items = Array.isArray(body) ? body : [body];
    // @ts-ignore
    const rows = await db.insert(hosts).values(items.map((h: any) => ({
      fqdn: h.fqdn, mgmtIp: h.mgmtIp, model: h.model ?? null, serviceTag: h.serviceTag ?? null,
      vcenterUrl: h.vcenterUrl ?? null, clusterMoid: h.clusterMoid ?? null, hostMoid: h.hostMoid ?? null, tags: h.tags ?? null
    }))).returning();
    return { inserted: rows.length, ids: rows.map(r => r.id) };
  });

  app.get('/hosts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [row] = await db.select().from(hosts).where(eq(hosts.id, id));
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return row;
  });

  app.post('/hosts/:id/discover', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [row] = await db.select().from(hosts).where(eq(hosts.id, id));
    if (!row) return reply.code(404).send({ error: 'not_found' });

    const res = await detectCapabilities({
      redfish: async () => {
        try { const r = await fetch(`https://${row.mgmtIp}/redfish/v1/`); return r.ok; } catch { return false; }
      },
      wsman: async () => false,
      racadm: async () => false
    });
    await db.update(hosts).set({ mgmtKind: res.mgmtKind }).where(eq(hosts.id, id));
    return res;
  });

  app.post('/hosts/:id/test-credentials', async () => {
    // stub for now
    return { ok: true };
  });
}
