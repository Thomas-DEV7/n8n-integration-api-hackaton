import { Router } from "express";
import n8n from "./n8n.js";
import save from "./save.js";
import portCalls from "./portCalls.js";

const router = Router();
router.use(n8n);
router.use(save);
router.use(portCalls);

export default router;
