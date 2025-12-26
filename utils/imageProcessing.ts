import { PixelCrop, ResizeMode } from "../types";

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * Checks if an image has transparency by sampling pixels
 */
export const hasTransparency = async (imageSrc: string): Promise<boolean> => {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      return false;
    }

    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    // Sample pixels to check for transparency
    // We sample a grid of pixels to avoid checking every single pixel (performance)
    const sampleSize = Math.min(100, Math.max(10, Math.floor(Math.sqrt(image.width * image.height) / 10)));
    const stepX = Math.max(1, Math.floor(image.width / sampleSize));
    const stepY = Math.max(1, Math.floor(image.height / sampleSize));

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let y = 0; y < image.height; y += stepY) {
      for (let x = 0; x < image.width; x += stepX) {
        const index = (y * image.width + x) * 4;
        const alpha = data[index + 3];
        // If any pixel has alpha < 255, the image has transparency
        if (alpha < 255) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking transparency:', error);
    return false;
  }
};

export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: PixelCrop,
  backgroundColor: string = 'rgba(0,0,0,0)' // Default transparent
): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL('image/png');
};

export const resizeImageCanvas = async (
  imageSrc: string,
  targetWidth: number,
  targetHeight: number,
  mode: ResizeMode = 'contain', // Keep for compatibility, but now we rely mostly on explicit params
  backgroundColor: string = '#FFFFFF',
  scale: number = 1.0,
  position: { x: number, y: number } | null = null // New parameter: explicit position
): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('No 2d context');

  // 1. Set the Canvas size (Layer 1)
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  // 2. Fill the background
  if (backgroundColor === 'transparent') {
    ctx.clearRect(0, 0, targetWidth, targetHeight);
  } else {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  // 3. Calculate Object dimensions (Layer 2)
  let drawWidth = 0;
  let drawHeight = 0;
  let offsetX = 0;
  let offsetY = 0;

  const imgAspect = image.width / image.height;
  const canvasAspect = targetWidth / targetHeight;

  // Calculate base dimensions based on mode (Contain/Cover/Stretch)
  // This logic determines the "100% scale" baseline
  if (mode === 'stretch') {
    drawWidth = targetWidth;
    drawHeight = targetHeight;
  } else if (mode === 'contain') {
    if (imgAspect > canvasAspect) {
      drawWidth = targetWidth;
      drawHeight = targetWidth / imgAspect;
    } else {
      drawHeight = targetHeight;
      drawWidth = targetHeight * imgAspect;
    }
  } else if (mode === 'cover') {
    if (imgAspect > canvasAspect) {
      drawHeight = targetHeight;
      drawWidth = targetHeight * imgAspect;
    } else {
      drawWidth = targetWidth;
      drawHeight = targetWidth / imgAspect;
    }
  }

  // Apply Scale
  drawWidth *= scale;
  drawHeight *= scale;

  // Determine Position
  if (position) {
    // If explicit position is provided (from drag & drop), use it
    offsetX = position.x;
    offsetY = position.y;
  } else {
    // Otherwise, center it by default
    offsetX = (targetWidth - drawWidth) / 2;
    offsetY = (targetHeight - drawHeight) / 2;
  }
  
  // Use high quality smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  return canvas.toDataURL('image/png');
};

/**
 * Tries to compress the image to fit within a specific size in KB.
 */
export const compressImageToSize = async (
  imageSrc: string,
  targetFormat: 'image/jpeg' | 'image/png',
  maxSizeKB: number
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No context');

  canvas.width = image.width;
  canvas.height = image.height;
  
  if (targetFormat === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  ctx.drawImage(image, 0, 0);

  const maxBytes = maxSizeKB * 1024;
  
  if (targetFormat === 'image/png') {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if(blob) resolve(blob);
            else reject(new Error("Canvas to Blob failed"));
        }, 'image/png');
    });
  }

  // Binary search for JPEG quality
  let min = 0;
  let max = 1;
  let bestBlob: Blob | null = null;
  let iteration = 0;

  while (iteration < 6) {
    const quality = (min + max) / 2;
    const blob = await new Promise<Blob | null>((resolve) => 
      canvas.toBlob(resolve, targetFormat, quality)
    );

    if (!blob) break;

    if (blob.size <= maxBytes) {
      bestBlob = blob;
      min = quality;
    } else {
      max = quality;
    }
    iteration++;
  }

  if (bestBlob) return bestBlob;
  
  return new Promise<Blob | null>((resolve) => 
    canvas.toBlob(resolve, targetFormat, 0.1)
  ).then(b => b!);
};