import { Queue } from 'bullmq';
import config from '../config/index.js';

export const hostQueue = new Queue('host-update', {
  connection: { url: config.REDIS_URL },
});

export default hostQueue;
