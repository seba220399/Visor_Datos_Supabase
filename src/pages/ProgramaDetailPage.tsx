import { useEffect, useState } from "react";
import { Modal } from "../components/common/Modal";
import { ProgramNotesButton } from "../components/common/ProgramNotesButton";
import { EntityFormModal } from "../components/entity/EntityFormModal";
import { DriveComparisonPanel } from "../components/entity/DriveComparisonPanel";
import { EntityTable } from "../components/entity/EntityTable";
import { SectionCard } from "../components/entity/SectionCard";
import { SummaryGrid } from "../components/common/SummaryGrid";
import { getFriendlyErrorMessage } from "../lib/errors";
import { getMarkedObjectiveIds, setObjectiveMarked, subscribeToReviewMarks } from "../lib/reviewMarks";
import { getNextNumericValue } from "../lib/records";
import { navigateTo, routeToHash, type BreadcrumbItem } from "../lib/navigation";
import { createEntity, deleteEntity, updateEntity } from "../services/entityService";
import {
  getProgramaComparisonHierarchy,
  getProgramaHierarchy,
  type ProgramaComparisonHierarchy,
} from "../services/hierarchyService";
import type {
  EntityPayload,
  ObjetivoAprendizajeRow,
  ProgramaRow,
  UnidadRow,
} from "../types/entities";

interface ProgramaDetailPageProps {
  programaId: number;
  onStatus: (tone: "success" | "error" | "info", message: string) => void;
  onBreadcrumbs: (items: BreadcrumbItem[]) => void;
}

interface EntityModalState {
  entityKey: "programas" | "unidades";
  mode: "create" | "edit";
  initialValues: EntityPayload;
  editingId?: number;
}

