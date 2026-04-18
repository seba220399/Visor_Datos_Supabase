import { createElement, type ReactNode } from "react";
import type { AnyEntityRow, EntityKey, EntityPayload } from "../types/entities";

export type FieldType = "text" | "textarea" | "number" | "select";
export type ValueType = "string" | "number";

export interface EntityFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hidden?: boolean;
  placeholder?: string;
  helpText?: string;
  valueType?: ValueType;
}

export interface EntityColumnConfig {
  key: string;
  label: string;
  render?: (row: AnyEntityRow) => ReactNode;
}

export interface EntityConfig {
  table: EntityKey;
  singularLabel: string;
  pluralLabel: string;
  searchFields?: string[];
  defaultOrder?: {
    column: string;
    ascending: boolean;
  };
  summaryFields: string[];
  listColumns: EntityColumnConfig[];
  fields: EntityFieldConfig[];
  displayName: (row: AnyEntityRow) => string;
}

function formatUnidadMeta(row: AnyEntityRow) {
  if (!("pagina_inicio" in row) || !("pagina_fin" in row)) {
    return "Paginas no definidas";
  }

  const inicio = row.pagina_inicio ?? "-";
  const fin = row.pagina_fin ?? "-";
  return `Paginas ${inicio} a ${fin}`;
}

function getMarkedObjectivesCount(row: AnyEntityRow) {
  if (!("marked_objectives_count" in row)) {
    return 0;
  }

  const value = Number(row.marked_objectives_count);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function isReviewMarked(row: AnyEntityRow) {
  if (!("review_marked" in row)) {
    return false;
  }

  return Number(row.review_marked) > 0;
}

function asLabel(value: unknown, fallback: string) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function formatFileNameLabel(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Programa sin titulo";
  }

  return String(value)
    .replace(/\.pdf$/i, "")
    .replaceAll(/[_-]+/g, " ")
    .trim();
}

