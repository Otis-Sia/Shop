require('dotenv').config({ path: '.env.local' });
const { GoogleGenAI } = require('@google/genai');

async function testGroq() {
  console.log('--- Testing Groq (qwen/qwen3.6-27b) ---');
  if (!process.env.GROQ_API_KEY) {
    console.log('GROQ_API_KEY is not configured.\n');
    return;
  }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [{ role: 'user', content: 'Say hello in 3 words.' }],
      })
    });
    if (!res.ok) {
      console.log(`Failed: ${res.status} ${await res.text()}\n`);
      return;
    }
    const data = await res.json();
    console.log(`Success: ${data.choices[0].message.content}\n`);
  } catch (err) {
    console.log(`Error: ${err.message}\n`);
  }
}

async function testGemini(modelName) {
  console.log(`--- Testing Gemini (${modelName}) ---`);
  if (!process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY is not configured.\n');
    return;
  }
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: 'Say hello in 3 words.',
    });
    console.log(`Success: ${response.text}\n`);
  } catch (err) {
    console.log(`Error: ${err.message}\n`);
  }
}

async function testDeepSeek() {
  console.log('--- Testing DeepSeek (deepseek-chat) ---');
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log('DEEPSEEK_API_KEY is not configured.\n');
    return;
  }
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Say hello in 3 words.' }],
      })
    });
    if (!res.ok) {
      console.log(`Failed: ${res.status} ${await res.text()}\n`);
      return;
    }
    const data = await res.json();
    console.log(`Success: ${data.choices[0].message.content}\n`);
  } catch (err) {
    console.log(`Error: ${err.message}\n`);
  }
}

async function main() {
  await testGroq();
  await testGemini('gemini-3.6-flash');
  await testGemini('gemini-3.6-pro');
  await testDeepSeek();
}

main();
