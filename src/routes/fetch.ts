import type { FastifyPluginAsync } from 'fastify';

const schema = {
  response: {
    200: {
      type: 'array',
      items: { $ref: 'album' },
    },
  },
};

const fetch: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { schema }, async () => {
    const client = await fastify.pg.connect();
    try {
      const query = fastify.config.FETCH_QUERY;
      const { rows } = await client.query(query);
      return rows;
    } finally {
      client.release();
    }
  });
};

export default fetch;
