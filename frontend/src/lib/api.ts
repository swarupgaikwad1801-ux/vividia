/**
 * One typed function per backend endpoint, so screens never build a URL or
 * parse an error themselves.
 *
 * Every failure becomes an `ApiError` carrying `messageChild`: the only string
 * a screen may show a child, already in their language (CLAUDE.md, contracts).
 * The backend supplies it on its own errors; for the cases it cannot (no
 * network, a timeout), it comes from strings.ts.
 *
 * Nothing the child writes is ever logged here.
 */

import type {
  ClarifyRequest,
  ClarifyResponse,
  Entry,
  ErrorCode,
  ErrorResponse,
  HealthResponse,
  ReportRequest,
  ReportResponse,
  ResourcesResponse,
  TranslateRequest,
  TranslateResponse,
} from "../types/api";
import { t } from "./strings";

/**
 * Verifying a risky sentence takes about 12 s on average and longer at the
 * tail, so translation gets a generous limit; everything else is quick.
 */
const SLOW_MS = 45_000;
const QUICK_MS = 15_000;

/** The demo story served by GET /api/demo (content/demo_story.json). */
export interface DemoStory {
  persona: {
    name: string;
    age: number;
    label_on_screen: string;
    background_en: string;
    child_lang: string;
    state: string;
  };
  timeline: Entry[];
  live_message: { text: string; why?: string };
  handoff?: { where_it_happens?: string; suggested_adults_en?: string[]; note?: string };
}

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode | "network",
    /** Safe to show the child; never mentions models or HTTP. */
    readonly messageChild: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

let baseUrl = defaultBaseUrl();

function defaultBaseUrl(): string {
  // Vite exposes VITE_* variables on import.meta.env; elsewhere it is absent.
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return (env?.VITE_API_URL ?? "").replace(/\/+$/, "");
}

/** Point the client at a backend, e.g. the deployed URL. "" means same origin. */
export function setApiBaseUrl(url: string): void {
  baseUrl = url.replace(/\/+$/, "");
}

async function request<T>(path: string, lang: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = controller.signal.aborted;
    throw new ApiError(
      timedOut ? "upstream_timeout" : "network",
      t(timedOut ? "errors.slow" : "errors.network", lang),
      true,
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.ok) return (await response.json()) as T;

  let body: Partial<ErrorResponse> = {};
  try {
    body = (await response.json()) as Partial<ErrorResponse>;
  } catch {
    // Not our error format (e.g. a proxy page); fall through to the generic text.
  }
  throw new ApiError(
    body.code ?? "internal",
    body.message_child || t("errors.generic", lang),
    body.retryable ?? response.status >= 500,
    response.status,
  );
}

function post<T>(path: string, body: unknown, lang: string, timeoutMs: number): Promise<T> {
  return request<T>(path, lang, { method: "POST", body: JSON.stringify(body) }, timeoutMs);
}

export function translate(req: TranslateRequest): Promise<TranslateResponse> {
  return post("/api/translate", req, req.source_lang, SLOW_MS);
}

export function clarify(req: ClarifyRequest): Promise<ClarifyResponse> {
  return post("/api/clarify", req, req.source_lang, SLOW_MS);
}

export function report(req: ReportRequest): Promise<ReportResponse> {
  return post("/api/report", req, req.child_lang, SLOW_MS);
}

export function resources(lang: string, state = ""): Promise<ResourcesResponse> {
  const query = new URLSearchParams({ lang, ...(state ? { state } : {}) });
  return request(`/api/resources?${query}`, lang, { method: "GET" }, QUICK_MS);
}

export function health(): Promise<HealthResponse> {
  return request("/api/health", "en", { method: "GET" }, QUICK_MS);
}

export function demo(lang = "en"): Promise<DemoStory> {
  return request("/api/demo", lang, { method: "GET" }, QUICK_MS);
}
