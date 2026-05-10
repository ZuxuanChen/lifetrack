const OLLAMA_URL = 'http://localhost:11434';

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: Record<string, unknown>;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export async function generateWithOllama(
  prompt: string,
  model: string = 'phi4-mini',
  timeoutMs: number = 30000
): Promise<OllamaGenerateResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false } as OllamaGenerateRequest),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama error ${res.status}: ${text}`);
    }

    return await res.json() as OllamaGenerateResponse;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Ollama 请求超时，请检查服务是否运行');
    }
    if (err.message?.includes('Failed to fetch')) {
      throw new Error('无法连接到 Ollama，请确认本地服务已启动');
    }
    throw err;
  }
}

export async function listOllamaModels(): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m: any) => m.name || m.model);
  } catch {
    return [];
  }
}

export function checkOllamaHealth(): Promise<boolean> {
  return fetch(`${OLLAMA_URL}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(3000) })
    .then(r => r.ok)
    .catch(() => false);
}
