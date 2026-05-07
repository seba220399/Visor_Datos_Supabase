import type { ProgramaRow } from "../types/entities";
import type { GoogleDriveFile } from "../types/googleDrive";

const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
const googleDriveFolderId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID?.trim() ?? "";

let scriptPromise: Promise<void> | null = null;
let accessToken: string | null = null;

export const googleDriveConfigError = !googleClientId
  ? "Falta VITE_GOOGLE_CLIENT_ID."
  : !googleDriveFolderId
    ? "Falta VITE_GOOGLE_DRIVE_FOLDER_ID."
    : null;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureGoogleDriveConfig() {
  if (googleDriveConfigError) {
    throw new Error(googleDriveConfigError);
  }
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("No se pudo cargar Google Identity Services.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

async function getGoogleDriveAccessToken() {
  ensureGoogleDriveConfig();

  if (accessToken) {
    return accessToken;
  }

  await loadGoogleIdentityScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google Identity Services no esta disponible.");
  }

  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: googleClientId,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                "No se pudo autorizar el acceso a Google Drive.",
            ),
          );
          return;
        }

        accessToken = response.access_token;
        resolve(response.access_token);
      },
    });

    tokenClient?.requestAccessToken({
      prompt: "",
    });
  });
}

async function googleDriveFetchJson<T>(path: string) {
  const token = await getGoogleDriveAccessToken();
  const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive respondio con error: ${errorText}`);
  }

  return (await response.json()) as T;
}

export async function listGoogleDriveFolderPdfFiles() {
  ensureGoogleDriveConfig();

  const query = [
    `'${googleDriveFolderId}' in parents`,
    "trashed = false",
    "mimeType = 'application/pdf'",
  ].join(" and ");

  const files: GoogleDriveFile[] = [];
  let nextPageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: query,
      pageSize: "200",
      orderBy: "modifiedTime desc,name",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime,size,webViewLink,thumbnailLink)",
    });

    if (nextPageToken) {
      params.set("pageToken", nextPageToken);
    }

    const payload = await googleDriveFetchJson<{
      files?: GoogleDriveFile[];
      nextPageToken?: string;
    }>(`files?${params.toString()}`);

    files.push(...(payload.files ?? []));
    nextPageToken = payload.nextPageToken;
  } while (nextPageToken);

  return files;
}

export async function downloadGoogleDrivePdf(fileId: string) {
  const token = await getGoogleDriveAccessToken();
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`No se pudo descargar el PDF desde Google Drive: ${errorText}`);
  }

  return response.blob();
}

function getReferenceTexts(programa: ProgramaRow) {
  return [
    programa.archivo_fuente,
    programa.titulo ?? "",
    `${programa.asignatura ?? ""} ${programa.curso ?? ""}`,
  ]
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

export function scoreDriveFileForPrograma(programa: ProgramaRow, file: GoogleDriveFile) {
  const references = getReferenceTexts(programa);
  const normalizedName = normalizeText(file.name);

  if (!normalizedName) {
    return 0;
  }

  let score = 0;

  for (const reference of references) {
    if (!reference) {
      continue;
    }

    if (normalizedName === reference) {
      score += 220;
      continue;
    }

    if (normalizedName.includes(reference) || reference.includes(normalizedName)) {
      score += 120;
    }

    const referenceTerms = reference.split(" ").filter(Boolean);
    const fileTerms = normalizedName.split(" ").filter(Boolean);

    for (const term of referenceTerms) {
      if (fileTerms.includes(term)) {
        score += 16;
      } else if (fileTerms.some((candidate) => candidate.startsWith(term) || term.startsWith(candidate))) {
        score += 8;
      }
    }
  }

  return score;
}

export function findSuggestedDriveFile(programa: ProgramaRow, files: GoogleDriveFile[]) {
  const sortedFiles = [...files].sort((left, right) => {
    const leftScore = scoreDriveFileForPrograma(programa, left);
    const rightScore = scoreDriveFileForPrograma(programa, right);
    return rightScore - leftScore || left.name.localeCompare(right.name);
  });

  return sortedFiles[0] ?? null;
}

export function filterDriveFiles(files: GoogleDriveFile[], query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return files;
  }

  const queryTerms = normalizedQuery.split(" ").filter(Boolean);

  return files
    .map((file) => {
      const normalizedName = normalizeText(file.name);
      let score = 0;

      if (normalizedName.includes(normalizedQuery)) {
        score += 140;
      }

      for (const term of queryTerms) {
        if (normalizedName.includes(term)) {
          score += 22;
        }
      }

      return { file, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.file.name.localeCompare(right.file.name))
    .map((item) => item.file);
}
