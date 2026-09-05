# Workspace Guidelines

## Database Modifications
- **Always Show SQL Instructions**: Whenever any database editing, schema modification, column addition/removal, or table change is required, you MUST explicitly display the exact SQL statements/instructions in your response in a formatted `sql` code block.
- **Maintain Schema Integrity**: Always update `database_schema.sql` to keep the project's central schema definition in sync with any database changes.
- **Provide Actionable Steps**: When a manual or automated schema update is needed, clearly specify the exact commands or queries the user can run in the Supabase SQL Editor or migration CLI.

## Git Workflow
- **Push Commits to Test Branch**: Anytime a commit is made, always push it to the `Test` branch (e.g., `git push origin HEAD:Test` or pushing directly to `Test`).

## Cloudflare Wrangler Policy
- **On-Demand Deployment**: Deploy the Shop application using Wrangler (`npm run deploy` or `npx wrangler deploy`) only when explicitly instructed by the user.
- **Secrets Management**: Push any new or updated secrets/environment variables to Cloudflare via `npx wrangler secret put <KEY>` where necessary.

## Website Domain & URLs
- **Canonical Website Address**: The website address is `https://juj4.cepine.com`. Always use `https://juj4.cepine.com` as the canonical domain for metadata, SEO, sitemaps, robots.txt, and canonical URLs.

## AI API Integrations
- **JSON Minification**: Whenever injecting data structures or database contexts into AI prompts, always minify the JSON (e.g., `JSON.stringify(context)`) rather than pretty-printing it. This conserves tokens and prevents rate-limit errors (like the 8K TPM limit).
- **Approved Model Versions (Do NOT Downgrade)**: 
  - **Google GenAI**: Always use `gemini-3.6-flash` or `gemini-3.7-flash`. 
  - **Groq API**: Always use `qwen/qwen3.6-27b`. 
  *(Never "correct" these to older versions like 1.5 or 2.5, as they are fully supported in this environment).*
