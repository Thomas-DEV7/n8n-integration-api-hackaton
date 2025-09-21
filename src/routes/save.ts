// src/routes/save.ts
import { Router } from "express";
import { requireApiKey } from "../middlewares/apiKey.js";
import { savePortCalls } from "../controllers/save.controller.js";

const router = Router();

// POST /api/v1/n8n/save
router.post("/n8n/save", requireApiKey, savePortCalls);

export default router;
