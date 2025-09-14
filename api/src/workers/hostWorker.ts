import { Worker } from 'bullmq';
import config from '../config/index.js';
import { runStateMachine } from '../orchestration/stateMachine.js';

export const worker = new Worker('host-update', async (job) => {
  const { hostRunId } = job.data as { hostRunId: string };
  await runStateMachine(hostRunId);
}, { connection: { url: config.REDIS_URL } });

worker.on('failed', (job, err) => {
  console.error('host-update failed', job?.id, err?.message);
});
