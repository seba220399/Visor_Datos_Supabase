import { useEffect, useMemo, useState } from "react";
import { ProgramNotesButton } from "../components/common/ProgramNotesButton";
import { SummaryGrid } from "../components/common/SummaryGrid";
import { Tabs } from "../components/common/Tabs";
import { EntityFormModal } from "../components/entity/EntityFormModal";
import { EntityTable } from "../components/entity/EntityTable";
import { SectionCard } from "../components/entity/SectionCard";
import { getEntityConfig } from "../config/entities";
import { getFriendlyErrorMessage } from "../lib/errors";
import { getMarkedObjectiveIds, setObjectiveMarked, subscribeToReviewMarks } from "../lib/reviewMarks";
import { getNextNumericValue } from "../lib/records";
import { routeToHash, type BreadcrumbItem } from "../lib/navigation";
import {
  createEntity,
  deleteEntity,
  searchObjetivosAprendizaje,
  updateEntity,
} from "../services/entityService";
import { getUnidadHierarchy, type UnidadHierarchy } from "../services/hierarchyService";
import type {
  AnyEntityRow,
  EntityKey,
  EntityPayload,
  ObjetivoAprendizajeRow,
  SelectOption,
  UnidadContenidoRow,
  UnidadLecturaSugeridaRow,
} from "../types/entities";

const unitTabItems = [
  { key: "objetivos_aprendizaje", label: "Objetivos de aprendizaje" },
  { key: "evaluaciones", label: "Evaluaciones" },
  { key: "unidad_habilidades", label: "Habilidades" },
  { key: "unidad_conocimientos", label: "Conocimientos" },
  { key: "unidad_conocimientos_previos", label: "Conocimientos previos" },
  { key: "unidad_actitudes", label: "Actitudes" },
  { key: "unidad_palabras_clave", label: "Palabras clave" },
  { key: "unidad_lecturas_sugeridas", label: "Lecturas sugeridas" },
] as const;

type UnitTabKey = (typeof unitTabItems)[number]["key"];

interface UnidadDetailPageProps {
  programaId: number;
  unidadId: number;
  onStatus: (tone: "success" | "error" | "info", message: string) => void;
  onBreadcrumbs: (items: BreadcrumbItem[]) => void;
}

interface ModalState {
  entityKey: EntityKey;
  mode: "create" | "edit";
  initialValues: EntityPayload;
  editingId?: number;
}

function getContentRows(data: UnidadHierarchy, entityKey: UnitTabKey) {
  switch (entityKey) {
    case "unidad_habilidades":
      return data.habilidades;
    case "unidad_conocimientos":
      return data.conocimientos;
    case "unidad_conocimientos_previos":
      return data.conocimientosPrevios;
    case "unidad_actitudes":
      return data.actitudes;
    case "unidad_palabras_clave":
      return data.palabrasClave;
    case "unidad_lecturas_sugeridas":
      return data.lecturasSugeridas;
    default:
      return [];
  }
}