export function ProgramaDetailPage({
  programaId,
  onStatus,
  onBreadcrumbs,
}: ProgramaDetailPageProps) {
  const [programa, setPrograma] = useState<ProgramaRow | null>(null);
  const [unidades, setUnidades] = useState<UnidadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<EntityModalState | null>(null);
  const [showProgramInfo, setShowProgramInfo] = useState(false);
  const [showComparisonMode, setShowComparisonMode] = useState(false);
  const [comparisonData, setComparisonData] = useState<ProgramaComparisonHierarchy | null>(null);
  const [isLoadingComparisonData, setIsLoadingComparisonData] = useState(false);
  const [selectedComparisonObjetivo, setSelectedComparisonObjetivo] =
    useState<ObjetivoAprendizajeRow | null>(null);
  const [markedObjetivoIds, setMarkedObjetivoIds] = useState<number[]>(() => getMarkedObjectiveIds());

  async function loadData(silent = false) {
    if (!silent) setLoading(true);

    try {
      const data = await getProgramaHierarchy(programaId);
      setPrograma(data.programa);
      setUnidades(data.unidades);
      onBreadcrumbs([
        { label: "Programas", href: routeToHash({ name: "programas" }) },
        { label: data.programa.titulo ?? data.programa.archivo_fuente },
      ]);
    } catch (error) {
      onStatus("error", getFriendlyErrorMessage(error, "cargar el programa"));
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [programaId]);

  useEffect(() => {
    if (!showComparisonMode) {
      return;
    }

    let cancelled = false;
    setIsLoadingComparisonData(true);

    void getProgramaComparisonHierarchy(programaId)
      .then((nextData) => {
        if (cancelled) {
          return;
        }

        setComparisonData(nextData);
      })
      .catch((error) => {
        if (!cancelled) {
          onStatus("error", getFriendlyErrorMessage(error, "cargar los objetivos del programa"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingComparisonData(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onStatus, programaId, showComparisonMode]);

  useEffect(() => subscribeToReviewMarks(setMarkedObjetivoIds), []);

  async function handleSave(values: EntityPayload) {
    if (!modalState) {
      return;
    }

    try {
      if (modalState.mode === "create") {
        await createEntity(modalState.entityKey, values);
        onStatus(
          "success",
          modalState.entityKey === "programas" ? "Programa creado." : "Unidad creada.",
        );
      } else if (modalState.editingId) {
        await updateEntity(modalState.entityKey, modalState.editingId, values);
        onStatus(
          "success",
          modalState.entityKey === "programas" ? "Programa actualizado." : "Unidad actualizada.",
        );
      }

      await loadData(true);
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error, "guardar los cambios"));
    }
  }

  async function handleDeleteUnidad(unidad: UnidadRow) {
    const confirmed = window.confirm(
      `Vas a eliminar la unidad ${unidad.numero_unidad}. Esta accion no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteEntity("unidades", unidad.id, unidad);
      onStatus("success", "Unidad eliminada.");
      await loadData(true);
    } catch (error) {
      onStatus("error", getFriendlyErrorMessage(error, "eliminar la unidad"));
    }
  }

  if (loading) {
    return <SectionCard title="Programa">Cargando programa...</SectionCard>;
  }

  if (!programa) {
    return <SectionCard title="Programa">No se encontro el programa.</SectionCard>;
  }

  const programTitle = programa.titulo ?? programa.archivo_fuente;
  const programMeta = [programa.asignatura, programa.curso, programa.nivel_educativo].filter(Boolean);
  const markedObjetivoIdSet = new Set(markedObjetivoIds);
  const markedObjectivesByUnit = new Map<number, number>();

  if (comparisonData) {
    for (const objetivo of comparisonData.objetivos) {
      if (!markedObjetivoIdSet.has(objetivo.id)) {
        continue;
      }

      markedObjectivesByUnit.set(
        objetivo.unidad_id,
        (markedObjectivesByUnit.get(objetivo.unidad_id) ?? 0) + 1,
      );
    }
  }

  const unitRows = unidades.map((unidad) => ({
    ...unidad,
    marked_objectives_count: markedObjectivesByUnit.get(unidad.id) ?? 0,
  }));
  const unidadesSection = (
    <SectionCard
      actionLabel="Nueva unidad"
      description="Las unidades se ordenan por numero y heredan automaticamente su programa."
      onAction={() =>
        setModalState({
          entityKey: "unidades",
          mode: "create",
          initialValues: {
            programa_id: programa.id,
            numero_unidad: getNextNumericValue(unidades, "numero_unidad"),
          },
        })
      }
      title="Unidades"
    >
      <EntityTable
        actions={[
          {
            label: "Abrir",
            onClick: (row) =>
              navigateTo({
                name: "unidad",
                programaId: programa.id,
                unidadId: row.id,
              }),
              tone: "primary",
          },
          {
            label: "Editar",
            onClick: (row) =>
              setModalState({
                entityKey: "unidades",
                mode: "edit",
                editingId: row.id,
                initialValues: row,
              }),
          },
          {
            label: "Eliminar",
            onClick: (row) => void handleDeleteUnidad(row as UnidadRow),
            tone: "danger",
          },
        ]}
        emptyMessage="Este programa todavia no tiene unidades."
        entityKey="unidades"
        getRowClassName={(row) =>
          Number("marked_objectives_count" in row ? row.marked_objectives_count : 0) > 0
            ? "table-row-flagged"
            : undefined
        }
        rows={unitRows}
      />
    </SectionCard>
  );

  const sortedComparisonObjectives = comparisonData
    ? [...comparisonData.objetivos].sort((left, right) => {
        const leftUnit = comparisonData.unidades.find((unidad) => unidad.id === left.unidad_id);
        const rightUnit = comparisonData.unidades.find((unidad) => unidad.id === right.unidad_id);
        const leftOrder = leftUnit?.numero_unidad ?? 0;
        const rightOrder = rightUnit?.numero_unidad ?? 0;

        return leftOrder - rightOrder || left.orden_item - right.orden_item;
      })
    : [];

  function getComparisonObjectiveUnit(objetivo: ObjetivoAprendizajeRow) {
    return comparisonData?.unidades.find((unidad) => unidad.id === objetivo.unidad_id) ?? null;
  }

  function formatComparisonObjectiveUnit(objetivo: ObjetivoAprendizajeRow) {
    const unidad = getComparisonObjectiveUnit(objetivo);

    if (!unidad) {
      return "Unidad no encontrada";
    }

    return `Unidad ${unidad.numero_unidad}${unidad.titulo ? `: ${unidad.titulo}` : ""}`;
  }

  function getComparisonObjectiveIndicadores(objetivo: ObjetivoAprendizajeRow) {
    return (comparisonData?.indicadores ?? []).filter(
      (indicador) => indicador.objetivo_aprendizaje_id === objetivo.id,
    );
  }

  function getComparisonObjectiveEvaluaciones(objetivo: ObjetivoAprendizajeRow) {
    return (comparisonData?.evaluaciones ?? []).filter(
      (evaluacion) => evaluacion.objetivo_aprendizaje_id === objetivo.id,
    );
  }

  function getComparisonObjectiveCriterios(objetivo: ObjetivoAprendizajeRow) {
    const evaluaciones = getComparisonObjectiveEvaluaciones(objetivo);
    const evaluacionIds = new Set(evaluaciones.map((evaluacion) => evaluacion.id));

    return (comparisonData?.criterios ?? []).filter((criterio) => evaluacionIds.has(criterio.evaluacion_id));
  }

  function renderObjectiveComparisonSection() {
    return (
      <SectionCard title="Objetivos del programa">
        {isLoadingComparisonData ? (
          <div className="empty-state">Cargando objetivos del programa...</div>
        ) : sortedComparisonObjectives.length > 0 ? (
          <div className="table-wrapper">
            <table className="entity-table objective-compact-table">
              <thead>
                <tr>
                  <th scope="col">OA</th>
                  <th scope="col">Unidad</th>
                  <th scope="col">Accion</th>
                </tr>
              </thead>
              <tbody>
                {sortedComparisonObjectives.map((objetivo) => {
                  const isMarked = markedObjetivoIdSet.has(objetivo.id);

                  return (
                    <tr className={isMarked ? "table-row-flagged" : undefined} key={objetivo.id}>
                      <td>
                        <div className="review-code-cell">
                          <strong>{objetivo.codigo}</strong>
                          {isMarked ? <span className="review-badge">Marcado</span> : null}
                        </div>
                      </td>
                      <td>{formatComparisonObjectiveUnit(objetivo)}</td>
                      <td>
                        <div className="action-row">
                          <button
                            className="button button-secondary button-small"
                            onClick={() => {
                              setObjectiveMarked(objetivo.id, !isMarked);
                            }}
                            type="button"
                          >
                            {isMarked ? "Quitar marca" : "Marcar error"}
                          </button>
                          <button
                            className="button button-secondary button-small"
                            onClick={() => setSelectedComparisonObjetivo(objetivo)}
                            type="button"
                          >
                            Mas info
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">Este programa no tiene objetivos cargados.</div>
        )}
      </SectionCard>
    );
  }

  return (
    <>
      <section className="detail-heading">
        <div>
          <h2>{programTitle}</h2>
          <p className="detail-heading-meta">
            {programMeta.length > 0 ? programMeta.join(" · ") : "Sin asignatura, curso o nivel educativo."}
          </p>
        </div>
        <div className="detail-heading-actions">
          <button className="button button-secondary" onClick={() => setShowProgramInfo(true)} type="button">
            Mas info
          </button>
          <ProgramNotesButton
            programId={programaId}
            sectionLabel={showComparisonMode ? "Comparacion con PDF" : "Vista general del programa"}
            unitOptions={unidades.map((unidad) => ({
              value: unidad.id,
              label: unidad.titulo
                ? `Unidad ${unidad.numero_unidad}: ${unidad.titulo}`
                : `Unidad ${unidad.numero_unidad}`,
            }))}
          />
          <button
            className="button button-secondary"
            onClick={() => setShowComparisonMode((current) => !current)}
            type="button"
          >
            {showComparisonMode ? "Volver a unidades" : "Comparar con PDF"}
          </button>
          {!showComparisonMode ? (
            <button
              className="button button-secondary"
              onClick={() =>
                setModalState({
                  entityKey: "programas",
                  mode: "edit",
                  editingId: programa.id,
                  initialValues: programa,
                })
              }
              type="button"
            >
              Editar programa
            </button>
          ) : null}
        </div>
      </section>

      <div className={showComparisonMode ? "comparison-layout" : "comparison-layout view-hidden"} aria-hidden={!showComparisonMode}>
        <aside className="comparison-sidebar">
          <DriveComparisonPanel onStatus={onStatus} programa={programa} />
        </aside>
        <div className="comparison-main">{renderObjectiveComparisonSection()}</div>
      </div>

      <div className={showComparisonMode ? "view-hidden" : undefined} aria-hidden={showComparisonMode}>
        {unidadesSection}
      </div>

      {modalState ? (
        <EntityFormModal
          entityKey={modalState.entityKey}
          initialValues={modalState.initialValues}
          isOpen
          onClose={() => setModalState(null)}
          onSubmit={handleSave}
          submitLabel={modalState.mode === "create" ? "Guardar" : "Guardar cambios"}
          title={
            modalState.entityKey === "programas"
              ? "Editar programa"
              : modalState.mode === "create"
                ? "Nueva unidad"
                : "Editar unidad"
          }
        />
      ) : null}

      {showProgramInfo ? (
        <Modal onClose={() => setShowProgramInfo(false)} title="Mas info del programa">
          <SummaryGrid entityKey="programas" row={programa} />
        </Modal>
      ) : null}

      {selectedComparisonObjetivo ? (
        <Modal onClose={() => setSelectedComparisonObjetivo(null)} title={`Detalle de ${selectedComparisonObjetivo.codigo}`}>
          <div className="objective-detail-grid">
            <section className="objective-detail-section">
              <h3>Objetivo</h3>
              <div className="review-detail-row">
                {markedObjetivoIdSet.has(selectedComparisonObjetivo.id) ? (
                  <span className="review-badge">Marcado para revisar</span>
                ) : null}
                <button
                  className="button button-secondary button-small"
                  onClick={() => {
                    const isMarked = markedObjetivoIdSet.has(selectedComparisonObjetivo.id);
                    setObjectiveMarked(selectedComparisonObjetivo.id, !isMarked);
                  }}
                  type="button"
                >
                  {markedObjetivoIdSet.has(selectedComparisonObjetivo.id) ? "Quitar marca" : "Marcar error"}
                </button>
              </div>
              <p className="objective-detail-text">{selectedComparisonObjetivo.texto}</p>
            </section>

            <section className="objective-detail-section">
              <h3>Unidad</h3>
              <p className="objective-detail-text">
                {formatComparisonObjectiveUnit(selectedComparisonObjetivo)}
              </p>
            </section>

            <section className="objective-detail-section">
              <h3>Indicadores relacionados</h3>
              {getComparisonObjectiveIndicadores(selectedComparisonObjetivo).length > 0 ? (
                <ul className="detail-list">
                  {getComparisonObjectiveIndicadores(selectedComparisonObjetivo).map((indicador) => (
                    <li key={indicador.id}>
                      <strong>{`#${indicador.orden_item}`}</strong> {indicador.contenido}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="objective-detail-text">No hay indicadores relacionados.</p>
              )}
            </section>

            <section className="objective-detail-section">
              <h3>Evaluaciones relacionadas</h3>
              {getComparisonObjectiveEvaluaciones(selectedComparisonObjetivo).length > 0 ? (
                <ul className="detail-list">
                  {getComparisonObjectiveEvaluaciones(selectedComparisonObjetivo).map((evaluacion) => (
                    <li key={evaluacion.id}>
                      <strong>{evaluacion.titulo}</strong>
                      {evaluacion.codigo_oa ? ` · ${evaluacion.codigo_oa}` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="objective-detail-text">No hay evaluaciones relacionadas.</p>
              )}
            </section>

            <section className="objective-detail-section">
              <h3>Criterios de evaluacion relacionados</h3>
              {getComparisonObjectiveCriterios(selectedComparisonObjetivo).length > 0 ? (
                <ul className="detail-list">
                  {getComparisonObjectiveCriterios(selectedComparisonObjetivo).map((criterio) => {
                    const evaluacion = getComparisonObjectiveEvaluaciones(selectedComparisonObjetivo).find(
                      (item) => item.id === criterio.evaluacion_id,
                    );

                    return (
                      <li key={criterio.id}>
                        <strong>
                          {evaluacion?.titulo ?? "Evaluacion"} {`#${criterio.orden_item}`}
                        </strong>{" "}
                        {criterio.contenido}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="objective-detail-text">No hay criterios relacionados.</p>
              )}
            </section>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
