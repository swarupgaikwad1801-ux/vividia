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

## Privacy

- The Legal Quick Guide is genuinely good: plain language, and it states
  plainly that public endpoints have no region commitment. That honesty made
  it possible for us to drop an "EU inference" claim before we published it.
- Zero Data Retention being one checkbox at organization level is excellent.
  It would be even better if the console showed ZDR status somewhere in the
  API key or project view, so a reviewer can confirm it without hunting.
