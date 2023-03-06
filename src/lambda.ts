import awsLambdaFastify from '@fastify/aws-lambda';
import fastify from 'fastify';
import app from './app';

const server = fastify({
  logger: true,
});

server.register(app);

const proxy = awsLambdaFastify(server, { callbackWaitsForEmptyEventLoop: false });

export const handler = proxy;
