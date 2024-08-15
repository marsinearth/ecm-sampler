import awsLambdaFastify, { type CallbackHandler } from '@fastify/aws-lambda';
import { type Callback, type LambdaFunctionURLHandler } from 'aws-lambda';
import fastify from 'fastify';
import app from './app';

const server = fastify({
  logger: true,
});

server.register(app);

const handleCallback =
  (cb: Callback): Callback =>
  (err, res) => {
    if (err) {
      return cb(JSON.stringify(err));
    }
    return cb(null, res);
  };

const proxy: CallbackHandler = awsLambdaFastify(server, { callbackWaitsForEmptyEventLoop: false });

export const handler: LambdaFunctionURLHandler = (event, context, callback) => {
  proxy(event, context, handleCallback(callback));
};
