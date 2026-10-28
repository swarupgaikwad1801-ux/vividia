# Feedback for Nebius

Notes for the hackathon's "Most Valuable Feedback" submission field. Written
as we hit things, not reconstructed afterwards. Keep it specific and factual.

## Short version (paste this into Devpost)

We built Vividia on Token Factory between 24 and 30 Oct 2026. We tried Nano,
Lightning, Super and Super-VL; the app uses Super-VL for the translation
passes and Super 120B as the judge. What cost us the most time, most
expensive first:

1. **Two silent blockers between a green deploy and a working app.** The
   trial ended with credits still on the account, and calls were blocked
   until we found "Switch to paid usage" in the console. Separately, the base
   URL in our host's settings was a whole cURL example copied from the
   console. Both showed up only on a real request, after deploy. A clear API
   error naming the trial state, and a "copy base URL" button, would remove
   both.
2. **`reasoning_effort: "none"` on Nemotron Nano returns an empty answer**
   with `finish_reason: "stop"`, while the same value works on Lightning. The
   other documented ways to turn reasoning off (`detailed thinking off`,
   `/no_think`, `chat_template_kwargs`) are accepted and ignored. A silent
   empty answer looks like success in a pipeline.
3. **Quality depends on the language, and the catalog doesn't say so.**
   Lightning returned Ukrainian input unchanged in 5 of 12 runs; Super and
   Super-VL failed 0 of 12. A note on which languages each model was tested
   on would have saved us a wrong model choice.
4. **The account balance is not a spend meter.** It said "last updated
   yesterday". It suggested we had spent $0.27; the usage-by-model page said
   $1.23, about 4.5x more. Real-time spend next to the balance would prevent
   this.
5. **Docs and messaging:** the structured-output examples don't run as
   written (a missing comma, a key spelled `"response format"`), and the
   launch post promises EU or US data residency while the Legal Quick Guide
   says public endpoints have no region commitment.

What worked well: Zero Data Retention as one organization-level checkbox, a
Legal Quick Guide honest enough that we dropped a claim we couldn't keep,
generous token limits on Super-VL (2M TPM), and strict JSON-schema output on
`nemotron-3-super-120b-a12b`, which our judge relies on.

The details and evidence for each point are below.

## Onboarding

- **The quickstart code block is easy to mis-copy.** The console shows a cURL
  snippet next to the Python one. Copying the cURL block put five stray lines
  into our `.env` and `python-dotenv` then printed
  `could not parse statement starting at line 6` five times without naming the
  file. A "copy base URL" button next to the base URL itself would avoid this.
- **The base URL is not stated as its own field** anywhere obvious; it only
  appears inside the sample code (`https://api.tokenfactory.nebius.com/v1/`).
- **The same mis-copy reached our production server (26 Oct).** On our host
  (Render), `NEBIUS_BASE_URL` held a whole cURL example from the console
  (`'https://…/v1/chat/completions' \ -X 'POST' \ …`), and once a value
  pasted with its `NAME=` prefix still attached. Every translation failed with
  `InvalidURL` from 26 Oct until the evening of 27 Oct, while our health
  check stayed green. We now
  refuse a base URL that isn't a URL at startup. A copy button on the base
  URL alone would stop this at the source.

## Credits

- Filled in the Devpost credits form with `NEBIUS-DEVPOST-GLOBAL26` on
  24 Oct 2026. The confirmation said the promo code arrives by email; it had
  not arrived by the end of that day. The console still showed
  `Trial: $1.00 - 29 days` and `Account balance $0.00`.
  The Discord channel shows many participants in the same position, which
  suggests a delivery or queueing problem rather than individual error.
  (Update: the code did arrive and was redeemed; the balance read $29.75 on
  26 Oct.)
- **Credits on the account did not mean calls were allowed (26 Oct).** With
  $29.75 on the balance, Token Factory calls were blocked. The console said:
  `Trial expired. Trial ended. Usage stopped based on your after-trial
  preference. Switch to paid usage to continue.` We found it only after the
  backend was deployed and its health check was green, on the first real
  translation request. Suggestion: an API error body that names this state
  ("trial ended, switch to paid usage"), and an email when it happens, so a
  team does not debug its own code first.
- **Switching to paid usage means spending can go past the credits** once a
  card is attached. Our app caps its own daily spend, but that protects the
  demo budget, not the card. A hard spend limit offered right at the "switch
  to paid usage" step would make that switch an easy yes for a student team.
- **The account balance lags and is not a spend meter.** On 27 Oct it showed
  "last updated yesterday 22:05 UTC". Read as spend, it said $0.27; the
  usage-by-model page said $1.03 + $0.20 VAT = $1.23, about 4.5x more. We
  published a wrong cost ratio from the balance before checking the usage
  page. Real-time spend,
  or a clear "this is not today's spend" next to the balance, would prevent
  this.
