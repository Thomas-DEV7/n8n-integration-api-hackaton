// src/controllers/save.controller.ts
import { Request, Response } from "express";
import { getDb } from "../db/mongo.js";

// Documento salvo no Mongo (snake_case no banco)
export interface PortCallDoc {
  identificador_navio: string;
  nome_armador: string;
  data_prevista_atracacao: Date;
  data_real_atracacao?: Date | null;
  status_grid?: string | null;
  motivo_atraso?: string | null;
  created_at: Date;
}

// Payload recebido (camelCase)
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
  // tenta como veio
  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  // se não tinha timezone, tenta como UTC
  d = new Date(`${s}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Se o item vier como { json: {...} } (padrão do n8n), retorna o .json; senão, o próprio item
function unwrapJson<T = any>(x: any): T {
  return x && typeof x === "object" && x.json && typeof x.json === "object" ? (x.json as T) : (x as T);
}

// Converte qualquer forma de corpo em uma lista de SaveInput
function normalize(body: any): SaveInput[] {
  // aceita: array, {data: [...]}, {items: [...]}, objeto único
  const base = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.items)
    ? body.items
    : body
    ? [body]
    : [];

  return base
    .map((r: any) => unwrapJson<Partial<SaveInput>>(r))
    .map((r) => ({
      identificadorNavio: String(r?.identificadorNavio ?? ""),
      nomeArmador: String(r?.nomeArmador ?? ""),
      dataPrevistaAtracacao: String(r?.dataPrevistaAtracacao ?? ""),
      dataRealAtracacao: r?.dataRealAtracacao != null ? String(r.dataRealAtracacao) : null,
      statusGrid: r?.statusGrid != null ? String(r.statusGrid) : null,
      motivoAtraso: r?.motivoAtraso != null ? String(r.motivoAtraso) : null,
    }))
    // filtra totalmente vazios (caso chegue lixo do fluxo)
    .filter(
      (r) => r.identificadorNavio || r.nomeArmador || r.dataPrevistaAtracacao
    );
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
    const coll = db.collection<PortCallDoc>("port_calls");

    const results: (PortCallDoc & { _id: any })[] = [];

    for (const it of items) {
      const prevista = toDate(it.dataPrevistaAtracacao)!;

      const filter = {
        identificador_navio: it.identificadorNavio,
        data_prevista_atracacao: prevista, // chave composta
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
          data_prevista_atracacao: prevista,
          created_at: new Date(),
        },
      };

      // MongoDB Node Driver v6 retorna o documento (ou null) diretamente
      const doc = await coll.findOneAndUpdate(filter, update, {
        upsert: true,
        returnDocument: "after",
      });

      if (doc) results.push(doc as any);
    }

    return res.status(201).json({ upserted: results.length, data: results });
  } catch (err: any) {
    console.error("[save] mongo error", err);
    return res.status(502).json({ error: "DB error", detail: err?.message ?? String(err) });
  }
}
