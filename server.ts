// Read the .env file
import AutoLoad from "@fastify/autoload";
import dotenv from "dotenv";
// Require the framework and instantiate it\
import Fastify from "fastify";
import path from "path";
dotenv.config();

const app = Fastify({ logger: true });

// Autoload routes
app.register(AutoLoad, {
  dir: path.join(__dirname, "routes"),
});

// Run the server!
app.listen({ port: 3000 }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
