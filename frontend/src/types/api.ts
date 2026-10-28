/**
 * HTTP contract between the frontend and the backend.
 *
 * Mirrors backend/app/schemas.py exactly. Change both in the same commit, and
 * only after all three of us agree.
 */

export type Strategy = "baseline" | "multi_pass" | "adaptive";
export type SafetyCategory = "none" | "danger" | "self_harm" | "sexual";
export type Severity = "critical" | "minor";

/** One reading of an ambiguous phrase, offered to the child. */
export interface Option {
  /** Stable id sent back in ClarifyRequest.choices */
  id: string;
  /** Shown to the child, in the child's language */
  label: string;
  /** What the German becomes if the child picks this */
  meaning_de: string;
}

/** A phrase whose meaning the passes disagreed about. */
export interface Ambiguity {
  /** The phrase as the child wrote it */
  phrase: string;
  /** Asked in the child's language */
  question: string;
  options: Option[];
  /** critical = the disagreement changes who did what, or negation */
  severity: Severity;
}

/** Shown live in the UI and recorded by the benchmark. */
export interface Usage {
  calls_made: number;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  /** From the published per-token price; approximate */
  estimated_cost_usd: number;
}

/** Result of the safety check that always runs on disclosure text. */
export interface Safety {
  urgent: boolean;
  category: SafetyCategory;
  /** Calm text in the child's language; empty unless urgent */
  message_child: string;
}

/** POST /api/translate */
export interface TranslateRequest {
  text: string;
  /** ISO 639-1, e.g. "ar", "uk", "tr" */
  source_lang: string;
  target_lang?: string;
  strategy?: Strategy;
}

export interface TranslateResponse {
  translation: string;
  /** Agreement between passes, NOT a correctness score */
  confidence: number;
  ambiguities: Ambiguity[];
  safety: Safety;
  strategy_used: Strategy;
  usage: Usage;
}

/**
 * What kind of thing the child just told us. Picks one of the fixed,
 * reviewed sentences the listening screen answers with (`heard.*`).
 */
export type ListenKind =
  | "hurt"
  | "names"
  | "left_out"
  | "taken"
  | "online"
  | "threat"
  | "feeling"
  | "good"
  | "asking"
  | "talk"
  | "thanks"
  | "bye"
  | "unsure"
  | "not_now"
  | "about_app"
  | "smalltalk"
  | "unclear"
  | "other";

/**
 * A detail the child's message already gives. The listening screen asks only
 * for the details still missing. Never shown.
 */
export type ListenDetail = "where" | "when" | "who" | "feeling";

/** POST /api/listen — one message, before any card exists. */
export interface ListenRequest {
  text: string;
  /** ISO 639-1, the child's language */
  lang: string;
  /**
   * The detail the app's last question asked for, so a short answer ("at the
   * bus stop") is read as that answer. Only the question's name is sent,
   * never an earlier message.
   */
  asked?: ListenDetail | null;
}

export interface ListenResponse {
  kind: ListenKind;
  /** Details this message already gives; the screen does not ask for them. */
  told: ListenDetail[];
  safety: Safety;
  /**
   * Only for kind "other" and never when safety is urgent: a short answer the
   * model wrote that passed both checks. null means show the reviewed sentence.
   */
  reply: string | null;
  usage: Usage;
}

/**
 * POST /api/clarify — re-translate with the child's answers applied.
 * The child decides the meaning; the model never resolves an ambiguity alone.
 *
 * The server bounds both collections, because every answered decision is
 * rendered into a prompt: at most 3 `ambiguities` (it never offers more than
 * 2) and at most 10 `choices`. Over either, it answers 422. Echo back what you
 * were given and neither limit can be reached.
 */
export interface ClarifyRequest {
  text: string;
  source_lang: string;
  target_lang?: string;
  /** { [ambiguity.phrase]: option.id } */
  choices: Record<string, string>;
  /**
   * The `ambiguities` from the TranslateResponse, sent back unchanged.
   *
   * Required: an option id on its own means nothing to the server, because the
   * id -> meaning_de mapping only exists in the response you are holding.
   * Omitting it used to make the server translate as if the child had never
   * answered; it is now a 422 you can see.
   */
  ambiguities: Ambiguity[];
}

/** Same shape as TranslateResponse; `ambiguities` should come back empty. */
export type ClarifyResponse = TranslateResponse;

