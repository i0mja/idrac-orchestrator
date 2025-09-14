import { FastifyInstance } from 'fastify';
import hostQueue from '../orchestration/queue.js';

export default async function plansRoutes(app: FastifyInstance) {
  app.post('/plans', async (request) => {
    const body = request.body as any;
    return { id: 'plan-' + Date.now(), ...body };
  });

  app.post('/plans/:id/start', async (request) => {
    const { id } = request.params as { id: string };
    const { dryRun } = request.query as { dryRun?: string };
    if (dryRun === 'true') {
      app.log.info({ id }, 'dry run start');
      return { dryRun: true };
    }
    await hostQueue.add('host', { hostId: 'example' });
    return { started: true };
  });

  app.get('/plans/:id/status', async (request) => {
    const { id } = request.params as { id: string };
    return { id, hosts: [] };
  });

  app.get('/plans/:id/report', async (request) => {
    const { id } = request.params as { id: string };
    return { id, components: [] };
  });
}
