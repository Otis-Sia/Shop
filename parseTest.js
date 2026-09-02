const responseText = `
<think>
Thinking...
</think>
\`\`\`json
{
  "name": "Test"
}
\`\`\`
`;

const cleanJson = responseText
  .replace(/<think>[\s\S]*?<\/think>/gi, '')
  .replace(/```json\n?/gi, '')
  .replace(/```\n?/gi, '')
  .trim();
  
console.log(JSON.parse(cleanJson));
