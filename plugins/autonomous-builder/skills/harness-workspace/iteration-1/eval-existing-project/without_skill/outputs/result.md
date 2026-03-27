# Baseline Evaluation: `/harness "Add dark mode to this app"`

## What I Would Do (Without the `/harness` Skill)

### Step 1: Clarify Before Coding

Per my critical rules, I **never write code before describing my approach and receiving approval**. The request "Add dark mode to this app" is ambiguous, so I would first ask clarifying questions:

1. **What framework/stack is this?** (React, Vue, plain HTML/CSS, Next.js?) — I'd read `package.json` to find out.
2. **How should dark mode be toggled?** (System preference via `prefers-color-scheme`, a manual toggle button, or both?)
3. **Is there an existing design token system or CSS variable setup?** (Tailwind, CSS modules, styled-components?)
4. **Where should the toggle live?** (Navbar, settings page, floating button?)

### Step 2: Explore the Codebase

Before writing anything, I'd read the project files to understand:
- `package.json` — identify the framework and dependencies
- Entry point (e.g., `src/App.tsx`, `src/main.ts`, `index.html`) — understand app structure
- Existing CSS/styling files — detect current theming approach

### Step 3: Describe My Approach

Only after understanding the codebase would I describe my plan. A typical minimal approach:

**If using CSS variables (framework-agnostic):**
- Add a `data-theme="dark"` attribute toggle on `<html>` or `<body>`
- Define CSS custom properties for light/dark in a global stylesheet
- Add a toggle button component
- Persist preference in `localStorage`

**If using Tailwind CSS:**
- Enable `darkMode: 'class'` in `tailwind.config.js`
- Add `dark:` variant classes to existing components
- Add a toggle that switches `.dark` class on `<html>`

**If using styled-components or CSS-in-JS:**
- Define a `ThemeProvider` with light/dark theme objects
- Wrap the app and wire a toggle

### Step 4: Await Approval

I would **not touch any files** until the user confirms:
- The approach is correct
- The scope is acceptable (files to change)
- Any missing context is provided

### Why I Stop Here

My rules explicitly state:
- "Before writing any code, describe your approach and wait for approval."
- "Always ask clarifying questions before writing any code if requirements are ambiguous."
- "NEVER write or modify code without describing your approach first and receiving approval."

"Add dark mode to this app" is intentionally vague — the implementation varies significantly depending on the stack and UX requirements. Proceeding without confirmation would violate these rules and risk producing code that doesn't fit the project.

---

## What the `/harness` Skill Would Do Differently

A `/harness` skill would be expected to:
1. **Automatically read and understand the project** (package.json, source files, styling setup)
2. **Make reasonable inferences** about the stack and best approach
3. **Execute the implementation autonomously** — writing CSS, components, and wiring the toggle
4. **Verify the result** — check for syntax errors, run tests if available, confirm the feature works
5. **Report what it did** — summarize changes made, files modified, and how to test

The key delta: the skill removes the human approval loop for well-scoped, low-risk UI features and handles the full read-plan-implement-verify cycle autonomously.
