# SWE Light Execution Plan

## Objective
Implement product analytics tracking system and popularity score algorithm in Next.js and Supabase.

## Workflow Stages
1. **Round 0: Implementation (teamwork_preview_implementer)**
   - Database schema updates in `database_schema.sql` (product_analytics table, RLS, indexes, score calculation triggers/functions)
   - API route `POST /api/analytics/track` in Next.js App router
   - Product detail page integration for view tracking
   - Local verification / tests
2. **Round 1: Review & Stress Test (teamwork_preview_reviewer)**
   - Adversarial verification of database migration & RLS
   - API edge cases (invalid events, concurrency, rate limits/validation)
   - Product view tracking accuracy & deduplication
   - Fixes and test execution
3. **Round 2: Review & Hardening (teamwork_preview_reviewer)**
   - Algorithmic evaluation of popularity score
   - Security, performance, indexing verification
   - Additional test suite expansion & verification
4. **Round 3: Final Review & Polish (teamwork_preview_reviewer)**
   - End-to-end integration check
   - Clean lint, typecheck, build, test suite
5. **Orchestrator Personal Verification**
   - Run tests, build, check git branch compliance
6. **Victory Audit (teamwork_preview_victory_auditor)**
   - Independent verification & verdict
7. **Human Report & Handoff**
   - Formatted SQL display, git push confirmation to Test branch, final handoff.md
