const DEFAULT_MODEL = "qwen3.5:9b";
const DEFAULT_ENDPOINT = "http://localhost:11434/api/generate";
const DEFAULT_TIMEOUT_MS = 30000;

export interface ThesaurusOptions {
  model?: string;
  endpoint?: string;
  timeoutMs?: number;
}

function buildSynonymPrompt(word: string, sentence: string): string {
  return [
    "You are a thesaurus.",
    "Given a WORD and the SENTENCE it appears in, reply with only the single most common synonym of WORD that best fits the meaning of the sentence.",
    "Reply with just the synonym, without punctuation, quotes, or explanation.",
    "If no synonym fits, reply with the original word.",
    "",
    `WORD: ${word}`,
    `SENTENCE: ${sentence}`,
    "SYNONYM:",
  ].join("\n");
}

function parseSynonym(raw: string, word: string): string {
  const firstLine = raw.trim().split(/\r?\n/)[0] ?? "";
  const cleaned = firstLine
    .replace(/^["'“”‘’\s]+|["'“”‘’\s.,!?;:]+$/g, "")
    .trim();
  if (!cleaned) {
    throw new Error(`Thesaurus returned no usable synonym for "${word}"`);
  }
  return cleaned;
}

class OllamaClient {
  constructor(
    private readonly endpoint: string,
    private readonly timeoutMs: number,
  ) {}

  async generate(model: string, prompt: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, stream: false, think: false }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Ollama request failed with status ${response.status}`);
      }
      const data = (await response.json()) as { response?: unknown };
      if (typeof data.response !== "string") {
        throw new Error("Ollama response did not contain a string 'response'");
      }
      return data.response;
    } finally {
      clearTimeout(timer);
    }
  }
}

export class Thesaurus {
  private readonly client: OllamaClient;
  private readonly model: string;

  constructor(options: ThesaurusOptions = {}) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.client = new OllamaClient(
      options.endpoint ?? DEFAULT_ENDPOINT,
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
  }

  async findSynonym(word: string, sentence: string): Promise<string> {
    const prompt = buildSynonymPrompt(word, sentence);
    const raw = await this.client.generate(this.model, prompt);
    return parseSynonym(raw, word);
  }
}

export function createThesaurus(options: ThesaurusOptions = {}): Thesaurus {
  return new Thesaurus(options);
}
