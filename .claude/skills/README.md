# Project skills

Instructions that load **only when they are relevant**, so they can be longer
and more specific than anything that would fit in `CLAUDE.md`.

Claude Code picks these up automatically for anyone who clones the repo. There
is nothing to install and nothing to remember: open the project, and the skill
arrives when you touch the thing it is about.

| skill | loads when you are |
|---|---|
| `child-facing-copy` | changing any text a child reads |
| `tests-that-can-fail` | writing or reviewing a test, or about to call something done |
| `the-engine-contract` | changing a shared shape, or the mock engine |

## What belongs here, and what belongs in CLAUDE.md

`CLAUDE.md` is loaded into **every** session, so it holds what is true for all
work: who owns which file, the plan, the safety floor, the decisions all three
of us agreed. Keep it short, because everything in it costs context on every
task.

A skill is for a **specific kind of work**. It can afford detail, worked
examples and the story of how a rule was learned, because it only costs
anything when that work is actually happening.

If you find yourself writing "when you are editing X, remember Y" in
`CLAUDE.md`, it is a skill.

## Writing one

```
.claude/skills/<name>/SKILL.md

---
name: <name>
description: <when to use it - this is the only part always in context,
             so it has to be enough to decide by>
---
```

The `description` is what a session sees before loading the body, so it should
name the files and the situations, not advertise the skill.

Two things make these worth having:

- **Every rule names the bug that taught it**, with the PR number. A rule with
  a scar is one people keep; a rule with a reason is one people argue with at
  2am and then break anyway.
- **They are reviewed like code.** A skill that drifts from the codebase is
  worse than none, because it is confidently wrong. If you change the thing a
  skill describes, change the skill in the same PR.

Updating one is an ordinary PR. Disagreeing with one is an ordinary review.
