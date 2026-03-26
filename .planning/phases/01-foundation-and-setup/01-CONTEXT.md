# Phase 1: Foundation and Setup - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

The application infrastructure is running (Docker + manual install) and a business owner can fully configure their business for electronic invoicing: business profile, digital certificate, numbering resolution, and environment selection. The onboarding wizard guides them through every required step before they can access the rest of the application.

</domain>

<decisions>
## Implementation Decisions

### Onboarding Flow
- **D-01:** Onboarding wizard style is Claude's discretion (step-by-step wizard vs checklist — pick what's most practical)
- **D-02:** Application is BLOCKED until all configuration is complete. User cannot access any other functionality until setup is done. Show clear message explaining what's missing and why it's required.
- **D-03:** Setup only saves data — no real-time validation against DIAN during onboarding. Validation happens when user first attempts to create/send a document.

### Claude's Discretion
- **Visual style:** Claude decides look and feel. The app targets persona natural and microempresas in Colombia — should feel simple, approachable, not intimidating. shadcn/ui + Tailwind v4 is the stack.
- **Access control:** Claude decides whether to add login/password or leave as open access. Consider that the app handles sensitive data (digital certificates, NIT) but is single-tenant and typically local.
- **Idioma:** Claude decides. The app is for Colombian users but open source globally.
- **Onboarding wizard UX:** Claude decides the specific flow pattern (stepper, pages, sidebar checklist).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### DIAN Regulatory
- `.planning/research/SUMMARY.md` — Full research synthesis including stack, features, architecture, pitfalls
- `.planning/research/STACK.md` — Recommended technology stack with versions and rationale
- `.planning/research/PITFALLS.md` — Common DIAN integration mistakes to avoid

### Project Definition
- `.planning/PROJECT.md` — Project vision, core value, constraints
- `.planning/REQUIREMENTS.md` — v1 requirements with REQ-IDs (Phase 1: INFR-01-04, CONF-01-06)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None — patterns will be established in this phase

### Integration Points
- Docker-compose will be the deployment foundation for all subsequent phases
- Database schema established here will be extended in Phase 2 (catalogs) and Phase 3 (invoicing)
- FastAPI project structure established here sets conventions for all API endpoints

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key constraint: must feel extremely easy to use for non-technical business owners.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-and-setup*
*Context gathered: 2026-03-26*
