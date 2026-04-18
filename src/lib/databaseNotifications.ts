export type DatabaseNotificationEvent = "INSERT" | "UPDATE" | "DELETE";

export interface DatabaseNotificationPayload {
  eventType: DatabaseNotificationEvent;
  table: string;
  createdAt?: string;
  record?: Record<string, unknown> | null;
  oldRecord?: Record<string, unknown> | null;
}

const LOCAL_DATABASE_NOTIFICATION_EVENT = "local-database-notification";

export const monitoredTables = [
  "programas",
  "unidades",
  "objetivos_aprendizaje",
  "indicadores_evaluacion",
  "evaluaciones",
  "criterios_evaluacion",
  "actividades_evaluacion",
  "unidad_habilidades",
  "unidad_conocimientos",
  "unidad_conocimientos_previos",
  "unidad_actitudes",
  "unidad_palabras_clave",
  "unidad_lecturas_sugeridas",
  "notas_revision",
] as const;

export const tableLabels: Record<(typeof monitoredTables)[number], string> = {
  programas: "Programas",
  unidades: "Unidades",
  objetivos_aprendizaje: "Objetivos de aprendizaje",
  indicadores_evaluacion: "Indicadores de evaluacion",
  evaluaciones: "Evaluaciones",
  criterios_evaluacion: "Criterios de evaluacion",
  actividades_evaluacion: "Actividades de evaluacion",
  unidad_habilidades: "Habilidades",
  unidad_conocimientos: "Conocimientos",
  unidad_conocimientos_previos: "Conocimientos previos",
  unidad_actitudes: "Actitudes",
  unidad_palabras_clave: "Palabras clave",
  unidad_lecturas_sugeridas: "Lecturas sugeridas",
  notas_revision: "Notas de revision",
};

function getEventLabel(event: DatabaseNotificationEvent) {
  switch (event) {
    case "INSERT":
      return "Nuevo registro";
    case "UPDATE":
      return "Registro actualizado";
    case "DELETE":
      return "Registro eliminado";
    default:
      return "Cambio detectado";
  }
}

export function getRecordName(record: Record<string, unknown> | null | undefined) {
  if (!record) {
    return null;
  }

  if (typeof record.titulo === "string" && record.titulo.trim()) {
    return record.titulo.trim();
  }

  if (typeof record.codigo === "string" && record.codigo.trim()) {
    return record.codigo.trim();
  }

  if (typeof record.contenido === "string" && record.contenido.trim()) {
    return record.contenido.trim().slice(0, 80);
  }

  if (typeof record.numero_unidad === "number") {
    return `Unidad ${record.numero_unidad}`;
  }

  if (typeof record.archivo_fuente === "string" && record.archivo_fuente.trim()) {
    return record.archivo_fuente.trim();
  }

  return null;
}

export function getDatabaseNotificationSignature({
  eventType,
  table,
  record,
  oldRecord,
}: DatabaseNotificationPayload) {
  const sourceRecord = eventType === "DELETE" ? oldRecord : record;
  const recordId =
    sourceRecord && typeof sourceRecord.id === "number"
      ? String(sourceRecord.id)
      : sourceRecord && typeof sourceRecord.id === "string"
        ? sourceRecord.id
        : "unknown";

  return `${table}:${eventType}:${recordId}`;
}

export function buildDatabaseNotification(payload: DatabaseNotificationPayload) {
  const tableLabel = tableLabels[payload.table as keyof typeof tableLabels] ?? payload.table;
  const record = payload.eventType === "DELETE" ? payload.oldRecord : payload.record;
  const recordName = getRecordName(record);

  return {
    id: `${getDatabaseNotificationSignature(payload)}:${payload.createdAt ?? Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    signature: getDatabaseNotificationSignature(payload),
    event: payload.eventType,
    table: payload.table,
    title: `${getEventLabel(payload.eventType)} en ${tableLabel}`,
    message: recordName
      ? `${tableLabel}: ${recordName}`
      : `Se detecto un cambio en ${tableLabel}.`,
    createdAt: payload.createdAt ?? new Date().toISOString(),
    unread: true,
    dismissed: false,
  };
}

export function emitLocalDatabaseNotification(payload: DatabaseNotificationPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<DatabaseNotificationPayload>(LOCAL_DATABASE_NOTIFICATION_EVENT, {
      detail: {
        ...payload,
        createdAt: payload.createdAt ?? new Date().toISOString(),
      },
    }),
  );
}

export function subscribeToLocalDatabaseNotifications(
  listener: (payload: DatabaseNotificationPayload) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleEvent = (event: Event) => {
    const customEvent = event as CustomEvent<DatabaseNotificationPayload>;
    listener(customEvent.detail);
  };

  window.addEventListener(LOCAL_DATABASE_NOTIFICATION_EVENT, handleEvent);

  return () => {
    window.removeEventListener(LOCAL_DATABASE_NOTIFICATION_EVENT, handleEvent);
  };
}
