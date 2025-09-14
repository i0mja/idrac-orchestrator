import { FastifyInstance } from 'fastify';
import { detectCapabilities } from '../lib/detect.js';

export default async function hostsRoutes(app: FastifyInstance) {
  app.post('/hosts', async (request) => {
    return { status: 'ok', body: request.body };
  });

  app.get('/hosts/:id', async (request) => {
    const { id } = request.params as { id: string };
    return { id };
  });

  app.post('/hosts/:id/discover', async (request) => {
    const result = await detectCapabilities({
      redfish: async () => false,
      wsman: async () => false,
      racadm: async () => false,
    });
    return result;
  });

  app.post('/hosts/:id/test-credentials', async () => {
    return { success: true };
  });
}
