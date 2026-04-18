export type EntityFormValue = string | number | null;
export type EntityPayload = Record<string, EntityFormValue>;

export interface ProgramaRow extends Record<string, EntityFormValue> {
  id: number;
  archivo_fuente: string;
  asignatura: string | null;
  curso: string | null;
  total_paginas: number | null;
  creado_en: string | null;
  nivel_educativo: string | null;
  titulo: string | null;
  tipo_documento: string | null;
  parser_version: string | null;
}

export interface UnidadRow extends Record<string, EntityFormValue> {
  id: number;
  programa_id: number;
  numero_unidad: number;
  pagina_inicio: number | null;
  pagina_fin: number | null;
  proposito: string | null;
  creado_en: string | null;
  titulo: string | null;
}

export interface ObjetivoAprendizajeRow extends Record<string, EntityFormValue> {
  id: number;
  unidad_id: number;
  codigo: string;
  texto: string;
  orden_item: number;
}

export interface IndicadorEvaluacionRow extends Record<string, EntityFormValue> {
  id: number;
  objetivo_aprendizaje_id: number;
  orden_item: number;
  contenido: string;
}

export interface EvaluacionRow extends Record<string, EntityFormValue> {
  id: number;
  unidad_id: number;
  objetivo_aprendizaje_id: number | null;
  titulo: string;
  codigo_oa: string | null;
  texto_oa: string | null;
  orden_item: number;
}

export interface CriterioEvaluacionRow extends Record<string, EntityFormValue> {
  id: number;
  evaluacion_id: number;
  orden_item: number;
  contenido: string;
}

export interface ActividadEvaluacionRow extends Record<string, EntityFormValue> {
  id: number;
  evaluacion_id: number;
  orden_item: number;
  contenido: string;
}

export interface UnidadContenidoRow extends Record<string, EntityFormValue> {
  id: number;
  unidad_id: number;
  orden_item: number;
  contenido: string;
}

export interface UnidadLecturaSugeridaRow extends Record<string, EntityFormValue> {
  id: number;
  unidad_id: number;
  orden_item: number;
  categoria: string | null;
  titulo: string;
  autor: string | null;
}

export type EntityRowMap = {
  programas: ProgramaRow;
  unidades: UnidadRow;
  objetivos_aprendizaje: ObjetivoAprendizajeRow;
  indicadores_evaluacion: IndicadorEvaluacionRow;
  evaluaciones: EvaluacionRow;
  criterios_evaluacion: CriterioEvaluacionRow;
  actividades_evaluacion: ActividadEvaluacionRow;
  unidad_actitudes: UnidadContenidoRow;
  unidad_conocimientos: UnidadContenidoRow;
  unidad_conocimientos_previos: UnidadContenidoRow;
  unidad_habilidades: UnidadContenidoRow;
  unidad_palabras_clave: UnidadContenidoRow;
  unidad_lecturas_sugeridas: UnidadLecturaSugeridaRow;
};

export type EntityKey = keyof EntityRowMap;
export type AnyEntityRow = EntityRowMap[EntityKey];

export interface SelectOption {
  value: string;
  label: string;
}
