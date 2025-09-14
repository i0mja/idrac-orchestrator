import { FastifyInstance } from 'fastify';
import db from '../db/index.js';
import { hostRuns } from '../db/schema.js';
import { hostQueue } from '../orchestration/queue.js';

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    try {
      await db.select({ n: hostRuns.id }).from(hostRuns).limit(1);
      await hostQueue.getJobCounts();
      return { status: 'ok' };
    } catch (e) {
      return { status: 'degraded', error: (e as Error).message };
    }
  });
}
