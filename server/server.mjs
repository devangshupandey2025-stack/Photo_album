import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const requiredEnv = [
  'B2_REGION',
  'B2_BUCKET',
  'B2_KEY_ID',
  'B2_APPLICATION_KEY',
];

const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  console.warn(`Missing B2 env values: ${missingEnv.join(', ')}`);
}

const app = express();
const port = Number(process.env.PORT || 8787);
const bucket = process.env.B2_BUCKET;
const endpointOverride = process.env.B2_ENDPOINT?.replace(/^B2_ENDPOINT=/, '').trim();
const endpoint = endpointOverride || `https://s3.${process.env.B2_REGION}.backblazeb2.com`;
const keyPrefix = (process.env.B2_KEY_PREFIX || 'lumina').replace(/^\/+|\/+$/g, '');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 250 * 1024 * 1024,
    files: 10,
  },
});

const s3 = new S3Client({
  endpoint,
  region: process.env.B2_REGION,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID || '',
    secretAccessKey: process.env.B2_APPLICATION_KEY || '',
  },
  forcePathStyle: true,
});

function safeFilename(filename) {
  return filename
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'upload';
}

function objectUrl(key) {
  return `/api/files/${encodeURIComponent(key)}`;
}

function logB2Error(context, error) {
  console.error(context, {
    name: error?.name,
    message: error?.message,
    code: error?.Code,
    httpStatusCode: error?.$metadata?.httpStatusCode,
    requestId: error?.$metadata?.requestId,
  });
}

app.use(cors({ origin: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    bucketConfigured: Boolean(bucket),
    endpoint,
  });
});

app.post('/api/upload', upload.array('files'), async (req, res) => {
  if (!bucket || missingEnv.length > 0) {
    return res.status(500).json({ error: `Server is missing B2 config: ${missingEnv.join(', ')}` });
  }

  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ error: 'No files were uploaded.' });
  }

  try {
    const uploaded = await Promise.all(files.map(async (file) => {
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const id = crypto.randomUUID();
      const filename = safeFilename(file.originalname);
      const key = `${keyPrefix}/${day}/${id}-${filename}`;

      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
        ContentLength: file.size,
      }));

      return {
        id,
        key,
        url: objectUrl(key),
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
      };
    }));

    res.json({ files: uploaded });
  } catch (error) {
    logB2Error('B2 upload failed:', error);
    res.status(502).json({ error: 'Backblaze B2 upload failed.' });
  }
});

app.get('/api/files/:key', async (req, res) => {
  if (!bucket || missingEnv.length > 0) {
    return res.status(500).json({ error: `Server is missing B2 config: ${missingEnv.join(', ')}` });
  }

  try {
    const key = decodeURIComponent(req.params.key);
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

    if (result.ContentType) res.setHeader('Content-Type', result.ContentType);
    if (result.ContentLength) res.setHeader('Content-Length', String(result.ContentLength));
    res.setHeader('Cache-Control', 'private, max-age=3600');

    result.Body.pipe(res);
  } catch (error) {
    logB2Error('B2 read failed:', error);
    res.status(404).json({ error: 'File not found.' });
  }
});

app.delete('/api/files/:key', async (req, res) => {
  if (!bucket || missingEnv.length > 0) {
    return res.status(500).json({ error: `Server is missing B2 config: ${missingEnv.join(', ')}` });
  }

  try {
    const key = decodeURIComponent(req.params.key);
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    res.json({ ok: true });
  } catch (error) {
    logB2Error('B2 delete failed:', error);
    res.status(502).json({ error: 'Backblaze B2 delete failed.' });
  }
});

app.use(express.static(path.join(rootDir, 'dist')));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(rootDir, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Lumina API listening on http://localhost:${port}`);
});
