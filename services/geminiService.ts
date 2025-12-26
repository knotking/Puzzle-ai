
import { GoogleGenAI, Type } from "@google/genai";

const IMAGE_MODEL = 'gemini-3-pro-image-preview';
const TEXT_MODEL = 'gemini-3-pro-preview';

export class GeminiService {
  private getAI() {
    // Directly use process.env.API_KEY as per guidelines.
    // Assume this variable is pre-configured and valid.
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generatePuzzleImage(prompt: string): Promise<string> {
    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: {
          parts: [{ text: `Generate a breathtaking, ultra-detailed square masterpiece for a jigsaw puzzle. Subject: ${prompt}. Artistic, high-contrast, and vibrant.` }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      }
      throw new Error("No image data received from Gemini 3.");
    } catch (error) {
      console.error("Gemini Generation Error:", error);
      throw error;
    }
  }

  async generateQuiz(prompt: string): Promise<any[]> {
    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: `Create a 3-question multiple choice quiz about the subject: "${prompt}". 
        The questions should be interesting and educational. 
        Format the output as a JSON array of objects with 'question', 'options' (array of 4 strings), 'correctIndex' (0-3), and 'explanation'.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctIndex", "explanation"]
            }
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Quiz Generation Error:", error);
      return [];
    }
  }

  async editPuzzleImage(prompt: string, currentImageBase64: string): Promise<string> {
    const ai = this.getAI();
    try {
      const base64Data = currentImageBase64.split(',')[1] || currentImageBase64;
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/png'
              }
            },
            { text: `Modify this image: ${prompt}. Maintain the exact composition but change the visual style.` }
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
      throw new Error("No image data received.");
    } catch (error) {
      console.error("Editing Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
