import type {
  ActividadEvaluacionRow,
  CriterioEvaluacionRow,
  EvaluacionRow,
  IndicadorEvaluacionRow,
  ObjetivoAprendizajeRow,
  ProgramaRow,
  UnidadContenidoRow,
  UnidadLecturaSugeridaRow,
  UnidadRow,
} from "../types/entities";
import { getEntityById, listEntities, listEntitiesByIds } from "./entityService";

export interface ProgramaHierarchy {
  programa: ProgramaRow;
  unidades: UnidadRow[];
}

export interface ProgramaComparisonHierarchy {
  programa: ProgramaRow;
  unidades: UnidadRow[];
  objetivos: ObjetivoAprendizajeRow[];
  indicadores: IndicadorEvaluacionRow[];
  evaluaciones: EvaluacionRow[];
  criterios: CriterioEvaluacionRow[];
}

export interface UnidadHierarchy {
  programa: ProgramaRow;
  unidad: UnidadRow;
  objetivos: ObjetivoAprendizajeRow[];
  indicadores: IndicadorEvaluacionRow[];
  evaluaciones: EvaluacionRow[];
  criterios: CriterioEvaluacionRow[];
  actividades: ActividadEvaluacionRow[];
  actitudes: UnidadContenidoRow[];
  conocimientos: UnidadContenidoRow[];
  conocimientosPrevios: UnidadContenidoRow[];
  habilidades: UnidadContenidoRow[];
  palabrasClave: UnidadContenidoRow[];
  lecturasSugeridas: UnidadLecturaSugeridaRow[];
}

export async function getProgramaHierarchy(programaId: number): Promise<ProgramaHierarchy> {
  const [programa, unidades] = await Promise.all([
    getEntityById("programas", programaId),
    listEntities("unidades", {
      filters: {
        programa_id: programaId,
      },
    }),
  ]);

  return {
    programa: programa as ProgramaRow,
    unidades: unidades as UnidadRow[],
  };
}

export async function getProgramaComparisonHierarchy(
  programaId: number,
): Promise<ProgramaComparisonHierarchy> {
  const { programa, unidades } = await getProgramaHierarchy(programaId);
  const unidadIds = unidades.map((unidad) => unidad.id);

  const [objetivos, evaluaciones] = await Promise.all([
    listEntitiesByIds("objetivos_aprendizaje", "unidad_id", unidadIds),
    listEntitiesByIds("evaluaciones", "unidad_id", unidadIds),
  ]);

  const objetivoIds = (objetivos as ObjetivoAprendizajeRow[]).map((item) => item.id);
  const evaluacionIds = (evaluaciones as EvaluacionRow[]).map((item) => item.id);

  const [indicadores, criterios] = await Promise.all([
    listEntitiesByIds("indicadores_evaluacion", "objetivo_aprendizaje_id", objetivoIds),
    listEntitiesByIds("criterios_evaluacion", "evaluacion_id", evaluacionIds),
  ]);

  return {
    programa,
    unidades,
    objetivos: objetivos as ObjetivoAprendizajeRow[],
    indicadores: indicadores as IndicadorEvaluacionRow[],
    evaluaciones: evaluaciones as EvaluacionRow[],
    criterios: criterios as CriterioEvaluacionRow[],
  };
}

export async function getUnidadHierarchy(unidadId: number): Promise<UnidadHierarchy> {
  const unidad = (await getEntityById("unidades", unidadId)) as UnidadRow;

  const [
    programa,
    objetivos,
    evaluaciones,
    actitudes,
    conocimientos,
    conocimientosPrevios,
    habilidades,
    palabrasClave,
    lecturasSugeridas,
  ] = await Promise.all([
    getEntityById("programas", unidad.programa_id),
    listEntities("objetivos_aprendizaje", {
      filters: {
        unidad_id: unidadId,
      },
    }),
    listEntities("evaluaciones", {
      filters: {
        unidad_id: unidadId,
      },
    }),
    listEntities("unidad_actitudes", {
      filters: {
        unidad_id: unidadId,
      },
    }),
    listEntities("unidad_conocimientos", {
      filters: {
        unidad_id: unidadId,
      },
    }),
    listEntities("unidad_conocimientos_previos", {
      filters: {
        unidad_id: unidadId,
      },
    }),
    listEntities("unidad_habilidades", {
      filters: {
        unidad_id: unidadId,
      },
    }),
    listEntities("unidad_palabras_clave", {
      filters: {
        unidad_id: unidadId,
      },
    }),
    listEntities("unidad_lecturas_sugeridas", {
      filters: {
        unidad_id: unidadId,
      },
    }),
  ]);

  const objetivoIds = (objetivos as ObjetivoAprendizajeRow[]).map((item) => item.id);
  const evaluacionIds = (evaluaciones as EvaluacionRow[]).map((item) => item.id);

  const [indicadores, criterios, actividades] = await Promise.all([
    listEntitiesByIds("indicadores_evaluacion", "objetivo_aprendizaje_id", objetivoIds),
    listEntitiesByIds("criterios_evaluacion", "evaluacion_id", evaluacionIds),
    listEntitiesByIds("actividades_evaluacion", "evaluacion_id", evaluacionIds),
  ]);

  return {
    programa: programa as ProgramaRow,
    unidad,
    objetivos: objetivos as ObjetivoAprendizajeRow[],
    indicadores: indicadores as IndicadorEvaluacionRow[],
    evaluaciones: evaluaciones as EvaluacionRow[],
    criterios: criterios as CriterioEvaluacionRow[],
    actividades: actividades as ActividadEvaluacionRow[],
    actitudes: actitudes as UnidadContenidoRow[],
    conocimientos: conocimientos as UnidadContenidoRow[],
    conocimientosPrevios: conocimientosPrevios as UnidadContenidoRow[],
    habilidades: habilidades as UnidadContenidoRow[],
    palabrasClave: palabrasClave as UnidadContenidoRow[],
    lecturasSugeridas: lecturasSugeridas as UnidadLecturaSugeridaRow[],
  };
}
