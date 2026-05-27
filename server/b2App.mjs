import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REQUIRED_ENV = [
  'B2_REGION',
  'B2_BUCKET',
  'B2_KEY_ID',
  'B2_APPLICATION_KEY',
];

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

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
    manifestKey: `${keyPrefix}/metadata/media-index.json`,
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

function mediaFolder(mediaType) {
  return mediaType === 'video' ? 'videos' : 'images';
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

async function streamToString(body) {
  if (!body) return '';
  if (typeof body.transformToString === 'function') {
    return body.transformToString();
  }

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readMediaIndex(s3, config) {
  try {
    const result = await s3.send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: config.manifestKey,
    }));

    const raw = await streamToString(result.Body);
    const parsed = raw ? JSON.parse(raw) : { items: [] };
    return {
      updatedAt: parsed.updatedAt || null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch (error) {
    const statusCode = error?.$metadata?.httpStatusCode;
    if (statusCode === 404 || error?.name === 'NoSuchKey') {
      return { updatedAt: null, items: [] };
    }

    throw error;
  }
}

async function writeMediaIndex(s3, config, items) {
  const payload = {
    updatedAt: new Date().toISOString(),
    items,
  };

  await s3.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: config.manifestKey,
    Body: JSON.stringify(payload, null, 2),
    ContentType: 'application/json',
    CacheControl: 'no-store',
  }));

  return payload;
}

function validateManifestItem(item, expectedId) {
  if (!item || typeof item !== 'object') return 'Missing media item.';
  if (typeof item.id !== 'string' || !item.id) return 'Media item id is required.';
  if (expectedId && item.id !== expectedId) return 'Media item id does not match the request.';
  if (typeof item.b2Key !== 'string' || !item.b2Key) return 'Media item b2Key is required.';
  if (typeof item.type !== 'string') return 'Media item type is required.';
  return null;
}

export function createB2App() {
  const config = getB2Config();
  if (config.missingEnv.length > 0) {
    console.warn(`Missing B2 env values: ${config.missingEnv.join(', ')}`);
  }

  const app = express();
  const s3 = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: config.credentials,
    forcePathStyle: true,
  });

  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      bucketConfigured: Boolean(config.bucket),
      endpoint: config.endpoint,
      maxUploadBytes: MAX_UPLOAD_BYTES,
    });
  });

  app.post('/api/uploads/sign', (req, res) => {
    void (async () => {
      if (!config.bucket || config.missingEnv.length > 0) {
        res.status(500).json({ error: `Server is missing B2 config: ${config.missingEnv.join(', ')}` });
        return;
      }

      const { filename, contentType, mediaType, size } = req.body || {};
      if (typeof filename !== 'string' || !filename.trim()) {
        res.status(400).json({ error: 'filename is required.' });
        return;
      }
      if (typeof contentType !== 'string' || !contentType.trim()) {
        res.status(400).json({ error: 'contentType is required.' });
        return;
      }
      if (mediaType !== 'image' && mediaType !== 'video') {
        res.status(400).json({ error: 'mediaType must be image or video.' });
        return;
      }
      if (typeof size !== 'number' || size <= 0) {
        res.status(400).json({ error: 'size is required.' });
        return;
      }
      if (size > MAX_UPLOAD_BYTES) {
        res.status(413).json({ error: 'Files must be 200MB or smaller.' });
        return;
      }

      const id = crypto.randomUUID();
      const day = new Date().toISOString().slice(0, 10);
      const key = `${config.keyPrefix}/${mediaFolder(mediaType)}/${day}/${id}-${safeFilename(filename)}`;

      const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ContentType: contentType,
      }), {
        expiresIn: 900,
      });

      res.json({
        id,
        key,
        uploadUrl,
        url: objectUrl(key),
        filename,
        contentType,
        size,
        mediaType,
      });
    })().catch((error) => {
      logB2Error('B2 signing failed:', error);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Could not create B2 upload URL.' });
      }
    });
  });

  app.get('/api/media', (_req, res) => {
    void (async () => {
      if (!config.bucket || config.missingEnv.length > 0) {
        res.status(500).json({ error: `Server is missing B2 config: ${config.missingEnv.join(', ')}` });
        return;
      }

      const index = await readMediaIndex(s3, config);
      res.json(index);
    })().catch((error) => {
      logB2Error('B2 media index read failed:', error);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Could not read stored media metadata.' });
      }
    });
  });

  app.put('/api/media/:id', (req, res) => {
    void (async () => {
      if (!config.bucket || config.missingEnv.length > 0) {
        res.status(500).json({ error: `Server is missing B2 config: ${config.missingEnv.join(', ')}` });
        return;
      }

      const item = req.body?.item;
      const validationError = validateManifestItem(item, req.params.id);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const index = await readMediaIndex(s3, config);
      const nextItems = index.items.filter((existing) => existing.id !== item.id);
      nextItems.unshift(item);
      const payload = await writeMediaIndex(s3, config, nextItems);
      res.json({ ok: true, item, updatedAt: payload.updatedAt });
    })().catch((error) => {
      logB2Error('B2 media index write failed:', error);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Could not store media metadata.' });
      }
    });
  });

  app.delete('/api/media/:id', (_req, res) => {
    void (async () => {
      if (!config.bucket || config.missingEnv.length > 0) {
        res.status(500).json({ error: `Server is missing B2 config: ${config.missingEnv.join(', ')}` });
        return;
      }

      const index = await readMediaIndex(s3, config);
      const nextItems = index.items.filter((existing) => existing.id !== _req.params.id);
      if (nextItems.length === index.items.length) {
        res.status(404).json({ error: 'Media metadata not found.' });
        return;
      }

      const payload = await writeMediaIndex(s3, config, nextItems);
      res.json({ ok: true, updatedAt: payload.updatedAt });
    })().catch((error) => {
      logB2Error('B2 media index delete failed:', error);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Could not delete media metadata.' });
      }
    });
  });

  app.get('/api/files/:key', (req, res) => {
    void (async () => {
      if (!config.bucket || config.missingEnv.length > 0) {
        res.status(500).json({ error: `Server is missing B2 config: ${config.missingEnv.join(', ')}` });
        return;
      }

      const key = decodeURIComponent(req.params.key);
      const result = await s3.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));

      if (result.ContentType) res.setHeader('Content-Type', result.ContentType);
      if (result.ContentLength) res.setHeader('Content-Length', String(result.ContentLength));
      res.setHeader('Cache-Control', 'private, max-age=3600');

      result.Body.pipe(res);
    })().catch((error) => {
      logB2Error('B2 read failed:', error);
      if (!res.headersSent) {
        res.status(404).json({ error: 'File not found.' });
      }
    });
  });

  app.delete('/api/files/:key', (req, res) => {
    void (async () => {
      if (!config.bucket || config.missingEnv.length > 0) {
        res.status(500).json({ error: `Server is missing B2 config: ${config.missingEnv.join(', ')}` });
        return;
      }

      const key = decodeURIComponent(req.params.key);
      await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
      res.json({ ok: true });
    })().catch((error) => {
      logB2Error('B2 delete failed:', error);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Backblaze B2 delete failed.' });
      }
    });
  });

  return app;
}
