export type AppRoute =
  | {
      name: "programas";
    }
  | {
      name: "programa";
      programaId: number;
    }
  | {
      name: "unidad";
      programaId: number;
      unidadId: number;
    };

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function routeToHash(route: AppRoute) {
  switch (route.name) {
    case "programas":
      return "#/programas";
    case "programa":
      return `#/programas/${route.programaId}`;
    case "unidad":
      return `#/programas/${route.programaId}/unidades/${route.unidadId}`;
  }
}

export function navigateTo(route: AppRoute) {
  window.location.hash = routeToHash(route);
}

export function parseRoute(hash: string): AppRoute {
  const cleanHash = hash.replace(/^#/, "");
  const parts = cleanHash.split("/").filter(Boolean);

  if (parts.length === 0 || parts[0] !== "programas") {
    return {
      name: "programas",
    };
  }

  if (parts.length === 1) {
    return {
      name: "programas",
    };
  }

  const programaId = Number(parts[1]);
  if (Number.isNaN(programaId)) {
    return {
      name: "programas",
    };
  }

  if (parts.length === 2) {
    return {
      name: "programa",
      programaId,
    };
  }

  const unidadId = Number(parts[3]);
  if (parts.length === 4 && parts[2] === "unidades" && !Number.isNaN(unidadId)) {
    return {
      name: "unidad",
      programaId,
      unidadId,
    };
  }

  return {
    name: "programas",
  };
}