- The card requirement is clear once found, but it is documented in the
  billing docs rather than surfaced before signup.

## Rate limits

- **`nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` is capped at 100 RPM**, the lowest
  of the 30 models listed, while its token budget is high (800k TPM). For a
  workload that makes many small parallel calls (our verified-translation
  fan-out), the request cap binds long before the token cap, and the pairing
  is counter-intuitive for the model positioned as the cheap, fast one.
  `Nemotron-3.5-Lightning` offers 600 RPM at an identical price.
- The auto-scaling rule (20x once usage passes 80% of the limit) is a good
  design, but it is not visible from the API, so a client cannot tell what its
  current limit is and has to guess its concurrency.

## Reasoning control on Nemotron models

- **`reasoning_effort: "none"` makes `NVIDIA-Nemotron-3-Nano-30B-A3B` return an
  empty response.** 7 completion tokens, `finish_reason: "stop"`, empty
  `content`, empty `reasoning_content`. Reproducible across prompts and with
  the task in either the system or the user message. `"minimal"` works. On
  `Nemotron-3_5-Lightning` the same parameter works perfectly (20 tokens,
  0.33 s, clean translation), so the behaviour is inconsistent between two
  models in the same family. A silent empty answer is worse than an error: in
  a pipeline it looks like a successful call.
- **The documented ways to disable reasoning do not work** on these models
  through the OpenAI-compatible endpoint. `detailed thinking off` as a system
  prompt, a `/no_think` prefix, and
  `chat_template_kwargs: {"thinking": false}` are all accepted without error
  and all ignored. Only `reasoning_effort` has any effect. A note in the model
  catalog page for each model, stating which values that model accepts, would
  have saved us an afternoon.
- **Default reasoning is expensive for small tasks.** Nano spends ~250
  completion tokens deliberating over a 12-word translation, roughly 13x the
  tokens Lightning needs for the same output quality. For a
  many-small-calls workload the default is a poor fit, and it is not obvious
  from the catalog that these models reason by default.

## Model quality varies sharply by input language

- **`Nemotron-3_5-Lightning` with `reasoning_effort: "none"` returned our
  Ukrainian input unchanged in 5 of 12 runs** instead of translating it, and
  once answered "Ich bin Nemotron, ein Sprachmodell, das von NVIDIA trainiert
  wurde" to a plain translation request. The same model and settings are
  reliable on English, Turkish and Arabic in our tests. Because it fails by
  returning plausible-looking text rather than an error, a pipeline cannot
  detect it without an explicit output-language check.
- `Nemotron-3.5-Super-VL` and `nemotron-3-super-120b-a12b` scored 0 failures
  on the same 12 runs, so this is specific to Lightning rather than to the
  family.
- Suggestion: the model catalog gives one quality impression per model, but
  for a translation workload the usable answer is per language pair. Even a
  short note on which languages a model was evaluated for would have saved us
  from choosing a model that benchmarked best in English and could not do the
  job we needed.

## Privacy

- The Legal Quick Guide is genuinely good: plain language, and it states
  plainly that public endpoints have no region commitment. That honesty made
  it possible for us to drop an "EU inference" claim before we published it.
- Zero Data Retention being one checkbox at organization level is excellent.
  It would be even better if the console showed ZDR status somewhere in the
  API key or project view, so a reviewer can confirm it without hunting.

## Documentation (Neel, 24 Oct)

- **The structured-output examples do not run as written.** On
  `docs.tokenfactory.nebius.com/ai-models-inference/json`, the Python
  JSON-schema example is missing a comma between `"type": "json_schema"` and
  `"json_schema": ...` inside `response_format`, so it is a syntax error. The
  matching cURL example sends the key as `"response format"` (with a space),
  which the API cannot recognise. Both are easy to fix and both cost time for
  anyone copying them.
- **No Nemotron model appears in the structured-output examples.** They use
  Qwen, Mistral and gpt-oss, and the page says to look for a "JSON mode" tag
  on each model card. Strict JSON schema output works well on
  `nemotron-3-super-120b-a12b` in our engine; an example using a Nemotron
  model would help hackathon participants who must use one.

## Messaging vs. the legal docs

- **The launch announcement and the legal guide say different things about
  region.** The Token Factory launch post lists "Zero-retention inference in EU
  or US datacenters, supporting strict data-residency requirements", while the
  console reports public endpoints as region "Global" and the Legal Quick
  Guide explains that only dedicated endpoints carry a region commitment. We
  nearly published an "EU inference" claim based on the announcement. One
  sentence in the announcement ("region commitment requires a dedicated
  endpoint") would prevent that for others.
