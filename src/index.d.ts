import type { FastifyInstance as fInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance extends fInstance {
    config: any;
  }
}
