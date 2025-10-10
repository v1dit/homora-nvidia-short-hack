import dotenv from 'dotenv';
dotenv.config();

function mockEmbedding(text: string) {
  // deterministic simple hash -> small vector for demo
  const words = (text || '').toLowerCase().split(/\W+/).filter(Boolean);
  const vec = new Array(16).fill(0);
  for (const w of words) {
    let h = 0;
    for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) >>> 0;
    vec[h % vec.length] += 1;
  }
  return vec;
}

function mockLLMResponse(prompt: string) {
  return `MOCK LLM RESPONSE: Received prompt (${prompt.slice(0, 80)}...)`;
}

(async function run() {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    console.warn('⚠️ NVIDIA_API_KEY not found — running in MOCK mode for demo.');
  } else {
    console.log('NVIDIA_API_KEY present — will attempt real SDK calls if available.');
  }

  // Embeddings test (try vendor, fallback to mock)
  try {
    if (key) {
      try {
        const embMod = await import('@nvidia/embeddings');
        const Embeddings = (embMod as any).Embeddings || (embMod as any).default || embMod;
        // Try multiple instantiation shapes
        let client: any;
        try { client = new Embeddings({ apiKey: key }); } catch (e) { client = Embeddings; }
        let out: any;
        if (typeof client.embedText === 'function') out = await client.embedText('test embedding');
        else if (typeof client.embed === 'function') out = await client.embed('test embedding');
        else if (typeof client.getEmbedding === 'function') out = await client.getEmbedding('test embedding');
        else if (typeof client.embedDocuments === 'function') out = await client.embedDocuments(['test embedding']);
        else out = null;

        if (out) {
          const first = Array.isArray(out[0]) ? out[0] : out;
          console.log('Embeddings length (real):', first.length ?? 'unknown');
        } else {
          console.warn('Embeddings SDK loaded but returned no usable value — falling back to mock.');
          console.log('Embeddings length (mock):', mockEmbedding('test embedding').length);
        }
      } catch (err) {
  console.warn('Embeddings SDK not available or failed — using mock embedding.', String(err));
        console.log('Embeddings length (mock):', mockEmbedding('test embedding').length);
      }
    } else {
      console.log('Embeddings length (mock):', mockEmbedding('test embedding').length);
    }
  } catch (err) {
  console.error('Unexpected error during embeddings test:', String(err));
  }

  // LLM test (try vendor, fallback to mock)
  try {
    if (key) {
      try {
        const llmMod = await import('@nvidia/llm');
        const LLM = (llmMod as any).LLM || (llmMod as any).default || llmMod;
        let client: any;
        try { client = new LLM({ apiKey: key }); } catch (e) { client = LLM; }
        if (typeof client.chat === 'function') {
          const resp = await client.chat({ messages: [{ role: 'user', content: 'Write a one-sentence test response: hello from NVIDIA LLM' }], max_tokens: 50 });
          console.log('LLM chat response (real):', JSON.stringify(resp?.choices?.[0] ?? resp, null, 2));
        } else if (typeof client.generate === 'function') {
          const resp = await client.generate({ prompt: 'Say hello in one sentence', max_tokens: 50 });
          console.log('LLM generate response (real):', JSON.stringify(resp, null, 2));
        } else {
          console.warn('LLM SDK loaded but no known method found — falling back to mock.');
          console.log('LLM response (mock):', mockLLMResponse('Say hello in one sentence'));
        }
      } catch (err) {
  console.warn('LLM SDK not available or failed — using mock response.', String(err));
        console.log('LLM response (mock):', mockLLMResponse('Say hello in one sentence'));
      }
    } else {
      console.log('LLM response (mock):', mockLLMResponse('Say hello in one sentence'));
    }
  } catch (err) {
  console.error('Unexpected error during LLM test:', String(err));
  }

})();
