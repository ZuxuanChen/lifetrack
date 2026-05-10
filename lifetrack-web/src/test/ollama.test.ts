import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateWithOllama, listOllamaModels, checkOllamaHealth } from '../utils/ollama';

describe('Ollama Integration', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateWithOllama', () => {
    it('should return response on success', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'Hello!', model: 'phi4-mini', done: true }),
      });
      const res = await generateWithOllama('hi', 'phi4-mini');
      expect(res.response).toBe('Hello!');
    });

    it('should throw on non-ok response', async () => {
      fetchMock.mockResolvedValue({ ok: false, text: async () => 'Model not found' });
      await expect(generateWithOllama('hi')).rejects.toThrow('Ollama error');
    });

    it('should throw on network failure', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      await expect(generateWithOllama('hi')).rejects.toThrow('无法连接到 Ollama');
    });

    it('should throw on timeout', { timeout: 10000 }, async () => {
      fetchMock.mockImplementation(() => {
        return new Promise((_, reject) => {
          const controller = (global as any)._lastAbortController;
          setTimeout(() => reject(new Error('The operation was aborted')), 200);
        });
      });
      await expect(generateWithOllama('hi', 'phi4-mini', 50)).rejects.toThrow();
    });
  });

  describe('listOllamaModels', () => {
    it('should return model names on success', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: 'phi4-mini' }, { name: 'llama3' }] }),
      });
      const models = await listOllamaModels();
      expect(models).toEqual(['phi4-mini', 'llama3']);
    });

    it('should return empty array on failure', async () => {
      fetchMock.mockRejectedValue(new Error('fail'));
      const models = await listOllamaModels();
      expect(models).toEqual([]);
    });
  });

  describe('checkOllamaHealth', () => {
    it('should return true when reachable', async () => {
      fetchMock.mockResolvedValue({ ok: true });
      expect(await checkOllamaHealth()).toBe(true);
    });

    it('should return false when unreachable', async () => {
      fetchMock.mockRejectedValue(new Error('fail'));
      expect(await checkOllamaHealth()).toBe(false);
    });
  });
});
