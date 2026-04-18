interface ErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
}

export function getFriendlyErrorMessage(error: unknown, action: string) {
  const candidate = (error ?? {}) as ErrorLike;

  if (candidate.code === "23503") {
    return "No se pudo eliminar porque este registro tiene elementos relacionados. Elimina primero los hijos asociados.";
  }

  if (candidate.code === "23505") {
    return "No se pudo guardar porque ya existe un registro con esos datos.";
  }

  if (candidate.message) {
    return `No se pudo ${action}: ${candidate.message}`;
  }

  return `No se pudo ${action}.`;
}
