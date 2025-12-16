export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export enum EditorStep {
  UPLOAD = 'UPLOAD',
  CROP = 'CROP',
  EDIT = 'EDIT', // For resizing and BG removal
  EXPORT = 'EXPORT'
}

export type ResizeMode = 'contain' | 'cover' | 'stretch';

export interface ExportSettings {
  format: 'image/jpeg' | 'image/png';
  quality: number; // 0 to 1
  maxSizeKB?: number;
  maintainAspectRatio: boolean;
  targetWidth?: number;
  targetHeight?: number;
}