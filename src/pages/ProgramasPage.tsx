import { useEffect, useState } from "react";
import { EntityFormModal } from "../components/entity/EntityFormModal";
import { EntityTable } from "../components/entity/EntityTable";
import { SectionCard } from "../components/entity/SectionCard";
import { createEntity, deleteEntity, listEntities, updateEntity } from "../services/entityService";
import type { EntityPayload, ProgramaRow } from "../types/entities";
import { getFriendlyErrorMessage } from "../lib/errors";
import { navigateTo, routeToHash } from "../lib/navigation";

interface ProgramasPageProps {
  onStatus: (tone: "success" | "error" | "info", message: string) => void;
}

interface ProgramFormState {
  mode: "create" | "edit";
  initialValues: EntityPayload;
  editingId?: number;
}

function matchesSearch(programa: ProgramaRow, searchTerm: string) {
  const normalized = searchTerm.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [
    programa.titulo,
    programa.asignatura,
    programa.curso,
    programa.nivel_educativo,
    programa.archivo_fuente,
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalized));
}

export function ProgramasPage({ onStatus }: ProgramasPageProps) {
  const [programas, setProgramas] = useState<ProgramaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [formState, setFormState] = useState<ProgramFormState | null>(null);

  async function loadProgramas() {
    setLoading(true);

    try {
      const data = (await listEntities("programas")) as ProgramaRow[];
      setProgramas(data);
      console.info("[programas] carga completada", {
        visibles: data.length,
      });

      if (data.length === 0) {
        onStatus(
          "info",
          "No hay programas visibles con la clave actual. Esto suele significar que la base esta vacia o que RLS no permite SELECT para esta clave publica.",
        );
      }
    } catch (error) {
      onStatus("error", getFriendlyErrorMessage(error, "cargar los programas"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProgramas();
  }, []);

  async function handleCreate(values: EntityPayload) {
    try {
      await createEntity("programas", values);
      onStatus("success", "Programa creado.");
      await loadProgramas();
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error, "crear el programa"));
    }
  }

  async function handleEdit(values: EntityPayload) {
    if (!formState?.editingId) {
      return;
    }

    try {
      await updateEntity("programas", formState.editingId, values);
      onStatus("success", "Programa actualizado.");
      await loadProgramas();
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error, "actualizar el programa"));
    }
  }

  async function handleDelete(programa: ProgramaRow) {
    const confirmed = window.confirm(
      `Vas a eliminar "${programa.titulo ?? programa.archivo_fuente}". Esta accion no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteEntity("programas", programa.id, programa);
      onStatus("success", "Programa eliminado.");
      await loadProgramas();
    } catch (error) {
      onStatus("error", getFriendlyErrorMessage(error, "eliminar el programa"));
    }
  }

  const filteredProgramas = programas.filter((programa) => matchesSearch(programa, searchTerm));

  return (
    <>
      <SectionCard
        actionLabel="Nuevo programa"
        description="Busca, crea y mantiene programas sin trabajar con tablas tecnicas."
        onAction={() =>
          setFormState({
            mode: "create",
            initialValues: {},
          })
        }
        title="Programas"
      >
        <div className="toolbar">
          <label className="search-box" htmlFor="program-search">
            <span>Buscar programa</span>
            <input
              id="program-search"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Titulo, asignatura, curso o archivo"
              type="search"
              value={searchTerm}
            />
          </label>
          <a className="button button-secondary" href={routeToHash({ name: "programas" })}>
            Recargar vista
          </a>
        </div>

        {loading ? (
          <div className="empty-state">Cargando programas...</div>
        ) : (
          <EntityTable
            actions={[
              {
                label: "Abrir",
                onClick: (row) => navigateTo({ name: "programa", programaId: row.id }),
                tone: "primary",
              },
              {
                label: "Editar",
                onClick: (row) =>
                  setFormState({
                    mode: "edit",
                    editingId: row.id,
                    initialValues: row,
                  }),
              },
              {
                label: "Eliminar",
                onClick: (row) => void handleDelete(row as ProgramaRow),
                tone: "danger",
              },
            ]}
            emptyMessage="No hay programas visibles. Si sabes que existen datos, revisa las politicas RLS o la clave configurada."
            entityKey="programas"
            rows={filteredProgramas}
          />
        )}
      </SectionCard>

      {formState ? (
        <EntityFormModal
          entityKey="programas"
          initialValues={formState.initialValues}
          isOpen
          onClose={() => setFormState(null)}
          onSubmit={formState.mode === "create" ? handleCreate : handleEdit}
          submitLabel={formState.mode === "create" ? "Crear programa" : "Guardar cambios"}
          title={formState.mode === "create" ? "Nuevo programa" : "Editar programa"}
        />
      ) : null}
    </>
  );
}
