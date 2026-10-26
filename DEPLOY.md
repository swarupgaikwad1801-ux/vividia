# Deploying

Two services: the **backend** (FastAPI, Docker, on Render) and the
**frontend** (static Vite build, on Vercel). The URL judges visit is the
frontend's. Hard requirement 5 is not met until that URL loads and a
translation comes back through it.

The demo must stay up for judges from submission until **15 Dec 2026**, so the
goal here is "cheap and boring", not clever.

Nothing in this file needs a key in the repository. Keys go in the host's
dashboard, and `.env` never leaves your machine.

**Order matters.** The backend's `ALLOWED_ORIGINS` needs the frontend's URL,
and the frontend's `VITE_API_URL` needs the backend's. Deploy the backend
first, deploy the frontend with the backend's URL, then come back and set
`ALLOWED_ORIGINS` to the frontend's URL. The second visit to the Render
dashboard is not optional — skip it and every call fails CORS.

## Check the image before trusting it

Running the app from a clone proves nothing about the image: a clone has
`content/` sitting next to `backend/`, and the container might not. Build it
and call it:

```bash
docker build -f backend/Dockerfile -t vividia-backend .
docker run --rm -p 8000:8000 \
  -e NEBIUS_API_KEY=... \
  -e NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1/ \
  -e NEMOTRON_NANO_MODEL=nvidia/Nemotron-3.5-Super-VL \
  -e NEMOTRON_JUDGE_MODEL=nvidia/nemotron-3-super-120b-a12b \
  vividia-backend
curl localhost:8000/api/health
```

It must report `"engine": "live"` and name both models. `tests/test_deploy.py`
checks the Dockerfile's shape without Docker, but only an actual build proves
the image.

## Before you start

- A Nebius Token Factory key, and the Tavily key.
- The spending cap in `engine/budget.py` and the per-IP limit in
  `app/limits.py` are already in the code. Check them before going public:
  the demo is a URL anyone can POST to, and every request spends credits.

## Option A: Render (fallback, but the one that will just work)

1. Push to GitHub (already done).
2. render.com → **New** → **Web Service** → connect `swarupgaikwad1801-ux/vividia`.
3. Settings:
   - **Root directory:** leave blank, i.e. the repository root. **Not**
     `backend`: the image has to copy `content/` as well, and that lives at
     the root. Setting it to `backend` builds an image whose container starts
     and then dies on `content/safety_messages.json`.
   - **Dockerfile path:** `backend/Dockerfile`
   - **Runtime:** Docker
   - **Instance type:** Free is enough for judging; it sleeps after inactivity
     and takes ~30 s to wake. If the video shows a live demo, pay for the
     smallest always-on tier instead: a judge who hits a sleeping service may
     just close the tab.
4. **Environment** → add:
   - `NEBIUS_API_KEY` — from the Token Factory console
   - `NEBIUS_BASE_URL` — `https://api.tokenfactory.nebius.com/v1/`
   - `NEMOTRON_NANO_MODEL` — `nvidia/Nemotron-3.5-Super-VL`
   - `NEMOTRON_JUDGE_MODEL` — `nvidia/nemotron-3-super-120b-a12b`
   - `TAVILY_API_KEY`
   - `ENGINE_MODE` — `live`
   - `ALLOWED_ORIGINS` — the deployed frontend URL, e.g.
     `https://vividia.vercel.app`. Without this the frontend is blocked by
     CORS. Do not use `*`: anyone could then spend our credits.
5. Deploy, then check `https://<your-service>.onrender.com/api/health`. It must
   report `"engine": "live"` and name the models. If it says `mock`,
   `ENGINE_MODE` did not reach the container.

## Option B: Nebius Serverless Containers

Worth trying first, because "deployed on Nebius AI Cloud" is one of the two
ways to satisfy the platform requirement, and we already satisfy the other
(a runtime call to Token Factory). It is a bonus, not a requirement.

1. Build and push the image to a registry Nebius can read.
2. Create a Serverless Container from it, listening on `$PORT`.
3. Set the same environment variables as above.
4. Check `/api/health` the same way.

If the quota request is still pending (several teams hit
`compute.instance.non-gpu.vcpu = 0`), do not wait on it. Ship on Render and
move on.

## Deploying the frontend (Vercel)

This is the URL judges open, so it is the one that has to be right.

`frontend/vercel.json` holds the build settings, so the dashboard needs almost
nothing. The one thing it cannot hold is the API URL, for the reason below.

1. vercel.com → **Add New** → **Project** → import `swarupgaikwad1801-ux/vividia`.
2. **Root Directory:** `frontend`. Vercel then reads `frontend/vercel.json`
   and picks up the framework, build command and output directory itself.
