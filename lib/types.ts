export interface Course {
  id: string;
  name: string;
  order: number;
  tracks: Track[];
}

export interface Track {
  id: string;
  title: string;
  blobUrl: string;
  order: number;
}

export interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  courseId: string;
}
