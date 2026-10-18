## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

---

# Project Development Principles: `tn-political-warroom`

## Core Workflow & Engineering Standards

1. **Inspect Before Modifying**: Always inspect the codebase, file hierarchy, and relationships before creating or modifying files.
2. **Follow Conventions**: Adhere strictly to existing framework patterns, folder hierarchies, and design systems.
3. **Up-to-Date Framework Documentation**: Use **Context7** (`https://mcp.context7.com/mcp`) when current framework or library documentation and code examples are needed.
4. **Responsive & Accessible Interfaces**: Build high-craft, responsive interfaces with semantic HTML, fluid typography, and keyboard-accessible controls.
5. **WCAG Compliance**: Follow **WCAG 2.2** guidance (`wcag-audit`) when designing, developing, or reviewing UI. Enforce minimum 4.5:1 color contrast, focus rings, ARIA landmarks, and screen reader compatibility.
6. **Automated Testing**: Test critical user workflows with **Playwright** (`npx playwright test`). Ensure test configurations remain clean and maintainable under `tests/`.
7. **Browser Verification & Visual Inspection**: Use Playwright browser automation or browser inspection tools to verify the rendered interface where supported.
8. **Behavior-Preserving Simplification**: Run code simplification reviews (`simplify-code`) only after verifying runtime behavior and passing test suites.
9. **Minimal Dependencies & DRY Architecture**: Avoid unnecessary dependencies, excessive abstractions, and duplicated components.
10. **Evidence-Based Verification**: Never claim a feature, bugfix, or test suite works without executing the code and verifying the result.

## Available Project Tools & Skills

- **UI & UX Design Intelligence**:
  - `frontend-design`: High-craft frontend implementation, aesthetic point of view, and production-grade styling.
  - `ui-ux-pro-max`: Design system database (50+ styles, 97 palettes, 57 font pairings, 99 UX rules).
  - `web-design-guidelines`: Terse code review against Vercel Web Interface Guidelines.
  - `magic-ui-generator`: Production-ready UI component variations inspired by modern UI patterns.
- **Accessibility**:
  - `wcag-audit`: Systematic accessibility audit, WCAG 2.2 mapping, and remediation playbook.
- **Documentation MCP**:
  - `context7`: Upstash Context7 hosted remote MCP server for library and framework documentation.
- **Code Review & Maintenance**:
  - `simplify-code`: Scoped diff review for clarity, reuse, and safe simplification.
- **Codebase Knowledge Graph**:
  - `graphify`: AST extraction, community detection, and natural language code graph queries (`graphify query`, `graphify path`, `graphify explain`).
- **Testing & Browser Automation**:
  - `Playwright`: Test runner (`@playwright/test`) configured with Chromium headless shell, plus `@playwright/mcp` for agent-driven browser actions.

