export interface OpenAIChatArgs {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  signal?: AbortSignal;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

export async function callOpenAIChat({
  apiKey,
  model,
  system,
  user,
  signal,
}: OpenAIChatArgs): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal,
  });

  if (!res.ok) {
    let kind = "";

    try {
      const errBody = (await res.json()) as { error?: { type?: string; code?: string } };
      kind = errBody.error?.code ?? errBody.error?.type ?? "";
    } catch {
      // non-JSON error body — ignore it; do not surface raw text
    }

    throw new Error(`OpenAI request failed (${res.status}${kind ? `, ${kind}` : ""})`);
  }

  const body = (await res.json()) as ChatCompletionResponse;

  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned an empty completion");

  return text;
}
