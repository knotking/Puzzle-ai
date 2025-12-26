
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = 'gemini-2.5-flash-image';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async generatePuzzleImage(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [{ text: `Generate a high-quality, vibrant, and detailed square image suitable for a visual puzzle based on this prompt: ${prompt}. Ensure the image has clear features and textures.` }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      }
      throw new Error("No image data received from Gemini.");
    } catch (error) {
      console.error("Gemini Generation Error:", error);
      throw error;
    }
  }

  async editPuzzleImage(prompt: string, currentImageBase64: string): Promise<string> {
    try {
      // Remove data prefix if exists
      const base64Data = currentImageBase64.split(',')[1] || currentImageBase64;
      
      const response = await this.ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/png'
              }
            },
            { text: `Modify this image based on the following instructions: ${prompt}. Keep the core structure but apply the changes requested. Return the modified square image.` }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      }
      throw new Error("No image data received from Gemini editing.");
    } catch (error) {
      console.error("Gemini Editing Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
