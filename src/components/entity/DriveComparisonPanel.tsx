import { useEffect, useRef, useState } from "react";
import {
  downloadGoogleDrivePdf,
  filterDriveFiles,
  findSuggestedDriveFile,
  googleDriveConfigError,
  listGoogleDriveFolderPdfFiles,
} from "../../services/googleDriveService";
import type { ProgramaRow } from "../../types/entities";
import type { GoogleDriveFile } from "../../types/googleDrive";
import { SectionCard } from "./SectionCard";

interface DriveComparisonPanelProps {
  programa: ProgramaRow;
  onStatus: (tone: "success" | "error" | "info", message: string) => void;
}

export function DriveComparisonPanel({
  programa,
  onStatus,
}: DriveComparisonPanelProps) {
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [hasConnected, setHasConnected] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [fileSearchTerm, setFileSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const pdfCacheRef = useRef<Map<string, string>>(new Map());

  const visibleFiles = filterDriveFiles(driveFiles, fileSearchTerm);
  const selectedFile = driveFiles.find((item) => item.id === selectedFileId) ?? null;
  const previewSrc = previewUrl ? `${previewUrl}#zoom=110` : null;

  async function handleConnect() {
    setIsLoadingFiles(true);

    try {
      const files = await listGoogleDriveFolderPdfFiles();
      setDriveFiles(files);
      setHasConnected(true);

      const suggestedFile = findSuggestedDriveFile(programa, files);
      setSelectedFileId(suggestedFile?.id ?? files[0]?.id ?? null);

      onStatus(
        "success",
        files.length > 0
          ? `Se cargaron ${files.length} PDF(s) desde Google Drive.`
          : "La carpeta se conecto, pero no contiene PDFs visibles.",
      );

      setShowSuggestions(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo conectar Google Drive.";
      onStatus("error", message);
    } finally {
      setIsLoadingFiles(false);
    }
  }

  useEffect(() => {
    if (!selectedFileId) {
      setPreviewUrl(null);
      return;
    }

    const cached = pdfCacheRef.current.get(selectedFileId);
    if (cached) {
      setPreviewUrl(cached);
      return;
    }

    let cancelled = false;
    setIsLoadingPreview(true);

    void downloadGoogleDrivePdf(selectedFileId)
      .then((blob) => {
        if (cancelled) return;
        const nextUrl = URL.createObjectURL(blob);
        pdfCacheRef.current.set(selectedFileId, nextUrl);
        setPreviewUrl(nextUrl);
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "No se pudo cargar la vista previa del PDF.";
        onStatus("error", message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onStatus, selectedFileId]);

  useEffect(() => {
    return () => {
      for (const url of pdfCacheRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      pdfCacheRef.current.clear();
    };
  }, []);

  function handleSelectFile(file: GoogleDriveFile) {
    setSelectedFileId(file.id);
    setFileSearchTerm(file.name);
    setShowSuggestions(false);
  }

  const shouldShowSuggestions = hasConnected && showSuggestions && fileSearchTerm.trim().length > 0;

  return (
    <SectionCard>
      {googleDriveConfigError ? (
        <div className="empty-state">
          {googleDriveConfigError} Configura las variables de entorno de Google Drive para usar esta vista.
        </div>
      ) : (
        <>
          <div className="drive-toolbar">
            <div className="drive-search-area">
              <input
                aria-label="Buscar PDF en la carpeta"
                className="drive-search-input"
                disabled={!hasConnected || isLoadingFiles}
                id="drive-file-search"
                onBlur={() => {
                  window.setTimeout(() => setShowSuggestions(false), 120);
                }}
                onChange={(event) => {
                  setFileSearchTerm(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Buscar PDF en la carpeta"
                type="search"
                value={fileSearchTerm}
              />

              {shouldShowSuggestions ? (
                <div className="drive-suggestions" role="listbox">
                  {visibleFiles.length > 0 ? (
                    visibleFiles.slice(0, 10).map((file) => (
                      <button
                        className="drive-suggestion-item"
                        key={file.id}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleSelectFile(file);
                        }}
                        type="button"
                      >
                        <strong>{file.name}</strong>
                      </button>
                    ))
                  ) : (
                    <div className="drive-suggestion-empty">
                      No hay archivos que coincidan con esa búsqueda.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <button
              className="button button-primary drive-toolbar-action"
              disabled={isLoadingFiles}
              onClick={() => void handleConnect()}
              type="button"
            >
              {hasConnected ? "Recargar carpeta" : "Conectar Google Drive"}
            </button>
          </div>

          {isLoadingFiles ? <div className="empty-state">Conectando carpeta y cargando archivos...</div> : null}

          {hasConnected ? (
            <div className="pdf-preview-shell">
              {isLoadingPreview ? (
                <div className="empty-state">Cargando vista previa del PDF...</div>
              ) : previewSrc ? (
                <iframe
                  className="pdf-preview-frame"
                  src={previewSrc}
                  title={selectedFile?.name ?? "Vista previa PDF"}
                />
              ) : (
                <div className="empty-state">
                  {hasConnected
                    ? "Busca y selecciona un archivo PDF para abrir la vista previa."
                    : "Conecta la carpeta para comenzar a comparar."}
                </div>
              )}
            </div>
          ) : isLoadingFiles ? null : (
            <div className="empty-state">Conecta la carpeta para comenzar a comparar.</div>
          )}
        </>
      )}
    </SectionCard>
  );
}
