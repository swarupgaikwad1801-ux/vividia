# Feedback for Nebius

Notes for the hackathon's "Most Valuable Feedback" submission field. Written
as we hit things, not reconstructed afterwards. Keep it specific and factual.

## Onboarding

- **The quickstart code block is easy to mis-copy.** The console shows a cURL
  snippet next to the Python one. Copying the cURL block put five stray lines
  into our `.env` and `python-dotenv` then printed
  `could not parse statement starting at line 6` five times without naming the
  file. A "copy base URL" button next to the base URL itself would avoid this.
- **The base URL is not stated as its own field** anywhere obvious; it only
  appears inside the sample code (`https://api.tokenfactory.nebius.com/v1/`).

## Credits

- Filled in the Devpost credits form with `NEBIUS-DEVPOST-GLOBAL26` on
  24 Oct 2026. The confirmation said the promo code arrives by email; it had
  not arrived by the end of that day. The console still showed
  `Trial: $1.00 - 29 days` and `Account balance $0.00`.
  The Discord channel shows many participants in the same position, which
  suggests a delivery or queueing problem rather than individual error.
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
