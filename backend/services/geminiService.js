if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing from backend/.env');
}

async function generatePromptResponse(promptContent, testInput) {
  if (!promptContent || !testInput) {
    throw new Error('Prompt content and test input are required.');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: promptContent }] },
      contents: [{ role: 'user', parts: [{ text: testInput }] }],
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || `Gemini request failed (${response.status}).`);
  }

  const output = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();
  if (!output) {
    throw new Error('Gemini returned an empty response.');
  }

  return output;
}

module.exports = { generatePromptResponse };
