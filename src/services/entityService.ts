import { emitLocalDatabaseNotification } from "../lib/databaseNotifications";
import { getEntityConfig } from "../config/entities";
import { getSupabaseClient } from "../lib/supabase";
import type {
  AnyEntityRow,
  EntityKey,
  EntityPayload,
  ObjetivoAprendizajeRow,
} from "../types/entities";

interface ListOptions {
  filters?: Record<string, string | number | null>;
  orderBy?: {
    column: string;
    ascending: boolean;
  };
  search?: string;
}

function normalizeSearchTerm(term: string) {
  return term.trim().replaceAll(",", " ").replaceAll("%", "");
}

function normalizeSimilarityText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTrigrams(value: string) {
  const normalized = `  ${value} `;
  const trigrams = new Set<string>();

  for (let index = 0; index < normalized.length - 2; index += 1) {
    trigrams.add(normalized.slice(index, index + 3));
  }

  return trigrams;
}

function getDiceCoefficient(left: string, right: string) {
  if (!left || !right) {
    return 0;
  }

  const leftTrigrams = buildTrigrams(left);
  const rightTrigrams = buildTrigrams(right);

  let overlap = 0;
  for (const trigram of leftTrigrams) {
    if (rightTrigrams.has(trigram)) {
      overlap += 1;
    }
  }

  return (2 * overlap) / (leftTrigrams.size + rightTrigrams.size);
}

function getObjetivoSimilarityScore(query: string, objetivo: ObjetivoAprendizajeRow) {
  const normalizedQuery = normalizeSimilarityText(query);
  const normalizedCodigo = normalizeSimilarityText(objetivo.codigo);
  const normalizedTexto = normalizeSimilarityText(objetivo.texto);
  const searchableText = `${normalizedCodigo} ${normalizedTexto}`.trim();
  const queryTerms = normalizedQuery.split(" ").filter(Boolean);
  const searchableTerms = searchableText.split(" ").filter(Boolean);

  if (!normalizedQuery || searchableTerms.length === 0) {
    return 0;
  }

  let matchedTerms = 0;
  let score = 0;

  if (normalizedTexto.includes(normalizedQuery)) {
    score += 140;
  }

  if (searchableText.includes(normalizedQuery)) {
    score += 90;
  }

  if (normalizedCodigo === normalizedQuery) {
    score += 80;
  }

  for (const term of queryTerms) {
    if (searchableTerms.includes(term)) {
      matchedTerms += 1;
      score += 24;
      continue;
    }

    if (searchableTerms.some((candidate) => candidate.startsWith(term) || term.startsWith(candidate))) {
      matchedTerms += 1;
      score += 14;
      continue;
    }

    if (searchableText.includes(term)) {
      matchedTerms += 1;
      score += 8;
    }
  }

  if (queryTerms.length > 1 && matchedTerms === queryTerms.length) {
    score += 45;
  }

  score += Math.round((matchedTerms / queryTerms.length) * 60);

  const similarity = getDiceCoefficient(normalizedQuery, searchableText);
  score += Math.round(similarity * 80);

  if (matchedTerms === 0 && similarity < 0.14) {
    return 0;
  }

  return score;
}

export async function listEntities(entityKey: EntityKey, options: ListOptions = {}) {
  const config = getEntityConfig(entityKey);
  let query = getSupabaseClient().from(config.table).select("*");

  if (options.filters) {
    for (const [column, value] of Object.entries(options.filters)) {
      query = value === null ? query.is(column, null) : query.eq(column, value);
    }
  }

  if (options.search && config.searchFields?.length) {
    const term = normalizeSearchTerm(options.search);
    if (term) {
      const filters = config.searchFields.map((field) => `${field}.ilike.%${term}%`).join(",");
      query = query.or(filters);
    }
  }

  const order = options.orderBy ?? config.defaultOrder;
  if (order) {
    query = query.order(order.column, { ascending: order.ascending });
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as AnyEntityRow[];
}

export async function searchObjetivosAprendizaje(unidadId: number, query: string) {
  const { data, error } = await getSupabaseClient()
    .from("objetivos_aprendizaje")
    .select("*")
    .eq("unidad_id", unidadId)
    .order("orden_item", { ascending: true });

  if (error) {
    throw error;
  }

  const objetivos = (data ?? []) as ObjetivoAprendizajeRow[];
  const normalizedQuery = normalizeSearchTerm(query);

  if (!normalizedQuery) {
    return objetivos;
  }

  return objetivos
    .map((objetivo) => ({
      objetivo,
      score: getObjetivoSimilarityScore(normalizedQuery, objetivo),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.objetivo.orden_item - right.objetivo.orden_item)
    .map((item) => item.objetivo);
}

export async function listEntitiesByIds(entityKey: EntityKey, column: string, ids: number[]) {
  if (ids.length === 0) {
    return [] as AnyEntityRow[];
  }

  const config = getEntityConfig(entityKey);
  let query = getSupabaseClient().from(config.table).select("*").in(column, ids);

  if (config.defaultOrder) {
    query = query.order(config.defaultOrder.column, { ascending: config.defaultOrder.ascending });
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as AnyEntityRow[];
}

export async function getEntityById(entityKey: EntityKey, id: number) {
  const config = getEntityConfig(entityKey);
  const { data, error } = await getSupabaseClient()
    .from(config.table)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data as AnyEntityRow;
}

export async function createEntity(entityKey: EntityKey, payload: EntityPayload) {
  const config = getEntityConfig(entityKey);
  const { data, error } = await getSupabaseClient()
    .from(config.table)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  emitLocalDatabaseNotification({
    eventType: "INSERT",
    table: config.table,
    record: data as Record<string, unknown>,
  });

  return data as AnyEntityRow;
}

export async function updateEntity(entityKey: EntityKey, id: number, payload: EntityPayload) {
  const config = getEntityConfig(entityKey);
  const { data, error } = await getSupabaseClient()
    .from(config.table)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  emitLocalDatabaseNotification({
    eventType: "UPDATE",
    table: config.table,
    record: data as Record<string, unknown>,
  });

  return data as AnyEntityRow;
}

export async function deleteEntity(entityKey: EntityKey, id: number, rowSnapshot?: AnyEntityRow) {
  const config = getEntityConfig(entityKey);
  const { error } = await getSupabaseClient().from(config.table).delete().eq("id", id);

  if (error) {
    throw error;
  }

  emitLocalDatabaseNotification({
    eventType: "DELETE",
    table: config.table,
    oldRecord: (rowSnapshot ?? { id }) as Record<string, unknown>,
  });
}
