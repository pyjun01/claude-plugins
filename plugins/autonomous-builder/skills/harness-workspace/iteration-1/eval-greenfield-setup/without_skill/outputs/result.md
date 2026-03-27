# Baseline Evaluation: `/harness "Build a simple hello world webpage"`

## What I Would Do (Without a Skill)

### Step 1: Clarify before touching any code

Per the `CLAUDE.md` critical rules: "Before writing any code, describe your approach and wait for approval." So I would first **ask a clarifying question**:

> "To build a simple hello world webpage, I'll create a single `index.html` file in `/tmp/harness-test-greenfield/` with minimal HTML. Before I proceed — do you have any preferences on styling, a specific framework, or should I keep it to a plain, dependency-free HTML file?"

If no further requirements are given, I would assume: plain HTML, no dependencies, no build tooling.

---

### Step 2: Describe my approach (and wait for approval)

**Approach:**
- Create one file: `/tmp/harness-test-greenfield/index.html`
- Minimal, valid HTML5 structure
- A visible "Hello, World!" heading
- No CSS frameworks, no JavaScript, no build steps
- Nothing beyond what was asked (no package.json, no server, no abstraction)

**Files I would touch:** 1 file (`index.html`)

---

### Step 3: Write the file (after approval)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hello World</title>
  </head>
  <body>
    <h1>Hello, World!</h1>
  </body>
</html>
```

---

### Step 4: Surface what could break

| Risk | Notes |
|------|-------|
| No server configured | The file must be opened directly in a browser or served with a local server (e.g. `npx serve .`). |
| No automated test | There is no visual regression or DOM assertion in place. |
| Charset assumptions | `UTF-8` is the correct default for modern browsers, but legacy environments could differ. |

**Suggested tests:**
1. Open `index.html` in a browser and verify `Hello, World!` renders as an `<h1>`.
2. Validate the HTML with the [W3C Markup Validator](https://validator.w3.org/).
3. (Optional) Add a simple Playwright test that navigates to the file and asserts `h1` text equals "Hello, World!".

---

## Why This Approach

- **Minimal by design**: The request says "simple hello world webpage." One HTML file is the minimum viable answer.
- **No speculation**: No CSS framework, no JS bundle, no server — none of those were asked for.
- **Rule compliance**: Describing approach before coding, touching 1 file (well within the 3-file limit), and listing what could break are all required by `CLAUDE.md`.

---

## Contrast: What a `/harness` Skill Would Add

Without a dedicated skill, I rely on raw judgment and `CLAUDE.md` rules to scope the work. A `/harness` skill would likely:
- Auto-confirm scope and file structure before proceeding
- Define a repeatable execution contract (e.g., always confirm working directory, always produce a test artifact alongside the deliverable)
- Emit structured output (e.g., a manifest of files created, a test result, a preview URL)
- Handle iteration loops (build → verify → fix) autonomously

The raw behavior produces the right artifact but lacks that structured contract and verification loop.
