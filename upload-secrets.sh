#!/bin/bash
while IFS='=' read -r key value; do
  if [[ -z "$key" || "$key" == \#* ]]; then
    continue
  fi
  # Remove quotes
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  
  # Replace literal \n with actual newline
  value="${value//\\n/$'\n'}"
  
  echo "Uploading $key..."
  echo -n "$value" | npx wrangler secret put "$key"
done < .env.local
