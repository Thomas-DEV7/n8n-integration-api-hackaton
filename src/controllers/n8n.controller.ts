import { Request, Response } from "express";
import axios from "axios";

function getTimeoutMs(): number {
  const n = Number(process.env.N8N_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 8000;
}
export async function triggerN8n(req: Request, res: Response) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return res.status(500).json({ error: "N8N_WEBHOOK_URL not configured" });

  try {
    const { data, status, headers } = await axios.post(url, req.body ?? {}, {
      timeout: Number(process.env.N8N_TIMEOUT_MS) > 0 ? Number(process.env.N8N_TIMEOUT_MS) : 8000,
      headers: { "Content-Type": "application/json" }
    });

    
    if (headers?.["content-type"]) res.setHeader("content-type", String(headers["content-type"]));
    return res.status(status).send(data);
  } catch (err: any) {
    const status = err?.response?.status ?? 502;
    const upstream = url;

    const msg = String(err?.response?.data?.message || "").toLowerCase();
    if (status === 404 && msg.includes("webhook") && msg.includes("not registered")) {
      return res.status(404).json({
        code: 404,
        error: "Webhook not registered on n8n",
        hint: "Ative o workflow no n8n e use a Production URL do nó Webhook.",
        upstream
      });
    }

    return res.status(status).json(
      err?.response?.data ?? { error: "Failed to call n8n webhook", upstream }
    );
  }
}