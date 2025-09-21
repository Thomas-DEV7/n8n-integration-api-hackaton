import { Router } from "express";
import n8n from "./routes/n8n.ts";

const router = Router();

router.use(n8n);

export default router;
