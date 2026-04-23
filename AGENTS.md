# AGENTS.md

## Skill-First Principles

`creatok-skills` is an agent runtime project, not a traditional end-user application.

When building or modifying this repository:

- prefer remote structured data over local hardcoded decision logic
- keep local code as a thin execution client: fetch, validate, resolve defaults, submit, poll, and persist artifacts
- let the model make runtime choices when the decision depends on user context, remote capabilities, structure libraries, or retrieval results
- treat `SKILL.md` files and runtime artifacts as instructions for agents first, not product copy for end users
- avoid embedding heuristic recommendation logic in local JS unless it is a hard validation or execution constraint
- if a capability, model description, default, or strategy may change over time, move it to a remote API or structured knowledge source instead of freezing it in the repo

## Packaging Boundary

- Treat each publishable skill directory under `skills/` as an independent packaging and installation unit.
- Runtime files required by a skill must live inside that skill's own directory.
- Do not introduce runtime dependencies on repository-level `lib/`, `shared/`, or sibling skill folders, because users may install only one skill.
- If two skills need similar logic, duplicate the minimal runtime code inside each skill unless the publishing model is explicitly changed first.
- Before adding any shared module, verify that it will be packaged together with every consuming skill; if not, do not add the shared dependency.
