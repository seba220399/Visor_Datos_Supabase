import { emitLocalDatabaseNotification } from "./databaseNotifications";
import { getSupabaseClient } from "./supabase";

interface ProgramNoteRow {
  id: number;
  programa_id: number;
  unidad_id: number | null;
  seccion: string | null;
  titulo: string;
  contenido: string;
  creado_en: string | null;
}

interface UnitSummary {
  id: number;
  numero_unidad: number;
  titulo: string | null;
}

export interface ProgramNote {
  id: number;
  programId: number;
  unitId: number | null;
  section: string | null;
  title: string;
  content: string;
  createdAt: string | null;
  unit: UnitSummary | null;
}

interface CreateProgramNoteInput {
  programId: number;
  unitId?: number | null;
  section?: string | null;
  title: string;
  content: string;
}

function mapProgramNote(row: ProgramNoteRow, unitsById: Map<number, UnitSummary>) {
  return {
    id: row.id,
    programId: row.programa_id,
    unitId: row.unidad_id,
    section: row.seccion,
    title: row.titulo,
    content: row.contenido,
    createdAt: row.creado_en,
    unit: row.unidad_id ? unitsById.get(row.unidad_id) ?? null : null,
  } satisfies ProgramNote;
}

async function listNoteUnits(unitIds: number[]) {
  if (unitIds.length === 0) {
    return new Map<number, UnitSummary>();
  }

  const { data, error } = await getSupabaseClient()
    .from("unidades")
    .select("id,numero_unidad,titulo")
    .in("id", unitIds);

  if (error) {
    throw error;
  }

  return new Map<number, UnitSummary>(
    ((data ?? []) as UnitSummary[]).map((unit) => [unit.id, unit]),
  );
}

export async function listProgramNotes(programId: number) {
  const { data, error } = await getSupabaseClient()
    .from("notas_revision")
    .select("*")
    .eq("programa_id", programId)
    .order("creado_en", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ProgramNoteRow[];
  const unitIds = rows
    .map((row) => row.unidad_id)
    .filter((unitId): unitId is number => typeof unitId === "number");
  const unitsById = await listNoteUnits([...new Set(unitIds)]);

  return rows.map((row) => mapProgramNote(row, unitsById));
}

export async function createProgramNote({
  programId,
  unitId = null,
  section = null,
  title,
  content,
}: CreateProgramNoteInput) {
  const normalizedTitle = title.trim();
  const normalizedContent = content.trim();
  const normalizedSection = section?.trim() || null;

  if (!normalizedTitle || !normalizedContent) {
    throw new Error("La nota necesita titulo y contenido.");
  }

  const { data, error } = await getSupabaseClient()
    .from("notas_revision")
    .insert({
      programa_id: programId,
      unidad_id: unitId,
      seccion: normalizedSection,
      titulo: normalizedTitle,
      contenido: normalizedContent,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  emitLocalDatabaseNotification({
    eventType: "INSERT",
    table: "notas_revision",
    record: data as Record<string, unknown>,
  });

  return listProgramNotes(programId);
}

export async function deleteProgramNote(programId: number, noteId: number, noteSnapshot?: ProgramNote) {
  const { error } = await getSupabaseClient().from("notas_revision").delete().eq("id", noteId);

  if (error) {
    throw error;
  }

  emitLocalDatabaseNotification({
    eventType: "DELETE",
    table: "notas_revision",
    oldRecord: noteSnapshot
      ? {
          id: noteSnapshot.id,
          titulo: noteSnapshot.title,
          contenido: noteSnapshot.content,
          unidad_id: noteSnapshot.unitId,
          programa_id: noteSnapshot.programId,
        }
      : { id: noteId },
  });

  return listProgramNotes(programId);
}
