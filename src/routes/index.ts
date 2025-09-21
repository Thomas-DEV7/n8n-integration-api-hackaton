import { Router } from "express";
import n8n from "./n8n.js";
import save from "./save.js";

const router = Router();
router.use(n8n);
router.use(save);

export default router;
