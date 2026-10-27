/**
 * Is the backend really translating, or serving a fixed example?
 *
 * `ENGINE_MODE` defaults to "mock". A backend started without it answers every
 * request from `engine/mock.py`, which ignores the child's text completely and
 * returns one hard-coded German sentence about a bag being taken:
 *
 *     async def translate(text, source_lang, ...):
 *         await asyncio.sleep(1.5)          # looks like work
 *         return {"translation": "Sie haben mir wieder meine Tasche ...",
 *                 "confidence": 0.82, "calls_made": 11}
 *
 * So the result screen shows the child's own words beside a stranger's story,
 * under "The checks agreed 82%" and "11 checks", and nothing on the page says
 * otherwise. That is worse than an error: an error is honest. The one promise
 * this app makes is that the German says what the child said.
 *
 * `/api/health` has always reported which engine is loaded, and `api.ts` has
 * always had `health()`. Nothing called it. This module does, once, and the
 * answer is passed down as a prop so the components that must behave
 * differently can be tested without a network.
 *
 * "unknown" is not treated as mock. A health check that fails is a backend we
 * cannot reach, and claiming "example mode" then would be its own lie - the
 * translate call will fail on its own and say so properly.
 */

import { useEffect, useState } from "react";

import { health } from "./api.ts";

export type EngineMode = "live" | "mock" | "unknown";

export function useEngineMode(): EngineMode {
  const [mode, setMode] = useState<EngineMode>("unknown");

  useEffect(() => {
    let live = true;
    health()
      .then((response) => {
        if (live) setMode(response.engine === "mock" ? "mock" : "live");
      })
      // Deliberately silent: an unreachable backend is not the child's
      // problem to read about here, and the next real call will report it.
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return mode;
}
