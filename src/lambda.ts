import awsLambdaFastify from '@fastify/aws-lambda';
import type { Context } from 'aws-lambda';
import fastify from 'fastify';
import app from './app';

const server = fastify({
  logger: true,
});

server.register(app);

const proxy = awsLambdaFastify(server);

export const handler = (event: any, context: Context) => {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool
  return proxy(event, context);
};
