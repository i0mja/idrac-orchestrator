import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import db from '../db/index.js';
import { vcenters } from '../db/schema.js';

interface VCenterBody {
  name: string;
  hostname: string;
  username: string;
  password: string;
  port?: number;
  ignore_ssl?: boolean;
}

interface VCenterParams {
  id: string;
}

export default async function vcentersRoutes(app: FastifyInstance) {
  app.get('/vcenters', async () => {
    return db.select().from(vcenters);
  });

  app.post(
    '/vcenters',
    async (
      req: FastifyRequest<{ Body: VCenterBody }>,
      reply: FastifyReply
    ) => {
      const body = req.body;
      if (!body?.name || !body?.hostname || !body?.username || !body?.password) {
        return reply.code(400).send({ error: 'missing_fields' });
      }

      const [row] = await db
        .insert(vcenters)
        .values({
          name: body.name,
          hostname: body.hostname,
          username: body.username,
          password: body.password,
          port: body.port ?? 443,
          ignoreSsl: body.ignore_ssl ?? true
        })
        .returning();

      return reply.code(201).send(row);
    }
  );

  app.put(
    '/vcenters/:id',
    async (
      req: FastifyRequest<{ Params: VCenterParams; Body: VCenterBody }>,
      reply: FastifyReply
    ) => {
      const { id } = req.params;
      const body = req.body;

      if (!body?.name || !body?.hostname || !body?.username || !body?.password) {
        return reply.code(400).send({ error: 'missing_fields' });
      }

      const [row] = await db
        .update(vcenters)
        .set({
          name: body.name,
          hostname: body.hostname,
          username: body.username,
          password: body.password,
          port: body.port ?? 443,
          ignoreSsl: body.ignore_ssl ?? true,
          updatedAt: new Date()
        })
        .where(eq(vcenters.id, id))
        .returning();

      if (!row) {
        return reply.code(404).send({ error: 'not_found' });
      }

      return row;
    }
  );

  app.delete(
    '/vcenters/:id',
    async (
      req: FastifyRequest<{ Params: VCenterParams }>,
      reply: FastifyReply
    ) => {
      const { id } = req.params;

      const [row] = await db.delete(vcenters).where(eq(vcenters.id, id)).returning();
      if (!row) {
        return reply.code(404).send({ error: 'not_found' });
      }

      return { deleted: true, id };
    }
  );
}
