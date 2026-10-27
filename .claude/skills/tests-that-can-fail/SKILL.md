---
name: tests-that-can-fail
description: Use when writing or reviewing a test in this repo, or when a suite is green and you are about to call something done. Covers proving a test fails for the right reason, guarding against tests that quietly check nothing, and the difference between a passing suite and a working app.
---

# A green test tells you what it looked at

It does not tell you that you are covered. Every bug in this list was found
with the suite green, and in each case the check was real - the thing it did
not look at was the thing that was wrong.

## 1. Prove the test fails for the right reason

A test written after the fix has never been observed to fail. It might be
asserting something that was always true.

**Do this, every time, before opening the PR:** revert the fix, run the test,
read the failure message, restore the fix. Put the output in the PR body.

```
FAILED test_the_engine_writes_hindi_in_the_script_the_screens_use[errors.py::invalid_input]
  errors.py::invalid_input is written in Devanagari while the screens are
  Hinglish. The child reads one script, not two: यहभेजानहींजासका।क्या
```

That is worth more than any description of what the test does. For a
cross-file rule, half-apply the other change instead: #91 was verified by
adding `note` to `schemas.py` only and watching the engine-side test fail.

## 2. Guard against a test that checks nothing

Any test that loops over a collection it built itself can pass by finding
nothing. Assert the collection is not empty, with a number.

```python
def test_there_is_something_to_check():
    assert len(CHILD_FACING) >= 12, CHILD_FACING
```

That guard earned itself immediately: the first run collected **10** strings
instead of 16, because an assumption about the JSON shape was wrong. Without
it, the suite would have reported a clean sweep of two thirds of the file.

The same shape in the frontend:

```ts
assert.ok(files.length > 10, `read only ${files.length} source files`);
```

## 3. Do not write the bug down as the expectation

`test_one_entry_is_enough` asserted that a one-entry card says **"1 entries"**.
The bug was the expectation, so the test defended it.

When a test fails after a fix, decide which is wrong - the code or the test -
before changing either. Two real examples:

- `assert body.usage.calls_made >= 1` was asserting the old mock's claim to
  have made eleven calls it never made.
- `assert "जर्मन" in message["hi"]` broke when the Hindi became Hinglish. The
  intent ("the message names the language") was right; the spelling was not.

## 4. Watch for the test that silently stops testing

Worse than failing. `test_contract.py`'s sample sentence carried no ambiguity,
so one test iterated over an empty list and another called `pytest.skip`. Both
green, both checking nothing. Fixed by choosing a sentence that does produce an
ambiguity.

A skip is not a pass. If a test skips in the configuration CI actually runs,
it is not protecting anything there.

## 5. Match the check to what it claims to cover

- `App.reachable.test.ts` read `App.tsx` and reasoned about the `Step` union,
  so it caught a screen with no door - and was blind to a file **nothing
  imports**, because an unimported file is a member of nothing. `DemoButton`
  was written, styled, tested and absent from the bundle (#88).
- `test_contract_sync.py` compared `schemas.py` to `api.ts`. There is a
  **third** declaration in `engine/contract.py`, and it is the one the engine
  consumes. A field added to two of three files passed 11/11 (#91).
- A register check that only read Devanagari would pass an engine that went
  back to `aapko`.

Before trusting a test, say out loud what it reads. Then ask what it cannot
see.

## 6. Keep load-bearing strings off the line wrap

Tests assert substrings of prompts. Rewrapping a paragraph put a newline
through `"do not report"` and failed a test that had nothing to do with the
change. Two separate incidents, same cause.

Assert short phrases that cannot straddle a wrap, and when rewrapping a prompt,
run the prompt tests.

## 7. Detect missing imports structurally, not by calling

```python
reached_for = {i.argval for i in dis.get_instructions(function)
               if i.opname == "LOAD_GLOBAL"}
missing = sorted(n for n in reached_for
                 if n not in vars(live) and not hasattr(builtins, n))
```

`engine/live.py` called `_report`, which was never imported - lost in a merge.
Python resolves globals at call time, so nothing failed until a real report ran
in live mode, where **every card failed** (#78). Use `LOAD_GLOBAL`, not
`co_names`, which also holds attribute names.

## 8. Green tests are not a working app

The suite passes offline, against the mock, on your machine.

- `/api/health` reports **configuration, not reachability**. It never calls a
  model. It answered `200` with every function `"live"` for hours while
  `POST /api/report` returned `NameError` in production.
- `ENGINE_MODE` defaults to `"mock"`. **A forgotten setting looks exactly like
  success.**
- `ALLOWED_ORIGINS` defaults to localhost. A mismatch shows a clean 200 in the
  server log and a broken screen in the browser.

So before saying it works, **drive the thing a user touches**: the route, the
screen, the deployed URL.

`POST /api/report` is free - `engine/report.py` makes no model calls - so it is
the one live endpoint you can exercise as often as you like. Use it.
