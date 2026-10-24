# The backend, as judges will run it. Works unchanged on Nebius Serverless
# Containers and on Render; both inject the port to listen on as $PORT.
FROM python:3.12-slim

WORKDIR /app

# Dependencies first, so a code change does not reinstall them.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Read by engine/config.py. No key is baked into the image: NEBIUS_API_KEY and
# TAVILY_API_KEY are set in the host's dashboard, never here and never in git.
ENV ENGINE_MODE=live \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# $PORT when the host sets one, 8000 when running this locally.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
