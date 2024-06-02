import AutoLoad from '@fastify/autoload';
import fastifyCors from '@fastify/cors';
import fastifyEnv from '@fastify/env';
import postgres from '@fastify/postgres';
import type { FastifyPluginAsync } from 'fastify';
import { join } from 'path';
import albumSchema from './models/album';

const CORS_OPTIONS = {
  origin: '*',
  allowedHeaders: '*',
  exposedHeaders: '*',
  credentials: false,
  methods: ['GET', 'OPTIONS', 'POST'],
};

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
    'FETCH_QUERY',
    'INSERT_QUERY',
    'PGUSER',
    'PGDATABASE',
    'PGHOST',
    'PGPORT',
    'PGPASSWORD',
    'PGSSLCERT',
    'PGSSLMODE',
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
    },
    INSERT_QUERY: {
      type: 'string',
    },
    PGUSER: {
      type: 'string',
    },
    PGDATABASE: {
      type: 'string',
    },
    PGHOST: {
      type: 'string',
    },
    PGPORT: {
      type: 'string',
    },
    PGSSLMODE: {
      type: 'string',
    },
    PGPASSWORD: {
      type: 'string',
    },
    PGSSLCERT: {
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

const app: FastifyPluginAsync = async (fastify, opts) => {
  // Read the .env file
  fastify.register(fastifyEnv, options);
  await fastify.after();
  // enable cors
  fastify.register(fastifyCors, CORS_OPTIONS);
  // add schema
  fastify.addSchema(albumSchema);
  // add postgres
  fastify.register(postgres);
  // Autoload routes
  fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts,
  });
};

export default app;
