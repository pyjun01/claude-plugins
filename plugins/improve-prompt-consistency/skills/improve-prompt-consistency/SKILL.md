---
description: Analyze any prompt file and improve it using AI consistency research findings. Use when running /improve-prompt-consistency, "improve this prompt", "make prompt more consistent", or "audit prompt quality".
argument-hint: "<path-to-prompt-file>"
---

# Improve Prompt Consistency

Analyze a prompt file against 9 research-backed consistency criteria (G1-G9), identify gaps, and generate an improved version that preserves the original intent while maximizing output consistency.

> **Critical Rules** (repeated at end of document):
> - NEVER change the original prompt's intent, domain logic, or business rules.
> - NEVER rewrite the prompt from scratch — wrap and augment existing content only.
> - NEVER exceed 1.5x the original line count in the improved version.
> - NEVER use vague language ("appropriate", "as needed", "consider") in improvements.

---

## Step 0: Parse Arguments & Read Prompt

Parse `$ARGUMENTS` to extract `<prompt-path>` (required).

Validation:
- `prompt-path` must exist on disk — read it to confirm. If not found, ask the user with AskUserQuestion.
- Record the original line count as `ORIGINAL_LINES`.

---

## Step 1: Gap Analysis

Evaluate the prompt against each of the 9 criteria below. Assign a severity to each: **HIGH**, **MEDIUM**, **LOW**, or **NONE**.

<gap_criteria>

### G1: XML Tag Semantic Boundaries
**Research basis**: Structured prompts with XML tags improve consistency by 10-15% and prevent context contamination between sections.
**Evaluate**: Does the prompt use XML tags (or equivalent clear delimiters) to separate role, task, constraints, examples, and output format into distinct sections?
**Severity**:
- HIGH: No structural separation — everything is prose paragraphs
- MEDIUM: Some sections exist (e.g., markdown headers) but no semantic boundaries between role/task/constraints/examples
- LOW: Mostly structured but 1-2 sections bleed into each other
- NONE: Clear semantic boundaries exist for all major sections

### G2: NEVER Rules (Negative Constraints)
**Research basis**: Negative constraints ("Never") are ~3x more effective than positive directives ("Do"). Models default to training patterns; "Never" overrides those defaults.
**Evaluate**: Does the prompt contain explicit NEVER/DO NOT rules for critical behaviors? Are there at least 2-3 negative constraints?
**Severity**:
- HIGH: No negative constraints at all
- MEDIUM: Only positive directives ("Do X") with no "Never" counterparts for critical rules
- LOW: 1 negative constraint exists but critical behaviors lack "Never" guards
- NONE: 2+ "Never" rules cover the most critical behaviors

### G3: Sandwich Technique (Start + End Repetition)
**Research basis**: Critical instructions placed only in the middle of a prompt suffer from "lost-in-the-middle" effect. Repeating them at start and end increases compliance.
**Evaluate**: Are the most critical rules stated near the beginning AND repeated near the end of the prompt?
**Severity**:
- HIGH: Critical rules appear only once in the middle of the prompt
- MEDIUM: Critical rules appear at the start OR end, but not both
- LOW: Most critical rules are sandwiched but 1 key rule is not
- NONE: Critical rules appear at both start and end

### G4: Explicit Output Schema
**Research basis**: Explicit output format specifications achieve >99% format compliance. Without them, output format varies significantly across runs.
**Evaluate**: Does the prompt define an explicit output format (JSON schema, markdown template, or exact structure specification)?
**Severity**:
- HIGH: No output format specified — model decides freely
- MEDIUM: Output format is described in prose ("return a JSON object") without exact field definitions
- LOW: Output format is mostly specified but some fields or edge cases are undefined
- NONE: Exact output schema is defined with all fields, types, and edge case handling

### G5: 2-3 Examples (Common / Edge / Null)
**Research basis**: 2-3 well-chosen examples improve judgment consistency by 15-25%. Examples should cover common case, edge case, and null/error case.
**Evaluate**: Does the prompt include 2-3 diverse examples? Do they cover common, edge, and null cases?
**Severity**:
- HIGH: No examples at all
- MEDIUM: 1 example exists but lacks edge/null case coverage
- LOW: 2+ examples exist but all cover similar cases (no diversity)
- NONE: 2-3 diverse examples covering common, edge, and null scenarios

### G6: Example-Rule Alignment Audit
**Research basis**: When examples contradict rules, models follow examples over rules. One misaligned example can override an entire rule.
**Evaluate**: Do all examples strictly follow every stated rule? Is there any contradiction between examples and constraints?
**Severity**:
- HIGH: An example directly contradicts a stated rule
- MEDIUM: An example is ambiguous about a rule (does not clearly follow or violate)
- LOW: Examples follow rules but use inconsistent formatting between them
- NONE: All examples strictly follow all rules with consistent formatting

### G7: Priority Label Removal
**Research basis**: Priority markers ("Most Important:", "Priority 1:", "#1 Rule:") achieve less than 50% obedience. Position and repetition are the effective mechanisms.
**Evaluate**: Does the prompt rely on priority labels to emphasize rules instead of using position (sandwich) and repetition?
**Severity**:
- HIGH: Multiple priority labels used as the primary emphasis mechanism
- MEDIUM: 1-2 priority labels present
- LOW: Informal priority language ("especially important") used sparingly
- NONE: No priority labels — emphasis is achieved through position and repetition

