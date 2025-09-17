import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const DEFAULT_UPLOAD_DIR = process.env.FIRMWARE_UPLOAD_DIR || path.join(process.cwd(), 'uploads');

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

export default async function uploadsRoutes(app: FastifyInstance) {
  app.post('/uploads/firmware', async (request, reply) => {
    const file = await (request as any).file();
    if (!file) {
      reply.code(400).send({ error: 'missing_file' });
      return;
    }

    await fs.promises.mkdir(DEFAULT_UPLOAD_DIR, { recursive: true });
    const filename = `${Date.now()}-${safeFileName(file.filename || 'firmware.bin')}`;
    const targetPath = path.join(DEFAULT_UPLOAD_DIR, filename);

    await pipeline(file.file, fs.createWriteStream(targetPath));
    const uri = `file://${targetPath}`;

    return { ok: true, path: targetPath, uri, filename };
  });
}
