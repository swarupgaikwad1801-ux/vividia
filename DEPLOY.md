# Deploying the backend

The demo must stay up for judges from submission until **15 Dec 2026**, so the
goal here is "cheap and boring", not clever.

Nothing in this file needs a key in the repository. Keys go in the host's
dashboard, and `.env` never leaves your machine.

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
