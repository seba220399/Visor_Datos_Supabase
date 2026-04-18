/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_DRIVE_FOLDER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GoogleTokenClientResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (options?: {
    prompt?: string;
  }) => void;
}

interface Window {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: GoogleTokenClientResponse) => void;
        }) => GoogleTokenClient;
      };
    };
  };
}
