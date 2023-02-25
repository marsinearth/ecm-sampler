import type { FastifyReply, FastifyRequest } from "fastify";
import { Pool } from "pg";
import envVarTypeResolver from "../utils";

async function pgFetch() {
  const pool = new Pool();
  const query = envVarTypeResolver("FETCH_QUERY");

  const res = await pool.query(query);

  console.log({ res });
  await pool.end();
  return res?.rows;
}

module.exports = {
  path: "/",
  method: "GET",
  handler: async (_req: FastifyRequest, _reply: FastifyReply) => {
    return await pgFetch();
  },
};
