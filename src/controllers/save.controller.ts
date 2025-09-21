// src/controllers/save.controller.ts
import { Request, Response } from "express";
import { supabase } from "../db/supabase.js";

// Entrada esperada por item
type SaveInput = {
  identificadorNavio: string;
  nomeArmador: string;
  dataPrevistaAtracacao: string; // ISO
  dataRealAtracacao?: string | null; // ISO
  statusGrid?: string | null;
  motivoAtraso?: string | null;
};

// Converte "2025-09-01T08:00:00" -> ISO UTC
function toIsoUtc(s?: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Aceita: objeto, array, {data:[...]}, {items:[...]} (n8n varia)
function normalize(body: any): SaveInput[] {
  const raw = Array.isArray(body) ? body
    : Array.isArray(body?.data) ? body.data
    : Array.isArray(body?.items) ? body.items
    : body ? [body] : [];

  return raw.map((r: any) => ({
    identificadorNavio: String(r.identificadorNavio ?? ""),
    nomeArmador: String(r.nomeArmador ?? ""),
    dataPrevistaAtracacao: String(r.dataPrevistaAtracacao ?? ""),
    dataRealAtracacao: r.dataRealAtracacao != null ? String(r.dataRealAtracacao) : null,
    statusGrid: r.statusGrid != null ? String(r.statusGrid) : null,
    motivoAtraso: r.motivoAtraso != null ? String(r.motivoAtraso) : null
  }));
}

export async function savePortCalls(req: Request, res: Response) {
  const items = normalize(req.body);

  if (items.length === 0) {
    return res.status(400).json({ error: "Empty payload" });
  }

  // Validação mínima
  for (const [i, it] of items.entries()) {
    if (!it.identificadorNavio || !it.nomeArmador || !it.dataPrevistaAtracacao) {
      return res.status(400).json({ error: `Missing required fields at index ${i}` });
    }
    if (toIsoUtc(it.dataPrevistaAtracacao) === null) {
      return res.status(400).json({ error: `Invalid date (dataPrevistaAtracacao) at index ${i}` });
    }
    if (it.dataRealAtracacao && toIsoUtc(it.dataRealAtracacao) === null) {
      return res.status(400).json({ error: `Invalid date (dataRealAtracacao) at index ${i}` });
    }
  }

  // Mapeia para colunas do banco (snake_case)
  const rows = items.map((it) => ({
    identificador_navio: it.identificadorNavio,
    nome_armador: it.nomeArmador,
    data_prevista_atracacao: toIsoUtc(it.dataPrevistaAtracacao)!,
    data_real_atracacao: toIsoUtc(it.dataRealAtracacao) /* pode ser null */,
    status_grid: it.statusGrid ?? null,
    motivo_atraso: it.motivoAtraso ?? null
  }));

  // Upsert baseado no índice único (navio + data prevista)
  const { data, error } = await supabase
    .from("port_calls")
    .upsert(rows, { onConflict: "identificador_navio,data_prevista_atracacao" })
    .select("*");

  if (error) {
    return res.status(502).json({ error: "Supabase error", detail: error.message });
  }
  return res.status(201).json({ inserted: data?.length ?? 0, data });
}
