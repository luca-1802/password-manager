FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN groupadd -r vault && useradd -r -g vault -d /app -s /sbin/nologin vault

COPY backend/ backend/
COPY app.py .
COPY frontend/dist/ frontend/dist/

VOLUME /app/data
ENV VAULT_DIR=/app/data
ENV HOST=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/api/health')" || exit 1

RUN mkdir -p /app/data && chown -R vault:vault /app
USER vault

EXPOSE 5000
CMD ["python", "app.py"]