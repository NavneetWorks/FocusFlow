interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

function getFrontendGeminiApiKey(): string {
  const key = import.meta.env.GEMINI_API_KEY as string | undefined;
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY in frontend environment variables.");
  }
  return key;
}

async function callGeminiModel(apiKey: string, model: string, prompt: string): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    })
  });

  const data = (await response.json()) as GeminiGenerateResponse;

  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini API request failed for model ${model}.`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n").trim();
  if (!text) {
    throw new Error(`Gemini returned an empty response for model ${model}.`);
  }

  return text;
}

export async function generateGeminiTextFromBrowser(prompt: string): Promise<string> {
  const apiKey = getFrontendGeminiApiKey();
  try {
    return await callGeminiModel(apiKey, "gemini-2.0-flash", prompt);
  } catch (primaryError) {
    // Retry on backup model to reduce user-facing failures during temporary model saturation.
    try {
      return await callGeminiModel(apiKey, "gemini-1.5-flash", prompt);
    } catch (fallbackError) {
      const primaryMessage = primaryError instanceof Error ? primaryError.message : "Primary model failed.";
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "Backup model failed.";
      throw new Error(`${primaryMessage} | ${fallbackMessage}`);
    }
  }
}
