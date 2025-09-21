// src/routes/portCalls.ts
import { Router } from "express";
import { requireApiKey } from "../middlewares/apiKey.js";
import { listPortCalls } from "../controllers/list.controller.js";
import { reqlog } from "../middlewares/reqlog.js";

const router = Router();

// GET /api/v1/n8n/port-calls
router.get("/n8n/port-calls", requireApiKey,reqlog, listPortCalls);

export default router;
