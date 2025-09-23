import "dotenv/config";
import { createApp } from "./app.js";
import { ensureMongo } from "./db/mongo.js";

const PORT = Number(process.env.PORT ?? 3333);
const app = createApp();

ensureMongo()
  .then(() => {
    console.log("[db] Mongo schema/indexes ready");
    app.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[db] Mongo init failed", err);
    process.exit(1);
  });
