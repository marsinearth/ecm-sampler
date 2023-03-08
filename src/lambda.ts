import awsLambdaFastify from '@fastify/aws-lambda';
import fastify from 'fastify';
import qs from 'qs';
import app from './app';

const server = fastify({
  logger: true,
  querystringParser: (str) => qs.parse(str),
});

server.register(app);

const proxy = awsLambdaFastify(server, { callbackWaitsForEmptyEventLoop: false });

export const handler = proxy;