### G8: Underspecification Removal
**Research basis**: Underspecified prompts cause up to 45% performance variance. Vague words like "appropriate", "as needed", "consider", "good" leave interpretation to the model.
**Evaluate**: Does the prompt contain vague or ambiguous instructions that leave critical decisions to model interpretation?
**Severity**:
- HIGH: Multiple critical instructions use vague language ("use appropriate format", "handle errors as needed")
- MEDIUM: 1-2 vague instructions exist for non-trivial decisions
- LOW: Minor vague language in non-critical areas
- NONE: All instructions are specific and actionable

### G9: Self-Check Placement (End Position)
**Research basis**: Self-verification instructions placed in the middle of a prompt get deprioritized. Placing them at the end (after output generation) maximizes their effect.
**Evaluate**: If the prompt includes self-check/verification instructions, are they positioned at or near the end?
**Severity**:
- HIGH: Self-check instructions exist but are buried in the middle
- MEDIUM: No self-check exists for a prompt that makes complex judgments
- LOW: Self-check exists at the end but is incomplete (does not cover all critical rules)
- NONE: Self-check is at the end and covers critical rules, OR the prompt is simple enough that self-check is unnecessary

</gap_criteria>

---

## Step 2: Generate Report

Present the Gap Analysis results to the user in this format:

```
## Gap Analysis: [filename]

| # | Criterion | Severity | Finding |
|---|-----------|----------|---------|
| G1 | XML Tag Semantic Boundaries | HIGH/MEDIUM/LOW/NONE | [1-sentence finding] |
| G2 | NEVER Rules | ... | ... |
| ... | ... | ... | ... |
| G9 | Self-Check Placement | ... | ... |

**Gaps found**: X HIGH, Y MEDIUM, Z LOW
```

If **all 9 criteria are NONE**: Display "No significant consistency gaps found. This prompt follows research-backed best practices." and STOP.

Otherwise, list the planned improvements for each HIGH and MEDIUM gap (1 sentence each). Ask the user with AskUserQuestion: "Proceed with these improvements?" Options: "Proceed" / "Adjust scope" / "Cancel"

If "Cancel", STOP. If "Adjust scope", ask which gaps to address and proceed with the adjusted list.

---

## Step 3: Generate Improved Prompt

<improvement_rules>

Apply improvements ONLY for HIGH and MEDIUM gaps. Follow these rules strictly:

1. **Preserve intent**: Do not change the original prompt's purpose, domain logic, business rules, or terminology.
2. **Wrap, do not rewrite**: Add structure around existing content. Move existing text into appropriate sections. Do not rephrase original sentences unless they contain vague language (G8).
3. **Line count limit**: The improved prompt MUST NOT exceed `ORIGINAL_LINES * 1.5` lines. If improvements would exceed this, prioritize HIGH gaps over MEDIUM.
4. **Traceability**: Add `<!-- G# applied -->` as an inline comment after each structural change, so the user can trace which criterion drove each modification.
5. **Minimal insertion**: Each gap fix should add the minimum content needed. A G2 fix adds 2-3 "Never" rules — not 10. A G3 fix repeats 1-2 critical rules at the end — not the entire constraints section.

Gap-specific application guidance:
- **G1**: Wrap existing sections in XML tags. Do not rename or restructure the content itself.
- **G2**: Extract implicit constraints and make them explicit "Never" rules. Place in a constraints section.
- **G3**: Copy the 1-2 most critical rules to a reminder section at the end.
- **G4**: Formalize any implicit output expectations into an explicit schema section.
- **G5**: Add 2-3 examples that demonstrate the expected input/output. Cover common, edge, and null cases.
- **G6**: Fix any contradictions between examples and rules. Adjust the example, not the rule.
- **G7**: Remove priority labels. Move the labeled rules to sandwich positions (start + end) instead.
- **G8**: Replace each vague term with a specific, measurable instruction.
- **G9**: Move self-check instructions to the end of the prompt, after the output section.

</improvement_rules>

---

## Step 4: Present for Review

Display the improved prompt in full inside a code block. Then display a change summary:

```
## Changes Applied

| Gap | What Changed | Lines Affected |
|-----|-------------|----------------|
| G1  | Wrapped sections in <role>, <task>, <constraints> tags | 5-12, 20-30 |
| G2  | Added 3 NEVER rules to constraints section | 15-18 |
| ... | ... | ... |

Original: X lines → Improved: Y lines (Z% increase)
```

Ask the user with AskUserQuestion: "How would you like to proceed?"
Options: "Apply (write to file, comments removed)" / "Apply with modifications (tell me what to change)" / "Cancel"

- **"Apply"**: Proceed to Step 5.
- **"Apply with modifications"**: Ask what to modify, apply changes, re-display, and ask again.
- **"Cancel"**: STOP.

---

## Step 5: Write Improved Prompt

1. Remove all `<!-- G# applied -->` tracking comments from the improved prompt.
2. Write the cleaned prompt to `<prompt-path>` (overwrite the original).
3. Confirm: "Improved prompt written to `<prompt-path>`. Original was X lines, improved is Y lines."

---

## Important Rules

1. **Intent preservation**: NEVER change the original prompt's intent, domain logic, or business rules. The improved prompt must do the same thing — just more consistently.
2. **No rewrites**: NEVER rewrite the prompt from scratch. Wrap and augment existing content.
3. **Line count cap**: NEVER exceed 1.5x the original line count. If improvements would exceed this, drop MEDIUM fixes until within budget.
4. **No vague language**: NEVER use "appropriate", "as needed", "consider", "if possible", or other hedge words in improvements. Every added instruction must be specific and actionable.
5. **Traceability**: Every structural change must have a `<!-- G# applied -->` comment until the final write step.
6. **Example quality**: When adding examples (G5), examples MUST strictly follow all existing and newly added rules. Audit each example against every constraint before including it.
7. **Report language**: The gap analysis report and change summary MUST be written in English.
