import { Router } from "express";
import { requireApiKey } from "../middlewares/apiKey.js";
import { savePortCalls } from "../controllers/save.controller.js";
import { reqlog } from "../middlewares/reqlog.js";

const router = Router();
router.post("/n8n/save", requireApiKey,reqlog, savePortCalls);
export default router;