export function UnidadDetailPage({
  programaId,
  unidadId,
  onStatus,
  onBreadcrumbs,
}: UnidadDetailPageProps) {
  const [data, setData] = useState<UnidadHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<UnitTabKey>("objetivos_aprendizaje");
  const [selectedObjetivoId, setSelectedObjetivoId] = useState<number | null>(null);
  const [selectedEvaluacionId, setSelectedEvaluacionId] = useState<number | null>(null);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [objetivoSearchTerm, setObjetivoSearchTerm] = useState("");
  const [objetivoSearchResults, setObjetivoSearchResults] = useState<ObjetivoAprendizajeRow[] | null>(
    null,
  );
  const [isSearchingObjetivos, setIsSearchingObjetivos] = useState(false);
  const [markedObjetivoIds, setMarkedObjetivoIds] = useState<number[]>(() => getMarkedObjectiveIds());

  const visibleObjetivos = useMemo(() => {
    if (!data) return [];
    if (!objetivoSearchTerm.trim()) return data.objetivos;
    return objetivoSearchResults ?? [];
  }, [data, objetivoSearchTerm, objetivoSearchResults]);

  const indicadoresSeleccionados = useMemo(() => {
    if (!data || !selectedObjetivoId) return [];
    return data.indicadores.filter((item) => item.objetivo_aprendizaje_id === selectedObjetivoId);
  }, [data, selectedObjetivoId]);

  const criteriosSeleccionados = useMemo(() => {
    if (!data || !selectedEvaluacionId) return [];
    return data.criterios.filter((item) => item.evaluacion_id === selectedEvaluacionId);
  }, [data, selectedEvaluacionId]);

  const actividadesSeleccionadas = useMemo(() => {
    if (!data || !selectedEvaluacionId) return [];
    return data.actividades.filter((item) => item.evaluacion_id === selectedEvaluacionId);
  }, [data, selectedEvaluacionId]);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);

    try {
      const nextData = await getUnidadHierarchy(unidadId);
      setData(nextData);
      onBreadcrumbs([
        { label: "Programas", href: routeToHash({ name: "programas" }) },
        {
          label: nextData.programa.titulo ?? nextData.programa.archivo_fuente,
          href: routeToHash({ name: "programa", programaId }),
        },
        {
          label: nextData.unidad.titulo
            ? `Unidad ${nextData.unidad.numero_unidad}: ${nextData.unidad.titulo}`
            : `Unidad ${nextData.unidad.numero_unidad}`,
        },
      ]);
    } catch (error) {
      onStatus("error", getFriendlyErrorMessage(error, "cargar la unidad"));
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [unidadId]);

  useEffect(() => subscribeToReviewMarks(setMarkedObjetivoIds), []);

  useEffect(() => {
    if (!data) {
      return;
    }

    const firstMarkedObjetivo = visibleObjetivos.find((item) => markedObjetivoIds.includes(item.id));

    if (!visibleObjetivos.some((item) => item.id === selectedObjetivoId)) {
      setSelectedObjetivoId(firstMarkedObjetivo?.id ?? visibleObjetivos[0]?.id ?? null);
    }

    if (!data.evaluaciones.some((item) => item.id === selectedEvaluacionId)) {
      setSelectedEvaluacionId(data.evaluaciones[0]?.id ?? null);
    }
  }, [
    data,
    objetivoSearchResults,
    objetivoSearchTerm,
    selectedEvaluacionId,
    selectedObjetivoId,
  ]);

  useEffect(() => {
    if (!data) {
      return;
    }

    if (!objetivoSearchTerm.trim()) {
      setObjetivoSearchResults(null);
      setIsSearchingObjetivos(false);
      return;
    }

    let cancelled = false;
    setIsSearchingObjetivos(true);

    const timeoutId = window.setTimeout(() => {
      void searchObjetivosAprendizaje(data.unidad.id, objetivoSearchTerm)
        .then((results) => {
          if (cancelled) {
            return;
          }

          setObjetivoSearchResults(results);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          onStatus("error", getFriendlyErrorMessage(error, "buscar objetivos de aprendizaje"));
          setObjetivoSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearchingObjetivos(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [data, objetivoSearchTerm, onStatus]);

  function getSelectOptions(entityKey: EntityKey): Record<string, SelectOption[]> | undefined {
    if (!data || entityKey !== "evaluaciones") {
      return undefined;
    }

    return {
      objetivo_aprendizaje_id: data.objetivos.map((objetivo) => ({
        value: String(objetivo.id),
        label: `${objetivo.codigo} - ${objetivo.texto}`,
      })),
    };
  }

  function buildCreateDefaults(entityKey: EntityKey): EntityPayload {
    if (!data) {
      return {};
    }

    switch (entityKey) {
      case "unidades":
        return {
          programa_id: data.programa.id,
        };
      case "objetivos_aprendizaje":
        return {
          unidad_id: data.unidad.id,
          orden_item: getNextNumericValue(data.objetivos, "orden_item"),
        };
      case "indicadores_evaluacion":
        return {
          objetivo_aprendizaje_id: selectedObjetivoId,
          orden_item: getNextNumericValue(indicadoresSeleccionados, "orden_item"),
        };
      case "evaluaciones":
        return {
          unidad_id: data.unidad.id,
          orden_item: getNextNumericValue(data.evaluaciones, "orden_item"),
        };
      case "criterios_evaluacion":
        return {
          evaluacion_id: selectedEvaluacionId,
          orden_item: getNextNumericValue(criteriosSeleccionados, "orden_item"),
        };
      case "actividades_evaluacion":
        return {
          evaluacion_id: selectedEvaluacionId,
          orden_item: getNextNumericValue(actividadesSeleccionadas, "orden_item"),
        };
      case "unidad_actitudes":
        return {
          unidad_id: data.unidad.id,
          orden_item: getNextNumericValue(data.actitudes, "orden_item"),
        };
      case "unidad_conocimientos":
        return {
          unidad_id: data.unidad.id,
          orden_item: getNextNumericValue(data.conocimientos, "orden_item"),
        };
      case "unidad_conocimientos_previos":
        return {
          unidad_id: data.unidad.id,
          orden_item: getNextNumericValue(data.conocimientosPrevios, "orden_item"),
        };
      case "unidad_habilidades":
        return {
          unidad_id: data.unidad.id,
          orden_item: getNextNumericValue(data.habilidades, "orden_item"),
        };
      case "unidad_palabras_clave":
        return {
          unidad_id: data.unidad.id,
          orden_item: getNextNumericValue(data.palabrasClave, "orden_item"),
        };
      case "unidad_lecturas_sugeridas":
        return {
          unidad_id: data.unidad.id,
          orden_item: getNextNumericValue(data.lecturasSugeridas, "orden_item"),
        };
      default:
        return {};
    }
  }

  const objetivoSeleccionado = useMemo(
    () => data?.objetivos.find((item) => item.id === selectedObjetivoId) ?? null,
    [data, selectedObjetivoId],
  );

  const evaluacionSeleccionada = useMemo(
    () => data?.evaluaciones.find((item) => item.id === selectedEvaluacionId) ?? null,
    [data, selectedEvaluacionId],
  );

  function openCreate(entityKey: EntityKey) {
    if (entityKey === "indicadores_evaluacion" && !selectedObjetivoId) {
      onStatus("info", "Selecciona primero un objetivo de aprendizaje.");
      return;
    }

    if ((entityKey === "criterios_evaluacion" || entityKey === "actividades_evaluacion") && !selectedEvaluacionId) {
      onStatus("info", "Selecciona primero una evaluacion.");
      return;
    }

    setModalState({
      entityKey,
      mode: "create",
      initialValues: buildCreateDefaults(entityKey),
    });
  }

  function openEdit(entityKey: EntityKey, row: AnyEntityRow) {
    setModalState({
      entityKey,
      mode: "edit",
      editingId: row.id,
      initialValues: row,
    });
  }

  async function handleSave(values: EntityPayload) {
    if (!modalState || !data) {
      return;
    }

    const payload = { ...values };

    if (modalState.entityKey === "evaluaciones" && payload.objetivo_aprendizaje_id) {
      const objetivo = data.objetivos.find(
        (item) => item.id === Number(payload.objetivo_aprendizaje_id),
      );

      if (objetivo) {
        if (!payload.codigo_oa) {
          payload.codigo_oa = objetivo.codigo;
        }

        if (!payload.texto_oa) {
          payload.texto_oa = objetivo.texto;
        }
      }
    }

    try {
      if (modalState.mode === "create") {
        await createEntity(modalState.entityKey, payload);
        onStatus("success", "Registro creado.");
      } else if (modalState.editingId) {
        await updateEntity(modalState.entityKey, modalState.editingId, payload);
        onStatus("success", "Registro actualizado.");
      }

      await loadData(true);
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error, "guardar el registro"));
    }
  }

  async function handleDelete(entityKey: EntityKey, row: AnyEntityRow) {
    const label = (() => {
      if ("titulo" in row && row.titulo) {
        return row.titulo;
      }

      if ("codigo" in row && row.codigo) {
        return row.codigo;
      }

      if ("contenido" in row && row.contenido) {
        return row.contenido;
      }

      if ("numero_unidad" in row && row.numero_unidad) {
        return `Unidad ${row.numero_unidad}`;
      }

      return "este registro";
    })();

    const confirmed = window.confirm(`Vas a eliminar "${label}". Esta accion no se puede deshacer.`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteEntity(entityKey, row.id, row);
      onStatus("success", "Registro eliminado.");
      await loadData(true);
    } catch (error) {
      onStatus("error", getFriendlyErrorMessage(error, "eliminar el registro"));
    }
  }

  function renderSimpleContentSection(
    entityKey: UnitTabKey,
    rows: UnidadContenidoRow[] | UnidadLecturaSugeridaRow[],
  ) {
    const title = unitTabItems.find((item) => item.key === entityKey)?.label ?? entityKey;
    const config = getEntityConfig(entityKey);

    return (
      <SectionCard
        actionLabel={`Agregar ${config.singularLabel}`}
        description="Mantiene la lista ordenada y con formularios simples."
        onAction={() => openCreate(entityKey)}
        title={title}
      >
        <EntityTable
          actions={[
            {
              label: "Editar",
              onClick: (row) => openEdit(entityKey, row),
            },
            {
              label: "Eliminar",
              onClick: (row) => void handleDelete(entityKey, row),
              tone: "danger",
            },
          ]}
          emptyMessage={`Aun no hay registros en ${title.toLowerCase()}.`}
          entityKey={entityKey}
          rows={rows}
        />
      </SectionCard>
    );
  }

  function renderObjetivosSection() {
    const markedObjetivoIdSet = new Set(markedObjetivoIds);
    const visibleObjetivosRows = visibleObjetivos.map((objetivo) => ({
      ...objetivo,
      review_marked: markedObjetivoIdSet.has(objetivo.id) ? 1 : 0,
    }));
    const searchIsActive = objetivoSearchTerm.trim().length > 0;

    return (
      <div className="master-detail-grid">
        <SectionCard
          actionLabel="Nuevo objetivo"
          description="Selecciona un objetivo para administrar sus indicadores."
          onAction={() => openCreate("objetivos_aprendizaje")}
          title="Objetivos de aprendizaje"
        >
          <div className="section-search">
            <label className="search-box section-search-box" htmlFor="objetivos-search">
              <span>Buscar objetivo</span>
              <input
                id="objetivos-search"
                onChange={(event) => setObjetivoSearchTerm(event.target.value)}
                placeholder="Ej. resolver problemas con fracciones equivalentes"
                type="search"
                value={objetivoSearchTerm}
              />
            </label>
            <div className="section-search-meta" aria-live="polite">
              {isSearchingObjetivos
                ? "Buscando..."
                : searchIsActive
                  ? `${visibleObjetivos.length} resultado(s), ordenados por similitud`
                  : `${data?.objetivos.length ?? 0} objetivo(s) en esta unidad`}
            </div>
          </div>
          <EntityTable
            actions={[
              {
                label: (row) =>
                  markedObjetivoIdSet.has(row.id) ? "Quitar marca" : "Marcar error",
                onClick: (row) => {
                  const isMarked = markedObjetivoIdSet.has(row.id);
                  setObjectiveMarked(row.id, !isMarked);
                },
              },
              {
                label: "Editar",
                onClick: (row) => openEdit("objetivos_aprendizaje", row),
              },
              {
                label: "Eliminar",
                onClick: (row) => void handleDelete("objetivos_aprendizaje", row),
                tone: "danger",
              },
            ]}
            emptyMessage={
              searchIsActive
                ? "No hubo coincidencias para esa descripcion."
                : "Esta unidad aun no tiene objetivos de aprendizaje."
            }
            entityKey="objetivos_aprendizaje"
            getRowClassName={(row) =>
              Number("review_marked" in row ? row.review_marked : 0) > 0 ? "table-row-flagged" : undefined
            }
            onSelect={(row) => setSelectedObjetivoId(row.id)}
            rows={visibleObjetivosRows}
            selectedId={selectedObjetivoId}
          />
        </SectionCard>

        <SectionCard
          actionLabel="Nuevo indicador"
          description={
            objetivoSeleccionado
              ? "El nuevo indicador se vinculara automaticamente al objetivo seleccionado."
              : "Selecciona un objetivo para habilitar los indicadores."
          }
          onAction={() => openCreate("indicadores_evaluacion")}
          title="Indicadores de evaluacion"
        >
          {objetivoSeleccionado ? (
            <>
              <div className="selection-summary">
                <div className="review-code-cell">
                  <strong>{objetivoSeleccionado.codigo}</strong>
                  {markedObjetivoIdSet.has(objetivoSeleccionado.id) ? (
                    <span className="review-badge">Marcado</span>
                  ) : null}
                </div>
                <p>{objetivoSeleccionado.texto}</p>
              </div>
              <EntityTable
                actions={[
                  {
                    label: "Editar",
                    onClick: (row) => openEdit("indicadores_evaluacion", row),
                  },
                  {
                    label: "Eliminar",
                    onClick: (row) => void handleDelete("indicadores_evaluacion", row),
                    tone: "danger",
                  },
                ]}
                emptyMessage="Este objetivo aun no tiene indicadores."
                entityKey="indicadores_evaluacion"
                rows={indicadoresSeleccionados}
              />
            </>
          ) : (
            <div className="empty-state">Selecciona un objetivo para ver sus indicadores.</div>
          )}
        </SectionCard>
      </div>
    );
  }

  function renderEvaluacionesSection() {

    return (
      <>
        <div className="master-detail-grid">
          <SectionCard
            actionLabel="Nueva evaluacion"
            description="Selecciona una evaluacion para administrar criterios y actividades."
            onAction={() => openCreate("evaluaciones")}
            title="Evaluaciones"
          >
            <EntityTable
              actions={[
                {
                  label: "Editar",
                  onClick: (row) => openEdit("evaluaciones", row),
                },
                {
                  label: "Eliminar",
                  onClick: (row) => void handleDelete("evaluaciones", row),
                  tone: "danger",
                },
              ]}
              emptyMessage="Esta unidad aun no tiene evaluaciones."
              entityKey="evaluaciones"
              onSelect={(row) => setSelectedEvaluacionId(row.id)}
              rows={data?.evaluaciones ?? []}
              selectedId={selectedEvaluacionId}
            />
          </SectionCard>

          <SectionCard
            description={
              evaluacionSeleccionada
                ? "La evaluacion seleccionada define automaticamente la relacion de los hijos."
                : "Selecciona una evaluacion para ver sus detalles."
            }
            title="Detalle de evaluacion"
          >
            {evaluacionSeleccionada ? (
              <SummaryGrid entityKey="evaluaciones" row={evaluacionSeleccionada} />
            ) : (
              <div className="empty-state">Selecciona una evaluacion para ver sus datos.</div>
            )}
          </SectionCard>
        </div>

        <div className="master-detail-grid">
          <SectionCard
            actionLabel="Nuevo criterio"
            description="Los criterios se crean directamente dentro de la evaluacion seleccionada."
            onAction={() => openCreate("criterios_evaluacion")}
            title="Criterios de evaluacion"
          >
            <EntityTable
              actions={[
                {
                  label: "Editar",
                  onClick: (row) => openEdit("criterios_evaluacion", row),
                },
                {
                  label: "Eliminar",
                  onClick: (row) => void handleDelete("criterios_evaluacion", row),
                  tone: "danger",
                },
              ]}
              emptyMessage="No hay criterios para la evaluacion seleccionada."
              entityKey="criterios_evaluacion"
              rows={criteriosSeleccionados}
            />
          </SectionCard>

          <SectionCard
            actionLabel="Nueva actividad"
            description="Las actividades quedan vinculadas automaticamente a la evaluacion elegida."
            onAction={() => openCreate("actividades_evaluacion")}
            title="Actividades de evaluacion"
          >
            <EntityTable
              actions={[
                {
                  label: "Editar",
                  onClick: (row) => openEdit("actividades_evaluacion", row),
                },
                {
                  label: "Eliminar",
                  onClick: (row) => void handleDelete("actividades_evaluacion", row),
                  tone: "danger",
                },
              ]}
              emptyMessage="No hay actividades para la evaluacion seleccionada."
              entityKey="actividades_evaluacion"
              rows={actividadesSeleccionadas}
            />
          </SectionCard>
        </div>
      </>
    );
  }

  if (loading) {
    return <SectionCard title="Unidad">Cargando unidad...</SectionCard>;
  }

  if (!data) {
    return <SectionCard title="Unidad">No se encontro la unidad.</SectionCard>;
  }

  const unitTitle = data.unidad.titulo
    ? `Unidad ${data.unidad.numero_unidad}: ${data.unidad.titulo}`
    : `Unidad ${data.unidad.numero_unidad}`;
  const unitMeta = [
    `Paginas ${data.unidad.pagina_inicio ?? "-"} a ${data.unidad.pagina_fin ?? "-"}`,
  ];
  const activeTabLabel = unitTabItems.find((item) => item.key === activeTab)?.label ?? "Unidad";

  const contentRows = getContentRows(data, activeTab);

  return (
    <>
      <section className="detail-heading">
        <div>
          <h2>{unitTitle}</h2>
          {data.unidad.proposito ? <p className="detail-heading-purpose">{data.unidad.proposito}</p> : null}
          <p className="detail-heading-meta">{unitMeta.join(" · ")}</p>
        </div>
        <div className="detail-heading-actions">
          <ProgramNotesButton
            programId={programaId}
            sectionLabel={activeTabLabel}
            unitId={data.unidad.id}
          />
          <button className="button button-secondary" onClick={() => openEdit("unidades", data.unidad)} type="button">
            Editar unidad
          </button>
        </div>
      </section>

      <SectionCard description="Toda la base se organiza como contenido jerarquico, no como tablas aisladas." title="Contenido de la unidad">
        <Tabs activeKey={activeTab} items={[...unitTabItems]} onChange={(key) => setActiveTab(key as UnitTabKey)} />
      </SectionCard>

      {activeTab === "objetivos_aprendizaje" ? renderObjetivosSection() : null}
      {activeTab === "evaluaciones" ? renderEvaluacionesSection() : null}
      {activeTab !== "objetivos_aprendizaje" && activeTab !== "evaluaciones"
        ? renderSimpleContentSection(activeTab, contentRows)
        : null}

      {modalState ? (
        <EntityFormModal
          entityKey={modalState.entityKey}
          initialValues={modalState.initialValues}
          isOpen
          onClose={() => setModalState(null)}
          onSubmit={handleSave}
          selectOptions={getSelectOptions(modalState.entityKey)}
          submitLabel={modalState.mode === "create" ? "Guardar" : "Guardar cambios"}
          title={`${modalState.mode === "create" ? "Nuevo" : "Editar"} ${getEntityConfig(modalState.entityKey).singularLabel}`}
        />
      ) : null}
    </>
  );
}
