# Tradeoffs

This document records major engineering tradeoffs made for Project 03, including alternatives considered, why we chose our approach, and the resulting risks.

## 1) Authentication Model

**Decision:** JWT access + refresh tokens

**Alternatives considered:**
- Server-side sessions + cookies
- Single long-lived JWT only

**Why chosen:**
- Stateless auth is simple to operate across Vercel (client) and Render (API).
- Access/refresh split improves security vs one long-lived token.

**Tradeoff / cost:**
- Requires token lifecycle handling (refresh flow, token expiry handling).
- Revocation is harder than centralized sessions.

**Mitigation:**
- Short access token TTL and separate refresh token.
- Route-level auth middleware and input validation.

## 2) Duel Delivery Strategy

**Decision:** Hot-seat duels first, online Socket.IO duels as stretch

**Alternatives considered:**
- Build online duels first
- Deliver both at same priority

**Why chosen:**
- Hot-seat guarantees a duel feature by deadline with lower implementation risk.
- Preserves time for required rubric items and polish.

**Tradeoff / cost:**
- Less exciting than fully real-time multiplayer.
- Lower competitive feel during MVP phase.

**Mitigation:**
- Keep duel data model compatible with online mode.
- Add Socket.IO online duels only after core MVP is stable.

## 3) Monorepo Shape

**Decision:** npm workspaces (`client`, `server`) without Turborepo/Nx

**Alternatives considered:**
- Separate repos for client and server
- Advanced monorepo tooling (Nx/Turbo)

**Why chosen:**
- Fast setup for a short academic timeline.
- Shared scripts from root reduce team onboarding friction.

**Tradeoff / cost:**
- Fewer advanced caching/task graph features.
- Workspace lockfile churn can be confusing for new contributors.

**Mitigation:**
- Keep scripts simple and documented.
- Treat lockfile updates as expected when dependencies change.

## 4) Shared Types Strategy

**Decision:** Duplicate small TypeScript types in client and server

**Alternatives considered:**
- Dedicated `shared` package with build step

**Why chosen:**
- Avoided extra packaging/build complexity in a 10-day schedule.
- Current type surface area is small and manageable.

**Tradeoff / cost:**
- Possible type drift between client and server contracts.

**Mitigation:**
- Keep API docs updated and review type changes in PRs.
- Prioritize endpoint contract tests on critical paths.

## 5) Hosting Split

**Decision:** Vercel for frontend, Render for API + cron

**Alternatives considered:**
- Single host for all components
- Self-hosted VM

**Why chosen:**
- Free tiers, straightforward deploy UX, and Render cron support.
- Matches team skill level and timeline.

**Tradeoff / cost:**
- Multi-provider configuration complexity (CORS, env vars, URLs).
- Potential free-tier cold starts.

**Mitigation:**
- Health endpoint for quick status checks.
- Explicit environment variables and origin configuration.

## 6) Puzzle Generation Source

**Decision:** football-data.org integration + deterministic generator/fallback behavior

**Alternatives considered:**
- Fully static/local puzzle banks only
- Manual puzzle authoring only

**Why chosen:**
- External data improves realism and replay value.
- Supports daily freshness requirement.

**Tradeoff / cost:**
- Dependency on external API availability and rate limits.

**Mitigation:**
- Cron scheduling with retry-friendly workflow.
- Keep fallback-ready generators and persistent puzzle storage.

## 7) Data Modeling for Daily Puzzles

**Decision:** Separate `Puzzle` documents by `date + type` with unique compound index

**Alternatives considered:**
- One mega-document per date containing all modes
- Store generated-only-in-memory each day

**Why chosen:**
- Flexible querying per game mode.
- Easier updates/overrides per puzzle type.

**Tradeoff / cost:**
- More documents and endpoint orchestration overhead.

**Mitigation:**
- Clear API contract for `/api/puzzles/today` aggregation.
- Use indexes and simple query shapes.

## 8) Admin Controls Scope

**Decision:** Minimal but high-impact admin controls (user list/ban and puzzle regeneration/override)

**Alternatives considered:**
- Full moderation dashboard with reports queue and audit trails

**Why chosen:**
- Prioritized rubric-aligned RBAC outcomes over broad feature surface.
- Reduced implementation risk close to deadline.

**Tradeoff / cost:**
- Less operational visibility than a full admin suite.

**Mitigation:**
- Harden admin route guards.
- Add focused admin/security tests for protected endpoints.

## 9) Testing Scope and Depth

**Decision:** Prioritize unit tests around core scoring, token, validation, and generator logic

**Alternatives considered:**
- Heavy end-to-end/UI test investment
- Minimal tests only to hit rubric minimum

**Why chosen:**
- Fast feedback during active feature development.
- Good coverage for highest-risk logic in short timeline.

**Tradeoff / cost:**
- Fewer full-stack integration checks.

**Mitigation:**
- Add targeted Supertest coverage for auth/admin route protection.
- Use manual smoke-test checklist before demo/submission.

## 10) Security vs Velocity

**Decision:** Implement essential controls (bcrypt, JWT, validation, RBAC) without over-engineering

**Alternatives considered:**
- Advanced hardening (device-bound refresh tokens, full audit system, WAF setup)

**Why chosen:**
- Balanced security requirements with delivery timeline.
- Directly maps to course rubric expectations.

**Tradeoff / cost:**
- Not production-hardening depth for a large-scale public launch.

**Mitigation:**
- Document assumptions and limits clearly.
- Focus on secure defaults and defensive validation in all critical routes.

---

## Summary

Our strategy intentionally favored reliable delivery of rubric-critical functionality over maximum feature breadth. The core principle was: **ship stable MVP first, then add stretch features only when core paths are demonstrably green**.
