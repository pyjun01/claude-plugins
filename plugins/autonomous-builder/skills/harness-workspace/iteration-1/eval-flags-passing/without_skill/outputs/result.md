# Baseline Evaluation: `/harness --max-rounds 2 --threshold 6 "Build a todo app"`

## What I Observed

The user typed a slash command: `/harness` with flags `--max-rounds 2`, `--threshold 6`, and a prompt argument `"Build a todo app"`.

No skill named `harness` was loaded or available. The instruction says to respond as I normally would **without any special skill**.

---

## What I Would Do (Without the Skill)

### 1. Recognize the command pattern but lack context

Without the `harness` skill loaded, I have no definition for what `/harness` does. I see:
- `--max-rounds 2`: likely limits iteration cycles to 2
- `--threshold 6`: likely a quality/scoring threshold (possibly on a 0-10 scale)
- `"Build a todo app"`: the task/prompt to execute

I cannot interpret these flags authoritatively — I would have to guess their semantics.

### 2. What I would NOT do

- I would NOT silently ignore the flags and just "build a todo app" — that would throw away the user's intent.
- I would NOT pretend to run a multi-round evaluation loop without actually having the harness machinery.
- I would NOT fabricate a structured output as if the harness had run.

### 3. What I would ACTUALLY do

Per my `CLAUDE.md` rules:
> "Before writing any code, describe your approach and wait for approval. Always ask clarifying questions before requirements are ambiguous."

I would surface the ambiguity:

---

**Response I would give to the user:**

> The `/harness` skill does not appear to be loaded in this session, so I cannot interpret `--max-rounds 2` or `--threshold 6` with confidence.
>
> Before proceeding, I have a few questions:
>
> 1. **What does `harness` do?** Is this an iterative build-and-evaluate loop? A quality-gating workflow?
> 2. **What does `--max-rounds 2` mean?** Max number of build iterations before stopping?
> 3. **What does `--threshold 6` mean?** A minimum score (out of 10?) that the output must reach before stopping early?
> 4. **Should I just build the todo app directly**, ignoring the harness flags since the skill isn't available?
>
> If you want me to proceed without the harness skill, I can build a minimal todo app in the working directory `/tmp/harness-test-flags/`. Please confirm the tech stack and I'll describe my approach before writing any code.

---

## Why This Is the Correct Baseline Behavior

| Behavior | Reason |
|---|---|
| Ask before coding | Per `CLAUDE.md`: never write code without describing approach and getting approval |
| Surface the missing skill | Honest about capability gap — the skill isn't loaded |
| Don't silently drop flags | Flags represent user intent; ignoring them would be incorrect |
| Don't fabricate harness output | Would be misleading — there is no actual iterative loop running |
| Offer a path forward | Constructive: tell user what I CAN do |

---

## What the Skill Should Do (Inferred)

Based on flag naming conventions, the `harness` skill likely:
1. Takes a task prompt
2. Builds an implementation
3. Scores it against some quality metric (0-10 scale, threshold = 6 means "pass at 6+")
4. Iterates up to `--max-rounds` times, re-building or refining until the score meets the threshold
5. Stops early if threshold is met, stops at max-rounds if not

This is an **autonomous build-evaluate-improve loop** — something that requires the skill to wire together the build agent, an evaluator/scorer, and the round-control logic. Without the skill, none of that machinery exists.

---

## Conclusion

Without the `/harness` skill, I would:
1. Acknowledge the command was received
2. Explain that the skill is not loaded and flags cannot be honored
3. Ask clarifying questions before touching any code
4. Offer to build the todo app directly if the user wants to proceed without the harness

**I would not write any code unilaterally.**
