/**
 * HTTP contract between the frontend and the backend.
 *
 * Mirrors backend/app/schemas.py exactly. Change both in the same commit, and
 * only after all three of us agree.
 */

export type Strategy = "baseline" | "multi_pass" | "adaptive";
export type SafetyCategory = "none" | "danger" | "self_harm";
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
 * POST /api/clarify — re-translate with the child's answers applied.
 * The child decides the meaning; the model never resolves an ambiguity alone.
 */
export interface ClarifyRequest {
  text: string;
  source_lang: string;
  target_lang?: string;
  /** { [ambiguity.phrase]: option.id } */
  choices: Record<string, string>;
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

/** GET /api/health */
export interface HealthResponse {
  status: "ok" | "degraded";
  engine: "mock" | "live";
  /** role -> model id, e.g. { fanout: "...", judge: "..." } */
  models: Record<string, string>;
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
