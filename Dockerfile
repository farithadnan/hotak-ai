FROM python:3.13-slim

WORKDIR /app

# Install system dependencies for lxml, chromadb, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libxml2-dev \
    libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app/ ./app/
COPY server.py .

# Persistent data lives on a mounted volume; pre-create dirs so they exist on
# first run even without a volume (useful for quick testing).
RUN mkdir -p /app/app/data/chroma_db /app/app/data/uploads /app/app/logs

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
