export enum ProcessState {
  IDLE = 'IDLE',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface BatchItem {
  id: string;
  file: File;
  originalUrl: string; // Object URL for preview
  processedUrl: string | null; // Data URL of the result
  status: ProcessState;
  errorMessage?: string;
}

export enum BrushMode {
  ERASE = 'ERASE',
  RESTORE = 'RESTORE'
}