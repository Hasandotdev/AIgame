const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not set on the server' });
  }
  const { model, messages, temperature, max_tokens, response_format } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages is required' });
  }
  const body = {
    model: model || 'qwen/qwen3.8-27b',
    messages,
    temperature: typeof temperature === 'number' ? temperature : 0.6,
    max_tokens: typeof max_tokens === 'number' ? max_tokens : 1400,
  };
  if (response_format && response_format.type === 'json_object') {
    body.response_format = response_format;
  }
  try {
    let upstream = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (upstream.status === 400 && body.response_format) {
      const retry = { ...body };
      delete retry.response_format;
      upstream = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(retry),
      });
    }
    const text = await upstream.text();
    if (!upstream.ok) {
      let fallback = text.slice(0, 300);
      try {
        const parsed = JSON.parse(text);
        fallback = parsed?.error?.message || fallback;
      } catch {
        // keep raw text
      }
      return res.status(upstream.status).json({ error: fallback });
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: 'Invalid response from Groq' });
    }
    const content = data?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ content });
  } catch (err) {
    return res.status(502).json({ error: String(err?.message || err) });
  }
}
