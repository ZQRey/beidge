FROM python:3.12-slim

# Avoid interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system libraries for WeasyPrint and fonts (including official Montserrat with Kazakh Cyrillic)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    fonts-montserrat \
    fonts-liberation \
    fonts-dejavu \
    fonts-freefont-ttf \
    fontconfig \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f -v

WORKDIR /app

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Create storage directories
RUN mkdir -p data/storage/pdfs data/storage/previews

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
