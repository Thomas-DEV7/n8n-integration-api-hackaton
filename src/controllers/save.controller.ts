import { Request, Response } from "express";
import { getDb } from "../db/mongo.js";

export interface PortCallDoc {
  identificador_navio: string;
  nome_armador: string;
  data_prevista_atracacao: Date;
  data_real_atracacao?: Date | null;
  status_grid?: string | null;
  motivo_atraso?: string | null;
  created_at: Date;
}

type SaveInput = {
  identificadorNavio: string;
  nomeArmador: string;
  dataPrevistaAtracacao: string;
  dataRealAtracacao?: string | null;
  statusGrid?: string | null;
  motivoAtraso?: string | null;
};

function toDate(s?: string | null): Date | null {
  if (!s) return null;
  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  d = new Date(`${s}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function unwrap<T = any>(x: any): T {
  return x && typeof x === "object" && x.json && typeof x.json === "object" ? (x.json as T) : (x as T);
}

function normalize(body: any): SaveInput[] {
  const src: any[] = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.items)
    ? body.items
    : body
    ? [body]
    : [];

  return src
    .map((r: any) => unwrap<Partial<SaveInput>>(r))
    .map((r: Partial<SaveInput>): SaveInput => ({
      identificadorNavio: String(r?.identificadorNavio ?? ""),
      nomeArmador: String(r?.nomeArmador ?? ""),
      dataPrevistaAtracacao: String(r?.dataPrevistaAtracacao ?? ""),
      dataRealAtracacao: r?.dataRealAtracacao != null ? String(r.dataRealAtracacao) : null,
      statusGrid: r?.statusGrid != null ? String(r.statusGrid) : null,
      motivoAtraso: r?.motivoAtraso != null ? String(r.motivoAtraso) : null,
    }))
    .filter((r: SaveInput) => r.identificadorNavio || r.nomeArmador || r.dataPrevistaAtracacao);
}

export async function savePortCalls(req: Request, res: Response) {
  try {
    const rid = (req as any).rid as string | undefined;
    const items = normalize(req.body);

    console.log(JSON.stringify({
      t: new Date().toISOString(), level: "info", msg: "save.in",
      rid, count: items.length,
      sample: items[0] ? {
        identificadorNavio: items[0].identificadorNavio,
        nomeArmador: items[0].nomeArmador,
        dataPrevistaAtracacao: items[0].dataPrevistaAtracacao
      } : null
    }));

    if (items.length === 0) return res.status(400).json({ error: "Empty payload" });

    for (const [i, it] of items.entries()) {
      if (!it.identificadorNavio || !it.nomeArmador || !it.dataPrevistaAtracacao)
        return res.status(400).json({ error: `Missing required fields at index ${i}` });
      if (!toDate(it.dataPrevistaAtracacao))
        return res.status(400).json({ error: `Invalid date (dataPrevistaAtracacao) at index ${i}` });
      if (it.dataRealAtracacao && !toDate(it.dataRealAtracacao))
        return res.status(400).json({ error: `Invalid date (dataRealAtracacao) at index ${i}` });
    }

    const db = await getDb();
    const coll = db.collection<PortCallDoc>("port_calls");
    const results: (PortCallDoc & { _id: any })[] = [];

    for (const it of items as SaveInput[]) {
      const prevista = toDate(it.dataPrevistaAtracacao)!;
      const filter = { identificador_navio: it.identificadorNavio, data_prevista_atracacao: prevista };
      const update = {
        $set: {
          nome_armador: it.nomeArmador,
          data_real_atracacao: toDate(it.dataRealAtracacao),
          status_grid: it.statusGrid ?? null,
          motivo_atraso: it.motivoAtraso ?? null,
        },
        $setOnInsert: {
          identificador_navio: it.identificadorNavio,
          data_prevista_atracacao: prevista,
          created_at: new Date(),
        },
      };

      const doc = await coll.findOneAndUpdate(filter, update, { upsert: true, returnDocument: "after" });
      if (doc) results.push(doc as any);
    }

    console.log(JSON.stringify({
      t: new Date().toISOString(), level: "info", msg: "save.ok",
      rid, upserted: results.length
    }));

    return res.status(201).json({ upserted: results.length, data: results });
  } catch (err: any) {
    const rid = (req as any).rid as string | undefined;
    console.error(JSON.stringify({
      t: new Date().toISOString(), level: "error", msg: "save.err",
      rid, error: err?.message
    }));
    return res.status(502).json({ error: "DB error", detail: err?.message ?? String(err) });
  }
}
