// OpenAI integration for: activity matching (embeddings), chat moderation, selfie verification

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const BASE = 'https://api.openai.com/v1';

async function openaiPost(path: string, body: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${path} error: ${err}`);
  }
  return res.json();
}

// ---- Embeddings for activity matching ----

export async function getEmbedding(text: string): Promise<number[]> {
  const data = await openaiPost('/embeddings', {
    model: 'text-embedding-3-small',
    input: text,
  });
  return data.data[0].embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (magA * magB);
}

// ---- Chat moderation ----

export async function moderateMessage(text: string): Promise<{
  flagged: boolean;
  reason?: string;
}> {
  try {
    const data = await openaiPost('/moderations', { input: text });
    const result = data.results[0];
    return {
      flagged: result.flagged,
      reason: result.flagged
        ? Object.entries(result.categories as Record<string, boolean>)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(', ')
        : undefined,
    };
  } catch {
    return { flagged: false };
  }
}

// ---- Selfie verification (Vision API) ----

export async function verifySelfie(
  profilePhotoBase64: string,
  selfieBase64: string
): Promise<{ match: boolean; confidence: number }> {
  try {
    const data = await openaiPost('/chat/completions', {
      model: 'gpt-4o',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Do these two photos show the same person? Reply with JSON only: {"match": true/false, "confidence": 0-100}',
            },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${profilePhotoBase64}` } },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${selfieBase64}` } },
          ],
        },
      ],
    });
    const text = data.choices[0].message.content.trim();
    const parsed = JSON.parse(text.match(/\{.*\}/s)?.[0] ?? '{}');
    return { match: !!parsed.match, confidence: parsed.confidence ?? 0 };
  } catch {
    return { match: false, confidence: 0 };
  }
}
