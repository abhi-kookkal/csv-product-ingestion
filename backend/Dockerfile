# backend/Dockerfile (using python:3.10-slim as example)
FROM python:3.10-slim

WORKDIR /app

# Install system packages required to build psycopg2 and other compiled wheels
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      gcc \
      libpq-dev \
      python3-dev \
      curl \
    && rm -rf /var/lib/apt/lists/*

# copy requirements and install
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# copy app code
COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
