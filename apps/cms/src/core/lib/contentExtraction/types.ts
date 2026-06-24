export interface Action {
  type?: string | null;
  url?: string | null;
  label?: string | null;
}

export interface Upload {
  url?: string | null;
  alt?: string | null;
}

export type UploadField = Upload | number | null | undefined;

export type ImageGroup = { image?: UploadField } | null | undefined;
