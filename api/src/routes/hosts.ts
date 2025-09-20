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

    const body = (request.body ?? {}) as { username?: string; password?: string };
    if (!body.username || !body.password) {
      return reply.code(400).send({ error: 'missing_credentials' });
    }

    const detection = await detectCapabilities({
      host: row.mgmtIp,
      credentials: { username: body.username, password: body.password },
      identity: { model: row.model ?? undefined, serviceTag: row.serviceTag ?? undefined }
    });

    const primary = detection.healthiestProtocol?.protocol ?? row.mgmtKind;
    await db.update(hosts).set({ mgmtKind: primary ?? null }).where(eq(hosts.id, id));
    return detection;
  });

  app.post('/hosts/:id/test-credentials', async () => {
    // stub for now
    return { ok: true };
  });
}
