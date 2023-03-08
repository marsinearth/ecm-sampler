import fastify from 'fastify';
import qs from 'qs';
import app from './app';

const server = fastify({
  logger: true,
  querystringParser: (str) => qs.parse(str),
});

server.register(app);

const port = 4000;
// Start listening.
server.listen({ port }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`listening on port: ${port}`);
});
