---
name: db-changes-visibility
description: Enforce displaying exact SQL instructions and updating schema whenever database modifications are made.
---

# Database Modification Guidelines

- **Always Show SQL Instructions**: Whenever any database editing, schema modification, column addition/removal, or table change is required, you MUST explicitly display the exact SQL statements/instructions in your response in a formatted `sql` code block.
- **Maintain Schema Integrity**: Always update `database_schema.sql` to keep the project's central schema definition in sync with any database changes.
- **Provide Actionable Steps**: When a manual or automated schema update is needed, clearly specify the exact commands or queries the user can run in the Supabase SQL Editor or migration CLI.
