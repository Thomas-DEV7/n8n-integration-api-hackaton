import { Router } from "express";
import { triggerN8n } from "../controllers/n8n.controller.js";
import { requireApiKey } from "../middlewares/apiKey.js";

const router = Router();

router.post("/n8n/trigger", requireApiKey, triggerN8n);

export default router;
