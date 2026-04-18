import { useEffect, useState } from "react";
import {
  createProgramNote,
  deleteProgramNote,
  listProgramNotes,
  type ProgramNote,
} from "../../lib/programNotes";
import { Modal } from "./Modal";

interface ProgramNotesButtonProps {
  programId: number;
  unitId?: number | null;
  sectionLabel?: string | null;
  unitOptions?: Array<{
    value: number;
    label: string;
  }>;
}

export function ProgramNotesButton({
  programId,
  unitId = null,
  sectionLabel = null,
  unitOptions = [],
}: ProgramNotesButtonProps) {
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [programNotes, setProgramNotes] = useState<ProgramNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const shouldChooseUnit = unitId === null && unitOptions.length > 0;

  useEffect(() => {
    let cancelled = false;

    setProgramNotes([]);
    setIsLoadingNotes(true);
    setShowNotesModal(false);
    setIsAddingNote(false);
    setSelectedUnitId("");
    setNoteTitle("");
    setNoteContent("");
    setNoteError(null);

    void listProgramNotes(programId)
      .then((nextNotes) => {
        if (!cancelled) {
          setProgramNotes(nextNotes);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setNoteError(error instanceof Error ? error.message : "No se pudieron cargar las notas.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingNotes(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [programId]);

  function handleOpenNotes() {
    setShowNotesModal(true);
    setNoteError(null);
    setIsLoadingNotes(true);

    void listProgramNotes(programId)
      .then((nextNotes) => {
        setProgramNotes(nextNotes);
      })
      .catch((error) => {
        setNoteError(error instanceof Error ? error.message : "No se pudieron cargar las notas.");
      })
      .finally(() => {
        setIsLoadingNotes(false);
      });
  }

  async function handleSaveNote() {
    try {
      setIsLoadingNotes(true);
      const nextNotes = await createProgramNote({
        programId,
        unitId: unitId ?? (selectedUnitId ? Number(selectedUnitId) : null),
        section: sectionLabel,
        title: noteTitle,
        content: noteContent,
      });
      setProgramNotes(nextNotes);
      setNoteTitle("");
      setNoteContent("");
      setNoteError(null);
      setIsAddingNote(false);
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "No se pudo guardar la nota.");
    } finally {
      setIsLoadingNotes(false);
    }
  }

  async function handleDeleteNote(note: ProgramNote) {
    try {
      setIsLoadingNotes(true);
      setProgramNotes(await deleteProgramNote(programId, note.id, note));
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "No se pudo eliminar la nota.");
    } finally {
      setIsLoadingNotes(false);
    }
  }

  return (
    <>
      <button
        className="button button-secondary program-notes-launcher"
        onClick={handleOpenNotes}
        type="button"
      >
        {programNotes.length > 0 ? `Notas (${programNotes.length})` : "Notas"}
      </button>

      {showNotesModal ? (
        <Modal
          onClose={() => {
            setShowNotesModal(false);
            setIsAddingNote(false);
            setSelectedUnitId("");
            setNoteError(null);
          }}
          placement="top-right"
          size="compact"
          title="Notas del programa"
        >
          <div className="notes-modal">
            <div className="notes-toolbar">
              <p className="notes-meta">
                {programNotes.length > 0
                  ? `${programNotes.length} nota(s) guardada(s) para este programa`
                  : "Todavia no hay notas guardadas para este programa."}
              </p>
              <button
                className="button button-secondary button-small"
                onClick={() => {
                  setIsAddingNote((current) => !current);
                  setNoteError(null);
                }}
                type="button"
              >
                {isAddingNote ? "Cancelar" : "Agregar nota"}
              </button>
            </div>

            {noteError ? <p className="form-error">{noteError}</p> : null}

            {isAddingNote ? (
              <div className="notes-form">
                {shouldChooseUnit ? (
                  <label className="form-field" htmlFor={`program-note-unit-${programId}`}>
                    <span>Unidad</span>
                    <select
                      id={`program-note-unit-${programId}`}
                      onChange={(event) => setSelectedUnitId(event.target.value)}
                      value={selectedUnitId}
                    >
                      <option value="">Sin unidad especifica</option>
                      {unitOptions.map((option) => (
                        <option key={option.value} value={String(option.value)}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="form-field" htmlFor={`program-note-title-${programId}`}>
                  <span>Titulo</span>
                  <input
                    id={`program-note-title-${programId}`}
                    onChange={(event) => setNoteTitle(event.target.value)}
                    placeholder="Ej. OA 4 no coincide con el PDF"
                    type="text"
                    value={noteTitle}
                  />
                </label>

                <label className="form-field" htmlFor={`program-note-content-${programId}`}>
                  <span>Nota</span>
                  <textarea
                    id={`program-note-content-${programId}`}
                    onChange={(event) => setNoteContent(event.target.value)}
                    placeholder="Escribe aqui lo que encontraste y lo que deberia revisarse."
                    rows={4}
                    value={noteContent}
                  />
                </label>

                <div className="modal-actions">
                  <button
                    className="button button-primary"
                    disabled={isLoadingNotes}
                    onClick={() => void handleSaveNote()}
                    type="button"
                  >
                    Guardar nota
                  </button>
                </div>
              </div>
            ) : null}

            {isLoadingNotes && programNotes.length === 0 ? (
              <div className="empty-state">Cargando notas...</div>
            ) : programNotes.length > 0 ? (
              <div className="notes-list">
                {programNotes.map((note) => (
                  <article className="note-card" key={note.id}>
                    <div className="note-card-head">
                      <div>
                        <h3>{note.title}</h3>
                        <small>
                          {note.createdAt
                            ? new Date(note.createdAt).toLocaleString("es-CL", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Fecha no disponible"}
                        </small>
                        {note.section || note.unit ? (
                          <span className="note-context">
                            {note.unit
                              ? `Unidad ${note.unit.numero_unidad}${note.unit.titulo ? `: ${note.unit.titulo}` : ""}`
                              : "Programa"}
                            {note.section ? ` · ${note.section}` : ""}
                          </span>
                        ) : null}
                      </div>
                      <button
                        className="button button-secondary button-small"
                        disabled={isLoadingNotes}
                        onClick={() => void handleDeleteNote(note)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </div>
                    <p>{note.content}</p>
                  </article>
                ))}
              </div>
            ) : !isAddingNote ? (
              <div className="empty-state">Usa Agregar nota para registrar algo raro o irregular.</div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </>
  );
}
