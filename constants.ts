// The color we ask Gemini to use for the background so we can remove it easily.
// Magenta is usually distinct enough from most natural objects.
export const CHROMA_KEY_COLOR_HEX = '#FF00FF'; 
export const CHROMA_KEY_COLOR_RGB = { r: 255, g: 0, b: 255 };
export const TOLERANCE = 60; // How strictly we match the magenta