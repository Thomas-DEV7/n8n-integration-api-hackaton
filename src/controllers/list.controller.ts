// src/controllers/list.controller.ts
import { Request, Response } from "express";
import { getDb } from "../db/mongo.js";

interface PortCallDoc {
  identificador_navio: string;
  nome_armador: string;
  data_prevista_atracacao: Date;
  data_real_atracacao?: Date | null;
  status_grid?: string | null;
  motivo_atraso?: string | null;
  created_at: Date;
  _id?: any;
}

function toDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(String(s));
  return Number.isNaN(d.getTime()) ? null : d;
}

// converte snake_case → camelCase para o response
function toCamel(d: PortCallDoc) {
  return {
    id: d._id,
    identificadorNavio: d.identificador_navio,
    nomeArmador: d.nome_armador,
    dataPrevistaAtracacao: d.data_prevista_atracacao,
    dataRealAtracacao: d.data_real_atracacao ?? null,
    statusGrid: d.status_grid ?? null,
    motivoAtraso: d.motivo_atraso ?? null,
    createdAt: d.created_at,
  };
}

export async function listPortCalls(req: Request, res: Response) {
  const db = await getDb();
  const coll = db.collection<PortCallDoc>("port_calls");

  // paginação
  const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
  const limitRaw = parseInt(String(req.query.limit ?? "20"), 10) || 20;
  const limit = Math.min(Math.max(limitRaw, 1), 100); // 1..100
  const skip = (page - 1) * limit;

  // filtros
  const identificadorNavio = req.query.identificadorNavio
    ? String(req.query.identificadorNavio)
    : undefined;

  const from = toDate((req.query.from as string) || undefined);
  const to = toDate((req.query.to as string) || undefined);

  const filter: Record<string, any> = {};
  if (identificadorNavio) filter.identificador_navio = identificadorNavio;

  if (from || to) {
    filter.data_prevista_atracacao = {};
    if (from) filter.data_prevista_atracacao.$gte = from;
    if (to) filter.data_prevista_atracacao.$lte = to;
  }

  // ordenação
  const sortBy = String(req.query.sortBy ?? "createdAt");
  const sortOrder = String(req.query.sortOrder ?? "desc").toLowerCase() === "asc" ? 1 : -1;

  const sort: Record<string, 1 | -1> = {};
  if (sortBy === "dataPrevistaAtracacao") {
    sort.data_prevista_atracacao = sortOrder;
  } else if (sortBy === "identificadorNavio") {
    sort.identificador_navio = sortOrder;
  } else {
    sort.created_at = sortOrder; // default
  }

  const [items, total] = await Promise.all([
    coll.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
    coll.countDocuments(filter),
  ]);

  const data = items.map(toCamel);
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return res.json({
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    sortBy,
    sortOrder: sortOrder === 1 ? "asc" : "desc",
    filters: {
      identificadorNavio: identificadorNavio ?? null,
      from: from ?? null,
      to: to ?? null,
    },
    data,
  });
}
