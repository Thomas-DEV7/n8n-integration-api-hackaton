import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/v1", routes);

  // 404
  app.use((req, res) => res.status(404).json({ error: "Not Found" }));

  return app;
}
