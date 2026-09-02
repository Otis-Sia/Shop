import re

new_fallback_logic = """    let responseText = '';
    
    // 1. Try gemini-3.6-flash first
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      responseText = response.text || '';
      JSON.parse(responseText.replace(/<think>[\\s\\S]*?(?:<\\/think>|$)/gi, '').replace(/```json\\n?/gi, '').replace(/```\\n?/gi, '').trim());
    } catch (genAiError1: any) {
      console.warn('Gemini 3.6 Flash failed, attempting Gemini 3.7 Flash:', genAiError1.message);
      
      try {
        // 2. Fallback to gemini-3.7-flash
        const response2 = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        responseText = response2.text || '';
        JSON.parse(responseText.replace(/<think>[\\s\\S]*?(?:<\\/think>|$)/gi, '').replace(/```json\\n?/gi, '').replace(/```\\n?/gi, '').trim());
      } catch (genAiError2: any) {
        console.warn('Gemini 3.7 Flash failed, attempting Groq fallback:', genAiError2.message);
        
        try {
          // 3. Fallback to Groq (Qwen)
          if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured.');
          
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: 'qwen/qwen3.6-27b',
              max_tokens: 3000,
              messages: [{ role: 'user', content: prompt }]
            })
          });
          
          if (!groqResponse.ok) {
            const errText = await groqResponse.text();
            throw new Error(`Groq API failed: ${groqResponse.status} ${errText}`);
          }
          
          const groqData = await groqResponse.json();
          responseText = groqData.choices?.[0]?.message?.content || '';
          JSON.parse(responseText.replace(/<think>[\\s\\S]*?(?:<\\/think>|$)/gi, '').replace(/```json\\n?/gi, '').replace(/```\\n?/gi, '').trim());
        } catch (groqError: any) {
          console.warn('Groq failed, attempting DeepSeek fallback:', groqError.message);
          
          // 4. Fallback to DeepSeek
          if (!process.env.DEEPSEEK_API_KEY) {
            throw new Error('All other models failed and DEEPSEEK_API_KEY is not configured.');
          }
          
          const dsResponse = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              max_tokens: 3000,
              messages: [{ role: 'user', content: prompt }]
            })
          });
          
          if (!dsResponse.ok) {
            const errText = await dsResponse.text();
            throw new Error(`DeepSeek API failed: ${dsResponse.status} ${errText}`);
          }
          
          const dsData = await dsResponse.json();
          responseText = dsData.choices?.[0]?.message?.content || '';
          JSON.parse(responseText.replace(/<think>[\\s\\S]*?(?:<\\/think>|$)/gi, '').replace(/```json\\n?/gi, '').replace(/```\\n?/gi, '').trim());
        }
      }
    }

    if (responseText) {"""

def process_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # Find the block to replace
    start_str = "    let responseText = '';"
    end_str = "    if (responseText) {"
    
    start_idx = content.find(start_str)
    end_idx = content.find(end_str)
    
    if start_idx != -1 and end_idx != -1:
        new_content = content[:start_idx] + new_fallback_logic + content[end_idx + len(end_str):]
        with open(filename, 'w') as f:
            f.write(new_content)
        print(f"Updated {filename}")
    else:
        print(f"Could not find block in {filename}")

process_file('src/app/api/admin/products/ai-details/route.ts')
process_file('src/app/api/admin/products/ai-analyze/route.ts')

