import { CHROMA_KEY_COLOR_RGB, TOLERANCE } from '../constants';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = reader.result.split(',')[1];
        resolve(base64Data);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

// This function takes an image (which has the subject on a Magenta background)
// and turns the Magenta pixels transparent.
export const removeColorBackground = (
  image: HTMLImageElement, 
  targetRgb: { r: number, g: number, b: number } = CHROMA_KEY_COLOR_RGB, 
  tolerance: number = TOLERANCE
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');

  canvas.width = image.width;
  canvas.height = image.height;

  // Draw the image onto the canvas
  ctx.drawImage(image, 0, 0);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate distance from the target color (Euclidean distance approximation)
    const distance = Math.sqrt(
      Math.pow(r - targetRgb.r, 2) +
      Math.pow(g - targetRgb.g, 2) +
      Math.pow(b - targetRgb.b, 2)
    );

    // If color is close to Magenta, make it transparent
    if (distance < tolerance) {
      data[i + 3] = 0; // Set Alpha to 0
    }
  }

  // Put modified data back
  ctx.putImageData(imageData, 0, 0);

  // Return base64 png
  return canvas.toDataURL('image/png');
};