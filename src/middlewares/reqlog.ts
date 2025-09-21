import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

export function reqlog(req: Request, res: Response, next: NextFunction) {
  const rid = (req.headers["x-request-id"]?.toString() || randomUUID());
  (req as any).rid = rid;
  res.setHeader("x-request-id", rid);

  const start = Date.now();
  console.log(JSON.stringify({
    t: new Date().toISOString(), level: "info", msg: "req",
    rid, m: req.method, p: req.originalUrl, ip: req.ip
  }));

  res.on("finish", () => {
    console.log(JSON.stringify({
      t: new Date().toISOString(), level: "info", msg: "res",
      rid, st: res.statusCode, dur_ms: Date.now() - start, cl: res.getHeader("content-length")
    }));
  });

  next();
}
