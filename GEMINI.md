# Workspace Guidelines

## Database Modifications
- **Always Show SQL Instructions**: Whenever any database editing, schema modification, column addition/removal, or table change is required, you MUST explicitly display the exact SQL statements/instructions in your response in a formatted `sql` code block.
- **Maintain Schema Integrity**: Always update `database_schema.sql` to keep the project's central schema definition in sync with any database changes.
- **Provide Actionable Steps**: When a manual or automated schema update is needed, clearly specify the exact commands or queries the user can run in the Supabase SQL Editor or migration CLI.

## Git Workflow
- **Push Commits to Test Branch**: Anytime a commit is made, always push it to the `Test` branch (e.g., `git push origin HEAD:Test` or pushing directly to `Test`).

## AI API Integrations
- **JSON Minification**: Whenever injecting data structures or database contexts into AI prompts, always minify the JSON (e.g., `JSON.stringify(context)`) rather than pretty-printing it. This conserves tokens and prevents rate-limit errors (like the 8K TPM limit).
- **Groq Model Preference**: Use `qwen/qwen3.6-27b` as the designated model for Groq API fallbacks/generation.
