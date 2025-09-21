import { Request, Response } from "express";
import { getDb } from "../db/mongo.js";

type SaveInput = {
  identificadorNavio: string;
  nomeArmador: string;
  dataPrevistaAtracacao: string;       // string de data
  dataRealAtracacao?: string | null;   // string ou null
  statusGrid?: string | null;
  motivoAtraso?: string | null;
};

function toDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// normaliza objeto, array, {data:[...]}, {items:[...]}
function normalize(body: any): SaveInput[] {
  const raw = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.items)
    ? body.items
    : body
    ? [body]
    : [];

  return raw.map((r: any) => ({
    identificadorNavio: String(r.identificadorNavio ?? ""),
    nomeArmador: String(r.nomeArmador ?? ""),
    dataPrevistaAtracacao: String(r.dataPrevistaAtracacao ?? ""),
    dataRealAtracacao: r.dataRealAtracacao != null ? String(r.dataRealAtracacao) : null,
    statusGrid: r.statusGrid != null ? String(r.statusGrid) : null,
    motivoAtraso: r.motivoAtraso != null ? String(r.motivoAtraso) : null,
  }));
}

export async function savePortCalls(req: Request, res: Response) {
  try {
    const items = normalize(req.body);
    if (items.length === 0) {
      return res.status(400).json({ error: "Empty payload" });
    }

    // validação mínima
    for (const [i, it] of items.entries()) {
      if (!it.identificadorNavio || !it.nomeArmador || !it.dataPrevistaAtracacao) {
        return res.status(400).json({ error: `Missing required fields at index ${i}` });
      }
      if (!toDate(it.dataPrevistaAtracacao)) {
        return res.status(400).json({ error: `Invalid date (dataPrevistaAtracacao) at index ${i}` });
      }
      if (it.dataRealAtracacao && !toDate(it.dataRealAtracacao)) {
        return res.status(400).json({ error: `Invalid date (dataRealAtracacao) at index ${i}` });
      }
    }

    const db = await getDb();
    const coll = db.collection("port_calls");

    const results: any[] = [];
    for (const it of items) {
      const filter = {
        identificador_navio: it.identificadorNavio,
        data_prevista_atracacao: toDate(it.dataPrevistaAtracacao)!, // parte da chave
      };

      const update = {
        $set: {
          nome_armador: it.nomeArmador,
          data_real_atracacao: toDate(it.dataRealAtracacao),
          status_grid: it.statusGrid ?? null,
          motivo_atraso: it.motivoAtraso ?? null,
        },
        $setOnInsert: {
          identificador_navio: it.identificadorNavio,
          data_prevista_atracacao: toDate(it.dataPrevistaAtracacao),
          created_at: new Date(),
        },
      };

      const { value } = await coll.findOneAndUpdate(filter, update, {
        upsert: true,
        returnDocument: "after",
      });

      results.push(value);
    }

    return res.status(201).json({ upserted: results.length, data: results });
  } catch (err: any) {
    console.error("[save] mongo error", err);
    return res.status(502).json({ error: "DB error", detail: err?.message ?? String(err) });
  }
}
