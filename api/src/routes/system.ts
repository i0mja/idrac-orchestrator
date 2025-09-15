import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import db from '../db/index.js';
import { systemConfig } from '../db/schema.js';

const KEY = 'initial_setup';

type SetupValue = Record<string, unknown>;

export default async function systemRoutes(app: FastifyInstance) {
  app.get('/system/setup', async () => {
    const rows = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, KEY));
    return rows[0]?.value ?? null;
  });

  app.put(
    '/system/setup',
    async (
      req: FastifyRequest<{ Body: SetupValue | null }>,
      reply: FastifyReply
    ) => {
      const value = req.body;
      if (!value) {
        return reply.code(400).send({ error: 'missing_value' });
      }

      await db
        .insert(systemConfig)
        .values({ key: KEY, value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: systemConfig.key,
          set: { value, updatedAt: new Date() }
        });

      return { ok: true };
    }
  );
}
