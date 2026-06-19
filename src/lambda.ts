import awsLambdaFastify, { type PromiseHandler } from '@fastify/aws-lambda';
import { type LambdaFunctionURLHandler } from 'aws-lambda';
import fastify from 'fastify';
import app from './app';

const server = fastify({
  logger: true,
});

server.register(app);

const ready = server.ready();
const proxy: PromiseHandler = awsLambdaFastify(server, {
  callbackWaitsForEmptyEventLoop: false,
});

export const handler: LambdaFunctionURLHandler = async (event, context) => {
  await ready;
  return proxy(event, context);
};
