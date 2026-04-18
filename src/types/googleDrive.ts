export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string | null;
  webViewLink?: string | null;
  thumbnailLink?: string | null;
}
