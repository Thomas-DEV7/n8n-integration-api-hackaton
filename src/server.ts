import "dotenv/config";
import { createApp } from "./app.js";

const PORT = Number(process.env.PORT || 3333);
const app = createApp();

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
