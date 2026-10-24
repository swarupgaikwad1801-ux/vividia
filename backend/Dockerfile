# The backend, as judges will run it. Works unchanged on Nebius Serverless
# Containers and on Render; both inject the port to listen on as $PORT.
#
# BUILD FROM THE REPOSITORY ROOT, not from backend/:
#     docker build -f backend/Dockerfile -t vividia-backend .
#
# The app is not self-contained inside backend/. engine/config.py resolves
# REPO_ROOT as parents[2], and engine/safety.py and engine/resources.py read
# content/ from there at import time. An image built with backend/ as the
# context leaves content/ out, and the container then dies on startup with
# FileNotFoundError: .../content/safety_messages.json. Running the same code
# from a clone hides this, because content/ is simply there.
FROM python:3.12-slim

WORKDIR /app/backend

# Dependencies first, so a code change does not reinstall them.
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Both halves the app needs. With WORKDIR at /app/backend, parents[2] is
# /app, so content/ is found at /app/content.
COPY backend/ /app/backend/
COPY content/ /app/content/

# Read by engine/config.py. No key is baked into the image: NEBIUS_API_KEY and
# TAVILY_API_KEY are set in the host's dashboard, never here and never in git.
ENV ENGINE_MODE=live \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# $PORT when the host sets one, 8000 when running this locally.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