3. **Environment Variables** → add `VITE_API_URL`, set to the Render URL with
   **no trailing slash**, e.g. `https://vividia-api.onrender.com`.
4. Deploy. Then do the backend's `ALLOWED_ORIGINS` step with the URL Vercel
   gives you.

### `VITE_API_URL` is baked in at build time, not read at runtime

This is the trap worth knowing about before it costs an hour.

Vite replaces `import.meta.env` with a literal object when it builds, so
`VITE_API_URL` is compiled **into** `dist/assets/index-*.js`. The consequence:

> **Editing `VITE_API_URL` in the Vercel dashboard changes nothing until you
> redeploy.** The old URL stays compiled into the bundle being served.

So after any change to it, trigger a new deployment. To check which URL a
build actually contains, search the served bundle for it rather than trusting
the dashboard:

```bash
curl -s https://<your-app>.vercel.app/assets/index-*.js | grep -o 'https://[a-z0-9.-]*onrender.com'
```

If that prints nothing, `VITE_API_URL` was unset at build time. The client
then falls back to `""`, which means same-origin: the app POSTs to
`https://<your-app>.vercel.app/api/translate`, nothing is there, and the child
sees the generic "something went wrong" message with no clue why.

### `ALLOWED_ORIGINS` must match the origin exactly

An origin is scheme + host + port. `https://vividia.vercel.app` and
`https://vividia.vercel.app/` are not the same string to the middleware, and
`http://localhost:4173` and `http://127.0.0.1:4173` are **different origins**
even though they are the same machine. A mismatch shows up as a failed
`OPTIONS` preflight, which in the browser looks like a network error rather
than a CORS error, so it is easy to misread as the backend being down.

Vercel also gives every deployment its own preview URL. Those are not in
`ALLOWED_ORIGINS`, so **preview deployments cannot call the API**. Test on the
production URL, or add the preview origin while you need it.

## Verifying it before a judge does

Run these in order. Each one fails for a different reason, which is the point.

```bash
# 1. The backend is up and using real models, not the mock.
curl https://<api>.onrender.com/api/health
#    -> {"status":"ok","engine":"live","models":{...}}
#    "engine":"mock" means ENGINE_MODE never reached the container.

# 2. The frontend is served.
curl -sI https://<app>.vercel.app | head -1      # -> 200

# 3. The bundle carries the right API URL (see the trap above).
curl -s https://<app>.vercel.app/assets/index-*.js | grep -o 'onrender.com'

# 4. CORS actually passes, which steps 1-3 do not prove.
curl -i -X OPTIONS https://<api>.onrender.com/api/translate \
  -H "Origin: https://<app>.vercel.app" \
  -H "Access-Control-Request-Method: POST"
#    -> 200, with access-control-allow-origin echoing your frontend URL
```

Then open the app and send one sentence. **Read the German.** If it comes back
unrelated to what you typed, the backend is in mock mode: `engine/mock.py`
returns a fixed sentence and ignores its input entirely. Typing "they took my
bag and pushed me in the corridor" and getting "...weggenommen und alle haben
über mich gelacht" is the mock, not a translation failure — and it is the
centrepiece of the demo, so it must not happen in front of a judge. Step 1 is
what catches it; this is the symptom if you skip step 1.

### What this shape was tested against

The frontend/backend split above was verified end to end locally on
26 Oct 2026 before either half was deployed: production build (`npm run build`)
served by `vite preview` on one origin, the backend on another, with
`ALLOWED_ORIGINS` set to the first. A sentence typed into the built bundle
produced `OPTIONS /api/translate 200` followed by `POST /api/translate 200` in
the backend log, and German rendered on screen. That proves the build, the
inlined `VITE_API_URL`, the CORS pairing and the API client agree with each
other. It does **not** prove anything about Render, Vercel or live models.

## After deploying

- Post the URL in issue #4 so Vernika can point the frontend at it.
- Put it in the README under **Demo**, and in the Devpost submission.
- Re-check it on **Thu 29 Oct** and again on the morning of **Fri 30 Oct**.
  A demo that dies after submission is the same as no demo.

## Keeping the credits alive until 15 Dec

Judging runs to 15 Dec and the balance is small, so:

- A fully verified sentence costs about $0.06; the demo story is a handful of
  sentences.
- `app/limits.py` caps requests per IP. Keep it on in production.
- Watch **Billing → Usage** in the Token Factory console in the first days
  after submission. If spend climbs, lower the cap rather than taking the
  demo down.
