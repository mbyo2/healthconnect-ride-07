/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VAPID_PUBLIC_KEY: string;
  // add other env vars here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
