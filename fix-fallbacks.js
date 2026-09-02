const fs = require('fs');
const files = [
  'src/app/api/admin/products/ai-details/route.ts',
  'src/app/api/admin/products/ai-analyze/route.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Add max_tokens to Groq
  content = content.replace(
    "model: 'qwen/qwen3.6-27b',",
    "model: 'qwen/qwen3.6-27b',\n          max_tokens: 8000,"
  );

  // Add max_tokens to DeepSeek
  content = content.replace(
    "model: 'deepseek-chat',",
    "model: 'deepseek-chat',\n              max_tokens: 8000,"
  );

  // Parse validation for Gemini 3.6 Flash
  content = content.replace(
    "responseText = response.text || '';",
    "responseText = response.text || '';\n      JSON.parse(responseText.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').replace(/```json\\n?/gi, '').replace(/```\\n?/gi, '').trim());"
  );
  
  // Parse validation for Gemini 3.6 Pro
  content = content.replace(
    "responseText = response2.text || '';",
    "responseText = response2.text || '';\n        JSON.parse(responseText.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').replace(/```json\\n?/gi, '').replace(/```\\n?/gi, '').trim());"
  );

  // Parse validation for Groq
  content = content.replace(
    "responseText = groqData.choices?.[0]?.message?.content || '';",
    "responseText = groqData.choices?.[0]?.message?.content || '';\n      JSON.parse(responseText.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').replace(/```json\\n?/gi, '').replace(/```\\n?/gi, '').trim());"
  );
  
  // Parse validation for DeepSeek
  content = content.replace(
    "responseText = dsData.choices?.[0]?.message?.content || '';",
    "responseText = dsData.choices?.[0]?.message?.content || '';\n          JSON.parse(responseText.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').replace(/```json\\n?/gi, '').replace(/```\\n?/gi, '').trim());"
  );

  // And also, if there is a rogue <think> tag that is NOT closed, we can strip it by just making the regex match up to the end of the string if `</think>` is missing. But JSON.parse will fail anyway so it's fine.
  
  // Update the final parsing to handle unclosed think tag gracefully by removing it if it exists
  // If a string starts with <think> but has no </think>, we can strip it. But since we validate inside the try blocks, if it's truncated it will just throw to the next provider.

  fs.writeFileSync(file, content);
}
console.log('Fixed fallbacks!');
