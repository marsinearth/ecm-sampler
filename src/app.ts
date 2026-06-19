import AutoLoad from '@fastify/autoload';
import fastifyCors from '@fastify/cors';
import fastifyEnv from '@fastify/env';
import postgres from '@fastify/postgres';
import type { FastifyPluginAsync } from 'fastify';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import albumSchema from './models/album';

const CORS_OPTIONS = {
  origin: '*',
  allowedHeaders: '*',
  exposedHeaders: '*',
  credentials: false,
  methods: ['GET', 'OPTIONS', 'POST'],
};

const DEFAULT_FETCH_QUERY = 'SELECT * FROM sample_links ORDER BY created_at DESC;';
const DEFAULT_INSERT_QUERY =
  'INSERT INTO sample_links (id, url, album_title, album_artist, album_image, track_title) VALUES %L ON CONFLICT (id) DO NOTHING RETURNING *;';

const schema = {
  type: 'object',
  required: [
    'PAGE',
    'PRODUCT_LINK',
    'AUDIO_PLAYER',
    'AUDIO',
    'TRACK_TITLE',
    'ALBUM_INFO',
    'ALBUM_TITLE',
    'ALBUM_ARTIST',
    'ALBUM_IMAGE',
    'PG_USER',
    'PG_DATABASE',
    'PG_HOST',
    'PG_PORT',
    'PG_PASSWORD',
    'PG_SSL_CERT',
    'PG_SSL_MODE',
    'SLACK_WEBHOOK',
  ],
  properties: {
    PAGE: {
      type: 'string',
    },
    PRODUCT_LINK: {
      type: 'string',
    },
    AUDIO_PLAYER: {
      type: 'string',
    },
    AUDIO: {
      type: 'string',
    },
    TRACK_TITLE: {
      type: 'string',
    },
    ALBUM_INFO: {
      type: 'string',
    },
    ALBUM_TITLE: {
      type: 'string',
    },
    ALBUM_ARTIST: {
      type: 'string',
    },
    ALBUM_IMAGE: {
      type: 'string',
    },
    FETCH_QUERY: {
      type: 'string',
      default: DEFAULT_FETCH_QUERY,
    },
    INSERT_QUERY: {
      type: 'string',
      default: DEFAULT_INSERT_QUERY,
    },
    PG_USER: {
      type: 'string',
    },
    PG_DATABASE: {
      type: 'string',
    },
    PG_HOST: {
      type: 'string',
    },
    PG_PORT: {
      type: 'string',
    },
    PG_SSL_MODE: {
      type: 'string',
    },
    PG_PASSWORD: {
      type: 'string',
    },
    PG_SSL_CERT: {
      type: 'string',
    },
    SLACK_WEBHOOK: {
      type: 'string',
    },
  },
};

const options = {
  confKey: 'config',
  schema,
  dotenv: true,
};

function resolveCertPath(certPath: string) {
  const normalizedPath = certPath.replace(/^\/+/, '');
  const candidates = [certPath, join(process.cwd(), normalizedPath), join(__dirname, '..', normalizedPath)];
  return candidates.find((candidate) => existsSync(candidate));
}

const app: FastifyPluginAsync = async (fastify, opts) => {
  // Read the .env file
  fastify.register(fastifyEnv, options);
  await fastify.after();
  // enable cors
  fastify.register(fastifyCors, CORS_OPTIONS);
  // add schema
  fastify.addSchema(albumSchema);
  // add postgres
  const sslCertPath = resolveCertPath(fastify.config.PG_SSL_CERT);
  fastify.register(postgres, {
    host: fastify.config.PG_HOST,
    port: Number(fastify.config.PG_PORT),
    user: fastify.config.PG_USER,
    password: fastify.config.PG_PASSWORD,
    database: fastify.config.PG_DATABASE,
    ssl:
      fastify.config.PG_SSL_MODE === 'require'
        ? {
            ca: sslCertPath ? readFileSync(sslCertPath, 'utf8') : undefined,
            rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
          }
        : undefined,
  });
  // Autoload routes
  fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts,
  });
};

export default app;
