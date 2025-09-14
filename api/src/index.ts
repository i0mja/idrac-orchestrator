import './lib/http/tls.js';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import config from './config/index.js';
import hostsRoutes from './routes/hosts.js';
import plansRoutes from './routes/plans.js';
import healthRoutes from './routes/health.js';

const app = Fastify({ logger: { transport: { target: 'pino-pretty' } } });

await app.register(swagger, {
  openapi: { info: { title: 'iDRAC Orchestrator API', version: '1.0.0' } }
});
await app.register(swaggerUi, { routePrefix: '/docs' });

app.addHook('preHandler', (req, reply, done) => {
  const auth = req.headers['authorization'];
  if (config.API_KEY && auth !== `Bearer ${config.API_KEY}`) {
    reply.code(401).send({ error: 'unauthorized' });
    return;
  }
  done();
});

app.register(hostsRoutes);
app.register(plansRoutes);
app.register(healthRoutes);

// Start the BullMQ worker on boot
await import('./workers/hostWorker.js');

app.listen({ port: config.API_PORT, host: '0.0.0.0' })
  .then((addr) => app.log.info(`listening on ${addr}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
