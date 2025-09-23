import { Router } from "express";
import { requireApiKey } from "../middlewares/apiKey.js";
import { listPortCalls } from "../controllers/list.controller.js";
import { reqlog } from "../middlewares/reqlog.js";

const router = Router();

router.get("/n8n/port-calls", requireApiKey,reqlog, listPortCalls);

export default router;
