import sys

def process_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # Change Groq max_tokens
    content = content.replace(
        "model: 'qwen/qwen3.6-27b',\n          max_tokens: 8000,",
        "model: 'qwen/qwen3.6-27b',\n          max_tokens: 3000,"
    )

    # Change DeepSeek max_tokens just in case
    content = content.replace(
        "model: 'deepseek-chat',\n              max_tokens: 8000,",
        "model: 'deepseek-chat',\n              max_tokens: 3000,"
    )

    with open(filename, 'w') as f:
        f.write(content)

for f in ['src/app/api/admin/products/ai-details/route.ts', 'src/app/api/admin/products/ai-analyze/route.ts']:
    process_file(f)

print("Fixed max_tokens!")
