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

// Collage Editor Types
export type ToolType = 'image-editor' | 'collage';

export interface LayoutCell {
  id: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage (0-100)
  height: number; // percentage (0-100)
}

export interface Layout {
  id: string;
  name: string;
  cells: LayoutCell[];
  canvasWidth: number;
  canvasHeight: number;
  gap?: number; // gap between cells in pixels
}

export interface CellImage {
  cellId: string;
  imageSrc: string;
  scale: number; // 1.0 = 100%
  positionX: number; // percentage offset from center
  positionY: number; // percentage offset from center
  hasTransparency?: boolean; // whether the image has transparent background
}
