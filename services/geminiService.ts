import { GoogleGenAI } from "@google/genai";
import { CHROMA_KEY_COLOR_HEX } from '../constants';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const processImageWithGemini = async (base64Image: string): Promise<string> => {
  const ai = getClient();
  
  // We use gemini-2.5-flash-image for fast and accurate image editing capabilities
  const modelId = 'gemini-2.5-flash-image';

  // The prompt is critical. We ask Gemini to keep the subject but replace background.
  // Using a solid distinctive color allows us to key it out later.
  const prompt = `
    I have an image. I want to isolate the main foreground subject.
    Please generate a new image that is an EXACT copy of the main subject from the original image, 
    but replace the entire background with a solid flat color: ${CHROMA_KEY_COLOR_HEX} (Magenta).
    
    CRITICAL INSTRUCTIONS:
    1. Do NOT change the subject's lighting, color, or details.
    2. The edges between the subject and the background must be sharp and precise.
    3. The background must be pure ${CHROMA_KEY_COLOR_HEX} with no gradients or shadows.
    4. Return ONLY the image.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming input is jpeg/png, API handles this
              data: base64Image
            }
          },
          {
            text: prompt
          }
        ]
      }
    });

    // Extract the image from the response
    // The response might contain an inlineData part with the generated image
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }

    throw new Error("No image data returned from Gemini");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};