import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Uses Gemini to edit the image. We ask it to remove the background.
 * Note: Since this is a generative model, it regenerates the subject without background.
 */
export const removeBackground = async (base64Image: string): Promise<string> => {
  const ai = getClient();
  
  // Clean base64 string if it contains metadata
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', // Sending as PNG usually safer for transparency intent
              data: cleanBase64
            }
          },
          {
            text: "Identify the main subject in this image and remove the background. Return the image as a PNG with a real transparent alpha channel. Do not create a white background, do not create a checkerboard pattern. The subject pixels should remain as identical as possible to the original."
          }
        ]
      }
    });

    // Check for image in parts
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image data returned from Gemini.");
  } catch (error) {
    console.error("Gemini Background Removal Error:", error);
    throw error;
  }
};