export const entityConfigs: Record<EntityKey, EntityConfig> = {
  programas: {
    table: "programas",
    singularLabel: "programa",
    pluralLabel: "Programas",
    searchFields: ["titulo", "asignatura", "curso", "nivel_educativo", "archivo_fuente"],
    defaultOrder: {
      column: "titulo",
      ascending: true,
    },
    summaryFields: [
      "titulo",
      "asignatura",
      "curso",
      "nivel_educativo",
      "tipo_documento",
      "archivo_fuente",
      "total_paginas",
      "parser_version",
      "creado_en",
    ],
    listColumns: [
      {
        key: "titulo",
        label: "Titulo",
        render: (row) =>
          asLabel("titulo" in row ? row.titulo : null, formatFileNameLabel("archivo_fuente" in row ? row.archivo_fuente : null)),
      },
      {
        key: "asignatura",
        label: "Asignatura",
      },
      {
        key: "curso",
        label: "Curso",
      },
      {
        key: "nivel_educativo",
        label: "Nivel educativo",
      },
      {
        key: "tipo_documento",
        label: "Tipo documento",
        render: (row) => asLabel("tipo_documento" in row ? row.tipo_documento : null, "Programa"),
      },
    ],
    fields: [
      {
        key: "titulo",
        label: "Titulo",
        type: "text",
        placeholder: "Ej. Lenguaje y comunicacion",
      },
      {
        key: "asignatura",
        label: "Asignatura",
        type: "text",
        placeholder: "Ej. Lenguaje",
      },
      {
        key: "curso",
        label: "Curso",
        type: "text",
        placeholder: "Ej. 5 basico",
      },
      {
        key: "nivel_educativo",
        label: "Nivel educativo",
        type: "text",
      },
      {
        key: "tipo_documento",
        label: "Tipo documento",
        type: "text",
      },
      {
        key: "archivo_fuente",
        label: "Archivo fuente",
        type: "text",
        required: true,
        placeholder: "Nombre o ruta del archivo original",
      },
      {
        key: "total_paginas",
        label: "Total de paginas",
        type: "number",
        valueType: "number",
      },
      {
        key: "parser_version",
        label: "Parser version",
        type: "text",
      },
    ],
    displayName: (row) => asLabel(("titulo" in row ? row.titulo : null) ?? ("archivo_fuente" in row ? row.archivo_fuente : null), "Programa sin titulo"),
  },
  unidades: {
    table: "unidades",
    singularLabel: "unidad",
    pluralLabel: "Unidades",
    defaultOrder: {
      column: "numero_unidad",
      ascending: true,
    },
    summaryFields: ["numero_unidad", "titulo", "pagina_inicio", "pagina_fin", "proposito", "creado_en"],
    listColumns: [
      {
        key: "resumen_unidad",
        label: "Unidad",
        render: (row) => {
          const numero = "numero_unidad" in row ? row.numero_unidad : "-";
          const titulo = "titulo" in row && row.titulo ? row.titulo : "Sin titulo";
          const markedCount = getMarkedObjectivesCount(row);

          return createElement(
            "div",
            { className: "unit-cell" },
            createElement(
              "div",
              { className: "unit-cell-head" },
              createElement("strong", null, `Unidad ${numero}: ${titulo}`),
              markedCount > 0
                ? createElement(
                    "span",
                    { className: "review-badge" },
                    `${markedCount} error${markedCount === 1 ? "" : "es"}`,
                  )
                : null,
            ),
            createElement("small", null, formatUnidadMeta(row)),
          );
        },
      },
      {
        key: "proposito",
        label: "Proposito",
        render: (row) =>
          createElement(
            "div",
            { className: "unit-purpose-cell" },
            "proposito" in row && row.proposito ? row.proposito : "Sin proposito definido.",
          ),
      },
    ],
    fields: [
      {
        key: "programa_id",
        label: "Programa",
        type: "number",
        valueType: "number",
        required: true,
        hidden: true,
      },
      {
        key: "numero_unidad",
        label: "Numero de unidad",
        type: "number",
        valueType: "number",
        required: true,
      },
      {
        key: "titulo",
        label: "Titulo",
        type: "text",
        placeholder: "Ej. Explorando textos narrativos",
      },
      {
        key: "pagina_inicio",
        label: "Pagina inicio",
        type: "number",
        valueType: "number",
      },
      {
        key: "pagina_fin",
        label: "Pagina fin",
        type: "number",
        valueType: "number",
      },
      {
        key: "proposito",
        label: "Proposito",
        type: "textarea",
        placeholder: "Describe el foco principal de la unidad",
      },
    ],
    displayName: (row) => {
      if (!("numero_unidad" in row)) {
        return "Unidad";
      }

      const titulo = "titulo" in row && row.titulo ? `: ${row.titulo}` : "";
      return `Unidad ${row.numero_unidad}${titulo}`;
    },
  },
  objetivos_aprendizaje: {
    table: "objetivos_aprendizaje",
    singularLabel: "objetivo de aprendizaje",
    pluralLabel: "Objetivos de aprendizaje",
    defaultOrder: {
      column: "orden_item",
      ascending: true,
    },
    summaryFields: ["codigo", "texto", "orden_item"],
    listColumns: [
      {
        key: "codigo",
        label: "Codigo",
        render: (row) =>
          createElement(
            "div",
            { className: "review-code-cell" },
            createElement("strong", null, "codigo" in row ? row.codigo : ""),
            isReviewMarked(row)
              ? createElement("span", { className: "review-badge" }, "Marcado")
              : null,
          ),
      },
      {
        key: "texto",
        label: "Texto",
      },
      {
        key: "orden_item",
        label: "Orden",
      },
    ],
    fields: [
      {
        key: "unidad_id",
        label: "Unidad",
        type: "number",
        valueType: "number",
        hidden: true,
        required: true,
      },
      {
        key: "codigo",
        label: "Codigo",
        type: "text",
        required: true,
        placeholder: "Ej. OA 1",
      },
      {
        key: "texto",
        label: "Texto",
        type: "textarea",
        required: true,
        placeholder: "Describe el objetivo de aprendizaje",
      },
      {
        key: "orden_item",
        label: "Orden",
        type: "number",
        valueType: "number",
        required: true,
      },
    ],
    displayName: (row) => {
      if (!("codigo" in row)) {
        return "Objetivo";
      }

      return `${row.codigo} - ${"texto" in row ? row.texto : ""}`;
    },
  },
  indicadores_evaluacion: {
    table: "indicadores_evaluacion",
    singularLabel: "indicador de evaluacion",
    pluralLabel: "Indicadores de evaluacion",
    defaultOrder: {
      column: "orden_item",
      ascending: true,
    },
    summaryFields: ["orden_item", "contenido"],
    listColumns: [
      {
        key: "orden_item",
        label: "Orden",
      },
      {
        key: "contenido",
        label: "Contenido",
      },
    ],
    fields: [
      {
        key: "objetivo_aprendizaje_id",
        label: "Objetivo",
        type: "number",
        valueType: "number",
        hidden: true,
        required: true,
      },
      {
        key: "orden_item",
        label: "Orden",
        type: "number",
        valueType: "number",
        required: true,
      },
      {
        key: "contenido",
        label: "Contenido",
        type: "textarea",
        required: true,
      },
    ],
    displayName: (row) => asLabel("contenido" in row ? row.contenido : null, "Indicador"),
  },
  evaluaciones: {
    table: "evaluaciones",
    singularLabel: "evaluacion",
    pluralLabel: "Evaluaciones",
    defaultOrder: {
      column: "orden_item",
      ascending: true,
    },
    summaryFields: ["titulo", "codigo_oa", "texto_oa", "orden_item"],
    listColumns: [
      {
        key: "orden_item",
        label: "Orden",
      },
      {
        key: "titulo",
        label: "Titulo",
      },
      {
        key: "codigo_oa",
        label: "Codigo OA",
      },
    ],
    fields: [
      {
        key: "unidad_id",
        label: "Unidad",
        type: "number",
        valueType: "number",
        hidden: true,
        required: true,
      },
      {
        key: "objetivo_aprendizaje_id",
        label: "Objetivo asociado",
        type: "select",
        valueType: "number",
        helpText: "Opcional. Se muestra con nombres legibles y no con IDs.",
      },
      {
        key: "titulo",
        label: "Titulo",
        type: "text",
        required: true,
      },
      {
        key: "codigo_oa",
        label: "Codigo OA visible",
        type: "text",
      },
      {
        key: "texto_oa",
        label: "Texto OA visible",
        type: "textarea",
      },
      {
        key: "orden_item",
        label: "Orden",
        type: "number",
        valueType: "number",
        required: true,
      },
    ],
    displayName: (row) => {
      if (!("titulo" in row)) {
        return "Evaluacion";
      }

      return `${"orden_item" in row ? row.orden_item : "-"} - ${row.titulo}`;
    },
  },
  criterios_evaluacion: {
    table: "criterios_evaluacion",
    singularLabel: "criterio de evaluacion",
    pluralLabel: "Criterios de evaluacion",
    defaultOrder: {
      column: "orden_item",
      ascending: true,
    },
    summaryFields: ["orden_item", "contenido"],
    listColumns: [
      {
        key: "orden_item",
        label: "Orden",
      },
      {
        key: "contenido",
        label: "Contenido",
      },
    ],
    fields: [
      {
        key: "evaluacion_id",
        label: "Evaluacion",
        type: "number",
        valueType: "number",
        hidden: true,
        required: true,
      },
      {
        key: "orden_item",
        label: "Orden",
        type: "number",
        valueType: "number",
        required: true,
      },
      {
        key: "contenido",
        label: "Contenido",
        type: "textarea",
        required: true,
      },
    ],
    displayName: (row) => asLabel("contenido" in row ? row.contenido : null, "Criterio"),
  },
  actividades_evaluacion: {
    table: "actividades_evaluacion",
    singularLabel: "actividad de evaluacion",
    pluralLabel: "Actividades de evaluacion",
    defaultOrder: {
      column: "orden_item",
      ascending: true,
    },
    summaryFields: ["orden_item", "contenido"],
    listColumns: [
      {
        key: "orden_item",
        label: "Orden",
      },
      {
        key: "contenido",
        label: "Contenido",
      },
    ],
    fields: [
      {
        key: "evaluacion_id",
        label: "Evaluacion",
        type: "number",
        valueType: "number",
        hidden: true,
        required: true,
      },
      {
        key: "orden_item",
        label: "Orden",
        type: "number",
        valueType: "number",
        required: true,
      },
      {
        key: "contenido",
        label: "Contenido",
        type: "textarea",
        required: true,
      },
    ],
    displayName: (row) => asLabel("contenido" in row ? row.contenido : null, "Actividad"),
  },
  unidad_actitudes: {
    table: "unidad_actitudes",
    singularLabel: "actitud",
    pluralLabel: "Actitudes",
    defaultOrder: {
      column: "orden_item",
      ascending: true,
    },
    summaryFields: ["orden_item", "contenido"],
    listColumns: [
      {
        key: "orden_item",
        label: "Orden",
      },
      {
        key: "contenido",
        label: "Contenido",
      },
    ],
    fields: [
      {
        key: "unidad_id",
        label: "Unidad",
        type: "number",
        valueType: "number",
        hidden: true,
        required: true,
      },
      {
        key: "orden_item",
        label: "Orden",
        type: "number",
        valueType: "number",
        required: true,
      },
      {
        key: "contenido",
        label: "Contenido",
        type: "textarea",
        required: true,
      },
    ],
    displayName: (row) => asLabel("contenido" in row ? row.contenido : null, "Actitud"),
  },
  unidad_conocimientos: {
    table: "unidad_conocimientos",
    singularLabel: "conocimiento",
    pluralLabel: "Conocimientos",
    defaultOrder: {
      column: "orden_item",
      ascending: true,
    },
    summaryFields: ["orden_item", "contenido"],
    listColumns: [
      {
        key: "orden_item",
        label: "Orden",
      },
      {
        key: "contenido",
        label: "Contenido",
      },
    ],
    fields: [
      {
        key: "unidad_id",
        label: "Unidad",
        type: "number",
        valueType: "number",
        hidden: true,
        required: true,
      },
      {
        key: "orden_item",
        label: "Orden",
        type: "number",
        valueType: "number",
        required: true,
      },
      {
        key: "contenido",
        label: "Contenido",
        type: "textarea",
        required: true,
      },
    ],
    displayName: (row) => asLabel("contenido" in row ? row.contenido : null, "Conocimiento"),
  },
  unidad_conocimientos_previos: {
    table: "unidad_conocimientos_previos",
    singularLabel: "conocimiento previo",
    pluralLabel: "Conocimientos previos",
    defaultOrder: {
      column: "orden_item",
      ascending: true,
    },
    summaryFields: ["orden_item", "contenido"],
    listColumns: [
      {
        key: "orden_item",
        label: "Orden",
      },
      {
        key: "contenido",
        label: "Contenido",
      },
    ],
    fields: [
      {
        key: "unidad_id",
        label: "Unidad",
        type: "number",
        valueType: "number",
        hidden: true,
        required: true,
      },
      {
        key: "orden_item",
        label: "Orden",
        type: "number",
        valueType: "number",
        required: true,
      },
      {
        key: "contenido",
        label: "Contenido",
        type: "textarea",
        required: true,
      },
    ],
    displayName: (row) => asLabel("contenido" in row ? row.contenido : null, "Conocimiento previo"),
  },
  unidad_habilidades: {
    table: "unidad_habilidades",
    singularLabel: "habilidad",
    pluralLabel: "Habilidades",
    defaultOrder: {
      column: "orden_item",
      ascending: true,
    },
    summaryFields: ["orden_item", "contenido"],
    listColumns: [
      {
        key: "orden_item",
        label: "Orden",
      },
      {
        key: "contenido",
        label: "Contenido",
      },
    ],
    fields: [
      {
        key: "unidad_id",
        label: "Unidad",
        type: "number",
        valueType: "number",
        hidden: true,
        required: true,
      },
      {
        key: "orden_item",
        label: "Orden",
        type: "number",
        valueType: "number",
        required: true,
      },
      {
        key: "contenido",
        label: "Contenido",
        type: "textarea",
        required: true,
      },
    ],
    displayName: (row) => asLabel("contenido" in row ? row.contenido : null, "Habilidad"),
  },
  unidad_palabras_clave: {
    table: "unidad_palabras_clave",
    singularLabel: "palabra clave",
    pluralLabel: "Palabras clave",
    defaultOrder: {
      column: "orden_item",
      ascending: true,
    },
    summaryFields: ["orden_item", "contenido"],
    listColumns: [
      {
        key: "orden_item",
        label: "Orden",
      },
      {
        key: "contenido",
        label: "Contenido",
      },
    ],
    fields: [
      {
        key: "unidad_id",
        label: "Unidad",
        type: "number",
        valueType: "number",
        hidden: true,
        required: true,
      },
      {
        key: "orden_item",
        label: "Orden",
        type: "number",
        valueType: "number",
        required: true,
      },
      {
        key: "contenido",
        label: "Contenido",
        type: "textarea",
        required: true,
      },
    ],
    displayName: (row) => asLabel("contenido" in row ? row.contenido : null, "Palabra clave"),
  },
  unidad_lecturas_sugeridas: {
    table: "unidad_lecturas_sugeridas",
    singularLabel: "lectura sugerida",
    pluralLabel: "Lecturas sugeridas",
    searchFields: ["categoria", "titulo", "autor"],
    defaultOrder: {
      column: "orden_item",
      ascending: true,
    },
    summaryFields: ["orden_item", "categoria", "titulo", "autor"],
    listColumns: [
      {
        key: "orden_item",
        label: "Orden",
      },
      {
        key: "categoria",
        label: "Categoria",
      },
      {
        key: "titulo",
        label: "Titulo",
      },
      {
        key: "autor",
        label: "Autor",
      },
    ],
    fields: [
      {
        key: "unidad_id",
        label: "Unidad",
        type: "number",
        valueType: "number",
        hidden: true,
        required: true,
      },
      {
        key: "orden_item",
        label: "Orden",
        type: "number",
        valueType: "number",
        required: true,
      },
      {
        key: "categoria",
        label: "Categoria",
        type: "text",
        placeholder: "Ej. Narraciones",
      },
      {
        key: "titulo",
        label: "Titulo",
        type: "text",
        required: true,
        placeholder: "Nombre de la lectura sugerida",
      },
      {
        key: "autor",
        label: "Autor",
        type: "text",
        placeholder: "Autor o version",
      },
    ],
    displayName: (row) => asLabel("titulo" in row ? row.titulo : null, "Lectura sugerida"),
  },
};

export function getEntityConfig(entityKey: EntityKey) {
  return entityConfigs[entityKey];
}

export function getEntityDisplayName(entityKey: EntityKey, row: AnyEntityRow) {
  return entityConfigs[entityKey].displayName(row);
}

export function buildFormDefaults(
  entityKey: EntityKey,
  defaults: EntityPayload = {},
) {
  const config = getEntityConfig(entityKey);
  return config.fields.reduce<EntityPayload>((accumulator, field) => {
    const value = defaults[field.key];

    if (value === undefined) {
      accumulator[field.key] = null;
      return accumulator;
    }

    accumulator[field.key] = value;
    return accumulator;
  }, {});
}
