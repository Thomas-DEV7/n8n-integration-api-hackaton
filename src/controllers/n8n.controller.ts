import { Request, Response } from "express";
import axios from "axios";

export async function triggerN8n(req: Request, res: Response) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return res.status(500).json({ error: "N8N_WEBHOOK_URL not configured" });

  try {
    const { data, status, headers } = await axios.post(url, req.body, {
      headers: { "Content-Type": "application/json" }
    });
    res.status(status).set(headers).send(data);
  } catch (err: any) {
    const status = err?.response?.status ?? 502;
    const data = err?.response?.data ?? { error: "Failed to call n8n webhook" };
    res.status(status).json(data);
  }
}
