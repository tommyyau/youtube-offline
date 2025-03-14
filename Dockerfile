FROM python:3.9-slim

WORKDIR /app

# Copy only requirements first for better caching
COPY requirements.txt .

# Install dependencies and necessary system packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    python3-pip \
    curl \
    gnupg \
    wget \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir --upgrade yt-dlp

# Copy application files
COPY . .

# Expose port
EXPOSE 5001

# Run the application (explicitly using the enhanced version)
CMD ["python", "enhanced_app.py"] 