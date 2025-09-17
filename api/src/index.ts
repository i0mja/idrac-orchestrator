import './lib/http/tls.js'; // set Undici TLS agent early
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import config from './config/index.js';
import hostsRoutes from './routes/hosts.js';
import plansRoutes from './routes/plans.js';
import healthRoutes from './routes/health.js';
import vcentersRoutes from './routes/vcenters.js';
import systemRoutes from './routes/system.js';
import uploadsRoutes from './routes/uploads.js';

const app = Fastify({ logger: { transport: { target: 'pino-pretty' } } });

await app.register(cors, { origin: true, credentials: true });
await app.register(swagger, { openapi: { info: { title: 'iDRAC Orchestrator API', version: '1.0.0' } } });
await app.register(swaggerUi, { routePrefix: '/docs' });
await app.register(multipart);

// Simple API key auth
app.addHook('preHandler', (req, reply, done) => {
  if (req.method === 'OPTIONS') {
    done();
    return;
  }
  const auth = req.headers['authorization'];
  if (config.API_KEY && auth !== `Bearer ${config.API_KEY}`) {
    reply.code(401).send({ error: 'unauthorized' });
    return;
  }
  done();
});

// Routes
app.register(hostsRoutes);
app.register(plansRoutes);
app.register(healthRoutes);
app.register(vcentersRoutes);
app.register(systemRoutes);
app.register(uploadsRoutes);

// Start worker
if (process.env.DISABLE_WORKER !== 'true') {
  await import('./workers/hostWorker.js');
}

app.listen({ port: config.API_PORT, host: '0.0.0.0' })
  .then(addr => app.log.info(`listening on ${addr}`))
  .catch(err => { app.log.error(err); process.exit(1); });
