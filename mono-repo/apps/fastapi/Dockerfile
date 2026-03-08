# Stage 1: Install Python deps
FROM python:3.11-slim AS python-deps

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libpq-dev curl nodejs npm \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Install Prisma CLI (Node)
RUN npm install -g prisma

# Copy only schema first (for caching)
COPY prisma ./prisma

# Run prisma generate (Python generator)
RUN prisma generate


# Stage 2: Final runtime image
FROM python:3.11-slim

WORKDIR /app

RUN adduser --disabled-password --gecos '' fastapiuser

# Copy installed python packages
COPY --from=python-deps /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy prisma schema + generated client
COPY --from=python-deps /app/prisma ./prisma

# Copy application source
COPY . .

USER fastapiuser

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