/** One moment in the child's timeline, already approved by the child. */
export interface Entry {
  /** ISO date, e.g. "2026-10-21" */
  date: string;
  /** Emoji check-in code, e.g. "sad" */
  mood: string;
  text_child: string;
  text_de: string;
  place?: string | null;
  people?: string | null;
  /**
   * The child's answer to a clarification question, exactly as the child gave
   * it: an option they tapped (our wording, their choice) or words they typed.
   *
   * A Hindi or English speaker's answer changes the German, so it needs no
   * home of its own. A German speaker's does not: there is nothing to
   * re-render, and inventing a "clearer" sentence would be exactly the
   * paraphrase that `report.py` refuses to let a model produce. So the answer
   * sits beside the entry as the child's own note.
   *
   * Printed verbatim. Never summarised, never rewritten.
   */
  note?: string | null;
}

/** POST /api/report */
export interface ReportRequest {
  entries: Entry[];
  child_lang: string;
}

export interface ReportResponse {
  /** For the child to read and approve */
  child_version: string;
  /** What the trusted adult reads */
  german_version: string;
  usage: Usage;
}

/** GET /api/resources?lang=ar&state=BW */
export interface Resource {
  name: string;
  /** Phone number or URL */
  contact: string;
  hours: string;
  languages: string[];
  /** Where this was verified */
  source_url: string;
  /** ISO timestamp, shown in the UI */
  retrieved_at: string;
}

export interface ResourcesResponse {
  resources: Resource[];
  /** "fallback" when the Tavily lookup failed and curated data was served */
  source: "live" | "fallback";
}

/** GET /api/emergency */
export interface EmergencyResponse {
  /** 110 and 112 from content/helplines.json, in file order; never Tavily, never a model */
  contacts: Resource[];
}

/** One step of the 5-minute guide, with the page it came from. */
export interface GuideStep {
  /** The step, in the language the server actually served. */
  text: string;
  /**
   * The page this step is drawn from, resolved server-side from the file's
   * own `sources` map.
   *
   * `null` when the step cites nothing. A claim about how to treat a child
   * who has just disclosed should carry its source, and a missing one should
   * be visible rather than implied - so render the absence, do not hide it.
   */
  source_url?: string | null;
}

/**
 * One rung of the escalation ladder - shown to the CHILD, not the adult.
 *
 * It travels with the adult's guide because it lives in the same content
 * file. Different audience, same route: worth splitting one day, not worth
 * splitting in freeze week.
 */
export interface LadderRung {
  /** Stable id. `lib/followups.ts` matches on these. */
  id: string;
  /** In the language the server served. */
  text: string;
}

/**
 * GET /api/guide?lang=de - the 5-minute guide for the adult the child chose.
 *
 * One language, picked by the server. The adult reads one, and sending both
 * would put the choice in the component that knows least about it.
 */
export interface GuideResponse {
  /**
   * The language actually served, which is NOT always the one asked for: the
   * guide exists in `de` and `en` only, and anything else falls back to `de`.
   *
   * Read this rather than assuming. A child who writes Hindi may well hand
   * the phone to someone who reads German, and the element needs the right
   * `lang` or a screen reader pronounces the whole guide wrongly.
   */
  lang: string;
  title: string;
  steps: GuideStep[];
  footer: string;
  /** When a person last checked this guide against its sources. */
  checked_on: string;
  /**
   * The escalation ladder, lowest rung first. **Never re-sort it** - the
   * order is the content, and a child who has already been to the head of
   * year must never be sent back to their form teacher.
   *
   * `emergency` is not in it. The content file lists it and the server drops
   * it, for the same reason `lib/followups.ts` leaves it out of `LADDER`: an
   * emergency is not an escalation. 110 is what you do INSTEAD of climbing,
   * and it stays one tap away on every screen from `/api/emergency`.
   */
  ladder?: LadderRung[];
  /**
   * The rule that outranks the ladder: if the child said it happens at home,
   * family is never suggested at any rung.
   */
  home_rule?: string;
}

/** GET /api/health */
export interface HealthResponse {
  status: "ok" | "degraded";
  engine: "mock" | "live";
  /** role -> model id, e.g. { fanout: "...", judge: "..." } */
  models: Record<string, string>;
  /**
   * Spend to watch while the demo is public, values as strings:
   * `tavily_spent_today`, `tavily_daily_cap`, `tavily_cached_states`.
   *
   * Empty in mock mode, which spends nothing. Optional, so a client written
   * before this field is unaffected — no screen depends on it. It exists so a
   * person can watch the Tavily allowance, which has to last until judging
   * closes on 15 Dec.
   */
  budget?: Record<string, string>;
}

export type ErrorCode =
  | "upstream_timeout"
  | "upstream_unavailable"
  | "rate_limited"
  | "credit_exhausted"
  | "invalid_input"
  | "internal";

/**
 * Body of every non-2xx response. `message_child` is the only string a child
 * should ever see: already in their language, never mentioning models or
 * HTTP codes.
 */
export interface ErrorResponse {
  code: ErrorCode;
  /** For developers and logs; never shown to a child */
  message: string;
  message_child: string;
  retryable: boolean;
}
