import { Router } from "express";
import { requireApiKey } from "../middlewares/apiKey.js";
import { savePortCalls } from "../controllers/save.controller.js";

const router = Router();
router.post("/n8n/save", requireApiKey, savePortCalls);
export default router;
