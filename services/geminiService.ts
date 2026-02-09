import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY is missing from environment.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateStorySegment = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  userInput: string
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Error: API Key missing.";

  try {
    const model = 'gemini-3-flash-preview';
    const systemInstruction = `You are a text adventure engine. 
    You act as the narrator and dungeon master. 
    Keep descriptions evocative but concise (under 150 words). 
    Offer choices implicitly through the environment.
    Do not break character. 
    Format output as plain text.`;

    const chat = ai.chats.create({
        model,
        config: {
            systemInstruction,
        },
        history: history
    });
    
    const result = await chat.sendMessage({ message: userInput });
    return result.text || "The void is silent.";
  } catch (error) {
    console.error("Gemini Story Error:", error);
    return "Something went wrong communicating with the spirits (API Error).";
  }
};

export const visualizeScene = async (sceneDescription: string): Promise<string | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  try {
    const model = 'gemini-2.5-flash-image';
    const prompt = `A digital painting of a text adventure scene: ${sceneDescription}. 
    Atmospheric, high contrast, retro-style interactive fiction art. No text in image.`;

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "4:3",
        },
      }
    });

    // Check candidates for image
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part && part.inlineData && part.inlineData.data) {
       return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Error:", error);
    return null;
  }
};
