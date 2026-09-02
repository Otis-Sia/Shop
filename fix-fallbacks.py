import sys

def process_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # Add max_tokens to Groq
    content = content.replace(
        "model: 'qwen/qwen3.6-27b',",
        "model: 'qwen/qwen3.6-27b',\n          max_tokens: 8000,"
    )

    # Add max_tokens to DeepSeek
    content = content.replace(
        "model: 'deepseek-chat',",
        "model: 'deepseek-chat',\n              max_tokens: 8000,"
    )

    # Validate json early so we can fallback if generation is truncated or invalid
    val_snippet = "\n      JSON.parse(responseText.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').replace(/```json\\n?/gi, '').replace(/```\\n?/gi, '').trim());"
    content = content.replace("responseText = response.text || '';", "responseText = response.text || '';" + val_snippet)
    
    val_snippet2 = "\n        JSON.parse(responseText.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').replace(/```json\\n?/gi, '').replace(/```\\n?/gi, '').trim());"
    content = content.replace("responseText = response2.text || '';", "responseText = response2.text || '';" + val_snippet2)

    val_snippet3 = "\n      JSON.parse(responseText.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').replace(/```json\\n?/gi, '').replace(/```\\n?/gi, '').trim());"
    content = content.replace("responseText = groqData.choices?.[0]?.message?.content || '';", "responseText = groqData.choices?.[0]?.message?.content || '';" + val_snippet3)

    val_snippet4 = "\n          JSON.parse(responseText.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').replace(/```json\\n?/gi, '').replace(/```\\n?/gi, '').trim());"
    content = content.replace("responseText = dsData.choices?.[0]?.message?.content || '';", "responseText = dsData.choices?.[0]?.message?.content || '';" + val_snippet4)

    # Fix unclosed <think> tag in the final parse to avoid ugly errors if DeepSeek fails too (though it will return 500 anyway)
    # Actually, we can use a regex that matches <think> to </think> OR end of string.
    # regex: /<think>[\s\S]*?(?:<\/think>|$)/gi
    content = content.replace("/<think>[\\s\\S]*?<\\/think>/gi", "/<think>[\\s\\S]*?(?:<\\/think>|$)/gi")

    with open(filename, 'w') as f:
        f.write(content)

for f in ['src/app/api/admin/products/ai-details/route.ts', 'src/app/api/admin/products/ai-analyze/route.ts']:
    process_file(f)

print("Fixed fallbacks!")
