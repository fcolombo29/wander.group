
import { GoogleGenAI, Type } from "@google/genai";

export const geminiService = {
  suggestActivities: async (destination: string, dates: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Actúa como un guía local experto en ${destination}. Sugiere 5 actividades únicas para realizar durante las fechas ${dates}. Proporciona el nombre de la actividad y una descripción vibrante de una frase.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Nombre de la actividad" },
                description: { type: Type.STRING, description: "Descripción breve" },
              },
              required: ["title", "description"]
            }
          }
        }
      });
      
      const text = response.text;
      return JSON.parse(text || "[]");
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return [];
    }
  }
};
