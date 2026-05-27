import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const REQUIRED_ENV = [
  'B2_REGION',
  'B2_BUCKET',
  'B2_KEY_ID',
  'B2_APPLICATION_KEY',
];

function getB2Config() {
  const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]);
  const region = process.env.B2_REGION || '';
  const bucket = process.env.B2_BUCKET || '';
  const endpointOverride = process.env.B2_ENDPOINT?.replace(/^B2_ENDPOINT=/, '').trim();
  const endpoint = endpointOverride || (region ? `https://s3.${region}.backblazeb2.com` : '');
  const keyPrefix = (process.env.B2_KEY_PREFIX || 'lumina').replace(/^\/+|\/+$/g, '');

  return {
    missingEnv,
    region,
    bucket,
    endpoint,
    keyPrefix,
    credentials: {
      accessKeyId: process.env.B2_KEY_ID || '',
      secretAccessKey: process.env.B2_APPLICATION_KEY || '',
    },
  };
}

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

export function createB2App() {
  const config = getB2Config();
  if (config.missingEnv.length > 0) {
    console.warn(`Missing B2 env values: ${config.missingEnv.join(', ')}`);
  }

  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 250 * 1024 * 1024,
      files: 10,
    },
  });
  const s3 = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: config.credentials,
    forcePathStyle: true,
  });

  app.use(cors({ origin: true }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      bucketConfigured: Boolean(config.bucket),
      endpoint: config.endpoint,
    });
  });

  app.post('/api/upload', upload.array('files'), async (req, res) => {
    if (!config.bucket || config.missingEnv.length > 0) {
      return res.status(500).json({ error: `Server is missing B2 config: ${config.missingEnv.join(', ')}` });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }

    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const day = new Date().toISOString().slice(0, 10);
        const id = crypto.randomUUID();
        const filename = safeFilename(file.originalname);
        const key = `${config.keyPrefix}/${day}/${id}-${filename}`;

        await s3.send(new PutObjectCommand({
          Bucket: config.bucket,
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
    if (!config.bucket || config.missingEnv.length > 0) {
      return res.status(500).json({ error: `Server is missing B2 config: ${config.missingEnv.join(', ')}` });
    }

    try {
      const key = decodeURIComponent(req.params.key);
      const result = await s3.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));

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
    if (!config.bucket || config.missingEnv.length > 0) {
      return res.status(500).json({ error: `Server is missing B2 config: ${config.missingEnv.join(', ')}` });
    }

    try {
      const key = decodeURIComponent(req.params.key);
      await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
      res.json({ ok: true });
    } catch (error) {
      logB2Error('B2 delete failed:', error);
      res.status(502).json({ error: 'Backblaze B2 delete failed.' });
    }
  });

  return app;
}
