// This file contains code that we reuse between our tests.
import Fastify from 'fastify';
import * as tap from 'tap';
import app from '../src/app';

export type Test = (typeof tap)['Test']['prototype'];

// Automatically build and tear down our instance
export default async function build(t?: Test) {
  const server = Fastify();
  server.register(app);

  await server.ready();
  if (t) {
    // Tear down our app after we are done
    t.teardown(() => void server.close());
  }

  return server;
}
