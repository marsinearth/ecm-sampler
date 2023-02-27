// Read the .env file
import AutoLoad from "@fastify/autoload";
import dotenv from "dotenv";
// Require the framework and instantiate it\
import cors from "@fastify/cors";
import Fastify from "fastify";
import path from "path";
dotenv.config();

const app = Fastify({ logger: true });

app.register(cors, {
  origin: (origin, cb) => {
    const hostname = new URL(origin).hostname;
    if (hostname === "localhost") {
      //  Request from localhost will pass
      cb(null, true);
      return;
    }
    // Generate an error on other origins, disabling access
    cb(new Error("Not allowed"), false);
  },
});

// Autoload routes
app.register(AutoLoad, {
  dir: path.join(__dirname, "routes"),
});

// Run the server!
app.listen({ port: 4000 }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
