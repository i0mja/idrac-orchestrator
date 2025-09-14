import { FastifyInstance } from 'fastify';
import hostQueue from '../orchestration/queue.js';
import db from '../db/index.js';
import { updatePlans, planTargets, artifacts, hostRuns } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';

export default async function plansRoutes(app: FastifyInstance) {
  app.post('/plans', async (request) => {
    const body = request.body as any;
    const [plan] = await db.insert(updatePlans).values({ name: body.name, policy: body.policy ?? {} }).returning();
    if (Array.isArray(body.targets) && body.targets.length) {
      await db.insert(planTargets).values(body.targets.map((hostId: string) => ({ planId: plan.id, hostId })));
    }
    if (Array.isArray(body.artifacts) && body.artifacts.length) {
      await db.insert(artifacts).values(body.artifacts.map((a: any) => ({ planId: plan.id, component: a.component, imageUri: a.imageUri })));
    }
    return { id: plan.id };
  });

  app.post('/plans/:id/start', async (request) => {
    const { id } = request.params as { id: string };
    const { dryRun } = request.query as { dryRun?: string };

    const targets = await db.select({ hostId: planTargets.hostId }).from(planTargets).where(eq(planTargets.planId, id));
    if (dryRun === 'true') return { dryRun: true, planId: id, targets: targets.map(t => t.hostId) };

    // Create host_runs + enqueue jobs
    for (const t of targets) {
      const [run] = await db.insert(hostRuns).values({ planId: id, hostId: t.hostId, state: 'PRECHECKS', ctx: {} }).returning();
      await hostQueue.add('host', { hostId: t.hostId, hostRunId: run.id }, { jobId: `plan:${id}:host:${t.hostId}` });
    }
    return { started: true, count: targets.length };
  });

  app.get('/plans/:id/status', async (request) => {
    const { id } = request.params as { id: string };
    const rows = await db.select().from(hostRuns).where(eq(hostRuns.planId, id));
    return { id, hosts: rows };
  });

  app.get('/plans/:id/report', async (request) => {
    const { id } = request.params as { id: string };
    const rows = await db.select().from(hostRuns).where(eq(hostRuns.planId, id));
    return { id, components: [], runs: rows };
  });
}
