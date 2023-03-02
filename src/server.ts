import fastify from 'fastify';
import app from './app';

const server = fastify({
  logger: true,
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
