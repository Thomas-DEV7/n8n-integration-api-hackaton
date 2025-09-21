import { Request, Response, NextFunction } from "express";

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const provided = req.header("x-api-key") || req.query.api_key;
  const expected = process.env.API_KEY;
  if (!expected) return res.status(500).json({ error: "API key not configured" });
  if (provided !== expected) return res.status(401).json({ error: "Invalid API key" });
  next();
}
