// src/controllers/n8n.controller.ts
import { Request, Response } from "express";
import axios from "axios";

function getTimeoutMs(): number {
  const n = Number(process.env.N8N_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 8000;
}

/**
 * POST /api/v1/n8n/trigger
 * Repassa o body para o webhook definido em N8N_WEBHOOK_URL.
 * Protegido por x-api-key (middleware).
 */
export async function triggerN8n(req: Request, res: Response) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    return res.status(500).json({ error: "N8N_WEBHOOK_URL not configured" });
  }

  try {
    const { data, status, headers } = await axios.post(url, req.body ?? {}, {
      timeout: getTimeoutMs(),
      headers: { "Content-Type": "application/json" }
    });

    // Propaga cabeçalhos úteis (não sensíveis)
    if (headers?.["content-type"]) {
      res.setHeader("content-type", String(headers["content-type"]));
    }

    return res.status(status).send(data);
  } catch (err: any) {
    const status = err?.response?.status ?? 502;
    const payload =
      err?.response?.data ?? { error: "Failed to call n8n webhook", upstream: url };
    return res.status(status).json(payload);
  }
}
