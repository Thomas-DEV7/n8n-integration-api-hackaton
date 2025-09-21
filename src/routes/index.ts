// src/routes/index.ts
import { Router } from "express";
import n8n from "./n8n.js";

const router = Router();
router.use(n8n);

export default router;
