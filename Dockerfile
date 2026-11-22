FROM python:3.12-alpine
LABEL org.opencontainers.image.source="https://github.com/bosshorncom-cmd/horn-signal-studio" \
      org.opencontainers.image.description="Horn Signal Studio: self-hosted horn signal rehearsal and crossing-timing tool" \
      org.opencontainers.image.licenses="MIT"
WORKDIR /app
COPY app/ /app/
ENV DATA_DIR=/data PORT=8080 PYTHONUNBUFFERED=1
RUN mkdir -p /data && chown 1000:1000 /data
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["python", "/app/server.py"]
